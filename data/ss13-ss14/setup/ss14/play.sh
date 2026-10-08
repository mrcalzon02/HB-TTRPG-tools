#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "$0")/environment.sh"
map="$(map_name "${1:-vapor}")"
prototype="TGMC${map//_/}"
cd "$setup_root/project"
echo 'Wait for Ready, then run edit.sh to connect. Stop any other SS14 server first.'
exec dotnet run --project Content.Server --configuration Tools --no-build --no-restore -- --data-dir "$setup_root/server-data" --cvar net.bindto=127.0.0.1 --cvar net.port=1212 --cvar status.bind=127.0.0.1:1212 --cvar hub.advertise=false --cvar auth.mode=0 --cvar game.map="$prototype" --cvar game.defaultpreset=Sandbox --cvar game.lobbyenabled=false
