#!/usr/bin/env python3
"""Generate SecureNodeX Offline Root CA (ECC NIST P-256).

Outputs:
  pki/root/root-ca.key (chmod 600)
  pki/root/root-ca.crt
"""

import argparse
import os
import stat
from pathlib import Path

from pki.ca_core import create_root_ca, private_key_to_pem


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate SecureNodeX Root CA")
    parser.add_argument("--out-dir", default="pki/root", help="Output directory for Root CA")
    parser.add_argument("--cn", default="SecureNodeX Root CA", help="Common Name")
    parser.add_argument(
        "--days", type=int, default=3650, help="Validity in days (default: 3650 / 10y)"
    )
    args = parser.parse_args()

    out_path = Path(args.out_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    key_file = out_path / "root-ca.key"
    cert_file = out_path / "root-ca.crt"

    print(f"[*] Generating ECC P-256 Root CA: {args.cn} ({args.days} days)...")
    key, cert = create_root_ca(common_name=args.cn, validity_days=args.days)

    key_pem = private_key_to_pem(key)
    from cryptography.hazmat.primitives import serialization

    cert_pem = cert.public_bytes(serialization.Encoding.PEM)

    # Write key with strict 0600 permissions
    key_file.write_bytes(key_pem)
    os.chmod(key_file, stat.S_IRUSR | stat.S_IWUSR)

    cert_file.write_bytes(cert_pem)

    print(f"[+] Root CA key saved to: {key_file} (mode 0600)")
    print(f"[+] Root CA cert saved to: {cert_file}")
    print(f"[+] Root Serial: {cert.serial_number:x}")


if __name__ == "__main__":
    main()
