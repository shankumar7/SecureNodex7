# 06 - Device Message Format and Merkle Batching

## 1. Topics (QoS 1, retain=false except status)
| Topic | Direction | Purpose |
|-------|-----------|---------|
| `snx/v1/dev/<device_id>/telemetry` | device -> | Signed sensor readings |
| `snx/v1/dev/<device_id>/event` | device -> | Signed discrete events (boot, tamper, error) |
| `snx/v1/dev/<device_id>/status` | device -> | Presence JSON `{"online":true,"fw":"0.1.0"}`; **LWT** publishes `{"online":false}`; retain=true |
| `snx/v1/dev/<device_id>/cmd` | -> device | Signed commands from gateway (reboot, renew-cert, config) |
| `snx/v1/dev/<device_id>/ack` | device -> | Command acknowledgement |
`device_id` = `d-` + 16 lowercase hex chars (equals cert CN). Broker ACL enforces topic id == cert CN.

## 2. Envelope (JSON, <= 1024 bytes total)
```json
{"v":1,"d":"d-0a1b2c3d4e5f6071","s":42,"t":1760000000,"y":"tel","p":"eyJ0ZW1wX2MiOjI0LjcsImh1bV9wY3QiOjUxLjJ9","g":"<base64url 64 bytes>"}
```
| Field | Type | Meaning |
|-------|------|---------|
| `v` | int | Format version = 1 |
| `d` | string | device_id |
| `s` | uint64 | Sequence number, strictly increasing per device |
| `t` | uint64 | Unix seconds (device clock after NTP sync) |
| `y` | string | `tel`, `evt`, `ack` |
| `p` | string | base64url (no padding) of payload bytes (JSON, UTF-8) |
| `g` | string | base64url (no padding) of raw ECDSA signature `r||s` (32+32 bytes) |

## 3. Signing (no JSON canonicalisation needed)
```
signing_input = "SNX1\n" + d + "\n" + s + "\n" + t + "\n" + y + "\n" + p      (ASCII/UTF-8, p exactly as transmitted)
digest        = SHA-256(signing_input)
g             = ECDSA-P256-Sign(device_private_key, digest)  -> convert DER to raw r||s (each 32 bytes, big-endian, left-padded)
```
Verification (gateway): rebuild `signing_input` from received fields, verify with the device's current (or grace-window previous) public key from its certificate; certificate fingerprint must equal the on-chain fingerprint.
Note for firmware: mbedTLS returns DER signatures; convert to raw r||s. Provide `tools/gen_test_vector.py` that outputs a key, envelope fields and expected signature verification so both sides can test.

## 4. Payload examples (inside `p`, before base64url)
Telemetry: `{"temp_c":24.7,"hum_pct":51.2,"vbat_mv":3980,"rssi":-61}`
Event: `{"code":"BOOT","fw":"0.1.0","reason":"power_on"}`
Keep payload <= ~600 bytes. Numeric fields only where possible. CBOR variant is a future v2.

## 5. Gateway verification pipeline (order matters)
1. Parse JSON, size <= 1024, `v==1`, `y` valid -> else drop + `MALFORMED` metric.
2. `d` equals topic device id equals authenticated client id -> else audit `ACCESS_DENIED`.
3. Device status ACTIVE (cache TTL <= 5 s) -> else drop + audit.
4. Timestamp: `|now - t| <= 300 s` for live messages; messages flagged `queued=true` by being older are accepted if `s` is new and `t <= now + 60`.
5. Replay: `s > last_seq[d]` (persisted per device) -> else audit `REPLAY_REJECTED`. Allow gaps (device reboot bumps seq by 32).
6. Signature valid -> else audit `SIGNATURE_INVALID`.
7. Accept: persist to hot buffer, update `last_seq`, metrics, push to dashboard WebSocket.
Rate limit: per-device max 5 msg/s sustained; excess dropped with metric.

## 6. Batching and anchoring
- Batch closes at 100 accepted messages **or** 30 s (configurable), per gateway instance.
- Batch object = JSONL, one verified envelope per line, ordered by arrival; stored via SNX-Store (split + replicated). Returns `manifest_id`.
- **Leaf** = `SHA-256(0x00 || signing_input_bytes || g_raw_bytes)`. **Node** = `SHA-256(0x01 || left || right)`. Odd node is promoted unchanged. Root = Merkle root.
- Anchor: `DataRegistry.anchorBatch(batchId, deviceGroup, root, manifestId, count, fromTs, toTs, actor)`. `batchId` = `keccak256(gateway_id || batch_seq)`.
- Inclusion proof for message i: list of `{hash, side}`; `GET /v1/batches/{id}/proof/{seq}` returns it. Verifier needs only the message, proof and on-chain root.

## 7. Commands (gateway -> device)
Same envelope with `y:"cmd"` and `d` = target, signed by the **gateway service key** (cert OU=service). Device pins the CA chain and checks command signature chains to a service cert (OU=service). Commands: `{"cmd":"renew_cert"}`, `{"cmd":"set_interval","sec":30}`, `{"cmd":"reboot"}`. Commands are optional for milestone 1.

## 8. Error handling matrix
| Condition | Gateway action | Audit |
|-----------|----------------|-------|
| Bad signature | drop | SIGNATURE_INVALID |
| Replay (seq <=) | drop | REPLAY_REJECTED |
| Revoked device | drop, force disconnect | AUTH_DENIED |
| Oversize/malformed | drop | (metric only) |
| Topic id != d | drop | ACCESS_DENIED |
