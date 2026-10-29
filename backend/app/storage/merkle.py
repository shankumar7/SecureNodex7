"""Canonical Merkle tree implementation over ordered chunk IDs per docs/03 section 2."""

import hashlib


def hash_leaf(chunk_id_hex: str) -> bytes:
    """Compute leaf hash = SHA-256(0x00 || chunk_id_bytes)."""
    raw_id = bytes.fromhex(chunk_id_hex.lower())
    return hashlib.sha256(b"\x00" + raw_id).digest()


def hash_node(left: bytes, right: bytes) -> bytes:
    """Compute node hash = SHA-256(0x01 || left || right)."""
    return hashlib.sha256(b"\x01" + left + right).digest()


def compute_merkle_root(chunk_ids: list[str]) -> str:
    """Compute Merkle root hex over ordered list of chunk IDs."""
    if not chunk_ids:
        return hashlib.sha256(b"").hexdigest()

    current_level = [hash_leaf(cid) for cid in chunk_ids]

    while len(current_level) > 1:
        next_level = []
        for i in range(0, len(current_level), 2):
            if i + 1 < len(current_level):
                next_level.append(hash_node(current_level[i], current_level[i + 1]))
            else:
                # Odd node promoted
                next_level.append(current_level[i])
        current_level = next_level

    return current_level[0].hex()


def get_merkle_proof(chunk_ids: list[str], target_index: int) -> list[dict[str, str]]:
    """Generate Merkle inclusion proof for a target chunk index."""
    if not (0 <= target_index < len(chunk_ids)):
        raise IndexError("Target index out of range")

    proof = []
    current_level = [hash_leaf(cid) for cid in chunk_ids]
    idx = target_index

    while len(current_level) > 1:
        next_level = []
        for i in range(0, len(current_level), 2):
            if i + 1 < len(current_level):
                parent = hash_node(current_level[i], current_level[i + 1])
                if i == idx:
                    proof.append({"pos": "right", "hash": current_level[i + 1].hex()})
                elif i + 1 == idx:
                    proof.append({"pos": "left", "hash": current_level[i].hex()})
                next_level.append(parent)
            else:
                next_level.append(current_level[i])
        current_level = next_level
        idx //= 2

    return proof


def verify_merkle_proof(
    chunk_id_hex: str,
    proof: list[dict[str, str]],
    expected_root_hex: str,
) -> bool:
    """Verify a Merkle inclusion proof against an expected root."""
    current_hash = hash_leaf(chunk_id_hex)
    for elem in proof:
        sibling = bytes.fromhex(elem["hash"])
        if elem["pos"] == "right":
            current_hash = hash_node(current_hash, sibling)
        else:
            current_hash = hash_node(sibling, current_hash)

    return current_hash.hex().lower() == expected_root_hex.lower()
