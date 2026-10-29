# 00 - Project Definition

## 1. Problem
Centralised identity and asset systems create single points of failure, cannot prove who did what, keep ownership in disconnected silos, and have no tamper-proof history. IoT makes it worse: devices are constrained, physically exposed, and numerous.

## 2. Goal
Build a **working, scalable prototype** of a decentralised trust platform where:
1. Every device/user/storage-node has a unique cryptographic identity.
2. All communication is mutually authenticated (mTLS) and ECC-based.
3. Data is stored in a decentralised way: **split into chunks and replicated** across independent nodes.
4. Access is governed by RBAC enforced in several layers.
5. Devices and files are managed as digital assets with provable ownership.
6. Every important action is auditable and tamper-evident.
7. Constrained devices (ESP32) are first-class citizens.

## 3. Numbered requirements (every requirement must map to a test in docs/10)
### Identity
- **FR-ID-1** Each device has a unique ID, its own P-256 key pair, and an X.509 certificate issued by the SecureNodeX CA.
- **FR-ID-2** Identity (ID, role, certificate fingerprint, status) is registered in the on-chain IdentityRegistry.
- **FR-ID-3** Revocation takes effect at the broker in <= 5 seconds.
- **FR-ID-4** Certificate/key rotation works without re-flashing firmware (renewal over mTLS).
### Security
- **FR-SEC-1** mTLS on: device<->broker, service<->service, client<->storage node, API (server TLS + JWT; optional client cert).
- **FR-SEC-2** Asymmetric crypto is ECC only (P-256 ECDSA/ECDH; secp256k1 for chain accounts). Symmetric: AES-256-GCM. Hash: SHA-256 (keccak256 on-chain).
- **FR-SEC-3** Every device message carries an ECDSA signature verified by the gateway.
- **FR-SEC-4** Replay protection via monotonic sequence + timestamp.
### RBAC
- **FR-RBAC-1** Roles: Admin, Manager, Auditor, User, Device (+ Storage-Node, Operator service roles).
- **FR-RBAC-2** Enforced at API, MQTT broker ACL, smart contracts and storage nodes.
- **FR-RBAC-3** Role changes are auditable and take effect immediately.
### Storage (decentralised)
- **FR-STO-1** Any upload (from laptop UI/CLI, or a device telemetry batch) is **split into fixed-size chunks**.
- **FR-STO-2** Each chunk is stored on **R >= 3** distinct nodes (configurable). A write succeeds when **W >= 2** replicas acknowledge; the rest complete asynchronously.
- **FR-STO-3** When there are more nodes than R and the object has >= 2 chunks, **no single node holds all chunks** of the object (diversity rule).
- **FR-STO-4** Chunks are encrypted client/coordinator-side with AES-256-GCM before leaving the coordinator; nodes only see ciphertext.
- **FR-STO-5** Integrity is verified on every read (SHA-256 chunk id + Merkle root anchored on-chain).
- **FR-STO-6** The system survives the loss of any R-1 nodes with no data loss and self-heals back to R replicas.
- **FR-STO-7** Placement is visible in the dashboard (which chunk lives on which node) for demo.
### Assets
- **FR-AST-1** Devices and files can be registered as assets (ERC-721-based) with owner, metadata reference and status.
- **FR-AST-2** Ownership transfer and status changes are policy-checked and recorded on-chain.
### Audit
- **FR-AUD-1** Every security-relevant action (enroll, revoke, role change, access allowed/denied, upload, download, transfer, anchor) produces an audit event.
- **FR-AUD-2** Audit log is hash-chained; `/v1/audit/verify` proves it has not been altered.
### Backend workflow
- **FR-BE-1** One consistent pipeline: enroll -> authenticate -> authorize -> ingest -> store -> anchor -> audit -> display.
- **FR-BE-2** Stateless API replicas can scale horizontally; Postgres is a rebuildable index/cache.
### Non-functional
- **NFR-1** Prototype runs from `make up-*` using Docker Compose on each host.
- **NFR-2** ESP32 firmware budget: <= 60 KB heap for TLS + messaging; payloads <= 1 KiB.
- **NFR-3** Simulator can drive >= 500 virtual devices against the stack.
- **NFR-4** Every module has automated tests; CI runs them.

## 4. Non-goals (do not build)
Production-grade HSM integration, public-chain deployment, mobile app, user-signed meta-transactions (stretch only), full erasure coding (stretch only), multi-region.

## 5. Honest limitations (state them in the demo)
- Cryptography proves data **integrity and origin**, not that the sensor measured correctly.
- Without an ATECC608 secure element, the ESP32 private key lives in flash. Mitigate with flash encryption + secure boot; secure element is the production path.
- Chain writes go through role-gated **operator accounts** (backend/gateway), so the backend is a trusted writer. Chain, storage and CA are still decentralised/verifiable; user-signed transactions are future work.

## 6. Hardware inventory
2 x Raspberry Pi, 3 x ESP32, 6 x laptops (see docs/09 for role mapping).

## 7. Glossary
- **Principal**: any identity (user, device, storage node, service).
- **DID**: `did:snx:<principal_id>` where `principal_id` = 16 random bytes, lowercase hex.
- **Fingerprint**: lowercase hex SHA-256 of the certificate SubjectPublicKeyInfo DER.
- **Object**: a stored file/blob. **Chunk**: a fixed-size piece. **Manifest**: ordered chunk list + metadata.
- **Anchor**: writing a hash/Merkle root to the blockchain.
- **Operator**: backend/gateway/worker chain account allowed to write contracts.
