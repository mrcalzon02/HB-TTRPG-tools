# Simple Sound Manager 0.10.1 — Opt-in waveform sampling and Windows installer

**Status: automated tests and artifact checks are required before publishing. Manual Windows installation, extended hardware load testing, and antivirus re-scanning remain unverified.**

## Waveform sampling off by default

- All **input and output waveforms are off by default**. This prevents unnecessary waveform history creation and per-block sampling, not merely the rendering of a hidden graph.
- On first launch after upgrading, devices that had Waveform automatically enabled by old defaults are reset to off once. Afterwards, users can enable selected Waveforms and those explicit preferences are retained.
- Toggling Waveform on creates a fresh three-second, memory-only history; toggling it off discards that history and any frozen snapshot immediately. No playback stream is restarted, and output routing, EQ, microphone Listen and Meter remain independent.
- Microphones still require a separate explicit Listen or Meter action to open their capture stream. Simply enabling Waveform does not open microphones.
- Regression tests cover new defaults, legacy preference migration and real worker-level sampling toggles for both kinds of device. System-specific performance improvements remain to be measured.

## Antivirus detection and what changed

On October 23, 2026, Avast quarantined `SimpleSoundManagerLauncher.exe` from the extracted Windows release with the generic detection `Win64:MalwareX-gen [Trj]`. The file was specifically the launcher at `SimpleSoundManager/dist/launcher/SimpleSoundManagerLauncher.exe`, which had been bundled using PyInstaller `--onefile`; it was **not** the actual audio application and was **not** the updater script. The alert does not independently establish that malware was present or that the updater executed. Self-extracting, low-reputation Python executables can attract heuristic antivirus detections, so PyInstaller's one-file launcher is a plausible trigger, not a confirmed root cause.

To reduce this packaging risk, the Windows release now builds its small stable launcher as a conventional C#/.NET Framework executable instead of using PyInstaller one-file, and adds a standard Inno Setup `Setup.exe` installer with Windows Installed Apps uninstall support. The main sound-processing application remains Python-based and packaged in PyInstaller **onedir** format. Existing settings, versioned installation directories, taskbar identity, and app features are intended to remain unchanged.

## Updates and compatibility

New Windows update checks prefer the GitHub-published `SimpleSoundManager-0.10.1-Setup.exe`, validating its published SHA-256 checksum and downloading it without executing it. Installation still requires the separate **Install and restart** action. Older ZIP-only releases remain supported by the existing updater. Linux source-based installation is unchanged.

This packaging change is **not** a claim that Avast or other antivirus products have approved the new binaries. Windows compilation, installer installation/uninstallation, update handoff, and antivirus checks must be completed before claiming a verified release.

**For GitHub publication:** Use the contents of this document as the release description, with validation status updated to reflect actual tests; include `Setup.exe`, both ZIP assets, and `SHA256SUMS.txt`.
