"""Self-healing repair, heartbeat monitoring, and background maintenance worker."""

import asyncio
import logging
from datetime import datetime, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.config import settings
from backend.app.db.models import ChunkReplica, StorageNode, StoredChunk
from backend.app.services.audit_service import audit_service
from backend.app.storage.placement import StorageNodeInfo, rank_all_nodes

logger = logging.getLogger("snx.repair")


class StorageRepairWorker:
    """Background worker for node heartbeat monitoring, under-replicated chunk repair, and scrubbing."""

    def __init__(self, concurrency_limit: int = 20) -> None:
        self.semaphore = asyncio.Semaphore(concurrency_limit)
        self.r = settings.REPLICATION_R
        self.w = settings.WRITE_QUORUM_W

    async def check_node_heartbeats(self, db: AsyncSession) -> dict[str, int]:
        """Poll /v1/health on all registered nodes and update node states."""
        stmt = select(StorageNode)
        nodes = (await db.execute(stmt)).scalars().all()
        now = datetime.now(timezone.utc)

        up_count = 0
        down_count = 0

        async with httpx.AsyncClient(timeout=3.0, verify=False) as client:
            for node in nodes:
                url = f"{node.endpoint.rstrip('/')}/v1/health"
                try:
                    res = await client.get(url)
                    if res.status_code == 200:
                        data = res.json()
                        node.state = "UP"
                        node.free_bytes = data.get("free_bytes", node.free_bytes)
                        node.used_bytes = data.get("used_bytes", node.used_bytes)
                        node.chunk_count = data.get("chunks", node.chunk_count)
                        node.last_heartbeat = now
                        up_count += 1
                    else:
                        node.state = "DOWN"
                        down_count += 1
                except Exception:
                    node.state = "DOWN"
                    down_count += 1

        await db.commit()
        return {"up": up_count, "down": down_count}

    async def repair_under_replicated_chunks(self, db: AsyncSession) -> int:
        """Find chunks with replica count < R and replicate to next-ranked healthy node."""
        stmt_nodes = select(StorageNode).where(StorageNode.state == "UP", StorageNode.draining == 0)
        live_nodes_db = (await db.execute(stmt_nodes)).scalars().all()
        live_nodes = [
            StorageNodeInfo(
                id=n.id,
                endpoint=n.endpoint,
                state=n.state,
                free_bytes=n.free_bytes,
                draining=bool(n.draining),
            )
            for n in live_nodes_db
        ]

        if not live_nodes:
            return 0

        # Find chunks
        stmt_chunks = select(StoredChunk)
        chunks = (await db.execute(stmt_chunks)).scalars().all()
        repaired_count = 0

        async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
            for chunk in chunks:
                r_stmt = select(ChunkReplica).where(
                    ChunkReplica.chunk_id == chunk.id,
                    ChunkReplica.state == "stored",
                )
                existing_reps = (await db.execute(r_stmt)).scalars().all()
                existing_node_ids = {r.node_id for r in existing_reps}

                if len(existing_reps) < self.r and len(existing_reps) > 0:
                    # Find a healthy source node
                    source_rep = existing_reps[0]
                    src_node = next((n for n in live_nodes if n.id == source_rep.node_id), None)
                    if not src_node:
                        continue

                    # Pick target candidate from HRW ranking
                    ranked = rank_all_nodes(chunk.id, live_nodes)
                    targets = [n for n in ranked if n.id not in existing_node_ids]

                    if targets:
                        target = targets[0]
                        async with self.semaphore:
                            try:
                                rep_url = f"{target.endpoint.rstrip('/')}/v1/replicate"
                                res = await client.post(
                                    rep_url,
                                    json={"chunk_id": chunk.id, "source_node": src_node.endpoint},
                                )
                                if res.status_code == 200:
                                    new_rep = ChunkReplica(
                                        chunk_id=chunk.id,
                                        node_id=target.id,
                                        state="stored",
                                    )
                                    db.add(new_rep)
                                    repaired_count += 1
                            except Exception as e:
                                logger.debug(f"Replication failed for chunk {chunk.id[:8]} to {target.id}: {e}")

        if repaired_count > 0:
            await db.commit()
            await audit_service.record_event(
                db=db,
                event_type="REPAIR_COMPLETED",
                actor="snx-worker",
                subject="cluster",
                data_hash="0x" + "0" * 64,
                correlation_id="repair-cycle",
                details={"repaired_chunks": repaired_count},
                write_on_chain=False,
            )

        return repaired_count


repair_worker = StorageRepairWorker()
