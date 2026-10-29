"""Event indexer tests."""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.models import Device
from backend.app.indexer import EventIndexer


@pytest.mark.asyncio
async def test_indexer_handles_events(db_session: AsyncSession) -> None:
    indexer = EventIndexer()

    # Simulate an on-chain IdentityRegistered event
    identity_id_bytes = bytes.fromhex("11" * 32)
    fp_bytes = bytes.fromhex("22" * 32)
    id_hex = "0x" + identity_id_bytes.hex()

    # Seed device record
    dev = Device(
        id=id_hex,
        label="Node 1",
        status="PENDING",
    )
    db_session.add(dev)
    await db_session.commit()

    mock_event = {
        "args": {
            "identityId": identity_id_bytes,
            "spkiFingerprint": fp_bytes,
            "roleMask": 16,
            "status": 1,
        },
        "transactionHash": bytes.fromhex("33" * 32),
    }

    await indexer._handle_identity_registered(db_session, mock_event)
    await db_session.commit()

    # Verify device updated to ACTIVE with fingerprint and tx_hash
    stmt = select(Device).where(Device.id == id_hex)
    updated_dev = (await db_session.execute(stmt)).scalar_one()
    assert updated_dev.status == "ACTIVE"
    assert updated_dev.spki_fingerprint == "0x" + fp_bytes.hex()
    assert updated_dev.tx_hash == ("33" * 32)

    # Simulate IdentityStatusChanged to REVOKED (3)
    status_event = {
        "args": {
            "identityId": identity_id_bytes,
            "newStatus": 3,
        }
    }
    await indexer._handle_identity_status_changed(db_session, status_event)
    await db_session.commit()

    updated_dev_2 = (await db_session.execute(stmt)).scalar_one()
    assert updated_dev_2.status == "REVOKED"


@pytest.mark.asyncio
async def test_at_25_index_rebuild_from_contract_events(db_session: AsyncSession) -> None:
    """Verify AT-25: Rebuilding database index from smart contract event logs restores equivalent state."""
    indexer = EventIndexer()

    # Pre-seed devices
    d1 = "0x" + ("aa" * 32)
    d2 = "0x" + ("bb" * 32)
    db_session.add(Device(id=d1, label="Dev 1", status="PENDING"))
    db_session.add(Device(id=d2, label="Dev 2", status="PENDING"))
    await db_session.commit()

    # Replay events
    ev1 = {
        "args": {
            "identityId": bytes.fromhex("aa" * 32),
            "spkiFingerprint": bytes.fromhex("11" * 32),
            "roleMask": 16,
            "status": 1,
        },
        "transactionHash": bytes.fromhex("99" * 32),
    }
    ev2 = {
        "args": {
            "identityId": bytes.fromhex("bb" * 32),
            "spkiFingerprint": bytes.fromhex("22" * 32),
            "roleMask": 16,
            "status": 1,
        },
        "transactionHash": bytes.fromhex("88" * 32),
    }
    ev3 = {
        "args": {
            "identityId": bytes.fromhex("bb" * 32),
            "newStatus": 3,
        }
    }

    await indexer._handle_identity_registered(db_session, ev1)
    await indexer._handle_identity_registered(db_session, ev2)
    await indexer._handle_identity_status_changed(db_session, ev3)
    await db_session.commit()

    dev1_rebuilt = (await db_session.execute(select(Device).where(Device.id == d1))).scalar_one()
    dev2_rebuilt = (await db_session.execute(select(Device).where(Device.id == d2))).scalar_one()

    assert dev1_rebuilt.status == "ACTIVE"
    assert dev1_rebuilt.spki_fingerprint == "0x" + ("11" * 32)
    assert dev2_rebuilt.status == "REVOKED"
