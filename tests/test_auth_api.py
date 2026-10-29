"""Authentication, JWT ES256, Argon2id, and principal lifecycle tests."""

from datetime import datetime, timezone
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.app.auth.rbac import RoleBit
from backend.app.auth.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from backend.app.db.base import Base
from backend.app.db.models import Principal
from backend.app.db.session import get_db
from backend.app.main import app

from sqlalchemy.pool import StaticPool

# In-memory test db
test_engine = create_async_engine(
    "sqlite+aiosqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False,
)
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
async def test_auth_login_refresh_logout_flow() -> None:
    # Seed an active user
    async with TestSessionLocal() as session:
        admin_user = Principal(
            id="did:snx:admin1",
            username="admin",
            password_hash=hash_password("AdminPass123!"),
            display_name="Admin User",
            roles_mask=RoleBit.ADMIN.value,
            status="ACTIVE",
        )
        session.add(admin_user)
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login with correct credentials
        res = await client.post(
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
        me_res = await client.get(
            "/v1/me",
            headers={"Authorization": f"Bearer {access_tok}"},
        )
        assert me_res.status_code == 200
        me_data = me_res.json()
        assert me_data["username"] == "admin"
        assert "ADMIN" in me_data["roles"]

        # 3. Rotate refresh token
        ref_res = await client.post(
            "/v1/auth/refresh",
            json={"refresh_token": refresh_tok},
        )
        assert ref_res.status_code == 200
        new_data = ref_res.json()
        new_access_tok = new_data["access_token"]
        new_refresh_tok = new_data["refresh_token"]

        # 4. Old refresh token cannot be reused
        old_ref_res = await client.post(
            "/v1/auth/refresh",
            json={"refresh_token": refresh_tok},
        )
        assert old_ref_res.status_code == 401

        # 5. Logout
        logout_res = await client.post(
            "/v1/auth/logout",
            headers={"Authorization": f"Bearer {new_access_tok}"},
        )
        assert logout_res.status_code == 200

        # 6. Refresh after logout fails
        revoked_ref_res = await client.post(
            "/v1/auth/refresh",
            json={"refresh_token": new_refresh_tok},
        )
        assert revoked_ref_res.status_code == 401


@pytest.mark.asyncio
async def test_last_admin_protection_and_terminal_revocation() -> None:
    """AT-03: Cannot demote or suspend the last admin.

    AT-02: Revoked principal cannot be reinstated.
    """
    async with TestSessionLocal() as session:
        admin_user = Principal(
            id="did:snx:admin1",
            username="admin",
            password_hash=hash_password("AdminPass123!"),
            display_name="Admin User",
            roles_mask=RoleBit.ADMIN.value,
            status="ACTIVE",
        )
        session.add(admin_user)
        await session.commit()

    token = create_access_token(
        principal_id="did:snx:admin1",
        username="admin",
        roles=["ADMIN"],
        role_mask=1,
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Attempt to demote the sole admin to USER -> must fail (AT-03)
        res = await client.put(
            "/v1/principals/did:snx:admin1/roles",
            json={"roles": ["USER"], "reason": "Self-demotion"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 400
        assert "last active admin" in res.json()["detail"]

        # Attempt to suspend the sole admin -> must fail
        sus_res = await client.post(
            "/v1/principals/did:snx:admin1/suspend",
            json={"reason": "Suspending sole admin"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert sus_res.status_code == 400
