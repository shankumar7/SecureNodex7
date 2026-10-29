#!/usr/bin/env python3
"""Format and display blockchain blocks in human-readable format for presentations."""

import json
import urllib.request
from datetime import datetime

RPC_URL = "http://localhost:8545"

# Load deployed contract names
try:
    with open("deployments/localhost.json") as f:
        deployments = json.load(f)
        contracts = {v.lower(): k for k, v in deployments.get("contracts", {}).items()}
except Exception:
    contracts = {}

def rpc_call(method, params=[]):
    data = json.dumps({"jsonrpc": "2.0", "method": method, "params": params, "id": 1}).encode()
    req = urllib.request.Request(RPC_URL, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())["result"]

def main():
    print("=" * 70)
    print("  SECURENODEX PRIVATE BLOCKCHAIN (Chain ID: 20260) - LIVE STATUS")
    print("=" * 70)

    # 1. Block number
    latest_hex = rpc_call("eth_blockNumber")
    latest_num = int(latest_hex, 16)
    print(f"[*] Current Block Height: Block #{latest_num} (Hex: {latest_hex})")

    # 2. Get latest block details
    block = rpc_call("eth_getBlockByNumber", [latest_hex, True])
    block_hash = block["hash"]
    parent_hash = block["parentHash"]
    ts = int(block["timestamp"], 16)
    dt = datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M:%S")
    tx_count = len(block.get("transactions", []))

    print(f"[*] Block Timestamp:    {dt}")
    print(f"[*] Current Block Hash: {block_hash}")
    print(f"[*] Parent Block Hash:  {parent_hash} (Chained to Block #{latest_num - 1})")
    print(f"[*] Transactions Count: {tx_count}")
    print("-" * 70)

    if tx_count > 0:
        print("  TRANSACTIONS IN THIS BLOCK:")
        for i, tx in enumerate(block["transactions"]):
            to_addr = tx.get("to", "").lower()
            contract_name = contracts.get(to_addr, "Smart Contract")
            chain_id = int(tx.get("chainId", "0x0"), 16)
            
            print(f"\n  [Tx #{i+1}] Hash: {tx['hash']}")
            print(f"    - From (Sender):    {tx.get('from')}")
            print(f"    - To (Contract):    {tx.get('to')} [{contract_name}]")
            print(f"    - Chain ID:         {chain_id} (0x{chain_id:x})")
            print(f"    - Gas Used / Limit: {int(tx.get('gas', '0x0'), 16):,}")
            print("    - ECC Signature (ECDSA secp256k1):")
            print(f"        r: {tx.get('r')}")
            print(f"        s: {tx.get('s')}")
            print(f"        v: {tx.get('v')}")
    else:
        print("  (Empty block / consensus heartbeat)")
    print("=" * 70)

if __name__ == "__main__":
    main()
