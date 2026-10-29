# SecureNodeX Master Acceptance Test Report (AT-01 to AT-25)

**Execution Date:** 2026-10-09  
**Platform Version:** SecureNodeX v1.0.0-rc1  
**Target Environment:** Hyperledger Besu QBFT (Chain ID 20260) + PostgreSQL + Mosquitto mTLS + 5-Node Storage Cluster  
**Overall Result:** **25 / 25 PASS (100% Success Rate)**  

---

## 1. Executive Summary

All 25 Acceptance Tests specified in [docs/10_TESTING_DEMO.md](file:///Users/shankumar/Desktop/SecureNodeX7/docs/10_TESTING_DEMO.md) and required by the project specifications have been implemented, executed, and verified.

- **Unit & Integration Suite:** 129 / 129 tests passing (`pytest tests/`).
- **Smart Contracts Suite:** 24 / 24 Hardhat tests passing with gas report (`contracts/npm test`).
- **500-Device Load Benchmark:** 5,000 / 5,000 messages ingested with 0.00% loss, 7,965 msg/s throughput, 0.10ms median latency, 0.15ms p95 latency.
- **BFT Consensus Fault Tolerance (AT-23):** 4-node QBFT network verified to continue block production with 1 node offline ($3/4 \ge \text{Quorum } 3$).
- **Cryptographic Standards:** 100% ECC P-256 for IoT/service identities, secp256k1 for blockchain operators, zero committed secrets.

---

## 2. Complete Acceptance Test (AT) Matrix

| ID | Test Description | Specification Requirement | Test Implementation / Evidence | Result |
|---|---|---|---|---|
| **AT-01** | Provision device -> cert issued -> identity on-chain | `FR-ID-1`, `FR-ID-2` | `tests/test_device_api.py`, `pki/provision_device.py` | ✅ **PASS** |
| **AT-02** | Device with valid cert connects & publishes | `FR-SEC-1`, `FR-SEC-3` | `tests/test_gateway_pipeline.py`, `tools/seed_demo.py` | ✅ **PASS** |
| **AT-03** | Signature verifies against test vector | `FR-SEC-3`, `docs/06` | `tests/test_message_format.py`, `tools/verify_message.py` | ✅ **PASS** |
| **AT-04** | Telemetry batch stored via SNX-Store | `FR-STO-1`, `FR-STO-2` | `tests/test_batcher_anchoring.py`, `backend/app/gateway_batcher.py` | ✅ **PASS** |
| **AT-05** | Merkle proof verifies against on-chain root | `FR-STO-5` | `tests/test_batcher_anchoring.py` | ✅ **PASS** |
| **AT-06** | Certificate from unknown CA rejected at TLS | `FR-SEC-1` | `tests/test_broker_mtls_acl.py`, `tools/chaos/rogue_device.py` | ✅ **PASS** |
| **AT-07** | Expired certificate rejected | `FR-SEC-1` | `tests/test_broker_mtls_acl.py` | ✅ **PASS** |
| **AT-08** | Revoke device while connected -> disconnect $\le 5\text{s}$ | `FR-ID-3` | `tests/test_broker_mtls_acl.py`, `test_gateway_pipeline.py` | ✅ **PASS** |
| **AT-09** | Device publishes to other device's topic -> denied | `FR-RBAC-2` | `tests/test_gateway_pipeline.py`, `tools/chaos/rogue_device.py` | ✅ **PASS** |
| **AT-10** | Tampered payload -> `SIGNATURE_INVALID`, dropped | `FR-SEC-3` | `tests/test_gateway_pipeline.py`, `tools/chaos/tamper.py` | ✅ **PASS** |
| **AT-11** | Replayed sequence number -> `REPLAY_REJECTED` | `FR-SEC-4` | `tests/test_gateway_pipeline.py`, `tools/chaos/replay.py` | ✅ **PASS** |
| **AT-12** | Flood 50 msg/s from one device -> rate limited | `NFR` | `tests/test_gateway_pipeline.py`, `tools/chaos/flood.py` | ✅ **PASS** |
| **AT-13** | Upload 5 MiB file -> $N$ chunks on $R=3$ distinct nodes | `FR-STO-1`, `FR-STO-2` | `tests/test_storage_coordinator.py`, `tools/snx_upload.py` | ✅ **PASS** |
| **AT-14** | No single node holds all chunks (diversity rule) | `FR-STO-3` | `tests/test_storage_coordinator.py`, `test_storage_chaos.py` | ✅ **PASS** |
| **AT-15** | Kill 1 storage node -> download succeeds with SHA-256 | `FR-STO-6` | `tests/test_storage_chaos.py`, `tools/chaos/kill_node.sh` | ✅ **PASS** |
| **AT-16** | Inspect node disk: ciphertext only | `FR-STO-4` | `tests/test_storage_chaos.py` (disk scan verifies AES-GCM) | ✅ **PASS** |
| **AT-17** | RBAC matrix (table-driven for every role/action) | `FR-RBAC-1`, `FR-RBAC-2` | `tests/test_rbac_matrix.py` (80 test assertions) | ✅ **PASS** |
| **AT-18** | Asset mint/transfer + direct transfer disabled | `FR-AST-1`, `FR-AST-2` | Hardhat `AssetRegistry.test.ts` (reverts standard transfer) | ✅ **PASS** |
| **AT-19** | Audit hash chain verify; DB tamper detected | `FR-AUD-2` | `tests/test_audit_service.py`, `backend/app/services/audit.py` | ✅ **PASS** |
| **AT-20** | Corrupt chunk on one node -> read succeeds from replica | `FR-STO-5`, `FR-STO-6` | `tests/test_storage_chaos.py`, `tools/chaos/corrupt_chunk.sh` | ✅ **PASS** |
| **AT-21** | Kill 2 of 5 storage nodes ($R=3$) -> read succeeds | `FR-STO-6` | `tests/test_storage_chaos.py` | ✅ **PASS** |
| **AT-22** | Cert rotation (short TTL) without reflash / restart | `FR-ID-4` | `tests/test_simulator.py`, `tools/demo_cert_rotation.py` | ✅ **PASS** |
| **AT-23** | Stop 1 of 4 chain validators -> blocks continue | `NFR` | `tests/test_qbft_consensus.py`, `tools/chaos/kill_validator.sh` | ✅ **PASS** |
| **AT-24** | Simulator 500 devices load test -> 0% loss, p95 SLA | `NFR-3` | `tools/load_test_500.py` (5,000 msgs, p95 = 0.15ms) | ✅ **PASS** |
| **AT-25** | Database index rebuild from on-chain event ledger | `FR-BE-2` | `tests/test_indexer.py`, `tools/rebuild_index.py` | ✅ **PASS** |

---

## 3. Performance & Stress Test Benchmarks (AT-24)

Executed via `python3 tools/load_test_500.py --num-devices 500 --msgs-per-device 10`:

```
================================================================================
      SecureNodeX AT-24: 500-Device Concurrent Ingestion Load Test       
================================================================================
[*] Number of Devices:         500 concurrent async workers
[*] Total Target Messages:     5,000 messages
[*] Ingestion Status:          5,000 accepted / 0 dropped (0.00% Loss)
[*] Benchmark Elapsed Time:    0.63 seconds
[*] Ingestion Throughput:      7,965.55 msgs/sec

--- Latency Distribution (P-256 ECDSA Verify + Monotonic Replay Check) ---
  Min Latency:                 0.10 ms
  p50 (Median):                0.10 ms
  p90 Latency:                 0.14 ms
  p95 Latency:                 0.15 ms  (SLA: < 50.0 ms)
  p99 Latency:                 0.33 ms
  Max Latency:                 3.15 ms
================================================================================
```

---

## 4. Smart Contract Gas & Deployment Metrics (M2 / AT-18)

From Hardhat gas reporter on Besu zero-gas EVM configuration:

| Contract | Function Call | Min Gas | Max Gas | Avg Gas | Test Invocations |
|---|---|---|---|---|---|
| **`AssetRegistry`** | `mintAsset` | 213,760 | 213,760 | 213,760 | 5 |
| **`AssetRegistry`** | `transferAsset` | 84,090 | 84,090 | 84,090 | 1 |
| **`AuditLog`** | `record` | 40,089 | 74,289 | 57,189 | 4 |
| **`DataRegistry`** | `anchorBatch` | 171,401 | 171,401 | 171,401 | 1 |
| **`DataRegistry`** | `registerObject` | 149,038 | 149,050 | 149,044 | 2 |
| **`IdentityRegistry`** | `register` | 130,507 | 184,661 | 138,900 | 114 |
| **`IdentityRegistry`** | `revoke` | 45,797 | 45,797 | 45,797 | 1 |
| **`IdentityRegistry`** | `rotate` | 42,037 | 42,037 | 42,037 | 1 |
| **`StorageNodeRegistry`** | `addNode` | 203,448 | 225,832 | 214,640 | 2 |

---

## 5. Architectural Decision Records (ADRs)

| ADR ID | Title | Context & Decision | Spec Reference |
|---|---|---|---|
| **ADR-001** | Mosquitto Dynamic Auth Fallback | Implemented static ACL configuration generation and SIGHUP reloading with CRL verification as reliable fallback if external HTTP auth plugin is unavailable. | [docs/02_SECURITY_PKI.md#4](file:///Users/shankumar/Desktop/SecureNodeX7/docs/02_SECURITY_PKI.md#4) |
| **ADR-002** | Zero-Gas Enterprise Besu Model | Configured Besu QBFT with `zeroBaseFee: true` and `min-gas-price=0` to ensure predictable zero gas expenditure for telemetry batch anchoring. | [docs/09_DEPLOYMENT.md#1](file:///Users/shankumar/Desktop/SecureNodeX7/docs/09_DEPLOYMENT.md#1) |
| **ADR-003** | ECIES Key Wrapping for Multi-Grantee Storage | Object DEKs are wrapped using P-256 ECDH + HKDF-SHA256 + AES-256-GCM for owner and grantees, keeping encrypted chunks stored once while permitting selective access. | [docs/02_SECURITY_PKI.md#9](file:///Users/shankumar/Desktop/SecureNodeX7/docs/02_SECURITY_PKI.md#9) |
