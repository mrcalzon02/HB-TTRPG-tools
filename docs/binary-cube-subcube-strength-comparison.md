# Binary Cube Subcube Strength Comparison

**Status:** Experimental comparison harness implemented; runtime acceptance pending.

## Development target

Measure whether subcube multi-input indexing actually improves diffusion rather than promoting fan-out on architectural intuition alone.

## Implementation

`binary-cube-subcube-strength-comparison.js` composes the authoritative `binary-cube-subcube-indexing.js` and `shadowrun-binary-cube-engine.js`. It compares fan-out 1 against a requested fan-out (initially 3; 5/7 are available for later sweeps) using the same source data, cube key and indexing mode.

For sampled one-bit source perturbations it records the normalized Hamming change in the encoded pre-cube field and in the resulting ciphertext. It also verifies exact encrypt/decrypt/index-decode recovery, reports region coverage and collision state, and records the physical expansion cost.

A non-positive mean ciphertext-diffusion delta is a high-severity research finding. This threshold does not assert that a positive delta proves security.

## Access surfaces

Humans use `binary-cube-subcube-strength-laboratory.html`. Conventional JavaScript/CommonJS callers use `compareSubcubeStrength(request)`. AI hosts can project `skills/binary-cube-laboratory/subcube-strength-tool-projection.json` and invoke `binary_cube_compare_subcube_strength`.

All three surfaces converge on the same comparison module and canonical cube/indexing implementations.

## Verification state

Repository writes and GitHub destination read-back are required before claiming repository completion. Runtime acceptance remains a separate gate: the comparison harness must execute in Node and a browser host before any measured diffusion result is treated as observed evidence.

## Next target

Run a systematic matrix over low-entropy, repeated-pattern and mixed payloads; fan-out 1/3; direct-replication/keyed-codeword; grid sizes; mask densities; face/rotation configurations; and block-boundary lengths. If fan-out 3 shows repeatable benefit, add localized-region corruption tests and only then consider integrating subcube indexing into the high-level masked encryption workflow.