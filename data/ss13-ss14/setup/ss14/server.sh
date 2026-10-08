#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "$0")/environment.sh"
cd "$setup_root/project"
exec dotnet run --project Content.Server --configuration Tools --no-build --no-restore -- --data-dir "$setup_root/server-data" --cvar net.bindto=127.0.0.1 --cvar net.port=1212 --cvar status.bind=127.0.0.1:1212 --cvar hub.advertise=false --cvar auth.mode=0 --cvar game.map=TGMCMappingsDepot --cvar game.defaultpreset=Sandbox --cvar game.lobbyenabled=false
