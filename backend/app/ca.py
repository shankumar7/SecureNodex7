"""SecureNodeX CA Service (snx-ca).

Intermediate CA signing service handling:
- Certificate issuance from CSR with profile enforcement (broker, device, service, storage-node, user)
- Certificate revocation and live CRL generation
- Public key fingerprint calculation (SPKI SHA-256)
- CA chain distribution
"""

from __future__ import annotations

import datetime
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator, Literal

from cryptography import x509
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from starlette.responses import Response

from backend.app.metrics import SERVICE_UP, metrics_response
from pki.ca_core import (
    CertKind,
    compute_public_key_fingerprint,
    create_crl,
    create_intermediate_ca,
    create_root_ca,
    issue_leaf_certificate,
    load_certificate,
    load_private_key,
    private_key_to_pem,
)

# In-memory revocation registry for CA service (synced with DB/chain)
revoked_certificates: dict[int, tuple[datetime.datetime, x509.ReasonFlags]] = {}
ca_private_key = None
ca_certificate = None
ca_chain_bytes = b""


def get_or_create_ca(ca_dir: str = "pki/intermediate", root_dir: str = "pki/root") -> tuple:
    """Loads existing Intermediate CA or initializes root + intermediate."""
    inter_path = Path(ca_dir)
    inter_key_file = inter_path / "intermediate-ca.key"
    inter_cert_file = inter_path / "intermediate-ca.crt"
    chain_file = inter_path / "ca-chain.pem"

    if inter_key_file.exists() and inter_cert_file.exists() and chain_file.exists():
        key = load_private_key(inter_key_file.read_bytes())
        cert = load_certificate(inter_cert_file.read_bytes())
        chain = chain_file.read_bytes()
        return key, cert, chain

    # Auto-initialize root & intermediate if missing
    root_path = Path(root_dir)
    root_key_file = root_path / "root-ca.key"
    root_cert_file = root_path / "root-ca.crt"

    if not root_key_file.exists() or not root_cert_file.exists():
        root_path.mkdir(parents=True, exist_ok=True)
        r_key, r_cert = create_root_ca()
        root_key_file.write_bytes(private_key_to_pem(r_key))
        root_cert_file.write_bytes(r_cert.public_bytes(serialization.Encoding.PEM))
    else:
        r_key = load_private_key(root_key_file.read_bytes())
        r_cert = load_certificate(root_cert_file.read_bytes())

    inter_path.mkdir(parents=True, exist_ok=True)
    i_key, i_cert = create_intermediate_ca(root_key=r_key, root_cert=r_cert)
    i_key_pem = private_key_to_pem(i_key)
    i_cert_pem = i_cert.public_bytes(serialization.Encoding.PEM)
    r_cert_pem = r_cert.public_bytes(serialization.Encoding.PEM)
    chain_bytes = i_cert_pem + b"\n" + r_cert_pem

    inter_key_file.write_bytes(i_key_pem)
    inter_cert_file.write_bytes(i_cert_pem)
    chain_file.write_bytes(chain_bytes)

    return i_key, i_cert, chain_bytes


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    global ca_private_key, ca_certificate, ca_chain_bytes
    ca_private_key, ca_certificate, ca_chain_bytes = get_or_create_ca()
    SERVICE_UP.labels(service="snx-ca").set(1)
    yield
    SERVICE_UP.labels(service="snx-ca").set(0)


app = FastAPI(
    title="SecureNodeX CA Service",
    version="0.1.0",
    description="Intermediate CA signing service for X.509 ECC P-256 certificates.",
    lifespan=lifespan,
)


class IssueCertRequest(BaseModel):
    csr_pem: str = Field(..., description="PEM-encoded Certificate Signing Request (ECC P-256)")
    kind: CertKind = Field(
        ..., description="Profile kind: broker, device, service, storage-node, user"
    )
    common_name: str = Field(..., description="Subject Common Name (CN)")
    principal_id: str | None = Field(
        None, description="Principal ID for did:snx:<principal_id> URI SAN"
    )
    san_dns_names: list[str] | None = Field(None, description="Subject Alternative DNS Names")
    san_ips: list[str] | None = Field(None, description="Subject Alternative IP Addresses")
    validity_hours: int | None = Field(None, description="Validity period in hours")


class IssueCertResponse(BaseModel):
    certificate_pem: str
    ca_chain_pem: str
    fingerprint: str
    serial_hex: str
    expires_at: str


class RevokeCertRequest(BaseModel):
    serial_hex: str = Field(..., description="Serial number of certificate in hex format")
    reason: Literal[
        "key_compromise", "affiliation_changed", "superseded", "cessation_of_operation"
    ] = "key_compromise"


class FingerprintRequest(BaseModel):
    certificate_pem: str = Field(..., description="PEM-encoded certificate")


class FingerprintResponse(BaseModel):
    fingerprint: str = Field(..., description="Lowercase SHA-256 hex of SubjectPublicKeyInfo DER")


@app.get("/healthz", summary="Liveness Probe")
async def healthz() -> dict[str, str]:
    return {"status": "ok", "service": "snx-ca"}


@app.get("/readyz", summary="Readiness Probe")
async def readyz() -> dict[str, str]:
    if ca_private_key is None or ca_certificate is None:
        raise HTTPException(status_code=503, detail="CA key material not ready")
    return {"status": "ready", "service": "snx-ca"}


@app.get("/metrics", summary="Prometheus Metrics")
async def metrics() -> Response:
    return metrics_response()


@app.get("/v1/ca/chain", summary="Get CA Certificate Chain")
async def get_ca_chain() -> Response:
    return Response(content=ca_chain_bytes, media_type="application/x-pem-file")


@app.post("/v1/ca/issue", response_model=IssueCertResponse, summary="Issue Certificate from CSR")
async def issue_certificate(req: IssueCertRequest) -> IssueCertResponse:
    if ca_private_key is None or ca_certificate is None:
        raise HTTPException(status_code=500, detail="CA service uninitialized")

    try:
        csr = x509.load_pem_x509_csr(req.csr_pem.encode("utf-8"), default_backend())
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSR PEM: {e}") from e

    try:
        cert = issue_leaf_certificate(
            ca_key=ca_private_key,
            ca_cert=ca_certificate,
            csr_or_pubkey=csr,
            kind=req.kind,
            common_name=req.common_name,
            principal_id=req.principal_id,
            san_dns_names=req.san_dns_names,
            san_ips=req.san_ips,
            validity_hours=req.validity_hours,
        )
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Certificate issuance failed: {e}") from e

    cert_pem = cert.public_bytes(serialization.Encoding.PEM).decode("utf-8")
    fp = compute_public_key_fingerprint(cert)

    return IssueCertResponse(
        certificate_pem=cert_pem,
        ca_chain_pem=ca_chain_bytes.decode("utf-8"),
        fingerprint=fp,
        serial_hex=f"{cert.serial_number:x}",
        expires_at=cert.not_valid_after_utc.isoformat(),
    )


@app.post("/v1/ca/revoke", summary="Revoke a Certificate")
async def revoke_certificate(req: RevokeCertRequest) -> dict[str, str]:
    try:
        serial = int(req.serial_hex, 16)
    except ValueError as e:
        raise HTTPException(
            status_code=400, detail="Invalid serial number format (must be hex)"
        ) from e

    reason_map = {
        "key_compromise": x509.ReasonFlags.key_compromise,
        "affiliation_changed": x509.ReasonFlags.affiliation_changed,
        "superseded": x509.ReasonFlags.superseded,
        "cessation_of_operation": x509.ReasonFlags.cessation_of_operation,
    }

    revoked_certificates[serial] = (
        datetime.datetime.now(datetime.timezone.utc),
        reason_map[req.reason],
    )

    return {"status": "revoked", "serial_hex": req.serial_hex}


@app.get("/v1/ca/crl", summary="Get Certificate Revocation List (CRL)")
async def get_crl() -> Response:
    if ca_private_key is None or ca_certificate is None:
        raise HTTPException(status_code=500, detail="CA uninitialized")

    revoked_list = [(serial, dt, reason) for serial, (dt, reason) in revoked_certificates.items()]
    crl = create_crl(ca_private_key, ca_certificate, revoked_list)
    crl_pem = crl.public_bytes(serialization.Encoding.PEM)

    return Response(content=crl_pem, media_type="application/pkix-crl")


@app.post(
    "/v1/ca/fingerprint",
    response_model=FingerprintResponse,
    summary="Compute Public Key Fingerprint",
)
async def calculate_fingerprint(req: FingerprintRequest) -> FingerprintResponse:
    try:
        cert = load_certificate(req.certificate_pem.encode("utf-8"))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid Certificate PEM: {e}") from e

    fp = compute_public_key_fingerprint(cert)
    return FingerprintResponse(fingerprint=fp)
