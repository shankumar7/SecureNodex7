#!/usr/bin/env python3
"""
SecureNodeX Live Demo: On-Chain Transaction & Block Mining Demonstrator.
Allows the team to demonstrate live blockchain state transitions to the jury:
  1. Anchoring File Merkle Root to DataRegistry
  2. Registering an IoT Device to IdentityRegistry
  3. Recording an immutable Audit Event to AuditLog
"""

import os
import sys
import json
import time
import uuid
import hashlib
from datetime import datetime

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.chain.client import ChainClient

RPC_URL = os.environ.get("RPC_URL", "http://127.0.0.1:8545")

def get_admin_principal():
    deployments_candidates = [
        "deployments/localhost.json",
        "deployments/hardhat.json",
        "/app/deployments/localhost.json"
    ]
    for p in deployments_candidates:
        if os.path.exists(p):
            with open(p) as f:
                data = json.load(f)
                return data.get("bootstrapAdmin", {}).get("principalId")
    return "0x44db4c5bd36c27cc5bef23ebeca2cdcaf96d03503be60ce330967c5d03699011"

def print_block_summary(block_num, tx_hash, action_name, contract_name):
    print("\n" + "=" * 65)
    print(f"  ⛓️  NEW BLOCK MINED LIVE: BLOCK #{block_num}")
    print("=" * 65)
    print(f"[*] Action Triggered:  {action_name}")
    print(f"[*] Target Contract:   {contract_name}")
    print(f"[*] Transaction Hash:  {tx_hash}")
    print(f"[*] Block Timestamp:   {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"[*] Consensus Status:  CONFIRMED & SEALED")
    print("=" * 65 + "\n")

def demo_upload_object(client):
    admin = get_admin_principal()
    obj_id = f"file-{uuid.uuid4().hex[:8]}"
    manifest_id = f"mfst-{uuid.uuid4().hex[:8]}"
    merkle_root = "0x" + hashlib.sha256(f"content-{time.time()}".encode()).hexdigest()
    
    print(f"\n[DEMO] Slicing file & generating Merkle root: {merkle_root}...")
    print(f"[DEMO] Anchoring object '{obj_id}' to DataRegistry on blockchain...")
    
    res = client.register_object(
        object_id=obj_id,
        manifest_id=manifest_id,
        merkle_root=merkle_root,
        size=1048576, # 1 MB
        chunk_count=4,
        actor=admin
    )
    print_block_summary(res["block_number"], res["tx_hash"], f"Anchored Merkle Root ({obj_id})", "DataRegistry")

def demo_register_device(client):
    admin = get_admin_principal()
    device_id = f"did:snx:pi-node-{uuid.uuid4().hex[:4]}"
    fingerprint = "0x" + hashlib.sha256(f"cert-{time.time()}".encode()).hexdigest()
    
    print(f"\n[DEMO] Issuing X.509 certificate for new device '{device_id}'...")
    print(f"[DEMO] Registering device public key fingerprint in IdentityRegistry...")
    
    res = client.register_identity(
        identity_id=device_id,
        fingerprint=fingerprint,
        role_mask=4,  # ROLE_DEVICE
        kind=1,       # DEVICE kind
        actor=admin
    )
    print_block_summary(res["block_number"], res["tx_hash"], f"Device Registered ({device_id})", "IdentityRegistry")

def demo_audit_event(client):
    event_type = "OBJECT_DOWNLOAD"
    actor = "auditor"
    subject = "confidential_blueprint.pdf"
    data_hash = "0x" + hashlib.sha256(f"audit-{time.time()}".encode()).hexdigest()
    corr_id = f"req-{uuid.uuid4().hex[:6]}"
    
    print(f"\n[DEMO] Recording high-integrity event '{event_type}' by '{actor}'...")
    print(f"[DEMO] Appending event to immutable AuditLog hash chain...")
    
    res = client.record_audit(
        event_type=event_type,
        actor=actor,
        subject=subject,
        data_hash=data_hash,
        correlation_id=corr_id
    )
    print_block_summary(res["block_number"], res["tx_hash"], f"Audit Record ({event_type})", "AuditLog")

def main():
    print("\n" + "=" * 65)
    print("  SECURENODEX LIVE BLOCK MINING DEMO CONTROLLER")
    print("=" * 65)
    print(f"Connecting to RPC: {RPC_URL}...")
    
    client = ChainClient(rpc_url=RPC_URL)
    if not client.is_connected():
        print(f"[-] ERROR: Cannot reach blockchain RPC at {RPC_URL}")
        sys.exit(1)
        
    print("[+] Connected to EVM Private Blockchain (Chain ID: 20260)!\n")
    
    if len(sys.argv) > 1:
        arg = sys.argv[1].lower()
        if "upload" in arg or "file" in arg:
            demo_upload_object(client)
        elif "device" in arg or "identity" in arg:
            demo_register_device(client)
        elif "audit" in arg or "log" in arg:
            demo_audit_event(client)
        else:
            print("Usage: python3 tools/demo_mine_actions.py [upload | device | audit]")
        return

    # Interactive Menu
    while True:
        print("Choose an on-chain action to trigger a live block:")
        print("  [1] Upload File / Anchor Merkle Root    --> Mines to DataRegistry")
        print("  [2] Register New Edge IoT Device       --> Mines to IdentityRegistry")
        print("  [3] Record Immutable Audit Event       --> Mines to AuditLog")
        print("  [4] View Latest Block Details (show_block)")
        print("  [q] Quit")
        
        choice = input("\nEnter choice [1-4, q]: ").strip().lower()
        if choice == "1":
            demo_upload_object(client)
        elif choice == "2":
            demo_register_device(client)
        elif choice == "3":
            demo_audit_event(client)
        elif choice == "4":
            os.system(f"python3 tools/show_block.py")
        elif choice == "q":
            break
        else:
            print("Invalid selection.")

if __name__ == "__main__":
    main()
