# Binary Cube Strengthening Composition Experiment

## Purpose

This experiment tests whether the laboratory's two independent strengthening mechanisms are complementary, redundant, or order-sensitive when deliberately composed before the canonical Cube engine.

The two candidate paths are:

1. `source -> chaining -> subcube -> Cube`
2. `source -> subcube -> chaining -> Cube`

Neither path is part of ordinary encryption. This is comparative laboratory work for experimental TTRPG obfuscation, not production cryptography.

## Authoritative implementation

`binary-cube-strengthening-composition.js` is the single composition authority. It calls the existing `binary-cube-data-dependent-chaining.js`, `binary-cube-subcube-indexing.js`, and `shadowrun-binary-cube-engine.js` implementations. The human laboratory and AI projection must not recreate transformation logic.

## Fair-comparison rules

Both orderings use the same generated Cube key, the same source payload, the same source-bit perturbation indexes, the same subcube plan, and the same chaining seed. Both therefore pay the same subcube fan-out expansion cost. Timing is runtime-local evidence only.

The experiment records exact round-trip recovery, normalized pre-Cube diffusion, normalized final-ciphertext diffusion, representation expansion, transform/Cube/perturbation timing, and order-sensitive diffusion deltas.

## Interpretation boundary

A composition is not better merely because it is more complicated. Any useful result must justify its full fan-out expansion and runtime cost. A favorable diffusion result does not establish confidentiality, authentication, resistance to cryptanalysis, or production suitability.

The composition experiment must remain additive. It does not replace the standalone subcube or chaining authorities because independent measurements are required to determine whether composition contributes anything beyond either component.

## Next acceptance step

After runtime execution is available, both orderings should be admitted to the same seven-family corpus used by `binary-cube-strengthening-strategy-campaign.js`. Compare them against baseline Cube, standalone subcube, and standalone chaining. Report mean and worst-family behavior so a favorable aggregate cannot conceal a weak payload family.

Promotion remains blocked until runtime evidence exists and the ordinary-workflow promotion gates are explicitly satisfied.