# Binary Cube V12 Runtime and Failure Report

## Status

- Milestone: `V12 — Regression, Runtime, and Failure Testing`
- State: in progress
- Accepted slice: lifecycle source contracts, repeated Chromium open/close execution, explicit renderer disposal, and forced renderer-failure recovery
- Static validation: `node scripts/validate-binary-cube-visualizer-lifecycle.mjs`
- Lifecycle browser validation: `node scripts/validate-binary-cube-visualizer-lifecycle-browser.mjs`
- Fallback browser validation: `node scripts/validate-binary-cube-visualizer-accessibility-browser.mjs`
- Permanent workflow: `.github/workflows/binary-cube-v12-lifecycle.yml`
- Latest accepted combined workflow run: `30575922358`

## Scope of this slice

This V12 slice protects the repeated open/close, renderer-cleanup, and renderer-initialization failure boundaries that are most likely to create long-session or degraded-runtime regressions in the GitHub Pages workspace.

The source contract gate verifies that:

- the visualizer panel is reused instead of rebuilt on every open;
- event binding is guarded against duplicate attachment;
- closing pauses playback before the panel is hidden;
- renderer installation is single-instance for the mounted panel;
- animation-frame state is cancelled and cleared;
- deferred scene and trace preparation handles are cancelled;
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

The combined accepted workflow run is available at:

`https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/30575922358`

## Remaining V12 work

The following evidence is still required before V12 can be accepted:

1. Exercise rapid key, package, quality, and trace changes while proving stale work is discarded.
2. Add wrong-key, corrupted-package, secure-export, editor-handoff, and local-state recovery regression coverage.
3. Validate narrow-screen behavior and the deployed GitHub Pages path.
4. Run the V12 lifecycle and failure evidence together with the complete V0–V11 compatibility suite in one enforced milestone result.

## Acceptance note

This document records milestone progress, not V12 completion. V12 remains open until the remaining failure paths and combined regression evidence are accepted without unresolved high-severity correctness or resource-leak defects.
