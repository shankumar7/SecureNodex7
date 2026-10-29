#!/usr/bin/env bash
set -e

echo "================================================================================"
echo "          SECURENODEX - LAPTOP 3 STORAGE NODE & CLUSTER AUTO-JOIN             "
echo "================================================================================"

COMMANDER_URL="${1:-http://10.87.198.70:8443}"
STORAGE_PORT="${2:-7443}"
NODE_ID="storage-laptop3"

echo "[*] Step 1: Installing dependencies..."
python3 -m pip install -r storage/requirements.txt 2>/dev/null || pip3 install -r storage/requirements.txt

echo "[*] Step 2: Creating storage directory..."
STORAGE_DIR="$HOME/snx_storage_laptop3"
mkdir -p "$STORAGE_DIR"

echo "[*] Step 3: Starting storage node daemon on 0.0.0.0:$STORAGE_PORT..."
export NODE_ID="$NODE_ID"
export STORAGE_PORT="$STORAGE_PORT"
export STORAGE_DIR="$STORAGE_DIR"

# Launch uvicorn in the background
python3 -m uvicorn storage.app.main:app --host 0.0.0.0 --port "$STORAGE_PORT" &
STORAGE_PID=$!
echo "[+] Storage daemon started with PID $STORAGE_PID."

sleep 2

echo "[*] Step 4: Auto-registering with Laptop 1 Commander at $COMMANDER_URL..."
python3 tools/join_cluster.py "$COMMANDER_URL" "$NODE_ID" "$STORAGE_PORT"

echo ""
echo "================================================================================"
echo "[✓] Laptop 3 is now an active peer in the SecureNodeX storage cluster!"
echo "    - Node ID:       $NODE_ID"
echo "    - Storage Port:  $STORAGE_PORT"
echo "    - Commander:     $COMMANDER_URL"
echo "================================================================================"
echo "Press Ctrl+C to stop this node daemon."

wait $STORAGE_PID
