import os
import sys
import asyncio
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional

# Ensure local-agent directory is in sys.path
agent_dir = os.path.dirname(os.path.abspath(__file__))
if agent_dir not in sys.path:
    sys.path.insert(0, agent_dir)

from pydantic import BaseModel
from fastapi import FastAPI, WebSocket, Query, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import config
from auth import authenticate_request, verify_token_string
from command_router import command_router
from tools import get_all_tool_schemas, get_tool
from logging_service import audit_logger, logger
from websocket_server import ws_manager

# Telemetry streaming background loop
async def telemetry_broadcaster():
    """Periodically broadcasts hardware stats to all connected HUD WebSockets."""
    telemetry_tool = get_tool("get_system_telemetry")
    while True:
        try:
            if ws_manager.active_connections and telemetry_tool:
                data = await telemetry_tool.execute({})
                await ws_manager.broadcast({
                    "type": "telemetry_stream",
                    "data": data
                })
        except Exception as e:
            logger.error(f"Telemetry broadcast error: {e}")
        await asyncio.sleep(2.5)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info(f"JARVIS Windows Local Agent starting on {config.HOST}:{config.PORT}")
    telemetry_task = asyncio.create_task(telemetry_broadcaster())
    yield
    # Shutdown
    telemetry_task.cancel()
    logger.info("JARVIS Windows Local Agent stopped.")

app = FastAPI(
    title="JARVIS Windows Local Agent",
    version=config.VERSION,
    description="Secure PC automation agent for hardware control, process execution, and system telemetry.",
    lifespan=lifespan
)

# Enable CORS for local and web UI communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Models
class ToolExecuteRequest(BaseModel):
    tool: str
    params: Optional[Dict[str, Any]] = None
    confirmed: Optional[bool] = False

# --- REST Endpoints ---

@app.get("/api/system/status")
async def get_status():
    """Unauthenticated health check."""
    return {
        "status": "online",
        "agent": "JARVIS Windows Local Agent",
        "version": config.VERSION,
        "dry_run": config.DRY_RUN,
        "platform": "windows",
        "auth_required": bool(config.TOKEN)
    }

@app.get("/api/system/telemetry")
async def get_telemetry():
    """Fetches immediate CPU, RAM, Disk, and Battery telemetry."""
    telemetry_tool = get_tool("get_system_telemetry")
    if not telemetry_tool:
        return JSONResponse(status_code=500, content={"error": "Telemetry tool unavailable"})
    data = await telemetry_tool.execute({})
    return data

@app.get("/api/system/tools")
async def list_tools():
    """Returns schemas of all registered tools."""
    return {
        "count": len(get_all_tool_schemas()),
        "tools": get_all_tool_schemas()
    }

@app.get("/api/system/logs", dependencies=[Depends(authenticate_request)])
async def get_audit_logs(limit: int = Query(50, ge=1, le=200)):
    """Fetches recent audit log entries (authenticated)."""
    return {
        "logs": audit_logger.get_recent_logs(limit=limit)
    }

@app.post("/api/system/execute", dependencies=[Depends(authenticate_request)])
async def execute_tool(payload: ToolExecuteRequest):
    """Executes a registered tool with permission checks and audit logging."""
    res = await command_router.execute_tool(
        tool_name=payload.tool,
        params=payload.params or {},
        confirmed=payload.confirmed or False,
        caller="rest_api"
    )
    return res

# --- Backward-Compatible Convenience Endpoints ---

@app.post("/api/system/lock")
async def quick_lock():
    """Quick lock workstation endpoint."""
    return await command_router.execute_tool("lock_workstation", {}, confirmed=True, caller="quick_lock")

@app.post("/api/system/volume")
async def quick_volume(payload: Dict[str, Any]):
    """Quick volume adjustment endpoint."""
    return await command_router.execute_tool("adjust_volume", payload, confirmed=True, caller="quick_volume")

@app.post("/api/system/app")
async def quick_app(payload: Dict[str, Any]):
    """Quick application launch endpoint."""
    app_name = payload.get("app") or payload.get("app_name")
    return await command_router.execute_tool("launch_application", {"app_name": app_name}, confirmed=True, caller="quick_app")

# --- WebSocket Live Streaming Endpoint ---

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: Optional[str] = Query(None)):
    # Validate token if token is configured
    if config.TOKEN:
        header_token = websocket.headers.get("X-Agent-Token") or websocket.headers.get("Authorization", "").replace("Bearer ", "")
        check_token = token or header_token
        if not verify_token_string(check_token):
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

    await ws_manager.connect(websocket)
    await ws_manager.handle_client(websocket)

if __name__ == "__main__":
    import uvicorn
    print("==================================================")
    print(f"  JARVIS WINDOWS LOCAL AGENT v{config.VERSION}")
    print("==================================================")
    print(f"  Listening on: http://{config.HOST}:{config.PORT}")
    print(f"  WebSocket:    ws://{config.HOST}:{config.PORT}/ws")
    print(f"  Dry-Run Mode: {config.DRY_RUN}")
    print(f"  Auth Token:   {'Configured' if config.TOKEN else 'None'}")
    print("==================================================")
    uvicorn.run("main:app", host=config.HOST, port=config.PORT, app_dir=agent_dir, reload=False)
