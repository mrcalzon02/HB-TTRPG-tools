# Binary Cube V12 Runtime and Failure Report

## Status

- Milestone: `V12 — Regression, Runtime, and Failure Testing`
- State: in progress
- First accepted slice: lifecycle and cleanup contract gate
- Validation command: `node scripts/validate-binary-cube-visualizer-lifecycle.mjs`

## Scope of this slice

This first V12 slice protects the repeated open/close and renderer-cleanup boundaries that are most likely to create long-session regressions in the GitHub Pages workspace.

The gate verifies that:

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

## Current evidence

The permanent dependency-free validator is stored at:

`./scripts/validate-binary-cube-visualizer-lifecycle.mjs`

It reads the authoritative visualizer controller and renderer sources directly and fails when any required lifecycle contract is removed or renamed without an equivalent update to the gate.

## Remaining V12 work

The following evidence is still required before V12 can be accepted:

1. Chromium repeated open/close execution with listener, animation-frame, observer, and WebGL resource counters.
2. Renderer-initialization failure injection proving the exact 2D fallback remains usable.
3. Rapid key, package, quality, and trace changes proving stale work is discarded.
4. Wrong-key, corrupted-package, secure-export, editor-handoff, and local-state recovery regression coverage.
5. Narrow-screen and deployed GitHub Pages path validation.
6. A permanent workflow step that runs the lifecycle gate together with the complete V0–V11 compatibility suite.

## Acceptance note

This document records milestone progress, not V12 completion. V12 remains open until browser runtime evidence and the remaining failure paths are accepted without unresolved high-severity correctness or resource-leak defects.
