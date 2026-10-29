"""Tests for snx-ca REST API service."""

import pytest
from cryptography.hazmat.primitives import serialization
from starlette.testclient import TestClient

from backend.app.ca import app
from pki.ca_core import (
    create_csr,
    generate_p256_private_key,
    load_certificate,
)


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


def test_ca_chain_endpoint(client: TestClient) -> None:
    res = client.get("/v1/ca/chain")
    assert res.status_code == 200
    assert b"BEGIN CERTIFICATE" in res.content


def test_ca_issue_from_csr(client: TestClient) -> None:
    dev_key = generate_p256_private_key()
    csr = create_csr(dev_key, common_name="d-0011223344556677", kind="device")
    csr_pem = csr.public_bytes(serialization.Encoding.PEM).decode("utf-8")

    payload = {
        "csr_pem": csr_pem,
        "kind": "device",
        "common_name": "d-0011223344556677",
        "principal_id": "0011223344556677",
        "validity_hours": 72,
    }

    res = client.post("/v1/ca/issue", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "certificate_pem" in data
    assert "fingerprint" in data
    assert len(data["fingerprint"]) == 64
    assert data["serial_hex"]

    cert = load_certificate(data["certificate_pem"].encode("utf-8"))
    assert cert.subject.get_attributes_for_oid(
        from_oid=cert.subject.rdns[2].rfc4514_string().split("=")[0]
    )  # valid cert


def test_ca_fingerprint_endpoint(client: TestClient) -> None:
    dev_key = generate_p256_private_key()
    csr = create_csr(dev_key, common_name="d-test", kind="device")
    csr_pem = csr.public_bytes(serialization.Encoding.PEM).decode("utf-8")

    res_issue = client.post(
        "/v1/ca/issue",
        json={"csr_pem": csr_pem, "kind": "device", "common_name": "d-test"},
    )
    cert_pem = res_issue.json()["certificate_pem"]
    expected_fp = res_issue.json()["fingerprint"]

    res_fp = client.post("/v1/ca/fingerprint", json={"certificate_pem": cert_pem})
    assert res_fp.status_code == 200
    assert res_fp.json()["fingerprint"] == expected_fp


def test_ca_revoke_and_crl(client: TestClient) -> None:
    dev_key = generate_p256_private_key()
    csr = create_csr(dev_key, common_name="d-revoke-me", kind="device")
    csr_pem = csr.public_bytes(serialization.Encoding.PEM).decode("utf-8")

    res_issue = client.post(
        "/v1/ca/issue",
        json={"csr_pem": csr_pem, "kind": "device", "common_name": "d-revoke-me"},
    )
    serial_hex = res_issue.json()["serial_hex"]

    # Revoke
    res_revoke = client.post(
        "/v1/ca/revoke",
        json={"serial_hex": serial_hex, "reason": "key_compromise"},
    )
    assert res_revoke.status_code == 200
    assert res_revoke.json()["status"] == "revoked"

    # Fetch CRL
    res_crl = client.get("/v1/ca/crl")
    assert res_crl.status_code == 200
    assert b"BEGIN X509 CRL" in res_crl.content
