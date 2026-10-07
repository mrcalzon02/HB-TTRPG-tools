#!/usr/bin/env bash
set -euo pipefail
app_pid="$1"
package_root="$2"
log_path="$3"
for ((attempt=0; attempt<120; attempt++)); do
    if ! kill -0 "$app_pid" 2>/dev/null; then break; fi
    sleep 1
done
if kill -0 "$app_pid" 2>/dev/null; then
    printf 'Update cancelled: the app did not finish closing.\n' >> "$log_path"
    exit 1
fi
bash "$package_root/install-linux.sh" >> "$log_path" 2>&1
"$HOME/.local/bin/simple-sound-manager" >> "$log_path" 2>&1 &
