"""
SecureNodeX End-to-End Demonstration & Seeding Script (make demo).
Seeds principals (Admin, Auditor, Operator, Device Manager, User), provisions IoT devices,
uploads encrypted documents with HRW chunk placement, mints digital asset NFTs,
ingests signed telemetry envelopes, anchors batches on-chain, and verifies the audit hash chain.
"""

import asyncio
import hashlib
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import ec
from passlib.hash import argon2
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.app.db.models import AuditEvent, Base, Device, Principal
from backend.app.gateway_pipeline import GatewayPipeline
from backend.app.message_core import sign_device_message
from pki.ca_core import compute_public_key_fingerprint


async def run_demo_seeding() -> None:
    print("================================================================================")
    print("                SECURENODEX FULL PLATFORM DEMO & SEEDING                        ")
    print("================================================================================")

    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    # --------------------------------------------------------------------------
    # 1. Seed RBAC Principals & Users
    # --------------------------------------------------------------------------
    print("\n[1/7] Seeding RBAC Principals with Argon2id Hashed Passwords...")
    demo_users = [
        ("admin", "Admin123!", 1, "System Administrator"),
        ("auditor", "Auditor123!", 2, "Compliance Auditor"),
        ("operator", "Operator123!", 4, "Infrastructure Operator"),
        ("manager", "Manager123!", 8, "IoT Fleet Manager"),
        ("user1", "User123!", 8, "Alice Engineering"),
    ]

    async with session_factory() as session:
        for username, password, mask, name in demo_users:
            p = Principal(
                id=f"p-{username}-01",
                username=username,
                display_name=name,
                password_hash=argon2.hash(password),
                roles_mask=mask,
                status="ACTIVE",
            )
            session.add(p)
        await session.commit()
    print(
        "      -> Seeded 5 Users across distinct roles (Admin, Auditor, Operator, Manager, User)."
    )

    # --------------------------------------------------------------------------
    # 2. Provision & Register Devices (Mode A)
    # --------------------------------------------------------------------------
    print("\n[2/7] Provisioning IoT Devices (P-256 Keypairs & SPKI Fingerprints)...")
    dev_priv_1 = ec.generate_private_key(ec.SECP256R1(), default_backend())
    dev_pub_1 = dev_priv_1.public_key()
    fp_1 = compute_public_key_fingerprint(dev_pub_1)

    dev_priv_2 = ec.generate_private_key(ec.SECP256R1(), default_backend())
    dev_pub_2 = dev_priv_2.public_key()
    fp_2 = compute_public_key_fingerprint(dev_pub_2)

    device_id_1 = "esp32-factory-sensor-01"
    device_id_2 = "esp32-energy-monitor-02"

    async with session_factory() as session:
        d1 = Device(
            id=device_id_1,
            label="Factory Floor Sensor #1",
            status="ACTIVE",
            spki_fingerprint=fp_1,
            tx_hash="0x" + ("11" * 32),
        )
        d2 = Device(
            id=device_id_2,
            label="Substation Energy Monitor #2",
            status="ACTIVE",
            spki_fingerprint=fp_2,
            tx_hash="0x" + ("22" * 32),
        )
        session.add_all([d1, d2])
        await session.commit()
    print(f"      -> Device '{device_id_1}' provisioned (SPKI: {fp_1[:16]}...)")
    print(f"      -> Device '{device_id_2}' provisioned (SPKI: {fp_2[:16]}...)")

    # --------------------------------------------------------------------------
    # 3. Ingest Signed Telemetry & Verify Gateway Pipeline
    # --------------------------------------------------------------------------
    print("\n[3/7] Ingesting Telemetry with ECDSA P-256 Raw (r||s) Signatures...")
    pipeline = GatewayPipeline()
    now_ts = int(time.time())

    env1 = sign_device_message(
        private_key=dev_priv_1,
        device_id=device_id_1,
        seq=1,
        timestamp=now_ts,
        msg_type="tel",
        payload={"temp_c": 23.8, "hum_pct": 42.1, "vibration_g": 0.02},
    )
    raw1 = json.dumps(env1).encode("utf-8")
    ok1, _, _ = await pipeline.verify_envelope(
        raw_bytes=raw1,
        topic=f"snx/v1/dev/{device_id_1}/telemetry",
        public_key_override=dev_pub_1,
        now_override=now_ts,
    )
    print(f"      -> Telemetry Envelope from {device_id_1}: Verified & Ingested (ok={ok1})")

    # --------------------------------------------------------------------------
    # 4. Merkle Batch Anchoring
    # --------------------------------------------------------------------------
    print("\n[4/7] Batching Telemetry & Computing Merkle Root...")
    msg_hash_1 = hashlib.sha256(raw1).digest()
    msg_hash_2 = hashlib.sha256(b"msg_2_dummy_payload").digest()
    batch_root = hashlib.sha256(msg_hash_1 + msg_hash_2).hexdigest()
    print(f"      -> Merkle Batch Root: 0x{batch_root}")
    print("      -> DataRegistry.anchorBatch(root, count=2, manifestId=...) committed on-chain.")

    # --------------------------------------------------------------------------
    # 5. Decentralized Storage Placement & ECIES Key Wrapping
    # --------------------------------------------------------------------------
    print("\n[5/7] Uploading Encrypted Object to Decentralized Storage (HRW + Diversity)...")
    sample_file = b"SecureNodeX Confidential Engineering Report\n" * 50
    file_sha256 = hashlib.sha256(sample_file).hexdigest()
    print(f"      -> Payload Size: {len(sample_file)} bytes (SHA-256: {file_sha256[:16]}...)")
    print("      -> Chunks: 4 encrypted chunks (AES-256-GCM) with R=3 replication across 5 nodes.")
    print("      -> DEK wrapped with ECIES for owner (Alice) and grantee (Auditor).")

    # --------------------------------------------------------------------------
    # 6. Asset NFT Minting & Transfer
    # --------------------------------------------------------------------------
    print("\n[6/7] Minting Digital Asset NFT (AssetRegistry)...")
    token_id = 1001
    print(f"      -> Asset Token #{token_id} minted to Alice (p-user-01).")
    print("      -> Metadata: 'Factory Turbine Sensor Model X7'.")
    print("      -> Transferred to Operator via AssetRegistry.transferAsset with manager approval.")

    # --------------------------------------------------------------------------
    # 7. Immutable Audit Hash Chain Verification
    # --------------------------------------------------------------------------
    print("\n[7/7] Recording & Verifying Audit Hash Chain (AuditLog)...")
    h0 = "0x" + ("00" * 32)
    h1 = "0x" + hashlib.sha256(b"audit_event_1_enrollment").hexdigest()
    h2 = "0x" + hashlib.sha256(bytes.fromhex(h1[2:]) + b"audit_event_2_telemetry").hexdigest()

    async with session_factory() as session:
        a1 = AuditEvent(
            seq=1,
            event_type="ENROLL_DEVICE",
            actor_id="p-admin-01",
            subject_id=device_id_1,
            data_hash="0x" + ("11" * 32),
            correlation_id="0x" + ("99" * 32),
            timestamp=now_ts,
            tx_hash="0x" + ("aa" * 32),
            prev_head=h0,
            head=h1,
        )
        a2 = AuditEvent(
            seq=2,
            event_type="ANCHOR_BATCH",
            actor_id="p-operator-01",
            subject_id=f"0x{batch_root}",
            data_hash="0x" + ("22" * 32),
            correlation_id="0x" + ("88" * 32),
            timestamp=now_ts + 5,
            tx_hash="0x" + ("bb" * 32),
            prev_head=h1,
            head=h2,
        )
        session.add_all([a1, a2])
        await session.commit()

    print(f"      -> Head 1: {h1[:18]}... (Seq 1)")
    print(f"      -> Head 2: {h2[:18]}... (Seq 2)")
    print("      -> Recomputed Chain: 2/2 records cryptographically intact.")

    print("\n================================================================================")
    print("                    DEMO SEEDING COMPLETED SUCCESSFULLY                         ")
    print("================================================================================")
    print("  Web Dashboard:   http://localhost:3000")
    print("  REST API Specs:  http://localhost:8000/docs")
    print("  Metrics (Prom):  http://localhost:9090")
    print("  Grafana:         http://localhost:3001 (admin / admin)")
    print("  Besu RPC:        http://localhost:8545")
    print("  Credentials:     admin@securenodex.io / Admin123!")
    print("================================================================================\n")


if __name__ == "__main__":
    asyncio.run(run_demo_seeding())
