# Binary Cube Custom Coordinate and Mask Editor

## Status

Phase 11 introduces a protected draft editor for the existing Binary Cube key schema. It does not change key or package schema `0.2.0`, and it does not add arbitrary free-form coordinate points. The editable coordinate material remains the existing row, column, and depth permutations used by the Latin-cube point-field rule.

The editor is implemented but remains subject to the mandatory `main`-branch validation gate.

## Purpose

The editor allows a user to inspect and deliberately change:

- the row permutation;
- the column permutation;
- the depth permutation; and
- the boolean data-entry mask.

A draft is isolated from the active key until the user explicitly validates and applies it. Invalid drafts cannot mutate the active key.

## Protected workflow

1. Generate or import a valid Binary Cube key.
2. Select **Load Active Key** in the custom editor.
3. Edit permutations or the mask.
4. Select **Validate Draft**.
5. Review the reported point count, payload capacity, warnings, and candidate key identifier.
6. Select **Apply Valid Draft** only after validation succeeds.

Applying a changed key recalculates the key fingerprint and clears the existing encrypted-package and decrypted-output fields. A package produced under the previous key is not compatible with the rebuilt key.

## Permutation rules

Each permutation must contain exactly `gridSize` integers. Every value from `0` through `gridSize - 1` must appear exactly once.

The editor rejects:

- missing values;
- duplicate values;
- values outside the valid range;
- non-integer values; and
- a draft whose grid size differs from the active key.

After rebuilding the candidate key, the engine performs all-six-face projection validation before the key can be applied.

## Mask rules

The mask must contain exactly `gridSize × gridSize` boolean cells. Text masks use `1` for a payload cell and `0` for deterministic filler. Whitespace and common separators are ignored.

At least one payload cell must remain enabled.

The editor provides these deterministic mask patterns:

- full;
- three-quarter;
- checker half;
- border;
- both diagonals; and
- inversion of the current mask.

Masks using less than 25 percent of the face produce a visible expansion warning.

## Visual editing and accessibility

For sizes up to `12 × 12`, the mask is rendered as keyboard-focusable buttons. Every cell exposes:

- row and column in its accessible label;
- payload or filler meaning;
- visible `1` or `0` text; and
- `aria-pressed` state.

The interface therefore does not rely on color alone.

For sizes above 12, the editor does not render thousands of interactive buttons. It provides an active/inactive textual summary and retains the text mask editor. This avoids unbounded browser rendering at the recommended sizes up to 60.

## Recovery

The editor keeps bounded in-session draft history:

- **Undo** restores the preceding draft snapshot.
- **Redo** restores an undone snapshot.
- **Restore Previous Valid Key** swaps back to the key that was active immediately before the most recent successful apply.

The previous valid key remains available until the editor session is reloaded or another restore/apply operation replaces that recovery point.

## Serialization and schema policy

The editor uses fields already defined in key schema `0.2.0`. It does not add behavioral metadata to serialized keys, so no schema migration is required.

A custom key remains distinguishable through its recalculated content fingerprint. The seed remains part of that fingerprint and continues to drive deterministic filler, but the edited permutations and mask override the originally generated coordinate and payload layout.

## Validation gate

The Phase 11 static validator is:

`node scripts/validate-shadowrun-binary-cube-editor.mjs`

The required baseline is:

- 252 assertions;
- 40 custom-key encryption/decryption round trips;
- all eight recommended grid sizes;
- full, three-quarter, half, border, and diagonal masks;
- invalid permutation and mask failures;
- key fingerprint recalculation;
- prior-package incompatibility; and
- loader and accessibility integration checks.

The browser verifier must complete at least 23 checks, including protected draft loading, invalid-draft rejection, undo/redo, validated apply, package clearing, previous-key recovery, and zero page or console errors.

The workflow emits `shadowrun-binary-cube-editor-verification.json` with the other retained validation evidence.

## Security boundary

The custom editor does not improve the cryptographic strength of the Binary Cube permutation. The cube core remains experimental TTRPG obfuscation rather than production cryptography.

The optional PBKDF2/AES-GCM authenticated envelope remains a separate transport layer. Changing a cube key does not change the envelope security model, and an existing envelope still belongs to the key and package it originally wrapped.
