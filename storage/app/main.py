"""SecureNodeX Storage Node Service (snx-storage)."""

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, generate_latest
from starlette.responses import Response

from storage.app.config import storage_settings

STORAGE_CHUNKS_TOTAL = Gauge(
    "snx_storage_chunks_total", "Total chunks stored on this node", ["node_id"]
)
STORAGE_BYTES = Gauge("snx_storage_bytes", "Total storage bytes used on this node", ["node_id"])
STORAGE_OPERATIONS = Counter(
    "snx_storage_operations_total", "Storage chunk operations count", ["node_id", "op", "status"]
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    STORAGE_CHUNKS_TOTAL.labels(node_id=storage_settings.NODE_ID).set(0)
    STORAGE_BYTES.labels(node_id=storage_settings.NODE_ID).set(0)
    yield


app = FastAPI(
    title=f"SecureNodeX Storage Node - {storage_settings.NODE_ID}",
    version="0.1.0",
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
async def node_health() -> dict[str, object]:
    """Storage node health check per docs/03 section 5."""
    return {
        "node_id": storage_settings.NODE_ID,
        "state": "UP",
        "free_bytes": storage_settings.MAX_CAPACITY_BYTES,
        "used_bytes": 0,
        "chunks": 0,
        "version": "0.1.0",
    }
