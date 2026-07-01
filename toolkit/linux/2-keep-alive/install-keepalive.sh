#!/bin/bash
# ============================================================================
#  Up 4evr — install-keepalive.sh   (Linux Module 2)
# ----------------------------------------------------------------------------
#  Keep an app running forever via a systemd *user* service (Restart=always):
#  it starts at graphical login and relaunches whenever the app exits.
#
#     ./install-keepalive.sh /path/to/MyShow          run this executable
#     ./install-keepalive.sh "chromium --kiosk URL"   or a full command line
#  With no argument it will ask.
# ============================================================================
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/_ka-common.sh"

printf "%sUp 4evr — install keep-alive%s\n\n" "$B" "$Z"

CMD="${*:-}"
if [ -z "$CMD" ]; then
  printf "Command or executable to keep alive:\n> "
  read -r CMD
fi
CMD="$(printf '%s' "$CMD" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
[ -z "$CMD" ] && { echo "Nothing given."; exit 1; }

# first token is the program; verify it resolves
PROG="${CMD%% *}"
if ! command -v "$PROG" >/dev/null 2>&1 && [ ! -x "$PROG" ]; then
  printf "%sCan't find an executable for:%s %s\n" "$R" "$Z" "$PROG"
  printf "Give a full path or a command whose program is on PATH.\n"; exit 1
fi
# systemd wants an absolute ExecStart program
if [ "${PROG:0:1}" != "/" ]; then
  ABS="$(command -v "$PROG")"; CMD="${ABS}${CMD#$PROG}"
fi

NAME="$(name_for "$PROG")"
UNIT="$UNIT_DIR/$NAME.service"

printf "  Command : %s\n  Unit    : %s\n\n" "$CMD" "$UNIT"
if [ -f "$UNIT" ]; then
  printf "%sA unit for this already exists. Replace it? [y/N] %s" "$Y" "$Z"
  read -r a; case "$a" in y|Y|yes|YES) systemctl --user disable --now "$NAME" >/dev/null 2>&1 ;; *) echo "Left unchanged."; exit 0 ;; esac
fi

cat > "$UNIT" <<UNITEOF
[Unit]
Description=Up 4evr keep-alive: $NAME
PartOf=graphical-session.target
After=graphical-session.target

[Service]
ExecStart=$CMD
Restart=always
RestartSec=3

[Install]
WantedBy=graphical-session.target
UNITEOF

# make sure the user manager knows the current session env (DISPLAY/Wayland)
systemctl --user import-environment DISPLAY WAYLAND_DISPLAY XAUTHORITY 2>/dev/null
systemctl --user daemon-reload

if systemctl --user enable --now "$NAME" >/dev/null 2>&1; then
  printf "%s✓ Installed and started.%s Kept alive across crashes and logins.\n" "$G" "$Z"
  printf "  Manage with  list-keepalive.sh  /  remove-keepalive.sh\n"
  printf "  %sTip: if this is a GUI app and it didn't appear, run it from inside your desktop session.%s\n" "$DIM" "$Z"
else
  printf "%sUnit written but enable/start failed.%s Check: systemctl --user status %s\n" "$Y" "$Z" "$NAME"
fi
