# ============================================================================
#  Up 4evr — keepalive.ps1   (Windows Module 2)
# ----------------------------------------------------------------------------
#  Keep an app running forever using Task Scheduler as the supervisor: a task
#  runs a watchdog every minute in your session and relaunches the app if it
#  died, and also starts it at logon.
#
#  Use the .bat launchers (install/list/remove-keepalive.bat) or:
#     keepalive.ps1 -Action install -AppPath "C:\Path\MyShow.exe"
#     keepalive.ps1 -Action list
#     keepalive.ps1 -Action remove
# ============================================================================
param(
  [ValidateSet('install','list','remove')][string]$Action = 'list',
  [string]$AppPath
)

$prefix = 'Up4evr KeepAlive - '
$worker = Join-Path $PSScriptRoot 'keepalive-check.ps1'

function Get-Ours { Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object { $_.TaskName -like "$prefix*" } }

function Get-AppFromTask($task) {
  # arguments look like: -File "...keepalive-check.ps1" "C:\App\MyShow.exe"
  $arg = $task.Actions[0].Arguments
  if ($arg -match '"[^"]*keepalive-check\.ps1"\s+"([^"]+)"') { return $Matches[1] }
  return '<unknown>'
}

switch ($Action) {

  'install' {
    if (-not $AppPath) { $AppPath = Read-Host "Path to the app .exe (you can drag it in)" }
    $AppPath = $AppPath.Trim().Trim('"')
    if (-not (Test-Path $AppPath)) { Write-Host "Not found: $AppPath" -ForegroundColor Red; break }

    $name = $prefix + [IO.Path]::GetFileNameWithoutExtension($AppPath)
    $arg  = ('-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}" "{1}"' -f $worker, $AppPath)
    $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arg

    # trigger at logon, plus repeat every minute while logged on
    $trigger = New-ScheduledTaskTrigger -AtLogOn
    $trigger.Repetition = (New-ScheduledTaskTrigger -Once -At (Get-Date) `
        -RepetitionInterval (New-TimeSpan -Minutes 1)).Repetition

    $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
    $settings  = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew `
        -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero)

    Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger `
        -Principal $principal -Settings $settings -Force | Out-Null
    Start-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue

    Write-Host "Installed keep-alive for: $AppPath" -ForegroundColor Green
    Write-Host "  Task: $name"
    Write-Host "  Manage with list-keepalive.bat / remove-keepalive.bat"
  }

  'list' {
    $tasks = @(Get-Ours)
    if ($tasks.Count -eq 0) { Write-Host "No keep-alive tasks installed." -ForegroundColor DarkGray; break }
    Write-Host "Up 4evr - keep-alive tasks`n" -ForegroundColor White
    foreach ($t in $tasks) {
      $app  = Get-AppFromTask $t
      $proc = [IO.Path]::GetFileNameWithoutExtension($app)
      $run  = if (Get-Process -Name $proc -ErrorAction SilentlyContinue) { 'running' } else { 'NOT running' }
      $col  = if ($run -eq 'running') { 'Green' } else { 'Yellow' }
      Write-Host ("  {0}" -f $t.TaskName) -ForegroundColor White
      Write-Host ("      app   : {0}" -f $app)
      Write-Host ("      task  : {0}" -f $t.State)
      Write-Host ("      app is: {0}`n" -f $run) -ForegroundColor $col
    }
  }

  'remove' {
    $tasks = @(Get-Ours)
    if ($tasks.Count -eq 0) { Write-Host "No keep-alive tasks installed." -ForegroundColor DarkGray; break }
    for ($i=0; $i -lt $tasks.Count; $i++) { Write-Host ("  {0}) {1}" -f ($i+1), $tasks[$i].TaskName) }
    $choice = Read-Host "`nNumber to remove (or blank to cancel)"
    if (-not ($choice -match '^\d+$')) { Write-Host "Cancelled."; break }
    $idx = [int]$choice - 1
    if ($idx -lt 0 -or $idx -ge $tasks.Count) { Write-Host "Invalid choice." -ForegroundColor Red; break }
    Unregister-ScheduledTask -TaskName $tasks[$idx].TaskName -Confirm:$false
    Write-Host ("Removed {0}" -f $tasks[$idx].TaskName) -ForegroundColor Green
    Write-Host "  (The app itself was left running if it was open.)"
  }
}
