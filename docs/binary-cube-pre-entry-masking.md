# Binary Cube Pre-Entry Masking

**Project:** Cube Encryption Laboratory / HB-TTRPG-tools  
**Authority scope:** Reversible input-field masking before canonical Binary Cube encryption.  
**Implementation:** `binary-cube-pre-entry-mask.js`  
**Human laboratory:** `binary-cube-pre-entry-mask-laboratory.html`  
**Security classification:** Experimental TTRPG obfuscation research, not production cryptography.

## Purpose

Pre-entry masking transforms the normalized source bitfield before it is passed to `shadowrun-binary-cube-engine.js`. The mask layer is deliberately independent of the cube transform so each mechanism can be tested, enabled, disabled, and measured without creating another Binary Cube implementation.

The operation is reversible XOR:

- source bits XOR generated mask -> masked cube-input bits;
- cube encryption/decryption operates on those masked bits without knowing how the mask was generated;
- recovered masked bits XOR the exact regenerated mask -> original source bits.

The mask descriptor contains all deterministic regeneration parameters and a checksum of the generated mask field. It is recovery material. For secrecy-oriented experiments it should be stored with the separate key rather than transmitted beside the ciphertext package.

## Implemented methods

The initial method set intentionally includes stochastic-looking and highly structured controls.

- **None:** all-zero mask. Exact control condition.
- **White Noise:** independent deterministic pseudorandom mask bits across the field.
- **Newspaper Cut-Out:** irregular rectangular patches with torn edges and sparse local jitter, modeled after physical cut-and-paste masking.
- **Plasma Noise:** thresholded multi-octave interpolated value noise.
- **Cellular Diffusion:** seeded binary field evolved through local-neighbor cellular rules to create spreading clustered regions.
- **Crosshatch Jitter:** row/column banding with seeded local perturbation; a deliberately structured comparison condition.
- **Burst Cluster:** deterministic radial clusters distributed across the field; useful for localized masking tests.

All methods preserve bit length and are regenerated from a compact descriptor rather than storing the full mask bitfield as recovery material.

## Human workflow

`binary-cube-pre-entry-mask-laboratory.html` exposes:

- source bits;
- mask method;
- independent mask seed;
- field width;
- intensity;
- scale/octaves/cellular tuning;
- Binary Cube grid/key configuration;
- visual mask-field preview;
- visual masked-input preview;
- mask statistics;
- mask descriptor;
- separate cube key;
- canonical encrypted package;
- recovered plaintext;
- module self-test.

The page performs `source -> mask -> canonical cube encryption -> canonical cube decryption -> unmask -> exact comparison` without reproducing cube logic.

## API / CLI workflow

`binary-cube-node-adapter.js` exposes:

- `listPreEntryMaskMethods()`
- `applyPreEntryMask({bits, maskOptions})`
- `removePreEntryMask({maskedBits, preEntryMask})`
- `maskedEncryptWorkflow({bits, maskOptions, key?, keyOptions?})`
- `maskedDecryptWorkflow({package, key, preEntryMask})`
- `runPreEntryMaskSelfTest()`

CLI equivalents are `mask-methods`, `mask`, `unmask`, `masked-encrypt`, `masked-decrypt`, and `mask-self-test`.

The masked encryption workflow returns the canonical cube package unchanged plus separate recovery material containing the normal cube key and the pre-entry mask descriptor. The descriptor is not silently embedded inside the canonical cube package.

## AI / tool workflow

`skills/binary-cube-laboratory/tool-projection.json` exposes the same discovery, mask/unmask, masked encrypt/decrypt, and self-test functions to OpenAI-function-tool, MCP-style, or generic local JSON tool hosts. The tool projection binds to the same adapter/module and contains no mask or cube implementation of its own.

## Three-state validation integration

The existing `binary-cube-three-state-validation-v1` protocol remains three states. Pre-entry masking is captured inside State 1 rather than adding an incompatible fourth state.

### State 1 — pre-encryption

Capture:

- untouched normalized source bits and digest;
- optional mask descriptor and mask statistics;
- source-to-masked Hamming change;
- exact masked cube-input bits and digest;
- canonical cube key and effective configuration.

### State 2 — encrypted

Require canonical package validation, key binding, and deterministic replay from the exact captured cube-input field. Scrambling metrics are reported both against the original source and, when masking is active, against the actual masked cube input.

### State 3 — recovered

Require exact recovery of the captured cube-input field after cube decryption. If a mask was used, regenerate and remove it, then require exact original source-bit, length, and digest equivalence.

The registered package catalog includes masked low-entropy and repeated-pattern cases for white noise, newspaper cut-out, plasma noise, and cellular diffusion.

## What this layer can and cannot strengthen

A fixed deterministic XOR mask can materially alter visible bit balance, runs, transitions, and repeated low-entropy structures presented to the cube. If the mask seed is kept separate from ciphertext, it also adds recovery material that an observer does not automatically possess.

However, a fixed XOR mask does not create avalanche diffusion. For the same mask, flipping one source bit flips exactly one masked input bit. Any claim that pre-entry masking by itself increases one-bit perturbation diffusion would therefore be incorrect.

This limitation is intentional evidence for the next strengthening experiment: subcube multi-input indexing, where one logical source bit is encoded into several indexed cube-entry positions before the canonical transform.

## Required testing

For every mask method and meaningful parameter family, compare against an unmasked control using the same source and cube key. Record:

- exact mask determinism;
- exact unmask reversibility;
- mask density/entropy/transitions/run length;
- source-to-masked Hamming ratio;
- source and masked-input low-entropy statistics;
- final ciphertext statistics;
- exact cube-input recovery;
- exact plaintext recovery;
- runtime and memory overhead;
- descriptor tamper rejection;
- wrong-seed rejection or mismatch;
- behavior at payload/block boundaries.

Low-entropy improvement should be reported as a masking effect, not automatically promoted to a cryptographic-strength claim.

## Promotion gate

Pre-entry masking may be added to the ordinary Binary Cube UI only after the shared module and masked three-state packages execute successfully in browser and Node hosts and descriptor-recovery behavior is verified. Until then, the dedicated mask laboratory is the human research surface and ordinary unmasked encryption remains unchanged.
