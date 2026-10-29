// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./OperatorAccess.sol";
import "./IdentityRegistry.sol";

/**
 * @title DataRegistry
 * @notice On-chain registry for stored objects, access grants, tombstones, and Merkle telemetry batch anchors.
 * @dev Spec: docs/04_CONTRACTS.md section 2.5
 */
contract DataRegistry is OperatorAccess {
    struct ObjectRec {
        bytes32 manifestId;
        bytes32 merkleRoot;
        bytes32 ownerId;
        uint64 size;
        uint32 chunkCount;
        uint8 classification;
        uint64 createdAt;
        bool tombstoned;
    }

    struct BatchAnchor {
        bytes32 batchId;
        bytes32 deviceGroup;
        bytes32 merkleRoot;
        bytes32 manifestId;
        uint32 count;
        uint64 fromTs;
        uint64 toTs;
        uint64 anchoredAt;
    }

    IdentityRegistry public immutable identityRegistry;

    mapping(bytes32 => ObjectRec) private _objects;
    mapping(bytes32 => bool) private _objectExists;
    mapping(bytes32 => mapping(bytes32 => bytes32)) private _accessGrants; // objectId => granteeId => grantBlobId

    mapping(bytes32 => BatchAnchor) private _batchAnchors;
    mapping(bytes32 => bool) private _batchExists;

    error ObjectAlreadyExists(bytes32 objectId);
    error ObjectNotFound(bytes32 objectId);
    error ObjectIsTombstoned(bytes32 objectId);
    error UnauthorizedActor(bytes32 actor);
    error BatchAlreadyAnchored(bytes32 batchId);
    error BatchNotFound(bytes32 batchId);

    event ObjectRegistered(bytes32 indexed objectId, bytes32 indexed ownerId, bytes32 manifestId, bytes32 merkleRoot);
    event AccessGranted(bytes32 indexed objectId, bytes32 indexed granteeId, bytes32 grantBlobId, bytes32 actor);
    event AccessRevoked(bytes32 indexed objectId, bytes32 indexed granteeId, bytes32 actor);
    event ObjectTombstoned(bytes32 indexed objectId, bytes32 actor);
    event BatchAnchored(bytes32 indexed batchId, bytes32 merkleRoot, bytes32 manifestId, uint32 count);

    constructor(address _identityRegistry) OperatorAccess() {
        identityRegistry = IdentityRegistry(_identityRegistry);
    }

    function registerObject(
        bytes32 objectId,
        bytes32 manifestId,
        bytes32 merkleRoot,
        uint64 size,
        uint32 chunkCount,
        uint8 classification,
        bytes32 actor
    ) external onlyOperator {
        if (_objectExists[objectId]) revert ObjectAlreadyExists(objectId);
        if (!identityRegistry.isActive(actor)) revert UnauthorizedActor(actor);

        _objects[objectId] = ObjectRec({
            manifestId: manifestId,
            merkleRoot: merkleRoot,
            ownerId: actor,
            size: size,
            chunkCount: chunkCount,
            classification: classification,
            createdAt: uint64(block.timestamp),
            tombstoned: false
        });
        _objectExists[objectId] = true;

        emit ObjectRegistered(objectId, actor, manifestId, merkleRoot);
    }

    function grantAccess(
        bytes32 objectId,
        bytes32 granteeId,
        bytes32 grantBlobId,
        bytes32 actor
    ) external onlyOperator {
        if (!_objectExists[objectId]) revert ObjectNotFound(objectId);
        ObjectRec storage obj = _objects[objectId];
        if (obj.tombstoned) revert ObjectIsTombstoned(objectId);

        bool isOwner = (actor == obj.ownerId);
        bool isActorAdmin = identityRegistry.hasRole(actor, identityRegistry.ROLE_ADMIN());
        if (!isOwner && !isActorAdmin) revert UnauthorizedActor(actor);

        _accessGrants[objectId][granteeId] = grantBlobId;
        emit AccessGranted(objectId, granteeId, grantBlobId, actor);
    }

    function revokeAccess(
        bytes32 objectId,
        bytes32 granteeId,
        bytes32 actor
    ) external onlyOperator {
        if (!_objectExists[objectId]) revert ObjectNotFound(objectId);
        ObjectRec storage obj = _objects[objectId];
        if (obj.tombstoned) revert ObjectIsTombstoned(objectId);

        bool isOwner = (actor == obj.ownerId);
        bool isActorAdmin = identityRegistry.hasRole(actor, identityRegistry.ROLE_ADMIN());
        if (!isOwner && !isActorAdmin) revert UnauthorizedActor(actor);

        delete _accessGrants[objectId][granteeId];
        emit AccessRevoked(objectId, granteeId, actor);
    }

    function tombstone(
        bytes32 objectId,
        bytes32 actor
    ) external onlyOperator {
        if (!_objectExists[objectId]) revert ObjectNotFound(objectId);
        ObjectRec storage obj = _objects[objectId];
        if (obj.tombstoned) revert ObjectIsTombstoned(objectId);

        bool isOwner = (actor == obj.ownerId);
        bool isActorAdmin = identityRegistry.hasRole(actor, identityRegistry.ROLE_ADMIN());
        if (!isOwner && !isActorAdmin) revert UnauthorizedActor(actor);

        obj.tombstoned = true;
        emit ObjectTombstoned(objectId, actor);
    }

    function canRead(bytes32 objectId, bytes32 principal) external view returns (bool) {
        if (!_objectExists[objectId]) return false;
        ObjectRec memory obj = _objects[objectId];
        if (obj.tombstoned) return false;

        if (principal == obj.ownerId) return true;
        if (_accessGrants[objectId][principal] != bytes32(0)) return true;
        if (identityRegistry.hasRole(principal, identityRegistry.ROLE_ADMIN())) return true;

        return false;
    }

    function getGrantBlob(bytes32 objectId, bytes32 granteeId) external view returns (bytes32) {
        return _accessGrants[objectId][granteeId];
    }

    function getObject(bytes32 objectId) external view returns (ObjectRec memory) {
        if (!_objectExists[objectId]) revert ObjectNotFound(objectId);
        return _objects[objectId];
    }

    function anchorBatch(
        bytes32 batchId,
        bytes32 deviceGroup,
        bytes32 merkleRoot,
        bytes32 manifestId,
        uint32 count,
        uint64 fromTs,
        uint64 toTs,
        bytes32 actor
    ) external onlyOperator {
        if (_batchExists[batchId]) revert BatchAlreadyAnchored(batchId);
        if (!identityRegistry.isActive(actor)) revert UnauthorizedActor(actor);

        _batchAnchors[batchId] = BatchAnchor({
            batchId: batchId,
            deviceGroup: deviceGroup,
            merkleRoot: merkleRoot,
            manifestId: manifestId,
            count: count,
            fromTs: fromTs,
            toTs: toTs,
            anchoredAt: uint64(block.timestamp)
        });
        _batchExists[batchId] = true;

        emit BatchAnchored(batchId, merkleRoot, manifestId, count);
    }

    function verifyAnchor(bytes32 batchId, bytes32 merkleRoot) external view returns (bool) {
        if (!_batchExists[batchId]) return false;
        return _batchAnchors[batchId].merkleRoot == merkleRoot;
    }

    function getBatch(bytes32 batchId) external view returns (BatchAnchor memory) {
        if (!_batchExists[batchId]) revert BatchNotFound(batchId);
        return _batchAnchors[batchId];
    }
}
