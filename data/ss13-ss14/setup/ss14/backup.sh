#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "$0")/environment.sh"
mkdir -p "$setup_root/backups"
archive="$setup_root/backups/maps-$(date +%Y-%m-%d_%H-%M-%S)-$$.tar.gz"
tar -czf "$archive" -C "$setup_root" project/Resources/Maps/TGMC project/Resources/Prototypes/Maps/tgmc-local.yml server-data
sha256sum "$archive" > "$archive.sha256"
echo "$archive"
