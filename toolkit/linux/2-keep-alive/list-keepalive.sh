#!/bin/bash
# ============================================================================
#  Up 4evr — list-keepalive.sh   (Linux Module 2)
# ----------------------------------------------------------------------------
#  Shows every keep-alive user service this toolkit installed, whether it's
#  active, and its main PID. The quick "is my install still watched?" check.
# ============================================================================
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/_ka-common.sh"

printf "%sUp 4evr — keep-alive services%s\n\n" "$B" "$Z"

found=0
for unit in $(managed_units); do
  found=$((found+1))
  name="$(basename "$unit" .service)"
  exec_line="$(grep -m1 '^ExecStart=' "$unit" | sed 's/^ExecStart=//')"
  active="$(systemctl --user is-active "$name" 2>/dev/null)"
  pid="$(systemctl --user show -p MainPID --value "$name" 2>/dev/null)"
  if [ "$active" = "active" ]; then state="${G}active${Z}  pid ${pid}"
  else state="${Y}${active:-inactive}${Z}"; fi
  printf "  %s%s%s\n" "$B" "$name" "$Z"
  printf "      cmd   : %s\n" "$exec_line"
  printf "      state : %s\n\n" "$state"
done

if [ "$found" = "0" ]; then
  printf "  %sNo keep-alive services installed yet.%s\n" "$DIM" "$Z"
  printf "  Use install-keepalive.sh to add one.\n"
fi
