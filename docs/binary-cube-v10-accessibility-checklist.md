# Binary Cube V10 Accessibility Validation Checklist

## Scope

This checklist records the V10 acceptance boundary for the Binary Cube Encoder Visualizer. Accessibility features may change presentation and control surfaces, but they must never alter canonical keys, masks, traces, ciphertext, checksums, package framing, or recovered plaintext.

## Keyboard operation

- [x] Input and output face roles can be selected without pointer input.
- [x] All six faces can be selected from the keyboard.
- [x] Perspective and six orthographic camera presets have keyboard shortcuts.
- [x] First, previous, next, last, play, pause, and restart behavior remain keyboard-operable.
- [x] Timeline phases, package blocks, and adjacent point identities can be inspected from the keyboard.
- [x] Every keyboard shortcut has visible in-tool documentation.
- [x] All interactive controls expose a strong `:focus-visible` indicator.

## Reduced motion

- [x] The initial preference respects `prefers-reduced-motion`.
- [x] The user can explicitly enable or disable reduced motion.
- [x] Reduced motion presents canonical phase boundaries with zero interpolation inside a phase interval.
- [x] Timeline text and accessibility state disclose discrete-phase presentation.
- [x] Turning reduced motion on does not change the active package or trace evidence.

## Non-color distinctions

- [x] Payload cells include the visible `D` marker and solid boundaries.
- [x] Deterministic filler cells include the visible `F` marker, dashed boundaries, and a hatch pattern.
- [x] Selected cells include a visible star and strong outline.
- [x] Input and output cells use visible `IN`/`OUT` labels and opposite inset borders.
- [x] State remains understandable in monochrome rendering.

## Live announcements

- [x] Visible status output is an atomic polite status region.
- [x] A dedicated live region announces phase changes and validation results.
- [x] Errors can be announced assertively.
- [x] Repeated animation frames do not repeatedly announce the same phase.

## Trace transcript

- [x] All ten canonical phases appear in an ordered text transcript.
- [x] The active phase uses `aria-current="step"`.
- [x] Complete, active, and pending states are written as text rather than conveyed by color alone.
- [x] The selected point summary includes source or filler identity, input cell, point ID, output cell, and package ciphertext index.

## 2D fallback

- [x] The user can choose the exact 2D visualization even when WebGL is available.
- [x] WebGL initialization failure is non-fatal.
- [x] Small grids preserve exact input-face and output-face cell projections.
- [x] Every 2D cell remains focusable and linked to the same canonical point inspector.
- [x] Larger grids suppress per-cell DOM expansion while preserving exact selected-point mappings, package ranges, counters, and transcript.
- [x] Encoding, decryption, validation, and round-trip verification continue without a renderer.

## Automated evidence

- `scripts/validate-binary-cube-visualizer-accessibility.mjs`
  - Pure reduced-motion phase resolution
  - Ten-phase transcript structure
  - Exact 2D input/output inverse mappings
  - Required keyboard, live-region, non-color, and fallback source boundaries
  - Renderer algorithm isolation
- `scripts/validate-binary-cube-visualizer-accessibility-browser.mjs`
  - Real Chromium WebGL2 keyboard operation
  - Discrete reduced-motion behavior
  - Live phase announcements
  - Exact 4×4 2D fallback
  - Forced WebGL initialization failure with preserved canonical package and trace behavior

## Exit gate

V10 is accepted only when the complete transformation can be followed and controlled without animation, without mouse input, and without relying on color alone, while every canonical V0–V9 package and runtime contract remains unchanged.
