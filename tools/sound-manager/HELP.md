# Simple Sound Manager help — 0.10.0

This is the shipped reference for current controls. The searchable built-in Help window and complete function-by-function code reference are planned in H01–H10 of FEATURE_BACKLOG.md. Historical milestone descriptions in README.md/VALIDATION.md describe earlier versions.

## Where sound goes

When routing starts, system apps normally play into a Windows VB-CABLE endpoint or Linux PulseAudio/PipeWire-Pulse null sink used as the capture bus. The manager reads the combined stream, converts channels, applies system-input delay, mixes explicitly monitored microphones, and distributes blocks to selected outputs. Each output has an independent queue, channel conversion, delay and EQ. Microphones have separate processing workers before monitoring/metering.

The engine uses 48 kHz. Captured bursts split into blocks of up to 480 frames (10 ms). Output queues hold eight blocks at most, dropping/counting the oldest queued block when full to prevent unlimited latency growth. Native buffers/Bluetooth codecs add delay. EQ/waveform readings describe samples before endpoint volume; they do not prove acoustic sound.

Stop/Quit attempt to restore previous defaults, release owned streams/buses and restore changed formats. Close keeps routing in the tray. The stable launcher opens the installed current release or asks the existing instance to reopen its window.

## Main controls

| Control | What it does and how it works |
|---|---|
| Start / Stop multi-output audio | Open/close capture and selected output streams. Requires a usable output and platform capture bus. Stop restores owned defaults. |
| Refresh devices | Enumerate endpoints and update cards without blindly reopening failed streams. |
| Retry selected | Retry failed selected streams once while keeping healthy streams. Reconnect missing hardware first. |
| Auto sync delays | Compare reported latency of active outputs/monitored inputs and compensate with delay. Does not measure acoustic arrival or codec delay; manually fine-tune. |
| Layout / backup | Reveal PCM layout, system-input delay and backup-output controls. PCM channels do not imply Dolby/Atmos encoding. |
| Windows audio setup | Install the separately downloaded signed VB-CABLE driver; requires its administrator setup approval and may need reboot. |
| Start sound automatically | Save whether routing starts when the app opens; on by default. |
| Start at login | Register/remove a per-user Windows Run or Linux XDG autostart entry targeting the installed app. |
| Reconnect automatically / Cancel retry | Permit bounded readiness/stable-device recovery, or cancel pending automatic intent. Failed endpoints are not reopened every poll. |
| Mute all outputs / Resume outputs | Preserve prior native mute states, mute real endpoints and silence managed streams. Restore retains previously muted devices. Guard applies to newly found devices. |
| Mute all microphones / Restore microphones | Preserve/restore native input mute states; does not enable Meter/Listen. |
| Find devices | Filter by driver name, friendly label or type without changing audio. |
| Bypass all EQ | Temporarily bypass filters/preamp/balance/headroom without overwriting profiles. Delay, mute and final peak guard remain active. |
| Reset all delays | Clear output, microphone-monitor and system-input delay, including offline saved devices; preserve EQ and selections. |
| Reset meter holds | Clear held peak/clip counts without stopping sound. Frozen trace shapes remain. |
| Test sync clicks / Stop test clicks | Add quiet once-per-second pulses for ten seconds through each selected output's delay/EQ/mute/solo. Click again to stop. Helps hear echo offsets; not acoustic calibration. |
| End solo | Release temporary isolation and restore other selected managed streams. |
| Health / devices, App mixer, Hotkeys | Open the controls explained below. |
| Scenes, Backup / restore, Updates | Manage setups, portable backups and product updates, explained below. |

## Device and EQ controls

**Play here** selects an output for managed audio. Native **Mute/Unmute** and **Volume** alter its OS endpoint and work while routing is stopped. **Use as default** changes OS defaults; output default changes are disabled while routing runs. **Pin** favors automatic ordering/output cycling; manually saved order takes precedence. **Rename** saves a friendly label and preserves driver name/ID.

**Solo** silences other manager-routed outputs while preserving their selections/native mute states. Select Play here first. End solo, stopping, deselecting or disconnecting the target restores other streams. Panic mute wins. Solo is session-only; direct physical app destinations bypass it.

Each input/output has saved **0–2000 ms delay**, **Reset delay**, and **±1/5/10 ms** nudges clamped to that range. Delay early devices to match late ones; delay buffers cannot advance late sound. Example: headphones 20 ms late → add 20 ms to speakers. Input delay affects this app's processed monitoring, not another app's direct mic.

Microphone **Meter** enables processed capture for display; **Listen** mixes it into selected outputs. Both default off. Bluetooth mic capture may enable headset call mode. Monitor with headphones to avoid feedback. A processed system-wide virtual microphone is not implemented.

**Waveform** saves visibility and stops hidden rendering timers without changing capture/selection. The rolling three-second envelope is bounded memory, not a recording. **Freeze** holds shared trace/readings while audio continues; session-only. Double-click/reset clears peak/clip holds. EQ **Display** selects saved controls or larger live-waveform view; Waveform also governs its compact trace.

**Equalizer** opens independent device EQ: 15 classic bands (25 Hz–16 kHz), Bass/Mid/Treble, earlier ten-band settings, and parametric peaks/shelves/passes/notches. Hz means frequency, dB gain, Q bandwidth. Preamp changes overall level; Balance trims left/right; automatic headroom reduces overload from boosts. Final peak protection clamps samples; it is not a lookahead limiter. EQ enabled toggles device filtering. The response curve is static frequency gain, not the waveform; background guides indicate level.

**Undo/Redo** stores up to 50 EQ states during the session and groups rapid slider edits. **Save profile**, profile selection, **Import/Export**, **Reset EQ**, and **Copy EQ / Copy** manage validated EQ while retaining timing/selection. **Done** closes the editor; edits already applied. Filters have frequency/gain/Q/enabled controls.

Playback layouts preserve/downmix supported PCM channels; unsupported channel counts are disabled. System Auto follows selected hardware. Named layouts include Mono, Stereo, Quad, 5.1, 7.1 and 7.1.4. Stereo does not synthesize surround. LFE is not dumped into stereo. Dolby compressed passthrough/Atmos objects are not implemented.

## Health and organization

Statuses distinguish connected/stopped, capture off, unselected, waiting, processing, muted, solo-suppressed, failed and disconnected saved devices. **Move up/down** saves order. **Hide / show selected** saves menu visibility without disabling audio; hidden devices remain accessible here. Both preferences are in setup backups. **Refresh health** refreshes the manager's displayed inventory/state; ordinary device polling supplies hardware changes.

The report shows source peak/silence guidance/errors, queue drops, DSP milliseconds per block, driver latency and configured delay. Processing time measures conversion/delay/EQ work, excluding native playback waits; it is not total CPU usage. Growing drop counts suggest the stream cannot keep up. Processing status is software activity, not acoustic verification. No source can mean paused playback, another destination or exclusive audio bypass.

## App mixer

Apps appear while native sessions exist. **Refresh apps** enumerates again. Each row groups app sessions, exposes native **Volume** (0–100%) and **Mute/Unmute**, and a destination plus **Assign**. Windows system sounds can be volume/muted but have no app process for routing.

**Manager mix** routes into the running capture bus and selected processed outputs. Physical destinations bypass manager EQ/delay/solo. **System default** restores ordinary default routing. Some apps need playback restarted. Windows uses native render sessions/internal audio policy; Linux moves PulseAudio/PipeWire-Pulse sink inputs. Unsupported calls/disconnected outputs show errors.

Preferences persist locally by Windows executable identity or Linux app binary/name; new sessions receive saved destinations. A failed same-session route does not churn every poll; explicit Assign/new session permits another attempt. Manager mix waits for a running bus. App routes and OS app volume/mute are not included in portable backups/scenes yet.

## Hotkeys and commands

Desktop keys default off. **Enable desktop hotkeys** + **Apply shortcuts** requests registration. Ctrl+Alt+Shift+P toggles output mute; M microphone mute; O rotates visible pinned outputs (or visible outputs if none pinned); S cycles sorted saved scenes. Output cycling selects one device and honors panic mute. Scene cycling honors microphone-restore policy.

Customize Ctrl/Alt/Shift plus one letter/digit; unique combinations required. Conflicts are reported. Windows RegisterHotKey uses no-repeat. X11 grabs keys with lock-key variants and suppresses repeat toggles. On Wayland bind the displayed `--action mute-outputs`, `mute-mics`, `cycle-output`, `next-scene` commands in desktop settings; automatic portal registration is pending. Commands reach the running manager through user-local IPC without starting another engine. Ctrl+Alt+P/M remain window-local.

## Scenes, backups and updates

**Save / update current**, **Apply scene**, **Previous mix**, and scene Import/Export/Delete manage validated audio snapshots: selection, levels, EQ, timing/layout and backup output. Microphone Listen/Meter restore is opt-in and respects privacy/mute guards. Scenes exclude display/order, temporary solo/freeze, app routes and login/install state.

**Export setup** captures current mix, scenes/profiles, labels/favorites, waveform/display, hidden/order and safe preferences. **Load backup** validates and previews mappings: choose current same-kind devices, keep offline IDs or skip. **Restore reviewed setup** saves a pre-restore safety copy before applying. **Open pre-restore copy** loads it for review. Restoring microphone capture switches requires explicit opt-in. Operational recovery/updater/login state and app routes are excluded.

**Updates** checks product-scoped GitHub tags, shows notes and offers Update/Not now. Downloaded assets are staged and SHA-256 checked against the published manifest before clean-stop installer handoff. Cancellation retains the current app; other tools' releases are filtered. Windows installs versioned folders behind the stable launcher; Linux uses source installation. Live Linux updater installation remains unverified.

Tray Open/Start/Stop/mute/device-selection/scenes/previous-mix/backup/health/app-mixer/hotkey/update actions call the same controls. **Quit** stops/releases audio; closing the window retains the tray process.

## Code map

| Module | Responsibility |
|---|---|
| run.py | Parse probe/tray/screenshot/action commands; establish lock/local server; wait for audio readiness; log Python/Qt crashes; construct Window. |
| ui.py, eq_ui.py | Device/processing controls and EQ editor translate choices into settings/backend/engine calls. |
| backend.py | Platform endpoint enumeration/control, capture bus creation and default restoration. |
| engine.py | Engine capture and InputWorker/OutputWorker threads, COM setup, bounded queues, persistent delay/filter state, stream configuration/history/errors. |
| playback.py | Native stream helpers, WASAPI frame-safe writes and latency reporting. |
| dsp.py | Equalizer and coefficient generation; streaming graphic/classic/parametric filtering, gain/balance/headroom/peak protection. |
| channels.py, windows_format.py | Named-channel conversion/downmix and Windows PCM format preservation/restoration. |
| timing.py, waveform.py | DelayLine/sample buffering and test pulses; rolling envelopes and peak/RMS/clip state. |
| controls.py | Group mute preservation and bounded/coalesced EQ history. |
| reliability.py, resume.py | Stable reconnect/readiness budgets and suspend/resume hooks. |
| health.py, everyday.py | Observable states/report and saved hide/order controls. |
| app_mixer.py, app_mixer_ui.py | Group/control native sessions; poll new sessions; track saved assignments and bounded retry history. |
| app_routing.py | Independent ctypes WinRT policy ABI binding for render-role destinations; supported interface variants and surfaced HRESULT failures. Internal API can change. |
| hotkeys.py, hotkeys_ui.py | Validate/register/unregister global shortcuts, report conflicts and dispatch known actions. No keyboard recording. |
| single_instance.py | User-local OPEN/whitelisted ACTION socket requests and delivery acknowledgement. |
| settings.py | JSON persistence, defaults/profile validation and atomic settings replacement. |
| scenes.py/scenes_ui.py, backups.py/backups_ui.py | Validated audio snapshots/previous mix and portable remapping/preview/pre-restore copies. |
| startup.py | Per-user login registration and canonical installed launcher resolution. |
| updates.py, update_ui.py | Release filtering/download/verification/cancellation and installer handoff. |
| windows_identity.py, launcher.py | Shared Windows identity, current-release resolution and clean child DLL search state. |
| build.ps1, package.py, prepare-release.py | Verify/build binaries, collect source/help/licenses/replaceable libraries, remove mismatched ICU libraries, create release archives/checksums. |

## Persistence, privacy and troubleshooting

Settings/logs use the per-user directory defined by settings.py; `SOUND_MANAGER_DATA` overrides it for tests. Waveforms stay in memory, and these features do not create audio recordings or telemetry. Native microphone capture requires Meter/Listen. Hotkeys do not record typing. Settings save independently of session-only freeze/solo/history. Recovery records preserve owned defaults; do not delete them while routing owns the system output.

No sound: check source playback/destination, Play here, app/native volume/mute, panic mute, Solo and Health. Retry a failed stream explicitly after hardware reconnects. No waveform: enable Waveform, release Freeze and start routing or mic Meter/Listen. Desync: test clicks and delay early outputs; Auto sync may miss codec delay. Missing tray: canonical installed shortcut reopens the existing instance. Old controls/icon: check version and repair installed shortcuts rather than launch an obsolete executable.

Long-session drift, acoustic calibration, live Linux hardware, automatic Wayland registration, virtual microphone delivery and Dolby encoding remain unfinished. VALIDATION.md records actual checks and limits. Update this help in the same change whenever behavior changes, removing/correcting obsolete information.
