// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./OperatorAccess.sol";

/**
 * @title AuditLog
 * @notice Tamper-evident cryptographic hash-chained audit log on-chain.
 * @dev Spec: docs/04_CONTRACTS.md section 2.6
 * Head formula: head = keccak256(abi.encode(head, eventType, actor, subject, dataHash, correlationId, block.timestamp, seq))
 */
contract AuditLog is OperatorAccess {
    bytes32 public head;
    uint256 public seq;

    event AuditEvent(
        uint256 indexed seq,
        bytes32 indexed eventType,
        bytes32 indexed actor,
        bytes32 subject,
        bytes32 dataHash,
        bytes32 correlationId,
        bytes32 prevHead,
        bytes32 newHead
    );

    constructor() OperatorAccess() {
        head = bytes32(0);
        seq = 0;
    }

    function record(
        bytes32 eventType,
        bytes32 actor,
        bytes32 subject,
        bytes32 dataHash,
        bytes32 correlationId
    ) external onlyOperator {
        bytes32 prevHead = head;
        uint256 currentSeq = seq + 1;

        bytes32 newHead = keccak256(
            abi.encode(
                prevHead,
                eventType,
                actor,
                subject,
                dataHash,
                correlationId,
                block.timestamp,
                currentSeq
            )
        );

        head = newHead;
        seq = currentSeq;

        emit AuditEvent(
            currentSeq,
            eventType,
            actor,
            subject,
            dataHash,
            correlationId,
            prevHead,
            newHead
        );
    }
}
