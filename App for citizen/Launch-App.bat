@echo off
title SafeGround Citizen App Launcher
echo ========================================================
echo Starting SafeGround Citizen Safety App...
echo ========================================================
cd /d "%~dp0"

start "" "http://localhost:5173"
call npm.cmd run dev
pause
