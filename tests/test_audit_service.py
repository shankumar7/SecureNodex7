"""Audit service and cryptographic hash chain verification tests (AT-11, AT-19)."""

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.auth.rbac import RoleBit
from backend.app.auth.security import create_access_token, hash_password
from backend.app.db.models import AuditEvent, Principal
from backend.app.services.audit_service import audit_service


@pytest.mark.asyncio
async def test_audit_hash_chain_and_tamper_detection(
    db_session: AsyncSession, async_client: AsyncClient
) -> None:
    """AT-11: Sequential hash chain recomputation.

    AT-19: Tampered audit event is detected during verification.
    """
    admin_id = "did:snx:auditor1"
    auditor = Principal(
        id=admin_id,
        username="auditor",
        password_hash=hash_password("Pass123!"),
        display_name="Auditor",
        roles_mask=RoleBit.AUDITOR.value,
        status="ACTIVE",
    )
    db_session.add(auditor)
    await db_session.commit()

    # Record 3 events
    await audit_service.record_event(
        db=db_session,
        event_type="OBJECT_CREATE",
        actor=admin_id,
        subject="obj_1",
        data_hash="0x" + "1" * 64,
        correlation_id="corr-1",
        write_on_chain=False,
    )
    await audit_service.record_event(
        db=db_session,
        event_type="OBJECT_SHARE",
        actor=admin_id,
        subject="obj_1",
        data_hash="0x" + "2" * 64,
        correlation_id="corr-2",
        write_on_chain=False,
    )
    await audit_service.record_event(
        db=db_session,
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

    # 1. Verify audit log -> must be valid
    res = await async_client.get(
        "/v1/audit/verify",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["valid"] is True
    assert data["checked"] == 3
    assert data["tampered_index"] is None

    # 2. Tamper with event #2 in the database (simulate attacker modification)
    stmt = select(AuditEvent).where(AuditEvent.seq == 2)
    ev2 = (await db_session.execute(stmt)).scalar_one()
    ev2.data_hash = "0x" + "f" * 64  # Corrupted data hash
    await db_session.commit()

    # 3. Verify again -> must detect tampering at index 1 (seq 2) (AT-19)
    tamper_res = await async_client.get(
        "/v1/audit/verify",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert tamper_res.status_code == 200
    tamper_data = tamper_res.json()
    assert tamper_data["valid"] is False
    assert tamper_data["tampered_index"] == 1
