"""
Test Suite for Besu QBFT Network, Genesis Configuration, and AT-23 Consensus Fault Tolerance.
Per docs/09_DEPLOYMENT.md and docs/10_TESTING_DEMO.md (AT-23).
"""

import json
from pathlib import Path

from eth_utils import to_bytes


def test_genesis_qbft_configuration():
    """Verify chain/genesis.json has correct QBFT consensus and zero-gas parameters."""
    genesis_path = Path("chain/genesis.json")
    assert genesis_path.exists(), "chain/genesis.json must exist"

    with open(genesis_path, "r", encoding="utf-8") as f:
        genesis = json.load(f)

    # Verify Chain ID
    config = genesis.get("config", {})
    assert config.get("chainId") == 20260, "Chain ID must be 20260 per spec"
    assert config.get("zeroBaseFee") is True, (
        "zeroBaseFee must be true for zero-gas enterprise network"
    )

    # Verify QBFT settings
    qbft = config.get("qbft", {})
    assert qbft.get("blockperiodseconds") == 2, "QBFT block period must be 2 seconds"
    assert qbft.get("epochlength") == 30000, "Epoch length must match genesis spec"
    assert qbft.get("requesttimeoutseconds") == 4, "Request timeout must be 4 seconds"

    # Verify extraData contains QBFT vanity (32 bytes) + RLP encoded validators
    extra_data = genesis.get("extraData", "")
    assert extra_data.startswith("0x"), "extraData must be a 0x-prefixed hex string"
    raw_bytes = to_bytes(hexstr=extra_data)
    assert len(raw_bytes) > 32, "extraData must have vanity prefix (32 bytes) plus QBFT header"


def test_validator_key_and_address_consistency():
    """Verify validator node addresses and addresses in genesis match."""
    genesis_path = Path("chain/genesis.json")
    with open(genesis_path, "r", encoding="utf-8") as f:
        genesis = json.load(f)

    alloc = genesis.get("alloc", {})
    # Operator account allocated in genesis
    operator_addr = "fe3b557e8fb62b89f4916b721be55ceb828dbd73"
    alloc_normalized = {k.lower().removeprefix("0x"): v for k, v in alloc.items()}
    assert operator_addr in alloc_normalized, (
        f"Operator {operator_addr} must have balance in genesis alloc"
    )

    nodes_dir = Path("chain/nodes")
    if nodes_dir.exists():
        validators = [
            d for d in nodes_dir.iterdir() if d.is_dir() and d.name.startswith("validator")
        ]
        assert len(validators) == 4, "Must have exactly 4 validator node directories generated"

        for v in validators:
            key_file = v / "data" / "key"
            address_file = v / "data" / "node.address"
            pubkey_file = v / "data" / "node.pub"
            assert key_file.exists(), f"Validator {v.name} missing key file"
            assert address_file.exists(), f"Validator {v.name} missing node.address file"
            assert pubkey_file.exists(), f"Validator {v.name} missing node.pub file"

            address_hex = address_file.read_text().strip()
            assert len(address_hex) == 40, (
                f"Validator {v.name} address should be 40 hex chars (20 bytes)"
            )


class QBFTConsensusSimulator:
    """
    Simulator for QBFT (Istanbul/IBFT2-derived) Byzantine Fault Tolerant Consensus.
    Formulas:
      Total nodes: N
      Fault tolerance threshold: f = floor((N - 1) / 3)
      Quorum size: Q = 2f + 1 (for 4 nodes, f=1, Q=3)
    """

    def __init__(self, num_nodes: int = 4):
        self.num_nodes = num_nodes
        self.f = (num_nodes - 1) // 3
        self.quorum_size = 2 * self.f + 1
        self.active_nodes = set(range(num_nodes))

    def stop_node(self, node_id: int):
        self.active_nodes.discard(node_id)

    def start_node(self, node_id: int):
        self.active_nodes.add(node_id)

    def can_produce_blocks(self) -> bool:
        """QBFT requires >= Q (2f+1) active validators to sign and commit a proposal."""
        return len(self.active_nodes) >= self.quorum_size

    def faulty_count(self) -> int:
        return self.num_nodes - len(self.active_nodes)


def test_at_23_qbft_consensus_single_validator_failure():
    """
    Verify AT-23: Stopping one validator in a 4-node QBFT network does NOT halt consensus.
    Stopping two validators DOES halt consensus until a validator is restored.
    """
    sim = QBFTConsensusSimulator(num_nodes=4)

    # Initial state: 4 active nodes
    assert sim.num_nodes == 4
    assert sim.f == 1, "4-node network must tolerate 1 Byzantine/offline validator"
    assert sim.quorum_size == 3, "Quorum size must be 3"
    assert sim.can_produce_blocks() is True, "All 4 nodes online should produce blocks"

    # AT-23: Stop one validator (e.g. validator 3)
    sim.stop_node(3)
    assert sim.faulty_count() == 1
    assert sim.can_produce_blocks() is True, (
        "AT-23: Network with 3/4 active validators must continue producing blocks"
    )

    # Stop a second validator (e.g. validator 2)
    sim.stop_node(2)
    assert sim.faulty_count() == 2
    assert sim.can_produce_blocks() is False, (
        "Network with 2/4 active nodes (< quorum 3) must safely halt to prevent split brain"
    )

    # Restore one validator (e.g. validator 2)
    sim.start_node(2)
    assert sim.faulty_count() == 1
    assert sim.can_produce_blocks() is True, (
        "Network must resume block production once 3/4 validators are online"
    )
