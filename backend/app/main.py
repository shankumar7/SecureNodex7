"""SecureNodeX Core API (snx-api) FastAPI Application."""

import logging
import uuid
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from backend.app.db.base import Base
from backend.app.db.session import async_engine
from backend.app.routers import (
    audit,
    auth,
    batches,
    devices,
    health,
    objects,
    principals,
    storage_admin,
    stream,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("snx-api")


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Ensure every request has an X-Correlation-Id header."""

    async def dispatch(self, request: Request, call_next: Any) -> Response:
        cid = request.headers.get("X-Correlation-Id") or f"snx-{uuid.uuid4().hex[:12]}"
        request.state.correlation_id = cid
        response = await call_next(request)
        response.headers["X-Correlation-Id"] = cid
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables in development / test environments if needed
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables initialized.")
    yield
    await async_engine.dispose()
    logger.info("Database engine disposed.")


app = FastAPI(
    title="SecureNodeX API",
    version="1.0.0",
    docs_url="/docs",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Middleware
app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# RFC 7807 Exception Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    cid = getattr(request.state, "correlation_id", "unknown")
    status_code = exc.status_code
    title_map = {
        400: "Bad Request",
        401: "Unauthorized",
        403: "Forbidden",
        404: "Not Found",
        409: "Conflict",
        422: "Unprocessable Entity",
        500: "Internal Server Error",
    }
    return JSONResponse(
        status_code=status_code,
        media_type="application/problem+json",
        content={
            "type": f"https://api.snx.lan/errors/{status_code}",
            "title": title_map.get(status_code, "HTTP Error"),
            "status": status_code,
            "detail": exc.detail,
            "correlation_id": cid,
        },
        headers={"X-Correlation-Id": cid},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    cid = getattr(request.state, "correlation_id", "unknown")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        media_type="application/problem+json",
        content={
            "type": "https://api.snx.lan/errors/422",
            "title": "Validation Error",
            "status": 422,
            "detail": exc.errors(),
            "correlation_id": cid,
        },
        headers={"X-Correlation-Id": cid},
    )


# Include Routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(principals.router)
app.include_router(devices.router)
app.include_router(audit.router)
app.include_router(objects.router)
app.include_router(storage_admin.router)
app.include_router(batches.router)
app.include_router(stream.router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8443, reload=True)
