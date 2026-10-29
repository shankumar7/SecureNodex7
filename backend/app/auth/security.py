"""Security utilities for ES256 JWT, Argon2id passwords, and token hashing."""

import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from passlib.context import CryptContext

from backend.app.config import settings

# Argon2id password hashing context
pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__type="ID",
    argon2__time_cost=3,
    argon2__memory_cost=65536,
    argon2__parallelism=4,
)

# JWT Key cache
_jwt_private_key: ec.EllipticCurvePrivateKey | None = None
_jwt_public_key: ec.EllipticCurvePublicKey | None = None


def get_jwt_keys() -> tuple[ec.EllipticCurvePrivateKey, ec.EllipticCurvePublicKey]:
    """Retrieve or generate ECDSA P-256 keys for ES256 JWT."""
    global _jwt_private_key, _jwt_public_key
    if _jwt_private_key is not None and _jwt_public_key is not None:
        return _jwt_private_key, _jwt_public_key

    key_file = settings.JWT_KEY_FILE
    if os.path.exists(key_file):
        with open(key_file, "rb") as f:
            key_data = f.read()
            loaded_key = serialization.load_pem_private_key(key_data, password=None)
            if not isinstance(loaded_key, ec.EllipticCurvePrivateKey):
                raise ValueError("JWT key must be an EC private key")
            _jwt_private_key = loaded_key
            _jwt_public_key = _jwt_private_key.public_key()
    else:
        # Generate ephemeral keypair if not on disk (e.g. tests / initial dev)
        _jwt_private_key = ec.generate_private_key(ec.SECP256R1())
        _jwt_public_key = _jwt_private_key.public_key()

    return _jwt_private_key, _jwt_public_key


def hash_password(password: str) -> str:
    """Hash password using Argon2id."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against Argon2id hash."""
    return pwd_context.verify(plain_password, hashed_password)


def hash_token(token: str) -> str:
    """Compute SHA-256 hex digest of a token."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_refresh_token() -> tuple[str, str]:
    """Generate a high-entropy refresh token and its SHA-256 hash."""
    raw_token = secrets.token_urlsafe(48)
    token_hash = hash_token(raw_token)
    return raw_token, token_hash


def create_access_token(
    principal_id: str,
    username: str,
    roles: list[str],
    role_mask: int,
    expires_delta: timedelta | None = None,
) -> str:
    """Generate an ES256-signed JWT access token."""
    private_key, _ = get_jwt_keys()
    now = datetime.now(timezone.utc)
    expire = now + expires_delta if expires_delta else now + timedelta(minutes=15)

    payload = {
        "sub": principal_id,
        "username": username,
        "roles": roles,
        "role_mask": role_mask,
        "iss": "snx-api",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "jti": secrets.token_hex(16),
    }

    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )

    encoded_jwt = jwt.encode(payload, private_pem, algorithm="ES256")
    return encoded_jwt


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and verify an ES256-signed JWT token."""
    _, public_key = get_jwt_keys()
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )

    payload = jwt.decode(
        token,
        public_pem,
        algorithms=["ES256"],
        issuer="snx-api",
        options={"require": ["exp", "iss", "sub", "iat"]},
    )
    return payload
