"""AES-256-GCM chunk encryption and ECIES (P-256 + HKDF + AES-GCM) key wrapping."""

import base64
import os
import secrets
from typing import Any

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF


def generate_dek() -> bytes:
    """Generate a fresh 256-bit random Data Encryption Key (DEK)."""
    return secrets.token_bytes(32)


def encrypt_chunk(
    dek: bytes,
    chunk_bytes: bytes,
    object_id: str,
    chunk_index: int,
) -> tuple[bytes, str]:
    """Encrypt chunk with AES-256-GCM using fresh 12B nonce and AAD=object_id||chunk_index."""
    nonce = secrets.token_bytes(12)
    aad = f"{object_id}||{chunk_index}".encode("utf-8")
    aesgcm = AESGCM(dek)
    ciphertext = aesgcm.encrypt(nonce, chunk_bytes, aad)
    nonce_b64 = base64.b64encode(nonce).decode("utf-8")
    return ciphertext, nonce_b64


def decrypt_chunk(
    dek: bytes,
    ciphertext: bytes,
    nonce_b64: str,
    object_id: str,
    chunk_index: int,
) -> bytes:
    """Decrypt chunk with AES-256-GCM verifying AAD and GCM tag."""
    nonce = base64.b64decode(nonce_b64)
    aad = f"{object_id}||{chunk_index}".encode("utf-8")
    aesgcm = AESGCM(dek)
    plaintext = aesgcm.decrypt(nonce, ciphertext, aad)
    return plaintext


def wrap_dek_ecies(
    dek: bytes,
    recipient_public_key: ec.EllipticCurvePublicKey,
) -> dict[str, str]:
    """Wrap a 256-bit DEK for a recipient public key using ECIES:

    ephemeral P-256 e, shared = ECDH(e, recipient_pub),
    KEK = HKDF-SHA256(shared, info='SNX-KEYWRAP-v1'), wrapped_dek = AES-256-GCM(KEK, DEK).
    """
    ephemeral_priv = ec.generate_private_key(ec.SECP256R1(), default_backend())
    ephemeral_pub = ephemeral_priv.public_key()

    shared_secret = ephemeral_priv.exchange(ec.ECDH(), recipient_public_key)

    kek = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=b"SNX-KEYWRAP-v1",
        backend=default_backend(),
    ).derive(shared_secret)

    nonce = secrets.token_bytes(12)
    aesgcm = AESGCM(kek)
    wrapped_dek = aesgcm.encrypt(nonce, dek, b"SNX-DEK-WRAP")

    ephemeral_pub_pem = ephemeral_pub.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("utf-8")

    return {
        "ephemeral_pub_pem": ephemeral_pub_pem,
        "nonce_b64": base64.b64encode(nonce).decode("utf-8"),
        "wrapped_dek_b64": base64.b64encode(wrapped_dek).decode("utf-8"),
    }


def unwrap_dek_ecies(
    grant_blob: dict[str, str],
    recipient_private_key: ec.EllipticCurvePrivateKey,
) -> bytes:
    """Unwrap DEK using recipient's private key."""
    ephemeral_pub = serialization.load_pem_public_key(
        grant_blob["ephemeral_pub_pem"].encode("utf-8"),
        backend=default_backend(),
    )
    if not isinstance(ephemeral_pub, ec.EllipticCurvePublicKey):
        raise ValueError("Invalid ephemeral public key")

    shared_secret = recipient_private_key.exchange(ec.ECDH(), ephemeral_pub)

    kek = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=b"SNX-KEYWRAP-v1",
        backend=default_backend(),
    ).derive(shared_secret)

    nonce = base64.b64decode(grant_blob["nonce_b64"])
    wrapped_dek = base64.b64decode(grant_blob["wrapped_dek_b64"])

    aesgcm = AESGCM(kek)
    dek = aesgcm.decrypt(nonce, wrapped_dek, b"SNX-DEK-WRAP")
    return dek
