#!/usr/bin/env bash
set -e

echo "================================================================================"
echo "          SECURENODEX - PEER STORAGE NODE SETUP & CLUSTER JOIN                "
echo "================================================================================"

NODE_ID="${1:-storage-laptop2}"
COMMANDER_URL="${2:-http://10.87.198.70:8443}"
STORAGE_PORT="${3:-7443}"

echo "[*] Configuring Node: '$NODE_ID'"
echo "[*] Target Commander: '$COMMANDER_URL'"
echo "[*] Storage Port:     '$STORAGE_PORT'"

# 1. Python environment check & dependencies
echo ""
echo "[*] Step 1: Installing dependencies..."
python3 -m pip install fastapi "uvicorn[standard]" httpx pydantic pydantic-settings prometheus-client cryptography 2>/dev/null || \
pip3 install fastapi "uvicorn[standard]" httpx pydantic pydantic-settings prometheus-client cryptography

# 2. Prepare Storage Directory
STORAGE_DIR="$HOME/snx_storage_${NODE_ID}"
mkdir -p "$STORAGE_DIR"
echo "[+] Local chunk storage path: $STORAGE_DIR"

# 3. Stop any older instances on this port
echo ""
echo "[*] Step 2: Checking port $STORAGE_PORT..."
lsof -ti :"$STORAGE_PORT" | xargs kill -9 2>/dev/null || true

# 4. Start Storage Daemon in background
echo ""
echo "[*] Step 3: Launching storage node daemon on 0.0.0.0:$STORAGE_PORT..."
export NODE_ID="$NODE_ID"
export STORAGE_PORT="$STORAGE_PORT"
export STORAGE_DIR="$STORAGE_DIR"

nohup python3 -m uvicorn storage.app.main:app --host 0.0.0.0 --port "$STORAGE_PORT" > "$HOME/${NODE_ID}_daemon.log" 2>&1 &
DAEMON_PID=$!
echo "[+] Node daemon started with PID $DAEMON_PID (logs: $HOME/${NODE_ID}_daemon.log)"

# Wait for daemon to be ready
echo "[*] Waiting for node to report healthy on port $STORAGE_PORT..."
for i in {1..10}; do
  if curl -s "http://127.0.0.1:$STORAGE_PORT/v1/health" > /dev/null 2>&1; then
    echo "[+] Node daemon is healthy and listening on port $STORAGE_PORT."
    break
  fi
  sleep 1
done

# 5. Auto-join Cluster
echo ""
echo "[*] Step 4: Registering '$NODE_ID' with Commander at $COMMANDER_URL..."
python3 tools/join_cluster.py "$COMMANDER_URL" "$NODE_ID" "$STORAGE_PORT"

echo ""
echo "================================================================================"
echo "[✓] SUCCESS: $NODE_ID is fully active in the SecureNodeX cluster!"
echo "    - Logs:          tail -f $HOME/${NODE_ID}_daemon.log"
echo "    - Health Check:  curl http://localhost:$STORAGE_PORT/v1/health"
echo "================================================================================"
