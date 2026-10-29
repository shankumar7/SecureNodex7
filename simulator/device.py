"""Virtual IoT device implementation for SecureNodeX simulator.

Implements the exact envelope format and P-256 raw (r||s) ECDSA signing
prescribed in docs/06 section 3 and docs/08.
"""

import json
import random
import time
from collections import deque
from typing import Any, Literal

from cryptography.hazmat.primitives.asymmetric import ec

from backend.app.message_core import sign_device_message


class VirtualDevice:
    """Represents a virtual IoT sensor device with telemetry, buffering, and misbehaviour flags."""

    def __init__(
        self,
        device_id: str,
        private_key: ec.EllipticCurvePrivateKey,
        cert_pem: bytes | None = None,
        ca_chain_pem: bytes | None = None,
        config: dict[str, Any] | None = None,
        max_queue_size: int = 200,
    ) -> None:
        self.device_id = device_id
        self.private_key = private_key
        self.cert_pem = cert_pem
        self.ca_chain_pem = ca_chain_pem
        self.config = config or {}
        self.seq = 1
        self.dropped_count = 0
        self.offline_queue: deque[dict[str, Any]] = deque(maxlen=max_queue_size)
        self.max_queue_size = max_queue_size
        self.is_online = True

    def generate_sensor_payload(self) -> dict[str, Any]:
        """Generate realistic telemetry payload matching docs/06 & docs/08."""
        return {
            "temp_c": round(22.0 + random.uniform(-3.0, 6.0), 2),
            "hum_pct": round(48.0 + random.uniform(-6.0, 12.0), 1),
            "vbat_mv": 3950 + random.randint(-40, 40),
            "rssi": -62 + random.randint(-8, 5),
        }

    def build_envelope(
        self,
        payload: dict[str, Any] | None = None,
        msg_type: Literal["tel", "evt", "ack", "cmd"] = "tel",
        timestamp_override: int | None = None,
        seq_override: int | None = None,
        tamper: bool = False,
        wrong_topic: bool = False,
    ) -> tuple[str, bytes, dict[str, Any]]:
        """Constructs and signs a message envelope.

        Returns: (topic, raw_json_bytes, envelope_dict)
        """
        current_seq = seq_override if seq_override is not None else self.seq
        ts = timestamp_override if timestamp_override is not None else int(time.time())
        p_data = payload or self.generate_sensor_payload()

        # Sign valid envelope
        envelope = sign_device_message(
            private_key=self.private_key,
            device_id=self.device_id,
            seq=current_seq,
            timestamp=ts,
            msg_type=msg_type,
            payload=p_data,
        )

        if tamper:
            # Modify payload after signing without updating signature
            envelope["p"] = "eyJ0ZW1wX2MiOjk5OS45LCJ0YW1wZXJlZCI6dHJ1ZX0"

        topic_dev_id = "d-fake-target-0000" if wrong_topic else self.device_id
        topic = f"snx/v1/dev/{topic_dev_id}/telemetry"

        raw_bytes = json.dumps(envelope, separators=(",", ":")).encode("utf-8")

        if seq_override is None:
            self.seq += 1

        return topic, raw_bytes, envelope

    def queue_message(self, envelope: dict[str, Any]) -> None:
        """Store envelope in offline ring buffer when disconnected."""
        if len(self.offline_queue) >= self.max_queue_size:
            self.dropped_count += 1
        self.offline_queue.append(envelope)

    def drain_offline_queue(self) -> list[dict[str, Any]]:
        """Drain queued offline messages in order (oldest first)."""
        messages = list(self.offline_queue)
        self.offline_queue.clear()
        return messages
