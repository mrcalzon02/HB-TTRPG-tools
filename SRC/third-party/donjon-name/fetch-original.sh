#!/usr/bin/env bash
set -euo pipefail

BASE_URL="https://donjon.bin.sh/code/name"
DEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

fetch() {
  local name="$1"
  local url="$BASE_URL/$name"
  local out="$DEST_DIR/$name"
  echo "Fetching $url"
  curl --fail --location --silent --show-error "$url" --output "$out"
  echo "SHA-256: $(sha256sum "$out" | awk '{print $1}')  $name"
}

fetch "name_generator.js"
fetch "egyptian_set.js"

echo "Retrieved Donjon name-generator reference files. name_generator.js is described by Donjon as public domain; egyptian_set.js has separate source-data attribution. See LICENSE-NOTICE.md."
