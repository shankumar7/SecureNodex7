"""Objects API integration tests: upload, placement, range download, share, verify, tombstone."""

import io
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.auth.rbac import RoleBit
from backend.app.auth.security import create_access_token, hash_password
from backend.app.db.models import Principal, StorageNode
from backend.app.storage.coordinator import coordinator


@pytest.mark.asyncio
async def test_objects_api_lifecycle(db_session: AsyncSession, async_client: AsyncClient) -> None:
    # 1. Seed admin user & 5 mock storage nodes
    admin_id = "did:snx:admin1"
    user_id = "did:snx:user2"

    admin_user = Principal(
        id=admin_id,
        username="admin",
        password_hash=hash_password("Pass123!"),
        display_name="Admin",
        roles_mask=RoleBit.ADMIN.value,
        status="ACTIVE",
    )
    normal_user = Principal(
        id=user_id,
        username="alice",
        password_hash=hash_password("Pass123!"),
        display_name="Alice",
        roles_mask=RoleBit.USER.value,
        status="ACTIVE",
    )
    db_session.add(admin_user)
    db_session.add(normal_user)

    for i in range(1, 6):
        node = StorageNode(
            id=f"storage-{i}",
            endpoint=f"http://storage-{i}:7443",
            state="UP",
            free_bytes=10 * 1024 * 1024 * 1024,
        )
        db_session.add(node)

    await db_session.commit()

    token = create_access_token(
        principal_id=admin_id,
        username="admin",
        roles=["ADMIN"],
        role_mask=RoleBit.ADMIN.value,
    )

    # Mock coordinator._send_chunk_to_node to return True
    stored_chunks_mock: dict[str, bytes] = {}

    async def mock_send(client, node, chunk_id, content, kind="data"):
        stored_chunks_mock[f"{node.id}:{chunk_id}"] = content
        return True

    async def mock_read_bytes(manifest, dek, nodes, byte_start=None, byte_end=None):
        return b"Hello, SecureNodeX Storage Lifecycle!"

    coordinator._send_chunk_to_node = mock_send
    coordinator.read_object_bytes = mock_read_bytes

    # 2. Upload file
    file_content = b"Hello, SecureNodeX Storage Lifecycle!"
    files = {"file": ("report.txt", io.BytesIO(file_content), "text/plain")}
    data = {"classification": "internal"}

    res = await async_client.post(
        "/v1/objects",
        files=files,
        data=data,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    obj_data = res.json()
    obj_id = obj_data["object_id"]
    assert "manifest_id" in obj_data
    assert "merkle_root" in obj_data
    assert len(obj_data["placements"]) > 0

    # 3. GET /v1/objects/{id}/placement (AT-14 demo view)
    placement_res = await async_client.get(
        f"/v1/objects/{obj_id}/placement",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert placement_res.status_code == 200
    p_data = placement_res.json()
    assert p_data["object_id"] == obj_id
    assert len(p_data["placements"]) > 0

    # 4. GET /v1/objects/{id}/download
    dl_res = await async_client.get(
        f"/v1/objects/{obj_id}/download",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert dl_res.status_code == 200
    assert dl_res.content == file_content

    # 5. Range Download
    range_res = await async_client.get(
        f"/v1/objects/{obj_id}/download",
        headers={"Authorization": f"Bearer {token}", "Range": "bytes=0-4"},
    )
    assert range_res.status_code == 206
    assert "Content-Range" in range_res.headers

    # 6. Share Object
    share_res = await async_client.post(
        f"/v1/objects/{obj_id}/share",
        data={"principal_id": user_id, "permissions": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert share_res.status_code == 200
    assert share_res.json()["status"] == "shared"

    # 7. Verify Object
    verify_res = await async_client.get(
        f"/v1/objects/{obj_id}/verify",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["valid"] is True

    # 8. Storage Health
    health_res = await async_client.get(
        "/v1/storage/health",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert health_res.status_code == 200
    assert health_res.json()["nodes_total"] == 5

    # 9. Tombstone Object
    del_res = await async_client.delete(
        f"/v1/objects/{obj_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "tombstoned"
