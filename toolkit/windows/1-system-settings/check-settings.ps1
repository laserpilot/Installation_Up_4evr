# ============================================================================
#  Up 4evr — check-settings.ps1   (Windows Module 1, READ-ONLY)
# ----------------------------------------------------------------------------
#  Reports each enabled setting as OK or needs-change. Changes NOTHING.
#  Run it directly, or via check-settings.bat (double-click).
#
#     powershell -ExecutionPolicy Bypass -File check-settings.ps1
#     ... -Drift     machine mode: prints "DRIFT <key>" lines; exit 1 if any
#  Used by Module 3 (monitor) for drift detection.
# ============================================================================
param([switch]$Drift)

. "$PSScriptRoot\settings-table.ps1"
$conf = Read-Conf "$PSScriptRoot\settings.conf"

$pass = 0; $todo = 0; $skip = 0
if (-not $Drift) { Write-Host "Up 4evr - Windows settings check`n" -ForegroundColor White }

foreach ($s in $Settings) {
  if ($conf[$s.Key] -ne '1') {
    $skip++
    if (-not $Drift) { Write-Host ("  [ -- ] {0,-44} disabled in settings.conf" -f $s.Label) -ForegroundColor DarkGray }
    continue
  }
  $cur = Get-Cur $s.Check
  if ($cur -match $s.Desired) {
    $pass++
    if (-not $Drift) { Write-Host ("  [ OK ] {0,-44} current: {1}" -f $s.Label, $cur) -ForegroundColor Green }
  } else {
    $todo++
    if ($Drift) { Write-Output ("DRIFT {0}" -f $s.Key) }
    else { Write-Host ("  [ !! ] {0,-44} current: {1}  want: /{2}/" -f $s.Label, $cur, $s.Desired) -ForegroundColor Yellow }
  }
}

if (-not $Drift) {
  Write-Host ("`nSummary: {0} OK, {1} need change, {2} disabled" -f $pass, $todo, $skip) -ForegroundColor White
  if ($todo -gt 0) { Write-Host "Run apply-settings.bat (as Administrator) to apply." }
}
if ($todo -gt 0) { exit 1 } else { exit 0 }
