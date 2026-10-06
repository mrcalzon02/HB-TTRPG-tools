#!/usr/bin/env bash
set -euo pipefail
source_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
for tool in python3 pactl; do
    if ! command -v "$tool" >/dev/null 2>&1; then
        echo "Missing $tool. Install Python 3, python3-venv, and your distribution's PulseAudio client tools."
        exit 1
    fi
done
# Validate the user's running audio server before installing.
pactl info >/dev/null
install_dir="${XDG_DATA_HOME:-$HOME/.local/share}/simple-sound-manager"
mkdir -p "$install_dir/sound_manager" "$install_dir/tests"
cp "$source_dir/run.py" "$source_dir/requirements.txt" "$source_dir/README.md" "$source_dir/LICENSE" "$source_dir/THIRD-PARTY-NOTICES.md" "$install_dir/"
cp "$source_dir"/sound_manager/*.py "$install_dir/sound_manager/"
cp "$source_dir"/tests/*.py "$install_dir/tests/"
python3 -m venv "$install_dir/.venv"
"$install_dir/.venv/bin/python" -m pip install -r "$install_dir/requirements.txt"
(cd "$install_dir" && .venv/bin/python -m unittest discover -s tests)
mkdir -p "$HOME/.local/bin" "${XDG_DATA_HOME:-$HOME/.local/share}/applications"
launcher="$HOME/.local/bin/simple-sound-manager"
printf '#!/usr/bin/env bash\nexec %q %q "$@"\n' "$install_dir/.venv/bin/python" "$install_dir/run.py" > "$launcher"
chmod +x "$launcher"
desktop_file="${XDG_DATA_HOME:-$HOME/.local/share}/applications/simple-sound-manager.desktop"
# Desktop Exec uses double-quoted paths (unlike shell quoting).
escaped_launcher="${launcher//\\/\\\\}"
escaped_launcher="${escaped_launcher//\"/\\\"}"
escaped_launcher="${escaped_launcher//\$/\\\$}"
escaped_launcher="${escaped_launcher//\`/\\\`}"
escaped_launcher="${escaped_launcher//%/%%}"
printf '[Desktop Entry]\nType=Application\nName=Simple Sound Manager\nComment=Outputs, inputs, and per-output EQ\nExec="%s"\nIcon=audio-volume-high\nTerminal=false\nCategories=AudioVideo;Audio;Mixer;\n' "$escaped_launcher" > "$desktop_file"
echo "Installed. Open Simple Sound Manager from your applications menu."
