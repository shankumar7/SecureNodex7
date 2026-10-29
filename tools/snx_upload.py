#!/usr/bin/env python3
"""SecureNodeX CLI Upload Tool.

Uploads a file to SecureNodeX decentralized storage and displays an ASCII placement table.
"""

import argparse
import os
import sys
import httpx
from tabulate import tabulate


def main() -> None:
    parser = argparse.ArgumentParser(description="Upload a file to SecureNodeX decentralized storage")
    parser.add_argument("file", help="Path to file to upload")
    parser.add_argument("--api-url", default=os.getenv("SNX_API_URL", "http://localhost:8443"), help="Base API URL")
    parser.add_argument("--token", default=os.getenv("SNX_TOKEN"), help="Bearer JWT token")
    parser.add_argument("--classification", default="internal", choices=["public", "internal", "confidential"])
    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(f"[!] Error: File '{args.file}' not found.")
        sys.exit(1)

    file_size = os.path.getsize(args.file)
    filename = os.path.basename(args.file)

    headers = {}
    if args.token:
        headers["Authorization"] = f"Bearer {args.token}"

    print(f"[*] Uploading '{filename}' ({file_size} bytes) to {args.api_url}...")

    with open(args.file, "rb") as f:
        files = {"file": (filename, f, "application/octet-stream")}
        data = {"classification": args.classification}
        try:
            res = httpx.post(
                f"{args.api_url.rstrip('/')}/v1/objects",
                files=files,
                data=data,
                headers=headers,
                timeout=30.0,
                verify=False,
            )
        except Exception as e:
            print(f"[!] Upload request failed: {e}")
            sys.exit(1)

    if res.status_code != 201:
        print(f"[!] Upload failed (HTTP {res.status_code}): {res.text}")
        sys.exit(1)

    res_data = res.json()
    print("\n[+] Upload Successful!")
    print(f"    Object ID:    {res_data.get('object_id')}")
    print(f"    Manifest ID:  {res_data.get('manifest_id')}")
    print(f"    Merkle Root:  {res_data.get('merkle_root')}")
    print(f"    Chunk Count:  {res_data.get('chunk_count')}")
    print(f"    Replication:  R={res_data.get('replication', {}).get('r')}, W={res_data.get('replication', {}).get('w')}")

    placements = res_data.get("placements", [])
    if placements:
        print("\n--- Chunk Placement Table ---")
        table_rows = []
        for idx, p in enumerate(placements):
            nodes_str = ", ".join(p.get("nodes", []))
            cid = p.get("chunk_id", "")
            table_rows.append([idx, f"{cid[:12]}...{cid[-8:]}", nodes_str])

        print(tabulate(table_rows, headers=["Chunk #", "Ciphertext Chunk ID", "Replica Nodes"], tablefmt="grid"))


if __name__ == "__main__":
    main()
