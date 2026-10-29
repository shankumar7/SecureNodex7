# Runbook 02: Graceful Shutdown Procedure

## 1. Overview
To avoid message loss, under-replicated storage states, or incomplete transaction writes, shutdown should proceed in reverse order of initialization.

## 2. Step-by-Step Shutdown Order

### Step 1: Stop Traffic & Ingestion
```bash
# On Pi1: Stop gateway ingestion
docker compose -f deploy/docker-compose.gateway.yml stop snx-gateway
```

### Step 2: Stop Storage Nodes & Flush Chunks
```bash
# On L2..L4, Pi1, Pi2: Stop storage nodes
docker compose -f deploy/docker-compose.storage.yml stop
```

### Step 3: Stop Control Plane Services
```bash
# On L1:
docker compose -f deploy/docker-compose.control.yml stop snx-worker snx-api snx-ca dashboard
# Ensure Postgres cleanly flushes WAL
docker compose -f deploy/docker-compose.control.yml stop postgres
```

### Step 4: Stop Besu QBFT Validators
```bash
# On L2..L5: Stop Besu validator containers
docker compose -f deploy/docker-compose.chain.yml stop
```
