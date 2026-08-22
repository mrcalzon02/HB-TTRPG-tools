#!/usr/bin/env sh
set -eu

SOURCE_URL='https://donjon.bin.sh/code/dungeon/dungeon.pl'
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
OUTPUT="$SCRIPT_DIR/dungeon.pl"
TMP="$OUTPUT.tmp.$$"

cleanup() {
  rm -f "$TMP"
}
trap cleanup EXIT HUP INT TERM

if command -v curl >/dev/null 2>&1; then
  curl --fail --location --silent --show-error "$SOURCE_URL" --output "$TMP"
elif command -v wget >/dev/null 2>&1; then
  wget -qO "$TMP" "$SOURCE_URL"
else
  echo 'error: curl or wget is required to fetch the upstream reference' >&2
  exit 1
fi

if ! grep -q 'Random Dungeon Generator by drow' "$TMP"; then
  echo 'error: downloaded file does not contain the expected upstream attribution marker' >&2
  exit 1
fi

if ! grep -q 'Creative Commons Attribution-NonCommercial 3.0 Unported License' "$TMP"; then
  echo 'error: downloaded file does not contain the expected CC BY-NC 3.0 license marker' >&2
  exit 1
fi

mv "$TMP" "$OUTPUT"
trap - EXIT HUP INT TERM

echo "Saved upstream reference to: $OUTPUT"
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$OUTPUT"
elif command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "$OUTPUT"
else
  echo 'warning: no SHA-256 utility found; snapshot saved without printing a digest' >&2
fi
