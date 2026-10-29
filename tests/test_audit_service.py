"""Audit service and cryptographic hash chain verification tests (AT-11, AT-19)."""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.app.auth.rbac import RoleBit
from backend.app.auth.security import create_access_token, hash_password
from backend.app.db.base import Base
from backend.app.db.models import AuditEvent, Principal
from backend.app.db.session import get_db
from backend.app.main import app
from backend.app.services.audit_service import audit_service

test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
TestSessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_audit_hash_chain_and_tamper_detection() -> None:
    """AT-11: Sequential hash chain recomputation.

    AT-19: Tampered audit event is detected during verification.
    """
    admin_id = "did:snx:auditor1"
    async with TestSessionLocal() as session:
        auditor = Principal(
            id=admin_id,
            username="auditor",
            password_hash=hash_password("Pass123!"),
            display_name="Auditor",
            roles_mask=RoleBit.AUDITOR.value,
            status="ACTIVE",
        )
        session.add(auditor)
        await session.commit()

        # Record 3 events
        await audit_service.record_event(
            db=session,
            event_type="OBJECT_CREATE",
            actor=admin_id,
            subject="obj_1",
            data_hash="0x" + "1" * 64,
            correlation_id="corr-1",
            write_on_chain=False,
        )
        await audit_service.record_event(
            db=session,
            event_type="OBJECT_SHARE",
            actor=admin_id,
            subject="obj_1",
            data_hash="0x" + "2" * 64,
            correlation_id="corr-2",
            write_on_chain=False,
        )
        await audit_service.record_event(
            db=session,
            event_type="ASSET_MINT",
            actor=admin_id,
            subject="asset_1",
            data_hash="0x" + "3" * 64,
            correlation_id="corr-3",
            write_on_chain=False,
        )

    token = create_access_token(
        principal_id=admin_id,
        username="auditor",
        roles=["AUDITOR"],
        role_mask=RoleBit.AUDITOR.value,
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Verify audit log -> must be valid
        res = await client.get(
            "/v1/audit/verify",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["valid"] is True
        assert data["checked"] == 3
        assert data["tampered_index"] is None

        # 2. Tamper with event #2 in the database (simulate attacker modification)
        async with TestSessionLocal() as session:
            stmt = select(AuditEvent).where(AuditEvent.seq == 2)
            ev2 = (await session.execute(stmt)).scalar_one()
            ev2.data_hash = "0x" + "f" * 64  # Corrupted data hash
            await session.commit()

        # 3. Verify again -> must detect tampering at index 1 (seq 2) (AT-19)
        tamper_res = await client.get(
            "/v1/audit/verify",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert tamper_res.status_code == 200
        tamper_data = tamper_res.json()
        assert tamper_data["valid"] is False
        assert tamper_data["tampered_index"] == 1
