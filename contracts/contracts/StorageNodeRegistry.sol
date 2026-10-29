// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./OperatorAccess.sol";
import "./IdentityRegistry.sol";

/**
 * @title StorageNodeRegistry
 * @notice On-chain registry for decentralised storage nodes, endpoints, and capacity.
 * @dev Spec: docs/04_CONTRACTS.md section 2.3
 */
contract StorageNodeRegistry is OperatorAccess {
    enum Status { ACTIVE, SUSPENDED, REVOKED }

    struct Node {
        bytes32 id;
        string endpoint;
        uint64 capacityBytes;
        bytes32 certFingerprint;
        Status status;
    }

    IdentityRegistry public immutable identityRegistry;

    bytes32[] private _nodeIds;
    mapping(bytes32 => Node) private _nodes;
    mapping(bytes32 => bool) private _exists;

    error NodeAlreadyExists(bytes32 id);
    error NodeNotFound(bytes32 id);
    error UnauthorizedActor(bytes32 actor);
    error NodeNotRegisteredInIdentity(bytes32 id);

    event NodeAdded(bytes32 indexed id, string endpoint, uint64 capacityBytes, bytes32 fp, bytes32 indexed actor);
    event NodeUpdated(bytes32 indexed id, string endpoint, uint64 capacityBytes, bytes32 indexed actor);
    event NodeStatusChanged(bytes32 indexed id, Status status, bytes32 indexed actor);

    constructor(address _identityRegistry) OperatorAccess() {
        identityRegistry = IdentityRegistry(_identityRegistry);
    }

    function addNode(
        bytes32 id,
        string calldata endpoint,
        uint64 capacityBytes,
        bytes32 fp,
        bytes32 actor
    ) external onlyOperator {
        if (_exists[id]) revert NodeAlreadyExists(id);
        if (!identityRegistry.isActive(actor) || !identityRegistry.hasRole(actor, identityRegistry.ROLE_ADMIN())) {
            revert UnauthorizedActor(actor);
        }
        if (!identityRegistry.hasRole(id, identityRegistry.ROLE_STORAGE_NODE())) {
            revert NodeNotRegisteredInIdentity(id);
        }

        _nodes[id] = Node({
            id: id,
            endpoint: endpoint,
            capacityBytes: capacityBytes,
            certFingerprint: fp,
            status: Status.ACTIVE
        });
        _exists[id] = true;
        _nodeIds.push(id);

        emit NodeAdded(id, endpoint, capacityBytes, fp, actor);
    }

    function updateNode(
        bytes32 id,
        string calldata endpoint,
        uint64 capacityBytes,
        bytes32 actor
    ) external onlyOperator {
        if (!_exists[id]) revert NodeNotFound(id);
        if (!identityRegistry.isActive(actor) || !identityRegistry.hasRole(actor, identityRegistry.ROLE_ADMIN())) {
            revert UnauthorizedActor(actor);
        }

        Node storage node = _nodes[id];
        node.endpoint = endpoint;
        node.capacityBytes = capacityBytes;

        emit NodeUpdated(id, endpoint, capacityBytes, actor);
    }

    function setNodeStatus(
        bytes32 id,
        Status s,
        bytes32 actor
    ) external onlyOperator {
        if (!_exists[id]) revert NodeNotFound(id);
        if (!identityRegistry.isActive(actor) || !identityRegistry.hasRole(actor, identityRegistry.ROLE_ADMIN())) {
            revert UnauthorizedActor(actor);
        }

        _nodes[id].status = s;
        emit NodeStatusChanged(id, s, actor);
    }

    function listNodes() external view returns (Node[] memory) {
        uint256 count = _nodeIds.length;
        Node[] memory result = new Node[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = _nodes[_nodeIds[i]];
        }
        return result;
    }

    function getNode(bytes32 id) external view returns (Node memory) {
        if (!_exists[id]) revert NodeNotFound(id);
        return _nodes[id];
    }
}
