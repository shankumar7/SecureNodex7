"""Blockchain event indexer worker that syncs and rebuilds DB state from on-chain event logs."""

import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.chain.client import chain_client
from backend.app.db.models import AuditEvent, ChainSyncState, Device, Principal

logger = logging.getLogger("snx.indexer")


class EventIndexer:
    """Worker to index on-chain events and keep the relational database synchronized with the chain."""

    def __init__(self) -> None:
        self.client = chain_client

    async def sync_events(self, db: AsyncSession, from_block: int = 0) -> int:
        """Fetch and process unindexed events from smart contracts."""
        if not self.client.is_connected():
            return 0

        w3 = self.client.w3
        latest_block = w3.eth.block_number
        events_processed = 0

        # 1. Sync IdentityRegistry events
        identity_contract = self.client.contracts.get("IdentityRegistry")
        if identity_contract:
            try:
                registered_events = identity_contract.events.IdentityRegistered.get_logs(
                    from_block=from_block,
                    to_block=latest_block,
                )
                for ev in registered_events:
                    await self._handle_identity_registered(db, ev)
                    events_processed += 1
            except Exception as e:
                logger.warning(f"Error indexing IdentityRegistered: {e}")

            try:
                status_events = identity_contract.events.IdentityStatusChanged.get_logs(
                    from_block=from_block,
                    to_block=latest_block,
                )
                for ev in status_events:
                    await self._handle_identity_status_changed(db, ev)
                    events_processed += 1
            except Exception as e:
                logger.warning(f"Error indexing IdentityStatusChanged: {e}")

            try:
                rotated_events = identity_contract.events.IdentityKeyRotated.get_logs(
                    from_block=from_block,
                    to_block=latest_block,
                )
                for ev in rotated_events:
                    await self._handle_identity_key_rotated(db, ev)
                    events_processed += 1
            except Exception as e:
                logger.warning(f"Error indexing IdentityKeyRotated: {e}")

        # 2. Sync AuditLog events
        audit_contract = self.client.contracts.get("AuditLog")
        if audit_contract:
            try:
                audit_logs = audit_contract.events.AuditRecorded.get_logs(
                    from_block=from_block,
                    to_block=latest_block,
                )
                for ev in audit_logs:
                    await self._handle_audit_recorded(db, ev)
                    events_processed += 1
            except Exception as e:
                logger.warning(f"Error indexing AuditRecorded: {e}")

        # Update sync state
        stmt = select(ChainSyncState).where(ChainSyncState.contract_name == "ALL")
        state = (await db.execute(stmt)).scalar_one_or_none()
        if not state:
            state = ChainSyncState(contract_name="ALL", last_block_number=latest_block)
            db.add(state)
        else:
            state.last_block_number = latest_block

        await db.commit()
        return events_processed

    async def _handle_identity_registered(self, db: AsyncSession, event: Any) -> None:
        args = event["args"]
        identity_id_bytes = args["identityId"]
        fp_bytes = args["spkiFingerprint"]
        role_mask = args["roleMask"]
        status_code = args["status"]

        status_map = {1: "ACTIVE", 2: "SUSPENDED", 3: "REVOKED"}
        status_str = status_map.get(status_code, "ACTIVE")
        fp_hex = "0x" + fp_bytes.hex()
        tx_hash = event["transactionHash"].hex()

        id_hex = "0x" + identity_id_bytes.hex()
        stmt = select(Device).where(Device.id == id_hex)
        device = (await db.execute(stmt)).scalar_one_or_none()
        if device:
            device.status = status_str
            device.spki_fingerprint = fp_hex
            device.tx_hash = tx_hash
            return

        stmt = select(Principal).where(Principal.id == id_hex)
        principal = (await db.execute(stmt)).scalar_one_or_none()
        if principal:
            principal.status = status_str
            principal.roles_mask = role_mask
            principal.spki_fingerprint = fp_hex

    async def _handle_identity_status_changed(self, db: AsyncSession, event: Any) -> None:
        args = event["args"]
        identity_id_bytes = args["identityId"]
        new_status = args["newStatus"]
        status_map = {1: "ACTIVE", 2: "SUSPENDED", 3: "REVOKED"}
        status_str = status_map.get(new_status, "UNKNOWN")

        id_hex = "0x" + identity_id_bytes.hex()
        stmt = select(Principal).where(Principal.id == id_hex)
        principal = (await db.execute(stmt)).scalar_one_or_none()
        if principal:
            principal.status = status_str

        stmt_dev = select(Device).where(Device.id == id_hex)
        device = (await db.execute(stmt_dev)).scalar_one_or_none()
        if device:
            device.status = status_str

    async def _handle_identity_key_rotated(self, db: AsyncSession, event: Any) -> None:
        args = event["args"]
        identity_id_bytes = args["identityId"]
        new_fp = "0x" + args["newFingerprint"].hex()

        id_hex = "0x" + identity_id_bytes.hex()
        stmt = select(Principal).where(Principal.id == id_hex)
        principal = (await db.execute(stmt)).scalar_one_or_none()
        if principal:
            principal.spki_fingerprint = new_fp

        stmt_dev = select(Device).where(Device.id == id_hex)
        device = (await db.execute(stmt_dev)).scalar_one_or_none()
        if device:
            device.spki_fingerprint = new_fp

    async def _handle_audit_recorded(self, db: AsyncSession, event: Any) -> None:
        args = event["args"]
        seq = args["seq"]
        head = "0x" + args["head"].hex()
        prev_head = "0x" + args["prevHead"].hex()
        event_type = "0x" + args["eventType"].hex()
        actor = "0x" + args["actor"].hex()
        subject = "0x" + args["subject"].hex()
        data_hash = "0x" + args["dataHash"].hex()
        cid = "0x" + args["correlationId"].hex()
        tx_hash = event["transactionHash"].hex()

        stmt = select(AuditEvent).where(AuditEvent.seq == seq)
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if not existing:
            entry = AuditEvent(
                seq=seq,
                event_type=event_type,
                actor_id=actor,
                subject_id=subject,
                data_hash=data_hash,
                correlation_id=cid,
                timestamp=event.get("blockNumber", 0),
                tx_hash=tx_hash,
                prev_head=prev_head,
                head=head,
                details=None,
            )
            db.add(entry)

    async def rebuild_db_from_chain(self, db: AsyncSession) -> int:
        """Full rebuild of indexed entities from genesis block 0."""
        return await self.sync_events(db, from_block=0)


event_indexer = EventIndexer()
