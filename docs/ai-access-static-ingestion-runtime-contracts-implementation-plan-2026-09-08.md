# AI Access Static Ingestion & Runtime Contracts — Implementation Tranche

**Project:** Calzon's TTRPG Foundry / HB-TTRPG-tools  
**Repository:** `mrcalzon02/HB-TTRPG-tools`  
**Authoritative branch:** `main`  
**Date:** 2026-09-08  
**Baseline main HEAD at tranche start:** `11dfbfa82287ef2d8854e3eb46af3127e125da0e`  
**Parent roadmap:** `docs/ai-access-portable-skill-onboarding-roadmap.md`  
**Status:** Active implementation tranche; subordinate to the parent roadmap  
**Primary doctrine:** **Mirrored calls, not mirrored logic.**

---

## 1. Purpose and authority

This document records the implementation plan developed from external-model evaluation of the live Foundry, the existing portable-skill roadmap, the current machine-discovery stack, and the compact Foundry static-ingestion/runtime contract developed on 2026-09-08.

It does **not** replace the parent roadmap, the machine registries, Agent Skills, capability registry, operation contracts, status vocabulary, Charles engram, or canonical runtime source. It is a dated execution tranche that orders the next work against those authorities.

The objective is:

> An unfamiliar external reasoning model should be able to enter through the public Foundry URL, discover the authoritative machine interface, determine exactly what it can and cannot execute in its current host, load or retrieve the correct Foundry authority, and return a source-faithful result without reconstructing Foundry logic.

The compact bootstrap contract introduced by this tranche is a routing contract only. Where it and a referenced current machine authority disagree, the referenced current machine authority governs.

---

## 2. Verified starting state

At tranche start the repository already provides:

- `.well-known/ai-capabilities.json` machine discovery;
- `api/ai/index.json` runtime/transport routing and external-model acceptance tests;
- `api/ai/status-vocabulary.json` canonical discovery/execution-state vocabulary;
- `skills/index.json` with 42 registered Agent Skills inheriting `blacklight.charles`;
- `api/foundry-capabilities.json` capability identity, runtime classes, scripts, invocation descriptors, sources, and limitations;
- `api/operation-contracts.json` public operation signatures;
- `api/resource-collections.json` static resource authority;
- `ai-skill-context-loader.js` declarative skill/personality loading;
- `ai-skill-loader.js` same-origin browser-JavaScript portable package validation and self-test proof;
- `ai-skill-test.html` browser proof harness;
- the Binary Cube companion package/self-test proof;
- `llms.txt` as comprehensive integration doctrine;
- `ai-access.html` as the human-readable machine-interface entrypoint.

Verified inconsistencies at tranche start:

1. `ai-access.html` still hard-codes 21 Agent Skills while `skills/index.json` contains 42.
2. `api/ai/index.json` labels host-sandbox transport `host-dependent`, but `host-dependent` is not a canonical status token in `api/ai/status-vocabulary.json`.
3. The operation-contract registry declares `generatedAgainst: 2026-08-21`, while the capability manifest reports a later 2026-08-31 API version; contract drift must therefore be assumed until audited.
4. The detailed `llms.txt` discovery sequence and the shorter `api/ai/index.json` quick-start sequence are not yet expressed as one synchronized bootstrap path.

---

## 3. Governing architecture

The integration stack is intentionally layered:

```text
public Foundry URL
    ↓
.well-known/ai-capabilities.json
    ↓
compact bootstrap routing contract
    ↓
current machine authorities
    ├── status-vocabulary.json
    ├── skills/index.json
    ├── Charles engram
    ├── selected SKILL.md
    ├── foundry-capabilities.json
    ├── operation-contracts.json
    └── resource-collections.json
    ↓
host runtime/context evaluation
    ↓
canonical source/helper/resource
    ↓
self-test where declared
    ↓
execute if compatible / report limitation if not
```

`llms.txt` remains the comprehensive integration document. The bootstrap must stay small and must not become a second capability specification.

Remote MCP/RPC remains explicitly undeployed until a separately hosted execution transport is actually implemented and verified.

---

## 4. Implementation phases

### Phase 0 — Authority reconciliation and cleanup — **P0**

Repair machine-interface contradictions before expanding it.

Required work:

- remove or dynamically derive hard-coded Agent Skill counts in human compatibility prose;
- make host-sandbox use canonical status vocabulary rather than the undefined `host-dependent` token;
- ensure `host-sandbox` has a recommended static status in the vocabulary;
- reconcile machine discovery order across manifest, AI index, bootstrap, onboarding surfaces, and `llms.txt`;
- verify all 42 registered skill names are unique and all skill paths, capability IDs, resource IDs, statuses, and Charles bindings resolve;
- preserve GitHub Pages as a static origin and preserve `remoteMcp`/`remoteRpc` as not deployed.

**Gate:** no contradictory skill counts, undefined status tokens, dead references, or conflicting discovery sequences.

### Phase 1 — Compact bootstrap routing contract — **P0**

Create `api/ai/bootstrap.txt`.

The bootstrap must include:

- **Mirrored calls, not mirrored logic.**
- authority-first discovery;
- status-vocabulary requirement;
- Agent Skill and Charles loading boundary;
- browser-JS, host-sandbox, page-context, UI-bound, live-device, and static-resource execution boundaries;
- no JS-to-Python reimplementation rule;
- operation-contract validation;
- randomness/state evidence requirements;
- remote transport boundary;
- failure behavior;
- provenance requirement;
- explicit statement that referenced current machine authorities outrank the bootstrap when facts change.

Expose the bootstrap through the top-level manifest and AI index. Keep `llms.txt` as detailed doctrine.

**Gate:** a model starting from the manifest can discover the bootstrap and then the current authorities without needing a large prompt pasted into chat.

### Phase 2 — Authority-chain normalization — **P0/P1**

Align:

- `.well-known/ai-capabilities.json`;
- `api/ai/index.json`;
- `api/ai/status-vocabulary.json`;
- `skills/index.json`;
- `api/ai/skill-onboarding.json`;
- `llms.txt`;
- `ai-access.html`;
- Agent Skills HTML compatibility projections.

Prefer references to canonical machine data over duplicated literals.

**Gate:** all entry surfaces route to the same authority chain.

### Phase 3 — Operation-contract audit and normalization — **P0**

Audit every advertised executable capability against current canonical source.

Verify:

- capability ID;
- operation ID;
- call style;
- global/dispatcher invocation;
- ordered runtime dependencies;
- required/optional arguments;
- aliases;
- types;
- enums;
- units;
- ranges;
- defaults;
- deterministic seed semantics;
- return descriptions;
- documented failure behavior;
- source/provenance correspondence.

Priority order:

1. `spatial.module-map.generate`
2. `spatial.alien-vessel.generate`
3. `kaysender.airship.generate`
4. `signals.configuration.analyze`
5. `signals.utilities`
6. `shadowrun.binary-cube`
7. page-context and UI-bound interfaces

Add validation provenance/version information sufficient to expose future drift.

**Gate:** every advertised executable capability has a public contract matching current authoritative source.

### Phase 4 — Generalize portable browser-JavaScript packages — **P1**

Use Binary Cube as the proven package pattern, then expand the loader/package scheme.

Required loader improvement:

- support the complete ordered `runtime.scripts` dependency set, not only one `authoritativePath`.

Promote next:

- Module Map;
- Alien Vessel;
- Kaysender Airship;
- Signals Configuration Analyzer;
- Signals Utilities.

Each portable package should declare its Agent Skill, capability, runtime scripts/load order, expected exports, operation authority, deterministic self-test, provenance, security boundaries, and same-origin requirement.

**Gate:** portable packages reach `runtime-compatible → self-test-passed → ready` in the proof harness without copied algorithms.

### Phase 5 — Formal host-sandbox package contract — **P1/P2**

Define a companion package model for host-local helpers separately from browser-JS.

Declare:

- required executable/runtime;
- Python/package requirements;
- writable filesystem requirement;
- cryptographic RNG requirement;
- input/output files;
- registered helper paths;
- persistence model;
- validation/evidence requirements.

Apply to tabletop state, dice/randomness, and battlespace helpers.

**Gate:** a consuming host can determine compatibility before claiming execution or persistence.

### Phase 6 — Page/UI/device-context mapping — **P2**

For every `page-context`, `ui-bound`, and `live-device-context` capability document the declared authoritative page/context, initialization requirements, supported interaction boundary, and observable results.

Do not invent JSON injection mechanisms or fake headless APIs.

**Gate:** external models reliably distinguish understood capability from executable capability.

### Phase 7 — Provider-neutral external-model acceptance matrix — **P1**

Turn existing acceptance examples into a durable test corpus covering:

- URL-only discovery;
- restricted raw-JSON fallback;
- exact skill enumeration and Charles inheritance;
- skill/capability distinction;
- operation-contract resolution;
- browser-JS runtime recognition;
- successful portable execution where supported;
- honest runtime incompatibility where unsupported;
- static-resource retrieval;
- host-sandbox requirements;
- page/UI/device-context boundaries;
- OpenAPI discovery-only recognition;
- no fabricated MCP/RPC transport.

Record provider/model/date/host, prompt, authorities reached, expected result, observed result, intervention, and pass/fail.

**Gate:** unfamiliar models inventory the Foundry correctly and do not fabricate execution evidence.

### Phase 8 — Local machine-interface consistency validator — **P1**

Add a direct local validation script; do **not** add GitHub Actions.

The validator should eventually check:

- JSON syntax;
- unique skill names;
- valid status tokens;
- skill paths;
- default Charles binding;
- capability references;
- resource references;
- operation-contract coverage;
- runtime/source paths;
- package/self-test references;
- relative/absolute discovery URLs;
- stale hard-coded counts where detectable;
- compatibility projection consistency.

It should exit nonzero on errors and print a concise actionable report.

**Gate:** one local command can prove internal machine-interface consistency before a commit.

### Phase 9 — Human AI Access projection cleanup — **P2**

After the machine layer is stable, simplify `ai-access.html` into:

**Start Here → Bootstrap → Machine Authorities → Transport Status → Agent Skills → Proof Harness → Integration Documentation**

Human prose remains explanatory, not authoritative.

### Phase 10 — Remote MCP/RPC execution bridge — **P3 / deferred until prior gates pass**

Only after the static ingestion/runtime system is proven should a separately deployed bridge be considered.

The bridge must consume existing stable capability IDs and operation contracts, validate inputs, execute canonical runtimes, preserve provenance, enforce security/runtime boundaries, and return structured results.

It must never contain duplicate generator/calculator/laboratory/game logic.

Only after deployment and read-back may the manifest advertise remote MCP/RPC as available.

---

## 5. Immediate implementation tranche

Begin in this order:

1. Correct stale/undefined authority metadata:
   - remove hard-coded `21` skill-count assumptions from `ai-access.html`;
   - change host-sandbox transport state to canonical `runtime-required`;
   - add `host-sandbox: runtime-required` to the recommended static-status mapping.
2. Create `api/ai/bootstrap.txt`.
3. Register bootstrap in `.well-known/ai-capabilities.json` and `api/ai/index.json`.
4. Synchronize the AI index quick-start with the canonical discovery/onboarding/runtime sequence.
5. Add the first local `scripts/validate-ai-interface.py` validator skeleton.
6. Read back every changed file from `main`.
7. Run the validator against repository content in a local checkout or equivalent direct file environment.
8. Separately test the public GitHub Pages URLs before claiming deployment.
9. Begin Phase 3 operation-contract audit after the P0 consistency slice is accepted.

The first full portable multi-script proof after P0 is `module-map-generation`, because it exercises the ordered canonical dependency chain:

```text
semantic-spatial-engine.js
→ semantic-content-populator.js
→ module-map-generator.js
```

---

## 6. Evidence and completion discipline

All work follows:

**INTENT → EXECUTE → OBSERVE → VERIFY → CLAIM.**

- `recorded` means a repository file was created/updated and read back from `main`;
- `committed` means GitHub returned and subsequent repository reads show a real commit on `main`;
- `validated` means the declared local/static checks were actually run and observed;
- `deployed` means the corresponding public GitHub Pages URL was separately fetched after the commit and showed the new content;
- `ready` remains a host-observed execution state under `api/ai/status-vocabulary.json`, never a synonym for repository presence.

No GitHub Actions are to be added for this program.
