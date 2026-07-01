#!/bin/bash
# ============================================================================
#  Up 4evr — install-monitor.sh   (Linux Module 3)
# ----------------------------------------------------------------------------
#  Runs monitor.sh on an interval via a systemd *user* timer. Edit monitor.conf
#  FIRST (APP_NAME, SLACK_WEBHOOK, thresholds).
#
#     ./install-monitor.sh [seconds]   default 300 (5 min)
#     ./install-monitor.sh --remove    stop monitoring
# ============================================================================
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
UNIT_DIR="$HOME/.config/systemd/user"
NAME="up4evr-monitor"
MON="$HERE/monitor.sh"
mkdir -p "$UNIT_DIR"

if [ -t 1 ]; then G=$'\033[32m'; R=$'\033[31m'; DIM=$'\033[2m'; B=$'\033[1m'; Z=$'\033[0m'
else G=""; R=""; DIM=""; B=""; Z=""; fi

if [ "${1:-}" = "--remove" ]; then
  systemctl --user disable --now "$NAME.timer" >/dev/null 2>&1
  rm -f "$UNIT_DIR/$NAME.service" "$UNIT_DIR/$NAME.timer"
  systemctl --user daemon-reload
  printf "%s✓ Monitoring stopped and removed.%s\n" "$G" "$Z"; exit 0
fi

INTERVAL="${1:-300}"
if ! printf '%s' "$INTERVAL" | grep -Eq '^[0-9]+$'; then
  printf "%sInterval must be a number of seconds.%s\n" "$R" "$Z"; exit 1
fi
chmod +x "$MON" 2>/dev/null
[ -f "$HERE/../1-system-settings/check-settings.sh" ] && chmod +x "$HERE/../1-system-settings/check-settings.sh" 2>/dev/null

cat > "$UNIT_DIR/$NAME.service" <<UNITEOF
[Unit]
Description=Up 4evr monitor (one pass)

[Service]
Type=oneshot
ExecStart=/bin/bash $MON
UNITEOF

cat > "$UNIT_DIR/$NAME.timer" <<TIMEREOF
[Unit]
Description=Up 4evr monitor timer

[Timer]
OnBootSec=60
OnUnitActiveSec=${INTERVAL}
AccuracySec=15

[Install]
WantedBy=timers.target
TIMEREOF

systemctl --user daemon-reload
if systemctl --user enable --now "$NAME.timer" >/dev/null 2>&1; then
  systemctl --user start "$NAME.service" >/dev/null 2>&1   # run one pass now
  printf "%s✓ Monitoring every %s seconds.%s\n" "$G" "$INTERVAL" "$Z"
  printf "  Config : %s\n" "$HERE/monitor.conf"
  printf "  Logs   : \${XDG_STATE_HOME:-~/.local/state}/up4evr/monitor-YYYYMMDD.log\n"
  printf "  Stop   : ./install-monitor.sh --remove\n"
else
  printf "%sFailed to enable the monitor timer.%s Check: systemctl --user status %s.timer\n" "$R" "$Z" "$NAME"; exit 1
fi
