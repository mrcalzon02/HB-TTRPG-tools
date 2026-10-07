# Validation — October 6, 2026

Version 0.9.0: 112 automated checks passed. Backup checks cover validated snapshots, operational-state exclusion, exact-ID/unique-name mapping, ambiguous names, type and destination collisions, consistent remapping of current mix/scenes/display/backup outputs, skip/offline choices, non-mutating previews, malformed-file disabling, pre-restore copies and restart recovery of that copy, retained recovery records/mute guards, and microphone capture opt-in. Native volume/mute writes in UI tests were mocked. Live Linux remains unverified.

Version 0.8.0: 100 automated checks passed. Scenes tests cover deep audio snapshots, disconnected profiles, native levels, microphone capture opt-in, panic mute intent, malformed import rejection before settings mutation, operational-key exclusion, persisted tray entries, previous-mix recall, same-layout stream preservation, running-layout restart, stopped-state preservation and hardware-kind mismatch rejection. Native volume/mute mutations in integrated tests were mocked; live Linux remains unverified.

Version 0.7.0: 89 automated checks passed. New checks prove a frozen shared trace/levels remain unchanged while incoming samples change, hidden/frozen timers stay stopped, new EQ dialogs share the device's held view, reset clears real and frozen clip holds without changing shapes, unfreeze resumes rendering, and no-signal freeze does not capture microphones or save samples. Tests also verify the real Windows process identity and the installer's matching version-independent ID. A real shortcut property-store round trip passed; the running window and official Start Menu shortcut were independently read back with the same AppUserModelID. Previous update, timing, graphic EQ and second-process checks remain green.

Version 0.6.3: 84 automated checks passed, including a shown EQ dialog proving that Waveform on displays a running compact trace timer in EQ controls mode, Waveform off hides/stops it, and switching to Live waveform transfers rendering to the larger trace.

Version 0.6.2: 83 automated checks passed. Added integrated checks for independent persistent waveform switches without microphone capture, hidden display timers, saved advanced EQ/live-waveform display modes, waveform state in EQ dialogs, global bypass preserving profiles and each device's EQ flag, resetting all delays including disconnected devices without changing EQ, and actual second-process reopen requests without a tray icon. EQ dB-guide layouts were rendered and inspected. The 0.6.1 release/updater checks remain green.

Version 0.6.1: 77 automated checks passed, including delay visibility/persistence in compact view, numeric release ordering, unrelated/draft/prerelease filtering, platform asset selection, pagination, checksum fallback, verified download staging, cancellation, unsafe/duplicate/symlink ZIP rejection, and refusal to install after audio cleanup fails. Existing routing/DSP/launcher checks remain green. Real release-feed discovery and packaged Windows startup are checked during publication. Live Linux updater execution remains unverified.

Environment: Windows 11 x64, Python 3.14.5, SoundCard 0.4.6, PySide6 6.11.2, NumPy 2.5.3, SciPy 1.18.1, pycaw 20260927.

* 14 automated checks passed: flat EQ, state across streaming blocks, band response and stability, bypass, mute ramp, invalid gains, bounded queues, fanout and live selection changes, output failure isolation, startup failure cleanup, saved settings, Windows default restoration ownership, Linux null-sink setup, integrated window EQ/input controls, and driver setup restoration including microphone defaults.
* Real Windows device enumeration succeeded for physical speakers, monitor audio, Yeti output/input, onboard microphone, and Sony Bluetooth endpoints while connected.
* Official VB-CABLE Pack45 downloaded. Its x64 installer had a valid Authenticode signature from BUREL VINCENT Entrepreneur individuel. Installer returned exit code 0. Both stereo and multichannel cable endpoints appeared. All VB-CABLE endpoints are excluded from output targets to avoid feedback.
* Live audio capture and simultaneous playback passed on the physical speakers and Yeti output. A quiet 1 kHz signal passed through the virtual bus. Physical speaker RMS: 0.0176777. Yeti RMS with a -6 dB cut at 1 kHz: 0.00885982. Measured ratio: 0.501187 (expected 10^(-6/20)). Dropped blocks: 0 on both outputs during the short test. This measures the samples submitted to the real playback streams, not the acoustic response of the speakers.
* Real window Start/Stop routing test passed. Start selected the cable as all three Windows default output roles; Stop restored the original defaults exactly. The input default remained the original Yeti microphone.
* Main window rendered and visually inspected with real device names. Volume and microphone mutation in automated UI checks was mocked; the live routing tests used actual audio streams.
* Packaged Windows executable rendered its actual window successfully and exited with code 0 in the offscreen startup check. Packaging removes incompatible ICU libraries accidentally resolved from other tools on PATH; Qt uses Windows' own matching ICU forwarding libraries. This rule is part of the reproducible packaging step.

Linux backend behavior has automated coverage, but no live Linux environment is installed on this machine. Linux hardware, Bluetooth long-session timing, suspend/resume, and acoustic synchronization remain unverified. Short Windows tests do not establish long-duration glitch-free playback. A Windows reboot is still recommended by the VB-CABLE publisher to finalize driver installation.

The app is a usable initial release, not a claim of exhaustive platform certification.

## 0.1.1 playback correction

The initial tests checked samples submitted to playback and did not catch SoundCard 0.4.6 reserving/releasing more WASAPI render frames than it initialized for short blocks. Version 0.1.1 clamps every write to its actual sample count and adds regression checks for short and large writes. Failed outputs no longer reopen on each device poll; healthy outputs can start even if another endpoint fails.

17 automated checks pass. A ten-second isolated live check on Sony WF-1000XM5 measured audio at its Windows render loopback: median RMS 0.00565675, signal coverage 99.90%, and zero dropped blocks or device errors. Default endpoints were unchanged. This proves delivery to the Windows endpoint; it cannot establish acoustic output. The user subsequently reported that playback was working.

## 0.2.0 management controls

30 checks pass, including graphic and parametric EQ response, all six filter types and their stability, dynamic filter count, preamp/balance, precise UI gain changes, profile validation/copying, sample-accurate delay across blocks, driver-latency alignment, microphone monitoring mix/stop behavior, automatic routing, and reversible Windows/Linux login startup registration. Registry tests use a fake registry; no startup preference was enabled as part of testing. Window and expanded EQ editor were rendered and visually inspected.

Auto sync uses driver estimates. It is not an acoustic calibration, and it cannot infer unreported Bluetooth codec delay. Input delay affects app monitoring; it does not alter other programs' microphone streams. Microphone monitoring has not yet been tested against live hardware; it remains off by default.

## 0.3.0 classic EQ and waveform view

34 checks pass. The primary EQ view now has 15 classic frequency-band sliders matching the supplied reference, plus Bass/Mid/Treble controls. Input EQ settings are independent and applied before monitoring/metering. Additional checks verify classic tone/band frequency response, independent input settings, a bounded three-second waveform history, expiry during silence/stoppage, and stereo peaks without phase cancellation. Waveform buffers are memory-only. Inputs require explicit Meter or Listen activation to avoid automatically opening Bluetooth headset microphones. The earlier EQ profiles and synchronization delays are preserved.

## 0.4.0 PCM channel layouts

42 checks cover named channel preservation, mono delivery, stereo downmix, side/back aliases, height folding, correctly packed Windows formats, and 12-channel EQ, in addition to the earlier coverage. Live Windows loopback on the cable's multichannel endpoint passed for stereo-based mono, 5.1, 7.1, and 7.1.4. Distinct tones in each channel were captured in the correct positions; original cable format and system defaults were restored. Stream initialization retains the rate-adjust flag, and format changes wait briefly for the audio-service graph to release/rebuild.

These are PCM layout tests, not Dolby encoding or acoustic surround certification. No physical surround receiver or height speakers are connected here. Dolby object metadata and compressed bitstream passthrough are not implemented. Native Windows Spatial Sound integration is a separate future task; it can use a user's available OS renderer rather than bundling a codec encoder. Live Linux multichannel tests remain outstanding.

## 0.5.0 daily-control milestone

51 checks pass. New coverage verifies reversible output/input group mute, preserving devices already muted, newly connected devices, persistence, partial endpoint failures, panic silence without reopening a player, bounded/coalesced undo/redo, editing after undo, independent history copies, EQ peak/RMS/clip counters and reset, UI tone undo/redo, aliases, pinned ordering, and device filtering. Native mute operations in tests use a fake callback so the tests do not silence the user's playback or microphone. Interface rendering is checked before deployment. OS-wide keyboard shortcut registration is not claimed; shortcuts currently work while the manager window is active.

## 0.6.0 reliability and restart repair

67 checks cover stable return/cooldown, device flapping, missing-device startup, retry exhaustion, manual cancellation, avoiding repeated reopen on plain polling, backup startup without reopening the failed primary, keeping healthy streams open, cleanup despite default-restoration errors, preserved primary selection, and stable launcher/version resolution and login targeting. Sleep/resume wiring is implemented but an actual hardware suspend cycle is not performed during this session. Windows audio-service shutdown and live Linux outage tests are not performed. These are remaining verification tasks, not claimed successes.

The user's missing-controls screenshot was traced to the obsolete root executable rather than the current release. The root path is now a standalone launcher; matching shortcuts and login startup target that stable path. Launcher DLL search state is reset before starting the real app to avoid carrying its bundled libraries into the child process.
