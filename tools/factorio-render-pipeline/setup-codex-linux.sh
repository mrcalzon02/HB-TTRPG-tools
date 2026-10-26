#!/usr/bin/env bash
set -euo pipefail
# Compatibility entrypoint. One canonical environment installer is bootstrap.py.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
case "${1:---check}" in
  --check|verify)
    exec python3 "$ROOT/bootstrap.py" verify
    ;;
  --setup|install)
    exec python3 "$ROOT/bootstrap.py" install
    ;;
  --install-blender-apt)
    echo "Use the managed, SHA-256-verified Blender setup instead:" >&2
    echo "  python3 tools/factorio-render-pipeline/bootstrap.py install" >&2
    exit 2
    ;;
  *)
    echo "Usage: $0 [--check|--setup]" >&2
    exit 2
    ;;
esac
