"""Storage Coordinator: streaming chunking, encryption, parallel quorum upload, and verified read path."""

import asyncio
import contextlib
import hashlib
import json
import logging
import uuid
from typing import Any, Sequence

import httpx
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import HTTPException, status

from backend.app.config import settings
from backend.app.storage.crypto import (
    decrypt_chunk,
    encrypt_chunk,
    generate_dek,
    wrap_dek_ecies,
)
from backend.app.storage.merkle import compute_merkle_root
from backend.app.storage.placement import (
    StorageNodeInfo,
    apply_diversity_rule,
    place_chunk,
    rank_all_nodes,
)

logger = logging.getLogger("snx.coordinator")


class StorageCoordinator:
    """Decentralized storage coordinator for splitting, encrypting, placing, and retrieving data chunks."""

    def __init__(
        self,
        chunk_size: int | None = None,
        replication_r: int | None = None,
        write_quorum_w: int | None = None,
    ) -> None:
        self.chunk_size = chunk_size or settings.CHUNK_SIZE
        self.r = replication_r or settings.REPLICATION_R
        self.w = write_quorum_w or settings.WRITE_QUORUM_W

    async def _send_chunk_to_node(
        self,
        client: httpx.AsyncClient,
        node: StorageNodeInfo,
        chunk_id: str,
        content: bytes,
        kind: str = "data",
    ) -> bool:
        """Upload a single chunk to a storage node."""
        url = f"{node.endpoint.rstrip('/')}/v1/chunks/{chunk_id}"
        try:
            res = await client.put(
                url,
                content=content,
                headers={"X-SNX-Kind": kind, "Content-Type": "application/octet-stream"},
                timeout=5.0,
            )
            return res.status_code in (200, 201)
        except Exception as e:
            logger.debug(f"Failed to put chunk {chunk_id[:8]} to node {node.id}: {e}")
            return False

    async def _delete_chunk_from_node(
        self,
        client: httpx.AsyncClient,
        node: StorageNodeInfo,
        chunk_id: str,
    ) -> None:
        url = f"{node.endpoint.rstrip('/')}/v1/chunks/{chunk_id}"
        with contextlib.suppress(Exception):
            await client.delete(url, timeout=3.0)

    async def upload_object(
        self,
        data: bytes,
        name: str,
        mime: str,
        owner_id: str,
        classification: str,
        nodes: Sequence[StorageNodeInfo],
        owner_public_key: ec.EllipticCurvePublicKey | None = None,
    ) -> dict[str, Any]:
        """Split, encrypt, place, and upload an object meeting quorum W."""
        live_nodes = [n for n in nodes if n.state == "UP" and not n.draining]
        if len(live_nodes) < self.w:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Fewer than write quorum W ({self.w}) nodes available (live: {len(live_nodes)})",
            )

        object_id = str(uuid.uuid4())
        dek = generate_dek()

        # 1. Chunking and AES-256-GCM encryption
        chunks_meta: list[dict[str, Any]] = []
        encrypted_chunks: list[bytes] = []
        raw_chunks = [data[i : i + self.chunk_size] for i in range(0, len(data), self.chunk_size)]
        if not raw_chunks:
            raw_chunks = [b""]

        for idx, raw_chunk in enumerate(raw_chunks):
            ciphertext, nonce_b64 = encrypt_chunk(
                dek=dek,
                chunk_bytes=raw_chunk,
                object_id=object_id,
                chunk_index=idx,
            )
            cid = hashlib.sha256(ciphertext).hexdigest().lower()
            encrypted_chunks.append(ciphertext)
            chunks_meta.append(
                {
                    "i": idx,
                    "id": cid,
                    "len": len(ciphertext),
                    "nonce": nonce_b64,
                }
            )

        # 2. Compute HRW placements and apply Diversity Rule (FR-STO-3)
        chunk_ids = [c["id"] for c in chunks_meta]
        initial_placements = [place_chunk(cid, live_nodes, self.r) for cid in chunk_ids]
        final_placements = apply_diversity_rule(initial_placements, live_nodes, self.r)

        # 3. Parallel upload with quorum W and fallback
        uploaded_map: dict[str, list[StorageNodeInfo]] = {}
        async with httpx.AsyncClient(verify=False) as client:
            for idx, (cid, ciphertext, target_nodes) in enumerate(
                zip(chunk_ids, encrypted_chunks, final_placements, strict=False)
            ):
                all_ranked = rank_all_nodes(cid, live_nodes)
                successful_nodes: list[StorageNodeInfo] = []

                # Upload to target nodes in parallel
                tasks = [
                    self._send_chunk_to_node(client, n, cid, ciphertext, kind="data")
                    for n in target_nodes
                ]
                results = await asyncio.gather(*tasks, return_exceptions=True)

                for n, res in zip(target_nodes, results, strict=False):
                    if res is True:
                        successful_nodes.append(n)

                # Fallback to next-ranked nodes if quorum not yet reached
                if len(successful_nodes) < self.w:
                    remaining_nodes = [n for n in all_ranked if n not in target_nodes]
                    for fallback_node in remaining_nodes:
                        if len(successful_nodes) >= self.w:
                            break
                        if await self._send_chunk_to_node(
                            client, fallback_node, cid, ciphertext, kind="data"
                        ):
                            successful_nodes.append(fallback_node)

                # Check if Quorum W was satisfied
                if len(successful_nodes) < self.w:
                    # Rollback / cleanup uploaded chunks
                    for u_cid, u_nodes in uploaded_map.items():
                        for un in u_nodes:
                            await self._delete_chunk_from_node(client, un, u_cid)
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail=f"Chunk {idx} failed to achieve write quorum W ({self.w} acks). Upload aborted.",
                    )

                uploaded_map[cid] = successful_nodes

            # 4. Compute Merkle Root & Build Manifest
            merkle_root = compute_merkle_root(chunk_ids)
            manifest = {
                "v": 1,
                "object_id": object_id,
                "name": name,
                "mime": mime,
                "size": len(data),
                "created_at": "2026-10-09T10:00:00Z",
                "owner": owner_id,
                "chunk_size": self.chunk_size,
                "redundancy": {"mode": "replication", "r": self.r},
                "encryption": {"alg": "AES-256-GCM", "aad": "object_id||chunk_index"},
                "chunks": chunks_meta,
                "merkle_root": merkle_root,
                "classification": classification,
            }

            canonical_manifest = json.dumps(manifest, sort_keys=True, separators=(",", ":")).encode(
                "utf-8"
            )
            manifest_id = hashlib.sha256(canonical_manifest).hexdigest().lower()

            # Store manifest blob on live nodes
            manifest_placements = place_chunk(manifest_id, live_nodes, self.r)
            for mn in manifest_placements:
                await self._send_chunk_to_node(
                    client, mn, manifest_id, canonical_manifest, kind="manifest"
                )

            # 5. Store Grant Blob (ECIES key wrap) if owner public key provided
            grant_blob_id = None
            if owner_public_key:
                grant_blob = wrap_dek_ecies(dek, owner_public_key)
                grant_json = json.dumps(grant_blob, sort_keys=True).encode("utf-8")
                grant_blob_id = hashlib.sha256(grant_json).hexdigest().lower()
                grant_nodes = place_chunk(grant_blob_id, live_nodes, self.r)
                for gn in grant_nodes:
                    await self._send_chunk_to_node(
                        client, gn, grant_blob_id, grant_json, kind="grant"
                    )

        return {
            "object_id": object_id,
            "manifest_id": manifest_id,
            "size": len(data),
            "chunk_count": len(chunks_meta),
            "merkle_root": merkle_root,
            "dek": dek.hex(),
            "manifest": manifest,
            "grant_blob_id": grant_blob_id,
            "placements": [
                {"chunk_id": cid, "nodes": [n.id for n in uploaded_map.get(cid, [])]}
                for cid in chunk_ids
            ],
        }

    async def read_object_bytes(
        self,
        manifest: dict[str, Any],
        dek: bytes,
        nodes: Sequence[StorageNodeInfo],
        byte_start: int | None = None,
        byte_end: int | None = None,
    ) -> bytes:
        """Download, verify SHA-256, and decrypt chunks."""
        chunks_meta = manifest.get("chunks", [])
        object_id = manifest["object_id"]
        total_size = manifest["size"]

        if byte_start is None:
            byte_start = 0
        if byte_end is None or byte_end >= total_size:
            byte_end = total_size - 1

        if total_size == 0 or byte_start > byte_end:
            return b""

        all_ranked_nodes = {c["id"]: rank_all_nodes(c["id"], nodes) for c in chunks_meta}

        full_plaintext = bytearray()

        async with httpx.AsyncClient(verify=False) as client:
            for c in chunks_meta:
                cid = c["id"]
                idx = c["i"]
                nonce_b64 = c["nonce"]
                ranked = all_ranked_nodes[cid]

                ciphertext: bytes | None = None

                for node in ranked:
                    url = f"{node.endpoint.rstrip('/')}/v1/chunks/{cid}"
                    try:
                        res = await client.get(url, timeout=5.0)
                        if res.status_code == 200:
                            actual_hash = hashlib.sha256(res.content).hexdigest().lower()
                            if actual_hash == cid:
                                ciphertext = res.content
                                break
                            else:
                                logger.warning(f"Corrupt chunk {cid} detected on node {node.id}")
                    except Exception:
                        continue

                if ciphertext is None:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Could not retrieve valid replica for chunk {cid}",
                    )

                # Decrypt AES-256-GCM
                plaintext = decrypt_chunk(
                    dek=dek,
                    ciphertext=ciphertext,
                    nonce_b64=nonce_b64,
                    object_id=object_id,
                    chunk_index=idx,
                )
                full_plaintext.extend(plaintext)

        return bytes(full_plaintext[byte_start : byte_end + 1])


coordinator = StorageCoordinator()
