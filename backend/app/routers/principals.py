"""Principal and RBAC lifecycle endpoints."""

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.auth.rbac import (
    CurrentPrincipal,
    get_current_principal,
    mask_to_role_names,
    require,
)
from backend.app.db.models import Principal
from backend.app.db.session import get_db
from backend.app.routers.schemas import (
    CreatePrincipalRequest,
    PrincipalListResponse,
    PrincipalResponse,
    StatusChangeRequest,
    UpdateRolesRequest,
)
from backend.app.services.principal_service import principal_service

router = APIRouter(prefix="/v1", tags=["Principals"])


@router.post("/principals", response_model=PrincipalResponse, status_code=status.HTTP_201_CREATED)
async def create_principal(
    req: CreatePrincipalRequest,
    current_user: CurrentPrincipal = Depends(require("principal:create")),
    db: AsyncSession = Depends(get_db),
    x_correlation_id: str | None = Header(default="api-req"),
) -> PrincipalResponse:
    """Create a new principal with specified roles (Admin only)."""
    p = await principal_service.create_principal(
        db=db,
        username=req.username,
        password=req.password,
        roles=req.roles,
        display_name=req.display_name,
        actor=current_user,
        correlation_id=x_correlation_id or "req",
    )
    return PrincipalResponse(
        id=p.id,
        username=p.username,
        display_name=p.display_name,
        roles=mask_to_role_names(p.roles_mask),
        role_mask=p.roles_mask,
        status=p.status,
        spki_fingerprint=p.spki_fingerprint,
        metadata_uri=p.metadata_uri,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


@router.get("/principals", response_model=PrincipalListResponse)
async def list_principals(
    limit: int = Query(default=50, ge=1, le=100),
    current_user: CurrentPrincipal = Depends(require("principal:read")),
    db: AsyncSession = Depends(get_db),
) -> PrincipalListResponse:
    """List principals (Admin/Manager/Auditor)."""
    stmt = select(Principal).limit(limit)
    result = await db.execute(stmt)
    principals = result.scalars().all()

    items = [
        PrincipalResponse(
            id=p.id,
            username=p.username,
            display_name=p.display_name,
            roles=mask_to_role_names(p.roles_mask),
            role_mask=p.roles_mask,
            status=p.status,
            spki_fingerprint=p.spki_fingerprint,
            metadata_uri=p.metadata_uri,
            created_at=p.created_at,
            updated_at=p.updated_at,
        )
        for p in principals
    ]
    return PrincipalListResponse(items=items)


@router.get("/principals/{principal_id}", response_model=PrincipalResponse)
async def get_principal(
    principal_id: str,
    current_user: CurrentPrincipal = Depends(get_current_principal),
    db: AsyncSession = Depends(get_db),
) -> PrincipalResponse:
    """Get principal details (scoped: own profile, or Admin/Manager/Auditor)."""
    is_own = current_user.id == principal_id
    if not is_own and not (current_user.is_admin() or current_user.is_manager() or current_user.is_auditor()):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")

    stmt = select(Principal).where(Principal.id == principal_id)
    p = (await db.execute(stmt)).scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Principal not found")

    return PrincipalResponse(
        id=p.id,
        username=p.username,
        display_name=p.display_name,
        roles=mask_to_role_names(p.roles_mask),
        role_mask=p.roles_mask,
        status=p.status,
        spki_fingerprint=p.spki_fingerprint,
        metadata_uri=p.metadata_uri,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


@router.put("/principals/{principal_id}/roles", response_model=PrincipalResponse)
async def update_principal_roles(
    principal_id: str,
    req: UpdateRolesRequest,
    current_user: CurrentPrincipal = Depends(require("principal:set-roles")),
    db: AsyncSession = Depends(get_db),
    x_correlation_id: str | None = Header(default="api-req"),
) -> PrincipalResponse:
    """Update principal roles with separation of duties and last-admin invariant (AT-03)."""
    p = await principal_service.update_roles(
        db=db,
        principal_id=principal_id,
        roles=req.roles,
        reason=req.reason,
        actor=current_user,
        correlation_id=x_correlation_id or "req",
    )
    return PrincipalResponse(
        id=p.id,
        username=p.username,
        display_name=p.display_name,
        roles=mask_to_role_names(p.roles_mask),
        role_mask=p.roles_mask,
        status=p.status,
        spki_fingerprint=p.spki_fingerprint,
        metadata_uri=p.metadata_uri,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


@router.post("/principals/{principal_id}/suspend", response_model=PrincipalResponse)
async def suspend_principal(
    principal_id: str,
    req: StatusChangeRequest,
    current_user: CurrentPrincipal = Depends(require("principal:status")),
    db: AsyncSession = Depends(get_db),
    x_correlation_id: str | None = Header(default="api-req"),
) -> PrincipalResponse:
    """Suspend principal account (Admin only)."""
    p = await principal_service.suspend_principal(
        db=db,
        principal_id=principal_id,
        reason=req.reason,
        actor=current_user,
        correlation_id=x_correlation_id or "req",
    )
    return PrincipalResponse(
        id=p.id,
        username=p.username,
        display_name=p.display_name,
        roles=mask_to_role_names(p.roles_mask),
        role_mask=p.roles_mask,
        status=p.status,
        spki_fingerprint=p.spki_fingerprint,
        metadata_uri=p.metadata_uri,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


@router.post("/principals/{principal_id}/reinstate", response_model=PrincipalResponse)
async def reinstate_principal(
    principal_id: str,
    req: StatusChangeRequest,
    current_user: CurrentPrincipal = Depends(require("principal:status")),
    db: AsyncSession = Depends(get_db),
    x_correlation_id: str | None = Header(default="api-req"),
) -> PrincipalResponse:
    """Reinstate suspended principal account (Admin only, rejects terminal REVOKED)."""
    p = await principal_service.reinstate_principal(
        db=db,
        principal_id=principal_id,
        reason=req.reason,
        actor=current_user,
        correlation_id=x_correlation_id or "req",
    )
    return PrincipalResponse(
        id=p.id,
        username=p.username,
        display_name=p.display_name,
        roles=mask_to_role_names(p.roles_mask),
        role_mask=p.roles_mask,
        status=p.status,
        spki_fingerprint=p.spki_fingerprint,
        metadata_uri=p.metadata_uri,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )
