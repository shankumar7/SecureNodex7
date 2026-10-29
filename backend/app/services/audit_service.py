"""Audit service for recording on-chain/DB audit events and verifying the cryptographic hash chain."""

import json
import logging
import time
from typing import Any
import uuid

import eth_abi
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from web3 import Web3

from backend.app.chain.client import chain_client, to_bytes32
from backend.app.db.models import AuditEvent

logger = logging.getLogger("snx.audit")


def compute_audit_hash(
    prev_head_bytes: bytes,
    event_type: str,
    actor: str,
    subject: str,
    data_hash: str,
    correlation_id: str,
    timestamp: int,
    seq: int,
) -> bytes:
    """Compute exact Solidity AuditLog hash:

    keccak256(abi.encode(prevHead, eventType, actor, subject, dataHash, correlationId, timestamp, seq))
    """
    ev_bytes = to_bytes32(event_type)
    act_bytes = to_bytes32(actor)
    sub_bytes = to_bytes32(subject)
    dh_bytes = to_bytes32(data_hash)
    cid_bytes = to_bytes32(correlation_id)

    encoded = eth_abi.encode(
        ["bytes32", "bytes32", "bytes32", "bytes32", "bytes32", "bytes32", "uint256", "uint256"],
        [prev_head_bytes, ev_bytes, act_bytes, sub_bytes, dh_bytes, cid_bytes, timestamp, seq],
    )
    return Web3.keccak(encoded)


class AuditService:
    """Service to record audit logs and recompute/verify hash chains."""

    async def record_event(
        self,
        db: AsyncSession,
        event_type: str,
        actor: str,
        subject: str,
        data_hash: str,
        correlation_id: str,
        details: dict[str, Any] | None = None,
        write_on_chain: bool = True,
    ) -> AuditEvent:
        """Record an audit event on-chain (if enabled) and in the local database."""
        now_ts = int(time.time())
        tx_hash = None
        seq = None
        prev_head = None
        head = None

        if write_on_chain and chain_client.is_connected() and "AuditLog" in chain_client.contracts:
            try:
                res = chain_client.record_audit(
                    event_type=event_type,
                    actor=actor,
                    subject=subject,
                    data_hash=data_hash,
                    correlation_id=correlation_id,
                )
                tx_hash = res.get("tx_hash")
                seq = res.get("seq")
                prev_head = res.get("prev_head")
                head = res.get("head")
            except Exception as e:
                logger.error(f"On-chain audit recording failed: {e}")

        # If not recorded on-chain, calculate local sequential hash chain
        if seq is None or head is None:
            stmt = select(AuditEvent).order_by(AuditEvent.timestamp.desc(), AuditEvent.created_at.desc()).limit(1)
            last_event = (await db.execute(stmt)).scalar_one_or_none()
            if last_event and last_event.head:
                prev_head = last_event.head
                seq = (last_event.seq or 0) + 1
            else:
                prev_head = "0x" + "0" * 64
                seq = 1

            prev_head_bytes = bytes.fromhex(prev_head[2:])
            head_bytes = compute_audit_hash(
                prev_head_bytes=prev_head_bytes,
                event_type=event_type,
                actor=actor,
                subject=subject,
                data_hash=data_hash,
                correlation_id=correlation_id,
                timestamp=now_ts,
                seq=seq,
            )
            head = "0x" + head_bytes.hex()

        audit_entry = AuditEvent(
            id=str(uuid.uuid4()),
            seq=seq,
            event_type=event_type,
            actor_id=actor,
            subject_id=subject,
            data_hash=data_hash,
            correlation_id=correlation_id,
            timestamp=now_ts,
            tx_hash=tx_hash,
            prev_head=prev_head,
            head=head,
            details=json.dumps(details) if details else None,
        )

        db.add(audit_entry)
        await db.commit()
        await db.refresh(audit_entry)
        return audit_entry

    async def verify_chain(self, db: AsyncSession) -> dict[str, Any]:
        """Recompute rolling hash chain from genesis across all recorded audit events."""
        stmt = select(AuditEvent).order_by(AuditEvent.seq.asc(), AuditEvent.timestamp.asc())
        result = await db.execute(stmt)
        events = list(result.scalars().all())

        running_head = bytes(32)  # Genesis prevHead = 0x0
        checked_count = 0

        for idx, ev in enumerate(events):
            calc_hash = compute_audit_hash(
                prev_head_bytes=running_head,
                event_type=ev.event_type,
                actor=ev.actor_id,
                subject=ev.subject_id,
                data_hash=ev.data_hash,
                correlation_id=ev.correlation_id,
                timestamp=ev.timestamp,
                seq=ev.seq or (idx + 1),
            )

            expected_head_bytes = bytes.fromhex(ev.head[2:]) if ev.head else calc_hash
            if calc_hash != expected_head_bytes:
                return {
                    "valid": False,
                    "checked": checked_count,
                    "tampered_index": idx,
                    "tampered_event_id": ev.id,
                    "calculated_head": "0x" + calc_hash.hex(),
                    "expected_head": ev.head,
                }

            running_head = calc_hash
            checked_count += 1

        on_chain_head = None
        if chain_client.is_connected() and "AuditLog" in chain_client.contracts:
            try:
                on_chain_head = chain_client.get_audit_head()
            except Exception:
                pass

        return {
            "valid": True,
            "checked": checked_count,
            "calculated_head": "0x" + running_head.hex(),
            "on_chain_head": on_chain_head,
        }


audit_service = AuditService()
