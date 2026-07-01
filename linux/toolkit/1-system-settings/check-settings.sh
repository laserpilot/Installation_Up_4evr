#!/bin/bash
# ============================================================================
#  Up 4evr — check-settings.sh   (Linux Module 1, READ-ONLY)
# ----------------------------------------------------------------------------
#  Reports each enabled setting as OK or NEEDS-CHANGE. Changes NOTHING.
#  Safe to run anytime, no root needed. Run inside your GNOME session so
#  gsettings can read the user values. Also used by Module 3 (monitor) for
#  settings-drift detection.
#
#     ./check-settings.sh            human-readable, colorised
#     ./check-settings.sh --drift    prints "DRIFT <key>" lines; exit 1 if any
# ============================================================================
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/settings-table.sh"
[ -f "$HERE/settings.conf" ] && source "$HERE/settings.conf"

MODE="human"
case "${1:-}" in --drift) MODE="drift" ;; esac

if [ -t 1 ] && [ "$MODE" = "human" ]; then
  G=$'\033[32m'; Y=$'\033[33m'; DIM=$'\033[2m'; B=$'\033[1m'; Z=$'\033[0m'
else G=""; Y=""; DIM=""; B=""; Z=""; fi

ok=0; todo=0; skipped=0
[ "$MODE" = "human" ] && printf "%sUp 4evr — Linux settings check%s\n\n" "$B" "$Z"

for rec in "${SETTINGS[@]}"; do
  IFS="$US" read -r KEY LABEL CAT SUDO CHECK DESIRED APPLY REVERT <<< "$rec"
  enabled_var="SET_${KEY}"; enabled="${!enabled_var:-0}"
  if [ "$enabled" != "1" ]; then
    skipped=$((skipped+1))
    [ "$MODE" = "human" ] && printf "  %s[ -- ]%s %-42s %sdisabled in settings.conf%s\n" "$DIM" "$Z" "$LABEL" "$DIM" "$Z"
    continue
  fi
  cur="$(bash -c "$CHECK" 2>/dev/null)"
  if printf '%s' "$cur" | grep -Eq "$DESIRED"; then
    ok=$((ok+1))
    [ "$MODE" = "human" ] && printf "  %s[ OK ]%s %-42s %scurrent: %s%s\n" "$G" "$Z" "$LABEL" "$DIM" "${cur:-<empty>}" "$Z"
  else
    todo=$((todo+1))
    case "$MODE" in
      drift) echo "DRIFT ${KEY}" ;;
      *) printf "  %s[ !! ]%s %-42s %scurrent: %s  want: /%s/%s\n" "$Y" "$Z" "$LABEL" "$DIM" "${cur:-<empty>}" "$DESIRED" "$Z" ;;
    esac
  fi
done

if [ "$MODE" = "human" ]; then
  printf "\n%sSummary:%s %s%d OK%s · %s%d need change%s · %d disabled\n" \
    "$B" "$Z" "$G" "$ok" "$Z" "$Y" "$todo" "$Z" "$skipped"
  [ "$todo" -gt 0 ] && printf "Run %s./apply-settings.sh%s to apply the ones that need changing.\n" "$B" "$Z"
fi
[ "$todo" -eq 0 ]
