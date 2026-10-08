#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "$0")/environment.sh"
mkdir -p "$setup_root/backups"
archive="$setup_root/backups/maps-$(date +%Y-%m-%d_%H-%M-%S)-$$.tar.gz"
tar -czf "$archive" -C "$setup_root" project/_maps project/code/game/objects/machinery/doors/airlock.dm project/config/dev_overrides.txt
sha256sum "$archive" > "$archive.sha256"
echo "$archive"
