@echo off
REM Up 4evr - run one monitoring pass now (double-click).
REM   monitor.bat              one pass, printed
REM   monitor.bat -TestSlack   send a Slack test message
if "%~1"=="" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0monitor.ps1" -Once
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0monitor.ps1" %*
)
echo.
pause
