# Runbook 03: Replacing a Failed Node & Re-Replication

## 1. Replacing a Storage Node (e.g. `storage-l2` fails)

When a storage node fails or is replaced with a new host:
1. Mark the node as `draining` via the API or dashboard to exclude it from new placements:
   ```bash
   curl -X POST -H "Authorization: Bearer $TOKEN" https://api.snx.lan:8443/v1/storage/nodes/storage-l2/drain
   ```
2. Provision a new node (e.g. `storage-l6` on spare laptop L6):
   ```bash
   NODE_ID=storage-l6 STORAGE_PORT=7443 docker compose -f deploy/docker-compose.storage.yml up -d
   ```
3. Register the new node in `StorageNodeRegistry`:
   ```bash
   # Add node endpoint in backend / contract
   curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
     --data '{"node_id":"storage-l6","endpoint":"http://192.168.1.16:7443"}' \
     https://api.snx.lan:8443/v1/storage/nodes
   ```
4. Trigger the self-healing repair worker:
   ```bash
   curl -X POST -H "Authorization: Bearer $TOKEN" https://api.snx.lan:8443/v1/storage/repair
   ```
   The self-healing worker pulls replicas from remaining surviving nodes (quorum $W=2$, $R=3$) and re-replicates under-replicated chunks onto the new node.

## 2. Replacing a Besu QBFT Validator Node

1. In a 4-node QBFT cluster, 1 validator can fail without halting the chain ($f=1$).
2. Generate a new node key for the replacement host:
   ```bash
   # On new host
   mkdir -p chain/keys/validator_new
   # Copy genesis.json and static-nodes.json
   ```
3. Submit a QBFT validator vote transaction from the surviving validators:
   ```bash
   # Propose adding new validator address
   curl -X POST --data '{"jsonrpc":"2.0","method":"qbft_proposeValidatorVote","params":["0xNEW_VALIDATOR_ADDRESS", true],"id":1}' http://localhost:8545
   ```
4. Start the new validator container:
   ```bash
   NODE_NAME=validator_new docker compose -f deploy/docker-compose.chain.yml up -d
   ```
