"""Principal and role management service."""

import logging
import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.auth.rbac import CurrentPrincipal, RoleBit, role_names_to_mask
from backend.app.auth.security import hash_password
from backend.app.chain.client import chain_client
from backend.app.db.models import Principal
from backend.app.services.audit_service import audit_service

logger = logging.getLogger("snx.principals")


class PrincipalService:
    """Service for managing principals, roles, and status lifecycle."""

    async def get_active_admin_count(self, db: AsyncSession) -> int:
        """Count how many active administrators exist."""
        stmt = select(func.count()).select_from(Principal).where(
            Principal.status == "ACTIVE",
            Principal.roles_mask.bitwise_and(RoleBit.ADMIN.value) > 0,
        )
        return int((await db.execute(stmt)).scalar_one() or 0)

    async def create_principal(
        self,
        db: AsyncSession,
        username: str,
        password: str,
        roles: list[str],
        display_name: str,
        actor: CurrentPrincipal,
        correlation_id: str,
    ) -> Principal:
        # Check uniqueness
        stmt = select(Principal).where(Principal.username == username)
        if (await db.execute(stmt)).scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Username '{username}' already exists",
            )

        roles_mask = role_names_to_mask(roles)
        pwd_hash = hash_password(password)
        principal_id = f"did:snx:{uuid.uuid4().hex}"

        principal = Principal(
            id=principal_id,
            username=username,
            password_hash=pwd_hash,
            display_name=display_name,
            roles_mask=roles_mask,
            status="ACTIVE",
            metadata_uri="",
        )

        db.add(principal)
        await db.commit()
        await db.refresh(principal)

        # On-chain registration if available
        if chain_client.is_connected() and "IdentityRegistry" in chain_client.contracts:
            try:
                # Default zero fingerprint for standard users until key is rotated
                fp = "0" * 64
                chain_client.register_identity(
                    identity_id=principal_id,
                    fingerprint=fp,
                    role_mask=roles_mask,
                    metadata_uri="",
                )
            except Exception as e:
                logger.warning(f"On-chain registration failed for {principal_id}: {e}")

        # Audit log
        await audit_service.record_event(
            db=db,
            event_type="PRINCIPAL_CREATE",
            actor=actor.id,
            subject=principal_id,
            data_hash="0x" + "0" * 64,
            correlation_id=correlation_id,
            details={"username": username, "roles": roles},
        )

        return principal

    async def update_roles(
        self,
        db: AsyncSession,
        principal_id: str,
        roles: list[str],
        reason: str,
        actor: CurrentPrincipal,
        correlation_id: str,
    ) -> Principal:
        stmt = select(Principal).where(Principal.id == principal_id)
        principal = (await db.execute(stmt)).scalar_one_or_none()
        if not principal:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Principal not found")

        new_mask = role_names_to_mask(roles)

        # Manager separation of duties: Manager may only set USER or DEVICE
        if actor.is_manager() and not actor.is_admin():
            allowed_manager_roles = RoleBit.USER.value | RoleBit.DEVICE.value
            if (new_mask & ~allowed_manager_roles) != 0:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Managers can only grant USER and DEVICE roles",
                )

        # Last admin protection
        is_target_admin = bool(principal.roles_mask & RoleBit.ADMIN.value)
        will_be_admin = bool(new_mask & RoleBit.ADMIN.value)
        if is_target_admin and not will_be_admin:
            active_admins = await self.get_active_admin_count(db)
            if active_admins <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot remove ADMIN role from the last active admin (AT-03)",
                )

        old_roles_mask = principal.roles_mask
        principal.roles_mask = new_mask
        await db.commit()
        await db.refresh(principal)

        # Audit log
        await audit_service.record_event(
            db=db,
            event_type="ROLE_CHANGE",
            actor=actor.id,
            subject=principal_id,
            data_hash="0x" + "0" * 64,
            correlation_id=correlation_id,
            details={
                "old_mask": old_roles_mask,
                "new_mask": new_mask,
                "roles": roles,
                "reason": reason,
            },
        )

        return principal

    async def suspend_principal(
        self,
        db: AsyncSession,
        principal_id: str,
        reason: str,
        actor: CurrentPrincipal,
        correlation_id: str,
    ) -> Principal:
        stmt = select(Principal).where(Principal.id == principal_id)
        principal = (await db.execute(stmt)).scalar_one_or_none()
        if not principal:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Principal not found")

        if principal.status == "REVOKED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Principal is permanently REVOKED (TerminalRevocation)",
            )

        # Last admin check
        if bool(principal.roles_mask & RoleBit.ADMIN.value) and principal.status == "ACTIVE":
            active_admins = await self.get_active_admin_count(db)
            if active_admins <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot suspend the last active administrator",
                )

        principal.status = "SUSPENDED"
        await db.commit()
        await db.refresh(principal)

        if chain_client.is_connected() and "IdentityRegistry" in chain_client.contracts:
            try:
                chain_client.suspend_identity(principal_id)
            except Exception as e:
                logger.warning(f"On-chain suspension failed: {e}")

        await audit_service.record_event(
            db=db,
            event_type="PRINCIPAL_SUSPEND",
            actor=actor.id,
            subject=principal_id,
            data_hash="0x" + "0" * 64,
            correlation_id=correlation_id,
            details={"reason": reason},
        )

        return principal

    async def reinstate_principal(
        self,
        db: AsyncSession,
        principal_id: str,
        reason: str,
        actor: CurrentPrincipal,
        correlation_id: str,
    ) -> Principal:
        stmt = select(Principal).where(Principal.id == principal_id)
        principal = (await db.execute(stmt)).scalar_one_or_none()
        if not principal:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Principal not found")

        if principal.status == "REVOKED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot reinstate permanently REVOKED principal (TerminalRevocation)",
            )

        principal.status = "ACTIVE"
        await db.commit()
        await db.refresh(principal)

        if chain_client.is_connected() and "IdentityRegistry" in chain_client.contracts:
            try:
                chain_client.reinstate_identity(principal_id)
            except Exception as e:
                logger.warning(f"On-chain reinstate failed: {e}")

        await audit_service.record_event(
            db=db,
            event_type="PRINCIPAL_REINSTATE",
            actor=actor.id,
            subject=principal_id,
            data_hash="0x" + "0" * 64,
            correlation_id=correlation_id,
            details={"reason": reason},
        )

        return principal


principal_service = PrincipalService()
