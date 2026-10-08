# TGMC map editing environment — Linux x86-64

Extract the entire bundle, then open a terminal in this directory.
Supported prerequisite installer: Linux Mint 21/22, Ubuntu 22.04/24.04.
The prerequisite script uses sudo and apt, and TGMC enables i386 packages.
Other distributions require equivalent packages installed manually.

1. `bash install-prerequisites.sh` (only if prerequisites are missing).
2. `bash setup.sh --check-only` checks the bundle and basic tools without downloading.
3. `bash setup.sh "$HOME/HB-map-dev/tgmc"` downloads, verifies, installs and builds.
   The target must not exist. Choose a fresh target after an interrupted attempt;
   keep any edited work from that folder before removing it yourself.
4. Launch from the installed folder using the scripts below.

TGMC: `bash edit.sh tyson` opens StrongDMM on the map.
`bash server.sh tyson` builds and starts local BYOND hosting on 127.0.0.1:14000.
SS14: `bash server.sh`, then `bash edit.sh tyson` in a second terminal.
Enter the mapping command it prints in the client console. `bash play.sh tyson`
starts a Sandbox round instead of the mapping server. Never run both SS14 servers.
Available choices: `tyson`, `hamburg`, `ourang`, `vapor` (default).
`bash backup.sh` makes a dated archive of local map edits.

Downloads need dependable internet, several GiB of storage, and considerable
build time on older hardware. NuGet/npm/Python dependencies are fetched on the
initial build; packaged maps and upstream code are pinned. System and transitive
package resolution is not a completely locked offline dependency mirror.
The TGMC Linux bundle includes map editing and server hosting, not the Windows
BYOND player/Wine installation. Use an existing BYOND player for gameplay.
SS14 includes both native server and client/editor builds.
Start with Vapor or Ourang; Hamburg is large. Keep only one map open.

These new installers are syntax/integrity checked and use the versions of the
working local environments; a fresh complete installation on another computer
has not been tested. Existing environments passed the validation described in
the HB-TTRPG SS13–SS14 documentation. The SS14 ports are Sandbox layouts:
mission systems and full engineering networks still need adaptation.

The setup does not register desktop menus or publish anything. Open scripts from
the installed folder. Keep original maps and edits backed up. See PROVENANCE.md.
