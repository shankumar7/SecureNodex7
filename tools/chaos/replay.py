"""
SecureNodeX Chaos: Replay Attack (AT-05 / AT-11).
Re-sends an old or duplicate sequence number; verifies gateway rejects with REPLAY_REJECTED.
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
    parser = argparse.ArgumentParser(description="Inject replayed message sequence into SecureNodeX Gateway")
    parser.add_argument("--device-id", default="device-chaos-replay", help="Target device ID")
    args = parser.parse_args()

    priv_key = ec.generate_private_key(ec.SECP256R1(), default_backend())
    pub_key = priv_key.public_key()
    pipeline = GatewayPipeline()
    topic = f"snx/v1/dev/{args.device_id}/telemetry"
    now_ts = int(time.time())

    # Step 1: Send message with seq=10
    env_1 = sign_device_message(
        private_key=priv_key,
        device_id=args.device_id,
        seq=10,
        timestamp=now_ts,
        msg_type="tel",
        payload={"val": 100},
    )
    ok1, _, reason1 = await pipeline.verify_envelope(
        raw_bytes=json.dumps(env_1).encode("utf-8"),
        topic=topic,
        public_key_override=pub_key,
        now_override=now_ts,
    )
    print(f"[STEP 1] Sent seq=10 -> Passed: {ok1} (reason: {reason1})")
    assert ok1 is True

    # Step 2: Replay duplicate seq=10
    print(f"[CHAOS] Attempting replay with duplicate seq=10...")
    env_replay = sign_device_message(
        private_key=priv_key,
        device_id=args.device_id,
        seq=10,
        timestamp=now_ts + 1,
        msg_type="tel",
        payload={"val": 100},
    )
    ok2, _, reason2 = await pipeline.verify_envelope(
        raw_bytes=json.dumps(env_replay).encode("utf-8"),
        topic=topic,
        public_key_override=pub_key,
        now_override=now_ts + 1,
    )
    print(f"[RESULT] Verification Passed: {ok2}")
    print(f"[RESULT] Rejection Reason: {reason2}")

    assert ok2 is False, "Replay must be rejected"
    assert reason2 == "REPLAY_REJECTED", f"Expected REPLAY_REJECTED, got {reason2}"
    print("\n[PASS] Replay attack successfully blocked (AT-11)!")


if __name__ == "__main__":
    asyncio.run(main())
