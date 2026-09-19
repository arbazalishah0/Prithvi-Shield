@echo off
title PRAHARI Command & Citizen Safety Website (Port 5500)
echo ===================================================
echo Starting PRAHARI Command & Citizen Safety Website
echo Serving at: http://localhost:5500
echo ===================================================
cd /d "%~dp0prahari_website"
python -m http.server 5500
pause
