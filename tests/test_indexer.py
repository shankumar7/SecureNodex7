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
