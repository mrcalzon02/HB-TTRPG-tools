#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "$0")/environment.sh"
map_name "${1:-vapor}" >/dev/null
case "${1:-vapor}" in
 tyson) slug=tyson_station;; hamburg) slug=port_hamburg;; ourang) slug=ss_ourang_medan;; vapor) slug=vapor_processing;;
esac
"$setup_root/build.sh"
cd "$setup_root/project"
mkdir -p data
cp "_maps/$slug.json" data/next_map.json
echo 'TGMC local server: byond://127.0.0.1:14000 — Ctrl+C to stop.'
export LD_PRELOAD="$setup_root/tools/loopback-bind.so"
exec DreamDaemon tgmc.dmb 14000 -invisible -trusted -console
