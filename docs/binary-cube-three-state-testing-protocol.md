# Binary Cube Three-State Testing Protocol

**Laboratory:** Binary Cube Encryption Laboratory  
**Capability:** `shadowrun.binary-cube`  
**Protocol:** `binary-cube-three-state-validation-v1`  
**Authoritative engine:** `shadowrun-binary-cube-engine.js`  
**Test catalog:** `skills/binary-cube-laboratory/test-packages.json`  
**Shared validator:** `binary-cube-three-state-validator.js`  
**Human harness:** `binary-cube-test-laboratory.html`  
**Node/API surface:** `binary-cube-node-adapter.js`  
**AI tool projection:** `skills/binary-cube-laboratory/tool-projection.json`

## Purpose

The testing protocol separates correctness into three captured states instead of treating encryption/decryption as one opaque round trip. Every ordinary positive test must preserve evidence from before encryption, while encrypted, and after recovery. Validator failures are tested independently with deliberate malformed or tampered inputs.

The engine remains experimental TTRPG permutation/obfuscation research rather than production cryptography. Statistical scrambling observations are therefore research measurements and weakness indicators, not claims of cryptographic security.

## State 1 — pre-encryption capture

Before calling encryption, capture the normalized source bitstream, its bit length, SHA-256 digest, binary statistics, the complete canonical key, key ID/digest, and effective key configuration. The key must pass canonical `validateKey` before the test may proceed.

A State 1 failure means the test input or configuration itself is invalid. It must not be silently corrected. Examples include empty/non-binary input, illegal grid sizes, identical input/output faces, and opposite faces.

## State 2 — encrypted capture and scrambling validation

Encrypt the State 1 payload through canonical `encryptBinary`, then validate the resulting package with the captured key. Establish **method validity** with all of the following requirements:

1. Canonical `validatePackage` succeeds with the captured key.
2. Package key ID and SHA-256 key digest match the State 1 key.
3. Re-encrypting the exact State 1 bitstream with the exact State 1 key produces the exact same canonical package. This deterministic replay proves that the captured package is consistent with the authoritative Binary Cube transformation rather than merely looking scrambled.

After method validity is established, evaluate scrambling quality separately. Capture exact plaintext equality, complete plaintext substring exposure, aligned Hamming distance, ciphertext zero/one balance, transition rate, longest run, and binary entropy. Threshold warnings are findings, not excuses to alter the output.

State 2 has three useful interpretations:

- `valid-scrambled`: canonical method validation passes and no direct plaintext exposure is observed.
- `valid-with-scrambling-weakness`: canonical method validation passes but an obvious plaintext-preservation condition is observed. Preserve this result as algorithm/configuration evidence.
- `invalid-method-state`: package/key/replay validation fails. Treat this as corruption, an invalid transform, or a validator defect until investigated.

## State 3 — recovered capture

Validate the key and encrypted package again, decrypt through canonical `decryptBinary`, and capture the recovered bitstream, length, SHA-256 digest, and bit statistics. Recovery passes only when all three conditions hold:

1. Recovered bits are exactly identical to State 1 normalized bits.
2. Recovered bit length is exactly identical to State 1 length.
3. Recovered SHA-256 digest is exactly identical to State 1 digest.

No fuzzy or semantic equivalence is allowed. A one-bit discrepancy is a failed round trip.

## Registered positive package set

The initial catalog deliberately spans different failure and weakness surfaces rather than only normal-looking random payloads. It includes a canonical four-cell baseline, minimum legal grid/single-bit input, all-zero and all-one low-entropy payloads, alternating bits, repeated byte patterns, sparse-mask/high-padding pressure, full-mask behavior, rotation extremes, whitespace normalization, and multi-block payloads.

These packages are deterministic. Their purpose is regression comparison across engine revisions, browser/Node/tool surfaces, operating systems, and later algorithm configurations.

## Registered validator-error package set

Negative tests must be rejected at the expected validator layer. The initial set includes empty input, non-binary input, below-minimum grid size, same-face geometry, opposite-face geometry, ciphertext bit flips, ciphertext truncation, checksum tampering, package key-ID tampering, package format tampering, an alternate valid-but-wrong key, key fingerprint tampering, key SHA-256 digest tampering, empty key masks, and duplicate permutation entries.

A negative test passes only when the invalid state is actually rejected. A validator that accepts a deliberately corrupted artifact is a test failure even if decryption later happens to fail.

## Execution surfaces

For a human browser session, open `binary-cube-test-laboratory.html`. Run a registered test for reproducibility, use the custom configuration panel for exploration, or run the complete suite. The page displays all three state captures and scrambling observations while retaining the complete structured report.

For Node or conventional software, use `listTestPackages()` and `runThreeStateValidation({testId})`; call `runThreeStateValidation({})` for the full catalog. CLI equivalents are `test-packages` and `validation-suite`.

For an AI/tool host, use `binary_cube_list_test_packages` and `binary_cube_validate_three_state`. The structured response must be preserved as evidence; an AI should not rewrite a failed package into a passing one.

## Configuration-expansion matrix

After the baseline catalog is stable, expand testing systematically across these axes instead of generating random configurations without coverage accounting:

| Axis | Initial sweep | Later stress sweep |
| --- | --- | --- |
| Grid size | 3, 4, 12, 16 | recommended sizes through 1024 subject to memory/time limits |
| Mask density | 0.01, 0.05, 0.25, 0.5, 0.75, 1.0 | fine-grained boundary sweeps around cell-count transitions |
| Input face | all six faces | all legal face/rotation combinations |
| Output face | all four legal perpendicular faces per input | exhaustive legal face pairs |
| Input turns | 0, 1, 2, 3 | exhaustive with output turns |
| Output turns | 0, 1, 2, 3 | exhaustive with input turns |
| Payload length | 1 bit, below capacity, exact capacity, capacity+1, multi-block | large multi-block and memory-bound cases |
| Payload structure | zeros, ones, alternating, repeated bytes, mixed patterns | deterministic pseudo-random and adversarial pattern families |
| Key reuse | one payload, repeated identical payload, differing payloads | repeated-package correlation analysis |
| Fault injection | package, ciphertext, checksum, key identity, key structure | mutation-by-field and mutation-by-bit sweeps |

Each sweep should record runtime duration and captured output size so efficiency regressions can be compared with correctness and weakness findings.

## Weakness-analysis expansion

Once correctness and validator rejection are stable, add comparative measurements rather than replacing the three-state protocol. Candidate measurements include per-block repetition frequency, avalanche sensitivity from one-bit source changes, sensitivity to one-bit key/configuration changes, ciphertext correlation between repeated inputs, per-face/rotation leakage differences, mask-density leakage differences, filler influence, repeated-key correlation, and scaling behavior by grid size and block count.

Weakness findings should include the exact test package/configuration required to reproduce them.

## Acceptance gates

A revision is not three-state validated merely because one encrypt/decrypt round trip succeeds. At minimum, all registered positive packages must successfully capture State 1, establish State 2 canonical method validity, and recover exact State 3 content. All registered negative packages must be rejected at their intended validator stage. Any scrambling weakness warnings are retained in the report and reviewed separately from transform correctness.

Browser, Node, and AI/tool hosts must not inherit another host's readiness claim. Each host must execute the shared validator in its own runtime before being called validated or ready.

## Continuity rule

When a defect is discovered, add or refine a package that reproduces it before or alongside the authoritative repair. Keep that package in the catalog after repair so the same defect cannot silently return. Do not weaken the validator or delete a difficult case merely to restore a green suite.
