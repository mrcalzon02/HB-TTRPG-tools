# Low power setup archive — Windows alternative

This is a separate Windows configuration, not a conversion of Linux package
names into Windows executables. Targets x64 Windows with Windows PowerShell 5.1+
and WinGet (Microsoft App Installer). Use a Windows version supported for your
machine; this bundle does not install an OS or bypass hardware requirements.
The original i5 M430 laptop does not establish Windows 11 compatibility.

## Open the downloaded bundle

Extract the ZIP into a new folder. Keep all files, payload directories, checksum
records and catalog together. Review scripts before running. If Windows marks
the downloaded scripts as blocked, use each file's Properties > Unblock after
reviewing it. Use a normal PowerShell terminal for installations/builds/editors.
System application installers can request elevation or license acceptance.
No script changes the machine's execution-policy setting or autoaccepts licenses.
If your policy blocks local unsigned scripts, consult your system administrator;
this bundle does not bypass that policy.

## Choose applications

```powershell
.\Install-Applications.ps1 -Profile Essentials -WhatIf
.\Install-Applications.ps1 -Profile Essentials
.\Install-Applications.ps1 -Profile Utilities
.\Install-Applications.ps1 -Profile Retro
.\Install-Applications.ps1 -Profile Emulators
```

Essentials: 7-Zip, VLC, Calibre, KeePassXC.
Utilities: Firefox, LibreOffice, Audacity, HandBrake, WinMerge.
Retro: DOSBox Staging, ScummVM, OpenTTD, Battle for Wesnoth.
Emulators: RetroArch and PPSSPP. Other emulator/vendor Windows source links are
in windows-equivalents.json. Core availability and game data are separate.
GitKraken, FileZilla, Kiwix, mGBA, DuckStation, Flycast and Simple Sound Manager
use official Windows downloads in that file. MiniGalaxy is replaced by GOG's
Windows client or direct owned-library downloads.

These profiles select part of the source catalog. They are optional, not a claim
that every item is necessary or installed. WinGet IDs were checked against the
Microsoft community manifest repository. Version selection follows that remote
at installation time; portable development tool versions are pinned separately.
If a package cannot be found, use the official source rather than a guessed ID.

## Game data, books, music and references

Copy your existing Juneau-Kit content folders or use the source catalog under
catalog/. The native files remain usable across OSes. To preview/reacquire one
category without overwriting existing files:

```powershell
.\Download-Library.ps1 -Category Books -WhatIf
.\Download-Library.ps1 -Category Books
.\Download-Library.ps1 -Category 'Games — DOS and adventures' -WhatIf
```

Choose Books, Music, Games — DOS and adventures, Games — homebrew ROMs,
Games — MAME, or Offline references. This can download large collections;
preview first. Files without direct source URLs are reported for manual download.
Checksums are verified when recorded. Existing files are left untouched.
Holst's original FLAC requires its Wikimedia source visit or copying your saved
file. Music rights/credits remain source-specific. ZIPs are not auto-extracted.
Keep MAME ROM archives zipped; extract DOS and ScummVM data as appropriate.
Add game folders in ScummVM and mount a selected DOS folder in DOSBox Staging.
Quake shareware needs a Windows Quakespasm build from its official project.
Game launch settings and playability require a check on the target machine.

## HB-TTRPG offline website on Windows

Copy HB-TTRPG-offline from your backup, or clone the source with Git for Windows.
After Python is installed, replace the Linux shell server launcher with:

```powershell
.\Start-OfflineSite.ps1 -SitePath 'C:\HB-library\HB-TTRPG-offline'
```

Open the printed localhost URL and keep the terminal open. Ctrl+C stops it.
Only localhost is bound. Export/import browser-local campaigns separately;
external services and online account links still require internet.

## Development prerequisites

```powershell
.\Install-Applications.ps1 -Profile Development
```

This installs Git for Windows, Python 3.12, and the Microsoft VC++ x86/x64
runtimes through WinGet. Reopen PowerShell so updated PATH entries are available.
Portable BYOND, StrongDMM, Node, rust-g and .NET are downloaded by the following
installers with recorded checksums. Each destination must be a NEW folder. Prefer a short path (for example
C:\HB-map-dev\ss14) if long path names cause Windows tool problems. The setup
enables Git long-path handling only inside its new source checkout.

## TGMC / StrongDMM and native BYOND client

```powershell
.\Install-TGMC.ps1 -CheckOnly
.\Install-TGMC.ps1 -Destination "$env:USERPROFILE\HB-map-dev\tgmc-windows"
cd "$env:USERPROFILE\HB-map-dev\tgmc-windows"
.\Edit-TGMC.ps1 -Map vapor
```

The installer clones the pinned main TGMC source, restores all four map payloads,
installs matching portable tools and builds tgui/game content. Map choices are
vapor, ourang, tyson and hamburg. No Linux Wine prefix or ELF library is copied.
Build again with Build-TGMC.ps1 and make dated ZIP backups with Backup-Maps.ps1.

For private local hosting, run this once from an Administrator PowerShell:

```powershell
cd "$env:USERPROFILE\HB-map-dev\tgmc-windows"
.\Protect-TGMC-Host.ps1
```

It requires enabled Windows Firewall profiles and creates an application-scoped
inbound block rule for non-loopback addresses. It does not create an allow rule,
change global firewall settings, or configure router ports. The Windows server
uses firewall confinement rather than the Linux bind interposer. Its private
connection behavior still needs a real Windows network test.

Then return to a normal PowerShell:

```powershell
.\Server-TGMC.ps1 -Map vapor
.\Client-TGMC.ps1
```

Use a second terminal for the client. The game address is
byond://127.0.0.1:14000. Close DreamDaemon to stop hosting. The protection rule
persists for this installed executable; inspect it with Windows Firewall if the
folder is moved or you plan a different hosting policy. Do not grant a broad
inbound allow rule when a Windows networking prompt appears.

## SS14 native mapping and Sandbox play

```powershell
.\Install-SS14.ps1 -CheckOnly
.\Install-SS14.ps1 -Destination "$env:USERPROFILE\HB-map-dev\ss14-windows"
cd "$env:USERPROFILE\HB-map-dev\ss14-windows"
.\Server-SS14.ps1
```

Wait for Ready. In a second normal terminal in the installed folder:

```powershell
.\Edit-SS14.ps1 -Map vapor
```

The client prints the mapping command. Enter it in the game console (backtick):

```text
mapping 1000 Maps/TGMC/Vapor_Processing.yml false
savemap 1000 my-map-edited.yml
```

F5 entities, F6 tiles, F7 admin tools. Saves are under server-data. Keep edits
paused and save under a new filename. For joining a Sandbox round instead,
stop the mapping server and use Server-SS14.ps1 -Map vapor -Play, then connect
with Edit-SS14.ps1. Both host modes bind directly to 127.0.0.1:1212; run one
server at a time. Backup-Maps.ps1 backs up generated maps/prototypes and saves.
The native .NET SDK is portable and builds are sequential/limited to reduce load.

## Low-power behavior and recovery

Keep the laptop plugged in for long builds; check cooling. Close large browser
sessions and run one demanding task at a time. The SS14 client caps at 30 FPS.
Use paused mapping, start with Vapor/Ourang and keep one map loaded; Hamburg
has roughly 37,000 objects. Leave disk room for updates/build caches and use
45% total drive usage as a planning target, not a requirement to fill the drive.
No registry tweaks, service removals or global security changes are performed.

Keep Juneau-Kit and Backups copies on a separate drive. Source-code histories
need their own Git bundles; this configuration carries map payloads and source
records, not all original games/media, account data or every project history.
Browser-saved sheets/campaigns require their own export. Existing destination
folders and downloads are not overwritten. Retry interrupted installations in
a new destination after preserving any working edits from the failed folder.

## Validation and limitations

PowerShell syntax, bundle/payload hashes, package IDs and helper behavior are
checked from Linux using official PowerShell. These Windows installers, native
GUI programs, WinGet installations, local-host firewall behavior and full builds
have NOT been run end-to-end on a real Windows machine. The source versions and
map payloads match the previously validated Linux workspaces. SS14 ports are
Sandbox layouts; TGMC missions, engineering networks and complete gameplay need
adaptation/playtesting. No Windows installation state is inferred from Linux.

Sources: Microsoft WinGet docs; official .NET Windows release metadata; BYOND
516.1659 archive; StrongDMM v2.18.0.alpha; Node 22.11.0 official checksum listing;
rust-g 3.11.0 release. Original source notices are under licenses/.
