# HB–TTRPG local archive workbench

This application hosts the **existing** local checkout without changing the GitHub Pages site. Its new default mode is a **single native desktop window**: one application owns its HTTP server in a background thread. Closing that window stops the loopback listener, releases port 17861, cancels queued jobs, and terminates an optional Voicebox backend started by this session. There is no independent server daemon, tray process, second browser, or console required for normal use.

## Windows 10/11

Install Python 3.10+ (Python 3.12 recommended), then from the checkout run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\local-hub\install-windows.ps1
```

The installer creates a private per-user virtual environment, installs `pywebview`, and adds **HB-TTRPG Local Workbench** to the Start Menu. That shortcut runs `pythonw.exe`, so only the archive window appears. WebView2 Runtime must be installed (usually already present on current Windows systems). To launch from PowerShell after installation:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\local-hub\start-local-hub.ps1
```

Remove the shortcut without deleting the checkout, Python environment, or private recordings:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\local-hub\install-windows.ps1 -Uninstall
```

## Linux: Ubuntu / Debian / Mint and Fedora

The Linux window uses GTK3 + WebKit2GTK 4.1 through pywebview. Supported installer paths are **Ubuntu 22.04/24.04 and derivatives (including Linux Mint), Debian 12+, and Fedora 43**. Desktop rendering still depends on the system WebKit/GTK stack and an active graphical desktop session; a successful headless test does not guarantee every graphics driver works.

From the repository checkout, run one of these:

```bash
# Ubuntu / Debian / Mint: installs native distro GUI prerequisites with apt
bash tools/local-hub/install-linux.sh --deps

# Fedora: same command; auto-detects Fedora and uses dnf
bash tools/local-hub/install-linux.sh --deps

# If GTK/WebKit and python3-venv are already installed:
bash tools/local-hub/install-linux.sh
```

The installer creates `~/.local/share/hb-ttrpg-tools/desktop-venv` (or `$XDG_DATA_HOME/hb-ttrpg-tools/desktop-venv`), uses the distro's PyGObject packages, installs the pywebview GTK integration, and adds a desktop-app menu entry. Start it from your application menu or:

```bash
bash tools/local-hub/start-local-hub.sh
```

Remove only the application menu entry with `bash tools/local-hub/install-linux.sh --uninstall`. The Linux private narration directory defaults to `~/.local/share/hb-ttrpg-tools/voicebox-production/private` or its `$XDG_DATA_HOME` equivalent.

## Process ownership and crash behavior

- One GUI window owns one in-process localhost HTTP server, bound to `127.0.0.1` only. No independent service is installed.
- Port binding is a single-instance guard. A second launcher fails without terminating or attaching to another process. Change ports with `--port` in `desktop.py` or `start-local-hub.sh`, or `-Port` in the Windows launcher.
- Normal window close triggers server shutdown, stops the HTTP thread, and cleans up this session's optional Voicebox subprocess. An already-running *external* Voicebox is not owned or terminated by the archive.
- A crashed or forcibly killed GUI process cannot retain its internal HTTP thread; the OS releases its socket. A forced kill during *externally spawned voice inference* is less predictable, so do not equate this with a guarantee about unrelated external services.
- If you close the GUI while a voice job is in flight, the session ends rather than waiting through an extended inference timeout. Incomplete jobs may need to be submitted again; previously generated private files are not deleted.
- The original headless server is still available for diagnostics with Windows `start-local-hub.ps1 -NoBrowser`, or by running `server.py --private /safe/private/dir` with Python 3.10+.

## Verification

```bash
python -m unittest discover -s tools/local-hub/tests -p "test_*.py" -v
```

CI checks the Python routes and fake-GUI lifecycle on Windows, Ubuntu 22.04, Ubuntu 24.04, and Fedora 43. It checks Linux shell syntax and parses Windows PowerShell launchers. These are **headless tests**; actual window rendering and speech synthesis still need hands-on host verification.

**Scope:** Archive navigation, original pages, and Narration Studio are reused unchanged. Some externally hosted services and optional AI engines still require their own installations or online APIs. Private audio is kept outside the Git checkout and is never automatically uploaded.

## Private narration


The Narration studio tab detects Voicebox at localhost:17493. When present, it can reuse the engine previously installed under `%LOCALAPPDATA%\HB-TTRPG-tools\voicebox-production\source\voicebox`. If you have not completed its installation or created a consented voice profile, the rest of the archive still works.

Choose an existing profile, model, safe project ID, and 1–300 narration lines. Each line may be written as `event-key | spoken words`, or as plain text for automatic numbered IDs. Jobs run **one at a time**, never competing for inference memory. Results remain under `%LOCALAPPDATA%\HB-TTRPG-tools\voicebox-production\private\generated\<run-id>`. Each completed run contains `clips/*.wav`, `audition.wav`, `manifest.json` with SHA-256 checksums, and a review ZIP for manual export. Output always requires an auditory review before release.

The same renderer is callable directly with the installed Python interpreter:

    py -3.12 .\tools\voicebox\narration_batch.py --manifest C:\Private\narration.json --output C:\Private\narration-output-001

Example input (fictional profile ID):

~~~json
{
  "project": "campaign-intro",
  "voice": "YOUR_EXISTING_LOCAL_VOICEBOX_PROFILE_ID",
  "engine": "luxtts",
  "lines": [
    {"id": "intro", "text": "Welcome aboard."},
    {"id": "mission", "text": "Your journey begins here."}
  ]
}
~~~

**Security model:** This is a trusted-user **localhost-only** application. The server binds to 127.0.0.1, checks Host, checks Origin for writes, denies path traversal/dotfiles/private directories, and never accepts arbitrary output paths via the web API. No user audio, voice model, credentials, or browser-uploaded samples are stored inside the public Git checkout. Do not expose or port-forward the service.

## Verification

Run the offline tests from the repository root:

    python -m unittest discover -s tools/local-hub/tests -p "test_*.py" -v

Tests use fake WAVs and temporary directories, not real voice samples, and do not perform cloud or external-model inference. Passing them establishes routing and package logic, not successful real voice synthesis on your Windows hardware.

**Known installation blocker:** The previous Windows Voicebox installer emitted a generic pip error about building requirements from `pyproject.toml`. The screenshot did not identify which dependency failed, so the exact wheel-build failure is not yet resolved. The local archive runs regardless; inspect the full pip build log to diagnose the package before further installer changes.

## Legacy Windows installation notes (superseded by the single-window app)

To add a convenient **Start Menu shortcut** without installing a Windows service or altering the public website, run:

    powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\local-hub\install-windows.ps1

Launch **HB-TTRPG Local Workbench** from the Start Menu. The current shortcut launches the native window with no separate console or browser. Closing the window stops the internal server. To remove only the shortcut (preserving your private audio, models and checkout):

    powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\local-hub\install-windows.ps1 -Uninstall

The shortcut points to the same local checkout from which it was installed. Moving that checkout requires running the installer again. No Windows service, scheduled task, cloud credential, or antivirus exception is created.

## Recent local crash recovery

The optional Voicebox backend can fail without taking down the archive. When Python inference dependencies are incomplete, the local site still opens and the Narration Studio explains the engine problem. Voicebox startup logs are local under the private workspace; the NUTBUSTER setup now preserves verbose pip dependency logs in the private diagnostics folder to identify the package responsible for the earlier pyproject wheel-build failure. Its exact upstream dependency is not yet verified.

## Repairing incomplete Voicebox dependencies

If the Narration Studio reports `uvicorn` missing, the archive is working but Voicebox's Python environment is incomplete. From the checkout root:

    git pull --ff-only
    powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\voicebox\repair-local-backend.ps1

The helper reuses the existing Python 3.12 venv, Torch installation and cached models. It installs missing HTTP dependencies, checks the **actual** Voicebox backend import, and resumes the upstream requirement installation only if necessary. Detailed pip build reports stay in `%LOCALAPPDATA%\HB-TTRPG-tools\voicebox-production\private\diagnostics\`. No audio, credentials or model files are uploaded. When repair succeeds, close and relaunch the workbench; `-DiagnoseOnly` checks without installing.

### English-only Windows dependency profile

The shared Voicebox installer now uses **Misaki English only** instead of installing Japanese or Chinese pronunciation modules. This removes the `pyopenjtalk` build requirement causing the recent Windows error. It uses a private generated requirements file and keeps the original Voicebox Git checkout, PyTorch, model cache and narration files unchanged. After pulling the latest commit, rerun `tools/voicebox/repair-local-backend.ps1` to resume without a full reinstall.

The workbench remains usable if the optional speech engine has not yet passed backend import checks.

## Drop files directly into the Narration Studio

In the installed localhost workbench, select **Narration studio**. Drop a WAV,
MP3, M4A, FLAC or OGG owner-authorized voice sample into the first panel, then
a TXT, Markdown, CSV or DOCX script into the second. Alternatively type/paste
up to 300 narration lines. The preferred line syntax is
event-key | words to speak; ordinary lines receive automatic identifiers.
You may also choose a previously prepared private reference or an existing
Voicebox profile. No transcription is required for LuxTTS: the model encodes
and transcribes its reference audio itself. If provided, a manual reference
transcription should reflect the actual recording.

**Click Create voice and generate locally.** The server creates the profile
if absent, imports a short 24-kHz mono reference (automatically trimming long
recordings to approximately 20 seconds), loads only LuxTTS, and queues the
speech generation sequentially. Production history shows the job status and,
after completion, a manual download of the review ZIP, composed audition WAV,
individual WAV clips and manifest. The actual audio stays in the private
LOCALAPPDATA production directory. No cloud uploads, no extra GUI framework,
no foreign voice samples and no repository audio commits.

The browser sends files only to the server bound to 127.0.0.1. A consent
checkbox is required before creating or using a cloned profile. Scripts have
an 8 MB upload limit, voice samples 45 MB, the whole request 52 MB. Other
document formats can first be exported to TXT, CSV or DOCX. A real synthesis
run still requires compatible model weights, which LuxTTS downloads locally
on initial load if absent.
