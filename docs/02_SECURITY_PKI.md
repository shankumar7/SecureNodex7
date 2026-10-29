# 02 - Security and PKI

## 1. Algorithms (ECC-first)
| Purpose | Algorithm |
|---------|-----------|
| Device/user/service keys, certs, TLS | ECDSA P-256 (secp256r1) |
| Message signatures | ECDSA P-256 + SHA-256 |
| Key agreement (TLS, key wrapping) | ECDH P-256 (ECDHE in TLS) |
| Key wrapping for object keys | ECIES: ECDH P-256 + HKDF-SHA256 + AES-256-GCM |
| Chain accounts (operators only) | secp256k1 |
| Data encryption | AES-256-GCM |
| JWT signing | ES256 |
| Hash | SHA-256 (off-chain), keccak256 (on-chain ids) |
| Password hashing (users) | Argon2id |

## 2. PKI hierarchy
```
SecureNodeX Root CA (P-256, offline, 10y)        -> pki/root/ (NOT in git)
  +- SecureNodeX Intermediate CA (P-256, online in snx-ca, 1y)
        +- broker cert        (serverAuth, SAN DNS/IP, 90d)
        +- device certs       (clientAuth, CN=<device_id>, OU=device, 90d; demo 10 min..7d)
        +- service certs      (clientAuth+serverAuth, OU=service, CN=<svc>, 30d)
        +- storage-node certs (clientAuth+serverAuth, OU=storage-node, CN=<node_id>, 30d)
        +- user certs         (optional, OU=user)
```
- Certificate profile fields: Subject `O=SecureNodeX, OU=<kind>, CN=<id>`; SAN URI `did:snx:<principal_id>`; KeyUsage digitalSignature; EKU as above.
- All leaf certificates MUST use P-256 so ESP32 mbedTLS can verify chains with ECDSA only.
- `pki/` provides scripts: `make-root.sh`, `make-intermediate.sh`, `issue-cert.py`, `provision-device.py`, `revoke.py`, `gen-crl.py`.

## 3. Enrollment modes
**Mode A - Provisioning bundle (prototype default; matches "firmware carries key pair")**
`pki/provision-device.py --label esp32-01 --role device` generates a P-256 key, requests a cert from snx-ca (authenticated as Admin/Manager), and writes `out/<device_id>/{device.key,device.crt,ca-chain.pem,config.json}`. The team embeds these in the firmware image/LittleFS. Private keys are written once, `chmod 600`, git-ignored.

**Mode B - CSR enrollment (production-style; implement after Mode A works)**
Device generates the key on first boot, builds a CSR, sends it with a one-time token to `POST /v1/enroll` (server-TLS only endpoint). Token is single-use, 15 min TTL, bound to device_id.

## 4. mTLS configuration
### Mosquitto (snx-broker)
```
listener 8883
cafile   /mosquitto/certs/ca-chain.pem
certfile /mosquitto/certs/broker.crt
keyfile  /mosquitto/certs/broker.key
require_certificate true
use_identity_as_username true
tls_version tlsv1.2
ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384
allow_anonymous false
crlfile /mosquitto/certs/crl.pem
```
- Authorization (topic ACL + live revocation): use an auth plugin (e.g. mosquitto-go-auth HTTP backend calling `snx-api /internal/mqtt/acl`). **Verify plugin behaviour with cert-identity auth; if unsupported, fallback = generate `acl.conf` from DB and reload Mosquitto (SIGHUP) on any role/revocation change plus CRL reload.** Whichever is used must meet FR-ID-3 (<= 5 s).
- Internal services (gateway, api, worker) connect with their own service certs on the same listener or a second internal listener.
### HTTP services (api, ca, storage)
Python servers run behind uvicorn with TLS and `ssl.CERT_REQUIRED` for service-to-service ports (ca, storage). `snx-api` public port uses server TLS + JWT; internal admin routes (`/internal/*`) require client certs with `OU=service`.
### ESP32 constraints
TLS 1.2 with ECDHE-ECDSA suites (mbedTLS). Device clock must be set by NTP **before** TLS (cert validity). Broker/CA certs must be P-256 + SHA-256 signed.

## 5. Revocation
1. Admin calls revoke -> chain `IdentityRegistry.revoke(id, reason)`.
2. Indexer sees event -> updates DB status -> (a) invalidates gateway/API cache, (b) pushes deny to broker plugin or regenerates ACL/CRL, (c) disconnects the live MQTT client via broker admin hook.
3. All services re-check `status == ACTIVE` using a cache with TTL <= 5 s and event-driven invalidation.
4. Revoked device attempts to reconnect -> TLS handshake rejected or ACL denied -> audit `AUTH_DENIED`.

## 6. Rotation (no reflash)
- `POST /v1/enroll/renew` over mTLS with a new CSR signed by the **current** key (proof of possession). CA issues new cert; `IdentityRegistry.rotate(id, newFingerprint)`; old cert enters grace window (default 1 h) then revoked.
- Worker scans for certs expiring within 20% of lifetime and flags them (dashboard + audit `CERT_EXPIRING`). Demo config uses very short TTL to show rotation live.
- Service/storage-node certs rotate the same way (reload without restart).

## 7. Message-level security
See docs/06. mTLS protects the channel; the ECDSA signature protects each message end-to-end through brokers/gateways and enables later third-party verification via Merkle proofs.

## 8. User authentication
- Login with username + password (Argon2id) -> JWT (ES256, 15 min) + refresh token (8 h, rotating, stored hashed).
- JWT claims: `sub` (principal_id), `roles`, `jti`, `iat`, `exp`.
- Optional hardening: user client certificates for admin routes.

## 9. Object-key wrapping (ECIES)
Each object has a random 256-bit DEK. For each grantee: ephemeral P-256 key `e`, shared secret = ECDH(e, grantee_pub), KEK = HKDF-SHA256(secret, info="SNX-KEYWRAP-v1"), wrapped_dek = AES-256-GCM(KEK, DEK). Users' P-256 encryption keys are generated at registration; private half is stored encrypted under a key derived from the user's password (prototype) and never leaves the user's session in plaintext on the server beyond request scope. (Prototype simplification: coordinator performs wrap/unwrap in memory per request; document this clearly.)

## 10. Threat model (STRIDE-lite)
| Threat | Mitigation | Test |
|--------|-----------|------|
| Rogue device joins | mTLS with CA-issued cert + on-chain registry | AT-06 |
| Stolen/cloned device cert | Revocation <= 5 s; short TTL; secure element roadmap | AT-08 |
| Message tampering | Per-message ECDSA; Merkle anchor | AT-10 |
| Replay | seq monotonic + timestamp window | AT-11 |
| Topic hijack | ACL: topic id must equal cert CN | AT-09 |
| Compromised storage node | Ciphertext only, hash-verified chunks, no node has all chunks | AT-14, AT-16 |
| Storage node loss | R=3 replication + repair | AT-15 |
| Insider edits audit log | Hash-chained on-chain AuditLog + verify endpoint | AT-19 |
| Privilege escalation | Multi-layer RBAC + separation of duties | AT-17 |
| DoS flood | Broker rate limits, per-device quotas, payload cap 1 KiB | AT-12 |
| Expired clock on device | NTP required; reject connect if time invalid | firmware test |

## 11. Secrets policy
Never commit: any `*.key`, `*.pem` private keys, `.env`, wallet private keys, JWT keys, `pki/root/`. Ship `.env.example` only. Secrets are mounted from `./secrets/` (git-ignored) into containers.
