# Binary Cube V12 Runtime and Failure Report

## Status

- Milestone: `V12 — Regression, Runtime, and Failure Testing`
- State: accepted
- Accepted evidence: lifecycle source contracts, repeated Chromium open/close execution, explicit renderer disposal, forced renderer-failure recovery, re-entrant stale-work rejection, protected failure paths, compatibility handoffs, complete V0–V12 aggregation, narrow-screen behavior, and the live GitHub Pages deployment path
- Static validation: `node scripts/validate-binary-cube-visualizer-lifecycle.mjs`
- Failure-path validation: `node scripts/validate-binary-cube-visualizer-failure-paths.mjs`
- Lifecycle browser validation: `node scripts/validate-binary-cube-visualizer-lifecycle-browser.mjs`
- Fallback browser validation: `node scripts/validate-binary-cube-visualizer-accessibility-browser.mjs`
- Stale-work browser validation: `node scripts/validate-binary-cube-visualizer-stale-work-browser.mjs`
- Compatibility browser validation: `node scripts/validate-binary-cube-visualizer-compatibility-browser.mjs`
- Complete milestone validation: `node scripts/validate-binary-cube-v12-complete.mjs`
- Live Pages validation: `node scripts/validate-binary-cube-v12-pages-browser.mjs`
- Runtime workflow: `.github/workflows/binary-cube-v12-lifecycle.yml`
- Complete workflow: `.github/workflows/binary-cube-v12-complete.yml`
- Pages workflow: `.github/workflows/binary-cube-v12-pages.yml`
- Accepted complete V0–V12 workflow run: `30578802967`
- Accepted live Pages mobile workflow run: `30578616107`

## Scope of accepted evidence

This V12 evidence protects repeated open/close, renderer cleanup, renderer-initialization failure, rapid asynchronous replacement, invalid protected inputs, cross-tool handoffs, storage recovery, historical regression boundaries, narrow-screen layout, lazy workspace loading, and the public GitHub Pages route.

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

The stale-work gate forces re-entrant state changes from inside expensive engine calls rather than merely cancelling queued timers. It proves that:

- a `128 × 128` scene result is rejected after a newer key replaces its active key and package;
- the replacement scene result is rejected after render quality changes from automatic sampling to aggregate rendering;
- the final aggregate scene retains the replacement package checksum and exact round-trip validity;
- a two-block package rejects block 0 trace output after block 1 is selected during trace construction;
- block 1 becomes the active validated trace;
- discarding the stale trace does not change package checksum or ciphertext.

The protected failure and compatibility gates prove that:

- packages are rejected under the wrong key;
- ciphertext mutations are rejected;
- secure exports reconstruct only with the correct key and remain metadata-minimized;
- validated editor drafts are accepted and invalid permutations are rejected;
- laboratory and visualizer internal-package handoff preserves exact package identity;
- secure-export and authenticated-envelope provenance remain protected during return handoff;
- passphrases are not persisted;
- legacy storage records migrate to current schemas;
- malformed stored JSON is removed and restoration falls back to a fresh canonical state.

The live Pages gate proves that:

- `/HB-TTRPG-tools/#shadowrun` activates the Shadowrun workspace through the public landing page;
- the landing-page loader lazy-loads `shadowrun-entry.js` and supports direct hash activation;
- the deployed Shadowrun visualizer launcher loads the canonical engine, renderer, controller, and stylesheet under the repository subpath;
- the default package, round trip, and trace settle successfully on the public site;
- the exact 2D fallback remains available at a `390 × 844` mobile viewport;
- all core visualizer controls are present;
- controls and main content stack without overlap;
- the document width is exactly `390` pixels and the visualizer panel is `358` pixels wide;
- the exact fallback exposes `32` input/output cells;
- no visible visualizer element overflows the viewport horizontally.

## Accepted runtime receipts

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

The final complete aggregate receipt recorded:

- format `hb-ttrpg-shadowrun-binary-cube-v12-complete-milestone-receipt`;
- `24` checks executed;
- `24` checks passed;
- `0` checks failed;
- `0` browser checks required a retry;
- total aggregate runtime of `50,705` milliseconds;
- individual retained logs for every V0–V12 and desktop check.

The live Pages receipt recorded:

- format `hb-ttrpg-shadowrun-binary-cube-v12-pages-browser-receipt`;
- path `/HB-TTRPG-tools/` and hash `#shadowrun`;
- viewport `390 × 844`;
- document width `390` and panel width `358`;
- renderer version `0.5.0` initialized successfully;
- canonical package, round trip, and trace all valid;
- exact 2D mode active with `32` cells;
- all core controls present;
- `0` overflow elements.

Accepted workflow runs:

- Runtime and failure gate: `https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/30577201392`
- Complete V0–V12 gate: `https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/30578802967`
- Live GitHub Pages mobile gate: `https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/30578616107`

## Acceptance

V12 is accepted. No unresolved high-severity correctness or resource-leak defect remains in the accepted evidence. The next active stage is `V13 — Shadowrun Workspace Launch and Documentation`.
