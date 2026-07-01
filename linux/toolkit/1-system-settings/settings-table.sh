#!/bin/bash
# ============================================================================
#  Up 4evr — Linux (Ubuntu/GNOME) settings registry  (shared by check + apply)
# ----------------------------------------------------------------------------
#  Data only. Sourced by check-settings.sh and apply-settings.sh. Same record
#  format as the macOS toolkit: fields joined by the ASCII Unit-Separator so
#  commands may contain spaces/quotes/pipes.
#
#     key      matches SET_<key> in settings.conf
#     label    human description
#     cat      power | ui | performance | updates | danger
#     sudo     1 if applying needs root, else 0
#     check    shell that PRINTS the current value (read-only)
#     desired  extended-regex the check output must match to count as "OK"
#     apply    shell that puts the machine into the desired state
#     revert   shell that restores the distro default
#
#  Targets Ubuntu 22.04+ with GNOME. gsettings works under X11 and Wayland.
#  User-session settings (gsettings) need no sudo; system ones (systemctl,
#  gdm3) do. Run apply from inside the graphical session so gsettings/DBus work.
# ============================================================================

US=$(printf '\037')
SETTINGS=()

# add <key> <label> <cat> <sudo> <check> <desired> <apply> <revert>
add() {
  SETTINGS+=("${1}${US}${2}${US}${3}${US}${4}${US}${5}${US}${6}${US}${7}${US}${8}")
}

# ---- power / sleep ----------------------------------------------------------
add screen_blank "Never blank the screen" power 0 \
  'gsettings get org.gnome.desktop.session idle-delay' '^uint32 0$' \
  'gsettings set org.gnome.desktop.session idle-delay 0' \
  'gsettings set org.gnome.desktop.session idle-delay 300'

add idle_dim "Do not dim the screen" power 0 \
  'gsettings get org.gnome.settings-daemon.plugins.power idle-dim' '^false$' \
  'gsettings set org.gnome.settings-daemon.plugins.power idle-dim false' \
  'gsettings set org.gnome.settings-daemon.plugins.power idle-dim true'

add sleep_ac "Never auto-suspend (plugged in)" power 0 \
  'gsettings get org.gnome.settings-daemon.plugins.power sleep-inactive-ac-type' "nothing" \
  "gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-ac-type 'nothing'" \
  "gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-ac-type 'suspend'"

add sleep_battery "Never auto-suspend (battery)" power 0 \
  'gsettings get org.gnome.settings-daemon.plugins.power sleep-inactive-battery-type' "nothing" \
  "gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-battery-type 'nothing'" \
  "gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-battery-type 'suspend'"

add screensaver_lock "Disable screen lock" power 0 \
  'gsettings get org.gnome.desktop.screensaver lock-enabled' '^false$' \
  'gsettings set org.gnome.desktop.screensaver lock-enabled false' \
  'gsettings set org.gnome.desktop.screensaver lock-enabled true'

add screensaver_idle "Disable screensaver activation" power 0 \
  'gsettings get org.gnome.desktop.screensaver idle-activation-enabled' '^false$' \
  'gsettings set org.gnome.desktop.screensaver idle-activation-enabled false' \
  'gsettings set org.gnome.desktop.screensaver idle-activation-enabled true'

# system-level sleep off (belt-and-suspenders with the gsettings above)
add system_sleep "Mask system sleep/suspend targets" power 1 \
  'systemctl is-enabled sleep.target 2>/dev/null || echo unknown' 'masked' \
  'systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target' \
  'systemctl unmask sleep.target suspend.target hibernate.target hybrid-sleep.target'

# ---- user interface ---------------------------------------------------------
add notifications "Disable notification banners" ui 0 \
  'gsettings get org.gnome.desktop.notifications show-banners' '^false$' \
  'gsettings set org.gnome.desktop.notifications show-banners false' \
  'gsettings set org.gnome.desktop.notifications show-banners true'

# ---- performance ------------------------------------------------------------
add disable_apport "Disable crash reporter (apport)" performance 1 \
  'systemctl is-enabled apport 2>/dev/null || echo unknown' 'disabled|masked' \
  'systemctl disable --now apport' \
  'systemctl enable --now apport'

# ---- software updates -------------------------------------------------------
add disable_auto_updates "Disable automatic apt updates" updates 1 \
  'systemctl is-enabled unattended-upgrades 2>/dev/null || echo unknown' 'disabled|masked' \
  'systemctl disable --now unattended-upgrades' \
  'systemctl enable --now unattended-upgrades'

# ============================================================================
#  DANGER ZONE — off by default. Assumes GDM3 (the Ubuntu default display mgr).
# ============================================================================
add auto_login "DANGER: auto-login current user (GDM)" danger 1 \
  'grep -E "^AutomaticLoginEnable" /etc/gdm3/custom.conf 2>/dev/null | grep -qi true && echo true || echo false' 'true' \
  'sed -i -E "s/^#? *AutomaticLoginEnable *=.*/AutomaticLoginEnable=true/; s/^#? *AutomaticLogin *=.*/AutomaticLogin=$(id -un)/" /etc/gdm3/custom.conf' \
  'sed -i -E "s/^AutomaticLoginEnable *=.*/AutomaticLoginEnable=false/" /etc/gdm3/custom.conf'
