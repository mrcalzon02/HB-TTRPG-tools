# Owner-voice NUTBUSTER batch (self-hosted GitHub Actions)

**Primary source:** The owner's 81.996-second personal recording, For those not yet born.wav, supplied directly in ChatGPT on 2026-10-24 with explicit permission to reproduce the owner's own voice. Preserve the original recording unchanged and privately. Three shorter 24 kHz mono segments (owner-primary-01.wav, owner-primary-02.wav, owner-primary-03.wav) of approximately 20 seconds each were prepared from it.

**Secondary sources:** All 19 *original announcer* MP3 files from mrcalzon02/NUTBUSTER-R, verified against assets/audio/catalog.json and grouped into short Voicebox reference montages. Grunts, SFX and music are intentionally excluded. They are not the primary voice reference.

**Scripts:** The 74 additional Original Hype Man lines already in NUTBUSTER-R/docs/wiki/Announcer-Expansion-Script.md. The 93 Nutvale Auditor lines belong to a different character and must not replace the Original scripts. Six first-pass review lines: start-first, new-nut, match-five, last-move, elemental-trigger and fish-legendary.

## Preparation of a private runner

1. Set up a trusted **self-hosted Linux** GitHub Actions runner, labeled voicebox, on hardware you control. The workflow has ONLY a manual dispatch trigger (no PR, push or other untrusted events). A standard GitHub-hosted runner is not used because it cannot read your privately stored voice WAV, retain a clone profile, or reliably run a GPU voice model.
2. On that runner, install Python 3.12, Bun, Rust/Cargo, just, FFmpeg and other upstream Voicebox prerequisites. Clone https://github.com/jamiepine/voicebox into a private persistent directory and execute just setup. Pre-download the selected cloning engine (default: luxtts) and Whisper-small, and make sure the backend virtualenv exists at backend/venv/bin/python.
3. Place the three generated, user-provided reference WAV segments in a private directory OUTSIDE either public repository, such as /var/lib/voicebox-private/owner-references. Protect filesystem permissions. Do not commit or publicly upload the original WAV, reference segments, reference transcripts or reusable cloned profile.
4. In the HB-TTRPG-tools repository Actions configuration, set variables VOICEBOX_REFERENCE_DIR to that absolute private folder, VOICEBOX_SOURCE_DIR to the absolute Voicebox checkout directory, and VOICEBOX_OUTPUT_DIR to a pre-created *private persistent* output folder on the runner (for example /var/lib/voicebox-private/generated).
5. Manually run Actions > Voicebox NUTBUSTER Owner Voice > Run workflow, starting with scope=preview. Later choose all to generate 74 new Original-announcer lines after hearing the previews. Models may have additional licensing restrictions; MIT applies to the Voicebox application, NOT necessarily its weights.

The job starts a temporary Voicebox server bound to 127.0.0.1:17493 if one is not already running, reuses/creates an authorized local voice profile, transcribes references through Voicebox Whisper, and generates MP3 through its OpenAI-compatible endpoint. It stops a server it started without terminating a pre-existing personal session.

Outputs intentionally remain local on the runner under VOICEBOX_OUTPUT_DIR/RUN_ID. No audio upload or publishing is performed. This persistent private directory avoids automatic cleanup of the runner temporary directory. Generated clips do NOT overwrite NUTBUSTER-R assets or become playable until separately approved, installed, and tested on an actual device.

## Local validation

Run this in a checkout of HB-TTRPG-tools, with a checkout of NUTBUSTER-R next to it:

    python3 tools/voicebox/nutbuster_batch.py --nutbuster ../NUTBUSTER-R --references /path/to/private/owner-references --dry-run

This validates the exact 74-script / 19-recording inputs and 3 private WAVs without running the clone model. A real end-to-end synthesis run, hardware timing, Whisper transcript quality, audio quality and actual game integration remain separate acceptance gates.

Upstream: https://github.com/jamiepine/voicebox

## Composition stage: per-clip normalization, audition reel and validation

The manually dispatched workflow runs composition tests using generated test tones, then invokes [compose_nutbuster.py](compose_nutbuster.py) after Voicebox finishes the selected six-line preview or all 74 Original-announcer additions. This is a separate authoring/review stage, NOT an automatic NUTBUSTER-R game update.

The composer re-reads the 74-line Original script, enforces exact event IDs and text for the chosen scope, verifies every rendering against its source manifest SHA-256 and size, rejects unexpected/extra/missing keys and audio that cannot be decoded, then transcodes each selected take to 44.1 kHz mono MP3 at 128 kbps with a target of -17 LUFS and -2 dBTP. Its output is written to a separate private directory and existing takes are never overwritten.

Private runner output: VOICEBOX_OUTPUT_DIR/<run-id>-composed/clips/<event-key>.mp3, an ordered audition.mp3 separated by brief silence, and composition.json containing original/rendered hashes, output hashes, encoding details, script text, engine, and status needs-auditory-review. It does not export the uploaded WAV or cloned voice profile, publish GitHub artifacts, replace the game's original 19 MP3s, or mark outputs as approved.

After listening to the audition reel, approve the playable event clips individually, test clarity against music on a real device, and create a SEPARATE NUTBUSTER-R change to connect the 74 still-unwired events. Use the established event keys rather than adding a substitute text-to-speech player to the game.

Developer test command (uses synthetic audio; no owner recording):

    python3 -m unittest discover -s tools/voicebox/tests -p 'test_*.py' -v

Manual composition of a completed private render folder:

    python3 tools/voicebox/compose_nutbuster.py --nutbuster ../NUTBUSTER-R --rendered /private/renders/<run-id> --output /private/renders/<run-id>-composed --scope preview

The original uploaded audio remains private. Actual model quality, source transcription fidelity and Android playback are still real-world acceptance gates.
