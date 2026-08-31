# AI Access Portable Skill Onboarding Roadmap

**Project:** Calzon's TTRPG Foundry / HB-TTRPG-tools  
**Repository:** `mrcalzon02/HB-TTRPG-tools`  
**Authoritative branch:** `main`  
**Roadmap status:** Active development authority  
**Created:** 2026-08-31  
**Baseline before this roadmap:** `f76567283eb0b249b1e1a9fc6ba216aca4d3409c` (`Promote canonical machine discovery entrypoints`)  
**Primary doctrine:** **Mirrored calls, not mirrored logic.**

---

## 1. Purpose

This document is the durable implementation plan for turning the Foundry's static GitHub Pages site into a useful **LLM-discoverable and LLM-onboardable capability library** without pretending that GitHub Pages is a live server-side tool service.

The immediate objective is to prove, with a real existing capability, that an outside LLM can start from the public Foundry, discover a machine-facing capability, load the corresponding Agent Skill instructions, resolve exact operation contracts, locate the authoritative runtime implementation, determine whether its own host can execute that runtime, run a deterministic self-test when possible, and then either use the capability or report a precise runtime incompatibility.

The **Binary Cube Laboratory** (`shadowrun.binary-cube`) is the first end-to-end proof target because it already has:

- a canonical browser-JavaScript engine;
- a registered capability;
- exact operation contracts;
- an Agent Skill;
- deterministic behavior;
- no required account authentication;
- no external network dependency for the computation itself.

This plan deliberately postpones remote MCP or other server infrastructure until the static onboarding model has been empirically tested and found insufficient for a specific requirement.

---

## 2. The insight this roadmap is based on

An actual external-style attempt was performed rather than continuing from assumptions.

The attempt established five distinct layers that must not be conflated:

1. **Discovery** — can the model find the machine capability system from the public Foundry root?
2. **Onboarding** — can the model understand which skill applies and what rules govern its use?
3. **Contract resolution** — can it determine the exact operation name, argument order, types, output expectations, and runtime authority without guessing?
4. **Runtime compatibility** — can the model's current host actually load and execute the declared implementation?
5. **Execution/self-test** — can the model prove that the loaded capability works before claiming it is usable?

The attempt produced the following practical findings:

- The public root page available to a crawler may be stale and may not immediately expose newly deployed machine-discovery links.
- Once the `binary-cube-laboratory` Agent Skill was reached, its workflow was sufficiently explicit to identify `shadowrun.binary-cube` as the authority and require operation-contract lookup before invocation.
- The operation-contract registry was sufficient to resolve operations such as `encryptBinary` and `decryptBinary` without inferring positional arguments from implementation source.
- The canonical `shadowrun-binary-cube-engine.js` source could be retrieved and identified as the actual runtime authority.
- A static skill package can therefore teach an LLM **what to load and how to use it**, but the final execution step still depends on capabilities provided by the LLM's host environment.

This means the static GitHub Pages model is viable enough to develop further, but it must be validated as a complete chain rather than judged only by whether a model can read a webpage.

---

## 3. Non-negotiable architectural rules

### 3.1 GitHub Pages remains a static origin

The Foundry must never claim that GitHub Pages is providing server-side RPC, authenticated remote execution, persistent browser automation, or a live MCP endpoint unless such a separate runtime is actually deployed and verified.

Static GitHub Pages can provide:

- HTML, CSS, JavaScript, JSON, Markdown, schemas, manifests, examples, tests, and other static files;
- machine-readable discovery documents;
- Agent Skills and onboarding instructions;
- JavaScript engines that execute in a compatible browser/runtime host;
- deterministic self-test definitions and browser-side test harnesses;
- source/runtime modules an external host may load when that host permits it.

### 3.2 Agent Skills remains the skill standard

The repository already uses the open **Agent Skills** folder format via `skills/index.json` and `skills/<name>/SKILL.md`.

Do **not** introduce a competing proprietary `hb-skill/1` skill format.

HB-specific companion manifests may extend the package with runtime, operation, integrity, dependency, and self-test metadata, but `SKILL.md` remains the behavioral onboarding document and the existing Agent Skills registry remains authoritative for skill enumeration.

### 3.3 One authority per implementation

Do not copy Binary Cube, Signals, spatial-generator, Blacklight, or other algorithms into skill manifests, API documents, test pages, or adapters.

A portable package points to the authoritative implementation and invokes it.

### 3.4 Discovery is not authorization and onboarding is not execution

A model reading a skill does not thereby gain permission or a runtime to execute it.

All status surfaces must distinguish:

- discoverable;
- onboardable;
- runtime-compatible;
- self-test-passed;
- executable in the current host.

### 3.5 No credential exposure

No API keys, OAuth tokens, cookies, account passwords, refresh tokens, or reusable authentication secrets may be embedded in GitHub Pages, skill packages, JavaScript bundles, examples, or manifests.

### 3.6 No arbitrary remote-code auto-loading

Discovery must never mean "execute whatever script a remote manifest names."

The Foundry loader must be same-origin and allow-list based. A host integrating these skills retains final authority over whether code is loaded or executed.

### 3.7 No GitHub Actions dependency

Validation for this program must not depend on GitHub Actions. Use direct repository inspection, deterministic self-tests, browser/manual harnesses, and external-model acceptance tests unless this rule is explicitly changed later.

---

## 4. Existing authoritative pieces

Before implementing new pieces, future work must inspect and preserve these existing authorities:

### Machine discovery

- `.well-known/ai-capabilities.json`
- `api/ai/index.json`
- `api/ai/openapi.json`
- `llms.txt`
- `ai-access.html`

### Capability and operation authority

- `api/foundry-capabilities.json`
- `api/operation-contracts.json`
- `api/resource-collections.json`
- `foundry-api.js`

### Agent Skills

- `skills/index.json`
- `skills/README.md`
- `api/ai/skill-onboarding.json`

### Binary Cube proof capability

- `skills/binary-cube-laboratory/SKILL.md`
- `shadowrun-binary-cube-engine.js`
- `shadowrun-binary-cube-encryption.js`
- capability ID: `shadowrun.binary-cube`
- laboratory ID: `binary-cube-laboratory`

No stage in this roadmap should create an alternate Binary Cube implementation.

---

# 5. Delivery stages

## Stage 0 — Establish and freeze the test vocabulary

**Status:** Mostly established; verify before proceeding.

### Objective

Make every later test use the same words for the same states.

### Required status vocabulary

A portable capability must be able to report at least:

- `discoverable` — its descriptor can be found;
- `onboardable` — its skill/instructions can be loaded as static content;
- `runtime-required` — implementation exists but the current host must supply an execution environment;
- `runtime-compatible` — the current host satisfies the declared runtime requirements;
- `self-test-passed` — the authoritative implementation has passed the declared non-destructive test in this host;
- `ready` — operation may be invoked in the current host;
- `incompatible` — current host cannot satisfy the runtime;
- `degraded` — only part of the declared capability is usable;
- `ui-bound` — behavior remains coupled to human UI state;
- `page-context` — page-specific initialized state is required;
- `live-device-context` — device/sensor state is required.

### Acceptance criteria

- The vocabulary is documented once and reused by discovery, UI, package manifests, and tests.
- No page uses `callable` as a synonym for "remotely executable from any LLM."

---

## Stage 1 — Prove root-to-machine-discovery reliability

**Status:** Machine entrypoints exist; root-to-entrypoint behavior requires public verification.

### Objective

An unfamiliar model given only:

`https://mrcalzon02.github.io/HB-TTRPG-tools/`

must have a deterministic path to the machine capability manifest without reconstructing the tool inventory from ordinary page prose.

### Steps

1. Verify the public Pages deployment of:
   - `/.well-known/ai-capabilities.json` under the project base path;
   - `/api/ai/index.json`;
   - `/api/foundry-capabilities.json`;
   - `/api/operation-contracts.json`;
   - `/skills/index.json`;
   - `/api/ai/skill-onboarding.json`.
2. Inspect the actual deployed `index.html`, not only repository source.
3. Add or verify a minimal machine-discovery pointer in the document head.
4. Add or verify one human-visible **Machine / AI Access** entrypoint in the root page. This is a navigation pointer, not repeated SEO copy.
5. Ensure `llms.txt`, `sitemap.xml`, and `ai-access.html` point at the same authority chain.
6. Do not duplicate capability listings into the root page.
7. Record the public read-back date and observed contents.

### Acceptance test A — root-only discovery

Give an outside LLM only the Foundry root URL and ask:

> Examine this site and enumerate its AI-available capabilities using its machine-readable interface.

**Pass:** the model discovers `.well-known/ai-capabilities.json` or `api/ai/index.json`, then reads the canonical capability registry.

**Fail:** the model returns only a prose reconstruction of Utilities, Generators, Barotrauma, Kaysender, etc.

### Deliverable

Create an acceptance report in `docs/` recording model, date, prompt, files reached, result, and failure point.

---

## Stage 2 — Build the Binary Cube portable skill package

**Status:** Existing `SKILL.md`, capability, operation contract, and engine are present. Companion runtime/self-test package is not yet complete.

### Objective

Make `binary-cube-laboratory` the first complete static package an LLM can onboard without being told implementation details in conversation.

### Target package

```text
skills/binary-cube-laboratory/
├── SKILL.md                 # Existing Agent Skills behavioral authority
├── manifest.json            # HB companion package/runtime metadata
├── self-test.json           # Deterministic non-destructive tests
├── examples.json            # Small operation examples, references contracts
└── README.md                # Optional human package explanation
```

The runtime remains the canonical repository engine rather than a copied package implementation:

`shadowrun-binary-cube-engine.js`

### `manifest.json` responsibilities

The companion manifest should declare:

- Agent Skill name;
- stable Foundry capability ID;
- package version;
- runtime class (`browser-js` / compatible JS host);
- authoritative runtime path;
- expected global/export (`ShadowrunBinaryCubeEngine`);
- operation-contract authority path;
- source/provenance paths;
- dependencies;
- security classification;
- self-test document path;
- whether remote RPC/MCP is required (for Binary Cube, **no** if the host can load local/browser JS);
- whether the package is allowed to load cross-origin code (**no**);
- integrity metadata reservation for later digest/signature support.

### `self-test.json` responsibilities

Tests must be:

- deterministic;
- non-destructive;
- credential-free;
- small;
- runnable without external network access after the engine is loaded;
- capable of distinguishing "script loaded" from "canonical engine behaves correctly."

Initial candidate tests:

1. `sha256Hex("test")` must equal the standard SHA-256 digest:
   `9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08`.
2. A deterministic `createKey` vector using a fixed seed/grid/profile, after confirming exact argument contract.
3. Encrypt/decrypt round-trip for a short binary payload using the deterministic test key.
4. Key/package validation succeeds for canonical values and fails for an intentionally invalid fixture.

Do not commit expected values for tests 2–4 until they have been generated and read back from the authoritative engine.

### Acceptance test B — package onboarding

An unfamiliar model is given the Binary Cube skill directory or discovers it from `skills/index.json`.

**Pass:** it can state, without guessing:

- the capability ID;
- the authoritative runtime file;
- the required runtime class;
- the exact source of operation contracts;
- the self-test procedure;
- whether its current host can execute it.

---

## Stage 3 — Build a safe generic static skill loader and self-test harness

**Status:** Planned.

### Objective

Provide a reusable browser-side proof environment for portable JavaScript skills without creating a second implementation for each capability.

### Proposed components

```text
ai-skill-loader.js
ai-skill-test.html
```

### Loader responsibilities

1. Fetch a registered skill/package manifest from the same Foundry origin.
2. Validate that the selected skill exists in `skills/index.json`.
3. Validate that its capability exists in `api/foundry-capabilities.json`.
4. Resolve the runtime path from the canonical capability/package metadata.
5. Reject cross-origin runtime paths.
6. Load only allow-listed first-party scripts.
7. Verify the expected global/export exists.
8. Load the declared self-test document.
9. Execute only declared non-destructive self-tests.
10. Report structured status:
    - discovered;
    - manifest valid;
    - runtime loaded;
    - contract resolved;
    - self-test passed/failed;
    - ready/not ready.

### Loader non-goals

The loader must not:

- dynamically execute arbitrary source provided by an unregistered remote site;
- store credentials;
- turn UI-bound tools into fake headless APIs;
- duplicate algorithms;
- silently repair invalid packages;
- claim remote execution capability.

### Acceptance test C — Foundry browser proof

Open the public static harness in a normal browser and load `binary-cube-laboratory`.

**Pass:** the harness loads the canonical engine, runs deterministic self-tests, and reports `ready` without any server-side service.

This test proves the strongest capability GitHub Pages itself can provide: a static page that onboards and executes a compatible browser-JS skill locally in the visitor's browser.

---

## Stage 4 — Make runtime compatibility machine-readable

**Status:** Planned.

### Objective

Allow an LLM to decide whether to attempt execution instead of discovering incompatibility by trial and error.

### Required runtime declaration fields

Each portable package/capability should eventually declare:

- runtime family: JavaScript, browser page context, pure data/resource, device/sensor, external service;
- module style/global export;
- required scripts and load order;
- DOM requirement: yes/no;
- Web API requirements;
- network requirement after load;
- cross-origin requirement;
- persistent state requirement;
- authentication requirement;
- destructive side-effect level;
- self-test availability;
- known host compatibility notes.

### Host compatibility response

A loader or consuming agent should be able to derive a result shaped conceptually like:

```json
{
  "capability": "shadowrun.binary-cube",
  "discovered": true,
  "onboarded": true,
  "runtime": "javascript",
  "runtimeCompatible": true,
  "selfTestAvailable": true,
  "selfTestPassed": true,
  "ready": true
}
```

or, equally valid:

```json
{
  "capability": "shadowrun.binary-cube",
  "discovered": true,
  "onboarded": true,
  "runtime": "javascript",
  "runtimeCompatible": false,
  "reason": "Current host does not permit loading the declared JavaScript runtime.",
  "ready": false
}
```

A truthful incompatibility result is a **successful onboarding outcome**, not a system failure.

---

## Stage 5 — External LLM interoperability test matrix

**Status:** Planned after Stages 1–4.

### Objective

Stop evaluating success from our own implementation perspective. Test the public Foundry from multiple outside reasoning environments.

### Models/environments

Test, where practically available:

- Gemini;
- ChatGPT;
- Claude;
- a generic Agent Skills-aware host;
- a plain web crawler/fetch environment;
- a JavaScript-capable agent/runtime host.

The purpose is not to make every host execute every skill. The purpose is to make every host accurately discover **what is possible in that host**.

### Required test cases

#### Test 1 — root discovery

Input: only the Foundry root URL.

Expected: model reaches the machine-discovery layer.

#### Test 2 — skill selection

Prompt: "Find the Cube Encryption tool and determine how it is used."

Expected: `binary-cube-laboratory` / `shadowrun.binary-cube`, not a generic explanation of cube ciphers.

#### Test 3 — contract resolution

Prompt: "What exact arguments does Binary Cube encryption require?"

Expected: operation contract is used; argument order is not guessed.

#### Test 4 — runtime determination

Prompt: "Can you use it from this environment?"

Expected: host-specific yes/no with a concrete runtime reason.

#### Test 5 — self-test

When host is compatible, run the declared self-test before invoking meaningful work.

#### Test 6 — operation round trip

Generate/load the deterministic test key, encrypt the fixed binary fixture, decrypt it, and verify exact equality with the original fixture.

#### Test 7 — honest failure

Run the same workflow in a host without JS-loading ability.

Expected: discovery and onboarding succeed; execution is reported unavailable.

### Evidence format

Each test report should record:

- date/time;
- model/product and mode where known;
- exact initial prompt;
- initial URL(s) supplied;
- machine files successfully discovered;
- skill selected;
- runtime conclusion;
- self-test result;
- operation result if executed;
- exact failure point;
- whether any human intervention was required after the initial prompt.

---

## Stage 6 — Promote additional portable skills by runtime difficulty

**Status:** Blocked on Binary Cube proof.

Do not attempt to package every Foundry tool simultaneously. Promote them in order of implementation portability.

### Wave 1 — Pure/browser JavaScript with clear contracts

Candidates:

1. Binary Cube Laboratory — first proof.
2. Signals Laboratory pure utilities.
3. Signals configuration analysis if all dependencies are self-contained.
4. Other deterministic calculators with no page-specific state.

### Wave 2 — Browser JavaScript generators

Candidates:

- semantic module map generation;
- alien vessel generation;
- Kaysender airship generation.

These require dependency/load-order validation because several scripts cooperate.

### Wave 3 — Page-context capabilities

Example:

- `blacklight.exo.jump.calculate`.

Do not package as fully portable until the current page-context dependency is either explicitly represented and loadable or the authoritative core is cleanly extractable without duplicating logic.

### Wave 4 — UI-bound capabilities

Examples include tools whose authoritative behavior still reads/writes page controls directly.

Required work is **core extraction**, not an AI adapter that recreates the logic.

### Wave 5 — Device/live-context capabilities

Examples:

- Live Signals;
- sensor/device laboratories;
- microphone or hardware-dependent tools.

These should remain discoverable even when they cannot be headlessly portable.

---

## Stage 7 — Skill bundles and token-efficient onboarding

**Status:** Future after individual portable packages work.

### Objective

Allow an LLM to load only the context needed for a task.

Possible onboarding levels:

- **compact** — identity, purpose, critical rules, operations, runtime requirements;
- **standard** — complete SKILL.md plus operation contracts;
- **full** — skill, examples, test definitions, implementation notes, related resources, troubleshooting.

Possible bundles:

- Scientific Laboratories;
- Blacklight GM tools;
- Foundry Developer/Repository tools;
- Spatial Generation;
- Campaign Lore Retrieval.

Bundles must reference individual skills rather than copy their contents.

---

## Stage 8 — Integrity, provenance, and version pinning

**Status:** Future.

### Objective

Make loadable static packages safer and reproducible.

Reserve support for:

- package version;
- capability version;
- runtime source digest;
- package digest;
- publisher/authority identity;
- optional signature mechanism;
- dependency version ranges;
- canonical source URL;
- test-vector version.

A consuming host should be able to pin a known package/runtime version instead of silently changing behavior during a long-running agent session.

---

## Stage 9 — Decide whether an external execution transport is actually necessary

**Status:** Explicitly deferred.

### Decision gate

Only consider remote MCP/RPC/browser services after the static proof program answers these questions:

1. Can external models reliably discover the machine interface from the root URL?
2. Can they onboard skills from static files?
3. Can compatible hosts load and execute canonical JavaScript engines?
4. Which important capabilities remain unusable solely because their host lacks an execution runtime?
5. Is remote execution valuable enough to justify an additional hosted service and its security/maintenance burden?

If the answers show that an external transport is needed, design it as an adapter over existing capability definitions.

It must not become a second source of business/game/scientific logic.

---

# 6. Binary Cube first-proof implementation checklist

This is the immediate actionable sequence for the next development conversation.

1. **Verify public deployment** of current machine-discovery files.
2. **Verify root discovery pointers** in deployed `index.html`.
3. **Inspect `skills/binary-cube-laboratory/SKILL.md`** against current capability/operation contracts.
4. **Create `skills/binary-cube-laboratory/manifest.json`** as an HB companion metadata file, not a replacement skill standard.
5. **Design deterministic self-test vectors** using only operations already documented in `api/operation-contracts.json`.
6. **Run those vectors directly against `shadowrun-binary-cube-engine.js`** and record expected values from the authoritative engine.
7. **Create `skills/binary-cube-laboratory/self-test.json`.**
8. **Create small `examples.json`** referencing—not copying—the operation contracts.
9. **Build the generic same-origin static skill loader.**
10. **Build the human/browser self-test page.**
11. **Run Binary Cube self-test in the public GitHub Pages browser environment.**
12. **Run the root-only Gemini acceptance test.**
13. **Run the same root-only test with ChatGPT/Claude where available.**
14. **Document all results, including failures.**
15. Only after a successful Binary Cube proof, promote the next capability family.

---

# 7. Definition of success for the static model

The static GitHub Pages approach is considered proven when all of the following are observed:

1. A model given only the Foundry root URL reaches the machine-discovery manifest without being manually handed the manifest URL.
2. It discovers `binary-cube-laboratory` through the Agent Skills registry.
3. It identifies `shadowrun.binary-cube` as the canonical capability.
4. It resolves exact operation contracts without guessing from implementation source.
5. It locates the canonical runtime and its required export/global.
6. It correctly determines whether its host can execute that runtime.
7. In a compatible browser/JS host, the deterministic self-test passes using the canonical engine.
8. Encryption/decryption round-trip succeeds for the fixed test fixture.
9. In an incompatible host, the model reports runtime incompatibility rather than claiming the tool does not exist or offering to recreate the algorithm from scratch.
10. No second Binary Cube implementation is introduced anywhere in the onboarding layer.

If these ten conditions are met, the Foundry has demonstrated a useful static **discover → onboard → validate → execute-if-compatible** capability system.

---

# 8. Failure categories and required response

Future development and test reports should classify failures rather than simply saying "the AI couldn't use it."

### Discovery failure

The model never reaches the machine manifest.

**Repair area:** root machine pointer, deployment/read-back, crawler discoverability.

### Registry failure

The machine manifest is found but the requested capability/skill cannot be resolved.

**Repair area:** canonical registries and IDs.

### Onboarding failure

The skill is found but lacks sufficient instructions to identify authority, contracts, runtime, or constraints.

**Repair area:** `SKILL.md` / package companion metadata.

### Contract failure

The model cannot determine exact operation arguments or return expectations.

**Repair area:** `api/operation-contracts.json`.

### Runtime declaration failure

The model cannot determine what environment is required.

**Repair area:** capability/package runtime metadata.

### Host incompatibility

The package is correct but the consuming environment cannot execute it.

**This is not necessarily a Foundry defect.** The correct result is a precise incompatibility report.

### Self-test failure

The runtime loads but deterministic tests fail.

**Repair area:** authoritative engine, test vector, load order, version mismatch, or package integrity. Do not bypass the test.

### Invocation failure

Self-test passes but the requested operation fails.

**Repair area:** input construction, operation contract, runtime defect, or unsupported operation. Preserve failure evidence.

---

# 9. Future-conversation handoff procedure

Any later conversation resuming this work should begin by reading this file and then verifying repository state before making claims.

Use this sequence:

1. Read `docs/ai-access-portable-skill-onboarding-roadmap.md`.
2. Verify current `main` head.
3. Inspect the current versions of:
   - `.well-known/ai-capabilities.json`;
   - `api/ai/index.json`;
   - `skills/index.json`;
   - `api/ai/skill-onboarding.json`;
   - `api/foundry-capabilities.json`;
   - `api/operation-contracts.json`;
   - `skills/binary-cube-laboratory/SKILL.md`;
   - `shadowrun-binary-cube-engine.js`.
4. Find the first incomplete stage/checklist item.
5. Implement the smallest authoritative change that advances that item.
6. Observe/read back the change from GitHub.
7. If public behavior is claimed, separately verify the GitHub Pages public URL.
8. Record test evidence and update this roadmap or a linked acceptance report.

Operational completion language must follow evidence:

**INTENT → EXECUTE → OBSERVE → VERIFY → CLAIM.**

Do not call a change committed unless a real Git commit on the authoritative repository/branch has been observed. Do not call it deployed until the public Pages URL has been read back.

---

# 10. Immediate next action

The next implementation task is **not MCP**.

It is:

> Complete the portable Binary Cube Agent Skill package and deterministic self-test, then prove that the public static Foundry can discover and execute it in a compatible browser-JavaScript host while incompatible LLM hosts can still onboard it and report the exact runtime limitation.

That proof determines whether the static GitHub Pages strategy is sufficient and which, if any, capabilities later justify an external execution service.
