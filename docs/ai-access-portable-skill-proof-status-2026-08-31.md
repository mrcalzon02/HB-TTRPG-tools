# Portable Agent Skill Proof — Implementation Status

**Project:** Calzon's TTRPG Foundry / HB-TTRPG-tools  
**Repository:** `mrcalzon02/HB-TTRPG-tools`  
**Authoritative branch:** `main`  
**Date:** 2026-08-31  
**Proof target:** `binary-cube-laboratory` / `shadowrun.binary-cube`  
**Architecture rule:** **Mirrored calls, not mirrored logic.**

## Current evidence state

The repository-side implementation of the first portable browser-JavaScript Agent Skill proof is complete enough to enter the public deployment/browser-execution gate.

This record deliberately distinguishes repository evidence from deployed/runtime evidence. The presence of committed files on `main` does **not** by itself establish `runtime-compatible`, `self-test-passed`, or `ready` in any external host.

## Verified repository artifacts

The following files were written to `main` and read back from the authoritative repository after mutation:

| Artifact | Repository evidence |
| --- | --- |
| `skills/binary-cube-laboratory/manifest.json` | commit `fbafba23813e049174e4fcd852b9293e539483be`; read-back blob `090eff6a5caee0b1dc63de5bcdd0cc41123736c1` |
| `skills/binary-cube-laboratory/self-test.json` | commit `d78045bb158334f708dde216e083eef49e151b11`; read-back blob `d0ab9b881a362217bf029639e5b3978fef20c01b` |
| `skills/binary-cube-laboratory/examples.json` | commit `b5daa66c32d09234007ef3a8ed5849bd3a6496b4`; read-back blob `64fce0e934aadc52d3111031c5558bc2c073043d` |
| `skills/binary-cube-laboratory/SKILL.md` portable-package integration | commit `ad24d91692b302218ceb102f984545e8e7d5ac92`; read-back blob `c2a9f35ddd4bef5779fb6ee9103932f017d79a5b` |
| `ai-skill-loader.js` | created in `4c576b301d32cb391f2313df7726959d86e2aaa1`; base-resolution repair commit `ae4f440fed1122e87d1b740c81fa6846294a5e36`; read-back blob `5c39978808dc2f57a88205513bc84708efb6daab` |
| `ai-skill-test.html` | commit `605cfc9108ccced69b36f7fb4ad6a5d9b25e7705`; read-back blob `a67f5ca760cc2275d4efb70142a45e2d51dd6270` |
| `sitemap.xml` proof-harness entry | commit `18cf768c810818718514b2337f6ea8ed7e95f46b`; read-back blob `66e4862ac9baa8ea0234e99c671dbdfc16b009ef` |
| `api/ai/index.json` proof-chain discovery | commit `5ac199c48da2d02cad4f676ca19989d375dc3bd9`; read-back blob `1b3bc0936b079624e375abbfe67c8b43ae363861` |
| `.well-known/ai-capabilities.json` root proof-chain discovery | commit `db7a911f3b1f813dc947243f5805e8081c8a653e`; read-back blob `2393f1d661bd3a4b5122392654860663eac3b3ef` |
| `llms.txt` portable-proof guidance | commit `a18b3764b5e6094bd6216d037fbad9eac6e46ea5`; read-back blob `cdc1ae8278722f82f78249cf4d77345db99ff475` |

## Canonical runtime binding

The portable package points to the existing authoritative runtime rather than containing a second Binary Cube implementation:

- runtime path: `shadowrun-binary-cube-engine.js`
- observed runtime Git blob: `69b8f30b42a669096f81416f3fed1209de6556a9`
- expected global: `ShadowrunBinaryCubeEngine`
- capability ID: `shadowrun.binary-cube`
- runtime class: `browser-js`
- static capability state: `runtime-required`
- security classification: `experimental-ttrpg-obfuscation-not-production-cryptography`

The runtime remains allow-listed by `api/foundry-capabilities.json`, and operation signatures remain authoritative in `api/operation-contracts.json`.

## Deterministic self-test fixtures

Expected values were generated from the canonical engine revision identified above before being recorded in `self-test.json`.

The proof set includes:

1. SHA-256 known vector: `sha256Hex("test")` → `9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08`.
2. Deterministic fixed-seed key creation.
3. Deterministic binary encryption using that canonical key.
4. Decryption round-trip back to the original payload.
5. Canonical key validation success.
6. Intentional invalid-key rejection with the canonical fingerprint-mismatch error.

For the fixed proof key:

- key ID: `bd9095e9`
- key SHA-256 digest: `07d87a222eeaac7a0999b378b19f1219ad828cb54dbf7d0873ce3ccb74e30df0`
- source payload: `0100100001101001`
- ciphertext: `11100000011010000010101101110101`
- package checksum: `8d28144a`

## Loader enforcement boundary

`ai-skill-loader.js` is a generic static browser loader, not a remote execution service. Its implemented checks include:

- the skill must exist in `skills/index.json`;
- the companion manifest must identify that same registered skill;
- the capability must be declared by the skill and exist in `api/foundry-capabilities.json`;
- the runtime path must be allow-listed by the canonical capability descriptor;
- the runtime URL must remain same-origin and inside the Foundry base path;
- the expected global must match the canonical invocation descriptor;
- every self-test operation must be both capability-allow-listed and present in the canonical operation-contract registry;
- invalid tests fail rather than being repaired heuristically;
- `ready` is emitted only after all declared deterministic tests pass in the current host.

The loader captures its Foundry base URL at script installation so it remains anchored to the repository root even when invoked later from a page whose own location is nested elsewhere.

## Public deployment/browser acceptance state

**Repository state:** implemented and read-back verified.  
**Public GitHub Pages file deployment:** not verified in this execution environment.  
**Public browser self-test execution:** not verified in this execution environment.  
**Correct host status until observed browser execution:** `runtime-required`.

An attempted public read-back was not promoted to evidence because the available web reader would not directly open newly constructed child URLs before discovery, its search index had not yet surfaced the new files, and the local execution container had no working external DNS resolution. Those are test-environment limitations, not evidence that GitHub Pages has or has not deployed the files.

No claim of `runtime-compatible`, `self-test-passed`, or `ready` should be made for the public Pages host until `ai-skill-test.html` is actually loaded from the deployed origin and returns a passing report from the canonical runtime.

## Next evidence gate

In a normal browser against the deployed GitHub Pages origin:

1. Open `https://mrcalzon02.github.io/HB-TTRPG-tools/ai-skill-test.html`.
2. Select `binary-cube-laboratory`.
3. Run **Load and self-test**.
4. Confirm that discovery, manifest validation, contract resolution, runtime load, and every deterministic self-test pass.
5. Record the returned structured report and deployed read-back date.
6. Only then mark the observed browser host `runtime-compatible`, `self-test-passed`, and `ready`.
7. Proceed to root-only external-model acceptance tests using `.well-known/ai-capabilities.json` / `api/ai/index.json` rather than page-prose reconstruction.
