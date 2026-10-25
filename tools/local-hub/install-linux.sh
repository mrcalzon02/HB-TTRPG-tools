#!/usr/bin/env bash
# Per-user Linux launcher for Ubuntu, Debian, Mint, and Fedora families.
set -euo pipefail
here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
data_home="${XDG_DATA_HOME:-$HOME/.local/share}"
appdir="$data_home/hb-ttrpg-tools"
venv="$appdir/desktop-venv"
applications="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
entry="$applications/hb-ttrpg-local-workbench.desktop"
id=""
like=""
if [[ -f /etc/os-release ]]; then
  # shellcheck disable=SC1091
  source /etc/os-release
  id="${ID:-}"
  like="${ID_LIKE:-}"
fi
family="unknown"
case " $id $like " in
  *ubuntu*|*debian*|*linuxmint*) family="debian" ;;
  *fedora*|*rhel*) family="fedora" ;;
esac

case "${1:-}" in
  --uninstall)
    rm -f -- "$entry"
    printf 'Removed the application menu entry; private files and environment are retained.\n'
    exit 0
    ;;
  --deps)
    case "$family" in
      debian)
        sudo apt-get update
        sudo apt-get install -y python3 python3-venv python3-pip python3-gi python3-gi-cairo \
          gir1.2-gtk-3.0 gir1.2-webkit2-4.1
        ;;
      fedora)
        sudo dnf install -y python3 python3-pip python3-gobject gtk3 webkit2gtk4.1
        ;;
      *)
        printf 'Unsupported distribution family. Install GTK3, PyGObject and WebKit2GTK 4.1 manually.\n' >&2
        exit 2
        ;;
    esac
    ;;
  "")
    ;;
  *)
    printf 'Usage: %s [--deps|--uninstall]\n' "$0" >&2
    exit 2
    ;;
esac

if ! command -v python3 >/dev/null 2>&1; then
  printf 'Python 3.10+ is required. On Ubuntu/Debian/Mint or Fedora, rerun with --deps.\n' >&2
  exit 1
fi
if ! python3 -c 'import sys; sys.exit(sys.version_info < (3,10))'; then
  printf 'Python 3.10+ is required; your distribution default is too old.\n' >&2
  exit 1
fi

# Using system site-packages exposes distro-provided gi/WebKit introspection
# without pip compiling PyGObject against missing native development headers.
mkdir -p -- "$appdir"
if [[ ! -x "$venv/bin/python" ]]; then
  python3 -m venv --system-site-packages "$venv" || {
    printf 'Cannot create venv. Install python3-venv with --deps.\n' >&2
    exit 1
  }
fi
"$venv/bin/python" -m pip install 'pywebview[gtk]>=5,<7'
if ! "$venv/bin/python" -c 'import gi; gi.require_version("Gtk","3.0"); from gi.repository import Gtk'; then
  printf 'GTK/PyGObject unavailable. Rerun installer with --deps.\n' >&2
  exit 1
fi
if ! "$venv/bin/python" -c 'import gi; gi.require_version("WebKit2","4.1"); from gi.repository import WebKit2'; then
  printf 'WebKit2GTK 4.1 unavailable. Rerun installer with --deps.\n' >&2
  exit 1
fi

# Desktop Entry quoting handles checkout paths containing spaces.
launcher="$here/start-local-hub.sh"
case "$launcher" in
  *\"*|*\`*|*\\*) printf 'Checkout path contains unsupported desktop-entry characters.\n' >&2; exit 2 ;;
esac
mkdir -p -- "$applications"
cat > "$entry" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=HB-TTRPG Local Workbench
Comment=Local Homebrew archive and private narration studio
Exec="$launcher"
Terminal=false
Categories=Utility;Education;
StartupNotify=true
EOF
chmod 644 "$entry"
printf 'Installed %s\n' "$entry"
printf 'Launch HB-TTRPG Local Workbench from your application menu. Closing it stops the server.\n'
