// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./OperatorAccess.sol";

/**
 * @title IdentityRegistry
 * @notice On-chain identity, role bitmask, certificate fingerprint, and lifecycle registry.
 * @dev Spec: docs/04_CONTRACTS.md section 2.2
 */
contract IdentityRegistry is OperatorAccess {
    enum Kind { USER, DEVICE, STORAGE_NODE, SERVICE }
    enum Status { ACTIVE, SUSPENDED, REVOKED }

    // Role bitmasks
    uint32 public constant ROLE_ADMIN = 1;
    uint32 public constant ROLE_MANAGER = 2;
    uint32 public constant ROLE_AUDITOR = 4;
    uint32 public constant ROLE_USER = 8;
    uint32 public constant ROLE_DEVICE = 16;
    uint32 public constant ROLE_STORAGE_NODE = 32;

    struct Identity {
        Kind kind;
        uint32 roles;
        Status status;
        bytes32 certFingerprint;
        bytes32 metaHash;
        uint64 createdAt;
        uint64 updatedAt;
    }

    mapping(bytes32 => Identity) private _identities;
    mapping(bytes32 => bool) private _exists;
    uint256 public totalIdentities;
    uint256 public activeAdminCount;

    // Custom errors
    error IdentityAlreadyExists(bytes32 id);
    error IdentityNotFound(bytes32 id);
    error IdentityNotActive(bytes32 id);
    error IdentityRevokedTerminal(bytes32 id);
    error UnauthorizedActor(bytes32 actor, uint32 requiredRole);
    error CannotDemoteLastAdmin(bytes32 id);
    error InvalidRoleBitmask(uint32 roles);

    // Events per docs/04 section 2.2
    event IdentityRegistered(bytes32 indexed id, Kind kind, uint32 roles, bytes32 fingerprint);
    event RolesChanged(bytes32 indexed id, uint32 oldRoles, uint32 newRoles, bytes32 indexed actor);
    event IdentityRotated(bytes32 indexed id, bytes32 oldFp, bytes32 newFp);
    event IdentityStatusChanged(bytes32 indexed id, Status status, bytes32 reason, bytes32 indexed actor);

    constructor() OperatorAccess() {}

    function register(
        bytes32 id,
        Kind kind,
        uint32 roles,
        bytes32 certFingerprint,
        bytes32 metaHash,
        bytes32 actor
    ) external onlyOperator {
        if (_exists[id]) revert IdentityAlreadyExists(id);

        if (totalIdentities == 0) {
            // Bootstrap first Admin identity
            if ((roles & ROLE_ADMIN) == 0) revert InvalidRoleBitmask(roles);
        } else {
            // Check actor authorization
            if (!_isActive(actor)) revert IdentityNotActive(actor);
            bool isActorAdmin = _hasRole(actor, ROLE_ADMIN);
            bool isActorManager = _hasRole(actor, ROLE_MANAGER);

            if ((roles & ROLE_ADMIN) != 0 && !isActorAdmin) {
                revert UnauthorizedActor(actor, ROLE_ADMIN);
            }
            if (kind == Kind.DEVICE) {
                if (!isActorAdmin && !isActorManager) {
                    revert UnauthorizedActor(actor, ROLE_MANAGER);
                }
            } else if (!isActorAdmin) {
                revert UnauthorizedActor(actor, ROLE_ADMIN);
            }
        }

        uint64 nowTs = uint64(block.timestamp);
        _identities[id] = Identity({
            kind: kind,
            roles: roles,
            status: Status.ACTIVE,
            certFingerprint: certFingerprint,
            metaHash: metaHash,
            createdAt: nowTs,
            updatedAt: nowTs
        });
        _exists[id] = true;
        totalIdentities++;

        if ((roles & ROLE_ADMIN) != 0) {
            activeAdminCount++;
        }

        emit IdentityRegistered(id, kind, roles, certFingerprint);
    }

    function setRoles(
        bytes32 id,
        uint32 roles,
        bytes32 actor
    ) external onlyOperator {
        if (!_exists[id]) revert IdentityNotFound(id);
        if (!_isActive(actor)) revert IdentityNotActive(actor);

        Identity storage target = _identities[id];
        if (target.status == Status.REVOKED) revert IdentityRevokedTerminal(id);

        bool isActorAdmin = _hasRole(actor, ROLE_ADMIN);
        bool isActorManager = _hasRole(actor, ROLE_MANAGER);

        if (target.kind == Kind.DEVICE && isActorManager) {
            // Manager can manage Device role only
            if ((roles & ~ROLE_DEVICE) != 0) {
                revert UnauthorizedActor(actor, ROLE_ADMIN);
            }
        } else if (!isActorAdmin) {
            revert UnauthorizedActor(actor, ROLE_ADMIN);
        }

        // Guard against removing last active admin
        bool wasAdmin = (target.roles & ROLE_ADMIN) != 0;
        bool willBeAdmin = (roles & ROLE_ADMIN) != 0;
        if (wasAdmin && !willBeAdmin) {
            if (activeAdminCount <= 1) revert CannotDemoteLastAdmin(id);
            activeAdminCount--;
        } else if (!wasAdmin && willBeAdmin) {
            activeAdminCount++;
        }

        uint32 oldRoles = target.roles;
        target.roles = roles;
        target.updatedAt = uint64(block.timestamp);

        emit RolesChanged(id, oldRoles, roles, actor);
    }

    function rotate(
        bytes32 id,
        bytes32 newFingerprint,
        bytes32 actor
    ) external onlyOperator {
        if (!_exists[id]) revert IdentityNotFound(id);
        if (!_isActive(actor)) revert IdentityNotActive(actor);

        Identity storage target = _identities[id];
        if (target.status != Status.ACTIVE) revert IdentityNotActive(id);

        // Actor must be self, ADMIN, or MANAGER
        if (actor != id && !_hasRole(actor, ROLE_ADMIN) && !_hasRole(actor, ROLE_MANAGER)) {
            revert UnauthorizedActor(actor, ROLE_ADMIN);
        }

        bytes32 oldFp = target.certFingerprint;
        target.certFingerprint = newFingerprint;
        target.updatedAt = uint64(block.timestamp);

        emit IdentityRotated(id, oldFp, newFingerprint);
    }

    function suspend(
        bytes32 id,
        bytes32 reason,
        bytes32 actor
    ) external onlyOperator {
        if (!_exists[id]) revert IdentityNotFound(id);
        if (!_isActive(actor)) revert IdentityNotActive(actor);

        Identity storage target = _identities[id];
        if (target.status == Status.REVOKED) revert IdentityRevokedTerminal(id);

        bool isActorAdmin = _hasRole(actor, ROLE_ADMIN);
        bool isActorManager = _hasRole(actor, ROLE_MANAGER);

        if (target.kind == Kind.DEVICE) {
            if (!isActorAdmin && !isActorManager) revert UnauthorizedActor(actor, ROLE_MANAGER);
        } else if (!isActorAdmin) {
            revert UnauthorizedActor(actor, ROLE_ADMIN);
        }

        if (target.status == Status.ACTIVE && (target.roles & ROLE_ADMIN) != 0) {
            if (activeAdminCount <= 1) revert CannotDemoteLastAdmin(id);
            activeAdminCount--;
        }

        target.status = Status.SUSPENDED;
        target.updatedAt = uint64(block.timestamp);

        emit IdentityStatusChanged(id, Status.SUSPENDED, reason, actor);
    }

    function revoke(
        bytes32 id,
        bytes32 reason,
        bytes32 actor
    ) external onlyOperator {
        if (!_exists[id]) revert IdentityNotFound(id);
        if (!_isActive(actor)) revert IdentityNotActive(actor);

        Identity storage target = _identities[id];
        if (target.status == Status.REVOKED) revert IdentityRevokedTerminal(id);

        bool isActorAdmin = _hasRole(actor, ROLE_ADMIN);
        bool isActorManager = _hasRole(actor, ROLE_MANAGER);

        if (target.kind == Kind.DEVICE) {
            if (!isActorAdmin && !isActorManager) revert UnauthorizedActor(actor, ROLE_MANAGER);
        } else if (!isActorAdmin) {
            revert UnauthorizedActor(actor, ROLE_ADMIN);
        }

        if (target.status == Status.ACTIVE && (target.roles & ROLE_ADMIN) != 0) {
            if (activeAdminCount <= 1) revert CannotDemoteLastAdmin(id);
            activeAdminCount--;
        }

        target.status = Status.REVOKED;
        target.updatedAt = uint64(block.timestamp);

        emit IdentityStatusChanged(id, Status.REVOKED, reason, actor);
    }

    function reinstate(
        bytes32 id,
        bytes32 actor
    ) external onlyOperator {
        if (!_exists[id]) revert IdentityNotFound(id);
        if (!_isActive(actor)) revert IdentityNotActive(actor);
        if (!_hasRole(actor, ROLE_ADMIN)) revert UnauthorizedActor(actor, ROLE_ADMIN);

        Identity storage target = _identities[id];
        if (target.status == Status.REVOKED) revert IdentityRevokedTerminal(id);

        if (target.status == Status.SUSPENDED) {
            target.status = Status.ACTIVE;
            target.updatedAt = uint64(block.timestamp);
            if ((target.roles & ROLE_ADMIN) != 0) {
                activeAdminCount++;
            }
            emit IdentityStatusChanged(id, Status.ACTIVE, bytes32(0), actor);
        }
    }

    function get(bytes32 id) external view returns (Identity memory) {
        if (!_exists[id]) revert IdentityNotFound(id);
        return _identities[id];
    }

    function hasRole(bytes32 id, uint32 roleMask) external view returns (bool) {
        return _hasRole(id, roleMask);
    }

    function isActive(bytes32 id) external view returns (bool) {
        return _isActive(id);
    }

    function _hasRole(bytes32 id, uint32 roleMask) internal view returns (bool) {
        if (!_exists[id]) return false;
        return (_identities[id].roles & roleMask) != 0;
    }

    function _isActive(bytes32 id) internal view returns (bool) {
        if (!_exists[id]) return false;
        return _identities[id].status == Status.ACTIVE;
    }
}
