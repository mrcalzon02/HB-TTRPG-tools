# TP-MH7 Water Purifier — one-machine goal-oriented inference pilot

**Status:** configuration and source only. This file is not evidence that the pilot ran or that Qwen completed model work.

## Purpose

Use the **existing** water-purifier `.blend` on the `OLD-CORE30-homebrew` Windows runner. Do not rebuild seven baselines and do not let inference execute shell commands or Python. The designated local Qwen Coder supplies *bounded structured mesh additions*; our trusted Blender script appends them to an isolated copy of the actual source. Every goal produces a saved `.blend`, exported `.glb`, independently reopened/verified source, and transparent perspective PNG.

## Goal division

1. `load_path`: structurally supported vessel and load path.
2. `filter_pump_path`: real, supported filter/pump path, no made-up ports.
3. `pipe_interfaces`: physically sized raw-water and purified-water manifolds with measured mouths; no inferred native Factorio port cells.
4. `controls_service`: existing cogitator/emergency family controls, supported cabling and maintenance access.

A local Qwen planning call assigns intent and acceptance criteria to these **required and whitelisted** goals; one further structured inference call supplies a small number of justified physical mesh components for each goal. A trusted validator rejects unsupported primitive types, names/signs, nonfinite dimensions, out-of-footprint additions, oversized parts and arbitrary executable code. Blender performs the geometry operations from these data, not Qwen-generated scripts.

After every goal, the runner renders the scene, writes hash-checked checkpoints, and independently opens the saved Blend and exported GLB. The next goal receives a **text summary of actual measured geometry**, not an imagined visual critique. Text-only Qwen Coder cannot visually inspect PNG pixels; actual rendered images must be reviewed by a human. Do not report `visual_approved`, `game_integrated`, `Factorio_ports_verified`, or `machine_finished` based on this pilot alone.

## Runner integration

- Workflow: the **existing** `.github/workflows/homebrew-local-worker.yml` with one `refinery-pilot` mode, one `OLD-CORE30-homebrew` job, and no matrix.
- Local runner launcher: `tools/local-worker/run_refinery.ps1`; existing Blender 5.2, installed Python, and pinned Tech-Priests source.
- Inference prerequisite: isolated owner's Ollama endpoint `127.0.0.1:11435`, Qwen Coder model available there, structured smoke response. If missing, **stop without changing any `.blend`**.
- Existing source: `D:\Runner\actions-runner\_homebrew\refinery-mh7\output\machines\water-purifier\water-purifier.blend`, with matching durable SHA in `CHECKPOINT.json`. If absent or corrupt, **stop**. Do not fabricate an original v0.2 source.
- Output: persistent `D:\Runner\actions-runner\_homebrew\refinery-mh7\goal-pilot\`, with a distinct run report and four goal subdirectories. The immutable baseline remains unchanged.
- Limit: one model; four goals; at most eight new parts each; single Blender process; bounded individual inference and Blender subprocess timeouts (360 seconds and 1,500 seconds respectively); 360-minute parent workflow hard cap. No download, workflow fan-out, live prototype edits, releases, re-tagging, force pushes or global Python installation.

## Local tests

From the repo root (no Blender, Ollama or GitHub Actions required):

```sh
python -m unittest discover -s tools/refinery-agent -p 'test_goal_water_purifier.py' -v
```

These are **schema and safety tests only**, not Blender acceptance. A full integration test requires the local Ollama API, the real native Water Purifier source and Blender on the runner. A successful run must include exact model selection, Qwen response receipts, four actual native renders, corresponding editable saves and independent reopen checks. It must not claim that a conceptual image or a text-only audit establishes visual fidelity.

To start the local inference prerequisite on the machine under the user's Windows login, use the existing user-owned startup script for `C:\Users\ChirsLaser\AppData\Local\Programs\Ollama\ollama.exe` and `D:\AI-Relocation\Ollama\models`; it must report Qwen readiness. Do not change Cline settings or user profile ACLs.
