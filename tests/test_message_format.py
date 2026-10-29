"""Tests for SecureNodeX Device Message Signing & Envelope Specification (docs/06)."""

import json

from backend.app.message_core import (
    b64url_decode,
    b64url_encode,
    build_signing_input,
    der_to_raw_rs,
    raw_rs_to_der,
    sign_device_message,
    verify_device_message,
)
from pki.ca_core import generate_p256_private_key


def test_signing_input_construction() -> None:
    d = "d-0a1b2c3d4e5f6071"
    s = 42
    t = 1760000000
    y = "tel"
    p = "eyJ0ZW1wX2MiOjI0Ljd9"

    expected = b"SNX1\nd-0a1b2c3d4e5f6071\n42\n1760000000\ntel\neyJ0ZW1wX2MiOjI0Ljd9"
    actual = build_signing_input(d, s, t, y, p)
    assert actual == expected


def test_raw_rs_conversion_is_bijective() -> None:
    key = generate_p256_private_key()
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.asymmetric import ec

    data = b"hello securenodex"
    der_sig = key.sign(data, ec.ECDSA(hashes.SHA256()))

    raw_rs = der_to_raw_rs(der_sig)
    assert len(raw_rs) == 64

    re_der = raw_rs_to_der(raw_rs)
    # Both DER signatures must verify
    key.public_key().verify(der_sig, data, ec.ECDSA(hashes.SHA256()))
    key.public_key().verify(re_der, data, ec.ECDSA(hashes.SHA256()))


def test_sign_and_verify_device_message() -> None:
    key = generate_p256_private_key()
    pub = key.public_key()

    payload = {"temp_c": 24.7, "hum_pct": 51.2, "vbat_mv": 3980, "rssi": -61}
    envelope = sign_device_message(
        private_key=key,
        device_id="d-0a1b2c3d4e5f6071",
        seq=101,
        timestamp=1760000100,
        msg_type="tel",
        payload=payload,
    )

    # Check envelope structure
    assert envelope["v"] == 1
    assert envelope["d"] == "d-0a1b2c3d4e5f6071"
    assert envelope["s"] == 101
    assert envelope["t"] == 1760000100
    assert envelope["y"] == "tel"
    assert not envelope["p"].endswith("=")
    assert not envelope["g"].endswith("=")

    # Verify signature
    assert verify_device_message(pub, envelope) is True

    # Decoded payload matches original
    decoded_payload = json.loads(b64url_decode(envelope["p"]).decode("utf-8"))
    assert decoded_payload == payload


def test_tampered_payload_rejected() -> None:
    key = generate_p256_private_key()
    pub = key.public_key()

    envelope = sign_device_message(
        private_key=key,
        device_id="d-0a1b2c3d4e5f6071",
        seq=1,
        timestamp=1760000000,
        msg_type="tel",
        payload={"temp_c": 20.0},
    )

    # Tamper with payload (p)
    tampered_envelope = dict(envelope)
    tampered_payload = json.dumps({"temp_c": 99.9}).encode("utf-8")
    tampered_envelope["p"] = b64url_encode(tampered_payload)

    assert verify_device_message(pub, tampered_envelope) is False


def test_tampered_seq_or_timestamp_rejected() -> None:
    key = generate_p256_private_key()
    pub = key.public_key()

    envelope = sign_device_message(
        private_key=key,
        device_id="d-0a1b2c3d4e5f6071",
        seq=10,
        timestamp=1760000000,
        msg_type="tel",
        payload={"temp_c": 22.5},
    )

    # Alter sequence
    alt_seq_envelope = dict(envelope)
    alt_seq_envelope["s"] = 11
    assert verify_device_message(pub, alt_seq_envelope) is False

    # Alter timestamp
    alt_ts_envelope = dict(envelope)
    alt_ts_envelope["t"] = 1760000001
    assert verify_device_message(pub, alt_ts_envelope) is False


def test_wrong_key_rejected() -> None:
    key1 = generate_p256_private_key()
    key2 = generate_p256_private_key()

    envelope = sign_device_message(
        private_key=key1,
        device_id="d-0a1b2c3d4e5f6071",
        seq=1,
        timestamp=1760000000,
        msg_type="tel",
        payload={"ok": True},
    )

    assert verify_device_message(key2.public_key(), envelope) is False
