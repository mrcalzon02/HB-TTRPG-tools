# Simple Sound Manager

A local desktop app for Windows 10/11 and Linux. No subscription, account, browser server, ads, or telemetry. The manager's source is MIT licensed.

## Controls

Version 0.6 adds stable-reconnect recovery, a chosen backup output, explicit Retry selected, and bounded recovery after capture/service failures. Reconnection requires a device to disappear and then remain available for six seconds; attempts have a thirty-second cooldown and a three-attempt limit per five minutes. A failed device that merely stays listed is not repeatedly reopened. Manual Stop or Cancel retry cancels recovery. Startup/service availability is retried for a bounded period; persistent failures display a manual retry option. Resume notifications request delayed recovery on Windows and Linux systems with logind/QtDBus support.

Choose a **Backup output** under Timing / layout. It is used only if selected outputs fail, and does not overwrite your saved selection. Microphone processing is restarted only if its Meter/Listen setting was already enabled.

Windows shortcuts now use a stable launcher at the main install path. The launcher opens the current release, rather than a stale old executable. The installer repairs matching desktop/Start Menu/taskbar shortcuts and updates login startup to the stable entry. The version is displayed in the window title and heading.

Version 0.5 adds **Mute all outputs** and **Mute all microphones** in the window and tray. Restore returns devices to their previous mute states, so an already-muted device stays muted. Output panic mute also silences the processing path without reopening streams. The group mute remains in force for newly connected devices and survives an app restart. `Ctrl+Alt+P` and `Ctrl+Alt+M` operate these controls while the manager window is active; these are not desktop-wide hotkeys yet.

Use **Pin** to put a device first, **Rename** for a friendly label, and the search box to filter devices. The driver names and IDs are preserved. The default view keeps volume, EQ, and waveforms compact; **Timing / layout** reveals the delay and multichannel controls.

EQ **Undo/Redo** keeps up to 50 states for each device during the app session, including profile loads and reset. Rapid changes to one slider form one editing step. Waveforms display peak hold, smoothed RMS level in dBFS, and samples that hit the EQ peak guard. Double-click a waveform to clear its peak/clip hold. These levels describe the processed stream before the OS endpoint's volume control.

**System audio layout** selects Auto, Mono, Stereo, Quad, 5.1, 7.1, or 7.1.4 PCM. Auto follows the channel count of the selected hardware. Each output's Playback layout can retain native channels or downmix. Modes beyond its configured channel count are disabled. Configure real surround hardware in the operating system first. Stereo sources keep their original front channels; extra speakers are not artificially filled. Center/surround/height signals are folded when necessary, with headroom; LFE is not dumped into ordinary stereo speakers.

Windows multichannel capture uses the cable's multichannel endpoint and temporarily sets its PCM format; the original format is restored on Stop/Quit. Linux creates a null sink with an explicit channel map. Mono capture can use a stereo device with a software mono mix. Layouts are live PCM channel arrangements, not Dolby codec encoders. Dolby Digital/Plus/TrueHD/AC-4 bitstreams and Atmos object metadata are not preserved by a normal mixed PCM loopback. An external player may decode supported content to PCM before routing. Real Atmos delivery requires a compatible spatial/encoded output integration and hardware; a 7.1.4 PCM label alone does not mean Dolby Atmos support. Common receivers may require an encoded/spatial route for height channels rather than accepting 12-channel PCM.

The main EQ view is a classic 15-band sound balancer from 25 Hz to 16 kHz, grouped into sub bass, bass, mids, and treble/brilliance. Separate **Bass**, **Mid**, and **Treble** sliders provide broad tone adjustment. Every input and output has its own Equalizer button and settings. The earlier ten-band and parametric controls remain in additional tabs so existing adjustments are preserved.

Each device card displays a rolling three-second waveform of its processed stream. Output waveforms update while routing runs. Turn **Meter** on for a microphone waveform without hearing it, or use **Listen** to monitor the microphone through the selected outputs. Microphone EQ applies to the stream processed here; it does not replace other apps' direct microphone input. Bluetooth microphone capture can put a headset into call mode, so Meter and Listen remain off by default. The waveform history is a bounded in-memory envelope and is never written as an audio recording.

* Pick any combination of connected outputs with **Play here**, then **Start multi-output audio**.
* Each selected output has precise ten-band graphic EQ (±24 dB, 0.1 dB steps), plus up to 24 parametric filters: peaks, low/high shelves, low/high passes, and notches. Each filter has frequency, gain, bandwidth/Q, and an enabled switch.
* Preamp, stereo balance, EQ bypass, a response curve, automatic headroom, and a final peak guard help tune each output. Save named profiles, import/export JSON profiles, or copy EQ to another output without changing its selection or delay.
* Set output and microphone volume, mute, and default device from the same window.
* Close the window to keep routing in the tray. Use the tray menu to toggle outputs or quit.
* EQ, output selection, and delays survive restarts. Routing starts automatically when you open the app by default. Turn **Start sound automatically** off if you prefer manual control.
* **Start at login** is optional. It registers the app for your user account on Windows or creates an XDG desktop autostart entry on Linux. It opens in the tray where available, then routes audio automatically. Disable the checkbox to remove that entry.
* Each output has a 0–2000 ms delay slider. Add delay to devices that play early; a device that already plays late cannot be advanced, so delay the other devices to match it.
* **Auto sync** estimates compensation from driver-reported stream latency for active outputs and monitored inputs. It does not measure acoustic arrival times, and Bluetooth codec latency may not be included in the driver's report. Use the sliders for final listening adjustments.
* Stop or Quit restores the previous default output. On reopening after a crash, the app attempts to restore the recorded defaults.
* A failed output stays paused until you turn Play here off and on. Device polling does not repeatedly reopen failed Bluetooth streams. Healthy outputs keep playing.
* The signal status distinguishes received system sound from a silent capture bus.

**Play here** controls routed audio. **Mute** and volume control the real system endpoint, even when routing is stopped. Equalization affects audio passing through this app; it does not install system effects on every hardware endpoint. Input controls cover volume, mute, default microphone, optional **Listen** monitoring, and monitoring delay. Monitoring is off by default. Use headphones when monitoring microphones to avoid acoustic feedback. The input delay applies to monitoring inside this app; recording/voice apps still use their own input paths. A processed virtual microphone and microphone EQ are not implemented.

## Windows installation

Run `Install.cmd` from the source folder, or run `install-windows.ps1`. It builds the app if necessary, installs it under your user account, adds a Start Menu shortcut, and opens it. Python 3.11 or newer is needed to build from source. A previously built `dist/SimpleSoundManager` folder can be installed without Python.

Updates install in a separate release folder. If the manager is already running, installation leaves its playback untouched and updates the Start Menu shortcut for your next launch. Quit the old version through its tray menu before opening the update.

For multi-output audio and EQ, click **Windows audio setup** once. This downloads and runs the original signed **VB-CABLE** installer directly from [VB-Audio](https://vb-audio.com/Cable/index.htm); Windows asks for administrator permission. Wait until the app reports setup finished, then restart Windows. Reopen Simple Sound Manager, select outputs, and click Start. The manager itself does not need administrator rights.

VB-CABLE is third-party donationware from **www.vb-cable.com**; all participations are welcome. The base download is available without purchasing a paid cable pack. Its license is separate from this app. See [VB-Audio's terms](https://vb-audio.com/Services/licensing.htm), especially for professional use. It is installed separately and is not bundled in this repository's app binaries.

The driver provides a silent virtual speaker. This app captures that speaker's stream, equalizes it separately for each destination, and sends it to the enabled real outputs. It never routes the stream back to its capture speaker.

Apps that explicitly choose their own output or use exclusive/ASIO mode can bypass the manager. Choose **CABLE Input** or the system default inside those apps. Some already-running apps need playback restarted when Windows changes the default device. When routing stops, existing apps that remain on CABLE Input may also need playback restarted.

## Linux installation

Run `bash install-linux.sh` as your regular desktop user. Open **Simple Sound Manager** in the applications menu afterward. It creates a private Python environment and uses the existing PipeWire-Pulse or PulseAudio server to create its routing bus when you click Start. It removes the bus on a clean stop.

Prerequisites: Python 3.11+, venv/pip, `pactl`, `libpulse`, and a working desktop Qt environment. On Debian/Ubuntu, install `python3-venv`, `pulseaudio-utils`, `libpulse0`, and the normal Qt/XCB system libraries for your desktop. On Fedora/Arch use the equivalent distro packages. Existing playback streams on the previous default output are moved to the bus; apps explicitly assigned elsewhere keep that assignment. Pure ALSA/JACK setups without PulseAudio compatibility are not supported.

GNOME desktops without a tray extension keep the window visible; closing it stops and quits. Linux audio routing is implemented and covered by backend tests but has not been tested against live Linux hardware in this workspace.

## Build / check

Windows: `powershell -ExecutionPolicy Bypass -File build.ps1`.

Development: install `requirements.txt` in a virtual environment, run `python run.py`, and run `python -m unittest discover -s tests -v`.

Read-only device inventory: `python run.py --probe`.

Offscreen preview using real device names: `python run.py --screenshot preview.png`.

The Windows distribution keeps its shared libraries beside the executable so the Qt libraries can be replaced. Build scripts collect dependency license notices. Source and scripts must accompany any redistributed binary; consult `THIRD-PARTY-NOTICES.md`.

## Practical limits

The routing engine processes PCM at 48 kHz and adapts named channels to each output. Different physical devices and Bluetooth codecs have different latency; the saved delays provide manual compensation, but synchronization may vary with connection or codec changes. Output queues are bounded to prevent delayed audio building up indefinitely, and failures are isolated to the affected output.

Settings live in `%LOCALAPPDATA%/SimpleSoundManager` on Windows and `$XDG_CONFIG_HOME/SimpleSoundManager` (usually `~/.config/SimpleSoundManager`) on Linux. The `SOUND_MANAGER_DATA` environment variable overrides that location for isolated checks.

Uninstall the Windows app by deleting its `Programs/SimpleSoundManager` directory and Start Menu shortcut after quitting. Uninstall VB-CABLE separately using its official setup program (administrator rights and a reboot required). Linux: quit, then remove the app's user-local directory, launcher, and desktop entry. Saved settings can be kept or deleted separately.
