"""SecureNodeX API Service (snx-api)."""

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import Response

from backend.app.config import settings
from backend.app.metrics import SERVICE_UP, metrics_response


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    SERVICE_UP.labels(service="snx-api").set(1)
    yield
    SERVICE_UP.labels(service="snx-api").set(0)


app = FastAPI(
    title="SecureNodeX API",
    version="0.1.0",
    description="Decentralised ECC-secured platform for IoT identity, RBAC, digital assets, tamper-evident audit and split-replicated storage.",
    lifespan=lifespan,
    docs_url="/docs",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz", summary="Liveness Probe")
async def healthz() -> dict[str, str]:
    return {"status": "ok", "service": "snx-api"}


@app.get("/readyz", summary="Readiness Probe")
async def readyz() -> dict[str, str]:
    return {"status": "ready", "service": "snx-api"}


@app.get("/metrics", summary="Prometheus Metrics")
async def metrics() -> Response:
    return metrics_response()


@app.get("/v1/info", summary="System Information")
async def info() -> dict[str, object]:
    return {
        "project": settings.PROJECT_NAME,
        "version": "0.1.0",
        "chain_id": settings.CHAIN_ID,
        "storage": {
            "chunk_size": settings.CHUNK_SIZE,
            "replication_r": settings.REPLICATION_R,
            "write_quorum_w": settings.WRITE_QUORUM_W,
        },
        "status": "operational",
    }
