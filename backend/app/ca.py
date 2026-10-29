"""SecureNodeX CA Service (snx-ca)."""

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from starlette.responses import Response

from backend.app.metrics import SERVICE_UP, metrics_response


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    SERVICE_UP.labels(service="snx-ca").set(1)
    yield
    SERVICE_UP.labels(service="snx-ca").set(0)


app = FastAPI(
    title="SecureNodeX CA Service",
    version="0.1.0",
    description="Intermediate CA signing service for X.509 ECC P-256 certificates.",
    lifespan=lifespan,
)


@app.get("/healthz", summary="Liveness Probe")
async def healthz() -> dict[str, str]:
    return {"status": "ok", "service": "snx-ca"}


@app.get("/readyz", summary="Readiness Probe")
async def readyz() -> dict[str, str]:
    return {"status": "ready", "service": "snx-ca"}


@app.get("/metrics", summary="Prometheus Metrics")
async def metrics() -> Response:
    return metrics_response()
