#!/bin/bash
# ============================================================================
#  Up 4evr — install-keepalive.command   (Module 2)
# ----------------------------------------------------------------------------
#  Sets up a launchd LaunchAgent that keeps an app running forever: it starts
#  the app at login and relaunches it whenever it quits, crashes, or is killed.
#
#  Double-click in Finder, or run in Terminal. You'll be asked for the app.
#  Tip: you can DRAG the .app from Finder into the Terminal window to paste
#  its path. You can also pass the path as an argument:
#       ./install-keepalive.command /Applications/MyShow.app
# ============================================================================
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/_ka-common.sh"

printf "%sUp 4evr — install keep-alive%s\n\n" "$B" "$Z"

APP="${1:-}"
if [ -z "$APP" ]; then
  printf "Drag the app here (or type its path), then press return:\n> "
  read -r APP
fi
# strip surrounding quotes/whitespace that drag-and-drop can add
APP="${APP%\"}"; APP="${APP#\"}"; APP="${APP%\'}"; APP="${APP#\'}"
APP="$(printf '%s' "$APP" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"

TARGET="$(classify_target "$APP")"
if [ -z "$TARGET" ]; then
  printf "%sCould not find a runnable app or executable at:%s %s\n" "$R" "$Z" "$APP"
  printf "Point me at a .app bundle (e.g. /Applications/Foo.app) or an executable file.\n"
  pause_if_clicked; exit 1
fi
IFS="$US" read -r MODE TPATH <<< "$TARGET"

# Build the ProgramArguments launchd will run.
if [ "$MODE" = "app" ]; then
  ARGS=(/usr/bin/open -W "$TPATH")
  how="via open -W (LaunchServices)"
else
  ARGS=("$TPATH")
  how="direct exec"
fi

LABEL="$(label_for "$TPATH")"
PLIST="$LA_DIR/$LABEL.plist"
LOG="$LOG_DIR/$LABEL.log"

printf "  Target     : %s  %s(%s)%s\n" "$TPATH" "$DIM" "$how" "$Z"
printf "  Agent label: %s\n" "$LABEL"
printf "  Plist      : %s\n" "$PLIST"
printf "  App log    : %s\n\n" "$LOG"

if [ -f "$PLIST" ]; then
  printf "%sAn agent for this app already exists. Replace it? [y/N] %s" "$Y" "$Z"
  read -r ans; case "$ans" in y|Y|yes|YES) ka_unload "$LABEL" "$PLIST" >/dev/null 2>&1 ;; *) echo "Left unchanged."; pause_if_clicked; exit 0 ;; esac
fi

mkdir -p "$LA_DIR"
# render static keys from template, then populate ProgramArguments via PlistBuddy
sed -e "s#__LABEL__#${LABEL}#g" \
    -e "s#__LOG__#${LOG}#g" \
    "$HERE/keepalive.plist.template" > "$PLIST"

idx=0
for a in "${ARGS[@]}"; do
  /usr/libexec/PlistBuddy -c "Add :ProgramArguments:${idx} string ${a}" "$PLIST" >/dev/null 2>&1
  idx=$((idx+1))
done

if plutil -lint "$PLIST" >/dev/null 2>&1; then :; else
  printf "%sGenerated plist failed validation; aborting.%s\n" "$R" "$Z"; rm -f "$PLIST"; pause_if_clicked; exit 1
fi

if ka_load "$PLIST"; then
  printf "%s✓ Installed and started.%s The app is now kept alive across crashes and logins.\n" "$G" "$Z"
  printf "  Manage it with  list-keepalive.command  /  remove-keepalive.command\n"
else
  printf "%sPlist written but launchctl load failed.%s It will still start at next login.\n" "$Y" "$Z"
fi
pause_if_clicked
