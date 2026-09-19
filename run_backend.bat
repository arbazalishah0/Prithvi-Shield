@echo off
title PRITHVI SHIELD Firestore & User Backend (Port 8001)
echo ===================================================
echo Starting PRITHVI SHIELD Backend Server
echo Port: 8001 (Host: 127.0.0.1)
echo ===================================================
cd /d "%~dp0PRITHVI_SHIELD_BACKEND"
if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" run.py
) else (
    python run.py
)
pause
