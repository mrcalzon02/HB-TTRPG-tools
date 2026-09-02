---
name: binary-cube-laboratory
description: Use the Foundry Binary Cube Laboratory for TTRPG-oriented cube permutation/obfuscation experiments, key creation, binary encryption/decryption, three-state validation, projection diagnostics, transformation traces, invariants, and validator fault testing. Activate when a user asks to operate, inspect, validate, or test the Binary Cube engine.
compatibility: Requires HBFoundryAPI, shadowrun-binary-cube-engine.js, or the dependency-free binary-cube-node-adapter.js on Node/CommonJS. Structured AI hosts can project skills/binary-cube-laboratory/tool-projection.json into local function tools. This engine is experimental TTRPG obfuscation research, not production cryptography.
metadata:
  author: mrcalzon02
  version: "1.6.0"
  foundry-capability: shadowrun.binary-cube
---

# Binary Cube Laboratory

Use `shadowrun.binary-cube` and its self-describing operation contracts. Browser UI actions, Foundry API calls, Node/CommonJS calls, CLI calls, test protocol calls, and AI/tool calls converge on `shadowrun-binary-cube-engine.js`; adapters and validators may compose or inspect canonical operations but must not recreate cube transformation logic.

## Ordinary workflow

For ordinary encryption/decryption, prefer the high-level workflows instead of manually chaining low-level calls. They mirror the browser laboratory's simple Encrypt/Decrypt actions.

- Node: `encryptWorkflow({bits, key?, keyOptions?})` creates or validates a key, encrypts through `encryptBinary`, validates the resulting package, and returns the separate key and package.
- Node: `decryptWorkflow({package, key})` validates both artifacts, decrypts through `decryptBinary`, and returns recovered bits.
- CLI: `node binary-cube-node-adapter.js encrypt '<json>'` and `node binary-cube-node-adapter.js decrypt '<json>'`.
- Structured AI hosts: prefer `binary_cube_encrypt` and `binary_cube_decrypt` for common work.

Canonical key creation options are `gridSize`, `seed`, `inputFace`, `outputFace`, `inputQuarterTurns`, `outputQuarterTurns`, and `maskDensity`. Do not substitute legacy or guessed option names.

## Three-state validation workflow

Use `binary-cube-three-state-validator.js` and `skills/binary-cube-laboratory/test-packages.json` for algorithm/configuration testing. The validator records three distinct states.

1. **Pre-encryption:** normalize and capture the source bitstream, SHA-256 digest, bit statistics, canonical key, and effective key configuration before encryption.
2. **Encrypted:** capture the canonical package; require package validation, key binding, and deterministic re-encryption equivalence to establish that the state came from the Binary Cube method. Separately measure plaintext equality/substrings, aligned Hamming distance, bit balance, transition rate, longest run, and binary entropy so weak scrambling is reported as a weakness rather than confused with a foreign/invalid transform.
3. **Recovered:** decrypt the captured package and require exact source-bit equality, bit-length equality, and SHA-256 digest equality.

The registered catalog contains deterministic normal packages, minimum-grid and sparse/full-mask cases, low-entropy inputs, repeating patterns, rotations, whitespace normalization, and multi-block cases. Negative packages deliberately exercise input validation, illegal face geometry, ciphertext/checksum/package tampering, wrong valid keys, fingerprint/digest failures, empty masks, and malformed permutations.

For humans, use `binary-cube-test-laboratory.html` to run a registered package, a custom configuration, or the complete suite and inspect the three captures side by side. For Node/CLI, use `listTestPackages()` / `test-packages` and `runThreeStateValidation(...)` / `validation-suite`. Structured AI hosts use `binary_cube_list_test_packages` and `binary_cube_validate_three_state`.

A method-valid encrypted state with quality warnings is a legitimate finding. Do not discard or rewrite it merely to make the suite green; record the weakness and use it to guide later configuration and algorithm analysis.

## Research workflow

1. Identify the requested low-level operation.
2. Retrieve its canonical operation definition before building positional arguments: `HBFoundryAPI.operationContract(...)` in-browser, `operationContract(name)` in Node, or `contract <operation>` in the CLI.
3. Invoke through the available surface: `HBFoundryAPI.invoke(...)`, Node `invoke({operation,args})`, CLI `invoke`, or `binary_cube_invoke` in a structured tool host.
4. Preserve key IDs/digests, schema/format versions, checksums, validation results, and transformation/invariant evidence.
5. If imported artifacts fail validation, report the failure instead of repairing them heuristically.

## Capability discovery

`describe()` reports runtime, security classification, workflows, three-state protocol, and discovery facilities. `listOperations()` returns every allowed low-level operation with canonical arguments and return contract. `operationContract(name)` returns one operation contract. `listTestPackages()` returns the registered test matrix. CLI equivalents are `describe`, `operations`, `contract <operation>`, and `test-packages`.

The adapter validates every low-level operation against both the capability allow-list and canonical operation registry before dispatching. High-level workflows and testing facilities remain orchestration/validation over the same engine.

## Structured AI and tool projection

`skills/binary-cube-laboratory/tool-projection.json` is the portable machine projection. It supplies bounded tools for description, operation listing, contract lookup, low-level invocation, high-level encryption/decryption, test-package discovery, three-state validation, and deterministic self-test. Its OpenAI-function-tool and MCP notes describe host mapping only; it is not a remote service.

Prefer `binary_cube_describe` → `binary_cube_encrypt` / `binary_cube_decrypt` for ordinary tasks. Prefer `binary_cube_list_test_packages` → `binary_cube_validate_three_state` for algorithm/configuration testing. Prefer `binary_cube_describe` → `binary_cube_operation_contract` → `binary_cube_invoke` for low-level research and diagnostics.

## Portable package and acceptance

The companion package metadata is `skills/binary-cube-laboratory/manifest.json`. Before reporting `self-test-passed` or `ready` for a host, execute the relevant deterministic self-test and validation gates against the canonical runtime. Browser hosts can use the portable loader and the three-state test laboratory; Node hosts can use `runSelfTest()`, `runThreeStateValidation()`, and `binary-cube-parity-runner.js`.

If the current host cannot load or execute a declared runtime, report `incompatible` or `runtime-required` rather than claiming execution.

## Security classification

This is experimental tabletop-RPG permutation/obfuscation research, not production cryptography. Scrambling metrics are research diagnostics, not claims of cryptographic security. Do not describe the engine as secure encryption suitable for real secrets.

## Hard rules

- Every low-level dispatcher operation must come from the registered capability allow-list and have an operation contract.
- High-level workflows and validators may compose canonical operations but may not reproduce their internal algorithms.
- Never infer positional arguments or key option names from function names.
- Never bypass key/package/trace validation to force a result.
- Preserve failing edge cases and weakness findings as evidence rather than silently normalizing them away.
- Do not load cross-origin runtime code merely because a manifest names it.
- Keep browser, Node, CLI, test, and AI/tool terminology aligned.
- Treat tool projections as local descriptors, never evidence that a remote RPC/MCP service exists.

## Discovery links

- `https://mrcalzon02.github.io/HB-TTRPG-tools/api/foundry-capabilities.json`
- `https://mrcalzon02.github.io/HB-TTRPG-tools/api/operation-contracts.json`
- `https://mrcalzon02.github.io/HB-TTRPG-tools/binary-cube-test-laboratory.html`
- `https://mrcalzon02.github.io/HB-TTRPG-tools/skills/binary-cube-laboratory/manifest.json`
- `https://mrcalzon02.github.io/HB-TTRPG-tools/skills/binary-cube-laboratory/tool-projection.json`
- `https://mrcalzon02.github.io/HB-TTRPG-tools/skills/binary-cube-laboratory/test-packages.json`
- `https://mrcalzon02.github.io/HB-TTRPG-tools/skills/binary-cube-laboratory/self-test.json`
