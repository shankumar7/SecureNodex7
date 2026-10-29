# 08 - ESP32 Firmware Specification

Written and flashed by the team (Arduino-ESP32 or ESP-IDF; PlatformIO recommended). This spec is the contract between firmware and backend. Antigravity must not write firmware unless explicitly asked; it may write the **simulator** that behaves identically.

## 1. Responsibilities
Boot -> load credentials -> Wi-Fi -> NTP time sync -> mTLS connect to broker -> publish signed telemetry -> persist offline queue -> renew certificate before expiry -> report status/LWT.

## 2. Credentials (from `pki/provision-device.py`)
Files per device: `device.key` (P-256 PEM), `device.crt`, `ca-chain.pem`, `config.json` `{device_id, broker_host, broker_port:8883, publish_interval_s}`.
Storage: LittleFS partition (or NVS blobs). **Enable flash encryption and secure boot v2** for the demo build if possible; otherwise state the limitation. Never commit keys; `firmware/credentials/` is git-ignored.

## 3. Boot sequence
1. Init serial, NVS, LittleFS; load config + credentials; validate PEM parse.
2. Connect Wi-Fi (retry with backoff, max 60 s then deep-sleep/retry).
3. **NTP sync** (pool.ntp.org + local fallback); refuse to open TLS until time is valid (> 2026-01-01).
4. Check certificate validity window; if expired or < 20% lifetime left, attempt renew (section 7).
5. MQTT over TLS 1.2, client cert = device cert, server verify against `ca-chain.pem`, MQTT client id = `device_id`, LWT on status topic.
6. Publish `status` online (retain) and a signed `event` `BOOT`.
7. Enter loop.

## 4. Main loop
Every `publish_interval_s` (default 10): read sensors (or synthetic values) -> build payload JSON -> base64url -> build signing input -> SHA-256 -> ECDSA sign -> DER->raw r||s -> base64url -> envelope JSON (<= 1024 B) -> publish QoS 1 to `snx/v1/dev/<id>/telemetry`. Increment `seq` after each message.

### Sequence persistence
Persist `seq` in NVS every 16 messages; on boot set `seq = stored + 32` so reboot never reuses a number.

## 5. Signing reference (docs/06 section 3)
```
input  = "SNX1\n" + d + "\n" + s + "\n" + t + "\n" + y + "\n" + p
digest = SHA256(input)                            // mbedtls_sha256
sig    = mbedtls_pk_sign(pk, MBEDTLS_MD_SHA256, digest, 32, der_buf, ...)   // DER
raw    = der_to_raw_rs(sig)                       // 64 bytes: r(32) || s(32), left pad zeros
g      = base64url_nopad(raw)
```
Validate against `tools/gen_test_vector.py` output before integrating with the broker.

## 6. Offline-first behaviour
- If MQTT is unavailable: keep signing and store envelopes in a ring buffer file (LittleFS) up to N=200 messages (~200 KB); drop oldest when full and increment a `dropped` counter reported in the next status.
- On reconnect: flush oldest-first at <= 5 msg/s with original `s` and `t`.
- Never re-sign queued messages.

## 7. Certificate renewal (no reflash)
When `now > not_before + 0.8*(not_after - not_before)`: generate a new P-256 key, build CSR (CN=device_id), POST to `https://<api>:8443/v1/enroll/renew` over mTLS using the **current** cert, receive new cert, write new key+cert atomically (write to temp files, fsync, swap, keep old until first successful connect with new), reconnect. On failure keep old credentials and retry hourly. Also handle gateway `renew_cert` command.

## 8. Failure handling
| Event | Behaviour |
|-------|-----------|
| TLS handshake fails (cert rejected) | Back off exponential (5 s -> 5 min), stay offline, keep queueing, LED slow blink |
| Revoked | Same as above; do not hammer: max 1 attempt / 5 min after 5 failures |
| Wi-Fi lost | Reconnect loop; keep sensing |
| Time invalid | Do not connect; retry NTP |
| Heap < 20 KB | Log, skip publish cycle |

## 9. Resource budget
Heap for TLS+MQTT <= 60 KB; stack sizes explicit; message <= 1 KiB; avoid dynamic JSON libraries on hot path (use snprintf or ArduinoJson static doc 512 B); deep-sleep optional between cycles (reconnect cost noted).

## 10. Provisioning for 3 devices
Create 3 devices in dashboard/API (`esp32-01..03`), run provision tool per device, flash each with its own bundle. Never reuse a bundle across boards: uniqueness is part of the demo.

## 11. Firmware test checklist
- [ ] Test vector signature verifies on backend
- [ ] Connects with valid cert; broker shows client id = device_id
- [ ] Connect with cert from a different CA is rejected
- [ ] Revoked cert rejected within 5 s
- [ ] Publish to another device's topic denied
- [ ] Wi-Fi unplugged 60 s then restored: queued messages arrive in order
- [ ] Reboot: seq never decreases
- [ ] Short-TTL cert auto-renews
