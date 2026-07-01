#!/bin/bash
# ============================================================================
#  Up 4evr — remove-keepalive.command   (Module 2)
# ----------------------------------------------------------------------------
#  Stops and removes a keep-alive agent. Pick one from the list. This only
#  removes the watcher — it does not quit the app (do that yourself if needed).
# ============================================================================
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/_ka-common.sh"

printf "%sUp 4evr — remove keep-alive%s\n\n" "$B" "$Z"

plists=()
while IFS= read -r p; do [ -n "$p" ] && plists+=("$p"); done <<< "$(managed_plists)"

if [ "${#plists[@]}" = "0" ]; then
  printf "  %sNo keep-alive agents installed.%s\n" "$DIM" "$Z"; pause_if_clicked; exit 0
fi

i=1
for p in "${plists[@]}"; do
  printf "  %d) %s\n" "$i" "$(basename "$p" .plist)"
  i=$((i+1))
done
printf "\nNumber to remove (or 'q' to cancel): "
read -r choice
case "$choice" in
  q|Q|"") echo "Cancelled."; pause_if_clicked; exit 0 ;;
esac
if ! printf '%s' "$choice" | grep -Eq '^[0-9]+$' || [ "$choice" -lt 1 ] || [ "$choice" -gt "${#plists[@]}" ]; then
  printf "%sNot a valid choice.%s\n" "$R" "$Z"; pause_if_clicked; exit 1
fi

PLIST="${plists[$((choice-1))]}"
LABEL="$(basename "$PLIST" .plist)"

ka_unload "$LABEL" "$PLIST" >/dev/null 2>&1
rm -f "$PLIST"
printf "%s✓ Removed%s %s\n" "$G" "$Z" "$LABEL"
printf "  (The app itself was left running if it was open.)\n"
pause_if_clicked
