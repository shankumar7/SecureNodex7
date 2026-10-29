#!/usr/bin/env bash
# ==============================================================================
# SecureNodeX Chaos: Corrupt Chunk on Storage Node
# Usage: ./corrupt_chunk.sh <node_data_dir_or_container> <chunk_id>
# ==============================================================================
set -e

NODE_DIR="${1:-./data/storage-1}"
CHUNK_ID="$2"

if [ -z "${CHUNK_ID}" ]; then
  # Find the first chunk if not provided
  CHUNK_PATH=$(find "${NODE_DIR}" -type f -name "[0-9a-f]*" | head -n 1)
  if [ -z "${CHUNK_PATH}" ]; then
    echo "[CHAOS WARN] No chunks found in ${NODE_DIR} to corrupt."
    exit 0
  fi
else
  PREFIX="${CHUNK_ID:0:2}"
  CHUNK_PATH="${NODE_DIR}/${PREFIX}/${CHUNK_ID}"
fi

echo "[CHAOS] Corrupting chunk at: ${CHUNK_PATH}"
echo "CORRUPTED_GARBAGE_PAYLOAD_CHAOS_TEST_$(date +%s)" > "${CHUNK_PATH}"
echo "[PASS] Chunk corrupted on disk. Coordinator/Scrubber should detect SHA-256 mismatch and fetch replica."
