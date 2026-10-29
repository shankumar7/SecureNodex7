# 04 - Smart Contracts

Solidity ^0.8.24, OpenZeppelin v5, Hardhat + TypeScript tests, ethers.js v6. Chain id `20260`. Deploy script writes `deployments/<network>.json` with all addresses + ABI export to `backend/app/chain/abi/`.

## 1. Conventions
- `principalId` = `keccak256(bytes(did))` where `did = "did:snx:" + principal_id_hex`.
- Every state-changing function takes `bytes32 actor` (acting principal) and is callable only by an account with `OPERATOR_ROLE` (backend, gateway, worker). The contract verifies `actor` has the required role in IdentityRegistry.
- All state changes emit events. Contracts also call `AuditLog.record` for security-relevant events (or the indexer derives audit from events - choose one and document in ADR; default: explicit `AuditLog.record`).
- Role bitmask: `ADMIN=1, MANAGER=2, AUDITOR=4, USER=8, DEVICE=16, STORAGE_NODE=32`.
- Status enum: `ACTIVE, SUSPENDED, REVOKED`.

## 2. Contracts
### 2.1 OperatorAccess (OZ AccessControl)
Roles: `DEFAULT_ADMIN_ROLE` (deployer / multisig in prod), `OPERATOR_ROLE`. Other contracts inherit/consult it.

### 2.2 IdentityRegistry
```solidity
enum Kind { USER, DEVICE, STORAGE_NODE, SERVICE }
struct Identity { Kind kind; uint32 roles; Status status; bytes32 certFingerprint; bytes32 metaHash; uint64 createdAt; uint64 updatedAt; }
function register(bytes32 id, Kind kind, uint32 roles, bytes32 certFingerprint, bytes32 metaHash, bytes32 actor) external;
function setRoles(bytes32 id, uint32 roles, bytes32 actor) external;     // actor ADMIN (MANAGER may manage DEVICE only)
function rotate(bytes32 id, bytes32 newFingerprint, bytes32 actor) external;
function suspend(bytes32 id, bytes32 reason, bytes32 actor) external;
function revoke(bytes32 id, bytes32 reason, bytes32 actor) external;
function reinstate(bytes32 id, bytes32 actor) external;                   // ADMIN only; not allowed after REVOKED
function get(bytes32 id) external view returns (Identity memory);
function hasRole(bytes32 id, uint32 roleMask) external view returns (bool);
function isActive(bytes32 id) external view returns (bool);
event IdentityRegistered(bytes32 indexed id, Kind kind, uint32 roles, bytes32 fingerprint);
event RolesChanged(bytes32 indexed id, uint32 oldRoles, uint32 newRoles, bytes32 indexed actor);
event IdentityRotated(bytes32 indexed id, bytes32 oldFp, bytes32 newFp);
event IdentityStatusChanged(bytes32 indexed id, Status status, bytes32 reason, bytes32 indexed actor);
```
Rules: first identity registered is bootstrap Admin (set in deploy script). Only ADMIN grants ADMIN. MANAGER may register/revoke DEVICE identities. REVOKED is terminal.

### 2.3 StorageNodeRegistry
```solidity
struct Node { bytes32 id; string endpoint; uint64 capacityBytes; bytes32 certFingerprint; Status status; }
function addNode(bytes32 id, string calldata endpoint, uint64 capacityBytes, bytes32 fp, bytes32 actor) external;   // ADMIN
function updateNode(bytes32 id, string calldata endpoint, uint64 capacityBytes, bytes32 actor) external;
function setNodeStatus(bytes32 id, Status s, bytes32 actor) external;
function listNodes() external view returns (Node[] memory);
event NodeAdded(...); event NodeUpdated(...); event NodeStatusChanged(...);
```
A node's identity must also exist in IdentityRegistry with role STORAGE_NODE.

### 2.4 AssetRegistry (ERC-721 based)
- Extends OZ `ERC721`. Token owner address = custodial address derived from principal: `address(uint160(uint256(principalId)))`. Standard `approve/transferFrom/safeTransferFrom` are **disabled** (revert); transfers only through `transferAsset`.
```solidity
enum AssetType { DEVICE, FILE, DOCUMENT, LICENSE, OTHER }
struct Asset { bytes32 assetKey; AssetType aType; bytes32 ownerId; bytes32 metadataManifestId; AssetStatus status; uint64 createdAt; }
function mintAsset(bytes32 assetKey, AssetType t, bytes32 ownerId, bytes32 metadataManifestId, bytes32 actor) external returns (uint256 tokenId);
function transferAsset(uint256 tokenId, bytes32 toId, bytes32 actor) external;     // actor = owner or MANAGER/ADMIN; recipient must be ACTIVE
function setAssetStatus(uint256 tokenId, AssetStatus s, bytes32 actor) external;   // ACTIVE, MAINTENANCE, RETIRED
function updateMetadata(uint256 tokenId, bytes32 newManifestId, bytes32 actor) external;
function ownerPrincipal(uint256 tokenId) external view returns (bytes32);
event AssetMinted(uint256 indexed tokenId, bytes32 indexed assetKey, bytes32 indexed ownerId, AssetType t);
event AssetTransferred(uint256 indexed tokenId, bytes32 indexed fromId, bytes32 indexed toId, bytes32 actor);
event AssetStatusChanged(uint256 indexed tokenId, AssetStatus s, bytes32 actor);
```
`tokenURI` returns `snx://manifest/<hex>`.

### 2.5 DataRegistry
```solidity
struct ObjectRec { bytes32 manifestId; bytes32 merkleRoot; bytes32 ownerId; uint64 size; uint32 chunkCount; uint8 classification; uint64 createdAt; bool tombstoned; }
function registerObject(bytes32 objectId, bytes32 manifestId, bytes32 merkleRoot, uint64 size, uint32 chunkCount, uint8 classification, bytes32 actor) external;
function grantAccess(bytes32 objectId, bytes32 granteeId, bytes32 grantBlobId, bytes32 actor) external;   // owner/ADMIN
function revokeAccess(bytes32 objectId, bytes32 granteeId, bytes32 actor) external;
function tombstone(bytes32 objectId, bytes32 actor) external;                                              // owner/ADMIN
function canRead(bytes32 objectId, bytes32 principal) external view returns (bool); // owner, grantee, ADMIN, AUDITOR(metadata only - see RBAC)
function anchorBatch(bytes32 batchId, bytes32 deviceGroup, bytes32 merkleRoot, bytes32 manifestId, uint32 count, uint64 fromTs, uint64 toTs, bytes32 actor) external; // gateway/worker operator
function verifyAnchor(bytes32 batchId, bytes32 merkleRoot) external view returns (bool);
event ObjectRegistered(bytes32 indexed objectId, bytes32 indexed ownerId, bytes32 manifestId, bytes32 merkleRoot);
event AccessGranted(bytes32 indexed objectId, bytes32 indexed granteeId, bytes32 grantBlobId, bytes32 actor);
event AccessRevoked(bytes32 indexed objectId, bytes32 indexed granteeId, bytes32 actor);
event ObjectTombstoned(bytes32 indexed objectId, bytes32 actor);
event BatchAnchored(bytes32 indexed batchId, bytes32 merkleRoot, bytes32 manifestId, uint32 count);
```
Anchors are immutable: re-anchoring an existing `batchId` reverts.

### 2.6 AuditLog
```solidity
function record(bytes32 eventType, bytes32 actor, bytes32 subject, bytes32 dataHash, bytes32 correlationId) external; // OPERATOR only
bytes32 public head;   // head = keccak256(abi.encode(head, eventType, actor, subject, dataHash, correlationId, block.timestamp, seq))
uint256 public seq;
event AuditEvent(uint256 indexed seq, bytes32 indexed eventType, bytes32 indexed actor, bytes32 subject, bytes32 dataHash, bytes32 correlationId, bytes32 prevHead, bytes32 newHead);
```
`eventType` = `keccak256("DEVICE_REGISTERED")` etc. Event list: DEVICE_REGISTERED, DEVICE_REVOKED, CERT_ROTATED, ROLE_CHANGED, AUTH_DENIED, ACCESS_DENIED, OBJECT_CREATED, OBJECT_READ, OBJECT_SHARED, OBJECT_DELETED, ASSET_MINTED, ASSET_TRANSFERRED, BATCH_ANCHORED, NODE_ADDED, NODE_DOWN, NODE_UP, REPAIR_COMPLETED, CHUNK_CORRUPT, SIGNATURE_INVALID, REPLAY_REJECTED.
High-volume events (e.g. each OBJECT_READ) may be batched: worker records a Merkle root of the batch with count; document in ADR.

## 3. Test requirements (Hardhat)
- Role matrix: every function tested for allowed/forbidden actor roles.
- Revoked identity cannot act; REVOKED cannot be reinstated.
- ERC-721 standard transfer functions revert; `transferAsset` policy tests.
- Anchor immutability; verifyAnchor true/false.
- AuditLog head chain recomputation test; gas report.
- Fuzz: random role masks never allow privilege escalation to ADMIN.
- Only OPERATOR accounts can call; random account reverts.

## 4. Deployment
`npx hardhat run scripts/deploy.ts --network <hardhat|localnode|besu>`; script grants OPERATOR_ROLE to configured accounts, registers bootstrap admin, writes deployments JSON. Besu network: chain id 20260, QBFT, gas price 0 (free gas), block period 2 s.
