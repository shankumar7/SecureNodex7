"""Event indexer tests."""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.app.db.base import Base
from backend.app.db.models import AuditEvent, Device, Principal
from backend.app.indexer import EventIndexer

test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
TestSessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_indexer_handles_events() -> None:
    indexer = EventIndexer()
    async with TestSessionLocal() as session:
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
        session.add(dev)
        await session.commit()

        mock_event = {
            "args": {
                "identityId": identity_id_bytes,
                "spkiFingerprint": fp_bytes,
                "roleMask": 16,
                "status": 1,
            },
            "transactionHash": bytes.fromhex("33" * 32),
        }

        await indexer._handle_identity_registered(session, mock_event)
        await session.commit()

        # Verify device updated to ACTIVE with fingerprint and tx_hash
        stmt = select(Device).where(Device.id == id_hex)
        updated_dev = (await session.execute(stmt)).scalar_one()
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
        await indexer._handle_identity_status_changed(session, status_event)
        await session.commit()

        updated_dev_2 = (await session.execute(stmt)).scalar_one()
        assert updated_dev_2.status == "REVOKED"
