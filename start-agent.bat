@echo off
title JARVIS Windows Local Agent
cls
echo ================================================================
echo               JARVIS WINDOWS LOCAL AGENT v2.0
echo ================================================================
echo  * Host:           127.0.0.1
echo  * Port:           5000
echo  * WebSocket:      ws://127.0.0.1:5000/ws
echo  * Telemetry:      CPU / RAM / Disk Live Streaming Active
echo  * Security Mode:  Strict 4-Tier Guardrails + Audit Logging
echo ================================================================
echo.

set PYTHONUNBUFFERED=1
set LOCAL_AGENT_HOST=127.0.0.1
set LOCAL_AGENT_PORT=5000
set LOCAL_AGENT_TOKEN=jarvis_secure_local_token_2026

echo Starting Windows Local Agent...
python "%~dp0local-agent\main.py"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to start JARVIS Windows Local Agent.
    echo Please verify Python 3.10+ and required packages are installed:
    echo   pip install -r "%~dp0local-agent\requirements.txt"
    echo.
    pause
)
