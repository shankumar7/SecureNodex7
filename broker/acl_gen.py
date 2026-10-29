"""Mosquitto ACL configuration generator for SecureNodeX.

Enforces topic permission matrix per docs/05_RBAC.md and docs/06_MESSAGE_FORMAT.md.
"""

from __future__ import annotations

from pathlib import Path


def generate_mosquitto_acl(
    active_device_ids: list[str],
    service_usernames: list[str] | None = None,
) -> str:
    """Generates Mosquitto ACL file content.

    Rules:
    - Service users (gateway/operator): subscribe to snx/v1/dev/+/#, publish snx/v1/dev/+/cmd
    - Active device 'd': publish snx/v1/dev/d/{telemetry,event,status,ack}, subscribe snx/v1/dev/d/cmd
    - Deny everything else by default.
    """
    lines: list[str] = [
        "# SecureNodeX Mosquitto ACL Configuration",
        "# Generated automatically - Deny by default",
        "",
    ]

    services = service_usernames or ["snx-gateway", "gateway", "snx-api", "admin"]
    for svc in services:
        lines.append(f"user {svc}")
        lines.append("topic readwrite snx/v1/dev/#")
        lines.append("topic readwrite $SYS/#")
        lines.append("")

    for dev_id in active_device_ids:
        lines.append(f"user {dev_id}")
        lines.append(f"topic read snx/v1/dev/{dev_id}/cmd")
        lines.append(f"topic write snx/v1/dev/{dev_id}/telemetry")
        lines.append(f"topic write snx/v1/dev/{dev_id}/event")
        lines.append(f"topic write snx/v1/dev/{dev_id}/status")
        lines.append(f"topic write snx/v1/dev/{dev_id}/ack")
        lines.append("")

    return "\n".join(lines)


def write_acl_file(
    out_path: str | Path,
    active_device_ids: list[str],
    service_usernames: list[str] | None = None,
) -> None:
    content = generate_mosquitto_acl(active_device_ids, service_usernames)
    p = Path(out_path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
