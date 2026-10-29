"""Device registration, Mode A provisioning, and Mode B enrollment tests (AT-01, AT-17)."""

import pytest
from cryptography.hazmat.primitives import serialization
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.auth.rbac import RoleBit
from backend.app.auth.security import create_access_token, hash_password
from backend.app.db.models import Principal
from pki.ca_core import create_csr, generate_p256_private_key


@pytest.mark.asyncio
async def test_device_provisioning_mode_a_and_b(
    db_session: AsyncSession, async_client: AsyncClient
) -> None:
    admin_id = "did:snx:admin1"
    admin_user = Principal(
        id=admin_id,
        username="admin",
        password_hash=hash_password("Pass123!"),
        display_name="Admin",
        roles_mask=RoleBit.ADMIN.value,
        status="ACTIVE",
    )
    db_session.add(admin_user)
    await db_session.commit()

    token = create_access_token(
        principal_id=admin_id,
        username="admin",
        roles=["ADMIN"],
        role_mask=RoleBit.ADMIN.value,
    )

    # 1. Register device 1
    reg_res = await async_client.post(
        "/v1/devices",
        json={"label": "Smart Sensor 1", "type": "sensor"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert reg_res.status_code == 201
    d1 = reg_res.json()
    d1_id = d1["device_id"]
    assert d1["status"] == "PENDING"

    # 2. Mode A Provisioning
    prov_res = await async_client.post(
        f"/v1/devices/{d1_id}/provision",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert prov_res.status_code == 200
    bundle = prov_res.json()
    assert "private_key_pem" in bundle
    assert "certificate_pem" in bundle
    assert "fingerprint" in bundle
    assert bundle["config"]["device_id"] == d1_id

    # 3. Register device 2 (for Mode B enrollment)
    reg2_res = await async_client.post(
        "/v1/devices",
        json={"label": "Smart Sensor 2", "type": "sensor"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert reg2_res.status_code == 201
    d2 = reg2_res.json()
    d2_id = d2["device_id"]
    enroll_token = d2["enrollment_token"]

    # Generate CSR on client
    client_key = generate_p256_private_key()
    csr = create_csr(client_key, common_name=d2_id, kind="device")
    csr_pem = csr.public_bytes(serialization.Encoding.PEM).decode("utf-8")

    # 4. Mode B Enrollment
    enroll_res = await async_client.post(
        "/v1/enroll",
        json={"csr_pem": csr_pem, "token": enroll_token},
    )
    assert enroll_res.status_code == 200
    enroll_data = enroll_res.json()
    assert enroll_data["device_id"] == d2_id
    assert "certificate_pem" in enroll_data
    assert "chain_pem" in enroll_data

    # 5. Revoke Device 1
    rev_res = await async_client.post(
        f"/v1/devices/{d1_id}/revoke",
        json={"reason": "Device compromised"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert rev_res.status_code == 200
    assert rev_res.json()["status"] == "REVOKED"
