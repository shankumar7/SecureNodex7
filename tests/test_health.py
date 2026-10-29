"""Test health and metrics endpoints across all SecureNodeX services."""

import pytest
from starlette.testclient import TestClient

from backend.app.ca import app as ca_app
from backend.app.gateway import app as gateway_app
from backend.app.main import app as api_app
from backend.app.worker import app as worker_app
from storage.app.main import app as storage_app


@pytest.fixture
def api_client() -> TestClient:
    return TestClient(api_app)


@pytest.fixture
def ca_client() -> TestClient:
    return TestClient(ca_app)


@pytest.fixture
def gateway_client() -> TestClient:
    return TestClient(gateway_app)


@pytest.fixture
def worker_client() -> TestClient:
    return TestClient(worker_app)


@pytest.fixture
def storage_client() -> TestClient:
    return TestClient(storage_app)


def test_api_health_and_info(api_client: TestClient) -> None:
    res = api_client.get("/healthz")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "service": "snx-api"}

    res_ready = api_client.get("/readyz")
    assert res_ready.status_code == 200
    assert res_ready.json() == {"status": "ready", "service": "snx-api"}

    res_info = api_client.get("/v1/info")
    assert res_info.status_code == 200
    assert res_info.json()["project"] == "SecureNodeX"
    assert res_info.json()["chain_id"] == 20260

    res_metrics = api_client.get("/metrics")
    assert res_metrics.status_code == 200
    assert b"snx_service_up" in res_metrics.content


def test_ca_health(ca_client: TestClient) -> None:
    res = ca_client.get("/healthz")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "service": "snx-ca"}

    res_metrics = ca_client.get("/metrics")
    assert res_metrics.status_code == 200


def test_gateway_health(gateway_client: TestClient) -> None:
    res = gateway_client.get("/healthz")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "service": "snx-gateway"}

    res_metrics = gateway_client.get("/metrics")
    assert res_metrics.status_code == 200


def test_worker_health(worker_client: TestClient) -> None:
    res = worker_client.get("/healthz")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "service": "snx-worker"}

    res_metrics = worker_client.get("/metrics")
    assert res_metrics.status_code == 200


def test_storage_health(storage_client: TestClient) -> None:
    res = storage_client.get("/healthz")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"
    assert res.json()["service"] == "snx-storage"

    res_v1 = storage_client.get("/v1/health")
    assert res_v1.status_code == 200
    assert res_v1.json()["state"] == "UP"
    assert res_v1.json()["free_bytes"] > 0

    res_metrics = storage_client.get("/metrics")
    assert res_metrics.status_code == 200
