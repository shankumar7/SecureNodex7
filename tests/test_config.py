"""Test configuration invariants against specifications."""

from backend.app.config import Settings


def test_default_config_matches_spec() -> None:
    config = Settings()
    assert config.PROJECT_NAME == "SecureNodeX"
    assert config.CHAIN_ID == 20260
    assert config.CHUNK_SIZE == 65536
    assert config.REPLICATION_R == 3
    assert config.WRITE_QUORUM_W == 2
    assert config.HEARTBEAT_S == 5
    assert config.GC_GRACE_S == 300
    assert config.BATCH_MAX_MSGS == 100
    assert config.BATCH_MAX_SECONDS == 30
    assert config.ADMIN_CONTENT_ACCESS is False
