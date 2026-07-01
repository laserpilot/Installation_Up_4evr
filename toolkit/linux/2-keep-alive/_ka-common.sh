#!/bin/bash
# ============================================================================
#  Up 4evr — Linux keep-alive shared helpers  (sourced by the scripts)
# ============================================================================
UNIT_DIR="$HOME/.config/systemd/user"
PREFIX="up4evr-"                 # we only ever touch units with this prefix
mkdir -p "$UNIT_DIR" 2>/dev/null

if [ -t 1 ]; then G=$'\033[32m'; Y=$'\033[33m'; R=$'\033[31m'; DIM=$'\033[2m'; B=$'\033[1m'; Z=$'\033[0m'
else G=""; Y=""; R=""; DIM=""; B=""; Z=""; fi

# Turn a command/executable into a safe unit name suffix.
name_for() {
  local p="$1" base
  base="$(basename "$p")"; base="${base%.desktop}"
  base="$(printf '%s' "$base" | tr ' /' '__' | tr -cd '[:alnum:]_.-')"
  echo "${PREFIX}${base}"
}

managed_units() { ls "$UNIT_DIR/$PREFIX"*.service 2>/dev/null; }
