# Owner-voice NUTBUSTER batch (self-hosted GitHub Actions)

**Primary source:** The owner's 81.996-second personal recording, For those not yet born.wav, supplied directly in ChatGPT on 2026-10-24 with explicit permission to reproduce the owner's own voice. Preserve the original recording unchanged and privately. Three shorter 24 kHz mono segments (owner-primary-01.wav, owner-primary-02.wav, owner-primary-03.wav) of approximately 20 seconds each were prepared from it.

**Secondary sources:** All 19 *original announcer* MP3 files from mrcalzon02/NUTBUSTER-R, verified against assets/audio/catalog.json and grouped into short Voicebox reference montages. Grunts, SFX and music are intentionally excluded. They are not the primary voice reference.

**Scripts:** The 74 additional Original Hype Man lines already in NUTBUSTER-R/docs/wiki/Announcer-Expansion-Script.md. The 93 Nutvale Auditor lines belong to a different character and must not replace the Original scripts. Six first-pass review lines: start-first, new-nut, match-five, last-move, elemental-trigger and fish-legendary.

## Preparation of a private runner

1. Set up a trusted **self-hosted Linux** GitHub Actions runner, labeled voicebox, on hardware you control. The workflow has ONLY a manual dispatch trigger (no PR, push or other untrusted events). A standard GitHub-hosted runner is not used because it cannot read your privately stored voice WAV, retain a clone profile, or reliably run a GPU voice model.
2. On that runner, install Python 3.12, Bun, Rust/Cargo, just, FFmpeg and other upstream Voicebox prerequisites. Clone https://github.com/jamiepine/voicebox into a private persistent directory and execute just setup. Pre-download the selected cloning engine (default: luxtts) and Whisper-small, and make sure the backend virtualenv exists at backend/venv/bin/python.
3. Place the three generated, user-provided reference WAV segments in a private directory OUTSIDE either public repository, such as /var/lib/voicebox-private/owner-references. Protect filesystem permissions. Do not commit or publicly upload the original WAV, reference segments, reference transcripts or reusable cloned profile.
4. In the HB-TTRPG-tools repository Actions configuration, set variables VOICEBOX_REFERENCE_DIR to that absolute private folder and VOICEBOX_SOURCE_DIR to the absolute Voicebox checkout directory on the runner.
5. Manually run Actions > Voicebox NUTBUSTER Owner Voice > Run workflow, starting with scope=preview. Later choose all to generate 74 new Original-announcer lines after hearing the previews. Models may have additional licensing restrictions; MIT applies to the Voicebox application, NOT necessarily its weights.

The job starts a temporary Voicebox server bound to 127.0.0.1:17493 if one is not already running, reuses/creates an authorized local voice profile, transcribes references through Voicebox Whisper, and generates MP3 through its OpenAI-compatible endpoint. It stops a server it started without terminating a pre-existing personal session.

Outputs intentionally remain local on the runner under RUNNER_TEMP/voicebox-owner/RUN_ID. No audio upload or publishing is performed. A runner might clear RUNNER_TEMP after the job: copy approved takes to a secure persistent folder on the runner manually before cleanup. Generated clips do NOT overwrite NUTBUSTER-R assets or become playable until separately approved, installed, and tested on an actual device.

## Local validation

Run this in a checkout of HB-TTRPG-tools, with a checkout of NUTBUSTER-R next to it:

    python3 tools/voicebox/nutbuster_batch.py --nutbuster ../NUTBUSTER-R --references /path/to/private/owner-references --dry-run

This validates the exact 74-script / 19-recording inputs and 3 private WAVs without running the clone model. A real end-to-end synthesis run, hardware timing, Whisper transcript quality, audio quality and actual game integration remain separate acceptance gates.

Upstream: https://github.com/jamiepine/voicebox
