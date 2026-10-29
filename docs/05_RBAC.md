# 05 - RBAC

## 1. Roles
| Role | Bit | Who | Intent |
|------|-----|-----|--------|
| Admin | 1 | Org administrators | Full control, role grants, node management |
| Manager | 2 | Operations managers | Manage devices and assets, not roles above USER |
| Auditor | 4 | Compliance | Read-only on audit, metadata, proofs; no data content |
| User | 8 | Staff/end users | Own objects, shared objects, own assets |
| Device | 16 | IoT devices | Publish own telemetry only |
| Storage-Node | 32 | storage nodes | Store/serve chunks only |
Service identities (gateway, api, worker, ca) use `OU=service` certs + operator accounts; they are not user roles.

## 2. Permission matrix (Y = allowed, O = only own/shared, M = metadata only)
| Permission | Admin | Manager | Auditor | User | Device | Node |
|-----------|:----:|:-------:|:-------:|:----:|:------:|:----:|
| principal:create (user) | Y | - | - | - | - | - |
| principal:set-roles | Y | Manager may set USER/DEVICE only | - | - | - | - |
| device:enroll / revoke / rotate | Y | Y | - | - | - | - |
| device:read | Y | Y | Y | O | O (self) | - |
| object:create | Y | Y | - | Y | - | - |
| object:read content | Y | O | - | O | - | - |
| object:read metadata | Y | Y | Y | O | - | - |
| object:share / delete | Y | O | - | O | - | - |
| asset:mint | Y | Y | - | - | - | - |
| asset:transfer | Y | Y | - | O (own) | - | - |
| asset:read | Y | Y | Y | O | - | - |
| audit:read | Y | Y (scoped) | Y | O (own events) | - | - |
| audit:verify | Y | Y | Y | - | - | - |
| storage:nodes manage | Y | - | - | - | - | - |
| storage:health read | Y | Y | Y | - | - | - |
| mqtt:publish own telemetry | - | - | - | - | Y | - |
| chunk:put/get | - | - | - | - | - | Y (peer replicate) |
Admin content access is logged like any other (`OBJECT_READ`). Optional policy flag `ADMIN_CONTENT_ACCESS=false` blocks admins from decrypting others' objects unless granted.

## 3. Separation of duties
- Admin cannot self-demote the last Admin (API + contract guard).
- Role changes require `reason`; Admin granting Admin requires a second Admin approval (`pending_role_changes` table + `POST /v1/principals/{id}/roles/approve`) - stretch if time is short; at minimum audit it.
- Auditors cannot modify anything (API 403, contract revert).

## 4. Enforcement points (defence in depth)
1. **API**: FastAPI dependency `require(permission)` reads JWT roles; resource-level checks (owner/shared) in service layer. Deny by default.
2. **MQTT broker ACL** (generated/checked from identity registry):
   - Device `d`: publish `snx/v1/dev/d/telemetry|status|event|ack`; subscribe `snx/v1/dev/d/cmd`; nothing else. LWT topic `snx/v1/dev/d/status`.
   - Gateway service: subscribe `snx/v1/dev/+/#`; publish `snx/v1/dev/+/cmd`.
   - Everyone else: no access.
3. **Smart contracts**: role bitmask checks inside every function (docs/04).
4. **Storage nodes**: accept only certs with allowed OU + active identity; no plaintext, no key material.
5. **Dashboard**: hides unauthorised actions (UX only; never a security control).

## 5. Policy evaluation order
1. Authenticated? (mTLS cert or JWT valid, identity ACTIVE on chain/cache)
2. Role has the permission? (matrix above)
3. Resource constraint satisfied? (owner / grantee / scope)
4. Extra policy flags (classification level, time window, ADMIN_CONTENT_ACCESS)
5. Allow -> perform action -> audit `*` ; Deny -> HTTP 403/MQTT deny -> audit `ACCESS_DENIED` with reason.

## 6. Data classification (simple)
`0 public, 1 internal, 2 confidential`. Confidential objects require owner or explicit grant even for Admin when `ADMIN_CONTENT_ACCESS=false`.

## 7. Required tests
Table-driven test per matrix cell (API), per-topic ACL tests (broker), contract role tests, "deny by default" test for unknown permission strings, last-admin guard, revoked-principal-denied everywhere.
