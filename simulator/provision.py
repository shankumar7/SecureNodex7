"""Batch provisioning module for SecureNodeX virtual device simulator.

Generates N device identities, ECC P-256 keypairs, and leaf certificates
signed by the intermediate CA, saving bundles into simulator/devices/d-<id>/.
"""

import json
import os
import secrets
import stat
from pathlib import Path
from typing import Any

from cryptography.hazmat.primitives import serialization

from pki.ca_core import (
    compute_public_key_fingerprint,
    create_intermediate_ca,
    create_root_ca,
    generate_p256_private_key,
    issue_leaf_certificate,
    load_certificate,
    load_private_key,
    private_key_to_pem,
)


def ensure_ca_credentials(ca_dir: str | Path = "pki/intermediate") -> tuple[bytes, bytes, bytes]:
    """Ensure CA credentials exist, creating ephemeral in-memory/disk test CA if absent."""
    ca_path = Path(ca_dir)
    ca_key_file = ca_path / "intermediate-ca.key"
    ca_cert_file = ca_path / "intermediate-ca.crt"
    chain_file = ca_path / "ca-chain.pem"

    if ca_key_file.exists() and ca_cert_file.exists():
        ca_key_bytes = ca_key_file.read_bytes()
        ca_cert_bytes = ca_cert_file.read_bytes()
        chain_bytes = chain_file.read_bytes() if chain_file.exists() else ca_cert_bytes
        return ca_key_bytes, ca_cert_bytes, chain_bytes

    # Generate ephemeral root & intermediate
    root_key, root_cert = create_root_ca(common_name="SecureNodeX Root CA")
    inter_key, inter_cert = create_intermediate_ca(root_key, root_cert, common_name="SecureNodeX Intermediate CA")

    ca_key_bytes = private_key_to_pem(inter_key)
    ca_cert_bytes = inter_cert.public_bytes(serialization.Encoding.PEM)
    chain_bytes = ca_cert_bytes + root_cert.public_bytes(serialization.Encoding.PEM)
    return ca_key_bytes, ca_cert_bytes, chain_bytes


def batch_provision_devices(
    count: int = 10,
    out_dir: str | Path = "simulator/devices",
    label_prefix: str = "sim-device",
    ca_dir: str | Path = "pki/intermediate",
    broker_host: str = "broker.snx.lan",
    broker_port: int = 8883,
    publish_interval_s: int = 10,
    validity_hours: int | None = None,
) -> list[dict[str, Any]]:
    """Batch provision N virtual device identities with distinct P-256 keys and certs."""
    ca_key_bytes, ca_cert_bytes, ca_chain_bytes = ensure_ca_credentials(ca_dir)
    ca_key = load_private_key(ca_key_bytes)
    ca_cert = load_certificate(ca_cert_bytes)

    out_base = Path(out_dir)
    out_base.mkdir(parents=True, exist_ok=True)

    provisioned: list[dict[str, Any]] = []

    for i in range(1, count + 1):
        principal_id = secrets.token_hex(8)
        device_id = f"d-{principal_id}"
        label = f"{label_prefix}-{i:04d}"

        # Generate ECC P-256 private key
        device_key = generate_p256_private_key()
        device_cert = issue_leaf_certificate(
            ca_key=ca_key,
            ca_cert=ca_cert,
            csr_or_pubkey=device_key.public_key(),
            kind="device",
            common_name=device_id,
            principal_id=principal_id,
            validity_hours=validity_hours,
        )

        device_key_pem = private_key_to_pem(device_key)
        device_cert_pem = device_cert.public_bytes(serialization.Encoding.PEM)
        fingerprint = compute_public_key_fingerprint(device_cert)

        # Output folder per device
        dev_dir = out_base / device_id
        dev_dir.mkdir(parents=True, exist_ok=True)

        key_file = dev_dir / "device.key"
        cert_file = dev_dir / "device.crt"
        chain_file = dev_dir / "ca-chain.pem"
        config_file = dev_dir / "config.json"

        # Write key with 0600 permissions
        key_file.write_bytes(device_key_pem)
        os.chmod(key_file, stat.S_IRUSR | stat.S_IWUSR)

        cert_file.write_bytes(device_cert_pem)
        chain_file.write_bytes(ca_chain_bytes)

        config_data = {
            "device_id": device_id,
            "principal_id": principal_id,
            "label": label,
            "broker_host": broker_host,
            "broker_port": broker_port,
            "publish_interval_s": publish_interval_s,
            "cert_fingerprint": fingerprint,
        }
        config_file.write_text(json.dumps(config_data, indent=2), encoding="utf-8")

        provisioned.append({
            "device_id": device_id,
            "principal_id": principal_id,
            "label": label,
            "fingerprint": fingerprint,
            "bundle_dir": str(dev_dir),
            "key_file": str(key_file),
            "cert_file": str(cert_file),
            "chain_file": str(chain_file),
            "config_file": str(config_file),
            "private_key": device_key,
            "certificate": device_cert,
        })

    return provisioned
