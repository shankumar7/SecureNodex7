"""
SecureNodeX Chaos: Message Tampering Attack (AT-03 / AT-10).
Injects modified payload with original signature; verifies gateway rejects with SIGNATURE_INVALID.
"""

import argparse
import asyncio
import json
from pathlib import Path
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import ec

from backend.app.gateway_pipeline import GatewayPipeline
from backend.app.message_core import sign_device_message


async def main() -> None:
    parser = argparse.ArgumentParser(description="Inject tampered payload into SecureNodeX Gateway")
    parser.add_argument("--device-id", default="device-chaos-tamper", help="Target device ID")
    args = parser.parse_args()

    print(f"[CHAOS] Generating valid signed envelope for {args.device_id}...")
    priv_key = ec.generate_private_key(ec.SECP256R1(), default_backend())
    pub_key = priv_key.public_key()
    now_ts = int(time.time())

    valid_env = sign_device_message(
        private_key=priv_key,
        device_id=args.device_id,
        seq=1,
        timestamp=now_ts,
        msg_type="tel",
        payload={"temperature": 24.5, "unit": "C"},
    )
    print(f"[CHAOS] Original Valid Envelope:\n{json.dumps(valid_env, indent=2)}")

    # Tamper payload while preserving original signature
    tampered_env = json.loads(json.dumps(valid_env))
    tampered_env["p"] = {"temperature": 999.9, "unit": "C", "malicious": True}
    print(f"\n[CHAOS] Tampered Envelope (Payload modified, original signature kept):\n{json.dumps(tampered_env, indent=2)}")

    pipeline = GatewayPipeline()
    topic = f"snx/v1/dev/{args.device_id}/telemetry"
    raw_tampered = json.dumps(tampered_env).encode("utf-8")

    ok, parsed, reason = await pipeline.verify_envelope(
        raw_bytes=raw_tampered,
        topic=topic,
        public_key_override=pub_key,
        now_override=now_ts,
    )

    print(f"\n[RESULT] Verification Passed: {ok}")
    print(f"[RESULT] Rejection Reason: {reason}")

    assert ok is False, "Tampered payload should not pass verification"
    assert reason == "SIGNATURE_INVALID", f"Expected SIGNATURE_INVALID, got {reason}"
    print("\n[PASS] Tampered payload successfully rejected with SIGNATURE_INVALID (AT-10)!")


if __name__ == "__main__":
    asyncio.run(main())
