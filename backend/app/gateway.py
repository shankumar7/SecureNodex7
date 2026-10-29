"""SecureNodeX Gateway Service (snx-gateway)."""

import asyncio
import contextlib
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from starlette.responses import Response

from backend.app.metrics import SERVICE_UP, metrics_response

background_task: asyncio.Task[None] | None = None


async def gateway_loop() -> None:
    """Placeholder background loop for MQTT message processing and batching."""
    while True:
        try:
            await asyncio.sleep(5)
        except asyncio.CancelledError:
            break


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    SERVICE_UP.labels(service="snx-gateway").set(1)
    global background_task
    background_task = asyncio.create_task(gateway_loop())
    yield
    if background_task:
        background_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await background_task
    SERVICE_UP.labels(service="snx-gateway").set(0)


app = FastAPI(
    title="SecureNodeX Gateway Service",
    version="0.1.0",
    description="MQTT mTLS gateway verifying device signatures, sequences, timestamps, and batching telemetry.",
    lifespan=lifespan,
)


@app.get("/healthz", summary="Liveness Probe")
async def healthz() -> dict[str, str]:
    return {"status": "ok", "service": "snx-gateway"}


@app.get("/readyz", summary="Readiness Probe")
async def readyz() -> dict[str, str]:
    return {"status": "ready", "service": "snx-gateway"}


@app.get("/metrics", summary="Prometheus Metrics")
async def metrics() -> Response:
    return metrics_response()
