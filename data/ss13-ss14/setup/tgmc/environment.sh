#!/usr/bin/env bash
setup_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
export PATH="$setup_root/tools/byond/bin:$setup_root/tools/node-v22.11.0-linux-x64/bin:$setup_root/tools:$PATH"
export LD_LIBRARY_PATH="$setup_root/tools/byond/bin${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
export COREPACK_HOME="$setup_root/tools/corepack"
export npm_config_cache="$setup_root/tools/npm-cache"
map_name() {
 case "${1:-vapor}" in
 tyson) echo Tyson_Station;; hamburg) echo Port_Hamburg;; ourang) echo SS_Ourang_Medan;; vapor) echo Vapor_Processing;; *) echo 'Choose tyson, hamburg, ourang or vapor.' >&2; return 2;;
 esac
}
