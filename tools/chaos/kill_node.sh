#!/usr/bin/env bash
# ==============================================================================
# SecureNodeX Chaos: Stop/Kill Storage Node
# Usage: ./kill_node.sh [container_name_or_port]
# ==============================================================================
set -e

TARGET="${1:-snx-storage-3}"

echo "[CHAOS] Killing storage node: ${TARGET}..."
if docker ps --format '{{.Names}}' | grep -q "${TARGET}"; then
  docker stop "${TARGET}"
  echo "[CHAOS] Successfully stopped docker container ${TARGET}."
else
  echo "[CHAOS] Container ${TARGET} not found in docker ps, sending SIGTERM to mock port or process if running."
  pkill -f "snx-storage.*${TARGET}" || true
fi

echo "[PASS] Chaos kill_node executed for ${TARGET}. Remaining cluster will handle quorum and trigger repair."
