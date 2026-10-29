"""Device lifecycle, PKI provisioning (Mode A/B), and certificate rotation."""

from datetime import datetime, timedelta, timezone
import json
import logging
import secrets
from typing import Any
import uuid

from cryptography import x509
from cryptography.hazmat.primitives import serialization
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.auth.rbac import CurrentPrincipal, RoleBit
from backend.app.chain.client import chain_client
from backend.app.db.models import Device
from backend.app.services.audit_service import audit_service
from backend.app.services.ca_client import ca_client
from pki.ca_core import compute_public_key_fingerprint, create_csr, generate_p256_private_key

logger = logging.getLogger("snx.devices")


class DeviceService:
    """Service for managing IoT devices, credentials, and on-chain identity."""

    async def register_device(
        self,
        db: AsyncSession,
        label: str,
        device_type: str,
        metadata: dict[str, Any] | None,
        actor: CurrentPrincipal,
        correlation_id: str,
    ) -> tuple[Device, str]:
        device_id = f"did:snx:device:{secrets.token_hex(16)}"
        enrollment_token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

        device = Device(
            id=device_id,
            label=label,
            device_type=device_type,
            status="PENDING",
            enrollment_token=enrollment_token,
            enrollment_token_expires_at=expires_at,
            metadata_json=json.dumps(metadata) if metadata else None,
        )

        db.add(device)
        await db.commit()
        await db.refresh(device)

        await audit_service.record_event(
            db=db,
            event_type="DEVICE_REGISTER",
            actor=actor.id,
            subject=device_id,
            data_hash="0x" + "0" * 64,
            correlation_id=correlation_id,
            details={"label": label, "type": device_type},
        )

        return device, enrollment_token

    async def provision_mode_a(
        self,
        db: AsyncSession,
        device_id: str,
        actor: CurrentPrincipal,
        correlation_id: str,
    ) -> dict[str, Any]:
        """Mode A Provisioning: Generates keypair + certificate bundle on server."""
        stmt = select(Device).where(Device.id == device_id)
        device = (await db.execute(stmt)).scalar_one_or_none()
        if not device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

        # Generate EC P-256 keypair & CSR
        priv_key = generate_p256_private_key()
        priv_pem = priv_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        ).decode("utf-8")

        csr = create_csr(priv_key, common_name=device_id, kind="device")
        csr_pem = csr.public_bytes(serialization.Encoding.PEM).decode("utf-8")

        # Request certificate from CA
        ca_res = await ca_client.issue_device_cert(csr_pem=csr_pem, principal_id=device_id)
        cert_pem = ca_res["certificate_pem"]
        chain_pem = ca_res["chain_pem"]
        fingerprint = ca_res["fingerprint"]
        serial = ca_res.get("serial_number")

        device.status = "ACTIVE"
        device.spki_fingerprint = fingerprint
        device.cert_serial = serial
        device.enrollment_token = None
        device.enrollment_token_expires_at = None

        tx_hash = None
        if chain_client.is_connected() and "IdentityRegistry" in chain_client.contracts:
            try:
                res = chain_client.register_identity(
                    identity_id=device_id,
                    fingerprint=fingerprint,
                    role_mask=RoleBit.DEVICE.value,
                    metadata_uri="",
                )
                tx_hash = res.get("tx_hash")
                device.tx_hash = tx_hash
            except Exception as e:
                logger.warning(f"On-chain device registration failed: {e}")

        await db.commit()
        await db.refresh(device)

        await audit_service.record_event(
            db=db,
            event_type="DEVICE_PROVISION_MODE_A",
            actor=actor.id,
            subject=device_id,
            data_hash=fingerprint,
            correlation_id=correlation_id,
            details={"fingerprint": fingerprint, "serial": serial},
        )

        config_bundle = {
            "device_id": device_id,
            "broker_host": "broker.snx.lan",
            "broker_port": 8883,
            "topics": {
                "telemetry": f"snx/v1/dev/{device_id}/telemetry",
                "cmd": f"snx/v1/dev/{device_id}/cmd",
                "status": f"snx/v1/dev/{device_id}/status",
            },
        }

        return {
            "device_id": device_id,
            "private_key_pem": priv_pem,
            "certificate_pem": cert_pem,
            "chain_pem": chain_pem,
            "fingerprint": fingerprint,
            "config": config_bundle,
            "tx_hash": tx_hash,
        }

    async def enroll_mode_b(
        self,
        db: AsyncSession,
        csr_pem: str,
        token: str,
        correlation_id: str,
    ) -> dict[str, Any]:
        """Mode B Enrollment: Device provides CSR + single-use enrollment token."""
        now = datetime.now(timezone.utc)
        stmt = select(Device).where(
            Device.enrollment_token == token,
            Device.enrollment_token_expires_at > now,
            Device.status == "PENDING",
        )
        device = (await db.execute(stmt)).scalar_one_or_none()
        if not device:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired enrollment token",
            )

        ca_res = await ca_client.issue_device_cert(csr_pem=csr_pem, principal_id=device.id)
        cert_pem = ca_res["certificate_pem"]
        chain_pem = ca_res["chain_pem"]
        fingerprint = ca_res["fingerprint"]
        serial = ca_res.get("serial_number")

        device.status = "ACTIVE"
        device.spki_fingerprint = fingerprint
        device.cert_serial = serial
        device.enrollment_token = None
        device.enrollment_token_expires_at = None

        tx_hash = None
        if chain_client.is_connected() and "IdentityRegistry" in chain_client.contracts:
            try:
                res = chain_client.register_identity(
                    identity_id=device.id,
                    fingerprint=fingerprint,
                    role_mask=RoleBit.DEVICE.value,
                    metadata_uri="",
                )
                tx_hash = res.get("tx_hash")
                device.tx_hash = tx_hash
            except Exception as e:
                logger.warning(f"On-chain device registration failed: {e}")

        await db.commit()
        await db.refresh(device)

        await audit_service.record_event(
            db=db,
            event_type="DEVICE_ENROLL_MODE_B",
            actor=device.id,
            subject=device.id,
            data_hash=fingerprint,
            correlation_id=correlation_id,
            details={"fingerprint": fingerprint, "serial": serial},
        )

        return {
            "device_id": device.id,
            "certificate_pem": cert_pem,
            "chain_pem": chain_pem,
            "fingerprint": fingerprint,
            "tx_hash": tx_hash,
        }

    async def renew_cert(
        self,
        db: AsyncSession,
        device_id: str,
        csr_pem: str,
        correlation_id: str,
    ) -> dict[str, Any]:
        """Renew certificate and rotate key fingerprint on-chain."""
        stmt = select(Device).where(Device.id == device_id)
        device = (await db.execute(stmt)).scalar_one_or_none()
        if not device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

        if device.status != "ACTIVE":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Device is not active")

        ca_res = await ca_client.issue_device_cert(csr_pem=csr_pem, principal_id=device_id)
        cert_pem = ca_res["certificate_pem"]
        chain_pem = ca_res["chain_pem"]
        new_fingerprint = ca_res["fingerprint"]
        serial = ca_res.get("serial_number")

        old_fingerprint = device.spki_fingerprint
        device.spki_fingerprint = new_fingerprint
        device.cert_serial = serial

        if chain_client.is_connected() and "IdentityRegistry" in chain_client.contracts:
            try:
                chain_client.rotate_identity(device_id, new_fingerprint)
            except Exception as e:
                logger.warning(f"On-chain key rotation failed: {e}")

        await db.commit()
        await db.refresh(device)

        await audit_service.record_event(
            db=db,
            event_type="DEVICE_KEY_ROTATED",
            actor=device_id,
            subject=device_id,
            data_hash=new_fingerprint,
            correlation_id=correlation_id,
            details={"old_fp": old_fingerprint, "new_fp": new_fingerprint},
        )

        return {
            "certificate_pem": cert_pem,
            "chain_pem": chain_pem,
            "fingerprint": new_fingerprint,
        }

    async def revoke_device(
        self,
        db: AsyncSession,
        device_id: str,
        reason: str,
        actor: CurrentPrincipal,
        correlation_id: str,
    ) -> Device:
        stmt = select(Device).where(Device.id == device_id)
        device = (await db.execute(stmt)).scalar_one_or_none()
        if not device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

        device.status = "REVOKED"
        await db.commit()
        await db.refresh(device)

        # Revoke cert in CA
        if device.cert_serial:
            await ca_client.revoke_cert(device.cert_serial, reason)

        # Revoke on chain
        if chain_client.is_connected() and "IdentityRegistry" in chain_client.contracts:
            try:
                chain_client.revoke_identity(device_id)
            except Exception as e:
                logger.warning(f"On-chain device revocation failed: {e}")

        await audit_service.record_event(
            db=db,
            event_type="DEVICE_REVOKED",
            actor=actor.id,
            subject=device_id,
            data_hash=device.spki_fingerprint or ("0x" + "0" * 64),
            correlation_id=correlation_id,
            details={"reason": reason},
        )

        return device


device_service = DeviceService()
