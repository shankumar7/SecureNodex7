"""SQLAlchemy database models for SecureNodeX."""

from datetime import datetime, timezone
import uuid
from typing import Any

from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from backend.app.db.base import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Principal(Base):
    __tablename__ = "principals"

    id = Column(String(128), primary_key=True, index=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    display_name = Column(String(128), nullable=False, default="")
    roles_mask = Column(Integer, nullable=False, default=8)  # Default USER (8)
    status = Column(String(32), nullable=False, default="ACTIVE")  # ACTIVE, SUSPENDED, REVOKED
    spki_fingerprint = Column(String(64), nullable=True, index=True)
    metadata_uri = Column(String(255), nullable=False, default="")
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    refresh_tokens = relationship("RefreshToken", back_populates="principal", cascade="all, delete-orphan")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    principal_id = Column(String(128), ForeignKey("principals.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(64), unique=True, nullable=False, index=True)  # SHA-256 hex
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    principal = relationship("Principal", back_populates="refresh_tokens")


class Device(Base):
    __tablename__ = "devices"

    id = Column(String(128), primary_key=True, index=True)  # did:snx:device:...
    label = Column(String(128), nullable=False)
    device_type = Column(String(64), nullable=False, default="generic")
    status = Column(String(32), nullable=False, default="PENDING")  # PENDING, ACTIVE, SUSPENDED, REVOKED
    enrollment_token = Column(String(128), nullable=True, index=True)
    enrollment_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    spki_fingerprint = Column(String(64), nullable=True, index=True)
    cert_serial = Column(String(64), nullable=True)
    cert_expires_at = Column(DateTime(timezone=True), nullable=True)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    tx_hash = Column(String(66), nullable=True)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    seq = Column(BigInteger, nullable=True, index=True)
    event_type = Column(String(64), nullable=False, index=True)
    actor_id = Column(String(128), nullable=False, index=True)
    subject_id = Column(String(128), nullable=False, index=True)
    data_hash = Column(String(66), nullable=False)
    correlation_id = Column(String(64), nullable=False, index=True)
    timestamp = Column(BigInteger, nullable=False)
    tx_hash = Column(String(66), nullable=True)
    prev_head = Column(String(66), nullable=True)
    head = Column(String(66), nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)


class IdempotencyRecord(Base):
    __tablename__ = "idempotency_records"

    key = Column(String(128), primary_key=True)
    principal_id = Column(String(128), nullable=False, index=True)
    request_hash = Column(String(64), nullable=False)
    response_status = Column(Integer, nullable=False)
    response_body = Column(Text, nullable=False)
    response_headers = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    expires_at = Column(DateTime(timezone=True), nullable=False)


class ChainSyncState(Base):
    __tablename__ = "chain_sync_state"

    contract_name = Column(String(64), primary_key=True)
    last_block_number = Column(BigInteger, nullable=False, default=0)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)


class StorageNode(Base):
    __tablename__ = "storage_nodes"

    id = Column(String(64), primary_key=True)
    endpoint = Column(String(255), nullable=False)
    state = Column(String(32), nullable=False, default="UP")  # UP, SUSPECT, DOWN, SYNCING
    free_bytes = Column(BigInteger, nullable=False, default=10 * 1024 * 1024 * 1024)
    used_bytes = Column(BigInteger, nullable=False, default=0)
    chunk_count = Column(Integer, nullable=False, default=0)
    last_heartbeat = Column(DateTime(timezone=True), nullable=True)
    fingerprint = Column(String(64), nullable=True)
    draining = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)


class StoredObject(Base):
    __tablename__ = "stored_objects"

    id = Column(String(64), primary_key=True)  # UUID
    manifest_id = Column(String(64), nullable=False, index=True)
    owner_id = Column(String(128), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    size = Column(BigInteger, nullable=False)
    chunk_count = Column(Integer, nullable=False)
    merkle_root = Column(String(64), nullable=False)
    classification = Column(String(32), nullable=False, default="internal")
    status = Column(String(32), nullable=False, default="ACTIVE")  # ACTIVE, TOMBSTONED
    dek_hex = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)


class StoredChunk(Base):
    __tablename__ = "stored_chunks"

    id = Column(String(64), primary_key=True)  # SHA-256 of ciphertext
    object_id = Column(String(64), ForeignKey("stored_objects.id", ondelete="CASCADE"), nullable=False, index=True)
    idx = Column(Integer, nullable=False)
    length = Column(Integer, nullable=False)
    kind = Column(String(32), nullable=False, default="data")
    nonce = Column(String(64), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)


class ChunkReplica(Base):
    __tablename__ = "chunk_replicas"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    chunk_id = Column(String(64), ForeignKey("stored_chunks.id", ondelete="CASCADE"), nullable=False, index=True)
    node_id = Column(String(64), ForeignKey("storage_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    state = Column(String(32), nullable=False, default="stored")  # pending, stored, corrupt, missing
    verified_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)


class ObjectGrant(Base):
    __tablename__ = "object_grants"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    object_id = Column(String(64), ForeignKey("stored_objects.id", ondelete="CASCADE"), nullable=False, index=True)
    grantee_id = Column(String(128), nullable=False, index=True)
    grant_blob_id = Column(String(64), nullable=False)
    permissions = Column(Integer, nullable=False, default=1)  # 1=READ, 2=WRITE
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
