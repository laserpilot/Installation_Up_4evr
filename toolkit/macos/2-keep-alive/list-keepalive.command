#!/bin/bash
# ============================================================================
#  Up 4evr — list-keepalive.command   (Module 2)
# ----------------------------------------------------------------------------
#  Shows every keep-alive agent this toolkit installed, whether launchd has it
#  loaded, and the live PID if the app is currently running. This is the quick
#  "are my installs still being watched?" check.
# ============================================================================
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/_ka-common.sh"

printf "%sUp 4evr — keep-alive agents%s\n\n" "$B" "$Z"

found=0
for plist in $(managed_plists); do
  found=$((found+1))
  label="$(basename "$plist" .plist)"
  program="$(/usr/libexec/PlistBuddy -c 'Print :ProgramArguments:0' "$plist" 2>/dev/null)"
  # for app agents the real target is the last arg (open -W <App>); show that
  if [ "$program" = "/usr/bin/open" ]; then
    program="$(/usr/libexec/PlistBuddy -c 'Print :ProgramArguments' "$plist" 2>/dev/null | sed -n 's/^ *//;/\.app$/p' | tail -1)"
  fi

  # launchctl list prints a line for loaded agents: "<pid>\t<status>\t<label>"
  line="$(launchctl list 2>/dev/null | awk -v l="$label" '$3==l{print}')"
  if [ -n "$line" ]; then
    pid="$(printf '%s' "$line" | awk '{print $1}')"
    if [ "$pid" != "-" ] && [ -n "$pid" ]; then
      state="${G}running${Z}  pid $pid"
    else
      state="${Y}loaded, app not running${Z}  (launchd will relaunch)"
    fi
  else
    state="${DIM}not loaded${Z}"
  fi

  printf "  %s%s%s\n" "$B" "$label" "$Z"
  printf "      app   : %s\n" "${program:-<unknown>}"
  printf "      state : %s\n\n" "$state"
done

if [ "$found" = "0" ]; then
  printf "  %sNo keep-alive agents installed yet.%s\n" "$DIM" "$Z"
  printf "  Use install-keepalive.command to add one.\n"
fi
pause_if_clicked
