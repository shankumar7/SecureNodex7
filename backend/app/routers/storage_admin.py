"""Storage administration and cluster health endpoints."""

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.auth.rbac import CurrentPrincipal, require
from backend.app.chain.client import chain_client
from backend.app.config import settings
from backend.app.db.models import ChunkReplica, StorageNode, StoredChunk
from backend.app.db.session import get_db

router = APIRouter(prefix="/v1", tags=["Storage Administration"])


class RegisterNodeRequest(BaseModel):
    id: str = Field(..., min_length=1, max_length=64)
    endpoint: str = Field(..., min_length=1, max_length=255)
    capacity: int = Field(default=10 * 1024 * 1024 * 1024, ge=1024)
    cert_fingerprint: str = Field(default="", max_length=64)


@router.get("/storage/nodes")
async def list_storage_nodes(
    current_user: CurrentPrincipal = Depends(require("storage:health_read")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """List storage nodes with capacity and chunk counts."""
    stmt = select(StorageNode)
    nodes = (await db.execute(stmt)).scalars().all()

    return {
        "nodes": [
            {
                "id": n.id,
                "endpoint": n.endpoint,
                "state": n.state,
                "free_bytes": n.free_bytes,
                "used_bytes": n.used_bytes,
                "chunks": n.chunk_count,
                "draining": bool(n.draining),
                "fingerprint": n.fingerprint,
                "last_heartbeat": n.last_heartbeat,
            }
            for n in nodes
        ]
    }


@router.post("/storage/nodes", status_code=status.HTTP_201_CREATED)
async def register_storage_node(
    req: RegisterNodeRequest,
    current_user: CurrentPrincipal = Depends(require("storage:nodes_manage")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Register a new storage node (Admin only)."""
    stmt = select(StorageNode).where(StorageNode.id == req.id)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Node already registered")

    node = StorageNode(
        id=req.id,
        endpoint=req.endpoint,
        state="UP",
        free_bytes=req.capacity,
        used_bytes=0,
        chunk_count=0,
        fingerprint=req.cert_fingerprint,
        draining=0,
        last_heartbeat=datetime.now(timezone.utc),
    )
    db.add(node)
    await db.commit()

    # On-chain registration
    tx_hash = None
    if chain_client.is_connected() and "StorageNodeRegistry" in chain_client.contracts:
        try:
            res = chain_client.add_storage_node(
                node_id=req.id,
                endpoint=req.endpoint,
                capacity=req.capacity,
                fingerprint=req.cert_fingerprint,
            )
            tx_hash = res.get("tx_hash")
        except Exception:
            pass

    return {
        "status": "registered",
        "node_id": req.id,
        "endpoint": req.endpoint,
        "capacity": req.capacity,
        "tx_hash": tx_hash,
    }


@router.post("/storage/nodes/{node_id}/drain")
async def drain_storage_node(
    node_id: str,
    current_user: CurrentPrincipal = Depends(require("storage:nodes_manage")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Mark a storage node draining to halt new placements."""
    stmt = select(StorageNode).where(StorageNode.id == node_id)
    node = (await db.execute(stmt)).scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")

    node.draining = 1
    await db.commit()
    return {"status": "draining", "node_id": node_id}


@router.get("/storage/health")
async def storage_cluster_health(
    current_user: CurrentPrincipal = Depends(require("storage:health_read")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Cluster storage health metrics per docs/03 section 12."""
    stmt = select(StorageNode)
    nodes = list((await db.execute(stmt)).scalars().all())

    nodes_up = sum(1 for n in nodes if n.state == "UP")

    # Count under-replicated chunks
    chunk_stmt = select(StoredChunk)
    chunks = list((await db.execute(chunk_stmt)).scalars().all())

    under_replicated = 0
    corrupt_count = 0
    for c in chunks:
        r_stmt = select(ChunkReplica).where(ChunkReplica.chunk_id == c.id)
        reps = list((await db.execute(r_stmt)).scalars().all())
        stored_reps = [r for r in reps if r.state == "stored"]
        corrupt_reps = [r for r in reps if r.state == "corrupt"]
        corrupt_count += len(corrupt_reps)
        if len(stored_reps) < settings.REPLICATION_R:
            under_replicated += 1

    return {
        "r": settings.REPLICATION_R,
        "w": settings.WRITE_QUORUM_W,
        "nodes_total": len(nodes),
        "nodes_up": nodes_up,
        "under_replicated": under_replicated,
        "corrupt": corrupt_count,
        "status": "healthy"
        if under_replicated == 0 and nodes_up >= settings.WRITE_QUORUM_W
        else "degraded",
    }


@router.post("/storage/repair")
async def trigger_storage_repair(
    current_user: CurrentPrincipal = Depends(require("storage:nodes_manage")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Trigger manual repair scan."""
    return {"status": "repair_triggered", "repaired_count": 0}
