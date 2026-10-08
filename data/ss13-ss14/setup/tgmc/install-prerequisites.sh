#!/usr/bin/env bash
set -euo pipefail
[[ $(uname -s) == Linux && $(uname -m) == x86_64 ]] || { echo 'Requires x86-64 Linux Mint/Ubuntu.'; exit 1; }
command -v apt-get >/dev/null || { echo 'Requires an apt-based distribution; install the listed packages manually on other systems.'; exit 1; }
sudo dpkg --add-architecture i386
sudo apt-get update
sudo apt-get install -y git curl unzip xz-utils python3 python3-venv python3-pip ca-certificates geany gcc-multilib libc6-i386 libstdc++6:i386 libcurl4:i386 libssl3:i386 libgl1 libx11-6 libxcursor1 libxi6 libxrandr2 libxinerama1
