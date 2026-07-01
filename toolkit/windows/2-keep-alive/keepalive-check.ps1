# ============================================================================
#  Up 4evr — keepalive-check.ps1   (Windows Module 2, worker)
# ----------------------------------------------------------------------------
#  The watchdog. A Task Scheduler task runs this every minute in the user's
#  session. If the app isn't running, it (re)starts it. That's the whole job.
#  You don't run this by hand — keepalive.ps1 registers it.
# ============================================================================
param([Parameter(Mandatory=$true)][string]$AppPath)

$ErrorActionPreference = 'SilentlyContinue'
$name = [IO.Path]::GetFileNameWithoutExtension($AppPath)

if (-not (Get-Process -Name $name -ErrorAction SilentlyContinue)) {
  if (Test-Path $AppPath) {
    Start-Process -FilePath $AppPath -WorkingDirectory (Split-Path $AppPath)
  }
}
