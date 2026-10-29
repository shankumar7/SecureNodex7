# 10 - Testing and Demo

## 1. Test layers
Unit (pytest, Hardhat) -> integration (docker compose, testcontainers) -> end-to-end (simulator + scripted scenarios) -> chaos (kill nodes) -> demo rehearsal. CI (GitHub Actions) runs unit + contract + integration on every PR.

## 2. Acceptance tests (each maps to requirements)
| ID | Test | Expected | Req |
|----|------|----------|-----|
| AT-01 | Provision device -> cert issued -> identity on chain | tx hash visible, status ACTIVE | FR-ID-1/2 |
| AT-02 | Device with valid cert connects, publishes | Message accepted, visible in dashboard | FR-SEC-1/3 |
| AT-03 | Signature verifies against test vector | pass | FR-SEC-3 |
| AT-04 | Telemetry batch stored via SNX-Store | batch object chunked/replicated, root anchored | FR-STO-1/2 |
| AT-05 | Merkle proof verifies against on-chain root | valid | FR-STO-5 |
| AT-06 | Cert from unknown CA | TLS handshake rejected | FR-SEC-1 |
| AT-07 | Expired cert | rejected | FR-SEC-1 |
| AT-08 | Revoke device while connected | disconnected and blocked <= 5 s | FR-ID-3 |
| AT-09 | Device publishes to other device's topic | denied + audit ACCESS_DENIED | FR-RBAC-2 |
| AT-10 | Tampered payload | SIGNATURE_INVALID, dropped | FR-SEC-3 |
| AT-11 | Replayed message | REPLAY_REJECTED | FR-SEC-4 |
| AT-12 | Flood 50 msg/s from one device | rate-limited, others unaffected | NFR |
| AT-13 | Upload 5 MiB file from laptop | N chunks, each on R=3 distinct nodes, manifest + tx | FR-STO-1/2 |
| AT-14 | No single node holds all chunks | diversity rule satisfied | FR-STO-3 |
| AT-15 | Kill 1 storage node, download file | content identical (sha256 match); repair restores R | FR-STO-6 |
| AT-16 | Inspect node disk | only ciphertext; plaintext not recoverable without DEK | FR-STO-4 |
| AT-17 | RBAC matrix (table-driven) | every cell as spec | FR-RBAC-1/2 |
| AT-18 | Asset mint/transfer + audit | owner changes, events on chain | FR-AST-1/2 |
| AT-19 | Audit hash chain verify; tamper DB copy | `/audit/verify` valid from chain; DB tamper detected | FR-AUD-2 |
| AT-20 | Corrupt a chunk on one node | read succeeds from other replica, repair fixes | FR-STO-5/6 |
| AT-21 | Kill 2 of 5 storage nodes | reads still succeed | FR-STO-6 |
| AT-22 | Cert rotation (short TTL) without reflash | device reconnects with new fingerprint on chain | FR-ID-4 |
| AT-23 | Stop 1 chain validator | writes continue | NFR |
| AT-24 | Simulator 500 devices for 10 min | no message loss, p95 ingest latency reported | NFR-3 |
| AT-25 | Index rebuild from chain + storage | DB restored equivalent | FR-BE-2 |

## 3. Demo script (about 10 minutes)
1. **Architecture slide** (one picture, five planes).
2. **Enroll** `esp32-01` from the dashboard: show cert, on-chain tx, audit event.
3. **Live telemetry** from the ESP32: dashboard chart; show signature check and batch -> chunks -> anchor with tx hash.
4. **Decentralised storage**: upload a 3 MB PDF from a laptop; open the *placement view*: chunks coloured by node (5 nodes, 3 copies each). Download and verify hash.
5. **Failure 1**: pull power on storage-pi2; download again (works); watch under-replicated count rise then repair.
6. **Failure 2**: connect an ESP32 with an untrusted cert -> rejected; revoke a good device -> dropped in seconds.
7. **Attack**: tampered/replayed message -> rejected + audit entries.
8. **RBAC**: log in as Auditor (read-only), as User (own objects), try forbidden action -> 403 + audit.
9. **Asset transfer** between two users; show NFT token and history.
10. **Audit verify**: run `/audit/verify`; mention immutable chain; stop one validator and show chain keeps running.
11. **Close** with honest limits (docs/00 section 5).

## 4. Chaos and failure scripts (`tools/chaos/`)
`kill_node.sh <name>`, `corrupt_chunk.sh <node> <chunk>`, `partition.sh`, `flood.py`, `replay.py`, `tamper.py`, `rogue_device.py` (own CA). Each prints PASS/FAIL against the expected audit event.

## 5. Simulator (`/simulator`)
Python asyncio; spawns M virtual devices with provisioned certs (batch-provision command), honest message format, configurable rate, jitter, offline windows, misbehaviour modes (`--tamper-rate`, `--replay-rate`). Outputs throughput, loss, latency percentiles. Used for AT-12/24.

## 6. Quality gates
Coverage >= 80% on backend core modules and 100% of contract functions; ruff + mypy (strict on crypto/storage modules); eslint + tsc on dashboard; no secrets in git (gitleaks in CI).
