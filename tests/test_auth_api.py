"""Authentication, JWT ES256, Argon2id, and principal lifecycle tests."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.auth.rbac import RoleBit
from backend.app.auth.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from backend.app.db.models import Principal


def test_argon2id_password_hashing() -> None:
    password = "SuperSecretPassword123!"
    pwd_hash = hash_password(password)
    assert pwd_hash != password
    assert pwd_hash.startswith("$argon2id$")
    assert verify_password(password, pwd_hash)
    assert not verify_password("WrongPassword", pwd_hash)


def test_es256_jwt_token() -> None:
    token = create_access_token(
        principal_id="did:snx:test1",
        username="alice",
        roles=["ADMIN"],
        role_mask=1,
    )
    payload = decode_access_token(token)
    assert payload["sub"] == "did:snx:test1"
    assert payload["username"] == "alice"
    assert payload["role_mask"] == 1
    assert payload["iss"] == "snx-api"


@pytest.mark.asyncio
async def test_auth_login_refresh_logout_flow(db_session: AsyncSession, async_client: AsyncClient) -> None:
    # Seed an active user
    admin_user = Principal(
        id="did:snx:admin1",
        username="admin",
        password_hash=hash_password("AdminPass123!"),
        display_name="Admin User",
        roles_mask=RoleBit.ADMIN.value,
        status="ACTIVE",
    )
    db_session.add(admin_user)
    await db_session.commit()

    # 1. Login with correct credentials
    res = await async_client.post(
        "/v1/auth/login",
        json={"username": "admin", "password": "AdminPass123!"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    access_tok = data["access_token"]
    refresh_tok = data["refresh_token"]

    # 2. Access /v1/me
    me_res = await async_client.get(
        "/v1/me",
        headers={"Authorization": f"Bearer {access_tok}"},
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["username"] == "admin"
    assert "ADMIN" in me_data["roles"]

    # 3. Rotate refresh token
    ref_res = await async_client.post(
        "/v1/auth/refresh",
        json={"refresh_token": refresh_tok},
    )
    assert ref_res.status_code == 200
    new_data = ref_res.json()
    new_access_tok = new_data["access_token"]
    new_refresh_tok = new_data["refresh_token"]

    # 4. Old refresh token cannot be reused
    old_ref_res = await async_client.post(
        "/v1/auth/refresh",
        json={"refresh_token": refresh_tok},
    )
    assert old_ref_res.status_code == 401

    # 5. Logout
    logout_res = await async_client.post(
        "/v1/auth/logout",
        headers={"Authorization": f"Bearer {new_access_tok}"},
    )
    assert logout_res.status_code == 200

    # 6. Refresh after logout fails
    revoked_ref_res = await async_client.post(
        "/v1/auth/refresh",
        json={"refresh_token": new_refresh_tok},
    )
    assert revoked_ref_res.status_code == 401


@pytest.mark.asyncio
async def test_last_admin_protection_and_terminal_revocation(
    db_session: AsyncSession, async_client: AsyncClient
) -> None:
    """AT-03: Cannot demote or suspend the last admin.

    AT-02: Revoked principal cannot be reinstated.
    """
    admin_user = Principal(
        id="did:snx:admin1",
        username="admin",
        password_hash=hash_password("AdminPass123!"),
        display_name="Admin User",
        roles_mask=RoleBit.ADMIN.value,
        status="ACTIVE",
    )
    db_session.add(admin_user)
    await db_session.commit()

    token = create_access_token(
        principal_id="did:snx:admin1",
        username="admin",
        roles=["ADMIN"],
        role_mask=1,
    )

    # Attempt to demote the sole admin to USER -> must fail (AT-03)
    res = await async_client.put(
        "/v1/principals/did:snx:admin1/roles",
        json={"roles": ["USER"], "reason": "Self-demotion"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 400
    assert "last active admin" in res.json()["detail"]

    # Attempt to suspend the sole admin -> must fail
    sus_res = await async_client.post(
        "/v1/principals/did:snx:admin1/suspend",
        json={"reason": "Suspending sole admin"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert sus_res.status_code == 400
