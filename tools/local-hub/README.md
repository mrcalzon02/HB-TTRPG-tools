# HB–TTRPG local archive workbench

This optional Windows-local web interface **serves the existing checkout**, including all its HTML pages and static assets, without replacing the GitHub Pages site. It adds a local narration studio backed by a previously installed Voicebox service. **No Google Drive access, OAuth flow, cloud upload or repository audio commit exists in this workbench.**

## One-command start

From your checked-out HB-TTRPG-tools folder, run:

    powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\local-hub\start-local-hub.ps1

The console opens http://127.0.0.1:17861/__local/ and runs until you press Ctrl+C. Requires Python 3.10 or newer (prefer Python 3.12); does not need the Voicebox model merely to browse archived tools. To change the port use `-Port 17862`; to suppress opening a browser use `-NoBrowser`. Do not run this on a public-facing machine or forward the ports.

The archive explorer links to existing local pages and serves static files from this checkout. Individual external-service integrations and backends still require their own upstream dependencies; simply hosting the static archive does not emulate online APIs or make every service work offline.

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

## Per-user Windows installation

To add a convenient **Start Menu shortcut** without installing a Windows service or altering the public website, run:

    powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\local-hub\install-windows.ps1

Launch **HB-TTRPG Local Workbench** from the Start Menu. It starts a console and browser; closing the console stops the local server. To remove only the shortcut (preserving your private audio, models and checkout):

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
