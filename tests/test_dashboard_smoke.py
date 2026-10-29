"""Smoke test for Next.js Dashboard components, routes, and API compatibility."""

from pathlib import Path


def test_dashboard_files_and_structure() -> None:
    """Verify all dashboard source files, types, and components are created."""
    dash_dir = Path("dashboard")
    assert (dash_dir / "package.json").exists()
    assert (dash_dir / "lib" / "types.ts").exists()
    assert (dash_dir / "lib" / "api.ts").exists()
    assert (dash_dir / "context" / "AuthContext.tsx").exists()
    assert (dash_dir / "components" / "Navbar.tsx").exists()
    assert (dash_dir / "components" / "Sidebar.tsx").exists()
    assert (dash_dir / "components" / "OverviewTab.tsx").exists()
    assert (dash_dir / "components" / "DevicesTab.tsx").exists()
    assert (dash_dir / "components" / "TelemetryTab.tsx").exists()
    assert (dash_dir / "components" / "ObjectsTab.tsx").exists()
    assert (dash_dir / "components" / "StorageHealthTab.tsx").exists()
    assert (dash_dir / "components" / "AssetsTab.tsx").exists()
    assert (dash_dir / "components" / "AuditTab.tsx").exists()
    assert (dash_dir / "components" / "PrincipalsTab.tsx").exists()
    assert (dash_dir / "tests" / "smoke.spec.ts").exists()


def test_dashboard_api_client_coverage() -> None:
    """Verify that dashboard API client covers all required REST routes."""
    api_ts = Path("dashboard/lib/api.ts").read_text(encoding="utf-8")

    # Auth
    assert "/v1/auth/login" in api_ts
    assert "/v1/auth/me" in api_ts

    # Devices
    assert "/v1/devices" in api_ts
    assert "/v1/devices/enroll" in api_ts
    assert "/revoke" in api_ts
    assert "/rotate" in api_ts

    # Objects & Placement
    assert "/v1/objects" in api_ts
    assert "/placement" in api_ts
    assert "/verify" in api_ts
    assert "/download" in api_ts

    # Storage Health
    assert "/v1/storage/health" in api_ts
    assert "/v1/storage/nodes" in api_ts
    assert "/v1/storage/repair" in api_ts

    # Assets & Audit
    assert "/v1/assets" in api_ts
    assert "/v1/assets/mint" in api_ts
    assert "/v1/audit" in api_ts
    assert "/v1/audit/verify" in api_ts

    # Batches & Merkle Proofs
    assert "/v1/batches" in api_ts
    assert "/proof" in api_ts
    assert "/verify-proof" in api_ts
