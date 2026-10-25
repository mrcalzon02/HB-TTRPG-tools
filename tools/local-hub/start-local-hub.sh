#!/usr/bin/env bash
# Start the desktop window; all server threads remain owned by this process.
set -euo pipefail
here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
data_home="${XDG_DATA_HOME:-$HOME/.local/share}"
python="${data_home}/hb-ttrpg-tools/desktop-venv/bin/python"
if [[ ! -x "$python" ]]; then
  printf 'HB-TTRPG desktop environment missing. Run: bash "%s/install-linux.sh"\n' "$here" >&2
  exit 1
fi
exec "$python" "$here/desktop.py" "$@"
