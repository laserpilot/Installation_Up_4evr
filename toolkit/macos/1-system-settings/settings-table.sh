#!/bin/bash
# ============================================================================
#  Up 4evr — macOS settings registry  (shared by check + apply)
# ----------------------------------------------------------------------------
#  This file ONLY defines data. It is sourced by check-settings.sh and
#  apply-settings.sh. It does not change anything when run.
#
#  Each setting is one record with these fields, in order:
#     key      matches SET_<key> in settings.conf
#     label    human description
#     cat      power | ui | system | performance | updates | danger
#     sudo     1 if applying needs admin, else 0
#     check    shell that PRINTS the current value (read-only, no sudo)
#     desired  extended-regex the check output must match to count as "OK"
#     apply    shell that puts the machine into the desired state
#     revert   shell that restores the macOS default
#
#  Written for bash 3.2 (the macOS system bash) — no associative arrays.
#  Records are joined by the ASCII Unit-Separator so commands can contain
#  spaces, quotes and pipes freely.
# ============================================================================

US=$(printf '\037')   # field separator (ASCII 0x1F)
SETTINGS=()
ME="$(id -un)"

# add <key> <label> <cat> <sudo> <check> <desired> <apply> <revert>
add() {
  SETTINGS+=("${1}${US}${2}${US}${3}${US}${4}${US}${5}${US}${6}${US}${7}${US}${8}")
}

# ---- power / sleep ----------------------------------------------------------
add screensaver "Disable screensaver" power 0 \
  'defaults -currentHost read com.apple.screensaver idleTime 2>/dev/null || echo unset' '^0$' \
  'defaults -currentHost write com.apple.screensaver idleTime 0' \
  'defaults -currentHost write com.apple.screensaver idleTime 600'

add display_sleep "Never sleep the display" power 1 \
  'pmset -g | awk "\$1==\"displaysleep\"{print \$2}"' '^0$' \
  'pmset -c displaysleep 0' \
  'pmset -c displaysleep 10'

add computer_sleep "Never sleep the computer" power 1 \
  'pmset -g | awk "\$1==\"sleep\"{print \$2}"' '^0$' \
  'pmset -c sleep 0' \
  'pmset -c sleep 30'

add restart_freeze "Auto-restart if the system freezes" power 1 \
  'o=$(systemsetup -getrestartfreeze 2>&1); case "$o" in *administrator*) echo needs-admin;; *) echo "${o#*: }";; esac' 'On' \
  'systemsetup -setrestartfreeze on' \
  'systemsetup -setrestartfreeze off'

add power_autorestart "Auto-restart after a power failure" power 1 \
  'pmset -g | awk "\$1==\"autorestart\"{print \$2}"' '^1$' \
  'pmset -c autorestart 1' \
  'pmset -c autorestart 0'

# ---- user interface ---------------------------------------------------------
# NOTE: doNotDisturb is the legacy Notification Center key. On Monterey+ Focus
# largely supersedes it; we still set it as it is harmless and helps older OSes.
add do_not_disturb "Silence notifications (legacy DND)" ui 0 \
  'defaults -currentHost read com.apple.notificationcenterui doNotDisturb 2>/dev/null || echo 0' '^1$' \
  'defaults -currentHost write com.apple.notificationcenterui doNotDisturb -boolean true' \
  'defaults -currentHost write com.apple.notificationcenterui doNotDisturb -boolean false'

add hide_menubar "Auto-hide the menu bar" ui 0 \
  'defaults read NSGlobalDomain _HIHideMenuBar 2>/dev/null || echo 0' '^1$' \
  'defaults write NSGlobalDomain _HIHideMenuBar -bool true' \
  'defaults write NSGlobalDomain _HIHideMenuBar -bool false'

add hide_desktop_icons "Hide desktop icons" ui 0 \
  'defaults read com.apple.finder CreateDesktop 2>/dev/null || echo 1' '^0$' \
  'defaults write com.apple.finder CreateDesktop -bool false && killall Finder' \
  'defaults write com.apple.finder CreateDesktop -bool true && killall Finder'

add autohide_dock "Auto-hide the Dock" ui 0 \
  'defaults read com.apple.dock autohide 2>/dev/null || echo 0' '^1$' \
  'defaults write com.apple.dock autohide -bool true && killall Dock' \
  'defaults write com.apple.dock autohide -bool false && killall Dock'

add disable_stage_manager "Disable Stage Manager" ui 0 \
  'defaults read com.apple.WindowManager GloballyEnabled 2>/dev/null || echo 1' '^0$' \
  'defaults write com.apple.WindowManager GloballyEnabled -bool false; killall Dock' \
  'defaults write com.apple.WindowManager GloballyEnabled -bool true; killall Dock'

# ---- system / hardware ------------------------------------------------------
add bluetooth_assistant "Stop Bluetooth Setup Assistant popup" system 1 \
  'defaults read /Library/Preferences/com.apple.Bluetooth BluetoothAutoSeekPointingDevice 2>/dev/null || echo 1' '^0$' \
  'defaults write /Library/Preferences/com.apple.Bluetooth BluetoothAutoSeekPointingDevice -bool false && defaults write /Library/Preferences/com.apple.Bluetooth BluetoothAutoSeekKeyboard -bool false' \
  'defaults delete /Library/Preferences/com.apple.Bluetooth BluetoothAutoSeekPointingDevice 2>/dev/null; defaults delete /Library/Preferences/com.apple.Bluetooth BluetoothAutoSeekKeyboard 2>/dev/null; true'

add disable_wifi_prompt "Stop ask-to-join-network prompts" system 1 \
  'defaults read /Library/Preferences/SystemConfiguration/com.apple.airport JoinMode 2>/dev/null || echo Prompt' 'Automatic' \
  'defaults write /Library/Preferences/SystemConfiguration/com.apple.airport JoinMode -string Automatic' \
  'defaults write /Library/Preferences/SystemConfiguration/com.apple.airport JoinMode -string Prompt'

# ---- performance ------------------------------------------------------------
add disable_app_nap "Disable App Nap" performance 0 \
  'defaults read NSGlobalDomain NSAppSleepDisabled 2>/dev/null || echo 0' '^1$' \
  'defaults write NSGlobalDomain NSAppSleepDisabled -bool YES' \
  'defaults write NSGlobalDomain NSAppSleepDisabled -bool NO'

add disable_spotlight "Disable Spotlight indexing" performance 1 \
  'mdutil -s / 2>/dev/null || echo unknown' 'disabled' \
  'mdutil -a -i off' \
  'mdutil -a -i on'

# ---- software updates -------------------------------------------------------
add disable_auto_updates "Disable automatic macOS updates" updates 1 \
  'defaults read /Library/Preferences/com.apple.SoftwareUpdate AutomaticCheckEnabled 2>/dev/null || echo 1' '^0$' \
  'softwareupdate --schedule off; defaults write /Library/Preferences/com.apple.SoftwareUpdate AutomaticCheckEnabled -bool false' \
  'softwareupdate --schedule on; defaults write /Library/Preferences/com.apple.SoftwareUpdate AutomaticCheckEnabled -bool true'

add disable_appstore_updates "Disable automatic App Store updates" updates 0 \
  'defaults read com.apple.commerce AutoUpdate 2>/dev/null || echo 1' '^0$' \
  'defaults write com.apple.commerce AutoUpdate -bool false' \
  'defaults write com.apple.commerce AutoUpdate -bool true'

# ============================================================================
#  DANGER ZONE — security-reducing. Off in settings.conf by default.
# ============================================================================
add disable_gatekeeper "DANGER: allow unsigned apps (Gatekeeper off)" danger 1 \
  'spctl --status 2>/dev/null || echo unknown' 'disabled' \
  'spctl --master-disable' \
  'spctl --master-enable'

# Requires SIP disabled; will silently fail otherwise. Apply/revert flip perms.
add disable_crash_reporter "DANGER: hide crash dialogs (needs SIP off)" danger 1 \
  'ls -ld "/System/Library/CoreServices/Problem Reporter.app" 2>/dev/null | awk "{print \$1}"' '^d---------' \
  'chmod 000 "/System/Library/CoreServices/Problem Reporter.app"' \
  'chmod 755 "/System/Library/CoreServices/Problem Reporter.app"'

# Blocked when FileVault is on; modern macOS also needs /etc/kcpassword.
add enable_auto_login "DANGER: auto-login current user" danger 1 \
  'defaults read /Library/Preferences/com.apple.loginwindow autoLoginUser 2>/dev/null || echo none' "^${ME}$" \
  "defaults write /Library/Preferences/com.apple.loginwindow autoLoginUser -string ${ME}" \
  'defaults delete /Library/Preferences/com.apple.loginwindow autoLoginUser'
