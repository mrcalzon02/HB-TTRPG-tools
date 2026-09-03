---
name: binary-cube-laboratory
description: Operate, inspect, validate, strengthen, and test the Binary Cube Laboratory across canonical cube transforms, reversible pre-entry masks, subcube multi-input indexing, tolerant recovery, corruption/diffusion analysis, and independent experimental integrity verification.
compatibility: Requires HBFoundryAPI/shadowrun-binary-cube-engine.js for canonical cube work. Node/CommonJS and same-origin browser research modules expose the same authorities. Structured AI hosts use the declared local tool projections. Experimental TTRPG obfuscation research; not production cryptography.
metadata:
  author: mrcalzon02
  version: "1.8.0"
  foundry-capability: shadowrun.binary-cube
---

# Binary Cube Laboratory

Use the canonical modules rather than recreating algorithms in UI, adapters, tests, or AI prompts. Human, API/Node, and AI surfaces must converge on the same implementation authority. Preserve failing cases and measured weaknesses as evidence.

## Ordinary cube workflow

`binary-cube-node-adapter.js` provides `encryptWorkflow`, `decryptWorkflow`, capability discovery, operation contracts, validation, CLI access, and the portable structured-call adapter over `shadowrun-binary-cube-engine.js`. Canonical key options are `gridSize`, `seed`, `inputFace`, `outputFace`, `inputQuarterTurns`, `outputQuarterTurns`, and `maskDensity`.

The ordinary workflow remains intentionally separate from experimental strengthening layers until their promotion gates have runtime evidence.

## Pre-entry field masking

`binary-cube-pre-entry-mask.js` is the reversible preprocessing authority. Implemented methods are `none`, `white-noise`, `newspaper-cutout`, `plasma-noise`, `cellular-diffusion`, `crosshatch-jitter`, and `burst-cluster`. Humans use `binary-cube-pre-entry-mask-laboratory.html`; Node/API uses the mask and masked-encrypt/decrypt adapter workflows; AI hosts use the mask operations in `tool-projection.json`.

A fixed XOR mask can obscure low-entropy structure but does not create avalanche diffusion by itself. Keep mask descriptors as separate recovery material during secrecy-oriented experiments.

## Three-state validation and strength analysis

`binary-cube-three-state-validator.js` captures pre-encryption, encrypted, and recovered states. Optional pre-entry masking remains inside State 1 so there is one testing protocol rather than competing variants. `binary-cube-strength-analysis.js` measures sampled plaintext perturbation, key-seed perturbation, and localized diagnostic-window diffusion. These are diagnostics, not security proofs.

## Implemented experimental subcube stack

Subcube multi-input indexing is no longer design-only. `binary-cube-subcube-indexing.js` is the standalone authority for deterministic fan-out planning, validation, encode/decode, coverage analysis, and bounded tolerant recovery. Supported experimental fan-outs are 1, 3, 5, and 7; `direct-replication` is the control and `keyed-codeword` is the strengthening candidate. The canonical cube engine is not modified by this experiment.

Human access: `binary-cube-subcube-laboratory.html`. API/Node access: the exported indexing module operations. AI access: `skills/binary-cube-laboratory/subcube-tool-projection.json`.

`binary-cube-subcube-strength-comparison.js` and `binary-cube-subcube-strength-matrix.js` compare fan-out configurations against fan-out 1 across perturbation/configuration families. Human pages are `binary-cube-subcube-strength-laboratory.html` and `binary-cube-subcube-matrix-laboratory.html`; AI projections are the corresponding subcube strength/matrix tool descriptors.

`binary-cube-subcube-damage-analysis.js` tests localized region damage. `binary-cube-subcube-corruption-matrix.js` v2 tests single/multiple, contiguous/dispersed, complete-region, and adversarial share corruption through strict and tolerant decoders. Humans use the damage/corruption laboratories and AI hosts use their declared tool projections.

## Tolerant recovery and independent integrity

Tolerant decoding is opt-in and must never replace the strict decoder. It may correct only within the configured bounded distance and must reject ambiguous states rather than guess. Recovery evidence includes corrected shares/codewords and codeword distances.

`binary-cube-subcube-integrity.js` independently checks whether recovered plaintext matches the originally protected source/context. `protectedEncode()` combines authoritative subcube encoding with an integrity artifact; `protectedDecode()` performs strict/tolerant recovery and then independent verification. The current `experimental-keyed-hash128-v1` primitive is dependency-free research instrumentation, not a standardized MAC and not production authentication.

The corruption matrix now evaluates decoder disposition and independent integrity disposition together. A wrong tolerant decode rejected by integrity is recorded as detected corruption; any wrong plaintext that independently verifies is a critical failure.

Human access: `binary-cube-subcube-integrity-laboratory.html` and the integrity-aware `binary-cube-subcube-corruption-laboratory.html`. API access: `binary-cube-subcube-integrity.js` plus the corruption matrix. AI access: `subcube-integrity-tool-projection.json` and `subcube-corruption-tool-projection.json`.

## Promotion gates

Do not promote subcube indexing, tolerant recovery, or experimental integrity into ordinary encryption merely because the code exists. Promotion requires observed runtime evidence for deterministic planning, collision freedom, exact recovery, wrong-plan rejection, boundary behavior, comparative diffusion, corruption behavior, bounded correction without undetected wrong plaintext, cross-interface parity, and justified expansion/runtime cost. A standardized authentication construction is required before making any production-security claim.

## Capability discovery and tool use

Prefer high-level operations for ordinary work and bounded experimental operations for research. Retrieve operation contracts before constructing low-level positional calls. Preserve key IDs/digests, mask descriptors, plan/schema versions, checksums, validation results, perturbation measurements, corruption evidence, integrity disposition, and invariant evidence.

Primary AI projection: `skills/binary-cube-laboratory/tool-projection.json`. Experimental subcube projections are separate descriptors so hosts can expose research capabilities without pretending they are ordinary encryption operations.

## Acceptance

Repository presence is not runtime acceptance. Before reporting `self-test-passed`, `ready`, parity, measured strength, or corruption resistance, execute the relevant deterministic self-test/matrix in a compatible Node/browser host. If execution is unavailable, report `runtime-required`.

## Security classification

Everything in this laboratory is experimental tabletop-RPG permutation/obfuscation research unless a future record explicitly establishes otherwise. Scrambling, masking, fan-out, redundancy, diffusion metrics, tolerant correction, and the experimental integrity tag are not proofs of secure encryption.

## Hard rules

- Mirrored calls, not mirrored logic.
- Do not bypass validation to force a result.
- Keep recovery material separate where the experiment requires it.
- Preserve weaknesses and failing cases as evidence.
- Do not silently promote experimental subcube/tolerance/integrity layers into ordinary encryption.
- Do not describe tool projections as remote services.
- Keep human, API/Node, and AI terminology/configuration aligned.
- Do not claim runtime acceptance without direct execution evidence.

## Authoritative records

Core records include `docs/binary-cube-pre-entry-masking.md`, `docs/binary-cube-strength-analysis.md`, `docs/binary-cube-subcube-multi-input-indexing-plan.md`, `docs/binary-cube-subcube-strength-comparison.md`, `docs/binary-cube-subcube-damage-analysis.md`, `docs/binary-cube-tolerant-subcube-decoding.md`, `docs/binary-cube-subcube-corruption-matrix.md`, and `docs/binary-cube-subcube-integrity-experiment.md`.

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance, Authorship & Usage Notice

This Agent Skill originates in **Calzon's TTRPG Foundry** (`mrcalzon02/HB-TTRPG-tools`) and is maintained under the authority of **mrcalzon02**. It was developed with human creative direction and AI-assisted drafting, analysis, coding, review, testing, and repository integration using **OpenAI ChatGPT** and **GitHub** tooling, alongside any skill-specific runtimes or libraries declared above.

This skill is distributed under the project's custom **Terms of Service & Usage Agreement**, Section 3, **“Permitted Use (the Anti-License)”** (last updated **July 10, 2026**): personal/private/non-commercial use and private adaptation are permitted; commercial use, sale, redistribution for profit, or commercial incorporation of the Platform's source code or proprietary lore assets is prohibited. Attribution is appreciated but not mandated. Third-party systems, lore, trademarks, APIs, libraries, standards, and other external material remain subject to their respective owners' rights.

Keep this notice with copies of `SKILL.md`. See `PROVENANCE.md` in this skill directory and the repository root `TERMS-OF-SERVICE.md` for the complete provenance and governing terms.
