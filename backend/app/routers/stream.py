"""WebSocket streaming endpoints for real-time telemetry, audit, and storage events."""

import asyncio
import json
import logging
from typing import Any
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from backend.app.auth.security import decode_access_token

logger = logging.getLogger("snx.stream")

router = APIRouter(tags=["Realtime Stream"])


class ConnectionManager:
    """Manages active WebSocket subscribers across broadcast topics."""

    def __init__(self) -> None:
        self.active_connections: dict[str, set[WebSocket]] = {
            "telemetry": set(),
            "audit": set(),
            "storage": set(),
            "devices": set(),
        }
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, topics: list[str]) -> None:
        await websocket.accept()
        async with self._lock:
            for t in topics:
                if t in self.active_connections:
                    self.active_connections[t].add(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            for topic_set in self.active_connections.values():
                topic_set.discard(websocket)

    async def broadcast(self, topic: str, message: dict[str, Any]) -> None:
        if topic not in self.active_connections:
            return
        payload_str = json.dumps({"topic": topic, "data": message})
        to_remove = set()
        for conn in self.active_connections[topic]:
            try:
                await conn.send_text(payload_str)
            except Exception:
                to_remove.add(conn)

        if to_remove:
            async with self._lock:
                for dead_conn in to_remove:
                    self.active_connections[topic].discard(dead_conn)


ws_manager = ConnectionManager()


@router.websocket("/stream")
@router.websocket("/v1/stream")
async def websocket_stream(
    websocket: WebSocket,
    token: str | None = Query(default=None),
    topics: str = Query(default="telemetry,audit,storage,devices"),
) -> None:
    """WebSocket stream for real-time dashboard events."""
    # Authenticate token if provided
    if token:
        try:
            decode_access_token(token)
        except Exception:
            await websocket.close(code=1008)
            return

    topic_list = [t.strip() for t in topics.split(",") if t.strip()]
    await ws_manager.connect(websocket, topic_list)

    try:
        while True:
            # Keep-alive loop
            data = await websocket.receive_text()
            # Handle client ping or subscription update
            try:
                msg = json.loads(data)
                if msg.get("action") == "ping":
                    await websocket.send_text(json.dumps({"action": "pong"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception:
        await ws_manager.disconnect(websocket)
