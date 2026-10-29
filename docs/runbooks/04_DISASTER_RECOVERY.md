# Runbook 04: Disaster Recovery & State Reconstruction

This runbook describes disaster recovery procedures for SecureNodeX, including rebuilding the relational database from smart contract event logs, recovering PKI certificates/keys, and cold-starting the full infrastructure from scratch.

---

## 1. Disaster Scenarios & Recovery RTO/RPO

| Scenario | RPO (Data Loss Window) | RTO (Recovery Time) | Primary Recovery Mechanism |
|---|---|---|---|
| **PostgreSQL Database Loss** | 0s (Contract State is Source of Truth) | < 5 minutes | `EventIndexer` event replay from Besu EVM |
| **Complete Storage Node Failure** | 0 chunks (if quorum $R \ge 2$) | < 15 minutes | Auto-scrub/repair worker + chunk replication |
| **All Storage Nodes Destroyed** | Last offsite snapshot | ~ 1 hour | Restore encrypted chunks from cold backup |
| **Besu Network Split / Crash** | 0s (QBFT finality is immediate) | < 2 minutes | Restart validators with preserved `/data/besu` |
| **Intermediate CA Compromise** | N/A | < 30 minutes | Revoke intermediate at Offline Root CA, reissue intermediate, rotate service/device certs |

---

## 2. Procedure A: Database Reconstruction from Besu Chain

Since SecureNodeX uses Besu smart contracts as the immutable ledger and single source of truth for identities, storage nodes, asset ownership, and audit hash chains, the PostgreSQL database is an operational read-cache.

### Step 1: Provision Clean Database

```bash
docker compose -f deploy/docker-compose.control.yml down -v postgres
docker compose -f deploy/docker-compose.control.yml up -d postgres

# Wait for healthy postgres
until docker exec snx-postgres pg_isready -U snx_user -d securenodex; do
  sleep 1
done
```

### Step 2: Apply Database Schema Migrations

```bash
docker exec -it snx-api alembic upgrade head
```

### Step 3: Run Event Indexer Rebuild

Trigger the indexer from block 0 to current head:

```bash
# Exec into worker container and run indexer replay
docker exec -it snx-worker python -c "
import asyncio
from core.indexer import EventIndexer
from core.database import get_db_session

async def rebuild():
    indexer = EventIndexer()
    print('Starting event replay from block 0...')
    synced = await indexer.sync_from_block(from_block=0)
    print(f'Rebuild complete. Processed {synced} events.')

asyncio.run(rebuild())
"
```

### Step 4: Verify Database State

```bash
# Verify identity count and audit log head match contract state
curl -s http://localhost:8000/v1/audit/verify | jq .
```

---

## 3. Procedure B: Intermediate CA Rotation / Recovery

If the online Intermediate CA key is corrupted or compromised:

### Step 1: Revoke Intermediate Certificate at Root CA

Using the offline Root CA machine:

```bash
# 1. Revoke intermediate cert
openssl ca -config pki/root-ca.cnf -revoke pki/certs/intermediate.cert.pem -keyfile pki/private/root.key.pem -cert pki/certs/root.cert.pem

# 2. Generate new Root CRL
openssl ca -config pki/root-ca.cnf -gencrl -out pki/crl/root.crl.pem
```

### Step 2: Generate New Intermediate Key & Certificate

```bash
python pki/make_intermediate.py \
  --root-cert pki/certs/root.cert.pem \
  --root-key pki/private/root.key.pem \
  --out-cert pki/certs/intermediate.cert.pem \
  --out-key pki/private/intermediate.key.pem
```

### Step 3: Distribute Intermediate to CA Service & Restart

```bash
docker compose -f deploy/docker-compose.control.yml restart ca
```

---

## 4. Procedure C: Complete Cold Restart of the Platform

If the entire deployment was taken down or lost power:

```bash
# 1. Start Besu Blockchain on all 4 nodes
# Host 1 (L1/control)
docker compose -f deploy/docker-compose.control.yml up -d besu-v1

# Hosts 2..4 (L2..L4)
ssh user@host2 "cd /opt/securenodex && docker compose -f deploy/docker-compose.chain.yml up -d"
ssh user@host3 "cd /opt/securenodex && docker compose -f deploy/docker-compose.chain.yml up -d"
ssh user@host4 "cd /opt/securenodex && docker compose -f deploy/docker-compose.chain.yml up -d"

# 2. Verify QBFT consensus is producing blocks
curl -s -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  -H "Content-Type: application/json" http://localhost:8545 | jq .result

# 3. Start Storage Nodes
ssh user@pi1 "cd /opt/securenodex && docker compose -f deploy/docker-compose.storage.yml up -d"
ssh user@pi2 "cd /opt/securenodex && docker compose -f deploy/docker-compose.storage.yml up -d"

# 4. Start Gateway and MQTT Broker (Pi 1)
ssh user@pi1 "cd /opt/securenodex && docker compose -f deploy/docker-compose.gateway.yml up -d"

# 5. Start Control Plane (Postgres, API, Worker, CA, Dashboard)
docker compose -f deploy/docker-compose.control.yml up -d

# 6. Run Smoke Tests to verify end-to-end functionality
./tools/smoke.sh
```
