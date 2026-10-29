# 01 - Architecture

## 1. Five planes
| Plane | Components | Responsibility |
|-------|-----------|----------------|
| Device | ESP32 nodes | Sense, sign, publish over mTLS, queue offline |
| Gateway | snx-broker (Mosquitto), snx-gateway | mTLS termination, ACL, signature verification, batching |
| Control | snx-api, snx-worker, snx-ca, PostgreSQL, dashboard | Auth, RBAC, enrollment, assets, orchestration, UI |
| Data | snx-storage nodes (x5) | Decentralised chunk storage |
| Trust | Blockchain (Hardhat -> Besu QBFT), PKI | Identity registry, roles, assets, anchors, audit |

## 2. Diagram
```
 ESP32 x3 --mTLS MQTT (P-256)--> [snx-broker :8883]
                                      | subscribe
                                      v
                               [snx-gateway]  verify cert-bound topic, signature, seq, RBAC
                                      | batch -> object
                                      v
 Dashboard (Next.js) --HTTPS+JWT--> [snx-api (FastAPI)] <--> PostgreSQL (index/cache)
 Laptop CLI/UI upload ------------>      |      \
                                         |       \--> [snx-ca]  (issue/renew/revoke certs)
                                         v
                              Storage coordinator (module in api/worker)
                              chunk + encrypt + place (HRW) + quorum write
                      mTLS     /        |        \       \        \
                       [storage-A] [storage-B] [storage-C] [storage-D] [storage-E]
                          Pi1        Pi2        L2         L3        L4
                                         |
                               [snx-worker] indexer, repair, batcher, anchoring
                                         v
                      Blockchain (Solidity contracts, 4 QBFT validators)
```

## 3. Services
| Service | Tech | Port | Notes |
|---------|------|------|-------|
| snx-broker | Mosquitto 2.x | 8883 (mTLS) | `require_certificate`, identity as username |
| snx-gateway | Python (aiomqtt) | - | subscribes `snx/v1/dev/+/#`, verifies, batches |
| snx-api | FastAPI, SQLAlchemy 2, Alembic | 8443 (TLS) | REST + WebSocket |
| snx-worker | Python (same package) | - | indexer, repair, anchoring, GC, cert-expiry scanner |
| snx-ca | Python `cryptography` | 9443 (mTLS) | intermediate-CA signing service; root offline |
| snx-storage | FastAPI | 7443 (mTLS) | one per storage node |
| chain | Hardhat node / Besu | 8545 (internal only) | never exposed to internet |
| PostgreSQL | 16 | 5432 internal | rebuildable from chain + storage |
| dashboard | Next.js 14, TS, Tailwind | 3000 | calls API |
| Prometheus + Grafana | - | 9090 / 3001 | metrics; ELK optional stretch |

## 4. What lives where
| Data | Location | Authoritative? |
|------|----------|----------------|
| Identity, role, cert fingerprint, status | Chain (IdentityRegistry) | Yes |
| Certificates (PEM) | Postgres + small replicated blobs | Fingerprint on-chain verifies |
| Asset ownership | Chain (AssetRegistry) | Yes |
| Object manifest id + Merkle root + owner | Chain (DataRegistry) | Yes |
| Manifest, encrypted chunks, key-grant blobs | Storage nodes (replicated) | Yes (integrity-checked) |
| Telemetry batches | Storage nodes (as objects) | Yes; root anchored on-chain |
| Audit events | Chain (AuditLog, hash-chained) | Yes |
| Query index, sessions, caches | Postgres | No (rebuild from chain events) |
| Private keys | Device flash / service secret mounts | Never in git, never on chain |

## 4b. Chain-writing model
Devices and users do not hold chain keys. Backend/gateway/worker run **operator accounts** (secp256k1) that hold `OPERATOR_ROLE`. Each chain call carries the acting principal id (`actor`); contracts verify the actor's on-chain role. The device's P-256 identity is bound on-chain by certificate fingerprint.

## 5. Core flows
### 5.1 Device enrollment
1. Admin/Manager: `POST /v1/devices` -> device record + one-time enrollment token (or provisioning bundle).
2. Provisioning tool generates P-256 key (or device creates CSR), `snx-ca` issues cert (CN=device_id, OU=device).
3. Worker registers identity on-chain (`IdentityRegistry.register`) -> audit `DEVICE_REGISTERED`.
4. Device flashed with key + cert + CA chain. See docs/02, docs/08.

### 5.2 Telemetry
1. ESP32 builds signed envelope (docs/06) and publishes to `snx/v1/dev/<id>/telemetry` over mTLS.
2. Broker checks cert + ACL (topic id must equal cert CN; revoked certs refused).
3. Gateway verifies signature, seq, timestamp, device status; drops and audits failures.
4. Gateway batches (100 msgs or 30 s) -> JSONL object -> **storage pipeline** (5.3) -> Merkle root.
5. Worker calls `DataRegistry.anchorBatch`. Dashboard shows data, CID/manifest, tx hash, proof link.

### 5.3 Upload from a laptop (or any source)
1. `POST /v1/objects` (streaming). API authenticates JWT, checks RBAC (`object:create`).
2. Coordinator streams bytes: split into chunks (`CHUNK_SIZE`), encrypt each (AES-256-GCM, per-object DEK), compute chunk id = SHA-256(ciphertext).
3. For each chunk compute placement (HRW, R nodes), PUT in parallel over mTLS, wait for W acks.
4. Build manifest + Merkle root; store manifest (replicated). Wrap DEK for owner (ECIES P-256).
5. `DataRegistry.registerObject(...)` on-chain; audit `OBJECT_CREATED`. Return `object_id`.
6. Background: ensure R replicas per chunk (repair worker).

### 5.4 Download
RBAC check (+ on-chain `canRead`) -> fetch manifest -> fetch each chunk from any healthy replica (verify SHA-256, fall back on failure) -> decrypt with unwrapped DEK -> stream out -> audit `OBJECT_READ`.

### 5.5 Revocation
Admin revokes -> `IdentityRegistry.revoke` -> indexer event -> API cache invalidated + broker deny-list updated + CRL regenerated (<= 5 s) -> live session dropped -> audit `DEVICE_REVOKED`.

### 5.6 Node failure and repair
Heartbeat missed x3 -> node DOWN -> worker finds chunks with < R live replicas -> copies from live holders to next-ranked nodes -> verifies hashes -> updates replica table -> audit `REPAIR_COMPLETED`.

### 5.7 Asset transfer
Owner/Manager requests transfer -> policy check -> `AssetRegistry.transferAsset` -> audit `ASSET_TRANSFERRED`.

## 6. Cross-cutting rules
- Every request carries a correlation id; every audit record includes it.
- Idempotency-Key supported on mutating POSTs.
- No service trusts another service without mTLS identity + role check.
- Config via env vars (docs/09); secrets via mounted files, never env in compose files committed to git.
- Structured JSON logs; Prometheus metrics on `/metrics` of each service.
