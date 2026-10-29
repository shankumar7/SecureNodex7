"""Strict Pydantic schemas for SecureNodeX REST API (RFC 7807 compliant)."""

from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, Field


class StrictBase(BaseModel):
    model_config = ConfigDict(extra="forbid")


# --- Auth ---
class LoginRequest(StrictBase):
    username: str = Field(..., min_length=1, max_length=64)
    password: str = Field(..., min_length=1)


class LoginResponse(StrictBase):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 900


class RefreshRequest(StrictBase):
    refresh_token: str = Field(..., min_length=1)


class MeResponse(StrictBase):
    id: str
    username: str
    display_name: str
    roles: list[str]
    role_mask: int
    status: str
    spki_fingerprint: str | None = None


# --- Principals ---
class CreatePrincipalRequest(StrictBase):
    username: str = Field(..., min_length=3, max_length=64)
    password: str = Field(..., min_length=8)
    roles: list[str] = Field(..., min_length=1)
    display_name: str = Field(default="", max_length=128)


class UpdateRolesRequest(StrictBase):
    roles: list[str] = Field(..., min_length=1)
    reason: str = Field(..., min_length=3, max_length=255)


class StatusChangeRequest(StrictBase):
    reason: str = Field(..., min_length=3, max_length=255)


class PrincipalResponse(StrictBase):
    id: str
    username: str
    display_name: str
    roles: list[str]
    role_mask: int
    status: str
    spki_fingerprint: str | None = None
    metadata_uri: str
    created_at: datetime
    updated_at: datetime


class PrincipalListResponse(StrictBase):
    items: list[PrincipalResponse]
    next_cursor: str | None = None


# --- Devices ---
class CreateDeviceRequest(StrictBase):
    label: str = Field(..., min_length=1, max_length=128)
    type: str = Field(default="generic", max_length=64)
    metadata: dict[str, Any] | None = None


class CreateDeviceResponse(StrictBase):
    device_id: str
    enrollment_token: str | None = None
    status: str


class ProvisionModeAResponse(StrictBase):
    device_id: str
    private_key_pem: str
    certificate_pem: str
    chain_pem: str
    fingerprint: str
    config: dict[str, Any]
    tx_hash: str | None = None


class EnrollModeBRequest(StrictBase):
    csr_pem: str = Field(..., min_length=1)
    token: str = Field(..., min_length=1)


class EnrollResponse(StrictBase):
    device_id: str
    certificate_pem: str
    chain_pem: str
    fingerprint: str
    tx_hash: str | None = None


class RenewCertRequest(StrictBase):
    csr_pem: str = Field(..., min_length=1)


class RevokeDeviceRequest(StrictBase):
    reason: str = Field(..., min_length=3, max_length=255)


class RotateDeviceRequest(StrictBase):
    reason: str | None = None


class DeviceResponse(StrictBase):
    id: str
    label: str
    type: str
    status: str
    spki_fingerprint: str | None = None
    cert_serial: str | None = None
    cert_expires_at: datetime | None = None
    last_seen_at: datetime | None = None
    tx_hash: str | None = None
    created_at: datetime


class DeviceListResponse(StrictBase):
    items: list[DeviceResponse]
    next_cursor: str | None = None


# --- Audit ---
class AuditEventResponse(StrictBase):
    id: str
    seq: int | None = None
    event_type: str
    actor: str
    subject: str
    data_hash: str
    correlation_id: str
    timestamp: int
    tx_hash: str | None = None
    head: str | None = None
    details: dict[str, Any] | None = None


class AuditListResponse(StrictBase):
    items: list[AuditEventResponse]
    next_cursor: str | None = None


class AuditVerifyResponse(StrictBase):
    valid: bool
    checked: int
    calculated_head: str
    on_chain_head: str | None = None
    tampered_index: int | None = None
