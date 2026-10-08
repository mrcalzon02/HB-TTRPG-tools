#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "$0")/environment.sh"
map="$(map_name "${1:-vapor}")"
echo "Start server.sh first. In the client console enter: mapping 1000 Maps/TGMC/$map.yml false"
echo 'F5: entities; F6: tiles; F7: admin tools. Save: savemap 1000 my-map-edited.yml'
cd "$setup_root/project"
exec dotnet run --project Content.Client --configuration Tools --no-build --no-restore -- --username Mapper --connect --connect-address 127.0.0.1:1212 --cvar display.vsync=false --cvar display.max_fps=30 --cvar discord.enabled=false
