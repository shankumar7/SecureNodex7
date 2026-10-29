# Runbook 01: Cold Start Bootstrap & Startup Sequence

## 1. Prerequisites
- All machines (L1-L6, Pi1, Pi2, ESP32s) connected to the same LAN/VLAN.
- `/etc/hosts` configured per `docs/DNS_HOSTS_GUIDE.md`.
- Time synchronized on all machines with NTP/Chrony.

## 2. Bootstrap Step-by-Step Order

### Step 1: PKI Initialization (Laptop L1)
```bash
# Generate root and intermediate CA
make pki-init

# Verify intermediate CA certificate and key
ls -la pki/intermediate/
```

### Step 2: Besu QBFT Blockchain (L2..L5)
```bash
# Generate node keys and genesis
bash chain/scripts/gen-keys.sh
bash chain/scripts/gen-genesis.sh

# Start Besu validators on L2, L3, L4, L5
# On L2:
NODE_NAME=validator1 docker compose -f deploy/docker-compose.chain.yml up -d
# On L3:
NODE_NAME=validator2 docker compose -f deploy/docker-compose.chain.yml up -d
# On L4:
NODE_NAME=validator3 docker compose -f deploy/docker-compose.chain.yml up -d
# On L5:
NODE_NAME=validator4 docker compose -f deploy/docker-compose.chain.yml up -d
```

### Step 3: Smart Contract Deployment (L1)
```bash
cd contracts
npx hardhat run scripts/deploy.ts --network besu
```

### Step 4: Control Plane Services (L1)
```bash
docker compose -f deploy/docker-compose.control.yml up -d

# Verify all services healthy
docker compose -f deploy/docker-compose.control.yml ps
```

### Step 5: Decentralized Storage Nodes (L2..L4, Pi1, Pi2)
```bash
# On L2:
NODE_ID=storage-l2 STORAGE_PORT=7443 docker compose -f deploy/docker-compose.storage.yml up -d
# On Pi1:
NODE_ID=storage-pi1 STORAGE_PORT=7443 docker compose -f deploy/docker-compose.storage.yml up -d
# On Pi2:
NODE_ID=storage-pi2 STORAGE_PORT=7443 docker compose -f deploy/docker-compose.storage.yml up -d
```

### Step 6: Ingestion Gateway & Broker (Pi1)
```bash
docker compose -f deploy/docker-compose.gateway.yml up -d
```

### Step 7: Run System Smoke Test (L6 / L1)
```bash
bash tools/smoke.sh
```
