"""Audit log querying and hash chain cryptographic verification endpoints."""

import json

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.auth.rbac import CurrentPrincipal, require
from backend.app.db.models import AuditEvent
from backend.app.db.session import get_db
from backend.app.routers.schemas import (
    AuditEventResponse,
    AuditListResponse,
    AuditVerifyResponse,
)
from backend.app.services.audit_service import audit_service

router = APIRouter(prefix="/v1", tags=["Audit"])


@router.get("/audit", response_model=AuditListResponse)
async def list_audit_events(
    event_type: str | None = Query(default=None),
    actor: str | None = Query(default=None),
    subject: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: CurrentPrincipal = Depends(require("audit:read", allow_own=True)),
    db: AsyncSession = Depends(get_db),
) -> AuditListResponse:
    """List audit events with filters (Admin/Auditor/Manager, or User for own events)."""
    stmt = select(AuditEvent)

    # Scoped access for normal users
    if not (current_user.is_admin() or current_user.is_auditor() or current_user.is_manager()):
        stmt = stmt.where((AuditEvent.actor_id == current_user.id) | (AuditEvent.subject_id == current_user.id))

    if event_type:
        stmt = stmt.where(AuditEvent.event_type == event_type)
    if actor:
        stmt = stmt.where(AuditEvent.actor_id == actor)
    if subject:
        stmt = stmt.where(AuditEvent.subject_id == subject)

    stmt = stmt.order_by(AuditEvent.seq.desc(), AuditEvent.timestamp.desc()).limit(limit)
    result = await db.execute(stmt)
    events = result.scalars().all()

    items = []
    for ev in events:
        details_obj = json.loads(ev.details) if ev.details else None
        items.append(
            AuditEventResponse(
                id=ev.id,
                seq=ev.seq,
                event_type=ev.event_type,
                actor=ev.actor_id,
                subject=ev.subject_id,
                data_hash=ev.data_hash,
                correlation_id=ev.correlation_id,
                timestamp=ev.timestamp,
                tx_hash=ev.tx_hash,
                head=ev.head,
                details=details_obj,
            )
        )

    return AuditListResponse(items=items)


@router.get("/audit/verify", response_model=AuditVerifyResponse)
async def verify_audit_log(
    current_user: CurrentPrincipal = Depends(require("audit:verify")),
    db: AsyncSession = Depends(get_db),
) -> AuditVerifyResponse:
    """Cryptographically verify and recompute the entire audit rolling hash chain from genesis (Admin/Auditor)."""
    res = await audit_service.verify_chain(db)
    return AuditVerifyResponse(
        valid=res["valid"],
        checked=res["checked"],
        calculated_head=res["calculated_head"],
        on_chain_head=res.get("on_chain_head"),
        tampered_index=res.get("tampered_index"),
    )



