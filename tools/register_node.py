#!/usr/bin/env python3
"""Register or update an external storage node (Laptop or Raspberry Pi) in the cluster."""

import sys
import subprocess

def main():
    if len(sys.argv) < 3:
        print("Usage: python3 tools/register_node.py <node_id> <ip_address> [port]")
        print("Example: python3 tools/register_node.py storage-laptop2 10.120.11.55 7443")
        sys.exit(1)

    node_id = sys.argv[1]
    ip = sys.argv[2]
    port = sys.argv[3] if len(sys.argv) > 3 else "7443"
    endpoint = f"http://{ip}:{port}"

    sql = f"""
    INSERT INTO storage_nodes (id, endpoint, state, free_bytes, used_bytes, chunk_count, draining, created_at, updated_at)
    VALUES ('{node_id}', '{endpoint}', 'UP', 10000000000, 0, 0, 0, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE 
    SET endpoint = '{endpoint}', state = 'UP', free_bytes = 10000000000, draining = 0, updated_at = NOW();
    """

    cmd = ["docker", "exec", "snx-postgres", "psql", "-U", "snx", "-d", "snx", "-c", sql]
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode == 0:
        print(f"[+] Successfully registered '{node_id}' at {endpoint}!")
        subprocess.run(["docker", "exec", "snx-postgres", "psql", "-U", "snx", "-d", "snx", "-c", "SELECT id, endpoint, state FROM storage_nodes;"])
    else:
        print(f"[-] Error registering node: {result.stderr}")

if __name__ == "__main__":
    main()
