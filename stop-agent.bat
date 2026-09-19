@echo off
title Stop JARVIS Local Agent
cls
echo ================================================================
echo           STOPPING JARVIS WINDOWS LOCAL AGENT
echo ================================================================
echo.

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000" ^| findstr "LISTENING"') do (
    echo Terminating PID: %%a listening on port 5000...
    taskkill /F /PID %%a >nul 2>&1
)

echo JARVIS Local Agent stopped successfully.
echo.
timeout /t 2 >nul
