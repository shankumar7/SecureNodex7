"""Tests for SecureNodeX ECC P-256 PKI Core and Provisioning."""

import os
import stat
import tempfile
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec

from pki.ca_core import (
    compute_public_key_fingerprint,
    create_intermediate_ca,
    create_root_ca,
    generate_p256_private_key,
    issue_leaf_certificate,
)
from pki.provision_device import provision_device


def test_root_ca_generation() -> None:
    key, cert = create_root_ca(common_name="SecureNodeX Test Root CA")
    assert isinstance(key, ec.EllipticCurvePrivateKey)
    assert isinstance(key.curve, ec.SECP256R1)
    assert cert.subject == cert.issuer
    assert (
        cert.subject.get_attributes_for_oid(x509.oid.NameOID.COMMON_NAME)[0].value
        == "SecureNodeX Test Root CA"
    )

    # Verify BasicConstraints ca=True
    bc = cert.extensions.get_extension_for_class(x509.BasicConstraints).value
    assert bc.ca is True

    # Verify KeyUsage
    ku = cert.extensions.get_extension_for_class(x509.KeyUsage).value
    assert ku.key_cert_sign is True
    assert ku.crl_sign is True


def test_intermediate_ca_generation() -> None:
    r_key, r_cert = create_root_ca()
    i_key, i_cert = create_intermediate_ca(
        r_key, r_cert, common_name="SecureNodeX Test Intermediate CA"
    )

    assert isinstance(i_key, ec.EllipticCurvePrivateKey)
    assert i_cert.issuer == r_cert.subject
    assert (
        i_cert.subject.get_attributes_for_oid(x509.oid.NameOID.COMMON_NAME)[0].value
        == "SecureNodeX Test Intermediate CA"
    )

    # Verify signature with root public key
    r_cert.public_key().verify(
        i_cert.signature,
        i_cert.tbs_certificate_bytes,
        ec.ECDSA(hashes.SHA256()),
    )


def test_certificate_profiles_and_fingerprints() -> None:
    r_key, r_cert = create_root_ca()
    i_key, i_cert = create_intermediate_ca(r_key, r_cert)

    # 1. Device Profile
    dev_key = generate_p256_private_key()
    dev_cert = issue_leaf_certificate(
        ca_key=i_key,
        ca_cert=i_cert,
        csr_or_pubkey=dev_key.public_key(),
        kind="device",
        common_name="d-0a1b2c3d4e5f6071",
        principal_id="0a1b2c3d4e5f6071",
    )
    assert dev_cert.issuer == i_cert.subject
    dev_eku = dev_cert.extensions.get_extension_for_class(x509.ExtendedKeyUsage).value
    assert x509.oid.ExtendedKeyUsageOID.CLIENT_AUTH in dev_eku

    # Check SAN URI did:snx:...
    san = dev_cert.extensions.get_extension_for_class(x509.SubjectAlternativeName).value
    uris = [str(name.value) for name in san if isinstance(name, x509.UniformResourceIdentifier)]
    assert "did:snx:0a1b2c3d4e5f6071" in uris

    # Check SPKI fingerprint
    fp = compute_public_key_fingerprint(dev_cert)
    assert len(fp) == 64  # SHA-256 hex
    assert fp == compute_public_key_fingerprint(dev_key.public_key())

    # 2. Broker Profile
    broker_key = generate_p256_private_key()
    broker_cert = issue_leaf_certificate(
        ca_key=i_key,
        ca_cert=i_cert,
        csr_or_pubkey=broker_key.public_key(),
        kind="broker",
        common_name="broker.snx.lan",
        san_dns_names=["broker.snx.lan", "localhost"],
    )
    broker_eku = broker_cert.extensions.get_extension_for_class(x509.ExtendedKeyUsage).value
    assert x509.oid.ExtendedKeyUsageOID.SERVER_AUTH in broker_eku

    # 3. Service / Storage-Node Profile (dual auth)
    svc_key = generate_p256_private_key()
    svc_cert = issue_leaf_certificate(
        ca_key=i_key,
        ca_cert=i_cert,
        csr_or_pubkey=svc_key.public_key(),
        kind="service",
        common_name="snx-api",
    )
    svc_eku = svc_cert.extensions.get_extension_for_class(x509.ExtendedKeyUsage).value
    assert x509.oid.ExtendedKeyUsageOID.CLIENT_AUTH in svc_eku
    assert x509.oid.ExtendedKeyUsageOID.SERVER_AUTH in svc_eku


def test_device_provisioning_bundle() -> None:
    with tempfile.TemporaryDirectory() as tmpdir:
        ca_dir = Path(tmpdir) / "ca"
        ca_dir.mkdir()
        r_key, r_cert = create_root_ca()
        i_key, i_cert = create_intermediate_ca(r_key, r_cert)

        from cryptography.hazmat.primitives import serialization

        (ca_dir / "intermediate-ca.key").write_bytes(
            i_key.private_bytes(
                serialization.Encoding.PEM,
                serialization.PrivateFormat.PKCS8,
                serialization.NoEncryption(),
            )
        )
        (ca_dir / "intermediate-ca.crt").write_bytes(
            i_cert.public_bytes(serialization.Encoding.PEM)
        )
        (ca_dir / "ca-chain.pem").write_bytes(
            i_cert.public_bytes(serialization.Encoding.PEM)
            + b"\n"
            + r_cert.public_bytes(serialization.Encoding.PEM)
        )

        out_dir = Path(tmpdir) / "out"
        result = provision_device(
            label="esp32-01",
            ca_dir=str(ca_dir),
            out_base_dir=str(out_dir),
            broker_host="broker.snx.lan",
            broker_port=8883,
        )

        bundle_path = Path(result["bundle_dir"])
        assert bundle_path.exists()
        assert (bundle_path / "device.crt").exists()
        assert (bundle_path / "ca-chain.pem").exists()
        assert (bundle_path / "config.json").exists()

        key_file = bundle_path / "device.key"
        assert key_file.exists()

        # Check strict permissions 0600
        mode = oct(stat.S_IMODE(os.stat(key_file).st_mode))
        assert mode == "0o600"
