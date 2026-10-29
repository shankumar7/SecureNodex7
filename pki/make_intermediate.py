#!/usr/bin/env python3
"""Generate SecureNodeX Online Intermediate CA (ECC NIST P-256).

Outputs:
  pki/intermediate/intermediate-ca.key (chmod 600)
  pki/intermediate/intermediate-ca.crt
  pki/intermediate/ca-chain.pem (Intermediate + Root)
"""

import argparse
import os
import stat
from pathlib import Path

from cryptography.hazmat.primitives import serialization

from pki.ca_core import (
    create_intermediate_ca,
    load_certificate,
    load_private_key,
    private_key_to_pem,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate SecureNodeX Intermediate CA")
    parser.add_argument("--root-dir", default="pki/root", help="Root CA directory")
    parser.add_argument(
        "--out-dir", default="pki/intermediate", help="Output directory for Intermediate CA"
    )
    parser.add_argument("--cn", default="SecureNodeX Intermediate CA", help="Common Name")
    parser.add_argument(
        "--days", type=int, default=365, help="Validity in days (default: 365 / 1y)"
    )
    args = parser.parse_args()

    root_path = Path(args.root_dir)
    root_key_file = root_path / "root-ca.key"
    root_cert_file = root_path / "root-ca.crt"

    if not root_key_file.exists() or not root_cert_file.exists():
        raise FileNotFoundError(f"Root CA files missing in {root_path}. Run make_root.py first.")

    out_path = Path(args.out_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    key_file = out_path / "intermediate-ca.key"
    cert_file = out_path / "intermediate-ca.crt"
    chain_file = out_path / "ca-chain.pem"

    root_key = load_private_key(root_key_file.read_bytes())
    root_cert = load_certificate(root_cert_file.read_bytes())

    print(f"[*] Generating ECC P-256 Intermediate CA: {args.cn} ({args.days} days)...")
    inter_key, inter_cert = create_intermediate_ca(
        root_key=root_key,
        root_cert=root_cert,
        common_name=args.cn,
        validity_days=args.days,
    )

    inter_key_pem = private_key_to_pem(inter_key)
    inter_cert_pem = inter_cert.public_bytes(serialization.Encoding.PEM)
    root_cert_pem = root_cert.public_bytes(serialization.Encoding.PEM)
    chain_pem = inter_cert_pem + b"\n" + root_cert_pem

    # Write key with strict 0600 permissions
    key_file.write_bytes(inter_key_pem)
    os.chmod(key_file, stat.S_IRUSR | stat.S_IWUSR)

    cert_file.write_bytes(inter_cert_pem)
    chain_file.write_bytes(chain_pem)

    print(f"[+] Intermediate CA key saved to: {key_file} (mode 0600)")
    print(f"[+] Intermediate CA cert saved to: {cert_file}")
    print(f"[+] CA Chain saved to: {chain_file}")
    print(f"[+] Intermediate Serial: {inter_cert.serial_number:x}")


if __name__ == "__main__":
    main()
