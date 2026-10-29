"""Initial database schema.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-10-09 13:30:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "principals",
        sa.Column("id", sa.String(length=128), nullable=False),
        sa.Column("username", sa.String(length=64), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("display_name", sa.String(length=128), nullable=False),
        sa.Column("roles_mask", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("spki_fingerprint", sa.String(length=64), nullable=True),
        sa.Column("metadata_uri", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username"),
    )
    op.create_index(op.f("ix_principals_id"), "principals", ["id"], unique=False)
    op.create_index(op.f("ix_principals_username"), "principals", ["username"], unique=True)
    op.create_index(
        op.f("ix_principals_spki_fingerprint"), "principals", ["spki_fingerprint"], unique=False
    )

    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("principal_id", sa.String(length=128), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["principal_id"], ["principals.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_refresh_tokens_principal_id"), "refresh_tokens", ["principal_id"], unique=False
    )
    op.create_index(
        op.f("ix_refresh_tokens_token_hash"), "refresh_tokens", ["token_hash"], unique=True
    )

    op.create_table(
        "devices",
        sa.Column("id", sa.String(length=128), nullable=False),
        sa.Column("label", sa.String(length=128), nullable=False),
        sa.Column("device_type", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("enrollment_token", sa.String(length=128), nullable=True),
        sa.Column("enrollment_token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("spki_fingerprint", sa.String(length=64), nullable=True),
        sa.Column("cert_serial", sa.String(length=64), nullable=True),
        sa.Column("cert_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("tx_hash", sa.String(length=66), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_devices_id"), "devices", ["id"], unique=False)
    op.create_index(
        op.f("ix_devices_enrollment_token"), "devices", ["enrollment_token"], unique=False
    )
    op.create_index(
        op.f("ix_devices_spki_fingerprint"), "devices", ["spki_fingerprint"], unique=False
    )

    op.create_table(
        "audit_events",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("seq", sa.BigInteger(), nullable=True),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("actor_id", sa.String(length=128), nullable=False),
        sa.Column("subject_id", sa.String(length=128), nullable=False),
        sa.Column("data_hash", sa.String(length=66), nullable=False),
        sa.Column("correlation_id", sa.String(length=64), nullable=False),
        sa.Column("timestamp", sa.BigInteger(), nullable=False),
        sa.Column("tx_hash", sa.String(length=66), nullable=True),
        sa.Column("prev_head", sa.String(length=66), nullable=True),
        sa.Column("head", sa.String(length=66), nullable=True),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_audit_events_seq"), "audit_events", ["seq"], unique=False)
    op.create_index(
        op.f("ix_audit_events_event_type"), "audit_events", ["event_type"], unique=False
    )
    op.create_index(op.f("ix_audit_events_actor_id"), "audit_events", ["actor_id"], unique=False)
    op.create_index(
        op.f("ix_audit_events_subject_id"), "audit_events", ["subject_id"], unique=False
    )
    op.create_index(
        op.f("ix_audit_events_correlation_id"), "audit_events", ["correlation_id"], unique=False
    )

    op.create_table(
        "idempotency_records",
        sa.Column("key", sa.String(length=128), nullable=False),
        sa.Column("principal_id", sa.String(length=128), nullable=False),
        sa.Column("request_hash", sa.String(length=64), nullable=False),
        sa.Column("response_status", sa.Integer(), nullable=False),
        sa.Column("response_body", sa.Text(), nullable=False),
        sa.Column("response_headers", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("key"),
    )
    op.create_index(
        op.f("ix_idempotency_records_principal_id"),
        "idempotency_records",
        ["principal_id"],
        unique=False,
    )

    op.create_table(
        "chain_sync_state",
        sa.Column("contract_name", sa.String(length=64), nullable=False),
        sa.Column("last_block_number", sa.BigInteger(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("contract_name"),
    )


def downgrade() -> None:
    op.drop_table("chain_sync_state")
    op.drop_table("idempotency_records")
    op.drop_table("audit_events")
    op.drop_table("devices")
    op.drop_table("refresh_tokens")
    op.drop_table("principals")
