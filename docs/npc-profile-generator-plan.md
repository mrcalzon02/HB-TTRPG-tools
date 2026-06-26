# Universal NPC Profile Generator — Phased Implementation Plan

## Status

- **Active phase:** Phase 0 — specification and architecture
- **Runtime status:** not started
- **Active branch:** `main`
- **Existing runtime preserved:** `kaysender-npc-generator.js`
- **Intended placement:** standalone generator launched from the main Generator Bench
- **Future integration:** compatible with the planned P6 NPC, Crew, Household, and Roster Editor

## Purpose

The Universal NPC Profile Generator will create category-aware NPCs rather than undifferentiated random characters. A banker, beggar, craft worker, soldier, thief, noble, guard, laborer, or bandit must receive a profile structured around the circumstances of that type of person.

The generator must support deliberate customization of ancestry or race, age, level, class or profession, background, motivations, family, residence, employment, workplace or operating area, affiliations, possessions, secrets, problems, and campaign hooks. It must also recognize that some fields are legitimately absent or irrelevant.

A beggar should not be forced to own or work at a normal place of business. A thief may require a territory, fence, safehouse, and preferred targets. A guard requires a station, patrol area, shift, and superior. A soldier requires a unit and assignment. A noble requires a house, title, estate relationship, or an explicit explanation for lacking them.

## Scope Boundary

This generator is a new setting-neutral module. It does not replace or expand the existing Kaysender NPC and Crew alpha in place. The Kaysender runtime remains functional until a later adapter phase proves that the universal engine can reproduce all current Kaysender output while adding deeper profiles.

The generator creates profile records. It is not the completed P6 persistent roster editor. Long-term assignments, evolving injuries, availability, payroll, organization membership, revision history, and cross-record campaign operations remain responsibilities of the later editor.

## Proposed Module Layout

```text
npc-profile-generator.html
npc-profile-generator-entry.js
npc-profile-generator-core.js
npc-profile-generator-rules.js
npc-profile-generator-ui.js
npc-profile-generator-renderer.js
npc-profile-generator-storage.js
npc-profile-generator-export.js

data/npc-generator/
  manifest.json
  archetypes/
  ancestries/
  names/
  tables/
  packs/

data/schemas/
  npc-profile.schema.json
  npc-generator-pack.schema.json
  npc-archetype.schema.json

scripts/
  validate-npc-generator-data.mjs
  validate-npc-archetypes.mjs
  validate-npc-profile-schema.mjs
  validate-npc-applicability.mjs
  validate-npc-generation-fixtures.mjs
```

## Architectural Layers

### Core engine

The core engine owns deterministic randomization, weighted selection, field locking, section rerolling, dependency resolution, profile assembly, validation, and diagnostics. It must not contain setting-specific names, ancestries, factions, locations, or lore.

### Rules and applicability layer

The rules layer decides which fields are required, optional, prohibited, substituted, derived, or allowed to return an explicit absence state for each archetype.

### Data packs

Data packs provide archetypes, occupations, names, ancestries, backgrounds, motivations, appearances, families, residences, workplaces, operating areas, relationships, equipment, secrets, problems, and hooks.

### Presentation layer

The presentation layer supplies progressive controls, locks, rerolls, manual editing, profile cards, copy actions, import/export, printing, accessibility, and recoverable diagnostics.

## Absence and Applicability Contract

The generator must distinguish four states.

- **Present:** the field applies and contains a value.
- **None:** the field applies, but the NPC genuinely has none.
- **Unknown:** the field may apply, but the answer is unknown or deliberately unresolved.
- **Not applicable:** the field does not logically apply and may be replaced by a more suitable section.

Example:

```json
{
  "workplace": {
    "state": "not-applicable",
    "substituteSection": "operatingArea",
    "reason": "The selected archetype is an itinerant bandit."
  }
}
```

Not-applicable fields should normally be hidden from readable output while remaining represented in canonical JSON diagnostics. `None`, `Unknown`, and `Not applicable` must never be treated as interchangeable.

## Canonical Profile Families

The initial canonical profile will reserve stable sections for:

- metadata and provenance;
- identity and naming;
- physical description;
- rules and mechanical profile;
- social and economic profile;
- residence;
- workplace, duty station, or operating environment;
- family and household;
- personality and behavior;
- immediate and long-term motivations;
- background and career history;
- affiliations and relationships;
- possessions and resources;
- secrets, problems, information, and hooks;
- locks, diagnostics, validation, and generation receipt.

Narrative-only NPCs are valid. A mechanical class, level, challenge estimate, or stat stub must never be mandatory unless the selected generation mode explicitly requests one.

## Generation Modes

### Quick NPC

Produces identity, archetype, occupation, ancestry, age, level or threat when enabled, disposition, motivation, problem, and secret.

### Standard NPC

Adds appearance, residence, workplace or operating area, family, background, affiliations, equipment, relationships, and campaign hooks.

### Deep NPC

Produces every applicable section, including detailed household, employment, finances, obligations, career history, loyalties, secrets, possessions, and mechanical information.

### Roster mode

Generates related households, businesses, patrols, military units, gangs, noble houses, guild teams, ship crews, or traveling groups. Roster mode is explicitly deferred until the individual profile contract is stable.

## Required Control Behavior

Every major field or section should eventually support:

- automatic generation;
- user-selected value;
- lock;
- reroll field;
- reroll section;
- clear;
- set to `None`;
- set to `Unknown`;
- restore archetype default.

The same generator version, data-pack version, seed, selections, and locked values must reproduce the same profile. Field or section rerolls should use derived sub-seeds so changing a surname does not unexpectedly replace the NPC's family, level, equipment, and motivations.

## Cross-Field Rules Required in the First Implementation

- Children cannot receive implausible adult family roles.
- A homeless NPC cannot simultaneously own a normal residence without a deliberate secret or contradiction marker.
- A beggar does not receive a normal commercial workplace.
- A bandit receives a camp, territory, gang, or ambush area rather than a storefront.
- A thief receives territory, targets, contacts, a fence, or a safehouse rather than an ordinary business by default.
- A soldier receives a unit unless generated as discharged, retired, captured, or deserted.
- A guard receives a station, post, or patrol area.
- A noble receives a house, title, estate tie, or an explicit exception.
- A banker receives an institution, partnership, employer, or independent lending operation.
- A craft worker receives a trade and tools, although a workshop may be absent.
- An apprentice usually receives a master, school, employer, or guild.
- A prisoner cannot have unrestricted normal employment.
- A refugee may have a former occupation while lacking current employment.
- Deceased relatives cannot also be active household members.
- An NPC without children cannot receive child-dependent details.
- Mechanical level, rank, wealth, and equipment should remain broadly compatible.

Contradictions should create diagnostics rather than silent substitutions.

# Phased Operation

## Phase 0 — Specification and architecture

### Deliverables

- this implementation plan;
- initial archetype catalogue;
- initial applicability matrix;
- initial risk register;
- explicit boundary between the universal generator and the existing Kaysender alpha;
- file and schema map;
- first-release boundary.

### Exit gate

Phase 0 is complete when the profile families, absence states, archetype hierarchy, applicability policies, initial release scope, and architectural boundaries are documented in the repository.

## Phase 1 — Canonical schemas and fixtures

Create the profile, data-pack, and archetype JSON schemas. Define IDs, versions, provenance, locks, diagnostics, and absence states. Add valid, edge-case, contradictory, and malformed fixtures.

### Minimum fixtures

- civilian laborer;
- craft worker with workshop;
- craft worker without workshop;
- beggar without residence or business;
- thief with safehouse and fence;
- bandit with camp and territory;
- soldier with unit and rank;
- guard with patrol district;
- banker with institution;
- noble with house and estate;
- refugee with former occupation;
- child dependent;
- elderly retired veteran;
- malformed profile;
- contradictory profile.

### Exit gate

Every valid fixture passes schema validation, and every invalid or contradictory fixture fails with an actionable diagnostic.

## Phase 2 — Archetype and applicability engine

Implement archetype inheritance, subtype resolution, field policies, substitutions, weighted absence, dependency rules, and contradiction diagnostics without yet depending on a large content catalogue.

### Exit gate

Every initial archetype resolves its required, optional, hidden, substitute, derived, and prohibited sections correctly before profile prose is generated.

## Phase 3 — Deterministic generation core

Implement seeded randomization, weighted choice, field sub-seeds, locking, selective rerolls, profile assembly, fallbacks, generation receipts, and post-generation validation.

### Exit gate

The same seed and options reproduce the same profile. Locked values survive unrelated rerolls. Invalid references produce diagnostics instead of runtime failures.

## Phase 4 — Minimum generic fantasy data pack

Create enough data to support the first vertical slice: civilian, laborer, craft worker, merchant, beggar, guard, soldier, thief, bandit, banker, and noble.

### Exit gate

Each initial archetype produces at least 100 validated seeded profiles without undefined values, empty required fields, impossible combinations, or inappropriate workplace sections.

## Phase 5 — Standalone interface

Add the Generator Bench card and standalone workspace. Provide generation depth, archetype, subtype, ancestry, age, level, context, seed, lock, reroll, manual-edit, reset, and diagnostic controls with progressive disclosure.

### Exit gate

A user can create, customize, lock, reroll, and read every initial archetype without being required to interact with irrelevant controls.

## Phase 6 — Deep identity, background, and motivation

Expand cultural names, aliases, titles, ancestry-sensitive age, education, career history, defining events, ambitions, fears, loyalties, grievances, pride, shame, moral boundaries, and reason for being present.

### Exit gate

Deep outputs read as coherent individuals rather than unrelated random-table fragments.

## Phase 7 — Family, household, and relationships

Implement parents, siblings, partners, children, dependents, adoption, guardianship, estrangement, death, unknown relatives, household types, shared naming rules, obligations, and secrets with age plausibility.

### Exit gate

Family and household records are internally consistent and reconcile with age, residence, death, estrangement, and dependency states.

## Phase 8 — Archetype-specific operational modules

Add deep commercial, authority, military, criminal, elite, marginalized, and mobile-person modules so archetypes receive genuinely different operational data rather than only different occupation labels.

### Exit gate

Every supported archetype has useful type-specific details, controls, validation, and readable output.

## Phase 9 — Mechanical profile generation

Add optional open-d20-compatible levels, classes, NPC classes, combat readiness, important abilities, equipment, and stat stubs while preserving narrative-only generation.

### Exit gate

Mechanical output is internally compatible and remains optional.

## Phase 10 — Storage, import, export, and printing

Add local saves, loading, cloning, canonical JSON, readable text, Markdown, compact table cards, full GM profiles, print layout, schema checks, and safe rejection of unsupported future records.

### Exit gate

A profile can be saved, reloaded, edited, exported, imported, and regenerated without losing identity, locks, seed, or provenance.

## Phase 11 — Custom data packs

Allow validated custom names, ancestries, archetypes, occupations, motivations, backgrounds, and related tables without modifying core JavaScript.

### Exit gate

A campaign pack can extend the generator safely, with clear errors and protected core IDs.

## Phase 12 — Kaysender adapter

Create a Kaysender pack and compatibility adapter that imports its ancestries, regions, factions, population bands, classes, crew roles, and older generated-record assumptions.

### Exit gate

The universal engine reproduces all current Kaysender NPC alpha capabilities before any retirement of the old runtime is considered.

## Phase 13 — Roster and group generation

Generate coherent households, businesses, patrols, squads, gangs, bandit groups, noble households, guild teams, crews, and traveling parties with shared references and non-contradictory roles.

### Exit gate

Groups contain genuine shared relationships, locations, leadership, surnames, and organization links rather than unrelated NPCs placed in a list.

## Phase 14 — Automated validation and browser testing

Add static validators, seeded generation matrices, JSON round trips, lock and reroll tests, progressive-control tests, accessibility checks, mobile layout checks, and browser smoke coverage.

### Exit gate

All validators and browser tests pass on `main`, and the GitHub Pages deployment remains functional.

## Phase 15 — Documentation and initial release

Add the user guide, schema reference, data-pack guide, archetype guide, migration guide, troubleshooting guide, README updates, and development-history entry.

### Release label

`Active generator — profile schema stable, data catalogue expanding.`

## First Release Boundary

The first usable release includes:

- eleven initial archetypes;
- a generic fantasy ancestry pack;
- Quick, Standard, and Deep generation;
- ancestry, age, and optional level controls;
- background and motivations;
- family and household;
- residence;
- conditional workplace, duty station, or operating area;
- personality and relationships;
- equipment, secrets, problems, and hooks;
- locks and section rerolls;
- deterministic seeds;
- JSON import/export;
- readable copy output;
- validation and diagnostics.

Roster generation, custom campaign packs, Kaysender conversion, and full persistent editor behavior follow after the individual profile contract proves stable.

## Branch and Commit Discipline

All work remains on the single active branch `main`. No secondary branch is created.

Implementation should proceed in small dependency-safe commits that leave the existing site and generators functional. A generator phase does not override the active main-line editor stage defined by the Kaysender editor roadmap.

## Definition of Success

The generator succeeds when the selected NPC type changes the structure and meaning of the generated profile.

A banker must not merely be a civilian with the occupation label “banker.” A beggar must not be assigned an irrelevant storefront. A thief needs targets, methods, contacts, and risks. A guard needs a post and duty. A soldier needs a unit and assignment. A craft worker needs a trade, tools, and economic context. A noble needs political, familial, and property relationships.

The final profile should explain who the NPC is, what they do, where they fit in society, whom they care about, what they need, what pressures them, what they can offer, and how they can matter at the table.
