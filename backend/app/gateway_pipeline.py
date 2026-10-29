"""Gateway message verification pipeline matching docs/06 section 5."""

import json
import logging
import time
from typing import Any

from cryptography.hazmat.primitives.asymmetric import ec
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.models import Device
from backend.app.message_core import verify_device_message

logger = logging.getLogger("snx.gateway.pipeline")


class GatewayPipeline:
    """Implements strict 8-step verification pipeline for incoming device telemetry and events."""

    def __init__(self, max_message_size: int = 1024, timestamp_window_s: int = 300) -> None:
        self.max_size = max_message_size
        self.window_s = timestamp_window_s
        self.device_cache: dict[str, tuple[str, str | None, ec.EllipticCurvePublicKey | None, float]] = {}  # did -> (status, fp, pub_key, cached_at)
        self.last_seq: dict[str, int] = {}
        self.rate_limits: dict[str, list[float]] = {}  # did -> list of timestamps in current second

    def invalidate_cache(self, device_id: str) -> None:
        """Event-driven cache invalidation (<= 5 s target)."""
        if device_id in self.device_cache:
            del self.device_cache[device_id]

    async def get_device_info(
        self,
        db: AsyncSession | None,
        device_id: str,
    ) -> tuple[str, str | None, ec.EllipticCurvePublicKey | None]:
        """Fetch status and public key with 5-second TTL cache."""
        now = time.time()
        if device_id in self.device_cache:
            status, fp, pub_key, cached_at = self.device_cache[device_id]
            if now - cached_at <= 5.0:
                return status, fp, pub_key

        if db is None:
            return "ACTIVE", None, None

        stmt = select(Device).where(Device.id == device_id)
        device = (await db.execute(stmt)).scalar_one_or_none()

        if not device:
            return "NOT_FOUND", None, None

        pub_key = None
        dev_status = str(device.status)
        dev_fp = str(device.spki_fingerprint) if device.spki_fingerprint else None
        # In a real environment, cert or public key is loaded from local cert store or CA
        self.device_cache[device_id] = (dev_status, dev_fp, pub_key, now)
        return dev_status, dev_fp, pub_key

    def check_rate_limit(self, device_id: str, max_rate: int = 5) -> bool:
        """Sliding window per-device rate limiter (default 5 msg/s)."""
        limit = getattr(self, "max_device_rate", max_rate)
        now = time.time()
        timestamps = self.rate_limits.get(device_id, [])
        # Keep only timestamps in last 1.0 second
        timestamps = [t for t in timestamps if now - t <= 1.0]
        if len(timestamps) >= limit:
            self.rate_limits[device_id] = timestamps
            return False
        timestamps.append(now)
        self.rate_limits[device_id] = timestamps
        return True

    async def verify_envelope(
        self,
        raw_bytes: bytes,
        topic: str,
        db: AsyncSession | None = None,
        client_cert_cn: str | None = None,
        public_key_override: ec.EllipticCurvePublicKey | None = None,
        now_override: int | None = None,
        allow_queued: bool = False,
    ) -> tuple[bool, dict[str, Any] | None, str | None]:
        """Run full 8-step verification pipeline in strict order.

        Returns: (is_valid, envelope_dict, failure_reason)
        """
        # Step 1: Parse JSON, size <= 1024, v==1, y valid
        if len(raw_bytes) > self.max_size:
            return False, None, "MALFORMED"

        try:
            envelope = json.loads(raw_bytes.decode("utf-8"))
        except Exception:
            return False, None, "MALFORMED"

        if (
            not isinstance(envelope, dict)
            or envelope.get("v") != 1
            or envelope.get("y") not in ("tel", "evt", "ack", "cmd")
            or not envelope.get("d")
            or envelope.get("s") is None
            or envelope.get("t") is None
            or not envelope.get("p")
            or not envelope.get("g")
        ):
            return False, envelope, "MALFORMED"

        device_id = str(envelope["d"])
        seq = int(envelope["s"])
        timestamp = int(envelope["t"])

        # Step 2: d equals topic device ID and equals authenticated client cert CN
        # Topic format: snx/v1/dev/<device_id>/<type>
        topic_parts = topic.strip("/").split("/")
        if len(topic_parts) >= 4 and topic_parts[0] == "snx" and topic_parts[2] == "dev":
            topic_device_id = topic_parts[3]
            if topic_device_id != device_id:
                return False, envelope, "ACCESS_DENIED"
        if client_cert_cn and client_cert_cn != device_id:
            return False, envelope, "ACCESS_DENIED"

        # Step 3: Device status ACTIVE (cache TTL <= 5 s)
        status, fp, cached_pub = await self.get_device_info(db, device_id)
        if status != "ACTIVE":
            return False, envelope, "AUTH_DENIED"

        # Step 4: Timestamp window: |now - t| <= 300 s
        now_ts = now_override if now_override is not None else int(time.time())
        if timestamp > now_ts + 60:
            return False, envelope, "TIMESTAMP_OUT_OF_WINDOW"
        if abs(now_ts - timestamp) > self.window_s and not allow_queued:
            return False, envelope, "TIMESTAMP_OUT_OF_WINDOW"

        # Step 5: Replay check: s > last_seq[d]
        current_last_seq = self.last_seq.get(device_id, -1)
        if seq <= current_last_seq:
            return False, envelope, "REPLAY_REJECTED"

        # Step 6: ECDSA P-256 Signature verification
        pub_key = public_key_override or cached_pub
        if pub_key is None:
            # Allow verification if public_key_override is provided; otherwise reject
            return False, envelope, "SIGNATURE_INVALID"

        is_sig_valid = verify_device_message(pub_key, envelope)
        if not is_sig_valid:
            return False, envelope, "SIGNATURE_INVALID"

        # Step 7: Per-device rate limit
        if not self.check_rate_limit(device_id):
            return False, envelope, "RATE_LIMITED"

        # Step 8: Accept -> Update last_seq
        self.last_seq[device_id] = seq
        return True, envelope, None


pipeline = GatewayPipeline()
