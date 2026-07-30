# Binary Cube Encoder Visualizer Architecture

## Status

- Canonical engine boundary: accepted
- Visualizer runtime: accepted through V12
- Public workspace promotion: V13
- Authoritative branch: `main`

## System boundary

The Binary Cube engine is the only authority for key material, projections, filler, block transformation, encryption, decryption, package framing, checksums, diagnostics, and immutable traces. The visualizer is a controller and presentation layer over engine-produced state.

```text
User input or imported artifact
  -> canonical Binary Cube engine
  -> validated package and immutable block trace
  -> visualizer state controller
  -> WebGL renderer or exact 2D renderer
  -> inspection, playback, handoff, and export controls
```

No renderer operation may calculate ciphertext. No controller operation may approximate a projection. No protected transport may be reconstructed outside its owning module.

## Runtime modules

### `shadowrun-binary-cube-engine.js`

Canonical computational authority. Important operations include key creation and validation, legal output-face discovery, package encryption and validation, decryption, point construction, trace generation, and trace validation.

### `shadowrun-binary-cube-visualizer.js`

Owns visualizer state, panel lifecycle, package sequencing, selected-block traces, playback time, inspection state, persistence, import/export controls, protected transport provenance, accessibility output, and laboratory handoff.

### `binary-cube-visualizer-renderer.js`

Owns WebGL resources, camera behavior, face picking, point and path buffers, rendering tiers, trace interpolation, labels, resize observation, and disposal. It receives canonical coordinates and trace data; it does not encrypt.

### `binary-cube-visualizer.css`

Defines the desktop and narrow-screen visual hierarchy, canvas shell, exact 2D mapping, trace controls, transcripts, inspector, performance disclosures, accessibility states, and responsive stacking.

### `shadowrun-binary-cube-encryption.js`

Owns the companion laboratory workflow. Laboratory and visualizer exchange artifacts through explicit window events and validated public APIs.

### `shadowrun-binary-cube-editor.js`

Owns custom-key draft operations. A draft cannot become canonical until all permutation, mask, range, fingerprint, and face-projection rules pass.

### `shadowrun-binary-cube-auth.js`

Owns passphrase derivation, AES-GCM sealing, and authenticated-envelope opening. Passphrases are not stored by the visualizer.

### `shadowrun-binary-cube-secure-export.js`

Owns metadata minimization and reconstruction for secure exports. The visualizer preserves provenance and delegates reconstruction.

### `shadowrun-entry.js`

Declares the laboratory and visualizer workspace cards, lazy-loads their dependencies, binds bidirectional handoffs, and opens each tool through its public API.

### `app-lite-view-mounts.js`

Provides landing-page lazy-view activation. It loads `shadowrun-entry.js` when Shadowrun is selected, supports direct `#shadowrun` activation, and emits the shared `hb:view-activated` event.

## Canonical data flow

### Key flow

1. A user generates, imports, restores, or receives a key.
2. The engine validates the complete key.
3. The controller stores the validated object as active canonical state.
4. The renderer receives point coordinates and direction state derived from that key.
5. Draft face or mask changes remain separate until a new canonical key is generated.

### Package flow

1. Binary input is normalized.
2. The engine frames and encrypts the complete input.
3. The engine returns a canonical package.
4. The controller validates the package under the active key.
5. The controller decrypts and re-encrypts to prove exact round-trip and package identity.
6. Per-block traces are generated or prepared on demand.
7. Each trace output block is compared with the matching ciphertext slice.

### Trace flow

A selected block trace contains stable point IDs, coordinates, cell kinds, bits, source indexes, input and output cell indexes, projection orders, phase state, and the exact output block. The controller treats a trace as immutable evidence.

Timeline rendering derives visible state from normalized trace time. Play, pause, reverse, scrub, restart, and reduced-motion snapping do not accumulate scene mutations.

## Rendering tiers

`binary-cube-visualizer-renderer.js` selects an explicit representation plan:

- detailed exact rendering for small grids;
- batched exact buffers for medium grids;
- deterministic sampled cohorts for larger grids;
- deterministic aggregate representation for very large grids.

The selected point and selected row are retained in deterministic samples when possible. The controller discloses exact point count, rendered point count, tier, effective quality, and any fallback. Encoding remains full-resolution in every tier.

## Asynchronous invalidation

Scene and trace preparation use independent generation tokens.

- A new key or render-quality request increments the scene generation.
- A new package or block selection increments the trace generation.
- A completed task compares its token and active identity before applying output.
- Superseded output is discarded and counted.

V12 re-entrant browser evidence invalidates work from inside expensive engine calls, proving that stale results cannot overwrite the active package, scene, selected block, checksum, or ciphertext.

## Lifecycle and resource ownership

The panel is a singleton and binding is idempotent. Closing the visualizer pauses playback and cancels the active animation frame.

The renderer owns:

- one ResizeObserver;
- canvas pointer, click, wheel, and context-menu listeners;
- line, point, selection, arrow, selected-point, and selected-path buffers;
- one WebGL program;
- generated labels.

`dispose()` is idempotent and releases every owned resource. V12 Chromium evidence executes 24 open/play/close/reopen cycles and explicit double disposal while checking live counters.

## Accessibility architecture

The WebGL renderer and exact 2D renderer consume the same canonical key and trace. The 2D renderer is not a reduced data model. It preserves exact input/output cells and selected-point mapping for supported detailed traces.

The controller also produces:

- a ten-phase transcript;
- non-color D/F and input/output markers;
- live announcements;
- reduced-motion discrete phases;
- keyboard navigation and inspection;
- exact fallback after renderer initialization failure.

## Transport provenance

The controller recognizes:

- `internal-package`;
- `secure-export`;
- `authenticated-envelope`.

The displayed transport document remains authoritative. Reconstructed internal packages are not inserted into returned handoff artifacts when the active provenance is protected. Passphrases remain memory-only.

## Persistence

Visualizer storage uses:

- format `hb-ttrpg-shadowrun-binary-cube-visualizer-state`;
- schema `0.1.0`;
- a scope suffix derived from `data-binary-cube-storage-scope`.

The laboratory uses a separate format and key. Legacy records migrate explicitly. Invalid or unavailable storage is recoverable and optional.

## Desktop integration

The desktop package copies the canonical engine, laboratory, authentication, secure export, renderer, controller, styles, and entry assets. Web and desktop use the same artifact events and public APIs while keeping storage scopes separate.

## Deployment architecture

The repository uses no-build static assets under the GitHub Pages subpath `/HB-TTRPG-tools/`.

1. `index.html` loads the lightweight application shell.
2. `app-lite-view-mounts.js` activates views and lazy-loads `shadowrun-entry.js`.
3. `shadowrun-entry.js` builds the workspace and lazy-loads the selected Binary Cube tool.
4. Asset URLs remain relative to `document.baseURI`, preserving the repository subpath.
5. The Pages workflow waits until the current lazy loader is publicly visible, then tests the live route at a mobile viewport.

## Validation architecture

### Permanent V12 runtime workflow

`.github/workflows/binary-cube-v12-lifecycle.yml` enforces lifecycle, failure paths, forced fallback, stale work, compatibility, handoff, and storage recovery.

### Complete V0–V12 workflow

`.github/workflows/binary-cube-v12-complete.yml` runs 24 historical, browser, performance, accessibility, compatibility, desktop, lifecycle, failure, and stale-work checks. Browser processes receive at most one fresh-process retry for isolated startup races; deterministic failures still fail.

### Public Pages workflow

`.github/workflows/binary-cube-v12-pages.yml` validates the deployed `#shadowrun` route at `390 × 844`, including lazy loading, visualizer opening, exact 2D mode, controls, stacking, package state, and horizontal overflow.

## Change rules

Any future visualizer change must preserve:

1. one canonical engine authority;
2. package and trace parity;
3. protected transport provenance;
4. deterministic playback;
5. explicit stale-work invalidation;
6. exact fallback and keyboard operation;
7. complete renderer disposal;
8. responsive public deployment;
9. the laboratory companion workflow;
10. the complete V0–V12 gates.
