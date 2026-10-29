# 11 - Roadmap and Milestones

Rule: **one milestone = one branch = one Antigravity session.** Merge only when acceptance criteria pass and tests are green. Always keep `main` demo-able.

| M | Name | Deliverables | Acceptance | Owner role |
|---|------|--------------|-----------|-----------|
| M0 | Repo skeleton | Folder layout, `.gitignore`, Makefile, CI, `.env.example`, lint configs, empty service shells with `/healthz` | `make dev-up` starts empty services; CI green | DevOps |
| M1 | PKI + broker mTLS | Root/intermediate scripts, snx-ca service, issue/revoke/CRL, Mosquitto mTLS config, `provision-device.py` | AT-06, AT-07 with `mosquitto_pub`; test vector tool works | Security |
| M2 | Smart contracts | All contracts in docs/04, deploy script, full Hardhat test suite, ABI export | Role matrix, anchor, audit chain tests pass; gas report | Blockchain |
| M3 | Backend core | Auth/JWT, principals, RBAC dependency, devices + enrollment, chain client, indexer, audit service, Postgres models | AT-01, AT-17 (API part), AT-19 | Backend |
| M4 | Storage layer | snx-storage node, coordinator (chunk/encrypt/place/quorum), manifest, read path, repair worker, placement API | AT-13, 14, 15, 16, 20, 21 | Backend + DevOps |
| M5 | Gateway + telemetry | Gateway verification pipeline, batching -> storage, Merkle + anchoring, proofs API, broker ACL/revocation hook | AT-02..05, 08..12 | Backend + Security |
| M6 | Firmware integration | (human) ESP32 firmware per docs/08; simulator for load | firmware checklist; AT-22 | Firmware |
| M7 | Dashboard | Next.js UI: login, devices, enrollment, objects + placement view, assets, audit, storage health, live telemetry | Demo flows 2-10 clickable | Frontend |
| M8 | Multi-host + Besu | Besu QBFT on laptops, compose per host, Pi deployments, remote storage nodes | AT-23; storage nodes on Pis | DevOps + Blockchain |
| M9 | Hardening + demo | Chaos scripts, rotation demo, 500-device test, docs polish, rehearsal, recorded demo | AT-01..25 all pass | All |

## Dependencies
M0 -> M1, M2 (parallel) -> M3 -> M4 -> M5 -> M7; M6 starts after M1 test vectors exist; M8 after M4/M5 work on one host.

## Suggested team split (6 people)
1. Blockchain: M2, M8 chain
2. Security/PKI: M1, rotation/revocation parts of M5
3. Backend lead: M3, M5
4. Backend/storage: M4
5. Firmware (you + partner): M6
6. Frontend + DevOps support: M7, M8 compose

## Definition of done (every milestone)
Spec followed or ADR written; tests added and passing; docs updated; no secrets committed; demo steps for the milestone listed in `docs/demo-notes/Mx.md`; PR reviewed by another teammate.
