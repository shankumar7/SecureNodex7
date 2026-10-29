"""
SecureNodeX Chaos: Rogue Device with Untrusted/Self-Signed CA (AT-06 / AT-09).
Attempts connection/publishing with a certificate signed by an unauthorized/unknown CA.
"""

import argparse
import asyncio
import datetime
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from cryptography import x509
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import NameOID

from backend.app.gateway_pipeline import GatewayPipeline
from backend.app.message_core import sign_device_message


def create_rogue_certificate(device_id: str) -> tuple[ec.EllipticCurvePrivateKey, str]:
    """Generate a self-signed P-256 certificate signed by an unknown root."""
    rogue_ca_key = ec.generate_private_key(ec.SECP256R1(), default_backend())
    subject = issuer = x509.Name(
        [
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Rogue Unofficial CA"),
            x509.NameAttribute(NameOID.COMMON_NAME, device_id),
        ]
    )
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(rogue_ca_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.datetime.now(datetime.timezone.utc))
        .not_valid_after(datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1))
        .sign(rogue_ca_key, hashes.SHA256())
    )
    return rogue_ca_key, cert.fingerprint(hashes.SHA256()).hex()


async def main() -> None:
    parser = argparse.ArgumentParser(
        description="Simulate rogue device connection with untrusted CA certificate"
    )
    parser.add_argument("--device-id", default="device-rogue-01", help="Rogue device ID")
    args = parser.parse_args()

    print(f"[CHAOS] Generating rogue certificate for {args.device_id}...")
    rogue_key, rogue_fp = create_rogue_certificate(args.device_id)
    print(f"[CHAOS] Rogue SHA-256 Fingerprint: {rogue_fp}")

    now_ts = int(time.time())
    env = sign_device_message(
        private_key=rogue_key,
        device_id=args.device_id,
        seq=1,
        timestamp=now_ts,
        msg_type="tel",
        payload={"infiltrate": True},
    )

    pipeline = GatewayPipeline()
    # Attempting to publish to another device's topic or without registered identity
    topic = "snx/v1/dev/legitimate-device-99/telemetry"  # Topic hijacking attempt
    raw = json.dumps(env).encode("utf-8")

    print("[CHAOS] Attempting ingestion into gateway pipeline...")
    ok, parsed, reason = await pipeline.verify_envelope(
        raw_bytes=raw,
        topic=topic,
        public_key_override=rogue_key.public_key(),
        now_override=now_ts,
    )

    print(f"\n[RESULT] Verification Passed: {ok}")
    print(f"[RESULT] Rejection Reason: {reason}")

    assert ok is False
    assert reason == "ACCESS_DENIED", f"Expected ACCESS_DENIED on topic hijack, got {reason}"
    print("\n[PASS] Rogue device topic hijacking rejected with ACCESS_DENIED (AT-09)!")


if __name__ == "__main__":
    asyncio.run(main())
