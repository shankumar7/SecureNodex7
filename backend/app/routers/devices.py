"""Device registration, PKI enrollment (Mode A/Mode B), and revocation endpoints."""

from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.auth.rbac import CurrentPrincipal, get_current_principal, require
from backend.app.db.models import Device
from backend.app.db.session import get_db
from backend.app.routers.schemas import (
    CreateDeviceRequest,
    CreateDeviceResponse,
    DeviceListResponse,
    DeviceResponse,
    EnrollModeBRequest,
    EnrollResponse,
    ProvisionModeAResponse,
    RenewCertRequest,
    RevokeDeviceRequest,
    RotateDeviceRequest,
)
from backend.app.services.device_service import device_service

router = APIRouter(prefix="/v1", tags=["Devices"])


@router.post("/devices", response_model=CreateDeviceResponse, status_code=status.HTTP_201_CREATED)
async def register_device(
    req: CreateDeviceRequest,
    current_user: CurrentPrincipal = Depends(require("device:enroll")),
    db: AsyncSession = Depends(get_db),
    x_correlation_id: str | None = Header(default="api-req"),
) -> CreateDeviceResponse:
    """Register a new device and generate an enrollment token (Admin/Manager)."""
    device, token = await device_service.register_device(
        db=db,
        label=req.label,
        device_type=req.type,
        metadata=req.metadata,
        actor=current_user,
        correlation_id=x_correlation_id or "req",
    )
    return CreateDeviceResponse(
        device_id=device.id,
        enrollment_token=token,
        status=device.status,
    )


@router.post("/devices/{device_id}/provision", response_model=ProvisionModeAResponse)
async def provision_mode_a(
    device_id: str,
    current_user: CurrentPrincipal = Depends(require("device:enroll")),
    db: AsyncSession = Depends(get_db),
    x_correlation_id: str | None = Header(default="api-req"),
) -> ProvisionModeAResponse:
    """Mode A Provisioning: Generates private key + certificate + config bundle once (Admin/Manager)."""
    bundle = await device_service.provision_mode_a(
        db=db,
        device_id=device_id,
        actor=current_user,
        correlation_id=x_correlation_id or "req",
    )
    return ProvisionModeAResponse(
        device_id=bundle["device_id"],
        private_key_pem=bundle["private_key_pem"],
        certificate_pem=bundle["certificate_pem"],
        chain_pem=bundle["chain_pem"],
        fingerprint=bundle["fingerprint"],
        config=bundle["config"],
        tx_hash=bundle.get("tx_hash"),
    )


@router.post("/enroll", response_model=EnrollResponse)
async def enroll_mode_b(
    req: EnrollModeBRequest,
    db: AsyncSession = Depends(get_db),
    x_correlation_id: str | None = Header(default="enroll-req"),
) -> EnrollResponse:
    """Mode B Enrollment: Device submits CSR with single-use enrollment token."""
    res = await device_service.enroll_mode_b(
        db=db,
        csr_pem=req.csr_pem,
        token=req.token,
        correlation_id=x_correlation_id or "req",
    )
    return EnrollResponse(
        device_id=res["device_id"],
        certificate_pem=res["certificate_pem"],
        chain_pem=res["chain_pem"],
        fingerprint=res["fingerprint"],
        tx_hash=res.get("tx_hash"),
    )


@router.post("/enroll/renew", response_model=EnrollResponse)
async def renew_certificate(
    req: RenewCertRequest,
    current_user: CurrentPrincipal = Depends(get_current_principal),
    db: AsyncSession = Depends(get_db),
    x_correlation_id: str | None = Header(default="renew-req"),
) -> EnrollResponse:
    """Renew device certificate and rotate on-chain key fingerprint."""
    res = await device_service.renew_cert(
        db=db,
        device_id=current_user.id,
        csr_pem=req.csr_pem,
        correlation_id=x_correlation_id or "req",
    )
    return EnrollResponse(
        device_id=current_user.id,
        certificate_pem=res["certificate_pem"],
        chain_pem=res["chain_pem"],
        fingerprint=res["fingerprint"],
    )


@router.get("/devices", response_model=DeviceListResponse)
async def list_devices(
    limit: int = Query(default=50, ge=1, le=100),
    current_user: CurrentPrincipal = Depends(require("device:read")),
    db: AsyncSession = Depends(get_db),
) -> DeviceListResponse:
    """List registered devices (Admin/Manager/Auditor)."""
    stmt = select(Device).limit(limit)
    result = await db.execute(stmt)
    devices = result.scalars().all()

    items = [
        DeviceResponse(
            id=d.id,
            label=d.label,
            type=d.device_type,
            status=d.status,
            spki_fingerprint=d.spki_fingerprint,
            cert_serial=d.cert_serial,
            cert_expires_at=d.cert_expires_at,
            last_seen_at=d.last_seen_at,
            tx_hash=d.tx_hash,
            created_at=d.created_at,
        )
        for d in devices
    ]
    return DeviceListResponse(items=items)


@router.get("/devices/{device_id}", response_model=DeviceResponse)
async def get_device(
    device_id: str,
    current_user: CurrentPrincipal = Depends(get_current_principal),
    db: AsyncSession = Depends(get_db),
) -> DeviceResponse:
    """Get device details."""
    is_self = current_user.id == device_id
    if not is_self and not (current_user.is_admin() or current_user.is_manager() or current_user.is_auditor()):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")

    stmt = select(Device).where(Device.id == device_id)
    d = (await db.execute(stmt)).scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

    return DeviceResponse(
        id=d.id,
        label=d.label,
        type=d.device_type,
        status=d.status,
        spki_fingerprint=d.spki_fingerprint,
        cert_serial=d.cert_serial,
        cert_expires_at=d.cert_expires_at,
        last_seen_at=d.last_seen_at,
        tx_hash=d.tx_hash,
        created_at=d.created_at,
    )


@router.post("/devices/{device_id}/revoke", response_model=DeviceResponse)
async def revoke_device(
    device_id: str,
    req: RevokeDeviceRequest,
    current_user: CurrentPrincipal = Depends(require("device:revoke")),
    db: AsyncSession = Depends(get_db),
    x_correlation_id: str | None = Header(default="api-req"),
) -> DeviceResponse:
    """Revoke device certificate and on-chain identity (Admin/Manager)."""
    d = await device_service.revoke_device(
        db=db,
        device_id=device_id,
        reason=req.reason,
        actor=current_user,
        correlation_id=x_correlation_id or "req",
    )
    return DeviceResponse(
        id=d.id,
        label=d.label,
        type=d.device_type,
        status=d.status,
        spki_fingerprint=d.spki_fingerprint,
        cert_serial=d.cert_serial,
        cert_expires_at=d.cert_expires_at,
        last_seen_at=d.last_seen_at,
        tx_hash=d.tx_hash,
        created_at=d.created_at,
    )


@router.post("/devices/{device_id}/rotate")
async def rotate_device(
    device_id: str,
    req: RotateDeviceRequest,
    current_user: CurrentPrincipal = Depends(require("device:rotate")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Trigger device certificate renewal / rotation."""
    return {"status": "rotation_initiated", "device_id": device_id}


@router.get("/devices/{device_id}/telemetry")
async def get_device_telemetry(
    device_id: str,
    current_user: CurrentPrincipal = Depends(require("device:read", allow_own=True)),
) -> dict[str, Any]:
    """Query verified device telemetry."""
    return {"device_id": device_id, "messages": []}
