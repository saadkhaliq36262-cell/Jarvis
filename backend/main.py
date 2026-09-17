"""
main.py - FastAPI Backend & Static Server for JARVIS AI Assistant

Provides REST endpoints for chat interaction and serves the futuristic web interface.
"""

import os
import sys
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

# Add current folder to sys.path so sibling modules import cleanly
current_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(current_dir))

from commands import handle_safe_command
from gemini_service import gemini_service

app = FastAPI(title="JARVIS AI Assistant", version="1.0.0")

# Enable CORS for local testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define frontend path
FRONTEND_DIR = current_dir.parent / "frontend"


class ChatRequest(BaseModel):
    message: str


@app.get("/api/status")
async def get_status():
    """System health check and configuration status."""
    return {
        "status": "online",
        "api_configured": gemini_service.is_configured(),
        "model": "gemini-2.5-flash",
        "system": "JARVIS Subsystems Operational"
    }


@app.post("/api/chat")
async def chat_endpoint(payload: ChatRequest):
    """
    Main communication endpoint.
    1. Checks for safe local predefined commands (e.g. YouTube, Time, Date).
    2. Passes general or complex queries to Gemini AI.
    """
    user_msg = payload.message.strip()
    if not user_msg:
        return JSONResponse(
            status_code=400,
            content={"reply": "I did not receive any input, sir.", "speak": False, "status": "error"}
        )

    # 1. Check for safe local commands
    local_result = handle_safe_command(user_msg)
    if local_result:
        return {
            "reply": local_result["reply"],
            "speak": local_result.get("speak", True),
            "action": local_result.get("action"),
            "status": "ok",
            "grounding_sources": []
        }

    # 2. Query Gemini AI brain
    gemini_result = gemini_service.generate_response(user_msg)
    return gemini_result


# Mount static assets if frontend directory exists
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

    @app.get("/")
    async def serve_index():
        return FileResponse(FRONTEND_DIR / "index.html")


if __name__ == "__main__":
    import uvicorn
    print("==================================================")
    print("  JARVIS AI ASSISTANT - INITIALIZING LOCAL SERVER")
    print("==================================================")
    print("  Backend API:  http://127.0.0.1:8000/api/status")
    print("  Frontend UI:  http://127.0.0.1:8000")
    print("==================================================")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
