"""Unit tests for storage cryptography, Merkle trees, HRW placement, and diversity rule."""

import hashlib

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import ec

from backend.app.storage.crypto import (
    decrypt_chunk,
    encrypt_chunk,
    generate_dek,
    unwrap_dek_ecies,
    wrap_dek_ecies,
)
from backend.app.storage.merkle import (
    compute_merkle_root,
    get_merkle_proof,
    verify_merkle_proof,
)
from backend.app.storage.placement import (
    StorageNodeInfo,
    apply_diversity_rule,
    place_chunk,
)


def test_aes_gcm_chunk_encryption_and_decryption() -> None:
    dek = generate_dek()
    data = b"Decentralized confidential IoT payload test!"
    object_id = "obj-test-uuid-123"
    chunk_index = 0

    ciphertext, nonce_b64 = encrypt_chunk(dek, data, object_id, chunk_index)
    assert ciphertext != data

    # Decrypt
    decrypted = decrypt_chunk(dek, ciphertext, nonce_b64, object_id, chunk_index)
    assert decrypted == data


def test_ecies_dek_wrapping_and_unwrapping() -> None:
    """Validate ECIES key wrapping for owner/grantees (docs/02 section 9)."""
    dek = generate_dek()
    recipient_priv = ec.generate_private_key(ec.SECP256R1(), default_backend())
    recipient_pub = recipient_priv.public_key()

    grant_blob = wrap_dek_ecies(dek, recipient_pub)
    assert "ephemeral_pub_pem" in grant_blob
    assert "wrapped_dek_b64" in grant_blob
    assert "nonce_b64" in grant_blob

    unwrapped_dek = unwrap_dek_ecies(grant_blob, recipient_priv)
    assert unwrapped_dek == dek


def test_merkle_tree_and_proof_verification() -> None:
    chunk_ids = [
        hashlib.sha256(f"chunk_{i}".encode()).hexdigest()
        for i in range(5)
    ]

    root = compute_merkle_root(chunk_ids)
    assert len(root) == 64

    # Verify proofs for each chunk
    for idx, cid in enumerate(chunk_ids):
        proof = get_merkle_proof(chunk_ids, idx)
        assert verify_merkle_proof(cid, proof, root) is True

    # Tampered chunk fails verification
    tampered_proof = get_merkle_proof(chunk_ids, 0)
    assert verify_merkle_proof("0" * 64, tampered_proof, root) is False


def test_hrw_placement_and_diversity_rule() -> None:
    nodes = [
        StorageNodeInfo(id=f"node-{i}", endpoint=f"http://node-{i}:7443")
        for i in range(1, 6)
    ]
    chunk_1 = "1" * 64
    chunk_2 = "2" * 64

    p1 = place_chunk(chunk_1, nodes, r=3)
    p2 = place_chunk(chunk_2, nodes, r=3)

    assert len(p1) == 3
    assert len(p2) == 3

    # Force a test case with identical placements across 2 chunks
    forced_placements = [[nodes[0], nodes[1], nodes[2]], [nodes[0], nodes[1], nodes[2]]]
    diversified = apply_diversity_rule(forced_placements, nodes, r=3)

    # Diversity rule should replace an over-represented node in one chunk
    common_nodes_after = set(diversified[0]) & set(diversified[1])
    assert len(common_nodes_after) < 3
