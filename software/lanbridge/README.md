# LANBridge v0.2 — Windows and Linux storage utility

[Download LANBridge v0.2](LANBridge-v0.2-Windows-Linux.zip) · [Software catalog](../../software.html#lanbridge)

LANBridge is a lightweight program for copying files and folders between Windows 10, Windows 11 and Linux computers by direct LAN IP address. It provides a GUI, terminal commands, a persistent background host configuration, timestamped backup snapshots, and an optional Windows SMB drive-mapping assistant.

## Getting started

1. Download and extract the ZIP on each participating computer.
2. Install Python 3.10 or newer and install the requirements listed in the ZIP's `requirements.txt`.
3. On the Windows 10 storage machine, run `Run-Windows-BackupHost-Setup.bat` as administrator. Use a dedicated backup directory and an approved local client network. Save the generated access key and certificate fingerprint securely.
4. On the Windows 11 computer, use `Run-Windows.bat` (GUI) or `Run-Windows-CLI.bat` (terminal). Enter the Windows 10 machine's IPv4 address and saved connection details.
5. The ZIP includes `QUICKSTART.txt`, complete `README.md`, tests, Linux scripts, and a build workflow.

Linux entry point: `./run-linux.sh --help`. Use `./run-linux.sh service install` after configuration for a per-user systemd background service.

**For drive letters:** use the separate native Windows SMB assistant. LANBridge's own encrypted protocol supports transfer/backup operations, but does not mount a filesystem.

## Release and safety status

- v0.2 is a **development source distribution**; it is not a prebuilt EXE installer.
- The package was tested on Linux, including protocol tests and a separate background host transfer. Native Windows service setup, Windows SMB operations and Windows executables have not yet been validated on actual Windows installations.
- No public-internet exposure: bind to trusted local networks and restrict Windows/Linux firewall rules. Do not forward port 8537 or Windows SMB port 445 on the router.
- Protected backup snapshots disallow ordinary remote overwrite, but this is not a substitute for offline/immutable backups.
- Windows 10 storage hosts should remain restricted, with applicable security updates and isolated directories.
- Install from a permanent directory before configuring an OS service. Do not run service files from Downloads.

**Published source ZIP SHA-256:** `af8d9c9eaf544532e78beddacbeb6b33877a7df3c2b7500de2798f3d2ec90f71`

This is an experimental in-repository software distribution. It is not represented as a separately tagged GitHub Release, and the site's live catalog lists only independently tracked GitHub repositories.
