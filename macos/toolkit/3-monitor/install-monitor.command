#!/bin/bash
# ============================================================================
#  Up 4evr — install-monitor.command   (Module 3)
# ----------------------------------------------------------------------------
#  Schedules monitor.sh to run on a fixed interval via launchd, so the machine
#  keeps logging specs and sending alerts on its own. Edit monitor.conf FIRST
#  (set APP_NAME, SLACK_WEBHOOK, thresholds, etc).
#
#     ./install-monitor.command [interval_seconds]   (default 300 = 5 min)
#  Re-run to change the interval. Use --remove to stop monitoring.
# ============================================================================
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
LA_DIR="$HOME/Library/LaunchAgents"
LOG_DIR="$HOME/Library/Logs/up4evr"
LABEL="com.up4evr.monitor"
PLIST="$LA_DIR/$LABEL.plist"
GUI="gui/$(id -u)"
MONITOR="$HERE/monitor.sh"
mkdir -p "$LA_DIR" "$LOG_DIR"

if [ -t 1 ]; then G=$'\033[32m'; Y=$'\033[33m'; R=$'\033[31m'; DIM=$'\033[2m'; B=$'\033[1m'; Z=$'\033[0m'
else G=""; Y=""; R=""; DIM=""; B=""; Z=""; fi
pause(){ case "${TERM_PROGRAM:-}" in Apple_Terminal|iTerm.app) printf "\n%sPress return to close…%s " "$DIM" "$Z"; read -r _ ;; esac; }

if [ "${1:-}" = "--remove" ]; then
  launchctl bootout "$GUI/$LABEL" 2>/dev/null || launchctl unload "$PLIST" 2>/dev/null
  rm -f "$PLIST"
  printf "%s✓ Monitoring stopped and removed.%s\n" "$G" "$Z"; pause; exit 0
fi

INTERVAL="${1:-300}"
if ! printf '%s' "$INTERVAL" | grep -Eq '^[0-9]+$'; then
  printf "%sInterval must be a number of seconds.%s\n" "$R" "$Z"; pause; exit 1
fi

chmod +x "$MONITOR" 2>/dev/null
[ -f "$HERE/../1-system-settings/check-settings.sh" ] && chmod +x "$HERE/../1-system-settings/check-settings.sh" 2>/dev/null

# unload any previous version first
launchctl bootout "$GUI/$LABEL" 2>/dev/null || launchctl unload "$PLIST" 2>/dev/null

cat > "$PLIST" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>${LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>${MONITOR}</string>
    </array>
    <key>StartInterval</key><integer>${INTERVAL}</integer>
    <key>RunAtLoad</key><true/>
    <key>StandardOutPath</key><string>${LOG_DIR}/${LABEL}.out.log</string>
    <key>StandardErrorPath</key><string>${LOG_DIR}/${LABEL}.err.log</string>
</dict>
</plist>
PLISTEOF

if ! plutil -lint "$PLIST" >/dev/null 2>&1; then
  printf "%sGenerated plist failed validation; aborting.%s\n" "$R" "$Z"; rm -f "$PLIST"; pause; exit 1
fi

if launchctl bootstrap "$GUI" "$PLIST" 2>/dev/null || launchctl load -w "$PLIST"; then
  printf "%s✓ Monitoring every %s seconds.%s\n" "$G" "$INTERVAL" "$Z"
  printf "  Config : %s\n" "$HERE/monitor.conf"
  printf "  Logs   : %s/monitor-YYYYMMDD.log\n" "$LOG_DIR"
  printf "  Stop   : ./install-monitor.command --remove\n"
  [ -z "${SLACK_WEBHOOK:-}" ] && grep -q '^SLACK_WEBHOOK=""' "$HERE/monitor.conf" 2>/dev/null && \
    printf "  %sTip: set SLACK_WEBHOOK in monitor.conf and run ./monitor.sh --test-slack%s\n" "$DIM" "$Z"
else
  printf "%sFailed to load the monitor agent.%s\n" "$R" "$Z"; pause; exit 1
fi
pause
