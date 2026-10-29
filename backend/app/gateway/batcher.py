"""Batch accumulator, Merkle tree computation, decentralized storage, and on-chain anchoring."""

import asyncio
import hashlib
import json
import logging
import time
from typing import Any, Sequence
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from web3 import Web3

from backend.app.chain.client import chain_client
from backend.app.config import settings
from backend.app.db.models import BatchRecord
from backend.app.message_core import b64url_decode, build_signing_input
from backend.app.services.audit_service import audit_service
from backend.app.storage.coordinator import coordinator
from backend.app.storage.placement import StorageNodeInfo

logger = logging.getLogger("snx.gateway.batcher")


def compute_envelope_leaf(envelope: dict[str, Any]) -> bytes:
    """Compute Merkle leaf hash for a message envelope:

    Leaf = SHA-256(0x00 || signing_input_bytes || g_raw_bytes)
    """
    device_id = str(envelope["d"])
    seq = int(envelope["s"])
    timestamp = int(envelope["t"])
    msg_type = str(envelope["y"])
    payload_b64 = str(envelope["p"])
    sig_b64 = str(envelope["g"])

    signing_input = build_signing_input(
        device_id=device_id,
        seq=seq,
        timestamp=timestamp,
        msg_type=msg_type,
        payload_b64=payload_b64,
    )
    g_raw = b64url_decode(sig_b64)

    return hashlib.sha256(b"\x00" + signing_input + g_raw).digest()


def compute_batch_merkle_root(envelopes: list[dict[str, Any]]) -> str:
    """Compute Merkle root over batch envelopes."""
    if not envelopes:
        return hashlib.sha256(b"").hexdigest()

    current_level = [compute_envelope_leaf(e) for e in envelopes]

    while len(current_level) > 1:
        next_level = []
        for i in range(0, len(current_level), 2):
            if i + 1 < len(current_level):
                h = hashlib.sha256(b"\x01" + current_level[i] + current_level[i + 1]).digest()
                next_level.append(h)
            else:
                next_level.append(current_level[i])
        current_level = next_level

    return current_level[0].hex()


def compute_batch_inclusion_proof(
    envelopes: list[dict[str, Any]],
    target_index: int,
) -> list[dict[str, str]]:
    """Generate Merkle inclusion proof for message at target_index in batch."""
    if not (0 <= target_index < len(envelopes)):
        raise IndexError("Target index out of range")

    proof = []
    current_level = [compute_envelope_leaf(e) for e in envelopes]
    idx = target_index

    while len(current_level) > 1:
        next_level = []
        for i in range(0, len(current_level), 2):
            if i + 1 < len(current_level):
                parent = hashlib.sha256(b"\x01" + current_level[i] + current_level[i + 1]).digest()
                if i == idx:
                    proof.append({"pos": "right", "hash": current_level[i + 1].hex()})
                elif i + 1 == idx:
                    proof.append({"pos": "left", "hash": current_level[i].hex()})
                next_level.append(parent)
            else:
                next_level.append(current_level[i])
        current_level = next_level
        idx //= 2

    return proof


def verify_batch_inclusion_proof(
    envelope: dict[str, Any],
    proof: list[dict[str, str]],
    expected_root_hex: str,
) -> bool:
    """Verify Merkle inclusion proof for a single message against expected root."""
    current_hash = compute_envelope_leaf(envelope)
    for elem in proof:
        sibling = bytes.fromhex(elem["hash"])
        if elem["pos"] == "right":
            current_hash = hashlib.sha256(b"\x01" + current_hash + sibling).digest()
        else:
            current_hash = hashlib.sha256(b"\x01" + sibling + current_hash).digest()

    return current_hash.hex().lower() == expected_root_hex.lower()


class BatchManager:
    """Accumulates verified messages, flushes batches to decentralized storage, and anchors on chain."""

    def __init__(
        self,
        max_messages: int = 100,
        max_seconds: float = 30.0,
    ) -> None:
        self.max_messages = max_messages
        self.max_seconds = max_seconds
        self.buffer: list[dict[str, Any]] = []
        self.last_flush_time = time.time()
        self._lock = asyncio.Lock()

    async def add_message(
        self,
        envelope: dict[str, Any],
        db: AsyncSession,
        nodes: Sequence[StorageNodeInfo],
    ) -> BatchRecord | None:
        """Add message to batch; flushes and anchors if batch threshold is reached."""
        async with self._lock:
            self.buffer.append(envelope)
            now = time.time()
            if len(self.buffer) >= self.max_messages or (now - self.last_flush_time >= self.max_seconds):
                return await self._flush_unlocked(db, nodes)
        return None

    async def flush(
        self,
        db: AsyncSession,
        nodes: Sequence[StorageNodeInfo],
    ) -> BatchRecord | None:
        """Manually flush the current batch buffer."""
        async with self._lock:
            return await self._flush_unlocked(db, nodes)

    async def _flush_unlocked(
        self,
        db: AsyncSession,
        nodes: Sequence[StorageNodeInfo],
    ) -> BatchRecord | None:
        if not self.buffer:
            self.last_flush_time = time.time()
            return None

        envelopes_to_flush = list(self.buffer)
        self.buffer.clear()
        self.last_flush_time = time.time()

        # 1. Compute Merkle Root
        merkle_root = compute_batch_merkle_root(envelopes_to_flush)
        batch_id = str(uuid.uuid4())

        # 2. Serialize as JSONL
        jsonl_lines = [json.dumps(e, separators=(",", ":")) for e in envelopes_to_flush]
        jsonl_bytes = "\n".join(jsonl_lines).encode("utf-8")

        # 3. Store batch object via decentralized storage coordinator
        upload_res = await coordinator.upload_object(
            data=jsonl_bytes,
            name=f"batch_{batch_id}.jsonl",
            mime="application/x-ndjson",
            owner_id="did:snx:service:gateway",
            classification="internal",
            nodes=nodes,
        )
        manifest_id = upload_res["manifest_id"]

        from_ts = min(e["t"] for e in envelopes_to_flush)
        to_ts = max(e["t"] for e in envelopes_to_flush)

        # 4. Anchor on chain via DataRegistry
        tx_hash = None
        if chain_client.is_connected() and "DataRegistry" in chain_client.contracts:
            try:
                # anchorBatch(bytes32 batchRoot, uint32 count)
                dr_contract = chain_client.contracts["DataRegistry"]
                batch_root_bytes = bytes.fromhex(merkle_root)
                func = dr_contract.functions.anchorBatch(batch_root_bytes, len(envelopes_to_flush))
                res = chain_client._send_transaction(func)
                tx_hash = res.get("tx_hash")
            except Exception as e:
                logger.warning(f"On-chain anchorBatch failed: {e}")

        # 5. Persist Batch Record in DB
        batch_record = BatchRecord(
            id=batch_id,
            batch_root="0x" + merkle_root,
            manifest_id=manifest_id,
            message_count=len(envelopes_to_flush),
            from_ts=from_ts,
            to_ts=to_ts,
            tx_hash=tx_hash,
            messages_json=json.dumps(envelopes_to_flush),
        )
        db.add(batch_record)
        await db.commit()
        await db.refresh(batch_record)

        # Audit log
        await audit_service.record_event(
            db=db,
            event_type="BATCH_ANCHORED",
            actor="snx-gateway",
            subject=batch_id,
            data_hash="0x" + merkle_root,
            correlation_id=f"batch-{batch_id[:8]}",
            details={
                "message_count": len(envelopes_to_flush),
                "manifest_id": manifest_id,
                "tx_hash": tx_hash,
            },
        )

        return batch_record


batch_manager = BatchManager(
    max_messages=settings.BATCH_MAX_MSGS,
    max_seconds=settings.BATCH_MAX_SECONDS,
)
