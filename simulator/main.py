"""CLI entrypoint for SecureNodeX Virtual Device Simulator."""

import argparse
import asyncio

from pki.ca_core import generate_p256_private_key
from simulator.device import VirtualDevice
from simulator.provision import batch_provision_devices
from simulator.runner import SimulatorRunner


def print_summary_table(summary: dict) -> None:
    print("\n" + "=" * 60)
    print("      SECURENODEX SIMULATOR BENCHMARK REPORT")
    print("=" * 60)
    print(f"Duration:            {summary['duration_s']} s")
    print(f"Total Attempted:     {summary['total_attempted']}")
    print(f"Total Accepted:      {summary['total_accepted']} ({summary['accepted_percent']}%)")
    print(f"Total Rejected:      {summary['total_rejected']} ({summary['loss_percent']}%)")
    print(f"Throughput:          {summary['throughput_msg_per_s']} msg/s")
    print("-" * 60)
    print("Latency Distribution (ms):")
    lat = summary["latency_ms"]
    print(f"  Min: {lat['min']} ms | Avg: {lat['avg']} ms | Max: {lat['max']} ms")
    print(
        f"  p50: {lat['p50']} ms | p90: {lat['p90']} ms | p95: {lat['p95']} ms | p99: {lat['p99']} ms"
    )
    if summary["rejections"]:
        print("-" * 60)
        print("Rejection Breakdown:")
        for reason, count in summary["rejections"].items():
            print(f"  - {reason}: {count}")
    print("=" * 60 + "\n")


async def main_async() -> None:
    parser = argparse.ArgumentParser(description="SecureNodeX Virtual Device Simulator")
    parser.add_argument("--devices", type=int, default=10, help="Number of virtual devices")
    parser.add_argument("--rate", type=float, default=1.0, help="Publish rate (msg/s per device)")
    parser.add_argument("--duration", type=float, default=5.0, help="Test duration in seconds")
    parser.add_argument("--jitter", type=float, default=0.05, help="Sleep jitter in seconds")
    parser.add_argument(
        "--offline-window", type=float, default=0.0, help="Offline window simulation duration"
    )
    parser.add_argument(
        "--tamper-rate", type=float, default=0.0, help="Fraction of tampered messages [0.0 - 1.0]"
    )
    parser.add_argument(
        "--replay-rate", type=float, default=0.0, help="Fraction of replayed messages [0.0 - 1.0]"
    )
    parser.add_argument(
        "--wrong-topic-rate", type=float, default=0.0, help="Fraction of wrong-topic messages"
    )
    parser.add_argument("--provision", action="store_true", help="Batch provision devices to disk")
    parser.add_argument(
        "--out-dir",
        type=str,
        default="simulator/devices",
        help="Output directory for provisioned bundles",
    )

    args = parser.parse_args()

    if args.provision:
        print(f"Batch provisioning {args.devices} devices into {args.out_dir}...")
        provisioned = batch_provision_devices(count=args.devices, out_dir=args.out_dir)
        print(f"Successfully provisioned {len(provisioned)} devices.")
        return

    print(f"Initializing {args.devices} virtual devices...")
    devices = [
        VirtualDevice(
            device_id=f"d-sim{i:012x}",
            private_key=generate_p256_private_key(),
        )
        for i in range(1, args.devices + 1)
    ]

    from backend.app.gateway_pipeline import GatewayPipeline

    pipeline = GatewayPipeline()

    print(
        f"Starting simulation: {args.devices} devices @ {args.rate} msg/s for {args.duration}s..."
    )
    runner = SimulatorRunner(
        devices=devices,
        pipeline=pipeline,
        db_session=None,
        rate_per_sec=args.rate,
        duration_s=args.duration,
        jitter_s=args.jitter,
        offline_window_s=args.offline_window,
        tamper_rate=args.tamper_rate,
        replay_rate=args.replay_rate,
        wrong_topic_rate=args.wrong_topic_rate,
    )

    summary = await runner.run()
    print_summary_table(summary)


def main() -> None:
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
