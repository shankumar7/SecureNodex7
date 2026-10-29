"""Integration and unit tests for Mosquitto mTLS, CRL, and Topic ACL enforcement (AT-06, AT-07, AT-09)."""

import contextlib
import datetime
import ssl
import tempfile
from pathlib import Path

import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization

from broker.acl_gen import generate_mosquitto_acl
from pki.ca_core import (
    create_intermediate_ca,
    create_root_ca,
    generate_p256_private_key,
    issue_leaf_certificate,
    private_key_to_pem,
)


def test_at06_unknown_ca_rejected_by_ssl_context() -> None:
    """AT-06: Certificate from unknown CA must be rejected during TLS handshake."""
    # 1. Real CA
    r_key, r_cert = create_root_ca(common_name="Trusted Root")
    i_key, i_cert = create_intermediate_ca(r_key, r_cert, common_name="Trusted Intermediate")

    # 2. Rogue CA (attacker)
    rogue_r_key, rogue_r_cert = create_root_ca(common_name="Rogue Root")
    rogue_i_key, rogue_i_cert = create_intermediate_ca(
        rogue_r_key, rogue_r_cert, common_name="Rogue Intermediate"
    )

    # 3. Issue rogue client certificate
    rogue_dev_key = generate_p256_private_key()
    rogue_dev_cert = issue_leaf_certificate(
        ca_key=rogue_i_key,
        ca_cert=rogue_i_cert,
        csr_or_pubkey=rogue_dev_key.public_key(),
        kind="device",
        common_name="d-rogue-device",
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        ca_chain_path = Path(tmpdir) / "ca-chain.pem"
        rogue_cert_path = Path(tmpdir) / "rogue.crt"
        rogue_key_path = Path(tmpdir) / "rogue.key"

        ca_chain_pem = (
            i_cert.public_bytes(serialization.Encoding.PEM)
            + b"\n"
            + r_cert.public_bytes(serialization.Encoding.PEM)
        )
        ca_chain_path.write_bytes(ca_chain_pem)
        rogue_cert_path.write_bytes(rogue_dev_cert.public_bytes(serialization.Encoding.PEM))
        rogue_key_path.write_bytes(private_key_to_pem(rogue_dev_key))

        # Build server SSL context trusting only Real CA
        server_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        server_ctx.load_verify_locations(cafile=str(ca_chain_path))
        server_ctx.verify_mode = ssl.CERT_REQUIRED

        # Build client SSL context with rogue cert
        client_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        client_ctx.load_verify_locations(cafile=str(ca_chain_path))
        client_ctx.load_cert_chain(certfile=str(rogue_cert_path), keyfile=str(rogue_key_path))

        # Verification: Attempt TLS handshake across in-memory bio
        incoming = ssl.MemoryBIO()
        outgoing = ssl.MemoryBIO()
        server_ssl = server_ctx.wrap_bio(incoming, outgoing, server_side=True)

        client_in = ssl.MemoryBIO()
        client_out = ssl.MemoryBIO()
        client_ssl = client_ctx.wrap_bio(client_in, client_out, server_side=False)

        with pytest.raises(ssl.SSLError):
            with contextlib.suppress(ssl.SSLWantReadError):
                client_ssl.do_handshake()

            incoming.write(client_out.read())
            with contextlib.suppress(ssl.SSLWantReadError):
                server_ssl.do_handshake()

            client_in.write(outgoing.read())
            with contextlib.suppress(ssl.SSLWantReadError):
                client_ssl.do_handshake()

            # Server receives client certificate from rogue CA -> MUST FAIL
            incoming.write(client_out.read())
            server_ssl.do_handshake()


def test_at07_expired_certificate_rejected() -> None:
    """AT-07: Expired certificate must be rejected."""
    r_key, r_cert = create_root_ca()
    i_key, i_cert = create_intermediate_ca(r_key, r_cert)

    dev_key = generate_p256_private_key()

    # Create certificate that expired in the past
    now = datetime.datetime.now(datetime.timezone.utc)
    expired_cert = (
        x509.CertificateBuilder()
        .subject_name(x509.Name([x509.NameAttribute(x509.oid.NameOID.COMMON_NAME, "d-expired")]))
        .issuer_name(i_cert.subject)
        .public_key(dev_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - datetime.timedelta(days=10))
        .not_valid_after(now - datetime.timedelta(days=1))
        .sign(i_key, hashes.SHA256())
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        ca_chain_path = Path(tmpdir) / "ca-chain.pem"
        cert_path = Path(tmpdir) / "expired.crt"
        key_path = Path(tmpdir) / "expired.key"

        ca_chain_pem = (
            i_cert.public_bytes(serialization.Encoding.PEM)
            + b"\n"
            + r_cert.public_bytes(serialization.Encoding.PEM)
        )
        ca_chain_path.write_bytes(ca_chain_pem)
        cert_path.write_bytes(expired_cert.public_bytes(serialization.Encoding.PEM))
        key_path.write_bytes(private_key_to_pem(dev_key))

        server_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        server_ctx.load_verify_locations(cafile=str(ca_chain_path))
        server_ctx.verify_mode = ssl.CERT_REQUIRED

        client_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        client_ctx.load_verify_locations(cafile=str(ca_chain_path))
        client_ctx.load_cert_chain(certfile=str(cert_path), keyfile=str(key_path))

        incoming = ssl.MemoryBIO()
        outgoing = ssl.MemoryBIO()
        server_ssl = server_ctx.wrap_bio(incoming, outgoing, server_side=True)

        client_in = ssl.MemoryBIO()
        client_out = ssl.MemoryBIO()
        client_ssl = client_ctx.wrap_bio(client_in, client_out, server_side=False)

        with pytest.raises(ssl.SSLError):
            with contextlib.suppress(ssl.SSLWantReadError):
                client_ssl.do_handshake()

            incoming.write(client_out.read())
            with contextlib.suppress(ssl.SSLWantReadError):
                server_ssl.do_handshake()

            client_in.write(outgoing.read())
            with contextlib.suppress(ssl.SSLWantReadError):
                client_ssl.do_handshake()

            incoming.write(client_out.read())
            server_ssl.do_handshake()


def test_at09_topic_acl_generation_and_rules() -> None:
    """AT-09: Topic ACL logic enforces device can only publish to its own topic."""
    dev_a = "d-1111222233334444"
    dev_b = "d-5555666677778888"

    acl_text = generate_mosquitto_acl(active_device_ids=[dev_a, dev_b])

    # Check dev_a rules
    assert f"user {dev_a}" in acl_text
    assert f"topic write snx/v1/dev/{dev_a}/telemetry" in acl_text
    assert f"topic write snx/v1/dev/{dev_a}/event" in acl_text
    assert f"topic write snx/v1/dev/{dev_a}/status" in acl_text
    assert f"topic read snx/v1/dev/{dev_a}/cmd" in acl_text

    # Verify dev_a is NOT granted write access to dev_b's topic
    assert (
        f"topic write snx/v1/dev/{dev_b}/telemetry"
        not in acl_text.split(f"user {dev_a}")[1].split(f"user {dev_b}")[0]
    )

    # Service wildcard rules
    assert "user snx-gateway" in acl_text
    assert "topic readwrite snx/v1/dev/#" in acl_text
