# Universal NPC Profile Generator — Initial Risk Register

## Purpose

This register identifies the principal architectural, data, user-interface, validation, migration, and project-management risks for the Universal NPC Profile Generator. It is a Phase 0 control document and should be updated whenever a phase exposes a new failure mode or retires an existing risk.

## Rating Scale

- **Probability:** Low, Medium, High
- **Impact:** Low, Medium, High, Critical
- **Status:** Open, Controlled, Monitoring, Retired

# Active Risks

## R-001 — Duplicating the existing Kaysender NPC generator

- **Probability:** High
- **Impact:** High
- **Status:** Controlled

### Risk

A new universal generator could become a second, incompatible implementation of the same logic while the Kaysender generator continues to evolve independently.

### Controls

- Keep the universal core setting-neutral.
- Preserve the existing `kaysender-npc-generator.js` runtime until the adapter phase.
- Treat the later Kaysender integration as a data-pack and compatibility-adapter task.
- Do not copy Kaysender-specific names, factions, regions, or class assumptions into the universal core.
- Require Phase 12 parity tests before considering retirement of the old alpha.

### Retirement condition

The universal engine reproduces all current Kaysender alpha capabilities from a Kaysender pack and passes compatibility fixtures.

---

## R-002 — Building one enormous universal form

- **Probability:** High
- **Impact:** High
- **Status:** Controlled

### Risk

Displaying every possible field for every archetype would create an unreadable interface and force users to manage irrelevant controls.

### Controls

- Use progressive disclosure.
- Resolve archetype policies before rendering specialized controls.
- Replace generic sections with archetype-specific sections.
- Hide `Not applicable` sections from normal readable output.
- Keep Quick, Standard, and Deep generation modes distinct.

### Verification

Browser tests must confirm that selecting a beggar, thief, soldier, banker, guard, craft worker, bandit, or noble changes the visible controls and output labels.

---

## R-003 — Treating `None`, `Unknown`, empty, and `Not applicable` as the same value

- **Probability:** High
- **Impact:** Critical
- **Status:** Controlled

### Risk

Collapsing absence states would produce misleading profiles, broken imports, and impossible downstream logic.

### Controls

- Encode explicit state objects in canonical JSON.
- Validate state values.
- Preserve state reasons and substitute sections.
- Never use an empty string as a canonical absence state.
- Test all four states in fixtures and round trips.

### Verification

Phase 1 fixtures must demonstrate every absence state and reject malformed mixed states.

---

## R-004 — Hard-coding archetype logic in the user interface

- **Probability:** High
- **Impact:** High
- **Status:** Open

### Risk

Direct `if archetype === ...` branches scattered through UI code would make custom packs, testing, and later archetypes difficult.

### Controls

- Store field policies in archetype data.
- Resolve applicability in the rules engine.
- Render controls from resolved section descriptors.
- Permit only narrowly scoped presentation adapters for genuinely unique widgets.

### Verification

A new archetype fixture should be renderable from data without changing the core UI for ordinary fields.

---

## R-005 — Random-table incoherence

- **Probability:** High
- **Impact:** High
- **Status:** Open

### Risk

Independent random choices may generate technically valid but narratively contradictory people.

Examples include a homeless property owner without explanation, a deceased relative living in the household, an unemployed worker with a current supervisor, or a destitute NPC carrying elite equipment without provenance.

### Controls

- Generate structural state before descriptive details.
- Use dependency-aware table filters.
- Run post-generation validation.
- Produce explicit exceptional explanations when uncommon combinations are allowed.
- Add contradiction fixtures and large seeded generation tests.

### Verification

Phase 4 requires at least 100 valid seeds per first-release archetype. Phase 14 expands this to at least 1,000 per archetype.

---

## R-006 — Non-reproducible randomization

- **Probability:** High
- **Impact:** High
- **Status:** Open

### Risk

Using `Math.random()` throughout the runtime would make profiles impossible to reproduce, debug, test, or selectively reroll safely.

### Controls

- Introduce a deterministic seeded random source.
- Record generator version, pack version, seed, selections, and locks.
- Derive stable sub-seeds by field or section.
- Include a generation receipt in exported JSON.

### Verification

The same inputs must reproduce byte-equivalent normalized profile data, excluding timestamps explicitly marked as non-deterministic metadata.

---

## R-007 — Selective rerolls changing unrelated fields

- **Probability:** High
- **Impact:** Medium
- **Status:** Open

### Risk

Rerolling a surname or secret could unexpectedly alter family, occupation, level, residence, and equipment.

### Controls

- Use section and field sub-seeds.
- Preserve locked values.
- Define reroll scope explicitly.
- Record reroll counters per section.

### Verification

Automated tests compare before-and-after profiles and ensure only the requested field, dependent derived values, and explicitly linked sections change.

---

## R-008 — Schema designed only around first-release archetypes

- **Probability:** Medium
- **Impact:** High
- **Status:** Controlled

### Risk

A schema built only for eleven initial archetypes could fail when adding clergy, investigators, prisoners, diplomats, sailors, mages, or crews.

### Controls

- Maintain the broader archetype catalogue during Phase 0.
- Use canonical sections plus extensible specialized sections.
- Require stable IDs and namespaced extension fields.
- Add representative future-family fixtures before declaring schema stability.

### Verification

Phase 1 includes placeholder fixtures for at least one authority, religious, mobile, confined, and institutional archetype beyond Wave A.

---

## R-009 — Specialized archetypes reduced to occupation labels

- **Probability:** High
- **Impact:** Critical
- **Status:** Controlled

### Risk

The generator may appear diverse while every profile still has the same structure and only changes the occupation string.

### Controls

- Require specialized operational sections.
- Define archetype exit criteria.
- Validate required specialized fields.
- Test output labels and section differences.

### Verification

A banker, beggar, bandit, guard, soldier, thief, craft worker, merchant, noble, laborer, and civilian must generate meaningfully different structured records.

---

## R-010 — Overly rigid plausibility rules

- **Probability:** Medium
- **Impact:** High
- **Status:** Open

### Risk

Validation may reject unusual but useful characters, such as a high-level beggar, a noble without an estate, a soldier without a unit, or a wealthy thief.

### Controls

- Prefer explanatory exception states over blanket rejection.
- Distinguish contradiction, warning, and unusual-but-valid diagnostics.
- Permit pack-specific cultural and biological rules.
- Preserve user overrides with visible diagnostics.

### Verification

Fixtures must include unusual valid profiles with explicit explanations.

---

## R-011 — Weak age, ancestry, and family plausibility

- **Probability:** High
- **Impact:** High
- **Status:** Open

### Risk

Generic human assumptions may create impossible family structures for short-lived, long-lived, ageless, rapidly maturing, or culturally unusual ancestries.

### Controls

- Put maturity and lifespan ranges in ancestry packs.
- Generate family age relationships from ancestry policy.
- Permit unknown, adopted, created, communal, and non-biological family structures.
- Avoid hard-coding human age thresholds in the universal core.

### Verification

Phase 7 must test multiple longevity models and nontraditional households.

---

## R-012 — Mechanical rules contaminating narrative generation

- **Probability:** Medium
- **Impact:** High
- **Status:** Controlled

### Risk

Requiring class, level, combat statistics, or challenge values could make the generator unusable for narrative-only systems.

### Controls

- Keep mechanical profile optional.
- Separate narrative data from rules adapters.
- Allow `mechanicalMode: none`.
- Keep open-d20 compatibility in a dedicated adapter or data family.

### Verification

Every archetype must produce a valid narrative-only profile.

---

## R-013 — Rules or copyrighted text copied into public data packs

- **Probability:** Medium
- **Impact:** Critical
- **Status:** Open

### Risk

Mechanical implementation could inadvertently copy protected text or setting-specific proprietary material.

### Controls

- Use open-d20-compatible names and broad progression descriptors.
- Write original explanatory text.
- Keep Kaysender lore separate from rules-facing mechanics.
- Audit imported data packs before release.

### Verification

Documentation and data review precede Phase 9 release.

---

## R-014 — Invalid custom packs crashing the runtime

- **Probability:** High
- **Impact:** High
- **Status:** Open

### Risk

Missing IDs, broken references, invalid weights, malformed policies, or namespace collisions could break generation.

### Controls

- Create a custom-pack schema.
- Validate before activation.
- Reject protected core ID overrides.
- Isolate pack errors.
- Provide actionable diagnostics and fallback to last valid pack.

### Verification

Phase 11 includes malformed, duplicate-ID, missing-reference, and future-version packs.

---

## R-015 — Data-pack bloat and slow loading

- **Probability:** Medium
- **Impact:** Medium
- **Status:** Open

### Risk

A large catalogue of names, backgrounds, relationships, and specialized tables could increase initial page load and memory use.

### Controls

- Split packs by data family.
- Load the manifest first.
- Lazy-load specialized archetype tables.
- Cache validated packs during the session.
- Avoid monolithic single-line JSON files for large new data families.

### Verification

Browser tests measure successful loading under local server and GitHub Pages conditions.

---

## R-016 — Import/export losing provenance or locks

- **Probability:** Medium
- **Impact:** High
- **Status:** Open

### Risk

A readable export may round-trip while losing seed, pack version, source IDs, locked fields, or absence states.

### Controls

- Define canonical JSON separately from presentation exports.
- Preserve generation receipt, locks, provenance, diagnostics, and state objects.
- Add normalized round-trip tests.

### Verification

Phase 10 requires import-export-import equality for canonical fields.

---

## R-017 — Unsupported old or future schemas failing unsafely

- **Probability:** Medium
- **Impact:** High
- **Status:** Open

### Risk

Imported profiles from older versions or unsupported future versions may be misread silently.

### Controls

- Use explicit semantic schema versions.
- Add migration registries.
- Reject unsupported future schemas with recoverable diagnostics.
- Preserve the original import for user recovery.

### Verification

Fixtures cover current, old migratable, unsupported old, malformed, wrong-profile, and future-schema records.

---

## R-018 — Premature coupling to the P6 editor

- **Probability:** Medium
- **Impact:** High
- **Status:** Controlled

### Risk

Attempting to build the full persistent NPC/roster editor during generator development could violate the staged editor production order and expand scope uncontrollably.

### Controls

- Treat this work as a generator project.
- Design compatible IDs and profile sections without implementing the full editor.
- Defer evolving campaign state, roster assignments, payroll, injuries, availability, and cross-record operations to P6.
- Do not mark P6 complete because the generator exists.

### Verification

Registry and documentation continue to distinguish generator status from production editor status.

---

## R-019 — Breaking the existing site or script loading

- **Probability:** Medium
- **Impact:** Critical
- **Status:** Open

### Risk

Adding the standalone module or entry script may disrupt current pages, registry rendering, or supplemental script loading.

### Controls

- Do not change runtime files during Phase 0.
- Add the standalone entry only after schemas and the core vertical slice exist.
- Follow the established standalone Spell Creator card pattern.
- Keep failures isolated and recoverable.
- Add browser smoke coverage before activation.

### Verification

Current site smoke checks must pass before and after the Generator Bench card is enabled.

---

## R-020 — Concurrent branch or implementation drift

- **Probability:** Low
- **Impact:** High
- **Status:** Controlled

### Risk

Multiple active branches or competing implementations could fracture the codebase and create conflicting schemas.

### Controls

- Use exactly one active branch: `main`.
- Commit in dependency-safe increments.
- Keep one active NPC generator phase at a time.
- Record phase status in a machine-readable ledger.

### Verification

All phase commits target `main`; no implementation branch is created.

---

## R-021 — Phase completion without evidence

- **Probability:** Medium
- **Impact:** High
- **Status:** Open

### Risk

A phase may be declared complete because files exist, even though its exit gate has not been demonstrated.

### Controls

- Define an explicit exit gate for every phase.
- Record evidence paths in the phase ledger.
- Require fixtures, validators, or browser receipts where applicable.
- Distinguish `implementation-complete` from `gate-passed` when necessary.

### Verification

The machine-readable phase ledger cannot advance a phase to complete without evidence references.

# Risk Review Cadence

The register should be reviewed:

- before beginning each phase;
- whenever a validator discovers a new class of error;
- whenever an import or migration format changes;
- before enabling the Generator Bench entry;
- before adding custom packs;
- before the Kaysender adapter replaces any existing behavior;
- before initial release.

# Phase 0 Risk Exit Condition

Phase 0 risk planning is complete when the principal duplication, absence-state, hard-coding, coherence, reproducibility, schema, UI, migration, licensing, staging, and branch-discipline risks have documented controls and future verification points.
