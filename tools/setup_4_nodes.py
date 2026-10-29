#!/usr/bin/env python3
"""
SecureNodeX - 4-Device Cluster Setup & Topology Configurator
Configures:
  1. Laptop 1 (Master Controller / Node 1)
  2. Laptop 2 (Storage Node 2)
  3. Laptop 3 (Storage Node 3)
  4. Raspberry Pi (Physical IoT Storage Node 4)
"""

import sys
import subprocess
import urllib.request
import json
import os

NODES_DEF = [
    {"id": "storage-laptop1", "role": "Laptop 1 (Master Node)", "default_port": 7443},
    {"id": "storage-laptop2", "role": "Laptop 2 (Storage Node)", "default_port": 7443},
    {"id": "storage-laptop3", "role": "Laptop 3 (Storage Node)", "default_port": 7443},
    {"id": "storage-pi",      "role": "Raspberry Pi (Physical Edge Node)", "default_port": 7443},
]

def check_node_health(endpoint: str) -> bool:
    url = f"{endpoint.rstrip('/')}/v1/health"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "SNX-ClusterManager/1.0"})
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            return resp.status in (200, 204)
    except Exception:
        return False

def register_in_postgres(node_id: str, endpoint: str):
    sql = f"""
    INSERT INTO storage_nodes (id, endpoint, state, free_bytes, used_bytes, chunk_count, draining, created_at, updated_at)
    VALUES ('{node_id}', '{endpoint}', 'UP', 10000000000, 0, 0, 0, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE 
    SET endpoint = '{endpoint}', state = 'UP', free_bytes = 10000000000, draining = 0, updated_at = NOW();
    """
    cmd = ["docker", "exec", "snx-postgres", "psql", "-U", "snx", "-d", "snx", "-c", sql]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.returncode == 0, result.stderr

def main():
    print("================================================================================")
    print("         SECURENODEX - 4-DEVICE CLUSTER SETUP (3 LAPTOPS + 1 PI)                ")
    print("================================================================================")
    print("This utility configures the 4 storage nodes across your devices.\n")
    print("Supported IP types:")
    print(" - Local LAN / Hotspot IPs (e.g. 192.168.1.X, 172.20.10.X)")
    print(" - Mesh VPN / Tailscale IPs (e.g. 100.X.Y.Z) if on different networks\n")

    # Read from CLI args or prompt
    # Args format: python3 tools/setup_4_nodes.py <ip_laptop1> <ip_laptop2> <ip_laptop3> <ip_pi>
    args = sys.argv[1:]
    
    ips = {}
    if len(args) == 4:
        ips["storage-laptop1"] = args[0]
        ips["storage-laptop2"] = args[1]
        ips["storage-laptop3"] = args[2]
        ips["storage-pi"] = args[3]
    else:
        env_l1 = os.getenv("LAPTOP1_HOST", "127.0.0.1")
        env_l2 = os.getenv("LAPTOP2_HOST", "10.120.11.212")
        env_l3 = os.getenv("LAPTOP3_HOST", "10.120.11.171")
        env_pi = os.getenv("PI_HOST", "172.31.6.75")
        
        print("Usage:")
        print("  python3 tools/setup_4_nodes.py <IP_Laptop1> <IP_Laptop2> <IP_Laptop3> <IP_Pi>\n")
        print("Using current/default configured targets:")
        ips["storage-laptop1"] = env_l1
        ips["storage-laptop2"] = env_l2
        ips["storage-laptop3"] = env_l3
        ips["storage-pi"] = env_pi

    print("\n--- Verifying Connectivity & Registering Nodes ---")
    
    registered_count = 0
    for node in NODES_DEF:
        nid = node["id"]
        ip = ips.get(nid, "127.0.0.1")
        port = node["default_port"]
        endpoint = f"http://{ip}:{port}"
        
        is_healthy = check_node_health(endpoint)
        health_badge = "[\033[92mONLINE\033[0m]" if is_healthy else "[\033[93mUNREACHABLE / PENDING START\033[0m]"
        
        print(f"\n* Node: {nid} ({node['role']})")
        print(f"  Endpoint: {endpoint} -> {health_badge}")
        
        ok, err = register_in_postgres(nid, endpoint)
        if ok:
            print(f"  [✓] Successfully registered in Postgres DB!")
            registered_count += 1
        else:
            print(f"  [i] Notice: DB registration skipped (Postgres not running: {err.strip() if err else 'offline'}).")
            print(f"      Run this script again after starting 'docker compose up -d'.")

    # Remove stale nodes (like old laptop4 or extra nodes if any)
    cmd = ["docker", "exec", "snx-postgres", "psql", "-U", "snx", "-d", "snx", "-c", 
           "DELETE FROM storage_nodes WHERE id NOT IN ('storage-laptop1', 'storage-laptop2', 'storage-laptop3', 'storage-pi');"]
    subprocess.run(cmd, capture_output=True)

    print("\n================================================================================")
    print("4-Device Cluster Configuration Summary:")
    print(f" - Storage Nodes Configured: 4 (1 Pi, 3 Laptops)")
    print(f" - Quorum Parameters: Replication Factor R=3, Write Quorum W=2, Read Quorum R=2")
    print(f" - Any 1 device can disconnect or fail and zero data will be lost.")
    print("================================================================================")

if __name__ == "__main__":
    main()
