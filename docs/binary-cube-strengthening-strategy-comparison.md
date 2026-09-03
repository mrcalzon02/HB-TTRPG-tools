# Binary Cube strengthening strategy comparison

Status: implemented experimental; runtime evidence required.

`binary-cube-strengthening-strategy-comparison.js` is the common comparison authority for three strategies: the ordinary unstrengthened Cube input, subcube fan-out, and reversible data-dependent chaining. It composes the canonical Cube engine and existing strengthening modules; it does not duplicate their transformation logic.

For one source and one generated Cube key, the comparison samples identical source-bit perturbations for every strategy. It records exact round-trip recovery, normalized pre-Cube Hamming diffusion, normalized ciphertext Hamming diffusion, representation expansion, and observed runtime-local timing. Subcube fan-out is therefore charged for its larger representation while chaining remains length-preserving. Timing is diagnostic evidence from the executing environment, not a portable performance guarantee.

The comparison does not declare a cryptographic winner and does not promote any strengthening layer into ordinary encryption. A strategy remains experimental until representative acceptance-campaign evidence demonstrates repeatable benefit without violating recovery, integrity, portability, usability, or cost gates. A positive diffusion result alone is insufficient.

## Access-surface parity

Humans use `binary-cube-strengthening-strategy-laboratory.html`. Conventional software calls `describe()` or `compare(request)` from the comparison authority. AI hosts use `skills/binary-cube-laboratory/strategy-comparison-tool-projection.json`. All three surfaces converge on the same implementation.

## Next acceptance step

Run this authority across the canonical seven-family acceptance corpus and aggregate strategy rankings by payload family. The campaign must preserve per-family evidence so low-entropy or boundary regressions cannot be hidden by a favorable global mean. Memory-cost instrumentation should be added only when it can be measured portably enough to avoid invented precision.