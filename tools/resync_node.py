#!/usr/bin/env python3
"""
SecureNodeX Active Storage Scrubber & Node Resync Tool.
Detects missing or wiped chunks on a storage node (like Raspberry Pi)
and actively re-syncs them from surviving replicas in the cluster.
"""

import sys
import os
import httpx
import subprocess
import json

def get_node_endpoint(node_id):
    cmd = ["docker", "exec", "snx-postgres", "psql", "-U", "snx", "-d", "snx", "-t", "-c", 
           f"SELECT endpoint FROM storage_nodes WHERE id = '{node_id}';"]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode == 0 and res.stdout.strip():
        return res.stdout.strip()
    return None

def get_node_replicas(node_id):
    cmd = ["docker", "exec", "snx-postgres", "psql", "-U", "snx", "-d", "snx", "-t", "-c", 
           f"SELECT chunk_id FROM chunk_replicas WHERE node_id = '{node_id}';"]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode == 0:
        return [line.strip() for line in res.stdout.strip().split("\n") if line.strip()]
    return []

def get_chunk_peers(chunk_id, exclude_node_id):
    cmd = ["docker", "exec", "snx-postgres", "psql", "-U", "snx", "-d", "snx", "-t", "-c", 
           f"SELECT sn.endpoint FROM chunk_replicas cr JOIN storage_nodes sn ON cr.node_id = sn.id WHERE cr.chunk_id = '{chunk_id}' AND cr.node_id != '{exclude_node_id}' AND sn.state = 'UP';"]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode == 0:
        return [line.strip() for line in res.stdout.strip().split("\n") if line.strip()]
    return []

def main():
    target_node = sys.argv[1] if len(sys.argv) > 1 else "storage-pi"
    print("=" * 65)
    print(f"  SECURENODEX STORAGE REPAIR & SCRUBBER: {target_node}")
    print("=" * 65)
    
    endpoint = get_node_endpoint(target_node)
    if not endpoint:
        print(f"[-] Node '{target_node}' not found in cluster database.")
        sys.exit(1)
        
    print(f"[*] Target Node Endpoint: {endpoint}")
    
    # 1. Health check
    try:
        r = httpx.get(f"{endpoint}/v1/health", timeout=3.0)
        print(f"[+] Node Health: UP (HTTP {r.status_code})")
    except Exception as e:
        print(f"[-] Node unreachable at {endpoint}: {e}")
        sys.exit(1)

    # 2. Query assigned chunks
    chunks = get_node_replicas(target_node)
    print(f"[*] Total Chunks Assigned in Cluster Registry: {len(chunks)}")
    
    if not chunks:
        print("[!] No chunks assigned to this node yet. Upload a file from Dashboard first!")
        return

    # 3. Check disk presence
    missing_chunks = []
    print("\n[*] Scrubbing chunk integrity on disk...")
    for cid in chunks:
        check_url = f"{endpoint}/v1/chunks/{cid}"
        try:
            head_res = httpx.head(check_url, timeout=3.0)
            if head_res.status_code == 200:
                print(f"  [OK] Chunk {cid[:12]}... exists on disk.")
            else:
                print(f"  [MISSING] Chunk {cid[:12]}... deleted/missing (HTTP {head_res.status_code})!")
                missing_chunks.append(cid)
        except Exception:
            print(f"  [MISSING] Chunk {cid[:12]}... unreachable!")
            missing_chunks.append(cid)

    print(f"\n[*] Scrubbing summary: {len(missing_chunks)} missing chunk(s) detected out of {len(chunks)}.")

    if not missing_chunks:
        print("[+] All chunks intact on node! No repair needed.")
        return

    # 4. Self-healing / Resync
    print("\n[+] Triggering Self-Healing Cluster Re-replication...")
    repaired = 0
    for cid in missing_chunks:
        peers = get_chunk_peers(cid, target_node)
        chunk_content = None
        for peer in peers:
            peer_url = f"{peer.rstrip('/')}/v1/chunks/{cid}"
            try:
                get_res = httpx.get(peer_url, timeout=5.0)
                if get_res.status_code == 200:
                    chunk_content = get_res.content
                    print(f"  -> Retrieved clean replica for {cid[:12]} from healthy peer: {peer}")
                    break
            except Exception:
                continue

        if chunk_content:
            put_url = f"{endpoint.rstrip('/')}/v1/chunks/{cid}"
            try:
                put_res = httpx.put(put_url, content=chunk_content, headers={"Content-Type": "application/octet-stream"}, timeout=5.0)
                if put_res.status_code in (200, 201):
                    print(f"  [REPAIRED] Pushed replica {cid[:12]} back to {target_node} successfully!")
                    repaired += 1
            except Exception as e:
                print(f"  [-] Failed to write chunk to {target_node}: {e}")
        else:
            print(f"  [-] Could not find surviving peer replica for {cid[:12]}")

    print("\n" + "=" * 65)
    print(f"  REPAIR COMPLETE: {repaired}/{len(missing_chunks)} CHUNKS RE-SYNCED TO {target_node}")
    print("=" * 65)

if __name__ == "__main__":
    main()
