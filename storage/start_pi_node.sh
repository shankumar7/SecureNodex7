#!/usr/bin/env bash
set -e

echo "=== SecureNodeX Raspberry Pi Storage Node Setup ==="

# Install python3 and virtualenv if needed
if ! command -v pip3 &> /dev/null; then
    sudo apt update && sudo apt install -y python3-pip python3-venv
fi

# Install dependencies
pip3 install fastapi "uvicorn[standard]" httpx pydantic pydantic-settings prometheus-client cryptography --break-system-packages 2>/dev/null || \
pip3 install fastapi "uvicorn[standard]" httpx pydantic pydantic-settings prometheus-client cryptography

# Create chunks directory
mkdir -p ~/storage_data

# Start storage node daemon on port 7443
export NODE_ID="storage-pi"
export STORAGE_PORT=7443
export DATA_DIR="$HOME/storage_data"

echo "Starting storage node 'storage-pi' on 0.0.0.0:7443..."
exec uvicorn storage.app.main:app --host 0.0.0.0 --port 7443
