#!/usr/bin/env python3
"""Initialize the full SecureNodeX PKI hierarchy and broker certificates."""

import os
import stat
from pathlib import Path

from cryptography.hazmat.primitives import serialization

from broker.acl_gen import write_acl_file
from pki.ca_core import (
    create_crl,
    create_intermediate_ca,
    create_root_ca,
    generate_p256_private_key,
    issue_leaf_certificate,
    private_key_to_pem,
)


def init_pki() -> None:
    root_dir = Path("pki/root")
    inter_dir = Path("pki/intermediate")
    broker_secrets_dir = Path("secrets/broker")

    root_dir.mkdir(parents=True, exist_ok=True)
    inter_dir.mkdir(parents=True, exist_ok=True)
    broker_secrets_dir.mkdir(parents=True, exist_ok=True)

    print("[1/5] Generating Offline Root CA (10 years)...")
    r_key, r_cert = create_root_ca()
    r_key_file = root_dir / "root-ca.key"
    r_cert_file = root_dir / "root-ca.crt"
    r_key_file.write_bytes(private_key_to_pem(r_key))
    os.chmod(r_key_file, stat.S_IRUSR | stat.S_IWUSR)
    r_cert_file.write_bytes(r_cert.public_bytes(serialization.Encoding.PEM))

    print("[2/5] Generating Online Intermediate CA (1 year)...")
    i_key, i_cert = create_intermediate_ca(r_key, r_cert)
    i_key_file = inter_dir / "intermediate-ca.key"
    i_cert_file = inter_dir / "intermediate-ca.crt"
    chain_file = inter_dir / "ca-chain.pem"

    i_key_file.write_bytes(private_key_to_pem(i_key))
    os.chmod(i_key_file, stat.S_IRUSR | stat.S_IWUSR)
    i_cert_pem = i_cert.public_bytes(serialization.Encoding.PEM)
    r_cert_pem = r_cert.public_bytes(serialization.Encoding.PEM)
    chain_pem = i_cert_pem + b"\n" + r_cert_pem

    i_cert_file.write_bytes(i_cert_pem)
    chain_file.write_bytes(chain_pem)

    print("[3/5] Issuing Broker Certificate (SAN: broker.snx.lan, localhost, 127.0.0.1)...")
    broker_key = generate_p256_private_key()
    broker_cert = issue_leaf_certificate(
        ca_key=i_key,
        ca_cert=i_cert,
        csr_or_pubkey=broker_key.public_key(),
        kind="broker",
        common_name="broker.snx.lan",
        san_dns_names=["broker.snx.lan", "broker", "localhost"],
        san_ips=["127.0.0.1"],
        validity_hours=2160,
    )

    b_key_file = broker_secrets_dir / "broker.key"
    b_cert_file = broker_secrets_dir / "broker.crt"
    b_chain_file = broker_secrets_dir / "ca-chain.pem"

    b_key_file.write_bytes(private_key_to_pem(broker_key))
    os.chmod(b_key_file, stat.S_IRUSR | stat.S_IWUSR)
    b_cert_file.write_bytes(broker_cert.public_bytes(serialization.Encoding.PEM))
    b_chain_file.write_bytes(chain_pem)

    print("[4/5] Generating Initial CRL...")
    crl = create_crl(i_key, i_cert, [])
    crl_pem = crl.public_bytes(serialization.Encoding.PEM)
    (inter_dir / "crl.pem").write_bytes(crl_pem)
    (broker_secrets_dir / "crl.pem").write_bytes(crl_pem)

    print("[5/5] Generating Broker ACL...")
    write_acl_file(broker_secrets_dir / "acl.conf", active_device_ids=[])

    print("[+] PKI Initialization complete!")


if __name__ == "__main__":
    init_pki()
