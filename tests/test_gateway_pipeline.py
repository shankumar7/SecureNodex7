"""Gateway verification pipeline tests for AT-02, AT-08, AT-09, AT-10, AT-11, AT-12."""

import json
import time
from typing import Any

import pytest
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import ec
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.models import Device
from backend.app.gateway_pipeline import GatewayPipeline
from backend.app.message_core import sign_device_message
from pki.ca_core import compute_public_key_fingerprint


@pytest.fixture
def device_keypair():
    priv = ec.generate_private_key(ec.SECP256R1(), default_backend())
    pub = priv.public_key()
    return priv, pub


@pytest.mark.asyncio
async def test_gateway_pipeline_full_matrix(
    db_session: AsyncSession, device_keypair: tuple[Any, Any]
) -> None:
    priv_key, pub_key = device_keypair
    device_id = "d-0a1b2c3d4e5f6071"
    topic = f"snx/v1/dev/{device_id}/telemetry"

    # Seed active device
    fp = compute_public_key_fingerprint(pub_key)
    dev = Device(
        id=device_id,
        label="Test Sensor",
        status="ACTIVE",
        spki_fingerprint=fp,
    )
    db_session.add(dev)
    await db_session.commit()

    pipeline = GatewayPipeline()
    now_ts = int(time.time())

    # --- 1. Valid Message Passes All 8 Checks ---
    env1 = sign_device_message(
        private_key=priv_key,
        device_id=device_id,
        seq=1,
        timestamp=now_ts,
        msg_type="tel",
        payload={"temp_c": 22.4, "hum_pct": 45.0},
    )
    raw1 = json.dumps(env1).encode("utf-8")
    ok, parsed, reason = await pipeline.verify_envelope(
        raw_bytes=raw1,
        topic=topic,
        db=db_session,
        public_key_override=pub_key,
        now_override=now_ts,
    )
    assert ok is True
    assert reason is None

    # --- 2. Check 1: Malformed / Oversize / Invalid Version (MALFORMED) ---
    oversize_raw = b"{" + b"a" * 1050 + b"}"
    ok, _, reason = await pipeline.verify_envelope(oversize_raw, topic, db_session)
    assert ok is False
    assert reason == "MALFORMED"

    bad_ver_env = dict(env1)
    bad_ver_env["v"] = 2
    ok, _, reason = await pipeline.verify_envelope(
        json.dumps(bad_ver_env).encode(), topic, db_session
    )
    assert ok is False
    assert reason == "MALFORMED"

    # --- 3. Check 2: Topic Mismatch / Cert CN Mismatch (ACCESS_DENIED - AT-09) ---
    ok, _, reason = await pipeline.verify_envelope(
        raw_bytes=raw1,
        topic="snx/v1/dev/d-OTHER_DEVICE/telemetry",
        db=db_session,
        public_key_override=pub_key,
        now_override=now_ts,
    )
    assert ok is False
    assert reason == "ACCESS_DENIED"

    # --- 4. Check 3: Revoked Device (AUTH_DENIED - AT-02, AT-08) ---
    dev.status = "REVOKED"
    await db_session.commit()
    pipeline.invalidate_cache(device_id)

    env2 = sign_device_message(
        priv_key, device_id, seq=2, timestamp=now_ts, msg_type="tel", payload={"temp": 20}
    )
    ok, _, reason = await pipeline.verify_envelope(
        raw_bytes=json.dumps(env2).encode(),
        topic=topic,
        db=db_session,
        public_key_override=pub_key,
        now_override=now_ts,
    )
    assert ok is False
    assert reason == "AUTH_DENIED"

    # Re-activate device for remaining checks
    dev.status = "ACTIVE"
    await db_session.commit()
    pipeline.invalidate_cache(device_id)

    # --- 5. Check 4: Timestamp Out-of-Window (TIMESTAMP_OUT_OF_WINDOW) ---
    env_old = sign_device_message(
        priv_key, device_id, seq=3, timestamp=now_ts - 500, msg_type="tel", payload={"temp": 20}
    )
    ok, _, reason = await pipeline.verify_envelope(
        raw_bytes=json.dumps(env_old).encode(),
        topic=topic,
        db=db_session,
        public_key_override=pub_key,
        now_override=now_ts,
    )
    assert ok is False
    assert reason == "TIMESTAMP_OUT_OF_WINDOW"

    # --- 6. Check 5: Replay Attack (REPLAY_REJECTED - AT-11) ---
    # Attempting to send seq=1 again when last_seq was 1
    ok, _, reason = await pipeline.verify_envelope(
        raw_bytes=raw1,
        topic=topic,
        db=db_session,
        public_key_override=pub_key,
        now_override=now_ts,
    )
    assert ok is False
    assert reason == "REPLAY_REJECTED"

    # --- 7. Check 6: Tampered Payload / Signature (SIGNATURE_INVALID - AT-10) ---
    env_tampered = sign_device_message(
        priv_key, device_id, seq=4, timestamp=now_ts, msg_type="tel", payload={"temp": 20}
    )
    env_tampered["p"] = "eyJ0ZW1wX2MiOjk5OS45fQ"  # Modifying payload after signing
    ok, _, reason = await pipeline.verify_envelope(
        raw_bytes=json.dumps(env_tampered).encode(),
        topic=topic,
        db=db_session,
        public_key_override=pub_key,
        now_override=now_ts,
    )
    assert ok is False
    assert reason == "SIGNATURE_INVALID"

    # --- 8. Check 7: Rate Limiting (RATE_LIMITED - AT-12) ---
    pipeline.rate_limits[device_id] = []
    # Send 5 messages in current second
    for s in range(5, 10):
        e = sign_device_message(
            priv_key, device_id, seq=s, timestamp=now_ts, msg_type="tel", payload={"s": s}
        )
        ok, _, reason = await pipeline.verify_envelope(
            raw_bytes=json.dumps(e).encode(),
            topic=topic,
            db=db_session,
            public_key_override=pub_key,
            now_override=now_ts,
        )
        assert ok is True

    # 6th message in same second must be rate-limited
    e_excess = sign_device_message(
        priv_key, device_id, seq=10, timestamp=now_ts, msg_type="tel", payload={"s": 10}
    )
    ok, _, reason = await pipeline.verify_envelope(
        raw_bytes=json.dumps(e_excess).encode(),
        topic=topic,
        db=db_session,
        public_key_override=pub_key,
        now_override=now_ts,
    )
    assert ok is False
    assert reason == "RATE_LIMITED"
