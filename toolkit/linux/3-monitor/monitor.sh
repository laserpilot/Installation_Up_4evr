#!/bin/bash
# ============================================================================
#  Up 4evr — monitor.sh   (Linux Module 3)
# ----------------------------------------------------------------------------
#  One monitoring pass: append system specs to a rolling log, check the app is
#  alive and the expected display is present, detect settings drift (reusing
#  Module 1's check-settings.sh), and Slack-alert on problems.
#
#     ./monitor.sh               one pass (log + alerts)
#     ./monitor.sh --test-slack  send a test message to the webhook
#     ./monitor.sh --once-now    one pass, printing everything
# ============================================================================
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
[ -f "$HERE/monitor.conf" ] && source "$HERE/monitor.conf"

: "${APP_NAME:=}"; : "${EXPECTED_DISPLAY:=}"
: "${CPU_THRESHOLD:=90}"; : "${DISK_THRESHOLD:=90}"
: "${ALERT_ON_DRIFT:=1}"; : "${SETTINGS_DIR:=}"
: "${SLACK_WEBHOOK:=}"; : "${SLACK_USERNAME:=Up 4evr}"; : "${SLACK_ICON:=:satellite_antenna:}"
: "${DAILY_SUMMARY_HOUR:=}"; : "${LOG_DIR:=}"
[ -z "$LOG_DIR" ] && LOG_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/up4evr"
[ -z "$SETTINGS_DIR" ] && SETTINGS_DIR="$HERE/../1-system-settings"
mkdir -p "$LOG_DIR" 2>/dev/null
LOG="$LOG_DIR/monitor-$(date +%Y%m%d).log"
HOST="$(hostname)"

ALERTS=()
add_alert() { ALERTS+=("$1"); }

json_escape() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' | awk 'BEGIN{ORS="\\n"}{print}' | sed 's/\\n$//'; }
slack_post() {
  [ -z "$SLACK_WEBHOOK" ] && return 0
  local text; text="$(json_escape "$1")"
  curl -s -m 15 -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"${text}\",\"username\":\"${SLACK_USERNAME}\",\"icon_emoji\":\"${SLACK_ICON}\"}" \
    "$SLACK_WEBHOOK" >/dev/null 2>&1
}

case "${1:-}" in
  --test-slack)
    [ -z "$SLACK_WEBHOOK" ] && { echo "No SLACK_WEBHOOK set in monitor.conf."; exit 1; }
    if slack_post ":wave: Up 4evr test message from *${HOST}* at $(date)"; then echo "Sent."; else echo "Slack post failed."; exit 1; fi
    exit 0 ;;
esac

# ---- gather -----------------------------------------------------------------
CPU_IDLE="$(top -bn1 2>/dev/null | awk -F'[ ,]+' '/%?Cpu/{for(i=1;i<=NF;i++) if($i=="id") print $(i-1)}' | head -1)"
[ -z "$CPU_IDLE" ] && CPU_IDLE=100
CPU_USED="$(awk -v i="$CPU_IDLE" 'BEGIN{printf "%.0f", 100-i}')"
MEM_USED="$(free 2>/dev/null | awk '/^Mem:/{printf "%.0f", $3/$2*100}')"
DISK_USED="$(df -h / | awk 'NR==2{gsub("%","",$5); print $5}')"
UPTIME="$(uptime -p 2>/dev/null || uptime)"
TOP_MEM="$(ps axo rss=,comm= --sort=-rss 2>/dev/null | head -4 | awk '{printf "    %.0f MB  %s\n", $1/1024, $2}')"
DISPLAYS="$(command -v xrandr >/dev/null 2>&1 && xrandr --query 2>/dev/null | grep ' connected' | sed 's/^/    /')"

# ---- evaluate ---------------------------------------------------------------
if [ "$CPU_USED" -ge "$CPU_THRESHOLD" ] 2>/dev/null; then
  add_alert ":fire: High CPU on *${HOST}*: ${CPU_USED}% (threshold ${CPU_THRESHOLD}%)"
fi
if [ -n "$DISK_USED" ] && [ "$DISK_USED" -ge "$DISK_THRESHOLD" ] 2>/dev/null; then
  add_alert ":floppy_disk: Disk almost full on *${HOST}*: ${DISK_USED}% (threshold ${DISK_THRESHOLD}%)"
fi
APP_OK="n/a"
if [ -n "$APP_NAME" ]; then
  if pgrep -fi "$APP_NAME" >/dev/null 2>&1; then APP_OK="running"; else
    APP_OK="NOT running"; add_alert ":x: App *${APP_NAME}* is NOT running on *${HOST}*"
  fi
fi
DISP_OK="n/a"
if [ -n "$EXPECTED_DISPLAY" ]; then
  if command -v xrandr >/dev/null 2>&1 && xrandr --query 2>/dev/null | grep -q "$EXPECTED_DISPLAY"; then DISP_OK="present"; else
    DISP_OK="MISSING"; add_alert ":desktop_computer: Expected display (${EXPECTED_DISPLAY}) MISSING on *${HOST}*"
  fi
fi
DRIFT_OK="skipped"
if [ "$ALERT_ON_DRIFT" = "1" ] && [ -f "$SETTINGS_DIR/check-settings.sh" ]; then
  DLIST="$(bash "$SETTINGS_DIR/check-settings.sh" --drift 2>/dev/null | awk '{print $2}' | paste -sd, -)"
  if [ -n "$DLIST" ]; then DRIFT_OK="DRIFT: $DLIST"; add_alert ":wrench: System settings drifted on *${HOST}*: ${DLIST}"
  else DRIFT_OK="all settings OK"; fi
fi

# ---- log --------------------------------------------------------------------
{
  echo "==================== $(date) ===================="
  echo "Host: $HOST"
  echo "Uptime: $UPTIME"
  echo "CPU used: ${CPU_USED}%   Mem: ${MEM_USED}%   Disk: ${DISK_USED}%"
  echo "App ($APP_NAME): $APP_OK"
  echo "Display ($EXPECTED_DISPLAY): $DISP_OK"
  echo "Settings: $DRIFT_OK"
  echo "Top memory:"; printf '%s\n' "$TOP_MEM"
  [ -n "$DISPLAYS" ] && { echo "Displays:"; printf '%s\n' "$DISPLAYS"; }
  if [ "${#ALERTS[@]}" -gt 0 ]; then echo "ALERTS:"; for a in "${ALERTS[@]}"; do echo "    - $a"; done; fi
  echo
} >> "$LOG"

# ---- alerts -----------------------------------------------------------------
if [ "${#ALERTS[@]}" -gt 0 ]; then
  msg=":rotating_light: *Up 4evr alert — ${HOST}*"
  for a in "${ALERTS[@]}"; do msg="$msg"$'\n'"• $a"; done
  slack_post "$msg"
fi

# ---- daily heartbeat when healthy -------------------------------------------
if [ -n "$DAILY_SUMMARY_HOUR" ] && [ "${#ALERTS[@]}" -eq 0 ]; then
  STAMP="$LOG_DIR/.heartbeat-$(date +%Y%m%d)"
  if [ "$(date +%H)" = "$(printf '%02d' "$DAILY_SUMMARY_HOUR" 2>/dev/null || echo "$DAILY_SUMMARY_HOUR")" ] && [ ! -f "$STAMP" ]; then
    slack_post ":white_check_mark: *${HOST}* healthy — app ${APP_OK}, CPU ${CPU_USED}%, disk ${DISK_USED}%, ${DRIFT_OK}. Uptime: ${UPTIME}"
    touch "$STAMP"
  fi
fi

# ---- console echo -----------------------------------------------------------
if [ "${1:-}" = "--once-now" ] || [ -t 1 ]; then
  echo "Host $HOST | CPU ${CPU_USED}% | Mem ${MEM_USED}% | Disk ${DISK_USED}% | App($APP_NAME) $APP_OK | Display($EXPECTED_DISPLAY) $DISP_OK | $DRIFT_OK"
  echo "Logged to $LOG"
  [ "${#ALERTS[@]}" -gt 0 ] && { echo "Alerts:"; for a in "${ALERTS[@]}"; do echo "  - $a"; done; } || echo "No alerts."
fi
