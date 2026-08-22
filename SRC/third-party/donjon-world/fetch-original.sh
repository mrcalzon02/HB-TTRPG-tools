#!/usr/bin/env bash
set -euo pipefail

BASE_URL="https://donjon.bin.sh/code/world"
DEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

fetch() {
  local name="$1"
  local url="$BASE_URL/$name"
  local out="$DEST_DIR/$name"
  echo "Fetching $url"
  curl --fail --location --silent --show-error "$url" --output "$out"
  echo "SHA-256: $(sha256sum "$out" | awk '{print $1}')  $name"
}

fetch "worldgen-2.2.c"
fetch "worldgen-2.2a.c"

echo "Retrieved Donjon-hosted worldgen sources. Preserve LICENSE-NOTICE.md and upstream GPL notices with any retained copy."
