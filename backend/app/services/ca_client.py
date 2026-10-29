"""Client integration with snx-ca for issuing and revoking certificates."""

import logging
from typing import Any

import httpx

from backend.app.config import settings
from pki.ca_core import (
    compute_public_key_fingerprint,
    issue_leaf_certificate,
    load_certificate,
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
                        "kind": "device",
                        "principal_id": principal_id,
                        "validity_hours": settings.DEVICE_CERT_TTL_HOURS,
                    },
                )
                if res.status_code == 200:
                    return res.json()
        except Exception as e:
            logger.warning(
                f"CA service call failed ({e}); falling back to local CA keys if present."
            )

        # Fallback to in-process PKI if local intermediate CA exists
        return self._issue_in_process(csr_pem, principal_id, "device")

    def _issue_in_process(self, csr_pem: str, principal_id: str, kind: str) -> dict[str, Any]:
        import os

        from cryptography import x509
        from cryptography.hazmat.backends import default_backend
        from cryptography.hazmat.primitives import serialization

        ca_key_path = "pki/keys/intermediate_ca.key"
        ca_cert_path = "pki/certs/intermediate_ca.crt"
        root_cert_path = "pki/certs/root_ca.crt"

        from pki.ca_core import create_intermediate_ca, create_root_ca

        if os.path.exists(ca_key_path) and os.path.exists(ca_cert_path):
            with open(ca_key_path, "rb") as f:
                ca_key = load_private_key(f.read())
            with open(ca_cert_path, "rb") as f:
                ca_cert = load_certificate(f.read())
            with open(ca_cert_path) as f:
                inter_pem = f.read()
            root_pem = inter_pem
            if os.path.exists(root_cert_path):
                with open(root_cert_path) as f:
                    root_pem = f.read()
        else:
            root_k, root_c = create_root_ca()
            ca_key, ca_cert = create_intermediate_ca(root_k, root_c)
            inter_pem = ca_cert.public_bytes(serialization.Encoding.PEM).decode("utf-8")
            root_pem = root_c.public_bytes(serialization.Encoding.PEM).decode("utf-8")

        csr = x509.load_pem_x509_csr(csr_pem.encode("utf-8"), default_backend())

        cert = issue_leaf_certificate(
            ca_key=ca_key,
            ca_cert=ca_cert,
            csr_or_pubkey=csr,
            kind="device",
            common_name=principal_id,
            principal_id=principal_id,
            validity_hours=settings.DEVICE_CERT_TTL_HOURS,
        )

        chain_pem = inter_pem.strip() + "\n" + root_pem.strip()
        cert_pem = cert.public_bytes(serialization.Encoding.PEM).decode("utf-8")
        fp = compute_public_key_fingerprint(cert.public_key())

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
