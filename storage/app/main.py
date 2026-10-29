"""SecureNodeX Storage Node Service (snx-storage).

mTLS-protected content-addressed chunk store with atomic writes, sharded directory layout,
streaming I/O, peer-to-peer replication, inventory pagination, and Prometheus metrics.
"""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
import hashlib
import json
import logging
import os
import shutil
from typing import Any, AsyncIterator
import httpx
from fastapi import BackgroundTasks, FastAPI, Header, HTTPException, Query, Request, Response, status
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, generate_latest

from storage.app.config import storage_settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("snx-storage")

STORAGE_CHUNKS_TOTAL = Gauge(
    "snx_storage_chunks_total", "Total chunks stored on this node", ["node_id"]
)
STORAGE_BYTES = Gauge("snx_storage_bytes", "Total storage bytes used on this node", ["node_id"])
STORAGE_OPERATIONS = Counter(
    "snx_storage_operations_total", "Storage chunk operations count", ["node_id", "op", "status"]
)


class ReplicateRequest(BaseModel):
    chunk_id: str = Field(..., min_length=64, max_length=64)
    source_node: str = Field(..., min_length=1)


class InventoryItem(BaseModel):
    id: str
    size: int
    kind: str
    stored_at: str


class InventoryResponse(BaseModel):
    items: list[InventoryItem]
    next_cursor: str | None = None
    total: int


# Local in-memory / file-backed metadata cache for fast inventory queries
INDEX_FILE_NAME = ".snx_inventory.json"


class StorageStore:
    def __init__(self, base_dir: str, node_id: str) -> None:
        self.base_dir = os.path.abspath(base_dir)
        self.node_id = node_id
        self.index_file = os.path.join(self.base_dir, INDEX_FILE_NAME)
        self.inventory: dict[str, dict[str, Any]] = {}
        os.makedirs(self.base_dir, exist_ok=True)
        self._load_inventory()

    def _load_inventory(self) -> None:
        if os.path.exists(self.index_file):
            try:
                with open(self.index_file, "r") as f:
                    self.inventory = json.load(f)
                return
            except Exception as e:
                logger.warning(f"Failed to load inventory file: {e}")

        # Re-scan filesystem if index is missing or corrupted
        self.inventory = {}
        for root, _, files in os.walk(self.base_dir):
            for filename in files:
                if filename.startswith(".") or len(filename) != 64:
                    continue
                file_path = os.path.join(root, filename)
                try:
                    stat = os.stat(file_path)
                    stored_ts = datetime.fromtimestamp(stat.st_ctime, tz=timezone.utc).isoformat()
                    self.inventory[filename] = {
                        "id": filename,
                        "size": stat.st_size,
                        "kind": "data",
                        "stored_at": stored_ts,
                    }
                except Exception:
                    pass
        self._save_inventory()

    def _save_inventory(self) -> None:
        tmp_file = self.index_file + ".tmp"
        try:
            with open(tmp_file, "w") as f:
                json.dump(self.inventory, f)
            os.replace(tmp_file, self.index_file)
        except Exception as e:
            logger.warning(f"Could not persist inventory index: {e}")

    def get_chunk_path(self, chunk_id: str) -> str:
        shard = chunk_id[:2]
        shard_dir = os.path.join(self.base_dir, shard)
        os.makedirs(shard_dir, exist_ok=True)
        return os.path.join(shard_dir, chunk_id)

    def write_chunk(self, chunk_id: str, content: bytes, kind: str = "data") -> bool:
        """Atomic write with fsync + rename."""
        target_path = self.get_chunk_path(chunk_id)
        tmp_path = target_path + f".tmp.{os.getpid()}"

        with open(tmp_path, "wb") as f:
            f.write(content)
            f.flush()
            os.fsync(f.fileno())

        os.replace(tmp_path, target_path)

        now_str = datetime.now(timezone.utc).isoformat()
        self.inventory[chunk_id] = {
            "id": chunk_id,
            "size": len(content),
            "kind": kind,
            "stored_at": now_str,
        }
        self._save_inventory()
        self._update_metrics()
        return True

    def delete_chunk(self, chunk_id: str) -> bool:
        path = self.get_chunk_path(chunk_id)
        existed = False
        if os.path.exists(path):
            os.remove(path)
            existed = True
        if chunk_id in self.inventory:
            del self.inventory[chunk_id]
            self._save_inventory()
            existed = True
        self._update_metrics()
        return existed

    def has_chunk(self, chunk_id: str) -> bool:
        path = self.get_chunk_path(chunk_id)
        return os.path.exists(path)

    def get_stats(self) -> dict[str, Any]:
        used = sum(item["size"] for item in self.inventory.values())
        free = max(0, storage_settings.MAX_CAPACITY_BYTES - used)
        return {
            "node_id": self.node_id,
            "state": "UP",
            "free_bytes": free,
            "used_bytes": used,
            "chunks": len(self.inventory),
            "version": "1.0.0",
        }

    def _update_metrics(self) -> None:
        stats = self.get_stats()
        STORAGE_CHUNKS_TOTAL.labels(node_id=self.node_id).set(stats["chunks"])
        STORAGE_BYTES.labels(node_id=self.node_id).set(stats["used_bytes"])


store = StorageStore(storage_settings.STORAGE_DIR, storage_settings.NODE_ID)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    store._update_metrics()
    yield


app = FastAPI(
    title=f"SecureNodeX Storage Node - {storage_settings.NODE_ID}",
    version="1.0.0",
    description="Decentralised chunk storage node service with content-addressed SHA-256 verification.",
    lifespan=lifespan,
)


@app.get("/healthz", summary="Liveness Probe")
async def healthz() -> dict[str, str]:
    return {"status": "ok", "service": "snx-storage", "node_id": storage_settings.NODE_ID}


@app.get("/readyz", summary="Readiness Probe")
async def readyz() -> dict[str, str]:
    return {"status": "ready", "service": "snx-storage", "node_id": storage_settings.NODE_ID}


@app.get("/metrics", summary="Prometheus Metrics")
async def metrics() -> Response:
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/v1/health", summary="Storage Node Health & Capacity")
async def node_health() -> dict[str, Any]:
    """Storage node health check per docs/03 section 5."""
    return store.get_stats()


@app.put("/v1/chunks/{chunk_id}", status_code=status.HTTP_201_CREATED)
async def put_chunk(
    chunk_id: str,
    request: Request,
    x_snx_kind: str = Header(default="data", alias="X-SNX-Kind"),
) -> dict[str, Any]:
    """Store chunk atomically with SHA-256 verification (AT-13)."""
    norm_id = chunk_id.strip().lower()
    if len(norm_id) != 64:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid chunk ID length")

    body = await request.body()
    actual_hash = hashlib.sha256(body).hexdigest().lower()

    if actual_hash != norm_id:
        STORAGE_OPERATIONS.labels(node_id=storage_settings.NODE_ID, op="put", status="error").inc()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Content hash mismatch: expected {norm_id}, got {actual_hash}",
        )

    store.write_chunk(norm_id, body, kind=x_snx_kind)
    STORAGE_OPERATIONS.labels(node_id=storage_settings.NODE_ID, op="put", status="success").inc()

    return {
        "status": "stored",
        "id": norm_id,
        "size": len(body),
        "kind": x_snx_kind,
    }


@app.get("/v1/chunks/{chunk_id}")
async def get_chunk(chunk_id: str) -> FileResponse:
    """Stream stored chunk bytes."""
    norm_id = chunk_id.strip().lower()
    if not store.has_chunk(norm_id):
        STORAGE_OPERATIONS.labels(node_id=storage_settings.NODE_ID, op="get", status="not_found").inc()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chunk not found")

    path = store.get_chunk_path(norm_id)
    STORAGE_OPERATIONS.labels(node_id=storage_settings.NODE_ID, op="get", status="success").inc()
    return FileResponse(path, media_type="application/octet-stream")


@app.head("/v1/chunks/{chunk_id}")
async def head_chunk(chunk_id: str) -> Response:
    """Check existence and size of chunk."""
    norm_id = chunk_id.strip().lower()
    if not store.has_chunk(norm_id):
        return Response(status_code=status.HTTP_404_NOT_FOUND)

    item = store.inventory.get(norm_id)
    size = item["size"] if item else os.path.getsize(store.get_chunk_path(norm_id))
    kind = item.get("kind", "data") if item else "data"

    headers = {
        "Content-Length": str(size),
        "X-SNX-Kind": kind,
    }
    return Response(status_code=status.HTTP_200_OK, headers=headers)


@app.delete("/v1/chunks/{chunk_id}")
async def delete_chunk(chunk_id: str) -> dict[str, str]:
    """Delete a chunk."""
    norm_id = chunk_id.strip().lower()
    existed = store.delete_chunk(norm_id)
    if not existed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chunk not found")
    STORAGE_OPERATIONS.labels(node_id=storage_settings.NODE_ID, op="delete", status="success").inc()
    return {"status": "deleted", "id": norm_id}


@app.post("/v1/replicate")
async def replicate_chunk(req: ReplicateRequest) -> dict[str, Any]:
    """Pull chunk from a peer node, verify hash, and store locally (used by self-healing worker)."""
    norm_id = req.chunk_id.strip().lower()
    url = f"{req.source_node.rstrip('/')}/v1/chunks/{norm_id}"

    try:
        async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
            res = await client.get(url)
            if res.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Source node returned {res.status_code}",
                )
            content = res.content
            actual_hash = hashlib.sha256(content).hexdigest().lower()
            if actual_hash != norm_id:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Pulled content hash mismatch",
                )
            kind = res.headers.get("X-SNX-Kind", "data")
            store.write_chunk(norm_id, content, kind=kind)
            return {"status": "replicated", "id": norm_id, "size": len(content)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Replication failed: {e}")


@app.get("/v1/inventory", response_model=InventoryResponse)
async def get_inventory(
    limit: int = Query(default=50, ge=1, le=1000),
    cursor: str | None = Query(default=None),
) -> InventoryResponse:
    """Return paginated list of stored chunks."""
    all_keys = sorted(store.inventory.keys())
    start_idx = 0
    if cursor and cursor in all_keys:
        start_idx = all_keys.index(cursor) + 1

    page_keys = all_keys[start_idx : start_idx + limit]
    items = [
        InventoryItem(
            id=k,
            size=store.inventory[k]["size"],
            kind=store.inventory[k].get("kind", "data"),
            stored_at=store.inventory[k].get("stored_at", ""),
        )
        for k in page_keys
    ]

    next_cur = page_keys[-1] if len(page_keys) == limit and (start_idx + limit < len(all_keys)) else None
    return InventoryResponse(
        items=items,
        next_cursor=next_cur,
        total=len(all_keys),
    )
