#!/usr/bin/env python3
# ruff: noqa: N999
"""Device Provisioning CLI Tool (Mode A - Provisioning bundle)."""

import argparse

from pki.provision_device import provision_device


def main() -> None:
    parser = argparse.ArgumentParser(description="Provision a SecureNodeX device bundle (Mode A)")
    parser.add_argument("--label", required=True, help="Human label for device (e.g. esp32-01)")
    parser.add_argument("--role", default="device", help="Identity role")
    parser.add_argument("--ca-dir", default="pki/intermediate", help="Intermediate CA directory")
    parser.add_argument("--out-dir", default="pki/out", help="Base output directory")
    parser.add_argument(
        "--broker-host", default="broker.snx.lan", help="Broker host for config.json"
    )
    parser.add_argument("--broker-port", type=int, default=8883, help="Broker port")
    parser.add_argument("--interval", type=int, default=10, help="Publish interval in seconds")
    parser.add_argument("--hours", type=int, default=None, help="Validity in hours (optional)")
    args = parser.parse_args()

    result = provision_device(
        label=args.label,
        ca_dir=args.ca_dir,
        out_base_dir=args.out_dir,
        broker_host=args.broker_host,
        broker_port=args.broker_port,
        publish_interval_s=args.interval,
        validity_hours=args.hours,
    )

    print("[+] Device provisioned successfully:")
    print(f"    Label:       {args.label}")
    print(f"    Device ID:   {result['device_id']}")
    print(f"    Principal:   did:snx:{result['principal_id']}")
    print(f"    Fingerprint: {result['fingerprint']}")
    print(f"    Bundle Path: {result['bundle_dir']}")


if __name__ == "__main__":
    main()
