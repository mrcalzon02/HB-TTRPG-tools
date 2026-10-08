#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "$0")/common.sh"
if [[ ${1:-} == --help ]]; then echo 'Usage: bash setup.sh [NEW-install-folder] | --check-only'; exit; fi
check_bundle
check_base
if [[ ${1:-} == --check-only ]]; then echo 'Bundle and base prerequisites checked. No installation performed.'; exit; fi
new_root "${1:-}"
fetch "https://builds.dotnet.microsoft.com/dotnet/Sdk/10.0.401/dotnet-sdk-10.0.401-linux-x64.tar.gz" "$install_root/downloads/dotnet-sdk.tar.gz" "51c8b999af9e8dd9998c9edc5944e19a90788862068acd38694e098889054ce8c23d4f0c5cccfa16bf187d044562359e5ee69a9f8ad0bbe913ba90311fbce25b" 512
mkdir -p "$install_root/tools/dotnet"
tar -xzf "$install_root/downloads/dotnet-sdk.tar.gz" -C "$install_root/tools/dotnet"
git clone https://github.com/space-wizards/space-station-14.git "$install_root/project"
git -C "$install_root/project" checkout --detach 07c0caa76bf941d2a5ed53b827c0bc25f16eb162
git -C "$install_root/project" submodule update --init --recursive
cp -a "$bundle_dir/payload/." "$install_root/project/"
cp "$bundle_dir/"{environment,build,edit,server,play,backup}.sh "$install_root/"
chmod +x "$install_root/"*.sh
source "$install_root/environment.sh"
(cd "$install_root/project" && python3 RUN_THIS.py)
"$install_root/build.sh"
echo "Installed native SS14 tools in: $install_root"
echo 'Start server.sh, then edit.sh [tyson|hamburg|ourang|vapor] in another terminal.'
