#!/usr/bin/env bash
setup_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
export DOTNET_ROOT="$setup_root/tools/dotnet"
export PATH="$DOTNET_ROOT:$PATH"
export DOTNET_CLI_HOME="$setup_root/tools/dotnet-home"
export NUGET_PACKAGES="$setup_root/tools/nuget-packages"
export DOTNET_CLI_TELEMETRY_OPTOUT=1
export DOTNET_NOLOGO=1
export DOTNET_PROCESSOR_COUNT=2
map_name() {
 case "${1:-vapor}" in
 tyson) echo Tyson_Station;; hamburg) echo Port_Hamburg;; ourang) echo SS_Ourang_Medan;; vapor) echo Vapor_Processing;; *) echo 'Choose tyson, hamburg, ourang or vapor.' >&2; return 2;;
 esac
}
