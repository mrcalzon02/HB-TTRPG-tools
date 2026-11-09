# OLD-CORE30 targeted directory mapper

Purpose: discover the *existing* executables, Ollama/Qwen manifests, Blender installations, project checkout roots and model/parts folders needed by the seven-machine refinery job. It is a small, bounded, **read-only** scanner for the self-hosted Windows runner. No new background service, model download, installation, cleanup, permissions change or recursive whole-drive scan is allowed.

## Run mode

`Homebrew local worker` accepts an additional `map` dispatch choice. A commit including `[dir-map-run]` triggers a single `map` job through the existing `main` push path. This must not select the workbench or refinery execution modes. There is **one** job under the established `old-core30-local-worker` concurrency group. Map mode uses an 8-minute job cap; the scanner has its own 110-second scan budget. It reads metadata only and does not call model inference or start Blender.

The script executes on `OLD-CORE30-homebrew`; its working report directory is still the existing `D:\Runner\actions-runner\_homebrew\reports\<run>-<attempt>`. The sole persistent write is a machine-local path registry at:

`D:\Runner\actions-runner\_homebrew\private\directory-map\path-registry-private.json`

This registry contains exact local paths and never belongs in a GitHub artifact. It is available to later explicitly approved refinery setup steps. Its presence does **not** grant authorization to automatically start inference, install Ollama or change any existing model store.

The GitHub Actions artifact includes only:

- `DIRECTORY_MAP.md` — summarized available executables, Ollama API ports, model manifest names and checked root locations.
- `directory-map-public.json` — structured version of the redacted summary; `C:\Users\<PROFILE>` replaces Windows account names.
- Existing runner status and final receipt files.

Scanned roots are only explicitly listed, local candidate locations on `C:` and `D:`. Traversal is capped at three folder levels, a bounded count per root and a run-wide clock. `.git`, `blobs`, per-user Documents/Downloads/Desktop, model weights, credentials, secret folders and unrelated personal files are not traversed or copied. The Ollama manifest scan lists *path names only*, without reading model blobs or manifests. Process checks inspect executable paths, never process command lines, environment variables or tokens.

## Interpretation and next step

A model manifest on `D:` plus no model tags from `127.0.0.1:11434` means Ollama is not serving that store. It does **not** mean the model is missing. Read the private path registry on the actual runner, choose an identified existing Ollama binary, verify that its process and selected `OLLAMA_MODELS` location match the discovery, then perform a separate short Qwen smoke test with explicit user-scope tooling. Only after real inference passes should the long-running Blender construction resume.

Do not conclude a full refinery build passed from the mapper's successful diagnostic artifact.
