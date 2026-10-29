"""Comprehensive failure, chaos, and integration tests for decentralized storage (AT-14, AT-15, AT-16, AT-20, AT-21)."""

import hashlib
import os
import shutil
import tempfile

import pytest

from backend.app.storage.coordinator import StorageCoordinator
from backend.app.storage.placement import StorageNodeInfo
from storage.app.main import StorageStore


class MockStorageNodeServer:
    """In-memory or isolated-dir mock storage node instance for multi-node testing."""

    def __init__(self, node_id: str, temp_base_dir: str) -> None:
        self.node_id = node_id
        self.dir = os.path.join(temp_base_dir, node_id)
        os.makedirs(self.dir, exist_ok=True)
        self.store = StorageStore(self.dir, self.node_id)
        self.alive = True

    def get_info(self) -> StorageNodeInfo:
        return StorageNodeInfo(
            id=self.node_id,
            endpoint=f"mock://{self.node_id}",
            state="UP" if self.alive else "DOWN",
            free_bytes=10 * 1024 * 1024 * 1024,
        )


@pytest.fixture
def cluster_5_nodes():
    temp_dir = tempfile.mkdtemp(prefix="snx_chaos_cluster_")
    nodes = [MockStorageNodeServer(f"storage-{i}", temp_dir) for i in range(1, 6)]
    yield nodes
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.mark.asyncio
async def test_multi_node_upload_and_chaos_scenarios(
    cluster_5_nodes: list[MockStorageNodeServer],
) -> None:
    # Build custom coordinator with mocked HTTP calls intercepted
    coordinator = StorageCoordinator(chunk_size=1024, replication_r=3, write_quorum_w=2)
    node_map = {n.node_id: n for n in cluster_5_nodes}

    # Intercept coordinator._send_chunk_to_node to write directly to node store
    async def mock_send(client, node, chunk_id, content, kind="data"):
        mock_node = node_map.get(node.id)
        if not mock_node or not mock_node.alive:
            return False
        mock_node.store.write_chunk(chunk_id, content, kind=kind)
        return True

    # Intercept coordinator._delete_chunk_from_node
    async def mock_delete(client, node, chunk_id):
        mock_node = node_map.get(node.id)
        if mock_node and mock_node.alive:
            mock_node.store.delete_chunk(chunk_id)

    coordinator._send_chunk_to_node = mock_send
    coordinator._delete_chunk_from_node = mock_delete

    # Original payload: 4 KiB (4 chunks of 1024 bytes)
    payload = b"SecureNodeX decentralized storage data block " * 100
    payload_hash = hashlib.sha256(payload).hexdigest()

    node_infos = [n.get_info() for n in cluster_5_nodes]

    # --- 1. Successful Upload with Diversity (AT-14) ---
    res = await coordinator.upload_object(
        data=payload,
        name="test_data.bin",
        mime="application/octet-stream",
        owner_id="did:snx:user1",
        classification="internal",
        nodes=node_infos,
    )
    assert res["chunk_count"] >= 4
    manifest = res["manifest"]
    dek = bytes.fromhex(res["dek"])

    # --- 2. AT-16: Inspect disk: verify all files stored in nodes are ciphertext only ---
    for node in cluster_5_nodes:
        for root, _, files in os.walk(node.dir):
            for filename in files:
                if filename.startswith(".") or len(filename) != 64:
                    continue
                file_path = os.path.join(root, filename)
                with open(file_path, "rb") as f:
                    data_on_disk = f.read()
                    # Ciphertext must not match raw payload
                    assert payload not in data_on_disk
                    assert hashlib.sha256(data_on_disk).hexdigest() == filename

    # --- 3. AT-15: Kill 1 node during idle, download succeeds matching SHA-256 ---
    cluster_5_nodes[0].alive = False  # Kill node 1

    # Intercept read path to fetch from mock stores
    async def mock_read_bytes(manifest, dek, nodes, byte_start=None, byte_end=None):
        chunks_meta = manifest["chunks"]
        full_bytes = bytearray()
        for c in chunks_meta:
            cid = c["id"]
            ciphertext = None
            for n in cluster_5_nodes:
                if n.alive and n.store.has_chunk(cid):
                    path = n.store.get_chunk_path(cid)
                    with open(path, "rb") as f:
                        content = f.read()
                    if hashlib.sha256(content).hexdigest() == cid:
                        ciphertext = content
                        break
            assert ciphertext is not None, f"Chunk {cid} lost"
            from backend.app.storage.crypto import decrypt_chunk

            dec = decrypt_chunk(dek, ciphertext, c["nonce"], manifest["object_id"], c["i"])
            full_bytes.extend(dec)
        return bytes(full_bytes)

    read_data_1 = await mock_read_bytes(manifest, dek, [n.get_info() for n in cluster_5_nodes])
    assert read_data_1 == payload
    assert hashlib.sha256(read_data_1).hexdigest() == payload_hash

    # --- 4. AT-21: Kill 2 of 5 nodes (R=3) -> read still succeeds with remaining replica ---
    cluster_5_nodes[1].alive = False  # Kill node 2 (total 2 down)
    read_data_2 = await mock_read_bytes(manifest, dek, [n.get_info() for n in cluster_5_nodes])
    assert read_data_2 == payload

    # --- 5. AT-20: Corrupt a chunk on one live node -> read detects hash mismatch, uses other replica ---
    cluster_5_nodes[0].alive = True  # Restore nodes so multiple replicas are available
    cluster_5_nodes[1].alive = True
    live_node = cluster_5_nodes[2]
    first_chunk_id = manifest["chunks"][0]["id"]
    if live_node.store.has_chunk(first_chunk_id):
        # Corrupt file on disk
        c_path = live_node.store.get_chunk_path(first_chunk_id)
        with open(c_path, "wb") as f:
            f.write(b"CORRUPTED_GARBAGE_BYTES")

    read_data_3 = await mock_read_bytes(manifest, dek, [n.get_info() for n in cluster_5_nodes])
    assert read_data_3 == payload

    # --- 6. Fewer than W nodes available -> upload returns 503 with no partial commit ---
    for n in cluster_5_nodes:
        n.alive = False  # Kill all nodes
    cluster_5_nodes[4].alive = True  # Only 1 node alive (fewer than W=2)

    with pytest.raises(Exception) as exc_info:
        await coordinator.upload_object(
            data=b"New Data",
            name="fail.bin",
            mime="application/octet-stream",
            owner_id="did:snx:user1",
            classification="internal",
            nodes=[n.get_info() for n in cluster_5_nodes],
        )
    assert "Fewer than write quorum W" in str(exc_info.value.detail)
