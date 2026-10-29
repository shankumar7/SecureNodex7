#!/usr/bin/env python3
"""Generate deterministic and random test vectors for SecureNodeX message signing.

Outputs:
  - Private key (PEM)
  - Public key (PEM)
  - Envelope JSON
  - Signing Input string
  - Verification check result
"""

import json

from cryptography.hazmat.primitives import serialization

from backend.app.message_core import (
    build_signing_input,
    sign_device_message,
    verify_device_message,
)
from pki.ca_core import compute_public_key_fingerprint, generate_p256_private_key


def main() -> None:
    # Generate fresh P-256 test key
    private_key = generate_p256_private_key()
    public_key = private_key.public_key()

    priv_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")

    pub_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("utf-8")

    fingerprint = compute_public_key_fingerprint(public_key)

    from typing import Literal

    device_id = "d-0a1b2c3d4e5f6071"
    seq = 42
    timestamp = 1760000000
    msg_type: Literal["tel", "evt", "ack", "cmd"] = "tel"
    payload = {"temp_c": 24.7, "hum_pct": 51.2, "vbat_mv": 3980, "rssi": -61}

    envelope = sign_device_message(
        private_key=private_key,
        device_id=device_id,
        seq=seq,
        timestamp=timestamp,
        msg_type=msg_type,
        payload=payload,
    )

    signing_input_bytes = build_signing_input(
        device_id=device_id,
        seq=seq,
        timestamp=timestamp,
        msg_type=msg_type,
        payload_b64=envelope["p"],
    )

    is_valid = verify_device_message(public_key, envelope)

    test_vector = {
        "description": "SecureNodeX Test Vector - ECC P-256 / SHA-256 / Envelope v1",
        "device_id": device_id,
        "cert_fingerprint": fingerprint,
        "private_key_pem": priv_pem,
        "public_key_pem": pub_pem,
        "raw_payload_json": payload,
        "signing_input": signing_input_bytes.decode("utf-8"),
        "envelope": envelope,
        "verification_result": "PASS" if is_valid else "FAIL",
    }

    print(json.dumps(test_vector, indent=2))


if __name__ == "__main__":
    main()
