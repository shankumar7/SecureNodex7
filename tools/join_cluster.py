#!/usr/bin/env python3
"""
SecureNodeX - Node Join Cluster Client
Allows Laptop 2, Laptop 3, or the Raspberry Pi to connect to the Laptop 1 Commander.
Commander automatically detects this machine's IP address.

Usage:
  python3 tools/join_cluster.py [commander_url] [node_id] [storage_port]

Examples:
  python3 tools/join_cluster.py http://10.87.198.70:8443 storage-laptop2
  python3 tools/join_cluster.py http://10.87.198.70:8443 storage-laptop3
  python3 tools/join_cluster.py http://10.87.198.70:8443 storage-pi
"""

import sys
import json
import urllib.request
import urllib.error

def main():
    print("================================================================================")
    print("                SECURENODEX - NODE AUTO-JOIN CLIENT                             ")
    print("================================================================================")

    commander_url = sys.argv[1] if len(sys.argv) > 1 else "http://10.87.198.70:8443"
    node_id = sys.argv[2] if len(sys.argv) > 2 else "storage-laptop2"
    port = int(sys.argv[3]) if len(sys.argv) > 3 else 7443

    commander_url = commander_url.rstrip("/")
    join_endpoint = f"{commander_url}/v1/storage/nodes/join"

    payload = {
        "node_id": node_id,
        "port": port,
        "capacity": 32 * 1024 * 1024 * 1024
    }

    print(f"[*] Contacting Commander at: {commander_url}")
    print(f"[*] Announcing Node ID: '{node_id}' on port {port}...")

    req = urllib.request.Request(
        join_endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "User-Agent": f"SNX-JoinClient/{node_id}"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=5.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print("\n[+] SUCCESS! Registered with Commander:")
            print(f"    - Status: {data.get('status')}")
            print(f"    - Node ID: {data.get('node_id')}")
            print(f"    - Endpoint: {data.get('endpoint')}")
            print(f"    - Detected IP: {data.get('detected_ip')}")
            print("\n[✓] This device is now an active member of the SecureNodeX storage cluster!")
    except urllib.error.URLError as e:
        print(f"\n[-] Failed to connect to Commander at {commander_url}: {e}")
        print("    Please verify:")
        print("    1. Laptop 1 is running and reachable on your network.")
        print(f"    2. Try pinging {commander_url.split('://')[-1].split(':')[0]}.")
        sys.exit(1)

if __name__ == "__main__":
    main()
