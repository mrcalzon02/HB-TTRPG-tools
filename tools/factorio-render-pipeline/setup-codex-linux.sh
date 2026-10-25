#!/usr/bin/env bash
set -euo pipefail

# Factorio Render Pipeline: explicit local Codex bootstrap, no silent system install.
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MODULE="$ROOT/tools/factorio-render-pipeline"
STATE="$HOME/.cache/hb-ttrpg-tools/factorio-render-pipeline"
VENV="$STATE/venv"
ACTION="--check"
if [[ $# -gt 0 ]]; then ACTION="$1"; fi
BLENDER="$(command -v blender || true)"
if [[ -n "$(printenv BLENDER_BIN || true)" ]]; then BLENDER="$BLENDER_BIN"; fi

check_python() {
  command -v python3 >/dev/null 2>&1 || { echo "Python 3 is missing" >&2; return 1; }
  python3 -c 'import sys; assert sys.version_info >= (3,10), "Python 3.10+ required"; print("Python",sys.version)'
}
check_blender() {
  if [[ -z "$BLENDER" || ! -x "$BLENDER" ]]; then
    echo "Blender missing. Install vetted Blender 4.5 LTS or set BLENDER_BIN." >&2
    return 1
  fi
  "$BLENDER" --version | head -n 2
}
check_deps() {
  if [[ ! -x "$VENV/bin/python" ]]; then echo "No user image environment; run --setup." >&2; return 1; fi
  "$VENV/bin/python" -c 'import PIL, yaml; print("Image Python dependencies: available")'
}
case "$ACTION" in
  --check)
    check_python
    check_blender
    check_deps
    echo "Environment preflight passed. No image render or Factorio test was run."
    ;;
  --setup)
    check_python
    mkdir -p "$STATE"
    python3 -m venv "$VENV"
    "$VENV/bin/python" -m pip install -r "$MODULE/requirements.txt"
    echo "Python dependencies installed to $VENV"
    check_blender || echo "Blender remains an external prerequisite; rerun --check after installation."
    ;;
  --install-blender-apt)
    if ! command -v apt-get >/dev/null 2>&1; then
      echo "Only Debian/Ubuntu apt-get is supported by this optional path." >&2
      exit 2
    fi
    echo "Explicit apt install requested; distro Blender may be older than 4.5 LTS."
    if [[ "$EUID" -eq 0 ]]; then apt-get update; apt-get install -y blender
    else
      command -v sudo >/dev/null 2>&1 || { echo "sudo unavailable." >&2; exit 2; }
      sudo apt-get update
      sudo apt-get install -y blender
    fi
    ;;
  *)
    echo "Usage: $0 [--check|--setup|--install-blender-apt]" >&2
    exit 2
    ;;
esac