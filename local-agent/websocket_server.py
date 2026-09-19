"""
local-agent/websocket_server.py - Real-Time Bidirectional WebSocket Protocol
"""

import json
import asyncio
from typing import Set
from fastapi import WebSocket, WebSocketDisconnect
from command_router import command_router
from tools import get_all_tool_schemas, get_tool
from logging_service import audit_logger, logger
from config import config

class WebSocketManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._telemetry_task = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Active: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        if not self.active_connections:
            return
        msg_str = json.dumps(message)
        dead = []
        for ws in self.active_connections:
            try:
                await ws.send_text(msg_str)
            except Exception:
                dead.append(ws)
        for d in dead:
            self.active_connections.discard(d)

    async def handle_client(self, websocket: WebSocket):
        try:
            while True:
                data_text = await websocket.receive_text()
                try:
                    msg = json.loads(data_text)
                except Exception:
                    await websocket.send_text(json.dumps({"error": "Invalid JSON payload"}))
                    continue

                msg_type = msg.get("type")

                # 1. Ping / Pong
                if msg_type == "ping":
                    await websocket.send_text(json.dumps({"type": "pong", "time": asyncio.get_event_loop().time()}))

                # 2. Get Telemetry Snapshot
                elif msg_type == "get_telemetry":
                    telemetry_tool = get_tool("get_system_telemetry")
                    telemetry_data = await telemetry_tool.execute({}) if telemetry_tool else {}
                    await websocket.send_text(json.dumps({
                        "type": "telemetry_update",
                        "data": telemetry_data
                    }))

                # 3. Get Tool Schemas
                elif msg_type == "get_tools":
                    await websocket.send_text(json.dumps({
                        "type": "tool_schemas",
                        "data": get_all_tool_schemas()
                    }))

                # 4. Get Recent Audit Logs
                elif msg_type == "get_logs":
                    logs = audit_logger.get_recent_logs(limit=msg.get("limit", 50))
                    await websocket.send_text(json.dumps({
                        "type": "audit_logs",
                        "data": logs
                    }))

                # 5. Execute Tool Command
                elif msg_type == "execute_tool":
                    tool_name = msg.get("tool")
                    params = msg.get("params", {})
                    confirmed = msg.get("confirmed", False)
                    request_id = msg.get("request_id")

                    res = await command_router.execute_tool(
                        tool_name=tool_name,
                        params=params,
                        confirmed=confirmed,
                        caller="websocket"
                    )

                    await websocket.send_text(json.dumps({
                        "type": "tool_result",
                        "request_id": request_id,
                        "data": res
                    }))

                else:
                    await websocket.send_text(json.dumps({
                        "error": f"Unknown message type: {msg_type}"
                    }))

        except WebSocketDisconnect:
            self.disconnect(websocket)
        except Exception as e:
            logger.error(f"WebSocket client error: {e}")
            self.disconnect(websocket)

ws_manager = WebSocketManager()
