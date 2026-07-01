#!/bin/bash
# ============================================================================
#  Up 4evr — keep-alive shared helpers  (sourced by the .command scripts)
# ============================================================================
LA_DIR="$HOME/Library/LaunchAgents"
LOG_DIR="$HOME/Library/Logs/up4evr"
PREFIX="com.up4evr.keepalive"          # we only ever touch labels with this prefix
GUI="gui/$(id -u)"

mkdir -p "$LOG_DIR" 2>/dev/null

if [ -t 1 ]; then G=$'\033[32m'; Y=$'\033[33m'; R=$'\033[31m'; DIM=$'\033[2m'; B=$'\033[1m'; Z=$'\033[0m'
else G=""; Y=""; R=""; DIM=""; B=""; Z=""; fi

# Classify a user-supplied path. Echoes "MODE${US}PATH":
#   app${US}/path/Foo.app      -> launch via `open -W` (LaunchServices)
#   exec${US}/path/to/binary   -> run the binary directly
# Echoes nothing if the path is neither a .app bundle nor an executable file.
US=$(printf '\037')
classify_target() {
  local p="$1"
  p="${p%/}"                                   # strip trailing slash
  if [ -d "$p" ] && [[ "$p" == *.app ]]; then
    echo "app${US}${p}"
  elif [ -f "$p" ] && [ -x "$p" ]; then
    echo "exec${US}${p}"
  else
    echo ""
  fi
}

# Derive a clean label from an app/executable path.
label_for() {
  local p="$1" base
  base="$(basename "$p")"; base="${base%.app}"
  base="$(printf '%s' "$base" | tr ' /' '__' | tr -cd '[:alnum:]_.-')"
  echo "${PREFIX}.${base}"
}

# launchctl load/unload that works on modern + legacy macOS.
ka_load()   { launchctl bootstrap "$GUI" "$1" 2>/dev/null || launchctl load -w "$1"; }
ka_unload() { launchctl bootout "$GUI/$1" 2>/dev/null || launchctl unload "$2"; }

# List plist files we manage (one path per line).
managed_plists() { ls "$LA_DIR/$PREFIX."*.plist 2>/dev/null; }

pause_if_clicked() {
  # When launched by double-click, keep the Terminal window readable.
  case "${TERM_PROGRAM:-}" in Apple_Terminal|iTerm.app) printf "\n%sPress return to close…%s " "$DIM" "$Z"; read -r _ ;; esac
}
