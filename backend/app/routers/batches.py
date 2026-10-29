"""Batches and Merkle proof verification endpoints."""

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.auth.rbac import CurrentPrincipal, require
from backend.app.db.models import BatchRecord
from backend.app.db.session import get_db
from backend.app.gateway_batcher import (
    compute_batch_inclusion_proof,
    verify_batch_inclusion_proof,
)

router = APIRouter(prefix="/v1", tags=["Batches & Proofs"])


class VerifyProofRequest(BaseModel):
    envelope: dict[str, Any]
    proof: list[dict[str, str]]
    expected_root: str


@router.get("/batches")
async def list_batches(
    limit: int = Query(default=50, ge=1, le=100),
    current_user: CurrentPrincipal = Depends(require("audit:read")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """List anchored batches (Admin/Manager/Auditor)."""
    stmt = select(BatchRecord).order_by(BatchRecord.created_at.desc()).limit(limit)
    batches = (await db.execute(stmt)).scalars().all()

    return {
        "batches": [
            {
                "id": b.id,
                "batch_root": b.batch_root,
                "manifest_id": b.manifest_id,
                "message_count": b.message_count,
                "from_ts": b.from_ts,
                "to_ts": b.to_ts,
                "tx_hash": b.tx_hash,
                "created_at": b.created_at,
            }
            for b in batches
        ]
    }


@router.get("/batches/{batch_id}")
async def get_batch(
    batch_id: str,
    current_user: CurrentPrincipal = Depends(require("audit:read")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Get details for a specific batch."""
    stmt = select(BatchRecord).where(BatchRecord.id == batch_id)
    b = (await db.execute(stmt)).scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")

    return {
        "id": b.id,
        "batch_root": b.batch_root,
        "manifest_id": b.manifest_id,
        "message_count": b.message_count,
        "from_ts": b.from_ts,
        "to_ts": b.to_ts,
        "tx_hash": b.tx_hash,
        "created_at": b.created_at,
    }


@router.get("/batches/{batch_id}/proof/{seq}")
async def get_batch_proof(
    batch_id: str,
    seq: int,
    current_user: CurrentPrincipal = Depends(require("audit:read")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Retrieve Merkle inclusion proof for a message sequence number inside a batch."""
    stmt = select(BatchRecord).where(BatchRecord.id == batch_id)
    b = (await db.execute(stmt)).scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")

    envelopes = json.loads(b.messages_json)
    target_idx = next((i for i, e in enumerate(envelopes) if e.get("s") == seq), None)

    if target_idx is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Message sequence {seq} not found in batch {batch_id}",
        )

    target_envelope = envelopes[target_idx]
    proof = compute_batch_inclusion_proof(envelopes, target_idx)
    root_hex = b.batch_root[2:] if b.batch_root.startswith("0x") else b.batch_root

    return {
        "batch_id": batch_id,
        "seq": seq,
        "message": target_envelope,
        "proof": proof,
        "merkle_root": b.batch_root,
        "verified": verify_batch_inclusion_proof(target_envelope, proof, root_hex),
    }


@router.post("/batches/verify-proof")
async def verify_proof_endpoint(req: VerifyProofRequest) -> dict[str, Any]:
    """Verify a Merkle inclusion proof independently."""
    root_hex = req.expected_root[2:] if req.expected_root.startswith("0x") else req.expected_root
    is_valid = verify_batch_inclusion_proof(req.envelope, req.proof, root_hex)
    return {
        "valid": is_valid,
        "merkle_root": req.expected_root,
    }
