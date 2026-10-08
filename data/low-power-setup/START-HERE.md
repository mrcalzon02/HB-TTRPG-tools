# Low power system setup archive

Prepared 7 October 2026 for the HB-TTRPG library.

## What this archive contains

A 501-entry source/reinstall catalog, recorded installed Linux package and
Flatpak app inventories, recovery guidance, and the two complete Linux map
editing setup bundles for TGMC/StrongDMM and native SS14. The setup bundles
include all four maps and download/install/build/launch scripts.

The archive does not contain every application binary, game download, music
track, book, OS image, or full project-history backup. Use the catalog's source
links to acquire those again, or copy the original Juneau-Kit and Backups folders
from your own backup drive. An empty source field means no public source was
recorded; it must not be replaced with a guessed download link.

## Hardware and scope

The original system is Linux Mint 22.3 x86-64, on an Acer Aspire 7740 with an
Intel Core i5 M430, approximately 4 GB RAM and Radeon HD 5650 graphics.
The setup records working choices for that machine; performance on another
machine still needs testing. Package commands target Mint/Ubuntu. Other OSes
need their own packages or vendor builds. The map setup bundles target x86-64
Linux, with prerequisite scripts for Mint 21/22 and Ubuntu 22.04/24.04.

## Rebuild in stages

1. Start with a supported OS appropriate to your machine. Apply its updates and
   confirm display, audio, Wi-Fi and file transfer work before collecting games.
2. Open catalog.tsv in a spreadsheet or use catalog.json. Pick the apps you
   actually want. Install Mint/Ubuntu apps by their listed package names;
   install Flatpak apps by their exact identifiers. Do not apply the full
   system-package snapshot wholesale to another OS.
3. Add a reader, media player and file/backup tools from the catalog. Keep
   passwords and personal data in your own separately backed-up storage.
4. Add game engines and selected game data separately. DOSBox and ScummVM need
   game files; cartridge games need matching emulator cores. MAME ROM ZIP names
   must remain unchanged and compatibility must be audited against the core.
   The catalog separates installed, downloaded and prepared-but-missing items.
5. Copy/download books, music and Kiwix ZIM references. Preserve source credits,
   licenses and checksums. Browser campaigns/sheets need separate exports.
6. For map development, extract the appropriate setup bundle, read README.md,
   install prerequisites, run setup.sh --check-only, then setup.sh NEW-FOLDER.
   Existing destination folders are refused to protect working maps.
7. Test the selected apps and games while online, then try your intended offline
   workflow with networking disconnected. Confirm any account-based downloads
   or licenses work as expected on the new machine.
8. Copy your finished working files and dated map backups to a separate device.
   Files on the same laptop do not protect against loss of that laptop.

## Keep the workload modest

Run one demanding app or game at a time and close large browser sessions.
Use modest OpenTTD worlds. Test 3D games individually rather than assuming the
installed package proves playable performance. Prefer the collection's smaller
DOS, puzzle and homebrew games for a quick first test.

SS14 builds are sequential with limited concurrency. The native editor launcher
caps the client at 30 FPS. Edit maps paused and keep only one large map loaded.
Start map checks with Vapor or Ourang; Hamburg has roughly 37,000 objects and
is the most demanding. TGMC and SS14 local host launchers are loopback-only.

The trip's storage target was 45% of total drive usage. It is a planning target,
not a requirement to fill unused space or reserve a fixed amount on another
machine. Avoid duplicate collections; leave space for updates, build caches,
swap and working files. A complete library backup can be much larger than this
small setup-record archive.

## Validation limits

The existing TGMC and SS14 environments passed their documented native checks.
The downloadable fresh-install scripts passed syntax, payload/integrity and
launcher checks, but a fresh complete installation on another machine has not
been tested. Gameplay, all machine interfaces and complete multiplayer missions
were not manually verified. SS14 ports are Sandbox layouts; TGMC-specific
missions and full engineering networks still need adaptation.

Recorded versions and URLs can age. Some download URLs point to mutable vendor
releases. Exact historical package versions may no longer be available. Keep
original installers, source snapshots and verified backups for exact recovery.

## Archive layout

- catalog/: source catalog, TSV/JSON inventories and REINSTALL.md.
- setup-bundles/tgmc-map-dev-linux.tar.gz: TGMC editor/server setup and maps.
- setup-bundles/ss14-map-dev-linux.tar.gz: native SS14 editor/server setup and maps.
- setup-bundles/*.sha256: checksums for those bundles.
- START-HERE.md: this guide.

Open the HB-TTRPG Low power system setup archive tab for the searchable catalog,
conversion documentation and updated download links.
