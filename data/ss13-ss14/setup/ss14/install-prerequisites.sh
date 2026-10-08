#!/usr/bin/env bash
set -euo pipefail
[[ $(uname -s) == Linux && $(uname -m) == x86_64 ]] || { echo 'Requires x86-64 Linux Mint/Ubuntu.'; exit 1; }
command -v apt-get >/dev/null || { echo 'Requires an apt-based distribution; install the listed packages manually on other systems.'; exit 1; }

sudo apt-get update
sudo apt-get install -y git curl unzip xz-utils python3 python3-venv python3-pip ca-certificates geany libgl1 libx11-6 libxcursor1 libxi6 libxrandr2 libxinerama1 libopenal1 libsdl2-2.0-0 libfontconfig1 libfreetype6
