# 09 - Deployment

## 1. Topology (2 Pis, 3 ESP32, 6 laptops, one LAN/VLAN; Wi-Fi 2.4 GHz for ESP32)
| Host | Role | Services |
|------|------|----------|
| Laptop L1 (control) | Control plane | snx-api, snx-worker, snx-ca, PostgreSQL, dashboard, Prometheus, Grafana |
| Laptop L2 | Chain + storage | Besu validator 1, storage-l2 |
| Laptop L3 | Chain + storage | Besu validator 2, storage-l3 |
| Laptop L4 | Chain + storage | Besu validator 3, storage-l4 |
| Laptop L5 | Chain | Besu validator 4 (QBFT needs >= 4), RPC node |
| Laptop L6 | Dev/QA | simulator, attacker/failure scripts, spare node |
| Pi1 | Gateway + storage | snx-broker (Mosquitto), snx-gateway, storage-pi1 |
| Pi2 | Storage + observer | storage-pi2, optional Besu observer node |
| ESP32 x3 | Devices | firmware |
Milestones 1-7 run everything on one laptop with `deploy/docker-compose.dev.yml` (Hardhat chain, 3 local storage containers, mosquitto). Multi-host layout is Milestone 8.

## 2. Compose files
`deploy/docker-compose.dev.yml` (all-in-one), `docker-compose.control.yml` (L1), `docker-compose.chain.yml` (Besu node), `docker-compose.storage.yml` (storage node, multi-arch), `docker-compose.gateway.yml` (Pi1). Images must be multi-arch (`linux/amd64`, `linux/arm64`) built with `docker buildx`. Use healthchecks and `restart: unless-stopped`.

## 3. Makefile targets
`make dev-up`, `make dev-down`, `make test`, `make contracts-test`, `make pki-init`, `make provision LABEL=esp32-01`, `make chain-up`, `make storage-up NODE_ID=...`, `make simulate DEVICES=100`, `make demo`, `make clean-secrets` (confirm prompt).

## 4. `.env.example` (no real secrets)
```
PROJECT_NAME=SecureNodeX
CHAIN_RPC_URL=http://chain:8545
CHAIN_ID=20260
OPERATOR_KEY_FILE=/run/secrets/operator_key
DEPLOYMENTS_FILE=/app/deployments/besu.json
DATABASE_URL=postgresql+psycopg://snx:CHANGE_ME@postgres:5432/snx
API_PUBLIC_URL=https://api.snx.lan:8443
JWT_KEY_FILE=/run/secrets/jwt_es256.pem
CA_URL=https://ca.snx.lan:9443
CA_CLIENT_CERT=/run/secrets/svc.crt
CA_CLIENT_KEY=/run/secrets/svc.key
CA_CHAIN=/run/secrets/ca-chain.pem
MQTT_HOST=broker.snx.lan
MQTT_PORT=8883
CHUNK_SIZE=65536
REPLICATION_R=3
WRITE_QUORUM_W=2
HEARTBEAT_S=5
GC_GRACE_S=300
BATCH_MAX_MSGS=100
BATCH_MAX_SECONDS=30
DEVICE_CERT_TTL_HOURS=2160
ADMIN_CONTENT_ACCESS=false
```
Docker secrets/mounted `./secrets/` for keys. Use local DNS or `/etc/hosts` entries (`api.snx.lan`, `broker.snx.lan`, `ca.snx.lan`, `storage-*.snx.lan`); broker/storage/API cert SANs must match.

## 5. Ports and exposure
| Port | Service | Exposure |
|------|---------|----------|
| 8883 | MQTT mTLS | LAN (+ optional internet via port-forward/tunnel; mTLS makes this acceptable) |
| 8443 | API | LAN (+ optional internet behind reverse proxy) |
| 3000 | Dashboard | LAN/optional |
| 9443 | CA | **LAN-internal only** |
| 7443 | Storage nodes | **internal only** (mTLS) |
| 8545/30303 | Chain RPC/p2p | **internal only**; never expose RPC |
Optional internet exposure: expose only 8883 and 443 (via Caddy/Nginx or a tunnel). Never expose CA, storage, chain, Postgres.

## 6. Besu QBFT network
- 4 validators (L2-L5), optional observer on Pi2. Genesis `chain/genesis.json`: chainId 20260, `qbft` config `blockperiodseconds: 2`, `epochlength: 30000`, `requesttimeoutseconds: 4`, zero gas price (`min-gas-price=0`, permissioned).
- Scripts: `chain/scripts/gen-keys.sh` (node keys), `chain/scripts/gen-genesis.sh` (extraData with validator list), static-nodes/bootnodes config. Contracts deployed once via Hardhat `--network besu`.
- Demo: stop 1 validator -> chain continues (f=1); stop 2 -> halts (document and explain BFT bounds).

## 7. Time sync
All hosts and ESP32s must have correct time (chrony/NTP). Certificate validation and replay windows depend on it.

## 8. Bootstrap order
1. `make pki-init` (root offline, intermediate, broker/API/storage/service certs).
2. Start Postgres, chain; `make contracts-deploy`.
3. Start snx-ca, snx-api, snx-worker; create bootstrap Admin.
4. Start storage nodes; register in StorageNodeRegistry.
5. Start broker + gateway on Pi1.
6. Provision devices; flash ESP32s.
7. Start dashboard; run smoke test `tools/smoke.sh`.

## 9. Backups
Postgres is rebuildable. Back up: CA intermediate key (encrypted), operator keys, `deployments/*.json`, chain data volume for Besu validators.

## 10. `.gitignore` (must exist at repo root)
```
secrets/
*.key
*.pem
!**/ca-chain.pem.example
.env
pki/root/
pki/out/
firmware/credentials/
node_modules/
__pycache__/
.venv/
deployments/*.local.json
data/
```
