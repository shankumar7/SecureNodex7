#!/usr/bin/env python3
"""Verify a SecureNodeX message envelope against a public key or certificate."""

import argparse
import json
import sys
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

from backend.app.message_core import verify_device_message


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify a SecureNodeX device message envelope")
    parser.add_argument(
        "--key-or-cert", required=True, help="Path to Public Key PEM or Certificate PEM"
    )
    parser.add_argument(
        "--envelope-file", help="Path to envelope JSON file (reads stdin if omitted)"
    )
    args = parser.parse_args()

    pem_bytes = Path(args.key_or_cert).read_bytes()

    pub_key: object
    try:
        cert = x509.load_pem_x509_certificate(pem_bytes, default_backend())
        pub_key = cert.public_key()
    except Exception:
        pub_key = serialization.load_pem_public_key(pem_bytes, default_backend())

    if not isinstance(pub_key, ec.EllipticCurvePublicKey):
        print("[!] Error: Public key is not ECC NIST P-256", file=sys.stderr)
        sys.exit(1)

    if args.envelope_file:
        envelope = json.loads(Path(args.envelope_file).read_text(encoding="utf-8"))
    else:
        envelope = json.load(sys.stdin)

    if verify_device_message(pub_key, envelope):
        print("[+] Signature VERIFIED: valid SecureNodeX envelope")
        sys.exit(0)
    else:
        print("[!] Signature REJECTED: invalid signature or malformed envelope", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
