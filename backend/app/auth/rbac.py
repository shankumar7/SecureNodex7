"""Role-Based Access Control (RBAC) definitions, matrix evaluation, and FastAPI dependencies."""

from dataclasses import dataclass
from enum import IntFlag
from typing import Any, Callable

from fastapi import Depends, Header, HTTPException, status
from jwt.exceptions import InvalidTokenError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.auth.security import decode_access_token
from backend.app.db.models import Principal
from backend.app.db.session import get_db


class RoleBit(IntFlag):
    ADMIN = 1
    MANAGER = 2
    AUDITOR = 4
    USER = 8
    DEVICE = 16
    STORAGE_NODE = 32


ROLE_NAME_MAP = {
    "ADMIN": RoleBit.ADMIN,
    "MANAGER": RoleBit.MANAGER,
    "AUDITOR": RoleBit.AUDITOR,
    "USER": RoleBit.USER,
    "DEVICE": RoleBit.DEVICE,
    "STORAGE_NODE": RoleBit.STORAGE_NODE,
    "STORAGE-NODE": RoleBit.STORAGE_NODE,
}

ROLE_BIT_TO_NAME = {
    RoleBit.ADMIN: "ADMIN",
    RoleBit.MANAGER: "MANAGER",
    RoleBit.AUDITOR: "AUDITOR",
    RoleBit.USER: "USER",
    RoleBit.DEVICE: "DEVICE",
    RoleBit.STORAGE_NODE: "STORAGE_NODE",
}


def role_names_to_mask(role_names: list[str]) -> int:
    """Convert a list of role names to an integer bitmask."""
    mask = 0
    for name in role_names:
        norm = name.strip().upper()
        if norm in ROLE_NAME_MAP:
            mask |= ROLE_NAME_MAP[norm].value
        else:
            raise ValueError(f"Unknown role: {name}")
    return mask


def mask_to_role_names(mask: int) -> list[str]:
    """Convert an integer bitmask to a list of role names."""
    roles = []
    for bit, name in ROLE_BIT_TO_NAME.items():
        if mask & bit.value:
            roles.append(name)
    return roles


# Permission Matrix Mapping:
# Maps permission string -> (allowed_mask_full, allowed_mask_scoped)
# Full (Y): always allowed. Scoped (O): allowed only if resource ownership/grant matches.
PERMISSION_MATRIX: dict[str, tuple[int, int]] = {
    "principal:create": (RoleBit.ADMIN.value, 0),
    "principal:set-roles": (RoleBit.ADMIN.value, RoleBit.MANAGER.value),  # Manager allowed conditionally
    "principal:read": (RoleBit.ADMIN.value | RoleBit.MANAGER.value | RoleBit.AUDITOR.value, RoleBit.USER.value),
    "principal:status": (RoleBit.ADMIN.value, 0),
    "device:enroll": (RoleBit.ADMIN.value | RoleBit.MANAGER.value, 0),
    "device:revoke": (RoleBit.ADMIN.value | RoleBit.MANAGER.value, 0),
    "device:rotate": (RoleBit.ADMIN.value | RoleBit.MANAGER.value, 0),
    "device:read": (
        RoleBit.ADMIN.value | RoleBit.MANAGER.value | RoleBit.AUDITOR.value,
        RoleBit.USER.value | RoleBit.DEVICE.value,
    ),
    "object:create": (RoleBit.ADMIN.value | RoleBit.MANAGER.value | RoleBit.USER.value, 0),
    "object:read_content": (RoleBit.ADMIN.value, RoleBit.MANAGER.value | RoleBit.USER.value),
    "object:read_metadata": (
        RoleBit.ADMIN.value | RoleBit.MANAGER.value | RoleBit.AUDITOR.value,
        RoleBit.USER.value,
    ),
    "object:share": (RoleBit.ADMIN.value, RoleBit.MANAGER.value | RoleBit.USER.value),
    "object:delete": (RoleBit.ADMIN.value, RoleBit.MANAGER.value | RoleBit.USER.value),
    "asset:mint": (RoleBit.ADMIN.value | RoleBit.MANAGER.value, 0),
    "asset:transfer": (RoleBit.ADMIN.value | RoleBit.MANAGER.value, RoleBit.USER.value),
    "asset:read": (RoleBit.ADMIN.value | RoleBit.MANAGER.value | RoleBit.AUDITOR.value, RoleBit.USER.value),
    "audit:read": (
        RoleBit.ADMIN.value | RoleBit.MANAGER.value | RoleBit.AUDITOR.value,
        RoleBit.USER.value,
    ),
    "audit:verify": (RoleBit.ADMIN.value | RoleBit.MANAGER.value | RoleBit.AUDITOR.value, 0),
    "storage:nodes_manage": (RoleBit.ADMIN.value, 0),
    "storage:health_read": (RoleBit.ADMIN.value | RoleBit.MANAGER.value | RoleBit.AUDITOR.value, 0),
    "mqtt:publish_telemetry": (RoleBit.DEVICE.value, 0),
    "chunk:put_get": (RoleBit.STORAGE_NODE.value, 0),
}


def is_permission_allowed(permission: str, role_mask: int, is_own_resource: bool = False) -> bool:
    """Evaluate if a role mask has permission (Deny by default)."""
    if permission not in PERMISSION_MATRIX:
        return False

    full_allowed, scoped_allowed = PERMISSION_MATRIX[permission]

    # Check full permission (Y)
    if role_mask & full_allowed:
        return True

    # Check scoped permission (O)
    if is_own_resource and (role_mask & scoped_allowed):
        return True

    return False


@dataclass
class CurrentPrincipal:
    id: str
    username: str
    roles: list[str]
    role_mask: int
    status: str

    def has_role(self, role: RoleBit) -> bool:
        return bool(self.role_mask & role.value)

    def is_admin(self) -> bool:
        return self.has_role(RoleBit.ADMIN)

    def is_manager(self) -> bool:
        return self.has_role(RoleBit.MANAGER)

    def is_auditor(self) -> bool:
        return self.has_role(RoleBit.AUDITOR)


async def get_current_principal(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> CurrentPrincipal:
    """Extract and validate the authenticated principal from Bearer JWT."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_access_token(token)
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    principal_id = payload.get("sub")
    if not principal_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    # Check database principal status
    query = select(Principal).where(Principal.id == principal_id)
    result = await db.execute(query)
    principal = result.scalar_one_or_none()

    if not principal:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Principal not found")

    if principal.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Principal is {principal.status}",
        )

    roles = mask_to_role_names(principal.roles_mask)
    return CurrentPrincipal(
        id=principal.id,
        username=principal.username,
        roles=roles,
        role_mask=principal.roles_mask,
        status=principal.status,
    )


def require(permission: str, allow_own: bool = False) -> Callable[..., Any]:
    """FastAPI dependency for enforcing RBAC permissions with deny-by-default."""

    async def dependency(principal: CurrentPrincipal = Depends(get_current_principal)) -> CurrentPrincipal:
        if not is_permission_allowed(permission, principal.role_mask, is_own_resource=allow_own):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: '{permission}'",
            )
        return principal

    return dependency
