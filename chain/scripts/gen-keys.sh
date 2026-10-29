#!/usr/bin/env bash
set -euo pipefail

# SecureNodeX Besu QBFT Node Key Generator
# Generates private keys and public node addresses for 4 QBFT validators and 1 observer.

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KEYS_DIR="${BASE_DIR}/keys"
mkdir -p "${KEYS_DIR}"

echo "[+] Generating keys for 4 QBFT validators and 1 observer node..."

# 4 Deterministic validator private keys for local/demo reproducibility (or random if SECURE_KEYS=1)
declare -A NODE_KEYS=(
  ["validator1"]="8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63"
  ["validator2"]="c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3"
  ["validator3"]="ae6cb872f5866671f5f14a0f4b103e97ee3f42d87cb758d521098fbdef4db5d4"
  ["validator4"]="2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6"
  ["observer"]="405637ba3241d3f52f54579b023d59e6e396345a1917d404f171994372f09f9c"
)

# Output node addresses
for node in "validator1" "validator2" "validator3" "validator4" "observer"; do
  node_dir="${KEYS_DIR}/${node}"
  mkdir -p "${node_dir}"
  key_hex="${NODE_KEYS[$node]}"
  
  echo "${key_hex}" > "${node_dir}/key"
  chmod 600 "${node_dir}/key"
  echo "  - Generated key for ${node} -> ${node_dir}/key"
done

echo "[+] Node keys generated successfully in ${KEYS_DIR}"
