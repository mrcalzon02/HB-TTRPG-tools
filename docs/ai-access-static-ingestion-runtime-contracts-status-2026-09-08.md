# AI Access Static Ingestion & Runtime Contracts — Status Record

**Repository:** `mrcalzon02/HB-TTRPG-tools`  
**Branch:** `main`  
**Date:** 2026-09-08  
**Parent plan:** `docs/ai-access-static-ingestion-runtime-contracts-implementation-plan-2026-09-08.md`  
**Parent roadmap:** `docs/ai-access-portable-skill-onboarding-roadmap.md`  
**Primary doctrine:** **Mirrored calls, not mirrored logic.**

## Evidence boundary

This record distinguishes repository implementation from deployed/runtime proof.

- Repository commits and GitHub read-back are observed.
- Public GitHub Pages deployment of the newest commits has **not** been observed from the current host; the public fetch path is blocked here.
- Neither Binary Cube nor Module Map is promoted to `ready` by this record.
- Deterministic browser self-tests remain host-observed gates and must actually execute successfully before `self-test-passed` or `ready` is claimed.

## Baseline for this continuation

Continuation began from `main` commit:

`177e6f1cc6f513a6bd1c325709f1eb98a6f779df` — `Add local AI interface consistency validator`

Current observed `main` head at this status write:

`b3adb50196555f59e7ae3a8ac8920fa63798f497` — `Expose Module Map portable proof package`

The comparison from the continuation baseline to that head is 10 commits ahead and 0 behind.

## Findings repaired

### Binary Cube portable proof drift

The current `skills/binary-cube-laboratory/manifest.json` had evolved without retaining the `runtime` and `selfTest` fields required by the generic portable loader. The self-test itself remained present and its canonical runtime SHA still matched `shadowrun-binary-cube-engine.js`.

Repair:

- restored explicit browser-JavaScript runtime metadata;
- restored same-origin/cross-origin security declarations;
- restored self-test and authority pointers;
- preserved the existing Binary Cube implementation and experimental strengthening metadata unchanged in principle.

### Generic portable loader limitation

`ai-skill-loader.js` previously assumed one runtime script and dispatcher-style operations. That could not represent `spatial.module-map.generate`, whose canonical registry requires:

1. `semantic-spatial-engine.js`
2. `semantic-content-populator.js`
3. `module-map-generator.js`

Repair:

- package runtime scripts must now exactly match the capability registry list and order;
- scripts load sequentially and same-origin only;
- expected global is verified after the ordered set loads;
- both `global-dispatch` and `global-method` invocation styles are supported;
- self-tests may declare multi-script runtime sets;
- deterministic repeat/deep-equality, path existence, and path equality checks are supported.

### Module Map operation-contract drift

The old public contract omitted substantial current semantic-site controls and did not accurately describe strict/pruning/custom-role semantics.

The audited contract now records source blob SHAs for:

- `module-map-generator.js` — `7946756583c16b531bca6ecd948e0cc66f73d7ac`
- `semantic-spatial-engine.js` — `a21aad5405120063e53cd54cbad2790ac33a2cb5`
- `semantic-content-populator.js` — `d21050da045fc1f7ccc9cda534e1c3786e43ef89`

The public contract now describes:

- canonical archetypes and aliases;
- semantic site axes and density controls;
- custom role/adjacency shape;
- context-only versus full custom-role layer policy;
- layout precedence;
- `pruneDeadEnds=true` unless explicitly false;
- `strict=true` unless explicitly false;
- content seed/faction/purpose behavior;
- canonical compatibility targets;
- `damageState` as a string-facing public contract rather than a fabricated structured-object contract;
- richer return/provenance expectations.

## Module Map portable proof package

Added:

- `skills/module-map-generation/manifest.json`
- `skills/module-map-generation/self-test.json`

The package declares the exact canonical three-script runtime set in registry order and the expected `generator.module_map` global.

The deterministic self-test contains two repository-defined tests:

1. fixed semantic default-program request invoked twice with deep-equality and provenance/validation assertions;
2. fixed custom-role request invoked twice with explicit `context-only` policy assertions.

These are test definitions only until executed in a compatible browser host.

`skills/module-map-generation/SKILL.md` now explicitly routes models through the companion manifest, self-test, exact runtime order, audited contract, and current-host readiness boundary.

`ai-skill-test.html` now exposes both:

- `binary-cube-laboratory`
- `module-map-generation`

## Validator strengthening

`scripts/validate-ai-interface.py` now additionally validates portable packages that exist beside registered browser-JavaScript skills:

- companion package type and skill/capability binding;
- exact runtime script list and order against the capability registry;
- same-origin-only policy;
- authoritative runtime path;
- expected global;
- self-test path and capability binding;
- self-test runtime path/script set;
- declared runtime blob SHAs when Git is available locally;
- global-method versus global-dispatch self-test operation compatibility;
- contract `validatedAgainst` source blob SHAs;
- proof-harness options resolve to registered skills with companion packages.

The validator has been committed but has **not** been executed in this host because a full local checkout/runtime is unavailable here.

## Discovery promotion

`api/ai/index.json` now advertises two portable proof packages under the shared loader/harness:

- Binary Cube — single-script global dispatch;
- Module Map — ordered multi-script global method.

`.well-known/ai-capabilities.json` now exposes the Module Map portable package, deterministic self-test, and exact runtime URLs while retaining `runtime-required` status and undeployed remote MCP/RPC state.

## Remaining gates

1. Execute `python scripts/validate-ai-interface.py` in an actual repository checkout and resolve any reported errors.
2. Verify public GitHub Pages deployment of the new bootstrap/package/index/harness files.
3. Execute Binary Cube browser proof after deployment and record observed result.
4. Execute Module Map browser proof after deployment and record observed result.
5. Only after observed test success may the current host report `self-test-passed`/`ready`.
6. Continue contract audit and portable-package promotion by dependency difficulty; next candidate is the Alien Vessel generator, followed by Kaysender Airship and Signals.
