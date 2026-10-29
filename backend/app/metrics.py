"""Prometheus metrics definition for SecureNodeX services."""

from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest
from starlette.responses import Response

# Generic HTTP metrics
REQUEST_COUNT = Counter(
    "snx_http_requests_total",
    "Total HTTP requests received",
    ["service", "method", "endpoint", "status"],
)

REQUEST_LATENCY = Histogram(
    "snx_http_request_duration_seconds", "HTTP request latency in seconds", ["service", "endpoint"]
)

# Service liveness gauge
SERVICE_UP = Gauge("snx_service_up", "Liveness of service (1=up, 0=down)", ["service"])


def metrics_response() -> Response:
    """Returns standard Prometheus metrics response."""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
