# 0001. Broker Authentication and ACL Strategy

## Status
Accepted

## Context
Per `docs/02_SECURITY_PKI.md` section 4 and `docs/05_RBAC.md`, Mosquitto 2.x serves as the MQTT entry point on port 8883 for IoT devices and backend services. The requirements mandate:
1. **mTLS with Certificate-Identity**: Mosquitto extracts the client Common Name (CN) as the authenticated username (`use_identity_as_username true`).
2. **ECDSA-Only Ciphers**: ECDHE-ECDSA-AES128-GCM-SHA256 and ECDHE-ECDSA-AES256-GCM-SHA384 on TLS 1.2+.
3. **Strict Topic ACLs**:
   - Device `d`: can only publish to `snx/v1/dev/<d>/telemetry`, `event`, `status`, `ack` and subscribe to `cmd`.
   - Service / Gateway: can subscribe to `snx/v1/dev/+/#` and publish commands.
4. **Sub-5-second Revocation**: Revocations must take effect within <= 5s (FR-ID-3).

## Decision
We implement a dual enforcement model:
1. **Dynamic Config & CRL Generation with Signal Reload**:
   - `broker/acl_gen.py` produces the canonical Mosquitto ACL (`acl.conf`) and CRL file (`crl.pem`).
   - When identities are enrolled, rotated, or revoked, the backend regenerates `acl.conf` and `crl.pem` and triggers a `SIGHUP` reload to Mosquitto.
2. **Gateway Defense-in-Depth Verification**:
   - In addition to broker-level mTLS and ACL checks, `snx-gateway` inspects every incoming message envelope, verifying:
     - The authenticated client CN matches the message `d` field and the topic device ID.
     - The device certificate is active and not revoked in the cache.
     - The per-message ECDSA signature verifies against the device's public key.
     - Monotonic sequence numbers and timestamp windows.

## Consequences
- **Security**: Double-layer isolation: Mosquitto blocks unauthorized network traffic at the edge; `snx-gateway` prevents forged payloads and replays.
- **Portability**: Standard Mosquitto 2.x container without proprietary C plugins, enabling multi-arch operation across x86_64 and ARM64 (Raspberry Pi).
- **Latency**: File write + SIGHUP reload takes < 200 ms, well within the 5-second target.
