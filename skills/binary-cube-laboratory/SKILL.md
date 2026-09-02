---
name: binary-cube-laboratory
description: Use the Foundry Binary Cube Laboratory for TTRPG-oriented cube permutation/obfuscation experiments, key creation, binary encryption/decryption, projection diagnostics, transformation traces, and invariants. Activate when a user asks to operate or inspect the Binary Cube engine.
compatibility: Requires HBFoundryAPI, shadowrun-binary-cube-engine.js, or the dependency-free binary-cube-node-adapter.js on Node/CommonJS. This engine is experimental TTRPG obfuscation research, not production cryptography.
metadata:
  author: mrcalzon02
  version: "1.3.0"
  foundry-capability: shadowrun.binary-cube
---

# Binary Cube Laboratory

Use `shadowrun.binary-cube` and its self-describing operation contracts. Browser UI actions, Foundry API calls, Node/CommonJS calls, CLI calls, and AI/tool calls must converge on `shadowrun-binary-cube-engine.js`; do not recreate cube transformation logic in an adapter.

## Workflow

1. Identify the requested operation: key creation/validation, encryption/decryption, projection work, transformation tracing, package diagnostics, hashing/key identity, or invariant checking.
2. Retrieve the operation definition before building positional arguments. Browser hosts should use `HBFoundryAPI.operationContract('shadowrun.binary-cube', operation)`. Node hosts should use `require('./binary-cube-node-adapter.js').operationContract(operation)`. CLI/tool hosts can use `node binary-cube-node-adapter.js contract <operation>`.
3. Choose the available execution surface without changing operation semantics:
   - Browser/Foundry: `HBFoundryAPI.invoke('shadowrun.binary-cube', { operation, args })`.
   - Node/CommonJS module: `require('./binary-cube-node-adapter.js').invoke({ operation, args })`.
   - CLI or generic tool runner: `node binary-cube-node-adapter.js invoke '{"operation":"sha256Hex","args":["test"]}'`, or provide the same JSON request on stdin.
4. Preserve key IDs/digests, schema/format versions, checksums, validation results, and transformation/invariant evidence when returned.
5. If an imported key/package/trace fails validation, report that failure instead of repairing it heuristically.

## Capability discovery

For browser/remote discovery, use the Foundry capability and operation-contract registries. For Node/CommonJS discovery, `describe()` returns capability-level metadata, `listOperations()` returns every allowed operation together with its canonical arguments and return contract, and `operationContract(name)` returns one operation contract. CLI equivalents are `describe`, `operations`, and `contract <operation>`.

The Node adapter validates that every invoked operation is both present in the capability allow-list and documented by the canonical operation registry before dispatching to the engine. It does not maintain an independent operation schema.

A reasoning system should treat the adapter's structured request shape as `{ "operation": string, "args": array }`. Successful adapter calls return `{ "ok": true, "capabilityId": "shadowrun.binary-cube", "operation": string, "result": <canonical engine result> }`. Adapter/CLI failures are explicit errors; do not reinterpret them as successful laboratory results.

## Portable package and validation

The companion package metadata is `skills/binary-cube-laboratory/manifest.json`. It identifies the canonical runtime, browser runtime class, Node adapter, expected export, security classification, provenance, and self-test document without copying the engine.

Before reporting `self-test-passed` or `ready` for a host, execute the deterministic tests in `skills/binary-cube-laboratory/self-test.json` against the canonical runtime. Browser hosts can use the existing portable skill loader/test harness. Node hosts can call `require('./binary-cube-node-adapter.js').runSelfTest()` or run `node binary-cube-node-adapter.js self-test`.

The small call examples in `skills/binary-cube-laboratory/examples.json` reference the canonical operation contracts and are not an alternate API definition. If the current host cannot load or execute a declared runtime, report `incompatible` or `runtime-required` as appropriate rather than claiming the capability executed.

## Human access

The existing Binary Cube laboratory UI remains the interactive human surface and exposes ordinary configuration through labeled controls rather than positional arguments. The Node adapter adds an operator-friendly terminal surface for headless, server, CI-free, and local research environments without replacing that UI. Use `operations` to see callable operations with argument definitions, `contract <operation>` for focused help, and `self-test` to validate the current host before invoking research operations from a shell.

## Security classification

Treat the engine exactly as the canonical runtime classifies it: experimental tabletop-RPG permutation/obfuscation research, not production cryptography. Do not describe it as secure encryption suitable for protecting real secrets.

## Hard rules

- Every dispatcher operation must come from the registered capability allow-list and have an operation contract.
- Never infer positional arguments from function names.
- Never bypass key/package/trace validation to force a result.
- Do not implement a second cube transform inside the skill, UI, API adapter, or tool wrapper.
- Do not load cross-origin runtime code merely because a manifest names it.
- Keep browser, Node, CLI, and AI/tool terminology and positional argument meanings aligned with the canonical contracts.

## Discovery links

- `https://mrcalzon02.github.io/HB-TTRPG-tools/api/foundry-capabilities.json`
- `https://mrcalzon02.github.io/HB-TTRPG-tools/api/operation-contracts.json`
- `https://mrcalzon02.github.io/HB-TTRPG-tools/skills/binary-cube-laboratory/manifest.json`
- `https://mrcalzon02.github.io/HB-TTRPG-tools/skills/binary-cube-laboratory/self-test.json`
- `https://mrcalzon02.github.io/HB-TTRPG-tools/skills/binary-cube-laboratory/examples.json`
