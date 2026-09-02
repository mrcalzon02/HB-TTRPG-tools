# Binary Cube Subcube Strength Matrix

**Status:** Implemented comparative research harness; runtime acceptance still required.  
**Authority:** `binary-cube-subcube-strength-matrix.js`  
**Security classification:** Experimental TTRPG obfuscation research, not production cryptography.

## Purpose

The matrix converts the earlier single-configuration fan-out comparison into a repeatable bounded campaign. It evaluates whether subcube multi-input indexing produces a consistent benefit across different data structures and Binary Cube configurations rather than looking strong in one favorable example.

## Current dimensions

The default matrix covers five payload classes: all-zero, all-one, alternating, repeated-byte, and mixed data. It crosses those payloads with `keyed-codeword` and `direct-replication`, fan-outs 3/5/7, grid sizes 2/4, mask densities 0.25/0.5/0.75, two face relationships, and two rotation pairs. `maxCases` bounds execution cost; the default is 144 cases and each case samples eight source-bit perturbations unless configured otherwise.

Every case delegates to `binary-cube-subcube-strength-comparison.js`, which in turn uses the standalone subcube indexing module and canonical Binary Cube engine. The matrix does not reproduce either algorithm.

## Evidence produced

For every valid case the harness records baseline and candidate normalized ciphertext diffusion, diffusion delta, relative diffusion, expansion ratio, exact round-trip status, configuration identity, and findings. Aggregate output reports improved/neutral/regressed counts, failures, per-fan-out mean delta, and ranked strongest/worst cases.

A configuration failure remains visible as a failed case. It is not silently omitted from aggregate evidence.

## Three access surfaces

Humans use `binary-cube-subcube-matrix-laboratory.html`. Conventional integrations call `runSubcubeStrengthMatrix(request)` from `binary-cube-subcube-strength-matrix.js`. AI hosts project `skills/binary-cube-laboratory/subcube-matrix-tool-projection.json` and invoke `binary_cube_run_subcube_strength_matrix`.

## Promotion rule

Subcube indexing is not promoted into ordinary encryption because a handful of cases improve. Promotion requires exact recovery across the acceptance matrix, no unexplained configuration failures, a repeatable diffusion benefit that survives low-entropy and repeated-pattern cases, understood regressions, and an expansion/runtime cost justified by the measured benefit.

## Next target

After runtime execution produces real measurements, add localized region-damage experiments. Remove or corrupt one indexed region after cube recovery and measure strict detection, recoverability, silent-corruption resistance, and whether higher fan-out offers useful fault tolerance or only redundancy.