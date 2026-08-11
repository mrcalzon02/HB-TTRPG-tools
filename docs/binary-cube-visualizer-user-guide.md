# Binary Cube Encoder Visualizer User Guide

## Purpose

The Binary Cube Encoder Visualizer is a companion to the Binary Cube Encryption Laboratory. It creates and validates real canonical Binary Cube packages while showing the exact transformation as an inspectable three-dimensional scene or an exact two-dimensional fallback.

The visualizer is not a cryptographic security product. It is an experimental reversible obfuscation and transformation research tool. Package checksums detect accidental or deliberate corruption, but ordinary Binary Cube packages are not authenticated encryption. Use an authenticated envelope when passphrase-protected integrity and confidentiality are required.

## Opening the tool

1. Open `https://mrcalzon02.github.io/HB-TTRPG-tools/#shadowrun`.
2. Open the Shadowrun workspace if it is not already active.
3. Find **Binary Cube Encoder Visualizer**.
4. Choose **Open Visualizer**.

The **Binary Cube Encryption Laboratory** remains available as a separate card. Packages and keys can move in either direction between the two tools.

## Quick start

1. Choose **Canonical randomized key** for normal experimentation, or **DEMONSTRATION ONLY · Flat Z Ripple** when you want a deliberately readable keyed geometry.
2. Keep the default `4 × 4` size or choose another grid size.
3. Select an input face and one legal perpendicular output face.
4. Choose input and output quarter-turn orientation.
5. For a canonical randomized key, choose a full, sparse, or exact custom data-entry mask and seed. The demonstration profile fixes the permutations and uses the full payload face intentionally.
6. Select **Generate Canonical Draft Key**.
7. Enter binary digits or choose an unencrypted file.
8. Select **Encrypt Complete Package** for ordinary trace inspection, or use **▶ Play Encoding** in the upper-left of the viewport for the one-bit-at-a-time demonstration.
9. Use the block, phase, timeline, and point controls to inspect the transformation.
10. Select **Decrypt and Verify Package** to confirm the exact round trip.

## The real transformation model

The visualizer represents the canonical engine’s transformation rather than inventing a second animation algorithm.

1. Source bits are framed into one or more fixed-size blocks.
2. Payload cells receive source bits; inactive mask cells and unused final payload cells receive deterministic filler.
3. Input-face order assigns every cell to a stable point identity.
4. Each point identity occupies its keyed `(x, y, z)` coordinate.
5. The point field remains fixed.
6. The selected output face and output quarter-turn define the read order.
7. Bits appear on the output face and become the encrypted block.
8. Every displayed block is validated against the package ciphertext slice.

Camera orbit, zoom, and pan change only the view. They never rotate the canonical key or alter package output.

## Key concepts

### Input and output faces

The input face is where block cells enter the keyed point field. The output face is where the same point identities are read. The output face must be perpendicular to the input face. Same-face and opposite-face pairs are invalid.

### Orientation

Input and output quarter-turns are encoding parameters. Each value represents `0°`, `90°`, `180°`, or `270°`. Camera position is independent from these values.

### Point identity and keyed depth

Each face cell maps to one stable point ID. The key’s row, column, and depth permutations determine the point coordinate. Selecting a point shows its source index, input face cell, coordinate, output face cell, package output index, bit, and payload-or-filler state.

### Demonstration-only Flat Z Ripple

**DEMONSTRATION ONLY · Flat Z Ripple** is a visibility aid, not a stronger or recommended security configuration. It is still passed through the canonical key validator and transformation engine, but it deliberately removes the usual visual randomness by using identity row, column, and depth permutations, a full payload mask, and the deterministic keyed relation `z = (x + y) mod gridSize`.

This makes neighboring input cells produce an easy-to-follow ripple through depth. The profile is explicitly labeled demonstration-only because the predictable structure exists to make the transformation legible.

### Mask and filler

A mask value of `1` marks a payload cell. A value of `0` marks deterministic filler. A final partial block can also contain filler in otherwise active payload positions. Filler is deterministic canonical state, not random visual decoration.

### Block framing

The package payload capacity is the count of active mask cells. Inputs longer than one capacity are split into multiple blocks. The block timeline shows exact source and ciphertext ranges, including final partial-block filler.

## Trace phases

Every selected block uses the same ten canonical phases:

1. `source-ready`
2. `block-framed`
3. `mask-applied`
4. `input-face-staged`
5. `point-assignment`
6. `point-field-loaded`
7. `output-projection-selected`
8. `output-face-staged`
9. `encrypted-block-emitted`
10. `block-complete`

Use **First**, **Previous Phase**, **Next Phase**, **Last**, and **Restart** for discrete inspection. Use **Play**, **Reverse**, **Pause**, speed, scope, cohort, and the timeline for deterministic phase playback.

### Viewport one-bit-at-a-time demonstration

The viewport’s **▶ Play Encoding** control is intentionally different from the ordinary ten-phase block playback. It serializes the validated trace so that exactly one input bit is active at a time. Each bit receives **1.4 seconds** to traverse its complete route, and the ordinary playback-speed selector does not accelerate this demonstration.

For each active bit, the moving bright point follows the exact canonical geometry:

`input face cell → keyed interior coordinate → output face cell → emitted landing position`

The white route grows progressively with the travelling bit. A second stationary pale point marks the bit’s exact keyed interior coordinate, with an on-canvas **KEYED TRANSLATION · (x, y, z)** label. The travelling point therefore visibly arrives at the keyed translation target and then continues toward the output face instead of jumping between coarse animation phases.

If no source file or manual input has been supplied when viewport playback is requested, the visualizer prepares its built-in demonstration input and then runs the same validated canonical trace path. It does not substitute decorative particles or an independent animation model.

## Rendering tiers

Encoding always remains full-resolution. Rendering adapts to the grid size:

- **Detailed:** every point and cell is shown for small grids.
- **Batched:** every point is rendered in shared buffers for medium grids.
- **Sampled:** a deterministic cohort is shown while exact counters and selected-point inspection remain canonical.
- **Aggregate:** a smaller deterministic representation is shown for very large grids.

The representation notice states how many exact points exist and how many are currently rendered. Selecting a sampled or aggregate mode never changes the key, plaintext, ciphertext, package, checksum, or recovered output.

## Package and transport formats

### Internal package

A normal canonical Binary Cube package contains the framing metadata required for direct validation and decryption with the matching key.

### Secure export

A secure export removes external metadata that can be reconstructed from the matching key. The visualizer preserves the minimized document and never invents an independent reconstruction path.

### Authenticated envelope

An authenticated envelope protects a canonical package using PBKDF2 and AES-GCM. Enter the passphrase only when sealing or opening. Passphrases remain in memory and are not included in handoff artifacts or local storage.

## Laboratory handoff

Use **Open Package in Laboratory** to send the current key, input, transport provenance, and permitted package artifact to the laboratory. The laboratory can return internal packages, secure exports, or authenticated envelopes through the matching visualizer handoff.

Protected transports remain protected during handoff:

- secure exports stay metadata-minimized;
- authenticated envelopes stay encrypted until opened;
- passphrases are never attached to the handoff.

## Accessibility

The visualizer supports:

- keyboard face, camera, phase, block, and point controls;
- an exact 2D mapping mode;
- automatic exact 2D fallback when WebGL is unavailable;
- reduced-motion discrete phases;
- a ten-phase transcript;
- live status announcements;
- non-color payload, filler, selection, input, and output markers;
- narrow-screen stacked layout.

Keyboard shortcuts are listed inside **Accessibility and fallback**. The public deployment is validated at a `390 × 844` viewport without horizontal overflow.

## Persistence and recovery

Visualizer preferences and recoverable working state use a versioned, scope-specific local-storage record. Web and desktop scopes remain separate. Legacy records are migrated. Invalid stored JSON is removed, and the tool regenerates a fresh canonical state instead of becoming unusable. Passphrases are never persisted.

## Files and downloads

- **Choose Unencrypted File** converts bytes to exact binary input.
- **Import Package or Transport** accepts supported JSON artifacts.
- **Download Package** preserves the currently displayed package or protected transport.
- **Download Recovered File** is available when recovered bits are byte-aligned.

Manual binary input may be non-byte-aligned. Such input can still encrypt and decrypt exactly, but it cannot be downloaded as an ordinary byte file without explicit framing.

## Troubleshooting

### The 3D scene is unavailable

Use the exact 2D mode. Encoding, package validation, transcript, stepping, point inspection, and round-trip verification remain active without WebGL.

### A face cannot be selected

The candidate is likely the same as or opposite the input face. Choose a perpendicular output face.

### A package is rejected

Confirm that the matching key is loaded and that the package JSON and ciphertext were not modified. Wrong keys and corrupted ciphertext are rejected intentionally.

### A secure export cannot be opened

Load the exact matching key. The minimized metadata is reconstructed only through the secure-export authority and the matching canonical key.

### An authenticated envelope cannot be opened

Confirm the passphrase and matching key. Wrong passphrases fail AES-GCM authentication and do not expose a package.

## Verification record

The complete validation chain now includes dedicated static and Chromium serial-demonstration evidence in addition to the V12 regression, runtime, failure, lifecycle, desktop, accessibility, compatibility, stale-work, narrow-screen, and public GitHub Pages evidence. The serial gates verify one-bit ordering, the fixed 1.4-second bit duration, exact keyed route anchors, monotonic tweening, the speed-selector override boundary, and the keyed-translation marker/label contract.

The broader V12 evidence remains recorded in `docs/binary-cube-v12-runtime-failure-report.md`.
