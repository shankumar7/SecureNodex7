"""Batching, Merkle inclusion proof, and API proof verification tests (AT-05)."""

import time

import pytest
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import ec
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.auth.rbac import RoleBit
from backend.app.auth.security import create_access_token, hash_password
from backend.app.db.models import Principal
from backend.app.gateway_batcher import (
    BatchManager,
    compute_batch_inclusion_proof,
    compute_batch_merkle_root,
    verify_batch_inclusion_proof,
)
from backend.app.message_core import sign_device_message
from backend.app.storage.coordinator import coordinator
from backend.app.storage.placement import StorageNodeInfo


@pytest.fixture
def device_key():
    return ec.generate_private_key(ec.SECP256R1(), default_backend())


@pytest.mark.asyncio
async def test_batcher_merkle_and_proofs(
    db_session: AsyncSession, async_client: AsyncClient, device_key: ec.EllipticCurvePrivateKey
) -> None:
    # 1. Generate 5 verified envelopes
    device_id = "d-test-batch-01"
    now_ts = int(time.time())
    envelopes = [
        sign_device_message(
            private_key=device_key,
            device_id=device_id,
            seq=i,
            timestamp=now_ts + i,
            msg_type="tel",
            payload={"reading": i * 10},
        )
        for i in range(1, 6)
    ]

    # 2. Merkle Root Computation
    root = compute_batch_merkle_root(envelopes)
    assert len(root) == 64

    # 3. Inclusion Proofs for all 5 messages
    for idx, env in enumerate(envelopes):
        proof = compute_batch_inclusion_proof(envelopes, idx)
        assert verify_batch_inclusion_proof(env, proof, root) is True

    # 4. Flush Batch using BatchManager
    from unittest.mock import patch
    batcher = BatchManager(max_messages=5, max_seconds=100.0)

    async def mock_upload(data, name, mime, owner_id, classification, nodes):
        return {"manifest_id": "manifest-batch-001", "object_id": "obj-batch-001"}

    nodes = [StorageNodeInfo(id="storage-1", endpoint="http://storage-1:7443")]

    with patch.object(coordinator, "upload_object", side_effect=mock_upload):
        for env in envelopes[:-1]:
            res = await batcher.add_message(env, db_session, nodes)
            assert res is None  # Not flushed yet

        # 5th message triggers flush
        batch_record = await batcher.add_message(envelopes[-1], db_session, nodes)
        assert batch_record is not None
        assert batch_record.message_count == 5
        assert batch_record.batch_root == "0x" + root

    # 5. Test Batch and Proof API endpoints
    auditor_id = "did:snx:auditor1"
    auditor = Principal(
        id=auditor_id,
        username="auditor",
        password_hash=hash_password("Pass123!"),
        display_name="Auditor",
        roles_mask=RoleBit.AUDITOR.value,
        status="ACTIVE",
    )
    db_session.add(auditor)
    await db_session.commit()

    token = create_access_token(
        principal_id=auditor_id,
        username="auditor",
        roles=["AUDITOR"],
        role_mask=RoleBit.AUDITOR.value,
    )

    # GET /v1/batches
    b_res = await async_client.get(
        "/v1/batches",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert b_res.status_code == 200
    batches_data = b_res.json()["batches"]
    assert len(batches_data) >= 1

    # GET /v1/batches/{id}/proof/{seq}
    p_res = await async_client.get(
        f"/v1/batches/{batch_record.id}/proof/2",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert p_res.status_code == 200
    p_data = p_res.json()
    assert p_data["seq"] == 2
    assert p_data["verified"] is True
    assert len(p_data["proof"]) > 0

    # POST /v1/batches/verify-proof
    v_res = await async_client.post(
        "/v1/batches/verify-proof",
        json={
            "envelope": p_data["message"],
            "proof": p_data["proof"],
            "expected_root": p_data["merkle_root"],
        },
    )
    assert v_res.status_code == 200
    assert v_res.json()["valid"] is True
