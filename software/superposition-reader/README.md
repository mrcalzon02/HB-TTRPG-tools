# SuperPosition Reader (SPR)

**Status:** v0.1 experimental **Windows desktop** prototype. This is a separate native-window application stored inside HB-TTRPG-tools, not a GitHub Pages speech service, and not yet a completed neural audiobook studio.

## Goal

An independent local reader for PDF/TXT/Markdown/DOCX/DRM-free EPUB, with highlighted passages, cached audiobook WAVs, SAPI narration and an independent LuxTTS neural narrator based on the owner's Sphinx voice. Original PDF page rendering, universal word-level alignment, chapter FLAC/M4B and a signed installer are future milestones.

## What v0.1 actually implements

- A private document archive under %LOCALAPPDATA%\SuperPositionReader\books and voice-reference profiles under %LOCALAPPDATA%\SuperPositionReader\voices (Linux test/dev uses XDG_DATA_HOME).
- TXT, Markdown, text-layer PDF via PyMuPDF, DOCX via python-docx, and DRM-free EPUB2/3 extraction in spine order. Short documents use sentences; book-length files use paragraph-respecting speech passages around 420 characters.
- Native Windows single-window app using pywebview and a loopback-only Python HTTP service.
- Existing Windows SAPI 5 voices and optional locally installed SPR LuxTTS neural engine generate cached PCM WAV per passage, keyed by voice/rate/text/engine. The native neural model stays loaded in a persistent owned child process.
- Playback speed, volume, passage skipping, automatic scrolling, saved reading position and consecutive audio playback. Newly generated SPR LuxTTS clips can store independently measured, exact-word ASR timestamps for word highlighting; unmatched words and existing SAPI/Voicebox clips retain honest passage-level highlighting.
- Generate whole book with a single sequential speech worker. Clicking an uncached sentence moves its job ahead of queued chapters; playback can begin before the rest finishes.
- Cancel after the current sentence, preserve completed clips for retry/restart, save reading position in a separate file, and export a combined WAV or ordered chapter-WAV ZIP only when every sentence has matching voice/engine/rate metadata. Mixed-voice exports are rejected.
- Private voice-reference profile creation and local WAV/MP3/FLAC/OGG/M4A or prepared-ZIP import. Compatible prepared reference ZIPs are archived without extracting into the checkout; **archived profiles are not neural models**.
- Optional local Voicebox adapter: when a previously installed Voicebox server is available at 127.0.0.1:17493, SPR can select an existing authorized Voicebox profile and generate narration using Qwen, LuxTTS, or Chatterbox through its documented localhost /v1/audio/speech endpoint. This is an interim option, not an independent bundled model or an automatic SPR voice-profile conversion. No remote/cloud service is contacted. Cached audio can be replayed with Voicebox stopped.
- Windows/Linux regression tests for import/cache/routes with synthetic WAV, real full-story EPUB integration tests, and a separate real CPU LuxTTS neural generation workflow that created two non-silent story narration WAVs.

**Present limitations:** PDF and EPUB display is reflowed text rather than original page rendering. Encrypted EPUBs and scanned-PDF OCR are unsupported. Book highlighting defaults to passages; verified word cues appear only on newly generated neural clips, and are not inferred for mismatched ASR words. Two genuinely synthesized Sphinx story clips exist and passed non-silent WAV checks, but voice quality and real playback on the owner's Windows RTX 5070 are not yet audited. The independent LuxTTS model requires an optional user-initiated first-time download and setup. Single-WAV export deliberately refuses incomplete or mixed-voice books and output larger than 3.8 GB; chapter WAV ZIP export uses real EPUB spine boundaries, keeps each WAV under that limit and supports ZIP64.

## Portable Windows executable preview (GitHub Actions)

A separate [Windows portable preview workflow](../../.github/workflows/spr-windows-portable.yml) attempts to build a bundled application without a separate Python installation. It runs the headless regression tests, PyInstaller, and a packaged executable self-check before uploading a **SPR-Windows-portable-preview** build artifact to [GitHub Actions](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/workflows/spr-windows-portable.yml). Download and extract the ZIP from a successful workflow run, then launch SuperPositionReader.exe. It is **not** an MSI or a verified Windows release; WebView2 and available installed SAPI voices are still host requirements. Avoid claiming a downloadable artifact until its workflow run is confirmed successful.

A verified Windows portable build exists in GitHub Actions. Extract its ZIP and start SuperPositionReader.exe; the GUI loads the four real ebooks and the Sphinx reference profile by default. The Voice Studio contains two actual generated Sphinx previews (Oaks and Nowhere King). To enable new neural narration without Voicebox, run Setup-Sphinx-Neural-Voice.cmd in the extracted program folder; this explicitly installs Python/torch/LuxTTS dependencies into private local application data and needs Python 3.11, Git and initial internet access. Restart SPR afterward. The source-stage installer below remains an alternative.

## Install (Windows 11; Python 3.10+)

From a local checkout of HB-TTRPG-tools, open PowerShell and run:

    powershell -NoProfile -ExecutionPolicy Bypass -File .\software\superposition-reader\install-windows.ps1 -RunAfterInstall

This creates a **per-user** venv under %LOCALAPPDATA%\SuperPositionReader\.venv, downloads PyMuPDF/python-docx/pywebview once, verifies imports, creates a "SuperPosition Reader" Start Menu shortcut and optionally launches a window. The installer does not install language models, remove other voice tools, alter antivirus settings, enable network listening, or send samples anywhere. First setup needs internet for Python packages; after installation the SAPI reader is offline.

To remove just its Start Menu shortcut:

    powershell -NoProfile -ExecutionPolicy Bypass -File .\software\superposition-reader\install-windows.ps1 -Uninstall

This intentionally preserves user documents, generated narration, references and venv.

If Python is already installed and dependencies are available:

    python software/superposition-reader/spr_app.py

For UI diagnostics (server and browser without pywebview), use:

    python software/superposition-reader/spr_app.py --browser

In --browser mode the terminal controls the server lifetime; do not expose its loopback port or bind to public interfaces.

## Canonical starter library and verified Sphinx recordings

- Permanent story EPUB archive: https://github.com/mrcalzon02/HB-TTRPG-tools/tree/main/software/superposition-reader/books/snapshot-2026-11-03
- Four current books: Beneath Dappled Oaks Chapters 1-30, and Nowhere King Season 1 (32 episodes), Season 2 (32), Season 3 current through Episode 18.
- Exact public original Sphinx MP3: assets/voice/sphinx-original.mp3 (SHA-256 ce4c621e3587b9a7f6fd1b6237433f779fa4b8ffb1bae4154ae6739da0362cd2).
- Actual corrected Sphinx narration previews: `assets/voice/sphinx-bdo-opening.wav` and `assets/voice/sphinx-nowhere-opening.wav`. The earlier preview files were replaced after the owner identified a preemptive opening cutoff. A first-word-safe LuxTTS process now generates a disposable natural-language lead-in, validates the *requested* first three words with independent English faster-whisper ASR, trims only at an observed boundary while keeping 600 ms of pre-onset audio, and verifies again after trimming.
- Successful corrected real-neural trial: https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41745821792. Its QA transcription found `There should have been 43 of them.` (80% literal token similarity because the recognizer normalizes the number) and `The first report of the morning concerned what the king had eaten.` (100% match), with no unwanted opening word. This verifies content, **not** perfect timbre or the owner's subjective listening experience.
- Exact reviewed-output file hashes are locked in `spr_voice_assets.py`; both source regression tests and the packaged executable smoke check reject old or substituted WAVs. The prior 2026-11-03 audio version must not be redistributed as repaired.
- Previous uncorrected trial (historical only): https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41734439169
- Successful story ebook workflow: https://github.com/mrcalzon02/HB-TTRPG-tools/actions/workflows/spr-story-snapshot.yml
- Windows portable build: https://github.com/mrcalzon02/HB-TTRPG-tools/actions/workflows/spr-windows-portable.yml

Run the optional neural installer in the source checkout with:

    powershell -NoProfile -ExecutionPolicy Bypass -File .\software\superposition-reader\install-neural-windows.ps1

For CPU-only model setup, append -CpuOnly. Running this script is explicit and is not necessary to read the example ebooks or audition the bundled completed WAVs.

## Tests

From the repository root:

    python -m unittest discover -s software/superposition-reader/tests -p "test_*.py" -v

No packages beyond the Python standard library are required for the headless core tests. These do **not** count as Windows SAPI, GUI, PDF, or real voice-cloning verification.

## Privacy and data separation

This GitHub repository is public. **The owner expressly authorized publication of the Sphinx recording and its synthesized demonstration clips**, which are preserved under assets/voice. Four canonical original-story EPUB snapshots are also committed under books/snapshot-2026-11-03. Other imported books, personal recordings, model weights, generated audiobooks, private text and credentials must remain in LOCALAPPDATA unless the owner separately authorizes publication.

The host binds only 127.0.0.1 at an ephemeral port and requires matching Host/Origin for requests; it has no authentication and is intended for the trusted same-user desktop. There are no cloud calls in the runtime. Do not expose the server or permit untrusted browser sessions to control it. There is no installable standalone EXE/MSI yet; the PowerShell helper installs from a local checkout.

## Component decisions / open source

- Windows native window: pywebview (BSD) with the system's WebView2 runtime.
- Document extraction: PyMuPDF (AGPL/commercial), python-docx (MIT).
- Voice-reference archive: standard-library local storage, file-header validation, hashes, and ZIP size/path checks; import does not train a model.
- Synthesizers: Windows SAPI5; independent optional SPR LuxTTS with local stored Sphinx voice profile; optional separate Voicebox localhost adapter. When SPR's neural environment is installed, SPR selects it and the Sphinx profile by default.
- Audio: local WAV cache with HTML audio playback, no cloud.
- Independent neural synthesis: LuxTTS, optional user-installed isolated Python model runtime, persistent child process. Qwen3-TTS and Chatterbox are future alternative engines; Voicebox is optional, not required.
- Proposed display evolution: PDF.js original page view + optional forced alignment beyond independent ASR-matched neural words; EPUB via Epub.js; OCR via Tesseract.
- A Windows portable ZIP workflow has passed its packed executable smoke tests, including all bundled canonical EPUBs and Sphinx source. The latest GUI-only build remains subject to exact-run verification; a signed MSI is not yet available.

## Milestones and objective acceptance

1. **v0.1 foundation (source staged):** Import a TXT document, synthesize with SAPI, highlight sentence during playback, save audio, close and reopen without regenerating completed clips. Verify on actual Windows hardware before promoting.
2. **Document fidelity:** PDF.js page rendering, mapping between text, audio and page coordinates, EPUB visual rendering, DOCX improvements and scanned-PDF OCR.
3. **Own voice:** First CPU LuxTTS Sphinx clone from the committed source has succeeded on GitHub Actions; two sample WAVs are archived and playable. Next benchmark local CUDA on RTX 5070 12GB, voice quality, and entire chapter generation.
4. **Production pipeline:** prebuffer, persistent generation queue, expanded coverage for measured word cues, quality checks, correction/regeneration, chapter FLAC and M4B. Chapter WAV ZIP export is implemented.
5. **Distribution:** standalone Windows binary installer, private voice pack import/export, durable recovery, regression tests for large books and interrupted jobs.

Only objective failures in loading, running, narration output, progress recovery, document mapping or exports should block functional releases. Cosmetic/style and voice-quality assessments are diagnostic, not standalone build blockers.
