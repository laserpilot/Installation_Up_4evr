# ============================================================================
#  Up 4evr — monitor.ps1   (Windows Module 3)
# ----------------------------------------------------------------------------
#  One monitoring pass: log system specs, check the app is alive and the
#  expected display is present, detect settings drift (reusing Module 1's
#  check-settings.ps1), and Slack-alert on problems.
#
#     monitor.ps1               one pass (log + alerts)
#     monitor.ps1 -TestSlack    send a test message to the webhook
#     monitor.ps1 -Once         one pass, printing everything to the console
# ============================================================================
param([switch]$TestSlack, [switch]$Once)
$ErrorActionPreference = 'SilentlyContinue'

# ---- read conf --------------------------------------------------------------
$conf = @{}
$confPath = Join-Path $PSScriptRoot 'monitor.conf'
if (Test-Path $confPath) {
  foreach ($line in Get-Content $confPath) {
    if ($line -match '^\s*([A-Z_]+)\s*=\s*(.*)$') { $conf[$Matches[1]] = $Matches[2].Trim() }
  }
}
function C($k, $d='') { if ($conf[$k]) { $conf[$k] } else { $d } }

$APP        = C 'APP_NAME'
$DISPLAY    = C 'EXPECTED_DISPLAY'
$CPU_TH     = [int](C 'CPU_THRESHOLD' 90)
$DISK_TH    = [int](C 'DISK_THRESHOLD' 90)
$DRIFT_ON   = (C 'ALERT_ON_DRIFT' '1') -eq '1'
$SETDIR     = C 'SETTINGS_DIR' (Join-Path $PSScriptRoot '..\1-system-settings')
$WEBHOOK    = C 'SLACK_WEBHOOK'
$SUSER      = C 'SLACK_USERNAME' 'Up 4evr'
$SICON      = C 'SLACK_ICON' ':satellite_antenna:'
$DAILYHOUR  = C 'DAILY_SUMMARY_HOUR'
$LOGDIR     = C 'LOG_DIR' (Join-Path $env:ProgramData 'up4evr')
New-Item -ItemType Directory -Force -Path $LOGDIR | Out-Null
$LOG = Join-Path $LOGDIR ("monitor-{0}.log" -f (Get-Date -Format 'yyyyMMdd'))
$HOSTN = $env:COMPUTERNAME

function Send-Slack($text) {
  if (-not $WEBHOOK) { return $false }
  $body = @{ text = $text; username = $SUSER; icon_emoji = $SICON } | ConvertTo-Json -Compress
  try { Invoke-RestMethod -Uri $WEBHOOK -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 15 | Out-Null; return $true }
  catch { return $false }
}

if ($TestSlack) {
  if (-not $WEBHOOK) { Write-Host "No SLACK_WEBHOOK set in monitor.conf."; exit 1 }
  if (Send-Slack (":wave: Up 4evr test from *$HOSTN* at $(Get-Date)")) { Write-Host "Sent." } else { Write-Host "Slack post failed." ; exit 1 }
  exit 0
}

# ---- gather -----------------------------------------------------------------
$cpu  = [int]((Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average)
$disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$diskUsed = if ($disk -and $disk.Size) { [int](($disk.Size - $disk.FreeSpace) / $disk.Size * 100) } else { -1 }
$os   = Get-CimInstance Win32_OperatingSystem
$memUsed = if ($os -and $os.TotalVisibleMemorySize) { [int](($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / $os.TotalVisibleMemorySize * 100) } else { -1 }
$uptime = if ($os) { (Get-Date) - $os.LastBootUpTime } else { $null }
$uptimeStr = if ($uptime) { "{0}d {1}h {2}m" -f $uptime.Days, $uptime.Hours, $uptime.Minutes } else { 'unknown' }
$vids = Get-CimInstance Win32_VideoController
$resList = ($vids | ForEach-Object { "$($_.CurrentHorizontalResolution)x$($_.CurrentVerticalResolution)" }) -join ', '
$topMem = (Get-Process | Sort-Object WS -Descending | Select-Object -First 4 |
           ForEach-Object { "    {0} MB  {1}" -f [int]($_.WS/1MB), $_.ProcessName }) -join "`n"

$alerts = New-Object System.Collections.ArrayList

# CPU
if ($cpu -ge $CPU_TH) { [void]$alerts.Add(":fire: High CPU on *$HOSTN*: $cpu% (threshold $CPU_TH%)") }
# Disk
if ($diskUsed -ge $DISK_TH) { [void]$alerts.Add(":floppy_disk: Disk almost full on *$HOSTN*: $diskUsed% (threshold $DISK_TH%)") }
# App
$appOk = 'n/a'
if ($APP) {
  $procName = $APP -replace '\.exe$',''
  if (Get-Process -Name $procName -ErrorAction SilentlyContinue) { $appOk = 'running' }
  else { $appOk = 'NOT running'; [void]$alerts.Add(":x: App *$APP* is NOT running on *$HOSTN*") }
}
# Display
$dispOk = 'n/a'
if ($DISPLAY) {
  if ($resList -match [regex]::Escape($DISPLAY)) { $dispOk = 'present' }
  else { $dispOk = 'MISSING'; [void]$alerts.Add(":desktop_computer: Expected display ($DISPLAY) MISSING on *$HOSTN*") }
}
# Settings drift — reuse Module 1
$driftOk = 'skipped'
$check = Join-Path $SETDIR 'check-settings.ps1'
if ($DRIFT_ON -and (Test-Path $check)) {
  $driftLines = & powershell -NoProfile -ExecutionPolicy Bypass -File $check -Drift 2>$null | Where-Object { $_ -match '^DRIFT ' }
  $keys = ($driftLines | ForEach-Object { ($_ -split ' ')[1] }) -join ','
  if ($keys) { $driftOk = "DRIFT: $keys"; [void]$alerts.Add(":wrench: Settings drifted on *$HOSTN*: $keys") }
  else { $driftOk = 'all settings OK' }
}

# ---- log --------------------------------------------------------------------
$block = @"
==================== $(Get-Date) ====================
Host: $HOSTN
Uptime: $uptimeStr
CPU: $cpu%   Disk: $diskUsed%   Mem: $memUsed%
App ($APP): $appOk
Display ($DISPLAY): $dispOk   [$resList]
Settings: $driftOk
Top memory:
$topMem
"@
if ($alerts.Count -gt 0) { $block += "`nALERTS:`n" + (($alerts | ForEach-Object { "    - $_" }) -join "`n") }
Add-Content -Path $LOG -Value ($block + "`n")

# ---- alerts -----------------------------------------------------------------
if ($alerts.Count -gt 0) {
  $msg = ":rotating_light: *Up 4evr alert - $HOSTN*`n" + (($alerts | ForEach-Object { "- $_" }) -join "`n")
  Send-Slack $msg | Out-Null
}

# ---- daily heartbeat when healthy -------------------------------------------
if ($DAILYHOUR -ne '' -and $alerts.Count -eq 0) {
  $stamp = Join-Path $LOGDIR (".heartbeat-{0}" -f (Get-Date -Format 'yyyyMMdd'))
  if ((Get-Date).Hour -eq [int]$DAILYHOUR -and -not (Test-Path $stamp)) {
    Send-Slack ":white_check_mark: *$HOSTN* healthy - app $appOk, CPU $cpu%, disk $diskUsed%, $driftOk. Uptime $uptimeStr" | Out-Null
    New-Item -ItemType File -Path $stamp -Force | Out-Null
  }
}

# ---- console echo -----------------------------------------------------------
if ($Once -or [Environment]::UserInteractive) {
  Write-Host ("Host $HOSTN | CPU $cpu% | Disk $diskUsed% | Mem $memUsed% | App($APP) $appOk | Display($DISPLAY) $dispOk | $driftOk")
  Write-Host "Logged to $LOG"
  if ($alerts.Count -gt 0) { Write-Host "Alerts:"; $alerts | ForEach-Object { Write-Host "  - $_" } } else { Write-Host "No alerts." }
}
