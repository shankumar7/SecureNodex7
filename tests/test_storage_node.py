"""Unit tests for snx-storage node service (AT-13)."""

import hashlib
import shutil
import tempfile

import pytest
from httpx import ASGITransport, AsyncClient

from storage.app.config import storage_settings
from storage.app.main import app


@pytest.fixture
def temp_storage_dir():
    temp_dir = tempfile.mkdtemp(prefix="snx_test_storage_")
    old_dir = storage_settings.STORAGE_DIR
    storage_settings.STORAGE_DIR = temp_dir
    from storage.app.main import store
    store.base_dir = temp_dir
    store.inventory = {}
    yield temp_dir
    shutil.rmtree(temp_dir, ignore_errors=True)
    storage_settings.STORAGE_DIR = old_dir


@pytest.mark.asyncio
async def test_storage_node_put_get_head_delete(temp_storage_dir: str) -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Node Health
        health_res = await client.get("/v1/health")
        assert health_res.status_code == 200
        assert health_res.json()["state"] == "UP"

        # 2. PUT valid chunk (AT-13)
        data = b"Hello, SecureNodeX Decentralized Storage!"
        chunk_id = hashlib.sha256(data).hexdigest()

        put_res = await client.put(
            f"/v1/chunks/{chunk_id}",
            content=data,
            headers={"X-SNX-Kind": "data"},
        )
        assert put_res.status_code == 201
        assert put_res.json()["status"] == "stored"

        # 3. PUT with hash mismatch -> must be rejected with 422
        bad_res = await client.put(
            f"/v1/chunks/{'a'*64}",
            content=data,
        )
        assert bad_res.status_code == 422

        # 4. HEAD chunk
        head_res = await client.head(f"/v1/chunks/{chunk_id}")
        assert head_res.status_code == 200
        assert head_res.headers["Content-Length"] == str(len(data))
        assert head_res.headers["X-SNX-Kind"] == "data"

        # 5. GET chunk
        get_res = await client.get(f"/v1/chunks/{chunk_id}")
        assert get_res.status_code == 200
        assert get_res.content == data

        # 6. GET inventory
        inv_res = await client.get("/v1/inventory")
        assert inv_res.status_code == 200
        inv_data = inv_res.json()
        assert inv_data["total"] == 1
        assert inv_data["items"][0]["id"] == chunk_id

        # 7. DELETE chunk
        del_res = await client.delete(f"/v1/chunks/{chunk_id}")
        assert del_res.status_code == 200

        # Verify chunk gone
        get_after = await client.get(f"/v1/chunks/{chunk_id}")
        assert get_after.status_code == 404
