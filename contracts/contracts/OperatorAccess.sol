// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title OperatorAccess
 * @notice Base contract managing OPERATOR_ROLE for SecureNodeX chain writers.
 * @dev Per docs/04_CONTRACTS.md: Every state-changing function is callable only by an account with OPERATOR_ROLE.
 */
abstract contract OperatorAccess is AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    error CallerNotOperator(address caller);

    modifier onlyOperator() {
        if (!hasRole(OPERATOR_ROLE, msg.sender)) {
            revert CallerNotOperator(msg.sender);
        }
        _;
    }

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }
}
