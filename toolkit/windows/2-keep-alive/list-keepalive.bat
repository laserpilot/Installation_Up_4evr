@echo off
REM Up 4evr - list keep-alive tasks (double-click; no admin needed).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0keepalive.ps1" -Action list
echo.
pause
