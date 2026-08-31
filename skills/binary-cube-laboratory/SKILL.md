---
name: binary-cube-laboratory
description: Use the Foundry Binary Cube Laboratory for TTRPG-oriented cube permutation/obfuscation experiments, key creation, binary encryption/decryption, projection diagnostics, transformation traces, and invariants. Activate when a user asks to operate or inspect the Binary Cube engine.
compatibility: Requires access to HBFoundryAPI or shadowrun-binary-cube-engine.js. This engine is experimental TTRPG obfuscation research, not production cryptography.
metadata:
  author: mrcalzon02
  version: "1.1.0"
  foundry-capability: shadowrun.binary-cube
---

# Binary Cube Laboratory

Use `shadowrun.binary-cube` and its self-describing operation contracts.

## Workflow

1. Identify the requested operation: key creation/validation, encryption/decryption, projection work, transformation tracing, package diagnostics, hashing/key identity, or invariant checking.
2. Retrieve `HBFoundryAPI.operationContract('shadowrun.binary-cube', operation)` before building arguments.
3. Invoke `HBFoundryAPI.invoke('shadowrun.binary-cube', { operation, args })` using the exact documented positional order.
4. Preserve key IDs/digests, schema/format versions, checksums, validation results, and transformation/invariant evidence when returned.
5. If an imported key/package/trace fails validation, report that failure instead of repairing it heuristically.

## Portable package

The companion package metadata is `skills/binary-cube-laboratory/manifest.json`. It identifies the canonical runtime, runtime class, expected export, security classification, provenance, and self-test document without copying the engine.

When the host can load the declared JavaScript runtime, run `skills/binary-cube-laboratory/self-test.json` before reporting `self-test-passed` or `ready`. The small call examples in `skills/binary-cube-laboratory/examples.json` reference the canonical operation contracts and are not an alternate API definition.

If the host cannot load or execute the declared runtime, report `incompatible` or `runtime-required` as appropriate rather than claiming the capability executed.

## Security classification

Treat the engine exactly as the canonical runtime classifies it: experimental tabletop-RPG permutation/obfuscation research, not production cryptography. Do not describe it as secure encryption suitable for protecting real secrets.

## Hard rules

- Every dispatcher operation must come from the registered capability allow-list and have an operation contract.
- Never infer positional arguments from function names.
- Never bypass key/package/trace validation to force a result.
- Do not implement a second cube transform inside the skill.
- Do not load cross-origin runtime code merely because a manifest names it.

## Discovery links

- `https://mrcalzon02.github.io/HB-TTRPG-tools/api/foundry-capabilities.json`
- `https://mrcalzon02.github.io/HB-TTRPG-tools/api/operation-contracts.json`
- `https://mrcalzon02.github.io/HB-TTRPG-tools/skills/binary-cube-laboratory/manifest.json`
- `https://mrcalzon02.github.io/HB-TTRPG-tools/skills/binary-cube-laboratory/self-test.json`
- `https://mrcalzon02.github.io/HB-TTRPG-tools/skills/binary-cube-laboratory/examples.json`
