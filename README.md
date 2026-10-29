# SecureNodeX

Decentralised, ECC-secured platform for **device identity, access control (RBAC), digital-asset management, tamper-evident auditing and split + replicated data storage** for IoT and small-resource devices.

Smart India Hackathon 2026 | Problem Statement 26125 | Team CodeCommit (CMRGI052)
Repo: https://github.com/shankumar7/SecureNodex7

## One-paragraph idea
Every device, user and storage node gets a unique cryptographic identity (ECC P-256 key + X.509 certificate from our private CA). Everything talks over **mutual TLS**. Devices sign every message. A blockchain (Hardhat for development, Hyperledger Besu QBFT multi-node for the demo) holds the identity registry, roles, asset NFTs, data anchors and a hash-chained audit log. Any data uploaded from any laptop or device is **split into chunks, encrypted, and replicated across several independent storage nodes** (Raspberry Pis and laptops). No single node holds a whole object and any single node can die without data loss.

## Documentation index (read in this order)
| # | File | Purpose |
|---|------|---------|
| 0 | docs/00_PROJECT.md | Goals, numbered requirements, scope, glossary, hardware |
| 1 | docs/01_ARCHITECTURE.md | Components, planes, flows, tech stack, ports |
| 2 | docs/02_SECURITY_PKI.md | ECC, CA, mTLS, enrollment, revocation, rotation, threat model |
| 3 | docs/03_STORAGE.md | Decentralised storage: chunking, replication, placement, repair |
| 4 | docs/04_CONTRACTS.md | Smart contracts spec |
| 5 | docs/05_RBAC.md | Roles, permission matrix, enforcement points |
| 6 | docs/06_MESSAGE_FORMAT.md | Device message envelope, signing, topics, Merkle batching |
| 7 | docs/07_API_SPEC.md | REST/WebSocket API |
| 8 | docs/08_FIRMWARE_SPEC.md | ESP32 contract (written/flashed by the team) |
| 9 | docs/09_DEPLOYMENT.md | Topology across 2 Pis, 3 ESP32s, 6 laptops; env; Besu |
| 10 | docs/10_TESTING_DEMO.md | Acceptance tests, demo script, failure injection |
| 11 | docs/11_ROADMAP.md | Milestones with acceptance criteria |
| - | docs/CONTRIBUTING.md | Git workflow, secrets policy, definition of done |
| - | ANTIGRAVITY_PROMPT.md | Master prompt + one prompt per milestone |

## Key design decisions
- **D1** Hardhat local chain first, then Besu QBFT (4 validators) on laptops. Same Solidity contracts.
- **D2** Custom lightweight storage layer ("SNX-Store"): chunk, encrypt, replicate R=3, rendezvous placement, self-healing. IPFS-compatible content addressing, but we do not depend on IPFS.
- **D3** Devices and users use **P-256**. Only backend/gateway operator accounts use secp256k1 (chain accounts). Devices never hold chain keys.
- **D4** Two layers of authenticity: mTLS (channel) and per-message ECDSA signatures (data).
- **D5** Python 3.12 + FastAPI backend, Next.js + TypeScript + Tailwind dashboard, Docker Compose.

## Repo layout
```
/docs         specifications (this set)
/contracts    Solidity + Hardhat tests + deploy scripts
/chain        Besu QBFT config, genesis, compose
/pki          CA scripts, cert profiles, provisioning tool
/broker       Mosquitto config, auth/ACL hook
/backend      FastAPI app (api, gateway, worker, indexer)
/storage      snx-storage node service
/firmware     ESP32 code (human-written)
/dashboard    Next.js app
/simulator    virtual devices + load test
/deploy       docker-compose files per host, .env.example, Makefile
/tools        helper scripts (test vectors, demo scripts)
```
