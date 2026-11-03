# SuperPosition Reader (SPR)

**Status:** v0.1 experimental **Windows desktop** prototype. This is a separate native-window application stored inside HB-TTRPG-tools, not a GitHub Pages speech service, and not yet a completed neural audiobook studio.

## Goal

An independent, fully local reader: import PDF/TXT/Markdown/DOCX/DRM-free EPUB, maintain a private document library, synthesize document narration with owned/authorized voice profiles, track spoken text in the document, and produce complete reusable audiobooks. EPUB, original PDF page-layer highlighting, neural voice cloning, word-level alignment, chapter audio, M4B, and production packaging are subsequent milestones.

## What v0.1 actually implements

- A private document archive under %LOCALAPPDATA%\SuperPositionReader\books and voice-reference profiles under %LOCALAPPDATA%\SuperPositionReader\voices (Linux test/dev uses XDG_DATA_HOME).
- TXT, Markdown, text-layer PDF via PyMuPDF, DOCX import via python-docx, and DRM-free EPUB2/3 extraction in spine order using the Python standard library; chunks extracted text into sentences.
- Native Windows single-window app using pywebview and a loopback-only Python HTTP service.
- Existing Windows SAPI 5 voices generate offline PCM WAV files. One reusable WAV per sentence, keyed by voice/rate/text/engine.
- Reading via HTML audio controls with playback speed, volume, sentence skipping, scroll-to-current-sentence and automatic sentence progression.
- Generate whole book with a single sequential speech worker. Clicking an uncached sentence moves its job ahead of queued chapters; playback can begin before the rest finishes.
- Cancel after the current sentence, preserve completed clips for retry/restart, save reading position in a separate file, and export a combined WAV only when every sentence has matching voice/engine/rate metadata. Mixed-voice exports are rejected.
- Private voice-reference profile creation and local WAV/MP3/FLAC/OGG/M4A or prepared-ZIP import. Compatible prepared reference ZIPs are archived without extracting into the checkout; **archived profiles are not neural models**.
- Optional local Voicebox adapter: when a previously installed Voicebox server is available at 127.0.0.1:17493, SPR can select an existing authorized Voicebox profile and generate narration using Qwen, LuxTTS, or Chatterbox through its documented localhost /v1/audio/speech endpoint. This is an interim option, not an independent bundled model or an automatic SPR voice-profile conversion. No remote/cloud service is contacted. Cached audio can be replayed with Voicebox stopped.
- Standard-library headless tests for core and voice-archive paths using **synthetic silent WAV**; no user voice or model is required.

**Present limitations:** EPUB display is reflowed text extracted from the book spine, not the original illustrated/paginated ebook view. Encrypted EPUBs are rejected. PDF display is **reflowed extracted text**, not the original PDF page image; paragraph layout and exact original text positions are not retained. Sentence-level, not word-level, highlighting. No scanner/OCR yet. Voice archives are references-only, not synthesized custom voices. This implementation uses Windows SAPI **not neural cloned voice**; do not mistake a stored voice reference sample for a ready-to-run synthesizer. Launch and audio playback on the owner's real Windows PC have not yet been demonstrated. Windows SAPI starts PowerShell once per generated sentence, which is not yet optimized for large books. Changing the voice/rate requires regeneration to avoid mixed settings. The exporter is standard WAV and intentionally refuses incomplete books or audio >3.8 GB.

## Portable Windows executable preview (GitHub Actions)

A separate [Windows portable preview workflow](../../.github/workflows/spr-windows-portable.yml) attempts to build a bundled application without a separate Python installation. It runs the headless regression tests, PyInstaller, and a packaged executable self-check before uploading a **SPR-Windows-portable-preview** build artifact to [GitHub Actions](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/workflows/spr-windows-portable.yml). Download and extract the ZIP from a successful workflow run, then launch SuperPositionReader.exe. It is **not** an MSI or a verified Windows release; WebView2 and available installed SAPI voices are still host requirements. Avoid claiming a downloadable artifact until its workflow run is confirmed successful.

The local Windows setup helper below remains available if no portable build exists.

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

## Tests

From the repository root:

    python -m unittest discover -s software/superposition-reader/tests -p "test_*.py" -v

No packages beyond the Python standard library are required for the headless core tests. These do **not** count as Windows SAPI, GUI, PDF, or real voice-cloning verification.

## Privacy and data separation

This GitHub repository is public. **Do not commit** user recordings, cloned voices, imported copyrighted books, model weights, generated WAV/FLAC/MP3, metadata with private text, cached credentials or personal document copies here. The scoped .gitignore blocks common formats accidentally placed under software/superposition-reader/, but private data belongs in LOCALAPPDATA, never in the checkout. The original reference WAV/MP3 samples from the conversation are not checked into GitHub and are not automatically installed on any user's machine.

The host binds only 127.0.0.1 at an ephemeral port and requires matching Host/Origin for requests; it has no authentication and is intended for the trusted same-user desktop. There are no cloud calls in the runtime. Do not expose the server or permit untrusted browser sessions to control it. There is no installable standalone EXE/MSI yet; the PowerShell helper installs from a local checkout.

## Component decisions / open source

- Windows native window: pywebview (BSD) with the system's WebView2 runtime.
- Document extraction: PyMuPDF (AGPL/commercial), python-docx (MIT).
- Voice-reference archive: standard-library local storage, file-header validation, hashes, and ZIP size/path checks; import does not train a model.
- Current default synthesizer: installed Microsoft SAPI 5 voices, using System.Speech from Windows. Optional already-running Voicebox is supported as a separate localhost source.
- Audio: local WAV cache with HTML audio playback, no cloud.
- Proposed independently bundled neural backend: Qwen3-TTS Base (evaluate model weights and exact redistribution license) with optional Chatterbox, as a strictly local SPR-managed adapter. The current Voicebox integration is an optional temporary localhost backend, not a required runtime.
- Proposed display evolution: PDF.js original page view + word-level alignment; EPUB via Epub.js; OCR via Tesseract.
- Installer evolution: a portable Windows ZIP build workflow exists but is not independently verified; next validate the CI-produced EXE on Windows and then provide a signed or identifiable installable MSI/EXE.

## Milestones and objective acceptance

1. **v0.1 foundation (source staged):** Import a TXT document, synthesize with SAPI, highlight sentence during playback, save audio, close and reopen without regenerating completed clips. Verify on actual Windows hardware before promoting.
2. **Document fidelity:** PDF.js page rendering, mapping between text, audio and page coordinates, EPUB visual rendering, DOCX improvements and scanned-PDF OCR.
3. **Own voice:** Reuse supplied personal voice references privately; test Qwen3-TTS/Chatterbox cloning with consent, benchmarks on RTX 5070 12GB, persistent versioned voice profiles and distinct natural/dramatic styles.
4. **Production pipeline:** prebuffer, persistent generation queue, sentence/word timestamps, quality checks, correction/regeneration, FLAC/chapter WAV and M4B.
5. **Distribution:** standalone Windows binary installer, private voice pack import/export, durable recovery, regression tests for large books and interrupted jobs.

Only objective failures in loading, running, narration output, progress recovery, document mapping or exports should block functional releases. Cosmetic/style and voice-quality assessments are diagnostic, not standalone build blockers.
