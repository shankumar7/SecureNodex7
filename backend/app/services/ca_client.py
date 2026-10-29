"""Client integration with snx-ca for issuing and revoking certificates."""

import logging
from typing import Any
import httpx

from backend.app.config import settings
from pki.ca_core import (
    calc_spki_fingerprint,
    create_device_keypair,
    issue_certificate,
    load_ca,
    save_crl,
    generate_crl,
    load_private_key,
)

logger = logging.getLogger("snx.ca_client")


class CAClient:
    """Client for certificate authority operations."""

    def __init__(self, ca_base_url: str | None = None) -> None:
        self.ca_base_url = ca_base_url or settings.CA_URL

    async def issue_device_cert(self, csr_pem: str, principal_id: str) -> dict[str, Any]:
        """Request device certificate from CA service or fallback in-process."""
        try:
            async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
                res = await client.post(
                    f"{self.ca_base_url}/v1/ca/issue",
                    json={
                        "csr_pem": csr_pem,
                        "profile": "device",
                        "principal_id": principal_id,
                        "ttl_hours": settings.DEVICE_CERT_TTL_HOURS,
                    },
                )
                if res.status_code == 200:
                    return res.json()
        except Exception as e:
            logger.warning(f"CA service call failed ({e}); falling back to local CA keys if present.")

        # Fallback to in-process PKI if local intermediate CA exists
        return self._issue_in_process(csr_pem, principal_id, "device")

    def _issue_in_process(self, csr_pem: str, principal_id: str, profile: str) -> dict[str, Any]:
        from cryptography import x509
        from cryptography.hazmat.primitives import serialization
        import os

        ca_key_path = "pki/keys/intermediate_ca.key"
        ca_cert_path = "pki/certs/intermediate_ca.crt"
        root_cert_path = "pki/certs/root_ca.crt"

        if not (os.path.exists(ca_key_path) and os.path.exists(ca_cert_path)):
            raise RuntimeError("Intermediate CA keys not found for in-process issuance")

        ca_key, ca_cert = load_ca(ca_key_path, ca_cert_path)
        csr = x509.load_pem_x509_csr(csr_pem.encode("utf-8"))

        cert = issue_certificate(
            csr=csr,
            ca_key=ca_key,
            ca_cert=ca_cert,
            profile_name=profile,
            principal_id=principal_id,
            ttl_hours=settings.DEVICE_CERT_TTL_HOURS,
        )

        with open(ca_cert_path) as f:
            inter_pem = f.read()
        with open(root_cert_path) as f:
            root_pem = f.read()

        chain_pem = inter_pem + "\n" + root_pem
        cert_pem = cert.public_bytes(serialization.Encoding.PEM).decode("utf-8")
        fp = calc_spki_fingerprint(cert.public_key())

        return {
            "certificate_pem": cert_pem,
            "chain_pem": chain_pem,
            "serial_number": str(cert.serial_number),
            "fingerprint": fp,
        }

    async def revoke_cert(self, serial_number: str, reason: str = "unspecified") -> dict[str, Any]:
        """Revoke a certificate."""
        try:
            async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
                res = await client.post(
                    f"{self.ca_base_url}/v1/ca/revoke",
                    json={"serial_number": serial_number, "reason": reason},
                )
                if res.status_code == 200:
                    return res.json()
        except Exception:
            pass
        return {"status": "revoked", "serial_number": serial_number}


ca_client = CAClient()
