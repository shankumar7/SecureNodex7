#!/usr/bin/env python3
"""CLI utility to issue leaf certificates from the Intermediate CA."""

import argparse
import os
import stat
from pathlib import Path

from cryptography.hazmat.primitives import serialization

from pki.ca_core import (
    compute_public_key_fingerprint,
    generate_p256_private_key,
    issue_leaf_certificate,
    load_certificate,
    load_private_key,
    private_key_to_pem,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Issue leaf certificate from Intermediate CA")
    parser.add_argument("--ca-dir", default="pki/intermediate", help="Intermediate CA directory")
    parser.add_argument(
        "--kind",
        required=True,
        choices=["broker", "device", "service", "storage-node", "user"],
    )
    parser.add_argument(
        "--cn",
        required=True,
        help="Common Name (e.g. broker.snx.lan, d-0a1b2c3d, snx-api)",
    )
    parser.add_argument(
        "--principal-id", default=None, help="Principal ID for did:snx:<id> URI SAN"
    )
    parser.add_argument("--san-dns", nargs="*", default=None, help="SAN DNS names")
    parser.add_argument("--san-ip", nargs="*", default=None, help="SAN IP addresses")
    parser.add_argument("--hours", type=int, default=None, help="Validity in hours")
    parser.add_argument("--out-dir", required=True, help="Output directory")
    args = parser.parse_args()

    ca_dir = Path(args.ca_dir)
    ca_key_file = ca_dir / "intermediate-ca.key"
    ca_cert_file = ca_dir / "intermediate-ca.crt"
    chain_file = ca_dir / "ca-chain.pem"

    if not ca_key_file.exists() or not ca_cert_file.exists():
        raise FileNotFoundError(f"Intermediate CA files missing in {ca_dir}")

    ca_key = load_private_key(ca_key_file.read_bytes())
    ca_cert = load_certificate(ca_cert_file.read_bytes())

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Generate leaf key
    leaf_key = generate_p256_private_key()
    leaf_cert = issue_leaf_certificate(
        ca_key=ca_key,
        ca_cert=ca_cert,
        csr_or_pubkey=leaf_key.public_key(),
        kind=args.kind,
        common_name=args.cn,
        principal_id=args.principal_id,
        san_dns_names=args.san_dns,
        san_ips=args.san_ip,
        validity_hours=args.hours,
    )

    key_pem = private_key_to_pem(leaf_key)
    cert_pem = leaf_cert.public_bytes(serialization.Encoding.PEM)
    fp = compute_public_key_fingerprint(leaf_cert)

    key_path = out_dir / f"{args.cn}.key"
    cert_path = out_dir / f"{args.cn}.crt"

    key_path.write_bytes(key_pem)
    os.chmod(key_path, stat.S_IRUSR | stat.S_IWUSR)
    cert_path.write_bytes(cert_pem)

    if chain_file.exists():
        (out_dir / "ca-chain.pem").write_bytes(chain_file.read_bytes())

    print(f"[+] Certificate issued: {args.cn} (kind={args.kind})")
    print(f"    Cert: {cert_path}")
    print(f"    Key:  {key_path} (mode 0600)")
    print(f"    Fingerprint (SPKI SHA-256): {fp}")
    print(f"    Serial: {leaf_cert.serial_number:x}")


if __name__ == "__main__":
    main()
