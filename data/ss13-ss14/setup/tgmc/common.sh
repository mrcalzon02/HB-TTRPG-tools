#!/usr/bin/env bash
set -euo pipefail
bundle_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
fail() { echo "ERROR: $*" >&2; exit 1; }
fetch() {
    local url="$1" file="$2" hash="$3" algorithm="${4:-256}"
    if [[ ! -f "$file" ]]; then
        curl --fail --location --retry 3 --proto '=https' "$url" -o "$file.partial"
        mv -- "$file.partial" "$file"
    fi
    printf '%s  %s\n' "$hash" "$file" | "sha${algorithm}sum" --check --status || fail "Checksum mismatch: $file"
}
check_bundle() { (cd "$bundle_dir" && sha256sum --check SHA256SUMS); }
check_base() {
    [[ $(uname -s) == Linux && $(uname -m) == x86_64 ]] || fail 'These installers support x86-64 Linux only.'
    for tool in git curl tar unzip python3 sha256sum sha512sum; do command -v "$tool" >/dev/null || fail "Missing $tool; run install-prerequisites.sh first."; done
}
new_root() {
    install_root="${1:-$HOME/HB-map-dev/tgmc}"
    [[ ! -e "$install_root" ]] || fail "Destination already exists: $install_root. Choose a NEW folder; existing maps are never overwritten."
    mkdir -p -- "$install_root"
    install_root="$(cd -- "$install_root" && pwd)"
    mkdir -p "$install_root/downloads" "$install_root/tools" "$install_root/server-data"
}
