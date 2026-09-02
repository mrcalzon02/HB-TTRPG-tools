---
name: binary-cube-laboratory
description: Use the Foundry Binary Cube Laboratory for TTRPG-oriented cube permutation/obfuscation experiments, key creation, binary encryption/decryption, reversible pre-entry masking, three-state validation, perturbation strength analysis, projection diagnostics, transformation traces, invariants, and validator fault testing. Activate when a user asks to operate, inspect, validate, strengthen, or test the Binary Cube engine.
compatibility: Requires HBFoundryAPI, shadowrun-binary-cube-engine.js, or the dependency-free binary-cube-node-adapter.js on Node/CommonJS. Structured AI hosts can project skills/binary-cube-laboratory/tool-projection.json into local function tools. This engine is experimental TTRPG obfuscation research, not production cryptography.
metadata:
  author: mrcalzon02
  version: "1.7.0"
  foundry-capability: shadowrun.binary-cube
---

# Binary Cube Laboratory

Use `shadowrun.binary-cube` and its self-describing operation contracts. Browser UI actions, Foundry API calls, Node/CommonJS calls, CLI calls, mask/strength-analysis calls, test protocol calls, and AI/tool calls converge on the same canonical modules. Adapters and validators may compose or inspect those authorities but must not recreate cube transformation or mask-generation logic.

## Ordinary workflow

For ordinary encryption/decryption, prefer the high-level workflows instead of manually chaining low-level calls. They mirror the browser laboratory's simple Encrypt/Decrypt actions.

- Node: `encryptWorkflow({bits, key?, keyOptions?})` creates or validates a key, encrypts through `encryptBinary`, validates the resulting package, and returns the separate key and package.
- Node: `decryptWorkflow({package, key})` validates both artifacts, decrypts through `decryptBinary`, and returns recovered bits.
- CLI: `node binary-cube-node-adapter.js encrypt '<json>'` and `node binary-cube-node-adapter.js decrypt '<json>'`.
- Structured AI hosts: prefer `binary_cube_encrypt` and `binary_cube_decrypt` for common work.

Canonical key creation options are `gridSize`, `seed`, `inputFace`, `outputFace`, `inputQuarterTurns`, `outputQuarterTurns`, and `maskDensity`. Do not substitute legacy or guessed option names.

## Pre-entry field masking

`binary-cube-pre-entry-mask.js` is the shared reversible preprocessing authority. It XORs a generated mask field with normalized source bits before cube encryption and regenerates/removes that field only after cube decryption. It does not alter `shadowrun-binary-cube-engine.js`.

Implemented methods are `none`, `white-noise`, `newspaper-cutout`, `plasma-noise`, `cellular-diffusion`, `crosshatch-jitter`, and `burst-cluster`.

Use:

- `listPreEntryMaskMethods()` / CLI `mask-methods` / AI `binary_cube_list_pre_entry_masks` for discovery.
- `applyPreEntryMask({bits,maskOptions})` / CLI `mask` / AI `binary_cube_apply_pre_entry_mask` for inspection.
- `removePreEntryMask({maskedBits,preEntryMask})` / CLI `unmask` / AI `binary_cube_remove_pre_entry_mask` for reversal.
- `maskedEncryptWorkflow(...)` / CLI `masked-encrypt` / AI `binary_cube_masked_encrypt` for mask -> canonical cube encryption.
- `maskedDecryptWorkflow(...)` / CLI `masked-decrypt` / AI `binary_cube_masked_decrypt` for canonical cube decryption -> unmask.
- `runPreEntryMaskSelfTest()` / CLI `mask-self-test` / AI `binary_cube_pre_entry_mask_self_test` for deterministic/reversible host validation.

The mask descriptor contains deterministic regeneration parameters and is recovery material. During secrecy-oriented experiments, keep it with the separate cube key rather than the ciphertext package. These masks are experimental pattern-masking methods, not production cryptographic stream ciphers.

A fixed XOR mask can alter visible low-entropy structure, bit balance, runs, and transitions, but it does not create avalanche diffusion by itself: the same one-bit source perturbation remains a one-bit perturbation after applying the same mask. Treat that limitation as evidence, not a failure to report.

Humans use `binary-cube-pre-entry-mask-laboratory.html` to visualize the mask field, masked cube input, mask statistics, separate recovery descriptor, cube key/package, and exact masked decrypt/unmask recovery. The ordinary Binary Cube UI remains unchanged until masked workflows pass browser and Node acceptance gates.

## Three-state validation workflow

Use `binary-cube-three-state-validator.js` and `skills/binary-cube-laboratory/test-packages.json` for algorithm/configuration testing. The validator remains exactly three states; optional pre-entry masking is captured inside State 1.

1. **Pre-encryption:** capture the untouched normalized source, SHA-256 digest, bit statistics, optional mask descriptor/statistics, source-to-masked Hamming change, exact cube-input field/digest, canonical key, and effective configuration.
2. **Encrypted:** capture the canonical package; require package validation, key binding, and deterministic re-encryption equivalence from the exact captured cube-input field. Separately measure plaintext/ciphertext and masked-input/ciphertext quality signals when applicable.
3. **Recovered:** require exact cube-input recovery after cube decryption; remove any captured pre-entry mask; then require exact original source-bit, bit-length, and SHA-256 equivalence.

The registered catalog includes unmasked controls, minimum-grid and sparse/full-mask cases, low-entropy inputs, repeating patterns, rotations, whitespace normalization, multi-block cases, and pre-entry masked cases for white noise, newspaper cut-out, plasma noise, and cellular diffusion. Negative packages deliberately exercise input validation, illegal face geometry, unsupported mask methods, ciphertext/checksum/package tampering, wrong valid keys, fingerprint/digest failures, empty masks, and malformed permutations.

For humans, use `binary-cube-test-laboratory.html`. For Node/CLI, use `listTestPackages()` / `test-packages` and `runThreeStateValidation(...)` / `validation-suite`. Structured AI hosts use `binary_cube_list_test_packages` and `binary_cube_validate_three_state`.

A method-valid encrypted state with quality warnings is a legitimate finding. Do not discard or rewrite it merely to make the suite green; record the weakness and use it to guide later configuration and algorithm analysis.

## Strength analysis

Use `binary-cube-strength-analysis.js` or AI `binary_cube_strength_analysis` to measure sampled one-bit plaintext perturbation diffusion, deterministic key-seed perturbation diffusion, and localized `gridSize^2` diagnostic-window behavior. These are comparative diagnostics, not proofs of cryptographic security.

Strengthening mechanisms should be evaluated against the same source/key/configuration baseline. Do not enable a new layer solely because it sounds stronger.

## Planned subcube multi-input indexing

The authoritative design record is `docs/binary-cube-subcube-multi-input-indexing-plan.md`. This is a design gate, not an implemented encryption mode.

The experiment changes one logical source bit into several keyed physical cube-entry inputs distributed across separate subcube regions when capacity allows. The initial comparison is fan-out 1 versus fan-out 3, then 5/7 only if results justify expansion.

Two modes are planned:

- `direct-replication` as a diagnostic control; it is intentionally not assumed to strengthen secrecy.
- `keyed-codeword` as the preferred experiment, where a logical bit selects between keyed codewords so changing one logical bit intentionally changes multiple physical entry positions.

Before integration, the standalone indexing layer must prove deterministic planning, zero placement collisions, exact encode/decode recovery, configured fan-out, cross-region coverage, wrong-plan rejection, boundary handling, expansion accounting, localized-corruption behavior, and measurable post-cube diffusion improvement over fan-out 1. Do not modify the canonical cube engine for the first indexing experiment.

## Research workflow

1. Identify the requested low-level operation or experimental layer.
2. Retrieve canonical operation definitions before building positional arguments: `HBFoundryAPI.operationContract(...)` in-browser, `operationContract(name)` in Node, or `contract <operation>` in the CLI.
3. Invoke through the available authoritative surface.
4. Preserve key IDs/digests, mask descriptors, schema/format versions, checksums, validation results, perturbation measurements, and transformation/invariant evidence.
5. If imported artifacts fail validation, report the failure instead of repairing them heuristically.

## Capability discovery

`describe()` reports runtime, security classification, workflows, pre-entry masking, three-state protocol, and discovery facilities. `listOperations()` returns every allowed low-level operation with canonical arguments and return contract. `operationContract(name)` returns one operation contract. `listTestPackages()` returns the registered test matrix. `listPreEntryMaskMethods()` returns the available pre-entry field masks.

The adapter validates every low-level cube operation against both the capability allow-list and canonical operation registry before dispatching. High-level workflows and testing facilities remain orchestration/validation over the same authorities.

## Structured AI and tool projection

`skills/binary-cube-laboratory/tool-projection.json` is the portable machine projection. It supplies bounded tools for description, operation listing, contract lookup, low-level invocation, ordinary encryption/decryption, pre-entry mask discovery/application/removal, masked encryption/decryption, mask self-test, test-package discovery, three-state validation, strength analysis, and deterministic cube self-test. Its OpenAI-function-tool and MCP notes describe host mapping only; it is not a remote service.

Prefer `binary_cube_describe` -> `binary_cube_encrypt` / `binary_cube_decrypt` for ordinary tasks. Prefer `binary_cube_list_pre_entry_masks` -> `binary_cube_masked_encrypt` / `binary_cube_masked_decrypt` for mask experiments. Prefer `binary_cube_list_test_packages` -> `binary_cube_validate_three_state` -> `binary_cube_strength_analysis` for configuration/strength testing.

## Portable package and acceptance

The companion package metadata is `skills/binary-cube-laboratory/manifest.json`. Before reporting `self-test-passed` or `ready` for a host, execute the relevant deterministic self-test and validation gates against the canonical runtime. Browser hosts can use the portable loader and human research laboratories; Node hosts can use `runSelfTest()`, `runPreEntryMaskSelfTest()`, `runThreeStateValidation()`, and `binary-cube-parity-runner.js`.

If the current host cannot load or execute a declared runtime, report `incompatible` or `runtime-required` rather than claiming execution.

## Security classification

This is experimental tabletop-RPG permutation/obfuscation research, not production cryptography. Scrambling, masking, and diffusion metrics are research diagnostics, not security proofs. Do not describe the engine or experimental strengthening layers as secure encryption suitable for real secrets.

## Hard rules

- Every low-level cube dispatcher operation must come from the registered capability allow-list and have an operation contract.
- High-level workflows, masks, validators, and analyzers may compose canonical operations but may not reproduce their internal cube algorithm.
- Keep the pre-entry mask descriptor separate from canonical cube package semantics.
- Never infer positional arguments or key option names from function names.
- Never bypass key/package/mask/trace validation to force a result.
- Preserve failing edge cases and weakness findings as evidence rather than silently normalizing them away.
- Do not promote subcube multi-input indexing from design to normal encryption until its standalone validation and comparative strength gates are observed passing.
- Do not load cross-origin runtime code merely because a manifest names it.
- Keep browser, Node, CLI, test, and AI/tool terminology aligned.
- Treat tool projections as local descriptors, never evidence that a remote RPC/MCP service exists.

## Discovery links

- `https://mrcalzon02.github.io/HB-TTRPG-tools/api/foundry-capabilities.json`
- `https://mrcalzon02.github.io/HB-TTRPG-tools/api/operation-contracts.json`
- `https://mrcalzon02.github.io/HB-TTRPG-tools/binary-cube-test-laboratory.html`
- `https://mrcalzon02.github.io/HB-TTRPG-tools/binary-cube-pre-entry-mask-laboratory.html`
- `https://mrcalzon02.github.io/HB-TTRPG-tools/binary-cube-strength-laboratory.html`
- `https://mrcalzon02.github.io/HB-TTRPG-tools/skills/binary-cube-laboratory/manifest.json`
- `https://mrcalzon02.github.io/HB-TTRPG-tools/skills/binary-cube-laboratory/tool-projection.json`
- `https://mrcalzon02.github.io/HB-TTRPG-tools/skills/binary-cube-laboratory/test-packages.json`
- `https://mrcalzon02.github.io/HB-TTRPG-tools/skills/binary-cube-laboratory/self-test.json`
