#!/usr/bin/env python3
"""Generate X.509 Certificate Revocation List (CRL) for Mosquitto and services."""

import argparse
import datetime
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives import serialization

from pki.ca_core import (
    create_crl,
    load_certificate,
    load_private_key,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate CRL from revoked serials list")
    parser.add_argument("--ca-dir", default="pki/intermediate", help="Intermediate CA directory")
    parser.add_argument("--out", default="pki/intermediate/crl.pem", help="Output CRL PEM file")
    parser.add_argument(
        "--revoke-serial",
        nargs="*",
        type=lambda x: int(x, 16),
        default=[],
        help="Serial numbers in hex to revoke",
    )
    args = parser.parse_args()

    ca_dir = Path(args.ca_dir)
    ca_key = load_private_key((ca_dir / "intermediate-ca.key").read_bytes())
    ca_cert = load_certificate((ca_dir / "intermediate-ca.crt").read_bytes())

    revoked_list = [
        (s, datetime.datetime.now(datetime.timezone.utc), x509.ReasonFlags.key_compromise)
        for s in args.revoke_serial
    ]

    crl = create_crl(ca_key, ca_cert, revoked_list)
    out_file = Path(args.out)
    out_file.parent.mkdir(parents=True, exist_ok=True)
    out_file.write_bytes(crl.public_bytes(serialization.Encoding.PEM))

    print(f"[+] CRL generated with {len(revoked_list)} revoked certificates.")
    print(f"[+] CRL written to: {out_file}")


if __name__ == "__main__":
    main()
