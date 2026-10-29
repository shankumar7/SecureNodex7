# 07 - API Specification (snx-api)

Base: `https://<host>:8443/v1`. JSON unless stated. Errors follow RFC 7807 (`application/problem+json`) with `type, title, status, detail, correlation_id`. All mutating POST/PUT/DELETE accept `Idempotency-Key`. Pagination: `?limit=50&cursor=...` returns `{items, next_cursor}`. Every response includes `X-Correlation-Id`. OpenAPI must be served at `/openapi.json`.

## Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | none | `{username,password}` -> `{access_token, refresh_token, expires_in}` |
| POST | `/auth/refresh` | refresh token | rotate tokens |
| POST | `/auth/logout` | JWT | revoke refresh token |
| GET | `/me` | JWT | principal profile + roles |

## Principals and roles
| POST | `/principals` | Admin | create user `{username,password,roles,display_name}` |
| GET | `/principals` | Admin/Manager/Auditor | list/filter |
| GET | `/principals/{id}` | role-scoped | detail incl. on-chain status |
| PUT | `/principals/{id}/roles` | Admin (Manager limited) | `{roles:[...],reason}` -> chain + audit |
| POST | `/principals/{id}/suspend` `/reinstate` | Admin | status change |

## Devices and PKI
| POST | `/devices` | Admin/Manager | `{label, type, metadata}` -> `{device_id, enrollment_token?, status:"PENDING"}` |
| POST | `/devices/{id}/provision` | Admin/Manager | Mode A: returns one-time download URL of bundle (key+cert+chain), bundle shown once |
| POST | `/enroll` | token (server TLS only) | Mode B: `{csr_pem, token}` -> `{cert_pem, chain_pem}` |
| POST | `/enroll/renew` | device mTLS | `{csr_pem}` -> new cert (rotation) |
| GET | `/devices` / `/devices/{id}` | role-scoped | list/detail: status, last_seen, fingerprint, tx hash |
| POST | `/devices/{id}/revoke` | Admin/Manager | `{reason}`; target <= 5 s enforcement |
| POST | `/devices/{id}/rotate` | Admin/Manager | triggers `renew_cert` command |
| GET | `/devices/{id}/telemetry` | role-scoped | `?from&to&limit`; verified messages |

## Objects (decentralised storage)
| POST | `/objects` | User+ | multipart/streaming upload; fields `file`, `classification`; returns `{object_id, manifest_id, size, chunk_count, replication:{r,w}, tx_hash}` |
| GET | `/objects` | role-scoped | list my/shared objects |
| GET | `/objects/{id}` | role-scoped | metadata + health `{replicas_ok, under_replicated_chunks}` |
| GET | `/objects/{id}/download` | owner/grantee | streams; supports `Range` |
| GET | `/objects/{id}/placement` | owner/Admin/Manager/Auditor | chunk -> node map (dashboard demo view) |
| POST | `/objects/{id}/share` | owner/Admin | `{principal_id}` -> grant blob + chain |
| DELETE | `/objects/{id}/share/{principal_id}` | owner/Admin | revoke access |
| DELETE | `/objects/{id}` | owner/Admin | tombstone |
| GET | `/objects/{id}/verify` | owner/Auditor/Admin | recompute hashes + Merkle root vs chain |

## Assets
| POST | `/assets` | Admin/Manager | `{type, owner_id, name, metadata, device_id?, object_id?}` -> mint |
| GET | `/assets` `/assets/{id}` | role-scoped | detail incl. token id, tx, status |
| POST | `/assets/{id}/transfer` | owner/Manager/Admin | `{to_principal_id, reason}` |
| PATCH | `/assets/{id}` | Manager/Admin | status/metadata |

## Audit and proofs
| GET | `/audit` | Admin/Auditor/Manager(scoped) | filters: `type, actor, subject, from, to`; items include chain `seq`, `tx_hash`, `head` |
| GET | `/audit/verify` | Admin/Auditor | recompute hash chain from chain events; returns `{valid, checked, head}` |
| GET | `/batches` `/batches/{id}` | Admin/Manager/Auditor | batch list/detail |
| GET | `/batches/{id}/proof/{seq}` | Admin/Manager/Auditor | Merkle inclusion proof (docs/06) |

## Storage administration
| GET | `/storage/nodes` | Admin/Manager/Auditor | state, capacity, chunk counts |
| POST | `/storage/nodes` | Admin | register node `{id,endpoint,capacity,cert_fingerprint}` |
| POST | `/storage/nodes/{id}/drain` | Admin | drain |
| GET | `/storage/health` | Admin/Manager/Auditor | `{r, nodes_up, under_replicated, corrupt}` |
| POST | `/storage/repair` | Admin | trigger repair scan |

## Realtime and ops
| WS | `/stream` | JWT (query/Sec-WebSocket-Protocol) | topics: `telemetry`, `audit`, `storage`, `devices` |
| GET | `/healthz` `/readyz` | none | liveness/readiness |
| GET | `/metrics` | internal | Prometheus |

## Internal (mTLS `OU=service` only)
`GET /internal/devices/{id}/cert`, `POST /internal/mqtt/acl` (broker plugin), `POST /internal/mqtt/auth`, `POST /internal/gateway/batch`, `POST /internal/events/chain` (indexer webhook).

## Pydantic/OpenAPI rules
Strict models, `extra="forbid"`, explicit enums for roles/status/types, UUID/hex validators, max sizes. Generate TypeScript client for the dashboard from OpenAPI.
