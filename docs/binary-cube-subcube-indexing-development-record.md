# Binary Cube Subcube Indexing Development Record

**Status:** Standalone experimental implementation present on `main`; ordinary encryption integration remains gated.  
**Module:** `binary-cube-subcube-indexing.js`  
**Human surface:** `binary-cube-subcube-laboratory.html`  
**AI projection:** `skills/binary-cube-laboratory/subcube-tool-projection.json`  
**Security classification:** Experimental TTRPG obfuscation research, not production cryptography.

## Implemented in this cycle

The first subcube multi-input indexing implementation now exists outside the canonical cube engine. It supports fan-out 1, 3, 5, and 7; the initial self-test exercises fan-out 1 and 3. Two modes are implemented: `direct-replication` as a diagnostic control and `keyed-codeword` as the strengthening experiment.

A plan deterministically maps each logical source bit to multiple physical entry positions. When distinct-region placement is enabled, every share for one logical bit must occupy a different region. Accepted plans require complete physical-position accounting and zero collisions. Encoding expands the logical field by the selected fan-out. Strict decoding regenerates the expected zero/one codewords and rejects observations that match neither state rather than silently producing corrupted plaintext.

The keyed-codeword mode derives a deterministic base codeword from the indexing seed and logical index. Logical zero uses the base codeword and logical one uses its complement, so a one-bit logical change affects every physical share for that logical index. This establishes the intended multi-input perturbation behavior before the canonical cube transform; whether that produces useful post-cube diffusion remains an empirical question.

## Access-surface parity

Humans can build, inspect, encode, decode, and visualize logical-bit placements in `binary-cube-subcube-laboratory.html`. Conventional JavaScript/Node consumers can require the standalone module and call `listSubcubeIndexingModes`, `buildSubcubeIndexPlan`, `validateSubcubeIndexPlan`, `encodeSubcubeInputs`, `decodeSubcubeInputs`, `analyzeSubcubeCoverage`, and `runSubcubeIndexingSelfTest`. AI hosts can project the same functions from `subcube-tool-projection.json` without duplicating indexing logic.

This is deliberately not yet added to `encryptWorkflow`, `maskedEncryptWorkflow`, or the ordinary Binary Cube browser interface. Promotion requires observed runtime acceptance and comparative post-cube strength evidence.

## Verification state

GitHub create/update receipts and destination read-back establish that the implementation files are present on authoritative `main`. A direct Node runtime attempt was made from the execution container, but DNS resolution for `raw.githubusercontent.com` failed before the authoritative module could be loaded. Therefore the standalone self-test is implemented but is **not claimed runtime-passed**.

## Next development target

Run the standalone self-test in an environment that can load the authoritative file. Then add a comparative experimental workflow that feeds fan-out 1 and fan-out 3 encoded fields through the existing canonical cube engine with identical cube-key conditions. Measure source-bit perturbation to pre-cube Hamming change, post-cube ciphertext diffusion, repeated-pattern behavior, low-entropy behavior, runtime, and expansion cost. Only measured improvement should justify integration into ordinary encryption.
