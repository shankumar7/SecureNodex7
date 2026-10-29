"""SecureNodeX Device Message Signing & Verification Core.

Per docs/06 section 2, 3 and docs/08 section 5:
- Envelope format: {"v":1,"d":"...","s":42,"t":1760000000,"y":"tel","p":"...","g":"..."}
- Signing input: "SNX1\n" + d + "\n" + s + "\n" + t + "\n" + y + "\n" + p
- Signature: ECDSA P-256 with SHA-256, encoded as raw 64-byte r||s (each 32-byte big-endian left-padded)
- Encodings: base64url without padding for p and g.
"""

from __future__ import annotations

import base64
import json
from typing import Any, Literal

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import (
    decode_dss_signature,
    encode_dss_signature,
)


def b64url_encode(data: bytes) -> str:
    """Encodes bytes to base64url string without trailing '=' padding."""
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def b64url_decode(s: str) -> bytes:
    """Decodes base64url string without padding."""
    padding = "=" * ((4 - len(s) % 4) % 4)
    return base64.urlsafe_b64decode((s + padding).encode("ascii"))


def der_to_raw_rs(der_sig: bytes) -> bytes:
    """Converts ASN.1 DER ECDSA signature to 64-byte raw r||s format."""
    r, s = decode_dss_signature(der_sig)
    r_bytes = r.to_bytes(32, byteorder="big")
    s_bytes = s.to_bytes(32, byteorder="big")
    return r_bytes + s_bytes


def raw_rs_to_der(raw_rs: bytes) -> bytes:
    """Converts 64-byte raw r||s ECDSA signature to ASN.1 DER format."""
    if len(raw_rs) != 64:
        raise ValueError(f"Raw r||s signature must be exactly 64 bytes, got {len(raw_rs)}")
    r = int.from_bytes(raw_rs[:32], byteorder="big")
    s = int.from_bytes(raw_rs[32:], byteorder="big")
    return encode_dss_signature(r, s)


def build_signing_input(
    device_id: str,
    seq: int,
    timestamp: int,
    msg_type: str,
    payload_b64: str,
) -> bytes:
    """Constructs the canonical signing input string (docs/06 section 3).

    signing_input = "SNX1\n" + d + "\n" + s + "\n" + t + "\n" + y + "\n" + p
    """
    s_str = str(seq)
    t_str = str(timestamp)
    signing_str = f"SNX1\n{device_id}\n{s_str}\n{t_str}\n{msg_type}\n{payload_b64}"
    return signing_str.encode("utf-8")


def sign_device_message(
    private_key: ec.EllipticCurvePrivateKey,
    device_id: str,
    seq: int,
    timestamp: int,
    msg_type: Literal["tel", "evt", "ack", "cmd"],
    payload: dict[str, Any] | bytes | str,
) -> dict[str, Any]:
    """Builds a signed device message envelope."""
    if isinstance(payload, dict):
        payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    elif isinstance(payload, str):
        payload_bytes = payload.encode("utf-8")
    else:
        payload_bytes = payload

    p_b64 = b64url_encode(payload_bytes)
    signing_input = build_signing_input(
        device_id=device_id,
        seq=seq,
        timestamp=timestamp,
        msg_type=msg_type,
        payload_b64=p_b64,
    )

    # Sign with ECDSA P-256 + SHA-256
    der_sig = private_key.sign(signing_input, ec.ECDSA(hashes.SHA256()))
    raw_rs = der_to_raw_rs(der_sig)
    g_b64 = b64url_encode(raw_rs)

    envelope = {
        "v": 1,
        "d": device_id,
        "s": seq,
        "t": timestamp,
        "y": msg_type,
        "p": p_b64,
        "g": g_b64,
    }
    return envelope


def verify_device_message(
    public_key: ec.EllipticCurvePublicKey,
    envelope: dict[str, Any],
) -> bool:
    """Verifies a device message envelope signature against the device's public key."""
    if envelope.get("v") != 1:
        return False

    device_id = envelope.get("d")
    seq = envelope.get("s")
    timestamp = envelope.get("t")
    msg_type = envelope.get("y")
    payload_b64 = envelope.get("p")
    sig_b64 = envelope.get("g")

    if (
        not device_id
        or seq is None
        or timestamp is None
        or not msg_type
        or not payload_b64
        or not sig_b64
    ):
        return False

    try:
        seq_int = int(str(seq))
        ts_int = int(str(timestamp))
    except (ValueError, TypeError):
        return False

    signing_input = build_signing_input(
        device_id=str(device_id),
        seq=seq_int,
        timestamp=ts_int,
        msg_type=str(msg_type),
        payload_b64=str(payload_b64),
    )

    try:
        raw_rs = b64url_decode(str(sig_b64))
        der_sig = raw_rs_to_der(raw_rs)
        public_key.verify(der_sig, signing_input, ec.ECDSA(hashes.SHA256()))
        return True
    except (InvalidSignature, ValueError, Exception):
        return False
