#!/usr/bin/env bash
# ==============================================================================
# SecureNodeX - Clear All Stored Files and Chunks
# ==============================================================================
set -e

echo "=== [1/3] Clearing Local Storage Directories ==="
rm -rf /tmp/snx_storage_data ~/storage_data
mkdir -p /tmp/snx_storage_data ~/storage_data
echo "[✓] Local directories cleared: /tmp/snx_storage_data and ~/storage_data"

echo "=== [2/3] Clearing Database Records (if Postgres is running) ==="
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "snx-postgres"; then
    docker exec snx-postgres psql -U snx -d snx -c "
        TRUNCATE TABLE chunk_replicas, stored_chunks, stored_objects CASCADE;
        UPDATE storage_nodes SET used_bytes = 0, chunk_count = 0;
    "
    echo "[✓] Postgres database cleared: stored_objects, stored_chunks, chunk_replicas truncated."
else
    echo "[i] Postgres container 'snx-postgres' is not running right now. Skipped DB truncate."
fi

echo "=== [3/3] Docker Volume Cleanup (Optional) ==="
if command -v docker &>/dev/null && docker info &>/dev/null; then
    docker volume prune -f 2>/dev/null || true
    echo "[✓] Docker storage volumes pruned."
fi

echo "=============================================================================="
echo " [SUCCESS] All stored files, chunks, and metadata have been wiped clean."
echo "=============================================================================="
