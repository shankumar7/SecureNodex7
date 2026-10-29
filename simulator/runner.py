"""Asyncio Simulator Runner for driving high-throughput load and security failure modes."""

import asyncio
import random
import time
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.gateway_pipeline import GatewayPipeline
from simulator.device import VirtualDevice
from simulator.metrics import SimulationMetrics


class SimulatorRunner:
    """Manages concurrent execution of N virtual devices against the gateway verification pipeline."""

    def __init__(
        self,
        devices: list[VirtualDevice],
        pipeline: GatewayPipeline,
        db_session: AsyncSession | None = None,
        rate_per_sec: float = 1.0,
        duration_s: float = 5.0,
        jitter_s: float = 0.05,
        offline_window_s: float = 0.0,
        tamper_rate: float = 0.0,
        replay_rate: float = 0.0,
        wrong_topic_rate: float = 0.0,
    ) -> None:
        self.devices = devices
        self.pipeline = pipeline
        self.db = db_session
        self.rate_per_sec = rate_per_sec
        self.duration_s = duration_s
        self.jitter_s = jitter_s
        self.offline_window_s = offline_window_s
        self.tamper_rate = tamper_rate
        self.replay_rate = replay_rate
        self.wrong_topic_rate = wrong_topic_rate
        self.metrics = SimulationMetrics()

    async def _run_device_loop(self, device: VirtualDevice, end_time: float) -> None:
        """Run single device publish cycle until end_time."""
        interval = 1.0 / max(self.rate_per_sec, 0.001)
        offline_until = 0.0
        last_good_seq = 1

        while time.time() < end_time:
            now = time.time()

            # Handle offline windows
            if self.offline_window_s > 0 and random.random() < 0.1 and now > offline_until:
                offline_until = now + self.offline_window_s

            is_currently_offline = now < offline_until

            # Decide misbehaviour
            is_tamper = random.random() < self.tamper_rate
            is_replay = random.random() < self.replay_rate
            is_wrong_topic = random.random() < self.wrong_topic_rate

            seq_to_use = last_good_seq if is_replay else device.seq

            # Build envelope
            topic, raw_bytes, envelope = device.build_envelope(
                seq_override=seq_to_use if is_replay else None,
                tamper=is_tamper,
                wrong_topic=is_wrong_topic,
            )

            if is_currently_offline:
                # Device is offline; queue in ring buffer
                device.queue_message(envelope)
            else:
                # If we have queued messages from offline state, drain them first
                queued = device.drain_offline_queue()
                for q_env in queued:
                    q_topic = f"snx/v1/dev/{device.device_id}/telemetry"
                    q_bytes = str(q_env).replace("'", '"').encode("utf-8")
                    t0 = time.time()
                    if self.db:
                        ok, _, reason = await self.pipeline.verify_envelope(
                            raw_bytes=q_bytes,
                            topic=q_topic,
                            db=self.db,
                            public_key_override=device.private_key.public_key(),
                            allow_queued=True,
                        )
                    else:
                        ok, reason = True, None
                    lat_ms = (time.time() - t0) * 1000
                    if ok:
                        self.metrics.record_success(lat_ms)
                    else:
                        self.metrics.record_rejection(reason or "UNKNOWN", lat_ms)

                # Send current message
                t0 = time.time()
                if self.db:
                    ok, _, reason = await self.pipeline.verify_envelope(
                        raw_bytes=raw_bytes,
                        topic=topic,
                        db=self.db,
                        public_key_override=device.private_key.public_key(),
                    )
                else:
                    ok, reason = True, None
                lat_ms = (time.time() - t0) * 1000

                if ok:
                    self.metrics.record_success(lat_ms)
                    last_good_seq = envelope["s"]
                else:
                    self.metrics.record_rejection(reason or "UNKNOWN", lat_ms)

            # Sleep with jitter
            sleep_time = max(0.001, interval + random.uniform(-self.jitter_s, self.jitter_s))
            await asyncio.sleep(sleep_time)

    async def run(self) -> dict[str, Any]:
        """Execute simulation run across all virtual devices concurrently."""
        end_time = time.time() + self.duration_s
        tasks = [
            asyncio.create_task(self._run_device_loop(dev, end_time))
            for dev in self.devices
        ]
        await asyncio.gather(*tasks)
        self.metrics.finalize()
        return self.metrics.get_summary()
