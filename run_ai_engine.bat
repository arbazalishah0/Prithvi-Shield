@echo off
title PRITHVI-SHIELD AI Engine (Port 8000)
echo ===================================================
echo Starting PRITHVI-SHIELD AI Engine & Evacuation API
echo Port: 8000 (Host: 0.0.0.0)
echo ===================================================
cd /d "%~dp0AI egine model"
python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
pause
