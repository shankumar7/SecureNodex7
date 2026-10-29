"""
SecureNodeX Chaos: DoS Rate Limit Flood (AT-12).
Floods 50 msg/s from one device; verifies per-device token bucket rate limiting engages.
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
    parser = argparse.ArgumentParser(description="Flood messages to test gateway rate limiter")
    parser.add_argument("--device-id", default="device-chaos-flood", help="Attacking device ID")
    parser.add_argument("--burst-count", type=int, default=50, help="Number of burst messages")
    args = parser.parse_args()

    print(f"[CHAOS] Simulating flood of {args.burst_count} messages from {args.device_id}...")
    priv_key = ec.generate_private_key(ec.SECP256R1(), default_backend())
    pub_key = priv_key.public_key()
    pipeline = GatewayPipeline()
    topic = f"snx/v1/dev/{args.device_id}/telemetry"
    now_ts = int(time.time())

    accepted_count = 0
    rate_limited_count = 0

    for seq in range(1, args.burst_count + 1):
        env = sign_device_message(
            private_key=priv_key,
            device_id=args.device_id,
            seq=seq,
            timestamp=now_ts,
            msg_type="tel",
            payload={"seq": seq, "sensor_load": "flood"},
        )
        ok, _, reason = await pipeline.verify_envelope(
            raw_bytes=json.dumps(env).encode("utf-8"),
            topic=topic,
            public_key_override=pub_key,
            now_override=now_ts,
        )
        if ok:
            accepted_count += 1
        elif reason == "RATE_LIMITED":
            rate_limited_count += 1

    print(f"\n[METRICS] Total Attempted: {args.burst_count}")
    print(f"[METRICS] Accepted (Within Rate Limit Capacity): {accepted_count}")
    print(f"[METRICS] Rate Limited / Dropped: {rate_limited_count}")

    assert rate_limited_count > 0, "Rate limiter should have dropped excess burst messages"
    print("\n[PASS] Rate limiting enforced successfully (AT-12)!")


if __name__ == "__main__":
    asyncio.run(main())
