"""Certificate renewal client module for SecureNodeX simulator.

Implements the automated renewal flow per docs/08 section 7 and docs/02 section 7:
1. Generates new P-256 keypair
2. Builds CSR with CN=device_id
3. Calls POST /v1/enroll/renew with proof of possession
4. Atomically replaces device key and certificate on disk
"""

import json
import os
import stat
from pathlib import Path
from typing import Any

import httpx
from cryptography.hazmat.primitives import serialization

from pki.ca_core import (
    compute_public_key_fingerprint,
    create_csr,
    generate_p256_private_key,
    load_certificate,
    private_key_to_pem,
)


async def renew_device_cert(
    device_dir: str | Path,
    api_base_url: str = "http://localhost:8443",
    auth_token: str | None = None,
    client: httpx.AsyncClient | None = None,
) -> dict[str, Any]:
    """Execute certificate renewal workflow for a provisioned device."""
    dev_path = Path(device_dir)
    key_file = dev_path / "device.key"
    cert_file = dev_path / "device.crt"
    config_file = dev_path / "config.json"

    if not key_file.exists() or not cert_file.exists() or not config_file.exists():
        raise FileNotFoundError(f"Device credentials missing in {dev_path}")

    old_cert_bytes = cert_file.read_bytes()
    config_data = json.loads(config_file.read_text(encoding="utf-8"))

    device_id = config_data["device_id"]
    old_cert = load_certificate(old_cert_bytes)
    old_fingerprint = compute_public_key_fingerprint(old_cert)

    # 1. Generate new P-256 private key and CSR
    new_private_key = generate_p256_private_key()
    new_csr = create_csr(
        private_key=new_private_key,
        common_name=device_id,
        kind="device",
    )
    new_csr_pem = new_csr.public_bytes(serialization.Encoding.PEM).decode("utf-8")
    new_key_pem = private_key_to_pem(new_private_key)

    # 2. Call API /v1/enroll/renew
    url = f"{api_base_url.rstrip('/')}/v1/enroll/renew"
    headers = {"Content-Type": "application/json"}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    req_body = {"csr_pem": new_csr_pem}

    async def _do_post(c: httpx.AsyncClient) -> httpx.Response:
        return await c.post(url, json=req_body, headers=headers, timeout=10.0)

    if client:
        res = await _do_post(client)
    else:
        async with httpx.AsyncClient(verify=False) as c:
            res = await _do_post(c)

    if res.status_code != 200:
        raise RuntimeError(f"Renewal failed with status {res.status_code}: {res.text}")

    resp_data = res.json()
    new_cert_pem = resp_data["certificate_pem"].encode("utf-8")
    new_fingerprint = resp_data["fingerprint"]

    # 3. Atomically write new credentials to disk
    tmp_key_file = dev_path / "device.key.tmp"
    tmp_cert_file = dev_path / "device.crt.tmp"

    tmp_key_file.write_bytes(new_key_pem)
    os.chmod(tmp_key_file, stat.S_IRUSR | stat.S_IWUSR)
    tmp_cert_file.write_bytes(new_cert_pem)

    # Swap files
    os.replace(tmp_key_file, key_file)
    os.replace(tmp_cert_file, cert_file)

    # Update config.json
    config_data["cert_fingerprint"] = new_fingerprint
    config_file.write_text(json.dumps(config_data, indent=2), encoding="utf-8")

    return {
        "device_id": device_id,
        "old_fingerprint": old_fingerprint,
        "new_fingerprint": new_fingerprint,
        "new_certificate_pem": resp_data["certificate_pem"],
        "new_chain_pem": resp_data.get("chain_pem"),
    }
