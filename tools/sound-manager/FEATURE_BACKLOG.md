# Sound Manager feature research and implementation backlog

### Delivered in 0.10.0

| IDs | Delivered behavior and remaining scope |
|---|---|
| D03, D04 | Hide/show devices without disabling audio; saved order using Move up/down. Portable backups retain both. Drag-to-reorder remains pending. |
| D06, V09, V10 | Stream states and source-silence guidance; reported errors, queue drops, estimated driver latency, measured DSP milliseconds/block. Total CPU usage and native underrun counters remain pending. No acoustic playback claim. |
| C05 | Per-output Solo / End solo preserves selections and native mute; panic still silences it. Applies to manager-routed streams. |
| T03, T07 | Every input/output has ±1/5/10 ms delay nudges; a bounded ten-second click train passes through output processing for listening comparisons. |
| C01, C02, C04, scenes | Opt-in customizable global mute/cycle/scene keys on Windows and X11, conflict reporting, plus user-local --action commands for desktop-configured Wayland bindings. Automatic Wayland portal registration remains pending. |
| A01, A02 | Native per-app session volume/mute and locally persisted output assignment for Windows and PulseAudio/PipeWire-Pulse. Manager mix or physical destination; errors surfaced, failed routes not churned. Physical routes bypass manager processing. App preferences are not in portable backups/scenes yet. |

127 automated checks pass. Live Windows app-session enumeration, an isolated process's policy assignment/readback/default restoration and native shortcut registration/conflict/release checks pass. Linux app routing uses mocked command coverage; live Linux hardware and global-key delivery remain verification tasks. Existing user playback is not changed by routing tests.

The compact main toolbar keeps daily controls visible and groups management/startup/recovery actions under Manage. Device options move to the ... menu, and timing nudges share the delay row. H01/H02/H08 are partial: the offline searchable Help window reads the shipped control reference/code map directly; full function-level detail, contextual links and additional navigation remain pending.

Version 0.7.0 completes V03 Freeze waveform with a shared per-device/session snapshot, explicit Frozen status, no audio pause/capture changes, and no recordings on disk. Explicit per-device and global peak/clip hold reset buttons extend V02. Visibility/display preferences, EQ bypass, delay reset, and pinned-window recovery from 0.6.2/0.6.3 are retained.

Version 0.6.2 convenience controls: per-input/output persistent waveform visibility with hidden rendering timers stopped; saved EQ controls / Live waveform display mode; graduated background dB guides for both slider banks; global non-destructive EQ bypass for sound comparison; and one-click reset of all delays, including disconnected devices. These are implemented controls, not future proposals. Waveform capture remains governed by routing and input Meter/Listen.

Version 0.6.1 restores always-visible delay/synchronization controls and adds product-scoped GitHub Release checks, optional daily startup checking, release notes, Update / Not now, SHA-256 verified package staging, cancellation, and explicit clean-stop installer handoff. Other Foundry tools are filtered by tag prefix. Live Linux update installation remains unverified.

Research date: October 5, 2026. This is a tracked implementation list, not a claim that all features are implemented. The existing 0.6.0 baseline is listed separately below.

## Programs worth studying

| Program | Platform / cost model | Design ideas to study | Primary source |
|---|---|---|---|
| EarTrumpet | Windows; free, open source | Quick app mixer, device routing, peak indicators, hotkeys | [Official project](https://github.com/File-New-Project/EarTrumpet) |
| SoundSwitch | Windows; free, open source | Device shortcuts, automatic profiles, app rules, restoring previous devices | [Official site](https://soundswitch.aaflalo.me/), [profiles](https://soundswitch.aaflalo.me/usage/profiles) |
| Equalizer APO + Peace | Windows; free, open source | System effects, classic EQ, channel controls, correction profiles, accessible preset switching | [Equalizer APO](https://sourceforge.net/projects/equalizerapo/), [Peace](https://sourceforge.net/projects/peace-equalizer-apo-extension/) |
| FxSound | Windows; free, open source | Approachable tone controls and listening presets | [Official site](https://www.fxsound.com/) |
| EasyEffects | Linux / PipeWire; free, open source | Microphone cleanup, level processing, ordered effect chains | [Official project](https://github.com/wwmm/easyeffects) |
| qpwgraph | Linux / PipeWire; free, open source | Visual signal connections and saved patchbays | [Official project](https://github.com/rncbc/qpwgraph) |
| SteelSeries Sonar | Windows; free proprietary software in GG | Separate game/chat/media mixes, chat balance, microphone processing | [Official product](https://steelseries.com/lp/sonar-for-streamers), [channel documentation](https://support.steelseries.com/hc/en-us/articles/16954265292173-How-does-Sonar-work) |
| Voicemeeter Banana | Windows; donationware with separate professional licensing terms | Multiple buses, mix-minus, virtual inputs/outputs, monitoring and network audio | [Official product](https://vb-audio.com/Voicemeeter/banana.htm), [licensing](https://vb-audio.com/Services/licensing.htm) |
| Room EQ Wizard | Windows/Linux/macOS; free core, optional paid Pro upgrade | Measurement tools, guided calibration, timing references | [Official product](https://www.roomeqwizard.com/), [measurement documentation](https://www.roomeqwizard.com/help/help_en-GB/html/makingmeasurements.html) |

The opportunity is a cohesive Windows/Linux manager with useful defaults and consistent controls. It is not necessary to reproduce every professional studio effect to make everyday audio management good.

## Existing baseline

Implemented: multi-output playback, per-device selection, system volume/mute/default controls, output EQ, input EQ for in-app metering/monitoring, Bass/Mid/Treble, classic 15-band EQ, earlier graphic/parametric controls, preamp/balance/headroom, profiles and JSON import/export, profile copying, output and monitoring delay, driver-based Auto sync, optional microphone monitoring/metering, three-second waveform envelopes, tray operation, automatic routing on launch, optional login startup, bounded queues, failure isolation, and default restoration.

Also implemented: named Mono/Stereo/Quad/5.1/7.1/7.1.4 PCM layouts, per-output native layout adaptation, center/surround/height downmix, and reversible virtual-cable PCM format selection. This is not a Dolby bitstream encoder or Atmos object renderer. [Dolby AC-4](https://professional.dolby.com/technologies/ac-4/) is a next-generation codec supporting channel/object content; [Windows Spatial Sound](https://learn.microsoft.com/en-us/windows/win32/coreaudio/spatial-sound) is a potential platform integration for a user's available spatial renderer.

Limits: input processing is not exposed as a system virtual microphone; per-app routing is not implemented; driver estimates cannot measure Bluetooth acoustic delay; live Linux validation and live microphone processing validation remain outstanding. Current peak protection is a sample clamp, not a professional lookahead limiter. Waveform history is a memory-only envelope, not a stored audio recording.

## Priorities

### Delivered in 0.9.0

| Backlog item | Delivered behavior |
|---|---|
| P07 | Portable setup export/import covering the current mix, profiles, scenes, aliases/favorites and display preferences, with previewed input/output device mapping and automatic pre-restore copies. |

Operational driver/recovery records and login registration stay local. Microphone capture restoration requires opt-in. Scene and backup-output references follow mapping; wrong-type/duplicate targets are rejected. Live Linux hardware validation is still outstanding.

### Delivered in 0.8.0

| Backlog item | Delivered behavior |
|---|---|
| P01 (partial) | Named scenes capture selected outputs, connected-device volumes/mutes, input/output EQ/delays, PCM layout and backup output. Per-app routes are not yet implemented. |
| P02 | One-click scene recall from the tray and a common management panel. |
| P06 (partial) | Previous mix swaps back to the preceding configuration for A/B comparison; timed audition/cancel remains planned. |

Scenes can be imported/exported individually. P07 full settings backup with device remapping is still separate work. Microphone capture switches restore only with explicit opt-in, and mute groups remain active.

### Completed in 0.7.0

| Backlog item | Delivered behavior |
|---|---|
| V03 | Shared per-device Freeze snapshots in mixer and EQ views, explicit Frozen indication, continued audio, and no files recorded. |
| V02 extension | Visible per-device and global reset buttons for peak/clip holds, retaining frozen waveform shapes. |
| R10 (partial) | Matching Windows AppUserModelIDs across launcher, process and repaired shortcuts prevent separate application identities after updates. Automatic rollback remains planned. |

### Reliability milestone in 0.6.0

| Backlog item | Delivered behavior / verification limit |
|---|---|
| R01 | Stable-return detection, cooldown and retry budget; polling alone cannot churn a failed device. Explicit Retry selected keeps healthy streams open. |
| R02 | Opt-in backup output used without replacing saved primary selection. |
| R03 | Delayed resume recovery through Windows power events or Linux logind signals when available; a real suspend/resume hardware cycle remains to be tested. |
| R04 | Capture/service failures stop old streams and schedule bounded recovery; restoration records survive cleanup failures. Linux service outage testing remains outstanding. |
| R05 | Bounded startup preflight plus manual retry when the audio service/devices are not ready. |
| R10 (partial) | Stable launcher and repaired shortcuts prevent restarting into obsolete code. Automatic release rollback is still planned. |

The stale root executable reported by the user was confirmed as the cause of missing controls after restart. The current install replaces that root entry with a launcher and displays the running version.

### Completed in 0.5.0

| Backlog item | Delivered behavior |
|---|---|
| C01 | Panic mute in the window/tray, software silence plus native endpoint mute, reversible prior states. |
| C02 | All real microphones can be muted/restored; window shortcut and persistent state. Desktop-wide shortcut registration remains pending. |
| D01 | Friendly labels preserve driver names and stable IDs. |
| D02 | Pinned devices sort first. |
| D05 | Live search matches friendly labels, driver names, and input/output type. |
| E02 | Bounded per-device EQ undo/redo, with slider-gesture coalescing. |
| V01 | Peak hold and smoothed RMS meters on the processed streams. |
| V02 | EQ peak-guard clip counts with resettable hold. Source-mix clipping diagnostics remain a separate extension. |
| U01 | Compact default mixer view; timing/channel controls are expandable. |

The candidate tables below retain their original acceptance descriptions. This completion table is the current implementation status; items without a completion entry are still planned.

P0 = reliability and missing core paths. P1 = daily convenience. P2 = richer processing and analysis. P3 = optional studio/streaming integrations. These are proposed priorities, not promised delivery dates.

## 100 additional implementation candidates

### 1. Reliability and recovery

| ID | Priority | Feature | Acceptance target |
|---|---|---|---|
| R01 | P0 | Safe device reconnect | Retry after a genuine stable reconnect, with backoff; never churn Bluetooth streams every poll. |
| R02 | P0 | Preferred fallback output | Continue on a chosen backup when the primary disappears. |
| R03 | P0 | Restore after sleep/resume | Rebuild invalid audio streams while preserving settings. |
| R04 | P0 | Audio-service recovery | Recover from PipeWire/PulseAudio or Windows audio service restart. |
| R05 | P0 | Startup readiness | Wait for login audio devices before failing; provide a bounded retry and clear status. |
| R06 | P0 | Crash restoration helper | Restore owned defaults even when the main app exits unexpectedly. |
| R07 | P0 | Long-session soak tests | Verify hours of playback, USB unplugging, Bluetooth reconnect, and drift. |
| R08 | P0 | Linux hardware verification | Test at least PipeWire-Pulse and PulseAudio with wired/USB/Bluetooth devices. |
| R09 | P1 | One-click bypass and recovery | Return to direct system playback without losing profiles. |
| R10 | P1 | Atomic update with rollback | Validate the new release and recover the previous working version on failure. |

### 2. Device organization

| ID | Priority | Feature | Acceptance target |
|---|---|---|---|
| D01 | P1 | Friendly device names | Rename cryptic driver names without changing OS identity. |
| D02 | P1 | Pin favorite devices | Keep preferred outputs and inputs at the top. |
| D03 | P1 | Hide unused devices | Hide HDMI ports, unused cables, and stale endpoints. |
| D04 | P1 | Drag to reorder | Preserve the device order across launches. |
| D05 | P1 | Search and filters | Quickly find devices by name/type/connection. |
| D06 | P1 | Connection indicators | Show connected, disconnected, processing, and failed states clearly. |
| D07 | P1 | Device preferences | Prefer a particular output or microphone when it returns. |
| D08 | P1 | Remember disconnected profiles | Keep EQ/delay/settings for devices that are temporarily absent. |
| D09 | P2 | Device details panel | Explain sample rate, channels, driver, format, and estimated latency. |
| D10 | P2 | Output groups | Control named sets such as Desk, Headphones, and Whole Room. |

### 3. Everyday controls

| ID | Priority | Feature | Acceptance target |
|---|---|---|---|
| C01 | P1 | Panic mute | One click or hotkey silences all managed outputs immediately. |
| C02 | P1 | Global microphone mute | Clear persistent mute state and reliable shortcut feedback. |
| C03 | P1 | Push-to-talk | Hold a configurable key to transmit through the processed microphone path. |
| C04 | P1 | Cycle outputs by hotkey | Rotate favorite devices without opening the full window. |
| C05 | P1 | Mute all except this device | Quickly isolate one output. |
| C06 | P1 | Linked volume groups | Adjust a device group while retaining relative trims. |
| C07 | P1 | Temporary volume reduction | Lower sound for a timed interval, then restore the previous level. |
| C08 | P1 | Gradual volume fades | Avoid abrupt level changes when switching profiles. |
| C09 | P1 | Previous audio setup button | Return to the last scene with one click. |
| C10 | P1 | Volume ceiling | Apply a chosen maximum level and show when the ceiling is active. |

### 4. App mixing and routing

| ID | Priority | Feature | Acceptance target |
|---|---|---|---|
| A01 | P0 | Per-app volume and mute | Independently control browsers, games, chat, music, and system sounds. |
| A02 | P0 | Per-app output assignment | Persist an app's chosen destination across restarts. |
| A03 | P1 | App-to-output matrix | Send each app to one or several selected destinations. |
| A04 | P1 | Per-app input assignment | Use a chosen processed microphone in supported apps. |
| A05 | P1 | Game/chat balance | One slider balances two named audio groups. |
| A06 | P1 | Audio ducking | Lower music or game sound while voice/chat is active. |
| A07 | P1 | Separate system notifications | Keep alert sounds apart from media and voice audio. |
| A08 | P2 | Per-app EQ | Apply processing to dedicated app streams instead of the combined system mix. |
| A09 | P2 | App peak indicators | Identify which application is making noise or clipping. |
| A10 | P2 | Route previews | Display the exact path from app/input through effects to outputs. |

### 5. Synchronization and timing

| ID | Priority | Feature | Acceptance target |
|---|---|---|---|
| T01 | P0 | Guided acoustic Auto sync | Use test signals and a selected microphone to measure actual arrival time, with confidence scoring. |
| T02 | P0 | Continuous clock-drift correction | Resample gently so separate devices stay aligned during long playback. |
| T03 | P1 | Delay nudges | Buttons for ±1, ±5, and ±10 ms while listening. |
| T04 | P1 | Group delay control | Shift an entire group without destroying relative alignment. |
| T05 | P1 | Saved calibration sets | Keep timing profiles for wired, Bluetooth, and TV combinations. |
| T06 | P1 | Calibration rollback | Revert unsuccessful measurements to the previous working delays. |
| T07 | P1 | Test pulse and click train | Make echo/offset easier to hear during manual tuning. |
| T08 | P2 | Codec/connection change detection | Indicate when a saved Bluetooth calibration may be stale. |
| T09 | P2 | Lip-sync helper | Guide audio/video offset adjustment with a reference clip. |
| T10 | P2 | Latency breakdown | Distinguish estimated driver, software buffer, and measured end-to-end delay. |

### 6. Microphone quality and delivery

| ID | Priority | Feature | Acceptance target |
|---|---|---|---|
| I01 | P0 | System virtual microphone | Deliver processed EQ/cleanup to Discord, Zoom, games, and recording tools. |
| I02 | P1 | Noise suppression | Reduce steady room/computer noise with an optional local processor. |
| I03 | P1 | Noise gate / expander | Suppress idle mic noise without cutting off word endings. |
| I04 | P1 | Automatic gain control | Keep speech level more consistent, with a visible bypass. |
| I05 | P1 | Voice compressor | Tame loud speech and lift quieter passages. |
| I06 | P1 | High-pass rumble removal | Remove low-frequency bumps, fan rumble, and desk vibration. |
| I07 | P2 | De-esser | Reduce harsh sibilants with adjustable strength. |
| I08 | P2 | Echo cancellation | Use the actual playback mix as a reference where technically supported. |
| I09 | P2 | Voice-only ducking trigger | Distinguish speech from keyboard noise for mixer automation. |
| I10 | P2 | Microphone setup wizard | Test signal, input level, monitoring, and delivery to another app. |

### 7. EQ and listening quality

| ID | Priority | Feature | Acceptance target |
|---|---|---|---|
| E01 | P1 | Instant A/B comparison | Compare two EQ states at matched loudness. |
| E02 | P1 | Undo/redo for EQ | Recover an accidental adjustment or profile load. |
| E03 | P1 | Band solo / bypass | Hear the region controlled by an individual slider. |
| E04 | P1 | Device correction profiles | Import measured headphone/speaker EQ with clear source attribution. |
| E05 | P1 | Loudness matching | Compare devices at similar perceived levels. |
| E06 | P2 | True lookahead limiter | Prevent peaks smoothly rather than simply clamping samples. |
| E07 | P2 | Night / dialogue mode | Reduce loud/quiet differences for films and voice. |
| E08 | P2 | Stereo crossfeed | Blend channels gently for selected headphone listening. |
| E09 | P2 | Convolution / room correction | Load an impulse response as an optional processing stage. |
| E10 | P2 | Reorderable effects chain | Let users inspect, bypass, and reorder effect stages. |

### 8. Meters and diagnostics

| ID | Priority | Feature | Acceptance target |
|---|---|---|---|
| V01 | P1 | Peak/RMS meters | Show momentary peaks and average levels per input/output. |
| V02 | P1 | Clip indicator with hold | Identify where clipping happened and allow reset. |
| V03 | P1 | Freeze waveform | Pause the visual display while playback continues. |
| V04 | P1 | Stereo waveform lanes | Show left and right channels independently. |
| V05 | P1 | Before/after comparison | View raw and processed signal levels without altering the sound. |
| V06 | P2 | Spectrum analyzer | Show frequency content beside the classic EQ. |
| V07 | P2 | Spectrogram | Show changing frequencies over time. |
| V08 | P2 | Loudness meter | Add integrated/short-term loudness with documented measurement behavior. |
| V09 | P1 | Stream health panel | Show dropouts, queue overruns, CPU cost, and actual processing status. |
| V10 | P1 | No-sound troubleshooting | Identify missing source audio, mute, wrong route, invalid device, or failed processing. |

### 9. Scenes and automation

| ID | Priority | Feature | Acceptance target |
|---|---|---|---|
| P01 | P1 | Complete audio scenes | Save selection, volumes, EQ, delays, and app routes together. |
| P02 | P1 | Quick scene tray menu | Activate Desk, Gaming, Calls, Movies, or Streaming immediately. |
| P03 | P1 | Device-connect triggers | Apply a selected scene when a headset/interface appears. |
| P04 | P1 | App-start/focus triggers | Apply a scene for a game or conferencing app and restore afterward. |
| P05 | P1 | Profile locking | Prevent apps or reconnections from unexpectedly replacing chosen defaults. |
| P06 | P1 | Profile preview / cancel | Audition settings and revert if they are not wanted. |
| P07 | P1 | Full settings backup | Export/import app setup with device remapping on another machine. |
| P08 | P2 | Scheduled scene changes | Optional local timing rules for user-defined quiet periods. |
| P09 | P2 | MIDI / control surface | Bind knobs and buttons to selected audio controls. |
| P10 | P2 | Local command interface | Allow hotkeys/scripts to control named scenes without a cloud account. |

### 10. Interface, deployment, and advanced routes

| ID | Priority | Feature | Acceptance target |
|---|---|---|---|
| U01 | P1 | Compact mixer mode | Keep basic controls fast and move advanced options out of the way. |
| U02 | P1 | Full keyboard navigation | Operate all controls without a mouse. |
| U03 | P1 | Accessible labels and scaling | Support screen readers, large text, and high-contrast presentation. |
| U04 | P1 | Portable build and clean uninstall | Make configuration location and installed dependencies clear. |
| U05 | P1 | Setup/driver health check | Explain missing requirements and verify the installed audio route. |
| U06 | P2 | Routing graph / patchbay | Offer a visual alternative to lists for complex connections. |
| U07 | P2 | Custom channel mapping | Add editable matrices, per-channel trim/mute/polarity, and channel swaps beyond the existing layouts. |
| U08 | P3 | Separate monitor and broadcast mixes | Support a listen mix and a different streaming mix, including mix-minus. |
| U09 | P3 | Network audio | Optional local-network destinations with explicit latency handling. |
| U10 | P3 | Plugin hosting | Load compatible effects with isolation and separate license handling. |

### 11. Extensive built-in help section — requested October 6, 2026

Status: an offline searchable Help window is shipped through Manage and the tray, reading HELP.md's current control reference and code map. Complete the remaining table-of-contents/glossary/navigation, contextual links, function-level reference and examples listed below. Keep it versioned with the app and available alongside source/download documentation.

Development requirement: every addition or behavioral change must include an explanation of what it is and how it works in the help, in the same change. Correct/remove obsolete information when behavior changes or is removed. Review related examples/screenshots/links, distinguish current from historical/planned behavior, and block release when matching help is missing or inaccurate. This rule is maintained in AGENTS.md and CONTRIBUTING.md.

| ID | Priority | Help topic | Acceptance target |
|---|---|---|---|
| H01 | P1 | Help navigation and search | Table of contents, keyword search, glossary, back/forward navigation, copyable text and links; usable offline without an account. |
| H02 | P1 | Every button and function | Cover every window, tab, tray action, shortcut and command. For each: purpose, exact effect, prerequisites, affected devices/streams, persistence, reset/undo behavior, failures and examples. Maintain a control inventory so additions cannot silently lack help. |
| H03 | P1 | Routing explained | Trace app audio → Windows cable/Linux sink → capture → channel conversion → microphone mix → delay/EQ → independent output queues → endpoint. Explain Manager mix versus physical app destinations, OS defaults, native volume, mute, exclusive audio, monitoring and feedback. |
| H04 | P1 | EQ and metering guide | Bass/mid/treble, graphic/parametric bands, Hz/dB/Q, preamp, balance, headroom, peak guard, profiles, undo/redo, waveform visibility/freeze, EQ response versus waveform, RMS/peak/clip readings and graduated scales. Show practical examples and explain measurement limits. |
| H05 | P1 | Timing and channel guide | Per-input/output/system delay, nudges, click tests, reported-latency Auto sync, Bluetooth codec delay, drift, acoustic versus sample measurements; PCM layouts/downmix/channel maps and actual Dolby/Atmos limitations. |
| H06 | P1 | Daily workflows | Startup/login, tray/pinned-window recovery, hide/reorder/favorites, search/rename, solo/panic/mic mute, hotkeys, per-app controls, scenes/previous mix, backups/remapping and privacy-preserving microphone restore defaults. |
| H07 | P1 | Troubleshooting and diagnostics | Decision paths for silence, missing waveform, missing/disconnected devices, failed streams, wrong app route, Bluetooth call mode, latency/desync, clipping, service restart, driver setup and stale shortcuts. Explain health fields, logs, bounded retries, and reversible recovery steps. |
| H08 | P1 | Behind-the-scenes code reference | Explain each source module, public classes/functions, interactions and platform-specific calls; threads/locks/queues, buffers/sample rates, DSP state, device/session identity, native hotkeys and local IPC, settings validation/migrations, crash logging, packaging/launcher and update handoff. Link descriptions to matching source and describe why key choices were made. |
| H09 | P1 | Persistence, updates and privacy | State what saves across restarts versus session-only controls, where settings/logs/backups live on Windows/Linux, scene/backup inclusions and omissions, native OS settings, release verification, install/uninstall, separate driver licenses, local waveform memory and microphone access. |
| H10 | P1 | Context help and maintenance | Help links beside complex controls open the correct topic. Use screenshots/examples from the current version, distinguish implemented/experimental/planned behavior and platform limits, add accessible keyboard/scaling support, and check control/source coverage during releases. |

This section is an implementation backlog, not permission to expose internal code jargon throughout the ordinary mixer. The Help window should let users choose the detail they need, including the extensive code explanations requested here.

## Suggested implementation order

1. Harden startup, reconnect, suspend, and long-session behavior on both operating systems.
2. Add panic mute, microphone mute hotkeys, device aliases, undo, meters, and full scenes.
3. Build per-app volume/mute and output assignment with platform-specific backends.
4. Add a real virtual microphone before presenting input EQ as system-wide.
5. Improve synchronization with guided measurement and adaptive clock correction.
6. Add basic microphone cleanup and a real limiter.
7. Add spectrum views and correction profiles.
8. Keep network audio, plugin hosting, and broadcast buses optional and later.

## Important implementation distinctions

The current engine captures one combined system stream. Per-app EQ and independent routing require separate app streams or buses. Windows and Linux will need different native implementations even when the interface is consistent.

A processed virtual microphone is a delivery feature, not just another EQ slider. It must expose the transformed stream as an input other apps can select. The current monitoring pipeline does not do that.

Acoustic synchronization requires a physical reference that can hear each output. Bluetooth loopback validates samples arriving at Windows, but not their eventual sound arrival at the ear. If measurement is not possible or confidence is low, Auto sync must say so and preserve the user's manual calibration.

Existing settings must survive updates. Keep advanced features optional, keep basic volume/routing/EQ available without an account or subscription, and keep captured audio local unless the user explicitly chooses a recording/export/network function.
