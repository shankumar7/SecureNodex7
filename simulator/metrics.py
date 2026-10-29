"""Simulation Metrics and Percentile Calculations."""

import statistics
import time
from typing import Any


class SimulationMetrics:
    """Tracks latency percentiles, throughput, and error breakdown during simulation runs."""

    def __init__(self) -> None:
        self.start_time = time.time()
        self.end_time: float | None = None
        self.total_attempted = 0
        self.total_accepted = 0
        self.total_rejected = 0
        self.rejections_by_reason: dict[str, int] = {}
        self.latencies_ms: list[float] = []

    def record_success(self, latency_ms: float) -> None:
        self.total_attempted += 1
        self.total_accepted += 1
        self.latencies_ms.append(latency_ms)

    def record_rejection(self, reason: str, latency_ms: float = 0.0) -> None:
        self.total_attempted += 1
        self.total_rejected += 1
        self.rejections_by_reason[reason] = self.rejections_by_reason.get(reason, 0) + 1
        if latency_ms > 0:
            self.latencies_ms.append(latency_ms)

    def finalize(self) -> None:
        self.end_time = time.time()

    def get_summary(self) -> dict[str, Any]:
        duration = (self.end_time or time.time()) - self.start_time
        throughput = round(self.total_attempted / duration, 2) if duration > 0 else 0.0
        accepted_rate = (
            round((self.total_accepted / self.total_attempted) * 100, 2)
            if self.total_attempted > 0
            else 0.0
        )
        loss_rate = (
            round((self.total_rejected / self.total_attempted) * 100, 2)
            if self.total_attempted > 0
            else 0.0
        )

        latencies = sorted(self.latencies_ms)
        p50 = round(statistics.median(latencies), 2) if latencies else 0.0
        p90 = round(latencies[int(len(latencies) * 0.90)], 2) if latencies else 0.0
        p95 = round(latencies[int(len(latencies) * 0.95)], 2) if latencies else 0.0
        p99 = round(latencies[int(len(latencies) * 0.99)], 2) if latencies else 0.0
        min_lat = round(latencies[0], 2) if latencies else 0.0
        max_lat = round(latencies[-1], 2) if latencies else 0.0
        avg_lat = round(statistics.mean(latencies), 2) if latencies else 0.0

        return {
            "duration_s": round(duration, 3),
            "total_attempted": self.total_attempted,
            "total_accepted": self.total_accepted,
            "total_rejected": self.total_rejected,
            "accepted_percent": accepted_rate,
            "loss_percent": loss_rate,
            "throughput_msg_per_s": throughput,
            "latency_ms": {
                "min": min_lat,
                "max": max_lat,
                "avg": avg_lat,
                "p50": p50,
                "p90": p90,
                "p95": p95,
                "p99": p99,
            },
            "rejections": self.rejections_by_reason,
        }
