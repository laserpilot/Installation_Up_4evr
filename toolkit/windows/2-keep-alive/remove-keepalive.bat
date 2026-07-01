@echo off
REM Up 4evr - remove a keep-alive task (double-click; requests Administrator).
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting Administrator privileges...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0keepalive.ps1" -Action remove
echo.
pause
