# ============================================================================
#  Up 4evr — Windows settings registry  (shared by check + apply)
# ----------------------------------------------------------------------------
#  Data only. Each setting has:
#     Key      matches SET_<Key> in settings.conf
#     Label    human description
#     Cat      power | ui | touch | services | updates | maintenance | danger
#     Admin    $true if applying needs Administrator
#     Danger   $true = security/lock-in risk; off by default, needs confirmation
#     Check    PowerShell that returns the CURRENT value (read-only)
#     Desired  regex the Check output must match to count as "OK"
#     Apply    PowerShell that puts the machine into the desired state
#     Revert   PowerShell that restores the Windows default (used for undo)
#
#  Check/Apply/Revert are strings run with Invoke-Expression, so the undo
#  script can be written out as literal, readable commands.
# ============================================================================
. "$PSScriptRoot\_helpers.ps1"

$Settings = @(
  # ---- power / sleep --------------------------------------------------------
  [pscustomobject]@{ Key='power_highperf'; Label='High Performance power plan'; Cat='power'; Admin=$true; Danger=$false;
    Check="(powercfg /getactivescheme)"; Desired='8c5e7fda';
    Apply="powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c";
    Revert="powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e" }

  [pscustomobject]@{ Key='display_sleep'; Label='Never turn off the display'; Cat='power'; Admin=$true; Danger=$false;
    Check="Get-PowerIndexAC 'SUB_VIDEO' 'VIDEOIDLE'"; Desired='^0$';
    Apply="powercfg /change monitor-timeout-ac 0; powercfg /change monitor-timeout-dc 0";
    Revert="powercfg /change monitor-timeout-ac 10; powercfg /change monitor-timeout-dc 5" }

  [pscustomobject]@{ Key='computer_sleep'; Label='Never sleep the computer'; Cat='power'; Admin=$true; Danger=$false;
    Check="Get-PowerIndexAC 'SUB_SLEEP' 'STANDBYIDLE'"; Desired='^0$';
    Apply="powercfg /change standby-timeout-ac 0; powercfg /change standby-timeout-dc 0";
    Revert="powercfg /change standby-timeout-ac 30; powercfg /change standby-timeout-dc 15" }

  [pscustomobject]@{ Key='hibernate'; Label='Disable hibernation'; Cat='power'; Admin=$true; Danger=$false;
    Check="Get-Reg 'HKLM\SYSTEM\CurrentControlSet\Control\Power' 'HibernateEnabled'"; Desired='^0$';
    Apply="powercfg /hibernate off"; Revert="powercfg /hibernate on" }

  [pscustomobject]@{ Key='screensaver'; Label='Disable screensaver'; Cat='power'; Admin=$false; Danger=$false;
    Check="Get-Reg 'HKCU\Control Panel\Desktop' 'ScreenSaveActive'"; Desired='^0$';
    Apply="Set-Reg 'HKCU\Control Panel\Desktop' 'ScreenSaveActive' String '0'";
    Revert="Set-Reg 'HKCU\Control Panel\Desktop' 'ScreenSaveActive' String '1'" }

  [pscustomobject]@{ Key='lock_timeout'; Label='Disable inactivity lock'; Cat='power'; Admin=$true; Danger=$false;
    Check="Get-Reg 'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System' 'InactivityTimeoutSecs'"; Desired='^0$';
    Apply="Set-Reg 'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System' 'InactivityTimeoutSecs' DWord 0";
    Revert="Del-Reg 'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System' 'InactivityTimeoutSecs'" }

  # ---- windows UI -----------------------------------------------------------
  [pscustomobject]@{ Key='notification_center'; Label='Disable Action Center / notifications'; Cat='ui'; Admin=$false; Danger=$false;
    Check="Get-Reg 'HKCU\SOFTWARE\Policies\Microsoft\Windows\Explorer' 'DisableNotificationCenter'"; Desired='^1$';
    Apply="Set-Reg 'HKCU\SOFTWARE\Policies\Microsoft\Windows\Explorer' 'DisableNotificationCenter' DWord 1";
    Revert="Del-Reg 'HKCU\SOFTWARE\Policies\Microsoft\Windows\Explorer' 'DisableNotificationCenter'" }

  [pscustomobject]@{ Key='toast'; Label='Disable toast pop-ups'; Cat='ui'; Admin=$false; Danger=$false;
    Check="Get-Reg 'HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\PushNotifications' 'ToastEnabled'"; Desired='^0$';
    Apply="Set-Reg 'HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\PushNotifications' 'ToastEnabled' DWord 0";
    Revert="Set-Reg 'HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\PushNotifications' 'ToastEnabled' DWord 1" }

  [pscustomobject]@{ Key='cortana'; Label='Disable Cortana'; Cat='ui'; Admin=$true; Danger=$false;
    Check="Get-Reg 'HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Search' 'AllowCortana'"; Desired='^0$';
    Apply="Set-Reg 'HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Search' 'AllowCortana' DWord 0";
    Revert="Del-Reg 'HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Search' 'AllowCortana'" }

  [pscustomobject]@{ Key='copilot'; Label='Disable Windows Copilot'; Cat='ui'; Admin=$true; Danger=$false;
    Check="Get-Reg 'HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsCopilot' 'TurnOffWindowsCopilot'"; Desired='^1$';
    Apply="Set-Reg 'HKCU\SOFTWARE\Policies\Microsoft\Windows\WindowsCopilot' 'TurnOffWindowsCopilot' DWord 1; Set-Reg 'HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsCopilot' 'TurnOffWindowsCopilot' DWord 1";
    Revert="Del-Reg 'HKCU\SOFTWARE\Policies\Microsoft\Windows\WindowsCopilot' 'TurnOffWindowsCopilot'; Del-Reg 'HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsCopilot' 'TurnOffWindowsCopilot'" }

  [pscustomobject]@{ Key='widgets'; Label='Disable taskbar widgets'; Cat='ui'; Admin=$true; Danger=$false;
    Check="Get-Reg 'HKLM\SOFTWARE\Policies\Microsoft\Dsh' 'AllowNewsAndInterests'"; Desired='^0$';
    Apply="Set-Reg 'HKLM\SOFTWARE\Policies\Microsoft\Dsh' 'AllowNewsAndInterests' DWord 0; Set-Reg 'HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced' 'TaskbarDa' DWord 0";
    Revert="Del-Reg 'HKLM\SOFTWARE\Policies\Microsoft\Dsh' 'AllowNewsAndInterests'; Set-Reg 'HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced' 'TaskbarDa' DWord 1" }

  [pscustomobject]@{ Key='sticky_keys'; Label='Disable Sticky Keys prompt'; Cat='ui'; Admin=$false; Danger=$false;
    Check="Get-Reg 'HKCU\Control Panel\Accessibility\StickyKeys' 'Flags'"; Desired='^506$';
    Apply="Set-Reg 'HKCU\Control Panel\Accessibility\StickyKeys' 'Flags' String '506'";
    Revert="Set-Reg 'HKCU\Control Panel\Accessibility\StickyKeys' 'Flags' String '510'" }

  [pscustomobject]@{ Key='filter_keys'; Label='Disable Filter Keys prompt'; Cat='ui'; Admin=$false; Danger=$false;
    Check="Get-Reg 'HKCU\Control Panel\Accessibility\Keyboard Response' 'Flags'"; Desired='^122$';
    Apply="Set-Reg 'HKCU\Control Panel\Accessibility\Keyboard Response' 'Flags' String '122'";
    Revert="Set-Reg 'HKCU\Control Panel\Accessibility\Keyboard Response' 'Flags' String '126'" }

  [pscustomobject]@{ Key='toggle_keys'; Label='Disable Toggle Keys prompt'; Cat='ui'; Admin=$false; Danger=$false;
    Check="Get-Reg 'HKCU\Control Panel\Accessibility\ToggleKeys' 'Flags'"; Desired='^58$';
    Apply="Set-Reg 'HKCU\Control Panel\Accessibility\ToggleKeys' 'Flags' String '58'";
    Revert="Set-Reg 'HKCU\Control Panel\Accessibility\ToggleKeys' 'Flags' String '62'" }

  # off by default (aggressive): hides the taskbar, disables the Windows key
  [pscustomobject]@{ Key='taskbar_autohide'; Label='Auto-hide the taskbar'; Cat='ui'; Admin=$false; Danger=$false;
    Check="(Get-Reg 'HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\StuckRects3' 'Settings')[8]"; Desired='^3$';
    Apply="Set-TaskbarAutohide 3"; Revert="Set-TaskbarAutohide 2" }

  [pscustomobject]@{ Key='disable_win_key'; Label='Disable the Windows logo key'; Cat='ui'; Admin=$true; Danger=$false;
    Check="if (Get-Reg 'HKLM\SYSTEM\CurrentControlSet\Control\Keyboard Layout' 'Scancode Map') {'set'} else {'unset'}"; Desired='^set$';
    Apply="Set-WinKeyDisabled `$true"; Revert="Set-WinKeyDisabled `$false" }

  # ---- touch / gestures -----------------------------------------------------
  [pscustomobject]@{ Key='edge_swipe'; Label='Disable edge swipe'; Cat='touch'; Admin=$true; Danger=$false;
    Check="Get-Reg 'HKLM\SOFTWARE\Policies\Microsoft\Windows\EdgeUI' 'AllowEdgeSwipe'"; Desired='^0$';
    Apply="Set-Reg 'HKLM\SOFTWARE\Policies\Microsoft\Windows\EdgeUI' 'AllowEdgeSwipe' DWord 0";
    Revert="Del-Reg 'HKLM\SOFTWARE\Policies\Microsoft\Windows\EdgeUI' 'AllowEdgeSwipe'" }

  [pscustomobject]@{ Key='touch_gestures'; Label='Disable 3/4-finger touchpad gestures'; Cat='touch'; Admin=$false; Danger=$false;
    Check="Get-Reg 'HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\PrecisionTouchPad' 'ThreeFingerSlideEnabled'"; Desired='^0$';
    Apply="foreach (`$v in 'ThreeFingerSlideEnabled','FourFingerSlideEnabled','ThreeFingerTapEnabled','FourFingerTapEnabled') { Set-Reg 'HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\PrecisionTouchPad' `$v DWord 0 }";
    Revert="foreach (`$v in 'ThreeFingerSlideEnabled','FourFingerSlideEnabled','ThreeFingerTapEnabled','FourFingerTapEnabled') { Del-Reg 'HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\PrecisionTouchPad' `$v }" }

  [pscustomobject]@{ Key='touch_feedback'; Label='Disable touch visual feedback'; Cat='touch'; Admin=$false; Danger=$false;
    Check="Get-Reg 'HKCU\Control Panel\Cursors' 'ContactVisualization'"; Desired='^0$';
    Apply="Set-Reg 'HKCU\Control Panel\Cursors' 'ContactVisualization' DWord 0; Set-Reg 'HKCU\Control Panel\Cursors' 'GestureVisualization' DWord 0";
    Revert="Set-Reg 'HKCU\Control Panel\Cursors' 'ContactVisualization' DWord 1; Set-Reg 'HKCU\Control Panel\Cursors' 'GestureVisualization' DWord 31" }

  # ---- updates --------------------------------------------------------------
  [pscustomobject]@{ Key='disable_updates'; Label='Disable automatic Windows Update'; Cat='updates'; Admin=$true; Danger=$false;
    Check="Get-Reg 'HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' 'NoAutoUpdate'"; Desired='^1$';
    Apply="Set-Reg 'HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' 'NoAutoUpdate' DWord 1; Set-Reg 'HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' 'AUOptions' DWord 1";
    Revert="Del-Reg 'HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' 'NoAutoUpdate'; Del-Reg 'HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' 'AUOptions'" }

  # ---- maintenance ----------------------------------------------------------
  [pscustomobject]@{ Key='weekly_reboot'; Label='Weekly reboot (Mon 03:00)'; Cat='maintenance'; Admin=$true; Danger=$false;
    Check="if (Get-ScheduledTask -TaskName 'Up4evr - Weekly Reboot' -EA SilentlyContinue) {'exists'} else {'none'}"; Desired='^exists$';
    Apply="schtasks /create /tn 'Up4evr - Weekly Reboot' /tr 'shutdown /r /f /t 0' /sc weekly /d MON /st 03:00 /ru SYSTEM /f";
    Revert="schtasks /delete /tn 'Up4evr - Weekly Reboot' /f" }

  # ---- services -------------------------------------------------------------
  # OneDrive: disables sync policy + removes startup. (Full uninstall left to
  # the operator; this is the reversible part.)
  [pscustomobject]@{ Key='disable_onedrive'; Label='Disable OneDrive sync + startup'; Cat='services'; Admin=$true; Danger=$false;
    Check="Get-Reg 'HKLM\SOFTWARE\Policies\Microsoft\Windows\OneDrive' 'DisableFileSyncNGSC'"; Desired='^1$';
    Apply="Set-Reg 'HKLM\SOFTWARE\Policies\Microsoft\Windows\OneDrive' 'DisableFileSyncNGSC' DWord 1; Del-Reg 'HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run' 'OneDrive'; taskkill /f /im OneDrive.exe 2>`$null";
    Revert="Del-Reg 'HKLM\SOFTWARE\Policies\Microsoft\Windows\OneDrive' 'DisableFileSyncNGSC'" }

  # ============================================================================
  #  DANGER ZONE — off by default in settings.conf.
  # ============================================================================
  # Auto-logon is handled specially by apply-settings.ps1 (it prompts for the
  # username/password). Password is stored in cleartext in the registry.
  [pscustomobject]@{ Key='auto_logon'; Label='DANGER: auto-logon (cleartext password)'; Cat='danger'; Admin=$true; Danger=$true;
    Check="Get-Reg 'HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon' 'AutoAdminLogon'"; Desired='^1$';
    Apply="__INTERACTIVE__";
    Revert="Set-Reg 'HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon' 'AutoAdminLogon' String '0'; Del-Reg 'HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon' 'DefaultPassword'" }
)
