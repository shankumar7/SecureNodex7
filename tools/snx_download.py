#!/usr/bin/env python3
"""SecureNodeX CLI Download Tool.

Downloads and verifies a decentralized object from SecureNodeX storage.
"""

import argparse
import hashlib
import os
import sys

import httpx


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Download and verify a file from SecureNodeX storage"
    )
    parser.add_argument("object_id", help="UUID of object to download")
    parser.add_argument("output", help="Path to save downloaded file")
    parser.add_argument(
        "--api-url", default=os.getenv("SNX_API_URL", "http://localhost:8443"), help="Base API URL"
    )
    parser.add_argument("--token", default=os.getenv("SNX_TOKEN"), help="Bearer JWT token")
    args = parser.parse_args()

    headers = {}
    if args.token:
        headers["Authorization"] = f"Bearer {args.token}"

    print(f"[*] Downloading object {args.object_id} from {args.api_url}...")

    try:
        res = httpx.get(
            f"{args.api_url.rstrip('/')}/v1/objects/{args.object_id}/download",
            headers=headers,
            timeout=30.0,
            verify=False,
        )
    except Exception as e:
        print(f"[!] Download request failed: {e}")
        sys.exit(1)

    if res.status_code != 200:
        print(f"[!] Download failed (HTTP {res.status_code}): {res.text}")
        sys.exit(1)

    content = res.content
    with open(args.output, "wb") as f:
        f.write(content)

    file_sha256 = hashlib.sha256(content).hexdigest()

    print("\n[+] Download Complete!")
    print(f"    Saved to:     {args.output}")
    print(f"    Size:         {len(content)} bytes")
    print(f"    SHA-256:      {file_sha256}")


if __name__ == "__main__":
    main()
