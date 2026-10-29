"""Database engine and session management."""

from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session, sessionmaker

from backend.app.config import settings

# Determine async database URL
raw_db_url = settings.DATABASE_URL
if raw_db_url.startswith("postgresql://"):
    async_db_url = raw_db_url.replace("postgresql://", "postgresql+psycopg://", 1)
    sync_db_url = raw_db_url.replace("postgresql://", "postgresql+psycopg://", 1)
elif raw_db_url.startswith("postgresql+psycopg://"):
    async_db_url = raw_db_url
    sync_db_url = raw_db_url
elif raw_db_url.startswith("sqlite://"):
    async_db_url = raw_db_url.replace("sqlite://", "sqlite+aiosqlite://", 1)
    sync_db_url = raw_db_url
elif raw_db_url.startswith("sqlite+aiosqlite://"):
    async_db_url = raw_db_url
    sync_db_url = raw_db_url.replace("sqlite+aiosqlite://", "sqlite://", 1)
else:
    async_db_url = raw_db_url
    sync_db_url = raw_db_url

# Async engine & session
connect_args: dict[str, Any] = {}
if "sqlite" in async_db_url:
    connect_args["check_same_thread"] = False

async_engine = create_async_engine(
    async_db_url,
    echo=False,
    future=True,
    connect_args=connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Sync engine & session (for Alembic & synchronous tasks)
sync_engine = create_engine(
    sync_db_url,
    echo=False,
    future=True,
    connect_args=connect_args if "sqlite" in sync_db_url else {},
)

SyncSessionLocal = sessionmaker(
    bind=sync_engine,
    class_=Session,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for yielding async db sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
