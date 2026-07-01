@echo off
REM Up 4evr - read-only settings check (double-click me)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0check-settings.ps1" %*
echo.
pause
