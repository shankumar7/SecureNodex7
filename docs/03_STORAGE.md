# 03 - Decentralised Storage (SNX-Store)

Requirement recap: **any data uploaded from any laptop must be split, encrypted and kept in multiple copies on different nodes**, with no single point of failure.

## 1. Parameters (all configurable via env)
| Name | Default | Demo value | Meaning |
|------|---------|-----------|---------|
| `CHUNK_SIZE` | 262144 (256 KiB) | 65536 (64 KiB) | Fixed chunk size (last chunk may be smaller) |
| `REPLICATION_R` | 3 | 3 | Target replicas per chunk |
| `WRITE_QUORUM_W` | 2 | 2 | Acks needed before write is reported successful |
| `HEARTBEAT_S` | 10 | 5 | Node heartbeat interval |
| `NODE_DOWN_AFTER` | 3 missed | 3 | Marks node DOWN |
| `GC_GRACE_S` | 86400 | 300 | Delay before deleting surplus/orphan chunks |
| `ENCRYPT` | true | true | AES-256-GCM per chunk |
| `REDUNDANCY_MODE` | replication | replication | `rs-3-2` erasure coding is a stretch goal |

Nodes (target): storage-pi1, storage-pi2, storage-l2, storage-l3, storage-l4 (5 nodes).
With a 1 MiB file and 64 KiB chunks: 16 chunks x 3 replicas = 48 chunk copies spread over 5 nodes.

## 2. Concepts
- **Chunk id** = lowercase hex SHA-256 of the *stored bytes* (ciphertext). Content-addressed, self-verifying.
- **Manifest** = immutable JSON describing the object and its ordered chunks. Stored as a replicated blob (kind=manifest). `manifest_id` = SHA-256 of canonical (RFC 8785 JCS) manifest JSON.
- **Merkle root** over ordered chunk ids (leaf = SHA-256(0x00||chunk_id_bytes), node = SHA-256(0x01||l||r), odd node promoted). Anchored on-chain.
- **Grant blob** = small replicated blob holding an ECIES-wrapped DEK for one grantee.

### Manifest schema (v1)
```json
{
  "v": 1,
  "object_id": "uuid",
  "name": "report.pdf",
  "mime": "application/pdf",
  "size": 1048576,
  "created_at": "2026-10-09T10:00:00Z",
  "owner": "did:snx:<principal_id>",
  "chunk_size": 65536,
  "redundancy": {"mode": "replication", "r": 3},
  "encryption": {"alg": "AES-256-GCM", "aad": "object_id||chunk_index"},
  "chunks": [
    {"i": 0, "id": "<sha256 hex of ciphertext>", "len": 65552, "nonce": "<b64 12 bytes>"}
  ],
  "merkle_root": "<hex>",
  "classification": "internal"
}
```
`len` is ciphertext length (plaintext + 16-byte GCM tag). Placement hints are NOT in the manifest (membership changes); the authoritative placement is computed by HRW over current membership and reconciled with node inventories.

## 3. Upload pipeline (streaming - never buffer whole file)
```
read stream -> split to CHUNK_SIZE -> encrypt (AES-256-GCM, fresh 12B nonce, AAD=object_id||i)
 -> id = sha256(ciphertext) -> placement = HRW(id, live_nodes, R)
 -> PUT to R nodes in parallel (mTLS) -> wait >= W acks (timeout 5 s, retry next-ranked node)
 -> record chunk_replicas rows (state=stored|pending)
after last chunk:
 -> diversity rule check (3.2) -> build manifest + merkle root
 -> store manifest blob (R replicas) -> wrap DEK for owner -> store grant blob
 -> DataRegistry.registerObject(...) -> audit OBJECT_CREATED -> respond {object_id, manifest_id, tx_hash}
```
If any chunk fails to reach W acks: abort, mark partial chunks for GC, return 503, audit `OBJECT_UPLOAD_FAILED`.

### 3.1 Placement - Rendezvous (HRW) hashing
```python
def place(chunk_id: str, nodes: list[Node], r: int) -> list[Node]:
    eligible = [n for n in nodes if n.state == "UP" and not n.draining and n.free_bytes > MIN_FREE]
    ranked = sorted(
        eligible, key=lambda n: sha256(f"{n.id}:{chunk_id}".encode()).digest(), reverse=True
    )
    return ranked[:r]  # if fewer than r eligible: return all, flag under-replicated
```
Adding/removing a node only moves ~1/N of chunks.

### 3.2 Diversity rule (FR-STO-3)
After computing placements for all chunks of an object: if `len(chunks) >= 2` and `len(eligible_nodes) > R` and one node appears in **every** chunk's placement, replace that node in one chunk's placement with the next-ranked node not already holding that chunk. Re-run until satisfied (max 3 iterations).

## 4. Read pipeline
1. Authorise (RBAC + `DataRegistry.canRead`). 2. Load manifest (any replica; verify `sha256(manifest) == manifest_id` from chain). 3. For chunk i: try HRW-ranked nodes then inventory-known holders; GET; verify `sha256(body) == id`; on mismatch mark replica corrupt and try next. 4. Decrypt (verify GCM tag). 5. Stream. 6. Verify Merkle root at end; audit `OBJECT_READ`.
Support HTTP Range reads by mapping byte ranges to chunk indexes.

## 5. Storage node API (snx-storage, mTLS only)
| Method | Path | Notes |
|--------|------|-------|
| PUT | `/v1/chunks/{id}` | Header `X-SNX-Kind: data\|manifest\|grant`. Node verifies `sha256(body)==id`, rejects mismatch (422). Idempotent. |
| GET | `/v1/chunks/{id}` | Streams bytes. 404 if absent. |
| HEAD | `/v1/chunks/{id}` | Existence + size. |
| DELETE | `/v1/chunks/{id}` | Only from `OU=service` with role Operator; used by GC. |
| POST | `/v1/replicate` | Body `{chunk_id, source_node}`: pull from peer, verify, store (used by repair). |
| GET | `/v1/inventory?cursor=` | Paged list of `{id, size, kind, stored_at}`. |
| GET | `/v1/health` | `{node_id, free_bytes, used_bytes, chunks, version}`; also heartbeat target. |
Authorisation: client cert must chain to the SecureNodeX CA with `OU in {service, storage-node}`; the node checks the caller's on-chain/DB role. Nodes never receive plaintext or keys.
Storage backend: filesystem sharded by first 2 hex chars (`/data/ab/abcdef...`), atomic write (tmp + fsync + rename). Prefer USB SSD on Pis (SD card wear). Streaming I/O only (Pi RAM).

## 6. Membership and health
- Nodes register in `StorageNodeRegistry` (endpoint, capacity, cert fingerprint). Coordinator reads membership from the DB (synced from chain events).
- Coordinator/worker polls `/v1/health` every `HEARTBEAT_S`; state machine UP -> SUSPECT -> DOWN -> (return) SYNCING -> UP.
- Draining: `POST /v1/storage/nodes/{id}/drain` stops new placements and migrates chunks away.

## 7. Self-healing (snx-worker)
Every 30 s (and immediately on node DOWN):
1. Query chunks where live replica count < R (`chunk_replicas` join `nodes`).
2. For each: choose targets by HRW over live nodes excluding current holders; call target `POST /v1/replicate` with a healthy source; verify; insert replica row.
3. Rate-limit (e.g. 20 concurrent copies) to protect Pis.
4. When a node returns: reconcile its inventory; surplus replicas (> R) become GC candidates after `GC_GRACE_S`.
5. Periodic scrub: sample-verify replicas (HEAD + occasional full hash) -> mark corrupt -> repair.
Emit audit events: `NODE_DOWN`, `NODE_UP`, `REPAIR_STARTED`, `REPAIR_COMPLETED`, `CHUNK_CORRUPT`.

## 8. Deletion
`DELETE /v1/objects/{id}` -> `DataRegistry.tombstone` (audit) -> worker removes chunks after grace if not referenced by another manifest (refcount table). Tombstones are permanent on-chain.

## 9. Postgres tables (index only; rebuildable)
`nodes(id, endpoint, state, free_bytes, last_heartbeat, fingerprint)`
`objects(id, manifest_id, owner, name, size, chunk_count, merkle_root, status, created_at)`
`chunks(id, object_id, idx, len, kind, nonce)`
`chunk_replicas(chunk_id, node_id, state, verified_at)` state: pending|stored|corrupt|missing
`object_grants(object_id, grantee, grant_blob_id)`
Rebuild procedure (`tools/rebuild_index.py`): replay chain events -> fetch manifests from nodes -> repopulate tables -> reconcile inventories.

## 10. Failure scenarios (must all pass; see docs/10)
| Scenario | Expected |
|----------|----------|
| 1 node killed during idle | Reads succeed; repair restores R replicas within 2 min (demo scale) |
| 2 nodes killed (R=3) | Reads still succeed; under-replicated flagged; repair continues |
| 1 node killed mid-upload | Upload completes using next-ranked nodes; W met |
| Chunk corrupted on disk | Read detects hash mismatch, uses other replica, repair replaces |
| Fewer than W nodes up | Upload returns 503, nothing partial committed |
| Node returns after downtime | Inventory reconciled; no duplicates beyond grace |

## 11. Stretch: erasure coding
`REDUNDANCY_MODE=rs-3-2`: Reed-Solomon (k=3 data + m=2 parity) per stripe of 3 chunks, any 3 of 5 shards reconstruct. Implement only after replication mode is fully tested. Manifest `redundancy` field and shard ids extend the schema; do not change v1 semantics.

## 12. Metrics
`snx_storage_chunks_total{node}`, `snx_storage_bytes{node}`, `snx_under_replicated_chunks`, `snx_repair_copies_total`, `snx_upload_seconds`, `snx_read_fallbacks_total`, `snx_corrupt_chunks_total`.
