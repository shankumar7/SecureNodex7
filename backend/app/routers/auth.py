"""Authentication routes: login, refresh token rotation, logout, and current user profile."""

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.auth.rbac import CurrentPrincipal, get_current_principal, mask_to_role_names
from backend.app.auth.security import (
    create_access_token,
    create_refresh_token,
    hash_token,
    verify_password,
)
from backend.app.db.models import Principal, RefreshToken
from backend.app.db.session import get_db
from backend.app.routers.schemas import (
    LoginRequest,
    LoginResponse,
    MeResponse,
    RefreshRequest,
)

router = APIRouter(prefix="/v1", tags=["Auth"])


@router.post("/auth/login", response_model=LoginResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)) -> LoginResponse:
    """Authenticate with username and Argon2id password, returning JWT access token and refresh token."""
    stmt = select(Principal).where(Principal.username == req.username)
    principal = (await db.execute(stmt)).scalar_one_or_none()

    if not principal or not verify_password(req.password, principal.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    if principal.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is {principal.status}",
        )

    roles = mask_to_role_names(principal.roles_mask)
    access_token = create_access_token(
        principal_id=principal.id,
        username=principal.username,
        roles=roles,
        role_mask=principal.roles_mask,
    )

    raw_refresh, refresh_hash = create_refresh_token()
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    token_record = RefreshToken(
        principal_id=principal.id,
        token_hash=refresh_hash,
        expires_at=expires_at,
    )
    db.add(token_record)
    await db.commit()

    return LoginResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        token_type="bearer",
        expires_in=900,
    )


@router.post("/auth/refresh", response_model=LoginResponse)
async def refresh_token(req: RefreshRequest, db: AsyncSession = Depends(get_db)) -> LoginResponse:
    """Rotate refresh token and issue a fresh access token."""
    req_hash = hash_token(req.refresh_token)
    now = datetime.now(timezone.utc)

    stmt = select(RefreshToken).where(RefreshToken.token_hash == req_hash)
    token_record = (await db.execute(stmt)).scalar_one_or_none()

    if not token_record or token_record.revoked_at is not None or token_record.expires_at < now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    # Invalidate current token (rotation)
    token_record.revoked_at = now

    # Fetch principal
    p_stmt = select(Principal).where(Principal.id == token_record.principal_id)
    principal = (await db.execute(p_stmt)).scalar_one_or_none()
    if not principal or principal.status != "ACTIVE":
        await db.commit()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Principal not active")

    roles = mask_to_role_names(principal.roles_mask)
    access_token = create_access_token(
        principal_id=principal.id,
        username=principal.username,
        roles=roles,
        role_mask=principal.roles_mask,
    )

    new_raw_refresh, new_refresh_hash = create_refresh_token()
    new_record = RefreshToken(
        principal_id=principal.id,
        token_hash=new_refresh_hash,
        expires_at=now + timedelta(days=7),
    )
    db.add(new_record)
    await db.commit()

    return LoginResponse(
        access_token=access_token,
        refresh_token=new_raw_refresh,
        token_type="bearer",
        expires_in=900,
    )


@router.post("/auth/logout")
async def logout(
    principal: CurrentPrincipal = Depends(get_current_principal),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Revoke all active refresh tokens for the authenticated principal."""
    now = datetime.now(timezone.utc)
    stmt = select(RefreshToken).where(
        RefreshToken.principal_id == principal.id,
        RefreshToken.revoked_at.is_(None),
    )
    result = await db.execute(stmt)
    tokens = result.scalars().all()
    for tok in tokens:
        tok.revoked_at = now
    await db.commit()

    return {"status": "logged_out"}


@router.get("/me", response_model=MeResponse)
async def get_me(
    principal: CurrentPrincipal = Depends(get_current_principal),
    db: AsyncSession = Depends(get_db),
) -> MeResponse:
    """Return profile and roles for the current authenticated principal."""
    stmt = select(Principal).where(Principal.id == principal.id)
    p = (await db.execute(stmt)).scalar_one_or_none()
    return MeResponse(
        id=principal.id,
        username=principal.username,
        display_name=p.display_name if p else "",
        roles=principal.roles,
        role_mask=principal.role_mask,
        status=principal.status,
        spki_fingerprint=p.spki_fingerprint if p else None,
    )
