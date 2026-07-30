# Binary Cube V12 Runtime and Failure Report

## Status

- Milestone: `V12 — Regression, Runtime, and Failure Testing`
- State: in progress
- Accepted slice: lifecycle source contracts, repeated Chromium open/close execution, explicit renderer disposal, forced renderer-failure recovery, and re-entrant stale-work rejection
- Static validation: `node scripts/validate-binary-cube-visualizer-lifecycle.mjs`
- Lifecycle browser validation: `node scripts/validate-binary-cube-visualizer-lifecycle-browser.mjs`
- Fallback browser validation: `node scripts/validate-binary-cube-visualizer-accessibility-browser.mjs`
- Stale-work browser validation: `node scripts/validate-binary-cube-visualizer-stale-work-browser.mjs`
- Permanent workflow: `.github/workflows/binary-cube-v12-lifecycle.yml`
- Latest accepted combined workflow run: `30576852561`

## Scope of this slice

This V12 slice protects repeated open/close, renderer cleanup, renderer-initialization failure, and rapid asynchronous replacement boundaries that are most likely to create long-session, degraded-runtime, or stale-state regressions in the GitHub Pages workspace.

The source contract gate verifies that:

- the visualizer panel is reused instead of rebuilt on every open;
- event binding is guarded against duplicate attachment;
- closing pauses playback before the panel is hidden;
- renderer installation is single-instance for the mounted panel;
- animation-frame state is cancelled and cleared;
- deferred scene and trace preparation handles are cancelled;
- scene preparation uses a generation token and discards superseded key or quality results;
- trace preparation uses a generation token and discards superseded package or block results;
- renderer disposal is idempotent;
- resize observation is disconnected;
- canvas event handlers are removed;
- owned WebGL buffers and programs are deleted;
- generated label nodes are cleared.

The Chromium lifecycle gate executes 24 complete open, play, close, and reopen cycles while collecting live runtime counters. It proves that:

- exactly one panel and one renderer remain mounted across all cycles;
- the ResizeObserver count remains stable;
- the seven renderer canvas listeners do not multiply;
- the six WebGL buffers and one WebGL program do not multiply;
- each close cancels playback and leaves no active animation frame;
- the generated label count remains stable;
- calling renderer disposal twice is safe;
- disposal disconnects the observer, removes all canvas listeners, deletes all owned WebGL resources, and clears generated labels.

The forced renderer-failure gate proves that:

- a renderer initialization exception selects the exact 2D fallback;
- canonical package generation, round-trip verification, and trace generation remain active without WebGL;
- all 32 exact input/output face cells remain available for the default `4 × 4` trace;
- the ten-phase trace transcript remains complete;
- the renderer failure reason is disclosed;
- keyboard phase stepping and point inspection remain usable without WebGL.

The stale-work gate forces re-entrant state changes from inside the expensive engine calls rather than merely cancelling queued timers. It proves that:

- a `128 × 128` scene result is rejected after a newer key replaces its active key and package;
- the replacement scene result is rejected after render quality changes from automatic sampling to aggregate rendering;
- the final aggregate scene retains the replacement package checksum and exact round-trip validity;
- a two-block package rejects block 0 trace output after block 1 is selected during trace construction;
- block 1 becomes the active validated trace;
- discarding the stale trace does not change package checksum or ciphertext.

## Accepted runtime receipt

The green lifecycle receipt recorded:

- `24` lifecycle cycles;
- `1` renderer construction;
- `1` active ResizeObserver before disposal and `0` after disposal;
- `7` canvas listeners before disposal and `0` after disposal;
- `6` live WebGL buffers before disposal and `0` after disposal;
- `1` live WebGL program before disposal and `0` after disposal;
- `0` active animation frames after every close and after the final reopen;
- `12` generated labels before disposal and `0` after disposal.

The green stale-work receipt recorded:

- superseded key `7938423c` and accepted replacement key `72c366fe`;
- superseded package checksum `e878a22a` and accepted replacement checksum `f3f8f9a4`;
- final `aggregate` rendering with `2,048` visible points;
- `2` stale scene results discarded;
- `1` stale trace result discarded;
- `2` package blocks with block index `1` accepted as the active trace;
- exact round-trip validity after all replacements;
- package checksum preservation across the quality race;
- package checksum and ciphertext preservation across the trace race.

The combined accepted workflow run is available at:

`https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/30576852561`

## Remaining V12 work

The following evidence is still required before V12 can be accepted:

1. Add wrong-key, corrupted-package, secure-export, editor-handoff, and local-state recovery regression coverage.
2. Validate narrow-screen behavior and the deployed GitHub Pages path.
3. Run the V12 lifecycle and failure evidence together with the complete V0–V11 compatibility suite in one enforced milestone result.

## Acceptance note

This document records milestone progress, not V12 completion. V12 remains open until the remaining failure paths and combined regression evidence are accepted without unresolved high-severity correctness or resource-leak defects.
