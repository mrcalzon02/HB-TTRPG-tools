# Reacquire this laptop's collection

Snapshot: 7 October 2026, Linux Mint 22.3 x86-64.

Open acquisition-library.html for the searchable listing, or retain catalog.json
and catalog.tsv. Each entry includes status, source, direct download when known,
local path relative to the Data folder, recovery instructions and checksums when
recorded. ~/.local entries refer to the user's home folder on this laptop.

## Applications

Use the package name in each Mint/Ubuntu app entry with your target distribution's
package manager. Version numbers are observations, not a claim that those exact
versions remain in current repositories. Packages from local DEBs may need their
original vendor installer rather than apt. A source that could not be established
is explicitly blank/unrecorded. This is not a substitute OS backup.

Installed Flatpak app identifiers are in installed-flatpak-apps.json. Configure
Flatpak and Flathub, then use the individual catalog install command.

GitKraken: use the official Linux tarball/vendor OS installer. First-run account
and license choices are separate. Flare: download its official 1.15 AppImage and
mark executable. The saved original archives permit exact recovery even when
mutable vendor URLs change.

## Game data and media

DOS games need DOSBox; ScummVM adventure files must be added through ScummVM.
Quake shareware needs Quakespasm, which may still need installing. MAME archives
remain zipped and their expected names must be preserved; audit compatibility
with your installed core. Homebrew cartridge files need a matching emulator.
Refer to original source terms before redistributing files.

Books: obtain the EPUB from Project Gutenberg and use Foliate/Calibre.
Music: exact recorded file URLs and album sources are in the catalog, with source
license and MD5 notes. Holst's original FLAC is accompanied by a local MP3 copy.
Wikis: download the source .zim snapshot and open in Kiwix; use a newer filename
if the older snapshot is retired. The archived SRD folder keeps source licenses.

## Development and project recovery

Use the SS13–SS14 Development Setup bundles for fresh TGMC/StrongDMM and native
SS14 editor/server installations; they include all four maps. Upstream clones
alone do not restore locally converted or modified maps.

For other projects, clone the repository URL into a NEW directory. To restore a
saved Git bundle, first run `git bundle verify PATH.bundle`, then
`git clone PATH.bundle NEW-FOLDER`. Empty repository backups contain no commits.
Full SS14 source dependencies and Git history are separately archived under
Backups/SS14. TGMC history is under Backups/TGMC-upstream. Copy map-edit backups
and original maps as well as source bundles to the new system.

Local dated project files have no public source: copy the saved TAR and manifest
from Backups, check its SHA-256, and extract into a new folder. Browser-local
campaigns and sheets require a separate export; account passwords are not in
these archives. Source-code backups do not prove an application was built.

## Coverage and limitations

The catalog includes requested trip packages (even those still missing), current
package-owned desktop apps, all installed Flatpak apps, locally saved portable
tools, project archive manifests and individual media/game source records.
The full installed-system-packages snapshot includes dependencies. The manually
marked package list includes base OS components too; do not blindly install it
on another OS. Pre-existing app installation dates were not recorded.
Private photos/videos and account data are excluded. A pre-existing Civil War
Generals 2 download is listed with unrecorded provenance, not a fabricated link.
No installed GOG titles or movie downloads were found in the trip folders.
This catalog is not a complete scan of every arbitrary file outside those sources.
