"""Device Provisioning Module (Mode A - Provisioning bundle).

Generates:
  out/<device_id>/device.key (chmod 0600)
  out/<device_id>/device.crt
  out/<device_id>/ca-chain.pem
  out/<device_id>/config.json
"""

import json
import os
import secrets
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


def provision_device(
    label: str,
    ca_dir: str = "pki/intermediate",
    out_base_dir: str = "pki/out",
    broker_host: str = "broker.snx.lan",
    broker_port: int = 8883,
    publish_interval_s: int = 10,
    validity_hours: int | None = None,
) -> dict[str, str]:
    """Provisions a new device identity and writes the credential bundle."""
    ca_path = Path(ca_dir)
    ca_key_file = ca_path / "intermediate-ca.key"
    ca_cert_file = ca_path / "intermediate-ca.crt"
    chain_file = ca_path / "ca-chain.pem"

    if not ca_key_file.exists() or not ca_cert_file.exists():
        raise FileNotFoundError(f"Intermediate CA files missing in {ca_path}")

    ca_key = load_private_key(ca_key_file.read_bytes())
    ca_cert = load_certificate(ca_cert_file.read_bytes())

    # Generate 16 lowercase hex characters device_id = d-<hex>
    principal_id = secrets.token_hex(8)
    device_id = f"d-{principal_id}"

    # Generate ECC P-256 device key
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
    ca_chain_pem = (
        chain_file.read_bytes()
        if chain_file.exists()
        else ca_cert.public_bytes(serialization.Encoding.PEM)
    )
    fingerprint = compute_public_key_fingerprint(device_cert)

    # Write output files
    out_dir = Path(out_base_dir) / device_id
    out_dir.mkdir(parents=True, exist_ok=True)

    key_file = out_dir / "device.key"
    cert_file = out_dir / "device.crt"
    chain_out_file = out_dir / "ca-chain.pem"
    config_file = out_dir / "config.json"

    # Strict permissions 0600 on device.key
    key_file.write_bytes(device_key_pem)
    os.chmod(key_file, stat.S_IRUSR | stat.S_IWUSR)

    cert_file.write_bytes(device_cert_pem)
    chain_out_file.write_bytes(ca_chain_pem)

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

    return {
        "device_id": device_id,
        "principal_id": principal_id,
        "fingerprint": fingerprint,
        "bundle_dir": str(out_dir),
    }
