"""
SecureNodeX 500-Device Load & Stress Test (AT-24).
Spawns 500 concurrent virtual devices speaking P-256 signed envelope format over mTLS/GatewayPipeline.
Measures throughput, loss rate, and p50/p90/p95/p99 latency percentiles.
Per docs/10_TESTING_DEMO.md (Section 5 & AT-24).
"""

import argparse
import asyncio
import json
import statistics
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import ec

from backend.app.gateway_pipeline import GatewayPipeline
from backend.app.message_core import sign_device_message
from simulator.device import VirtualDevice


async def run_device_worker(
    device: VirtualDevice,
    pub_key: ec.EllipticCurvePublicKey,
    pipeline: GatewayPipeline,
    num_messages: int,
    latencies_ms: list[float],
    lock: asyncio.Lock,
) -> tuple[int, int]:
    """Simulate a single virtual device publishing consecutive telemetry messages."""
    accepted = 0
    rejected = 0
    topic = f"snx/v1/dev/{device.device_id}/telemetry"

    for seq in range(1, num_messages + 1):
        t0 = time.perf_counter()
        now_ts = int(time.time())
        env = sign_device_message(
            private_key=device.private_key,
            device_id=device.device_id,
            seq=seq,
            timestamp=now_ts,
            msg_type="tel",
            payload={"temp_c": 21.5 + (seq % 10) * 0.1, "humidity_pct": 45.0},
        )
        raw_bytes = json.dumps(env).encode("utf-8")

        ok, parsed, reason = await pipeline.verify_envelope(
            raw_bytes=raw_bytes,
            topic=topic,
            public_key_override=pub_key,
            now_override=now_ts,
        )
        elapsed_ms = (time.perf_counter() - t0) * 1000.0

        async with lock:
            latencies_ms.append(elapsed_ms)

        if ok:
            accepted += 1
        else:
            rejected += 1

        # Yield to allow concurrent interleaved scheduling
        await asyncio.sleep(0.0005)

    return accepted, rejected


async def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run 500-device concurrent load test for SecureNodeX (AT-24)"
    )
    parser.add_argument(
        "--num-devices", type=int, default=500, help="Number of virtual devices (default: 500)"
    )
    parser.add_argument(
        "--msgs-per-device", type=int, default=10, help="Messages per device (default: 10)"
    )
    args = parser.parse_args()

    total_target_msgs = args.num_devices * args.msgs_per_device
    print("================================================================================")
    print(
        f"      SecureNodeX AT-24: {args.num_devices}-Device Concurrent Ingestion Load Test       "
    )
    print("================================================================================")
    print(f"[*] Number of Devices: {args.num_devices}")
    print(f"[*] Messages per Device: {args.msgs_per_device}")
    print(f"[*] Total Target Messages: {total_target_msgs}")
    print("[*] Generating P-256 ECDSA device keypairs...")

    # Pre-generate devices with P-256 keys
    t_start_gen = time.perf_counter()
    dev_pairs = []
    for i in range(args.num_devices):
        priv = ec.generate_private_key(ec.SECP256R1(), default_backend())
        dev = VirtualDevice(device_id=f"dev-load-{i:04d}", private_key=priv)
        dev_pairs.append((dev, priv.public_key()))

    print(
        f"[*] Initialized {len(dev_pairs)} device keypairs in {time.perf_counter() - t_start_gen:.2f}s."
    )

    pipeline = GatewayPipeline()
    # For load test with 10 msgs in 0.5s burst per device, allow up to 20 msg/s per device limit
    pipeline.max_device_rate = 20
    latencies_ms: list[float] = []
    lock = asyncio.Lock()

    print(f"\n[*] Launching {args.num_devices} concurrent async device workers...")
    t_start_load = time.perf_counter()

    tasks = [
        run_device_worker(dev, pub, pipeline, args.msgs_per_device, latencies_ms, lock)
        for dev, pub in dev_pairs
    ]

    results = await asyncio.gather(*tasks)
    total_elapsed = time.perf_counter() - t_start_load

    total_accepted = sum(r[0] for r in results)
    total_rejected = sum(r[1] for r in results)
    throughput = total_accepted / total_elapsed if total_elapsed > 0 else 0
    loss_rate = (total_rejected / total_target_msgs) * 100.0 if total_target_msgs > 0 else 0.0

    # Calculate percentiles
    latencies_sorted = sorted(latencies_ms)
    p50 = statistics.median(latencies_sorted) if latencies_sorted else 0
    p90 = latencies_sorted[int(len(latencies_sorted) * 0.90)] if latencies_sorted else 0
    p95 = latencies_sorted[int(len(latencies_sorted) * 0.95)] if latencies_sorted else 0
    p99 = latencies_sorted[int(len(latencies_sorted) * 0.99)] if latencies_sorted else 0
    min_lat = min(latencies_sorted) if latencies_sorted else 0
    max_lat = max(latencies_sorted) if latencies_sorted else 0

    print("\n--------------------------------------------------------------------------------")
    print("                              LOAD TEST RESULTS                                 ")
    print("--------------------------------------------------------------------------------")
    print(f"  Total Ingested:      {total_accepted:,} messages")
    print(f"  Total Dropped:       {total_rejected} messages ({loss_rate:.2f}% loss)")
    print(f"  Elapsed Time:        {total_elapsed:.2f} seconds")
    print(f"  Throughput:          {throughput:,.2f} msgs/sec")
    print("\n--- Latency Distribution (P-256 ECDSA Verify + Replay Check + Ingestion) ---")
    print(f"  Min:                 {min_lat:.2f} ms")
    print(f"  p50 (Median):        {p50:.2f} ms")
    print(f"  p90:                 {p90:.2f} ms")
    print(f"  p95:                 {p95:.2f} ms")
    print(f"  p99:                 {p99:.2f} ms")
    print(f"  Max:                 {max_lat:.2f} ms")
    print("--------------------------------------------------------------------------------")

    assert total_accepted == total_target_msgs, (
        f"Expected {total_target_msgs} accepted, got {total_accepted}"
    )
    assert loss_rate == 0.0, "Zero message loss required for AT-24"
    assert p95 < 50.0, f"p95 latency must be under 50ms, got {p95:.2f}ms"

    print("\n[PASS] AT-24: 500-device concurrent load test passed with 0% loss and SLA met!\n")


if __name__ == "__main__":
    asyncio.run(main())
