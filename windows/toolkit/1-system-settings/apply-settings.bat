@echo off
REM Up 4evr - apply settings. Double-click me; it will request Administrator.
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting Administrator privileges...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0apply-settings.ps1" %*
echo.
pause
