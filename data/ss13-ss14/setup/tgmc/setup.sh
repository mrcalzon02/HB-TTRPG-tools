#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "$0")/common.sh"
if [[ ${1:-} == --help ]]; then echo 'Usage: bash setup.sh [NEW-install-folder] | --check-only'; exit; fi
check_bundle
check_base
command -v gcc >/dev/null || fail 'Run install-prerequisites.sh to install the 32-bit build tools.'
if [[ ${1:-} == --check-only ]]; then echo 'Bundle and base prerequisites checked. No installation performed.'; exit; fi
new_root "${1:-}"
fetch "https://www.byond.com/download/build/516/516.1659_byond_linux.zip" "$install_root/downloads/byond.zip" "8e65eb7063a0fdf0091f60599d0020f0c3a936e93b17441869c897d85ec6a1cd"
fetch "https://github.com/SpaiR/StrongDMM/releases/download/v2.18.0.alpha/strongdmm-linux.zip" "$install_root/downloads/strongdmm.zip" "111e6ca1637bafae69384a67ce26798c0f296068da797e5feabc0c55709f6605"
fetch "https://nodejs.org/dist/v22.11.0/node-v22.11.0-linux-x64.tar.xz" "$install_root/downloads/node.tar.xz" "83bf07dd343002a26211cf1fcd46a9d9534219aad42ee02847816940bf610a72"
fetch "https://github.com/tgstation/rust-g/releases/download/3.11.0/librust_g.so" "$install_root/downloads/librust_g.so" "841c139a760a57fd999483fc49da45967b6c5c8a1050465f103322f7f1bb51f4"
fetch "https://github.com/SpaceManiac/SpacemanDMM/releases/download/suite-1.11/dm-langserver" "$install_root/downloads/dm-langserver" "c0c441199fac7a197b3dfcd243704c629c1ed6b7bea4d4b4db73619e754a9197"
fetch "https://github.com/SpaceManiac/SpacemanDMM/releases/download/suite-1.11/dmdoc" "$install_root/downloads/dmdoc" "27c10207221b695baa1a00e0a7870bcfb80e5f362340b5d475b224d9182f4c35"
fetch "https://github.com/SpaceManiac/SpacemanDMM/releases/download/suite-1.11/dmm-tools" "$install_root/downloads/dmm-tools" "e6340e1ec0d9b8a781b3617be6192b45d17bedecc540865219ac26443337a24b"
fetch "https://github.com/SpaceManiac/SpacemanDMM/releases/download/suite-1.11/dreamchecker" "$install_root/downloads/dreamchecker" "1d31563287d1fa0f5c4f5744cdf74f97b5d3abc4911a81e3c94ce01a56f5a0d0"
unzip -q "$install_root/downloads/byond.zip" -d "$install_root/tools"
mkdir -p "$install_root/tools/StrongDMM"
unzip -q "$install_root/downloads/strongdmm.zip" -d "$install_root/tools/StrongDMM"
tar -xJf "$install_root/downloads/node.tar.xz" -C "$install_root/tools"
for tool in dm-langserver dmdoc dmm-tools dreamchecker; do
    cp "$install_root/downloads/$tool" "$install_root/tools/$tool"
    chmod +x "$install_root/tools/$tool"
done
chmod +x "$install_root/tools/StrongDMM/StrongDMM" "$install_root/tools/byond/bin/"*
export PATH="$install_root/tools/node-v22.11.0-linux-x64/bin:$install_root/tools/byond/bin:$PATH"
export LD_LIBRARY_PATH="$install_root/tools/byond/bin${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
git clone https://github.com/tgstation/TerraGov-Marine-Corps.git "$install_root/project"
git -C "$install_root/project" checkout --detach d17228095d2bbc94359acaf7421119a60c672261
git -C "$install_root/project" submodule update --init --recursive
cp -a "$bundle_dir/payload/." "$install_root/project/"
cp "$install_root/downloads/librust_g.so" "$install_root/project/librust_g.so"
gcc -m32 -shared -fPIC -nostdlib "$bundle_dir/loopback-bind.c" -o "$install_root/tools/loopback-bind.so"
python3 -m venv "$install_root/tools/python"
"$install_root/tools/python/bin/pip" install bidict==0.23.1 Pillow==10.4.0
cp "$bundle_dir/"{environment,build,edit,server,backup}.sh "$install_root/"
chmod +x "$install_root/"*.sh
"$install_root/build.sh"
echo "Installed TGMC mapping tools in: $install_root"
echo 'Run edit.sh [tyson|hamburg|ourang|vapor], or server.sh [map].'
