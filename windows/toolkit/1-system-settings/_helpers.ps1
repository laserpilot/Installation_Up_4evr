# ============================================================================
#  Up 4evr — Windows registry/power helpers  (shared, dot-sourced)
# ============================================================================
#  Used by settings-table.ps1, check/apply, and the generated undo script.
#  Pure helpers — dot-sourcing this file changes nothing.
# ============================================================================
$ErrorActionPreference = 'SilentlyContinue'

function Get-Reg {
  param($Path, $Name)
  try { (Get-ItemProperty -Path "Registry::$Path" -Name $Name -ErrorAction Stop).$Name } catch { $null }
}

function Set-Reg {
  param($Path, $Name, $Type, $Value)
  if (-not (Test-Path "Registry::$Path")) { New-Item -Path "Registry::$Path" -Force | Out-Null }
  New-ItemProperty -Path "Registry::$Path" -Name $Name -PropertyType $Type -Value $Value -Force | Out-Null
}

function Del-Reg {
  param($Path, $Name)
  Remove-ItemProperty -Path "Registry::$Path" -Name $Name -ErrorAction SilentlyContinue
}

# Read the "Current AC Power Setting Index" for a powercfg sub/setting as an int.
function Get-PowerIndexAC {
  param($Sub, $Setting)
  $out = powercfg /query SCHEME_CURRENT $Sub $Setting 2>$null
  $m = $out | Select-String 'Current AC Power Setting Index:\s*0x([0-9a-fA-F]+)'
  if ($m) { [Convert]::ToInt32($m.Matches[0].Groups[1].Value, 16) } else { -1 }
}

function Restart-Explorer { Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue }

# Taskbar auto-hide lives in one byte of StuckRects3:Settings (3=on, 2=off).
# We read/modify/write that single byte so other taskbar prefs are preserved.
function Set-TaskbarAutohide {
  param([int]$Val)
  $p = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\StuckRects3'
  $s = Get-Reg $p 'Settings'
  if ($s -and $s.Length -gt 8) { $s[8] = [byte]$Val; Set-Reg $p 'Settings' 'Binary' $s; Restart-Explorer }
}

# Disable/enable the Windows logo keys via a keyboard Scancode Map.
function Set-WinKeyDisabled {
  param([bool]$On)
  $p = 'HKLM\SYSTEM\CurrentControlSet\Control\Keyboard Layout'
  if ($On) {
    $bytes = [byte[]](0,0,0,0, 0,0,0,0, 3,0,0,0, 0,0,0x5b,0xe0, 0,0,0x5c,0xe0, 0,0,0,0)
    Set-Reg $p 'Scancode Map' 'Binary' $bytes
  } else { Del-Reg $p 'Scancode Map' }
}

# Run a Check/Apply expression string and return its output as trimmed text.
# Wraps Invoke-Expression in try/catch so callers can use it as an expression
# (try/catch itself is a statement in Windows PowerShell 5.1, not an expression).
function Get-Cur {
  param($Expr)
  try { (Invoke-Expression $Expr | Out-String).Trim() } catch { '' }
}

# Parse settings.conf lines of the form  SET_<key>=<0|1>  into a hashtable.
function Read-Conf {
  param($Path)
  $map = @{}
  if (Test-Path $Path) {
    foreach ($line in Get-Content $Path) {
      if ($line -match '^\s*SET_(\w+)\s*=\s*([01])') { $map[$Matches[1]] = $Matches[2] }
    }
  }
  return $map
}

# Am I running elevated (Administrator)?
function Test-Admin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  (New-Object Security.Principal.WindowsPrincipal($id)).IsInRole(
    [Security.Principal.WindowsBuiltinRole]::Administrator)
}
