---
name: binary-cube-laboratory
description: Use the Foundry Binary Cube Laboratory for TTRPG-oriented cube permutation/obfuscation experiments, key creation, binary encryption/decryption, projection diagnostics, transformation traces, and invariants. Activate when a user asks to operate or inspect the Binary Cube engine.
compatibility: Requires HBFoundryAPI, shadowrun-binary-cube-engine.js, or the dependency-free binary-cube-node-adapter.js on Node/CommonJS. Structured AI hosts can project skills/binary-cube-laboratory/tool-projection.json into local function tools. This engine is experimental TTRPG obfuscation research, not production cryptography.
metadata:
  author: mrcalzon02
  version: "1.5.0"
  foundry-capability: shadowrun.binary-cube
---

# Binary Cube Laboratory

Use `shadowrun.binary-cube` and its self-describing operation contracts. Browser UI actions, Foundry API calls, Node/CommonJS calls, CLI calls, and AI/tool calls converge on `shadowrun-binary-cube-engine.js`; adapters may compose canonical operations but must not recreate cube transformation logic.

## Ordinary workflow

For ordinary encryption/decryption, prefer the high-level workflows instead of manually chaining low-level calls. They deliberately mirror the browser laboratory's simple Encrypt/Decrypt actions.

- Node: `encryptWorkflow({bits, key?, keyOptions?})` creates or validates a key, encrypts through `encryptBinary`, validates the resulting package, and returns the separate key and package.
- Node: `decryptWorkflow({package, key})` validates both artifacts, decrypts through `decryptBinary`, and returns recovered bits.
- CLI: `node binary-cube-node-adapter.js encrypt '<json>'` and `node binary-cube-node-adapter.js decrypt '<json>'`; the same JSON may be supplied on stdin for shell-independent automation.
- Structured AI hosts: prefer `binary_cube_encrypt` and `binary_cube_decrypt` for common work.

The browser laboratory remains the primary interactive human workflow and already presents the same conceptual actions with labeled controls, separate key/package handling, validation, status, and diagnostics.

## Research workflow

1. Identify the requested low-level operation.
2. Retrieve its canonical operation definition before building positional arguments: `HBFoundryAPI.operationContract(...)` in-browser, `operationContract(name)` in Node, or `contract <operation>` in the CLI.
3. Invoke through the available surface: `HBFoundryAPI.invoke(...)`, Node `invoke({operation,args})`, CLI `invoke`, or `binary_cube_invoke` in a structured tool host.
4. Preserve key IDs/digests, schema/format versions, checksums, validation results, and transformation/invariant evidence.
5. If imported artifacts fail validation, report the failure instead of repairing them heuristically.

## Capability discovery

`describe()` reports runtime, security classification, workflows, and discovery facilities. `listOperations()` returns every allowed low-level operation with canonical arguments and return contract. `operationContract(name)` returns one operation contract. CLI equivalents are `describe`, `operations`, and `contract <operation>`.

The adapter validates every low-level operation against both the capability allow-list and canonical operation registry before dispatching. High-level workflows compose those validated operations and therefore remain thin orchestration over the same engine.

## Structured AI and tool projection

`skills/binary-cube-laboratory/tool-projection.json` is the portable machine projection. It supplies seven bounded tools: laboratory description, operation listing, contract lookup, low-level invocation, high-level encryption, high-level decryption, and deterministic self-test. Its OpenAI-function-tool and MCP notes describe host mapping only; it is not a remote service.

Prefer `binary_cube_describe` → `binary_cube_encrypt` / `binary_cube_decrypt` for ordinary tasks. Prefer `binary_cube_describe` → `binary_cube_operation_contract` → `binary_cube_invoke` for research/diagnostics. Use `binary_cube_self_test` for host acceptance.

## Portable package and validation

The companion package metadata is `skills/binary-cube-laboratory/manifest.json`. Before reporting `self-test-passed` or `ready` for a host, execute `skills/binary-cube-laboratory/self-test.json` against the canonical runtime. Browser hosts use the portable loader/test harness; Node hosts use `runSelfTest()` or CLI `self-test`; structured AI hosts bind `binary_cube_self_test`.

If the current host cannot load or execute a declared runtime, report `incompatible` or `runtime-required` rather than claiming execution.

## Human access

The existing Binary Cube laboratory UI remains the interactive human surface. The Node adapter adds an operator-friendly terminal surface for headless/server/local research environments. Common users should use `encrypt` and `decrypt`; advanced users can progressively disclose `operations`, `contract`, and `invoke` without learning engine internals first.

## Security classification

This is experimental tabletop-RPG permutation/obfuscation research, not production cryptography. Do not describe it as secure encryption suitable for real secrets.

## Hard rules

- Every low-level dispatcher operation must come from the registered capability allow-list and have an operation contract.
- High-level workflows may compose canonical operations but may not reproduce their internal algorithms.
- Never infer positional arguments from function names.
- Never bypass key/package/trace validation to force a result.
- Do not load cross-origin runtime code merely because a manifest names it.
- Keep browser, Node, CLI, and AI/tool terminology aligned.
- Treat tool projections as local descriptors, never evidence that a remote RPC/MCP service exists.

## Discovery links

- `https://mrcalzon02.github.io/HB-TTRPG-tools/api/foundry-capabilities.json`
- `https://mrcalzon02.github.io/HB-TTRPG-tools/api/operation-contracts.json`
- `https://mrcalzon02.github.io/HB-TTRPG-tools/skills/binary-cube-laboratory/manifest.json`
- `https://mrcalzon02.github.io/HB-TTRPG-tools/skills/binary-cube-laboratory/tool-projection.json`
- `https://mrcalzon02.github.io/HB-TTRPG-tools/skills/binary-cube-laboratory/self-test.json`
- `https://mrcalzon02.github.io/HB-TTRPG-tools/skills/binary-cube-laboratory/examples.json`
