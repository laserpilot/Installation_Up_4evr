# ============================================================================
#  Up 4evr — install-monitor.ps1   (Windows Module 3)
# ----------------------------------------------------------------------------
#  Schedules monitor.ps1 to run every few minutes via Task Scheduler. Edit
#  monitor.conf FIRST (APP_NAME, SLACK_WEBHOOK, thresholds).
#
#     install-monitor.ps1 -Minutes 5     schedule every 5 minutes (default)
#     install-monitor.ps1 -Remove        stop monitoring
# ============================================================================
param([int]$Minutes = 5, [switch]$Remove)

$name = 'Up4evr - Monitor'
$mon  = Join-Path $PSScriptRoot 'monitor.ps1'

if ($Remove) {
  Unregister-ScheduledTask -TaskName $name -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "Monitoring stopped and removed." -ForegroundColor Green
  return
}

$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument ('-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}"' -f $mon)

$trigger = New-ScheduledTaskTrigger -AtLogOn
$trigger.Repetition = (New-ScheduledTaskTrigger -Once -At (Get-Date) `
    -RepetitionInterval (New-TimeSpan -Minutes $Minutes)).Repetition

$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$settings  = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::FromMinutes(10))

Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger `
    -Principal $principal -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue

Write-Host ("Monitoring every {0} minute(s)." -f $Minutes) -ForegroundColor Green
Write-Host ("  Config : {0}" -f (Join-Path $PSScriptRoot 'monitor.conf'))
Write-Host ("  Logs   : %ProgramData%\up4evr\monitor-YYYYMMDD.log")
Write-Host  "  Stop   : remove-monitor.bat"
