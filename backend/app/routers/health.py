"""Health checks and metrics endpoints."""

from typing import Any
from fastapi import APIRouter, Depends, Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.chain.client import chain_client
from backend.app.db.session import get_db

router = APIRouter(tags=["Health"])


@router.get("/healthz")
async def healthz() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok", "service": "snx-api"}


@router.get("/readyz")
async def readyz() -> dict[str, str]:
    """Readiness probe."""
    return {"status": "ready", "service": "snx-api"}


@router.get("/v1/info")
async def info() -> dict[str, Any]:
    """Service metadata information."""
    return {
        "project": "SecureNodeX",
        "service": "snx-api",
        "version": "1.0.0",
        "chain_id": 20260,
    }


@router.get("/metrics")
async def metrics() -> Response:
    """Prometheus metrics endpoint."""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
