"""Web3 chain client with nonce management, retries, and contract interactions."""

import json
import logging
import os
import threading
import time
from typing import Any

from eth_account import Account
from eth_account.signers.local import LocalAccount
from web3 import Web3

from backend.app.config import settings

logger = logging.getLogger("snx.chain")

# Default hardhat account #0 private key for local development
DEFAULT_DEV_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"


def to_bytes32(val: str | bytes) -> bytes:
    """Convert a string or hex to exactly 32 bytes."""
    if isinstance(val, bytes):
        if len(val) == 32:
            return val
        return val[:32].ljust(32, b"\x00")

    val_str = val.strip()
    if val_str.startswith("0x") and len(val_str) == 66:
        return bytes.fromhex(val_str[2:])
    elif len(val_str) == 64 and all(c in "0123456789abcdefABCDEF" for c in val_str):
        return bytes.fromhex(val_str)
    else:
        # Compute keccak256 hash of string (e.g. did:snx:...)
        return Web3.keccak(text=val_str)


class ChainClient:
    """Thread-safe Web3 client for interacting with SecureNodeX smart contracts."""

    def __init__(
        self,
        rpc_url: str | None = None,
        operator_key: str | None = None,
        deployments_path: str | None = None,
        abi_dir: str | None = None,
    ) -> None:
        self.rpc_url = rpc_url or settings.CHAIN_RPC_URL
        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
        self.chain_id = settings.CHAIN_ID

        # Load operator key
        self.operator_account = self._load_operator_account(operator_key)

        # Nonce tracking lock
        self._nonce_lock = threading.Lock()
        self._current_nonce: int | None = None

        # Load deployments and ABIs
        self.deployments_path = deployments_path or self._find_deployments_file()
        self.abi_dir = abi_dir or os.path.join(os.path.dirname(__file__), "abi")
        self.contracts: dict[str, Any] = {}
        self._load_contracts()

    def _load_operator_account(self, custom_key: str | None) -> LocalAccount:
        if custom_key:
            return Account.from_key(custom_key)

        key_file = settings.OPERATOR_KEY_FILE
        if os.path.exists(key_file):
            with open(key_file) as f:
                key_hex = f.read().strip()
                return Account.from_key(key_hex)

        # Fallback to dev key
        return Account.from_key(DEFAULT_DEV_KEY)

    def _find_deployments_file(self) -> str:
        candidates = [
            settings.DEPLOYMENTS_FILE,
            os.path.abspath(
                os.path.join(os.path.dirname(__file__), "../../../deployments/hardhat.json")
            ),
            os.path.abspath(
                os.path.join(os.path.dirname(__file__), "../../../deployments/besu.json")
            ),
            "/app/deployments/hardhat.json",
            "/app/deployments/besu.json",
        ]
        for path in candidates:
            if os.path.exists(path):
                return path
        return candidates[1]

    def _load_contracts(self) -> None:
        if not os.path.exists(self.deployments_path):
            logger.warning(
                f"Deployment file not found at {self.deployments_path}. Contracts will not be loaded."
            )
            return

        with open(self.deployments_path) as f:
            deploy_data = json.load(f)

        deployed_addresses = deploy_data.get("contracts", {})

        for name, address in deployed_addresses.items():
            abi_file = os.path.join(self.abi_dir, f"{name}.json")
            if os.path.exists(abi_file):
                with open(abi_file) as f:
                    abi = json.load(f)
                self.contracts[name] = self.w3.eth.contract(
                    address=Web3.to_checksum_address(address),
                    abi=abi,
                )
            else:
                logger.warning(f"ABI for contract {name} not found at {abi_file}")

    def is_connected(self) -> bool:
        """Check if Web3 RPC is reachable."""
        try:
            return bool(self.w3.is_connected())
        except Exception:
            return False

    def _get_nonce(self) -> int:
        with self._nonce_lock:
            latest_nonce = self.w3.eth.get_transaction_count(
                self.operator_account.address, "pending"
            )
            if self._current_nonce is None or self._current_nonce < latest_nonce:
                self._current_nonce = latest_nonce
            else:
                self._current_nonce += 1
            return self._current_nonce

    def _send_transaction(
        self, contract_function: Any, gas_limit: int = 500000, max_retries: int = 3
    ) -> dict[str, Any]:
        """Sign, send, and await transaction receipt with retry logic."""
        last_error = None
        for attempt in range(max_retries):
            try:
                nonce = self._get_nonce()
                gas_price = self.w3.eth.gas_price

                tx = contract_function.build_transaction(
                    {
                        "from": self.operator_account.address,
                        "nonce": nonce,
                        "gas": gas_limit,
                        "gasPrice": gas_price,
                        "chainId": self.chain_id,
                    }
                )

                signed_tx = self.w3.eth.account.sign_transaction(tx, self.operator_account.key)
                tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)

                receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=15)
                if receipt.status != 1:
                    raise RuntimeError(f"Transaction reverted on-chain. TxHash: {tx_hash.hex()}")

                return {
                    "tx_hash": tx_hash.hex(),
                    "block_number": receipt.blockNumber,
                    "gas_used": receipt.gasUsed,
                    "receipt": receipt,
                }
            except Exception as e:
                last_error = e
                logger.warning(f"Transaction attempt {attempt + 1} failed: {e}. Retrying...")
                with self._nonce_lock:
                    self._current_nonce = None  # Reset nonce counter
                time.sleep(0.5 * (attempt + 1))

        raise RuntimeError(f"Transaction failed after {max_retries} attempts: {last_error}")

    # --- IdentityRegistry ---
    def register_identity(
        self, identity_id: str, fingerprint: str, role_mask: int, metadata_uri: str = ""
    ) -> dict[str, Any]:
        contract = self.contracts.get("IdentityRegistry")
        if not contract:
            raise RuntimeError("IdentityRegistry contract not loaded")

        id_bytes = to_bytes32(identity_id)
        fp_bytes = to_bytes32(fingerprint)
        func = contract.functions.register(id_bytes, fp_bytes, role_mask, metadata_uri)
        return self._send_transaction(func)

    def suspend_identity(self, identity_id: str) -> dict[str, Any]:
        contract = self.contracts.get("IdentityRegistry")
        if not contract:
            raise RuntimeError("IdentityRegistry contract not loaded")
        return self._send_transaction(contract.functions.suspend(to_bytes32(identity_id)))

    def reinstate_identity(self, identity_id: str) -> dict[str, Any]:
        contract = self.contracts.get("IdentityRegistry")
        if not contract:
            raise RuntimeError("IdentityRegistry contract not loaded")
        return self._send_transaction(contract.functions.reinstate(to_bytes32(identity_id)))

    def revoke_identity(self, identity_id: str) -> dict[str, Any]:
        contract = self.contracts.get("IdentityRegistry")
        if not contract:
            raise RuntimeError("IdentityRegistry contract not loaded")
        return self._send_transaction(contract.functions.revoke(to_bytes32(identity_id)))

    def rotate_identity(self, identity_id: str, new_fingerprint: str) -> dict[str, Any]:
        contract = self.contracts.get("IdentityRegistry")
        if not contract:
            raise RuntimeError("IdentityRegistry contract not loaded")
        return self._send_transaction(
            contract.functions.rotate(to_bytes32(identity_id), to_bytes32(new_fingerprint))
        )

    def get_identity(self, identity_id: str) -> dict[str, Any]:
        contract = self.contracts.get("IdentityRegistry")
        if not contract:
            raise RuntimeError("IdentityRegistry contract not loaded")
        data = contract.functions.getIdentity(to_bytes32(identity_id)).call()
        return {
            "identityId": "0x" + data[0].hex(),
            "spkiFingerprint": "0x" + data[1].hex(),
            "roleMask": data[2],
            "status": data[3],
            "metadataURI": data[4],
            "registeredAt": data[5],
            "updatedAt": data[6],
        }

    def is_identity_active(self, identity_id: str) -> bool:
        contract = self.contracts.get("IdentityRegistry")
        if not contract:
            return True
        return bool(contract.functions.isActive(to_bytes32(identity_id)).call())

    # --- AuditLog ---
    def record_audit(
        self,
        event_type: str,
        actor: str,
        subject: str,
        data_hash: str,
        correlation_id: str,
    ) -> dict[str, Any]:
        contract = self.contracts.get("AuditLog")
        if not contract:
            raise RuntimeError("AuditLog contract not loaded")

        ev_bytes = to_bytes32(event_type)
        act_bytes = to_bytes32(actor)
        sub_bytes = to_bytes32(subject)
        dh_bytes = to_bytes32(data_hash)
        cid_bytes = to_bytes32(correlation_id)

        prev_head_hex = "0x" + contract.functions.head().call().hex()
        func = contract.functions.record(ev_bytes, act_bytes, sub_bytes, dh_bytes, cid_bytes)
        result = self._send_transaction(func)

        head_hex = "0x" + contract.functions.head().call().hex()
        count = contract.functions.count().call()

        result["seq"] = count
        result["prev_head"] = prev_head_hex
        result["head"] = head_hex
        return result

    def get_audit_head(self) -> str:
        contract = self.contracts.get("AuditLog")
        if not contract:
            return "0x" + "0" * 64
        return "0x" + contract.functions.head().call().hex()

    def get_audit_count(self) -> int:
        contract = self.contracts.get("AuditLog")
        if not contract:
            return 0
        return int(contract.functions.count().call())


# Global chain client singleton
chain_client = ChainClient()
