#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "$0")/environment.sh"
map="$(map_name "${1:-vapor}")"
cd "$setup_root/project"
exec "$setup_root/tools/StrongDMM/StrongDMM" "$setup_root/project/tgmc.dme" "$setup_root/project/_maps/map_files/$map/$map.dmm"
