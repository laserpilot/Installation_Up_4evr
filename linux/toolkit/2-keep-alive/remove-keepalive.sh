#!/bin/bash
# ============================================================================
#  Up 4evr — remove-keepalive.sh   (Linux Module 2)
# ----------------------------------------------------------------------------
#  Stops and removes a keep-alive user service. Pick one from the list. This
#  only removes the watcher — it does not quit the app.
# ============================================================================
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/_ka-common.sh"

printf "%sUp 4evr — remove keep-alive%s\n\n" "$B" "$Z"

units=()
while IFS= read -r u; do [ -n "$u" ] && units+=("$u"); done <<< "$(managed_units)"
if [ "${#units[@]}" = "0" ]; then
  printf "  %sNo keep-alive services installed.%s\n" "$DIM" "$Z"; exit 0
fi

i=1
for u in "${units[@]}"; do printf "  %d) %s\n" "$i" "$(basename "$u" .service)"; i=$((i+1)); done
printf "\nNumber to remove (or 'q' to cancel): "
read -r choice
case "$choice" in q|Q|"") echo "Cancelled."; exit 0 ;; esac
if ! printf '%s' "$choice" | grep -Eq '^[0-9]+$' || [ "$choice" -lt 1 ] || [ "$choice" -gt "${#units[@]}" ]; then
  printf "%sNot a valid choice.%s\n" "$R" "$Z"; exit 1
fi

UNIT="${units[$((choice-1))]}"
NAME="$(basename "$UNIT" .service)"
systemctl --user disable --now "$NAME" >/dev/null 2>&1
rm -f "$UNIT"
systemctl --user daemon-reload
printf "%s✓ Removed%s %s\n" "$G" "$Z" "$NAME"
printf "  (The app itself was left running if it was open.)\n"
