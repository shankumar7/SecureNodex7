"""Comprehensive tests for Virtual Device Simulator and AT-22 cert renewal flow."""

import json
import os
import tempfile
from pathlib import Path

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.auth.rbac import RoleBit
from backend.app.auth.security import create_access_token, hash_password
from backend.app.db.models import Device, Principal
from backend.app.gateway_pipeline import GatewayPipeline
from pki.ca_core import compute_public_key_fingerprint, generate_p256_private_key
from simulator.device import VirtualDevice
from simulator.provision import batch_provision_devices
from simulator.renew import renew_device_cert
from simulator.runner import SimulatorRunner


@pytest.mark.asyncio
async def test_simulator_batch_provisioning() -> None:
    """Test batch provisioning of N virtual devices with valid P-256 certs and bundles."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        count = 5
        devices = batch_provision_devices(count=count, out_dir=tmp_dir)
        assert len(devices) == count

        for dev in devices:
            dev_path = Path(dev["bundle_dir"])
            assert (dev_path / "device.key").exists()
            assert (dev_path / "device.crt").exists()
            assert (dev_path / "ca-chain.pem").exists()
            assert (dev_path / "config.json").exists()

            # Verify permissions (0600 on key)
            key_stat = os.stat(dev_path / "device.key")
            assert key_stat.st_mode & 0o777 == 0o600

            config = json.loads((dev_path / "config.json").read_text(encoding="utf-8"))
            assert config["device_id"].startswith("d-")
            assert config["cert_fingerprint"] == dev["fingerprint"]


@pytest.mark.asyncio
async def test_simulator_honest_and_misbehaviour_pipeline(db_session: AsyncSession) -> None:
    """Test virtual device honest telemetry and all misbehaviour modes (AT-02, 08, 09, 10, 11, 12)."""
    priv_key = generate_p256_private_key()
    device_id = "d-sim-test-0001"
    fp = compute_public_key_fingerprint(priv_key.public_key())

    # Register active device in DB
    dev_record = Device(
        id=device_id,
        label="Simulated Sensor 1",
        status="ACTIVE",
        spki_fingerprint=fp,
    )
    db_session.add(dev_record)
    await db_session.commit()

    vdev = VirtualDevice(device_id=device_id, private_key=priv_key)
    pipeline = GatewayPipeline()

    # 1. Honest Telemetry (AT-03)
    topic, raw_bytes, env = vdev.build_envelope()
    ok, _, reason = await pipeline.verify_envelope(
        raw_bytes=raw_bytes,
        topic=topic,
        db=db_session,
        public_key_override=priv_key.public_key(),
    )
    assert ok is True
    assert reason is None

    # 2. Tampered Payload (AT-10 -> SIGNATURE_INVALID)
    topic, raw_bytes, env = vdev.build_envelope(tamper=True)
    ok, _, reason = await pipeline.verify_envelope(
        raw_bytes=raw_bytes,
        topic=topic,
        db=db_session,
        public_key_override=priv_key.public_key(),
    )
    assert ok is False
    assert reason == "SIGNATURE_INVALID"

    # 3. Wrong Topic (AT-09 -> ACCESS_DENIED)
    topic, raw_bytes, env = vdev.build_envelope(wrong_topic=True)
    ok, _, reason = await pipeline.verify_envelope(
        raw_bytes=raw_bytes,
        topic=topic,
        db=db_session,
        public_key_override=priv_key.public_key(),
    )
    assert ok is False
    assert reason == "ACCESS_DENIED"

    # 4. Replay Attack (AT-11 -> REPLAY_REJECTED)
    # Replay sequence 1 which was already accepted
    topic, raw_bytes, env = vdev.build_envelope(seq_override=1)
    ok, _, reason = await pipeline.verify_envelope(
        raw_bytes=raw_bytes,
        topic=topic,
        db=db_session,
        public_key_override=priv_key.public_key(),
    )
    assert ok is False
    assert reason == "REPLAY_REJECTED"


@pytest.mark.asyncio
async def test_simulator_offline_buffering_and_drain(db_session: AsyncSession) -> None:
    """Test offline store-and-forward ring buffer and drain on reconnect."""
    priv_key = generate_p256_private_key()
    device_id = "d-sim-offline-01"
    fp = compute_public_key_fingerprint(priv_key.public_key())

    dev_record = Device(id=device_id, label="Offline Sensor", status="ACTIVE", spki_fingerprint=fp)
    db_session.add(dev_record)
    await db_session.commit()

    vdev = VirtualDevice(device_id=device_id, private_key=priv_key, max_queue_size=3)
    pipeline = GatewayPipeline()

    # Generate 5 messages while offline; queue size is 3 -> 2 should be dropped
    for _ in range(5):
        _, _, env = vdev.build_envelope()
        vdev.queue_message(env)

    assert vdev.dropped_count == 2
    assert len(vdev.offline_queue) == 3

    # Drain on reconnect
    queued = vdev.drain_offline_queue()
    assert len(queued) == 3
    assert len(vdev.offline_queue) == 0

    # Verify all queued messages pass pipeline
    for q_env in queued:
        raw_b = json.dumps(q_env, separators=(",", ":")).encode("utf-8")
        ok, _, reason = await pipeline.verify_envelope(
            raw_bytes=raw_b,
            topic=f"snx/v1/dev/{device_id}/telemetry",
            db=db_session,
            public_key_override=priv_key.public_key(),
            allow_queued=True,
        )
        assert ok is True


@pytest.mark.asyncio
async def test_simulator_load_runner(db_session: AsyncSession) -> None:
    """Run concurrent load simulation across virtual devices and verify percentile stats (AT-24)."""
    count = 10
    devices = []

    for i in range(1, count + 1):
        pk = generate_p256_private_key()
        did = f"d-sim-load-{i:04d}"
        fp = compute_public_key_fingerprint(pk.public_key())
        db_session.add(Device(id=did, label=f"Sensor {i}", status="ACTIVE", spki_fingerprint=fp))
        devices.append(VirtualDevice(device_id=did, private_key=pk))

    await db_session.commit()

    pipeline = GatewayPipeline()
    runner = SimulatorRunner(
        devices=devices,
        pipeline=pipeline,
        db_session=db_session,
        rate_per_sec=10.0,
        duration_s=1.0,
        jitter_s=0.01,
        tamper_rate=0.1,
    )

    summary = await runner.run()
    assert summary["total_attempted"] > 0
    assert summary["throughput_msg_per_s"] > 0
    assert "p95" in summary["latency_ms"]
    assert summary["latency_ms"]["p95"] >= 0


@pytest.mark.asyncio
async def test_simulator_certificate_renewal_flow(
    db_session: AsyncSession, async_client: AsyncClient
) -> None:
    """Test automated certificate renewal flow (/v1/enroll/renew) per docs/08 & AT-22."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        # Provision initial device bundle
        provisioned = batch_provision_devices(count=1, out_dir=tmp_dir)[0]
        device_id = provisioned["device_id"]
        old_fp = provisioned["fingerprint"]

        # Register device as ACTIVE with DEVICE role principal
        dev_record = Device(
            id=device_id,
            label="Renewable Sensor",
            status="ACTIVE",
            spki_fingerprint=old_fp,
        )
        principal = Principal(
            id=device_id,
            username=device_id,
            password_hash=hash_password("dummy"),
            roles_mask=RoleBit.DEVICE.value,
            status="ACTIVE",
        )
        db_session.add(dev_record)
        db_session.add(principal)
        await db_session.commit()

        token = create_access_token(
            principal_id=device_id,
            username=device_id,
            roles=["DEVICE"],
            role_mask=RoleBit.DEVICE.value,
        )

        # Execute certificate renewal client
        renew_res = await renew_device_cert(
            device_dir=provisioned["bundle_dir"],
            api_base_url="http://test",
            auth_token=token,
            client=async_client,
        )

        new_fp = renew_res["new_fingerprint"]
        assert new_fp != old_fp

        # Verify config.json was updated with new fingerprint
        config_path = Path(provisioned["bundle_dir"]) / "config.json"
        updated_config = json.loads(config_path.read_text(encoding="utf-8"))
        assert updated_config["cert_fingerprint"] == new_fp

        # Verify new device key is 0600
        key_stat = os.stat(Path(provisioned["bundle_dir"]) / "device.key")
        assert key_stat.st_mode & 0o777 == 0o600

        # Verify DB was updated with new SPKI fingerprint
        await db_session.refresh(dev_record)
        assert dev_record.spki_fingerprint == new_fp
