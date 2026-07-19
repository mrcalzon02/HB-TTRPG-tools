# Desktop Passive World Observation Development Plan

This document is the governing **Development Plan** for expanding the installed Barotrauma World Simulation Toolbox into a long-running passive observation application focused on NPC civilization, settlement expansion and contraction, creature populations, migration, ecology, and the interaction between human activity and Europa's natural world.

The desktop Java 17 application and its SQLite world database remain the primary implementation target and authoritative simulator. Browser work is deliberately deferred until the desktop observation model, persistence contract, and export format are stable.

## Purpose

The finished desktop application should allow an operator to leave a world running, return later, and understand:

- Which stations, outposts, populations, and factions expanded or contracted.
- Which settlements were founded, reinforced, evacuated, abandoned, or reclaimed.
- Which NPC vessels, convoys, patrols, rescue craft, and migration groups moved through the world.
- Which creature populations grew, collapsed, migrated, nested, hunted, or were displaced.
- How traffic, extraction, habitat, prey, predators, security, logistics, and disasters affected one another.
- Why every important change happened.
- What changed between two selected ticks without rewriting the current world.

The application must provide durable evidence rather than unexplained animation. Every substantial change must be recoverable from committed state, causal events, population flows, encounters, and observation history.

## Development rules

### Desktop-first authority

The SQLite desktop world is authoritative. The browser may later display exported or locally streamed observation data, but it must not silently simulate the same authoritative world independently.

### Meaningful development slices

A slice is a small vertical implementation that produces observable value and can be independently verified. A slice should normally include:

1. Persistence or data-contract changes.
2. Deterministic simulation behavior or read-only registry behavior.
3. Desktop presentation or operator access.
4. Verification fixtures and failure tests.
5. Documentation updates in this Development Plan and the relevant subsystem document.

Database-only, UI-only, or documentation-only work may be necessary supporting slices, but they do not complete a behavioral milestone by themselves.

### Milestone completion gate

A milestone may be marked **Complete** only when:

- Every required slice is complete.
- Fresh and legacy migrations pass.
- Deterministic replay or read-only reconstruction passes where applicable.
- The desktop UI exposes the implemented behavior.
- Failure behavior is explicit and fault-contained.
- Relevant documentation describes the actual committed behavior rather than the intended behavior.
- `verifyWorldStore` includes the milestone contract.

### Documentation discipline

This file remains the single milestone roadmap. As development proceeds:

- Update the milestone status table.
- Mark completed slices and record their schema or application boundary.
- Add a concise entry to the Development Record at the end of this file.
- Update `README.md` when commands, entry points, schema versions, or completed capabilities change.
- Update focused documents such as `NATURAL_WORLD.md` or `docs/donor-assets.md` when their subsystem boundary changes.
- Do not create a replacement roadmap for each milestone.

### Branch and compatibility discipline

- Development remains on `main` unless the repository policy is explicitly changed.
- Existing normalized imports, vessel identities, snapshots, and web-suite compatibility must remain intact.
- Forward migrations must preserve existing worlds.
- Passive simulation remains single-writer and transactional.
- Observation queries remain read-only.
- Donor Barotrauma assets remain local-only and optional.

## Status legend

- **Complete** — accepted vertical behavior is committed and verified.
- **Active** — current milestone receiving implementation slices.
- **Planned** — scoped but not yet authoritative.
- **Deferred** — intentionally waiting for a required earlier contract.

## Milestone overview

| Milestone | Name | Status | Primary result |
|---|---|---|---|
| 0 | Existing passive-world baseline | Complete | Schema 014 economy, civilization frontier, fleet response transit, ecology, geology, extraction, and graphical mapping |
| 1 | Observation foundation | Planned | Persistent observation vocabulary, population seeds, event evidence, and read-only registry |
| 2 | NPC population and settlement lifecycle | Planned | Population accounting, growth, contraction, evacuation, founding, abandonment, and reclamation |
| 3 | Faction influence and territorial pressure | Planned | Node and route influence, contested control, political drift, and faction consequences |
| 4 | Creature population and territory simulation | Planned | Species cohorts, carrying capacity, reproduction, mortality, nests, migration, and competition |
| 5 | NPC–creature–environment interaction | Planned | Hunting, displacement, habitat pressure, predation, abandoned-site colonization, and mission feedback |
| 6 | Desktop Observation Center | Planned | Unified live map, layers, filters, inspectors, event stream, and changed-since-tick refresh |
| 7 | Historical snapshots, timeline, and replay | Planned | Non-mutating playback, tick comparison, event navigation, retention, and rollups |
| 8 | Explainability, intelligence views, and watchlists | Planned | Causal summaries, GM/intelligence visibility, confidence, alerts, and tracked entities |
| 9 | Long-running desktop operation | Planned | Tray operation, restart recovery, bounded catch-up, profiles, health reporting, and backups |
| 10 | Observation export and browser snapshot viewer | Deferred | Versioned desktop export and read-only browser playback of desktop state |
| 11 | Optional local browser bridge | Deferred | Loopback-only read service with pairing, deltas, and revocation |
| 12 | Installer and release hardening | Planned | Installed launchers, migration backup, update safety, diagnostics, and release verification |

---

# Milestone 0 — Existing passive-world baseline

**Status: Complete**

The current baseline includes:

- Deterministic canonical time and one logical writer.
- Automatic Passive Mode scheduling.
- Station economy, consumption, civilization-frontier states, and monster pressure.
- NPC missions, vessels, routes, encounters, research, freight, production, and markets.
- Material-gated rescue, towing, repair, refuel, rearm, and reinforcement response operations.
- Physical outbound and return response transit.
- Persistent ecology, geology, natural events, finite resources, extraction, depletion, and renewable recovery.
- Donor-backed or fallback graphical assets and a graphical Europa map.

Milestone 0 is the platform on which the observation expansion is built. Its tables and aggregate ecology values are inputs to later population systems, not disposable prototypes.

---

# Milestone 1 — Observation foundation

**Status: Planned**

## Goal

Create the persistence and read-only observation contracts required by every later milestone without yet introducing aggressive new expansion behavior.

## Slice 1.1 — Observation vocabulary and invariants

Define shared enums and records for:

- Observation event categories.
- Entity types.
- Causes and contributing factors.
- Population-change terms.
- Flow status.
- Territory status.
- Visibility and confidence.
- Snapshot identity and parentage.

Define invariants for nonnegative population, bounded influence, causal evidence, deterministic IDs, and replay-safe ordering.

**Acceptance:** Dependency-free contract tests validate all enum values, required fields, ID rules, and serialization fixtures.

## Slice 1.2 — Schema 015 observation tables

Add forward-only persistence for:

- `npc_population_state`
- `creature_population_state`
- `creature_territory_state`
- `faction_location_presence`
- `population_flow`
- `world_observation_event`
- `observation_snapshot`
- `observation_metric_series`
- `observer_watch_rule`

Seed NPC population from existing station population capacity, industry, security, civilization strength, and status. Seed initial creature aggregates from ecology, location level, biome, herbivore biomass, predator biomass, scavengers, and the desktop creature registry.

**Acceptance:** Fresh and schema-014 worlds migrate to schema 015 with deterministic, duplicate-safe seed rows and no mutation of existing aggregate state.

## Slice 1.3 — ObservationRegistry

Create read-only query services for:

- Current world overview.
- Location population summary.
- Species summary.
- Faction presence.
- Recent flows and events.
- Changed-since-tick queries.
- Selected entity history.

**Acceptance:** Registry queries operate under `PRAGMA query_only`, reject unsupported schema versions, and reproduce expected fixture summaries.

## Slice 1.4 — Initial desktop observation tables

Add read-only population, creature, influence, flow, and event tabs to the desktop registry or a first Observation Center shell.

**Acceptance:** An operator can inspect all schema-015 seed data without enabling simulation or opening raw SQLite tools.

## Milestone 1 completion gate

- Schema 015 migration and preservation tests pass.
- Every observed state has a stable identity and last-updated tick.
- Read-only changed-since-tick querying exists.
- Desktop UI exposes seeded NPC and creature populations.
- Observation JSON fixtures are versioned for later export work.

---

# Milestone 2 — NPC population and settlement lifecycle

**Status: Planned**

## Goal

Replace purely abstract civilization strength with an explainable NPC population model that can grow, migrate, contract, evacuate, found settlements, abandon locations, and reclaim them.

## Slice 2.1 — Population accounting

Track civilian, industrial, logistics, security, medical, scientific, temporary, and refugee populations. Add housing, life-support, employment, food, water, medical, and security support.

Each population cycle must account for:

`next = current + births + arrivals - deaths - departures - casualties`

**Acceptance:** Every term is bounded, recorded, and reconciles exactly to the next committed population.

## Slice 2.2 — Growth and contraction pressure

Derive growth or contraction pressure from supply history, housing, employment, safety, integrity, faction stability, traffic access, and recent disasters.

Add hysteresis, threshold duration, and cooldowns so settlements do not oscillate between states each tick.

**Acceptance:** Deterministic fixtures demonstrate stable growth, sustained stagnation, controlled contraction, and recovery without threshold flapping.

## Slice 2.3 — Evacuation and refugee flows

Create durable population flows and NPC transport demand when a settlement contracts or enters emergency evacuation.

Flows require origin, destination, quantity, cause, departure, arrival, status, transport requirement, and losses or returns.

**Acceptance:** Departure and arrival are atomic; population cannot exist at both endpoints; failed flows record casualties, return, diversion, or stranding.

## Slice 2.4 — Founding, abandonment, and reclamation projects

Expansion must consume population surplus, materials, supplies, transport capacity, security support, and construction time. Abandonment must leave explicit infrastructure, inventory, salvage, and habitat consequences. Reclamation must be a new project rather than a status reset.

**Acceptance:** A fixture can found an outpost, expand it, starve it into evacuation, abandon it, and later reclaim it with complete evidence.

## Slice 2.5 — Desktop settlement inspector

Expose population composition, capacity, limiting factors, lifecycle state, flows, projects, and recent causes.

**Acceptance:** Selecting a station answers both “what changed?” and “why?” without consulting logs manually.

---

# Milestone 3 — Faction influence and territorial pressure

**Status: Planned**

## Goal

Represent political and operational presence as bounded influence on world nodes and route edges rather than station ownership alone.

## Slice 3.1 — Influence production

Generate influence from resident population, security, trade traffic, patrol activity, allied neighbors, missions, resource control, and successful defense.

## Slice 3.2 — Contested nodes and routes

Model dominant, minority, neutral, contested, collapsing, and covert influence. Route-edge influence affects safety, tariffs, migration, mission generation, and response availability.

## Slice 3.3 — Political transitions

Add secession pressure, annexation, neutralization, faction withdrawal, administrative collapse, and negotiated transfer. Transitions require sustained conditions and event evidence.

## Slice 3.4 — Map influence layers

Display node and edge control, contested routes, recent gains or losses, and confidence. Do not invent geographic polygons for a route-graph world.

## Milestone 3 completion gate

A faction can gain and lose influence through population, trade, patrols, missions, and disasters; contested state affects simulation behavior; every transition is visible and historically reconstructable.

---

# Milestone 4 — Creature population and territory simulation

**Status: Planned**

## Goal

Promote creatures from weighted encounter selections and aggregate predator pressure into persistent species populations with territory and food-web behavior.

## Slice 4.1 — Desktop creature registry normalization

Import or normalize the creature catalogue into stable desktop species identities with depth range, class, prey, predator, habitat, reproduction, migration, aggression, and special-behavior tags.

Donor graphical assets may provide local creature icons where resolvable; procedural fallbacks remain mandatory.

## Slice 4.2 — Carrying capacity and cohort accounting

Track estimated count or biomass, juvenile/mature/breeding proportions, health, food stress, mortality, recent losses, and observation confidence.

Population accounting follows:

`next = current + births + immigration - natural deaths - starvation - predation - hunting - emigration`

## Slice 4.3 — Nests and territory states

Implement `DORMANT`, `FORAGING`, `NESTING`, `MIGRATING`, `EXPANDING`, `OVERPOPULATED`, `COLLAPSING`, and `DISPLACED` territory states.

## Slice 4.4 — Migration and competition

Creatures migrate through route-adjacent locations in response to prey, habitat, overcrowding, industrial disturbance, hunting, geological events, and predator competition.

## Slice 4.5 — Exceptional entities

Allow named apex creatures or encounter-active groups to exist as individual entities while ordinary populations remain aggregated.

## Slice 4.6 — Desktop species inspector

Expose abundance, biomass, territory, nests, prey support, mortality, migration, confidence, and threat to nearby settlements.

## Milestone 4 completion gate

Species populations reproduce, die, migrate, compete, and establish or lose territory using deterministic bounded rules tied to ecology rather than arbitrary growth rolls.

---

# Milestone 5 — NPC–creature–environment interaction

**Status: Planned**

## Goal

Connect settlement growth, vessel traffic, extraction, ecology, creature populations, missions, and station threat into one feedback system.

## Slice 5.1 — Food-web linkage

Map species consumption and support onto producer, algae, herbivore, predator, scavenger, and bioaccumulator state.

## Slice 5.2 — Human disturbance and habitat pressure

Station expansion, route traffic, sonar, mining, harvesting, pollution, abandonment, and restoration alter habitat capacity and migration pressure.

## Slice 5.3 — Hunting and defensive operations

Fauna-clearing, patrol, research, quarantine, and nest-removal missions affect real species populations and territories. Hunting can create prey release or scavenger growth rather than only lowering a generic threat value.

## Slice 5.4 — Creature attacks and settlement consequences

Creature pressure can damage infrastructure, kill or displace population, interrupt trade, trigger evacuation, or create response operations. Abandoned infrastructure can become habitat or nesting territory.

## Slice 5.5 — Causal interaction evidence

Every major interaction records primary cause, contributing factors, before state, after state, magnitude, and linked entities.

## Milestone 5 completion gate

A complete fixture demonstrates a settlement expanding into habitat, disturbing a prey population, attracting or displacing predators, generating missions, suffering consequences, and either stabilizing or contracting with reconciled evidence.

---

# Milestone 6 — Desktop Observation Center

**Status: Planned**

## Goal

Unify the graphical map and evidence registries into a dedicated desktop observation workspace.

## Slice 6.1 — Observation Center shell

Create one desktop entry point with:

- Top simulation status and canonical time.
- Center graphical map.
- Left layer/filter controls.
- Right selected-entity inspector.
- Bottom timeline and event stream.
- Detailed evidence tables as secondary tabs.

## Slice 6.2 — Live delta subscription

Subscribe to completed passive cycles. Query only changes since the last displayed tick and apply bounded UI updates. Simulation cadence and rendering cadence remain separate.

## Slice 6.3 — Observation layers

Add toggles for:

- NPC population density and trend.
- Settlement lifecycle.
- Faction influence.
- Civilian and refugee flows.
- NPC vessel traffic.
- Creature biomass and selected species.
- Nests, territory, and migration.
- Habitat integrity and productivity.
- Resource extraction and geology.
- Route danger and recent attacks.

## Slice 6.4 — Inspectors and linked navigation

Selecting a station, vessel, faction, species, population flow, event, or route should cross-link related evidence and allow direct map focus.

## Slice 6.5 — Performance budget

Support the default 960-location world without blocking the Swing event thread. Use aggregate rendering, cached icons, changed-since-tick reads, spatial filtering, and summarized catch-up updates.

## Milestone 6 completion gate

An operator can leave Passive Mode running and observe meaningful changes live from one workspace without manually refreshing separate windows.

---

# Milestone 7 — Historical snapshots, timeline, and replay

**Status: Planned**

## Goal

Allow historical observation and comparison without mutating the current world.

## Slice 7.1 — Snapshot policy

Create periodic complete observation snapshots plus smaller deltas and event records between snapshots.

## Slice 7.2 — Retention and rollups

Retain detailed recent history, aggregate older metrics into daily or configured rollups, and preserve named checkpoints.

## Slice 7.3 — Timeline controls

Add live, pause, single-step display, scrub, jump-to-event, compare, and return-to-live controls. Replay reads historical state only.

## Slice 7.4 — Tick comparison

Compare populations, settlements, factions, creature territories, resources, habitat, traffic, and causal events between two ticks.

## Milestone 7 completion gate

The Observation Center can reconstruct a selected historical tick and return to current state without changing the authoritative database state.

---

# Milestone 8 — Explainability, intelligence views, and watchlists

**Status: Planned**

## Goal

Make the simulation understandable and support focused long-term observation.

## Slice 8.1 — Causal summaries

Generate bounded human-readable explanations from committed causes and contributing factors rather than free-form guesses.

## Slice 8.2 — GM and intelligence visibility

Support:

- Omniscient GM view.
- In-world intelligence view with estimates, confidence, last observation, hidden nests, and delayed reports.

The database stores truth; the presentation policy controls disclosure.

## Slice 8.3 — Watchlists

Allow the operator to watch stations, factions, vessels, species, routes, locations, and resource sites.

## Slice 8.4 — Alert evidence

Create durable alerts for contraction, abandonment, colonization, migration toward a station, nest creation, apex detection, route interruption, resource exhaustion, and contested influence.

Alerts remain observational and do not automatically intervene.

## Milestone 8 completion gate

A user can follow selected entities over time, receive evidence-backed alerts, and understand important changes at both omniscient and in-world information levels.

---

# Milestone 9 — Long-running desktop operation

**Status: Planned**

## Goal

Make Passive Mode reliable as an installed application that may run for extended periods or recover after downtime.

## Slice 9.1 — Simulation profiles

Add Observation Only, Real-Time Slow, Standard Passive, Accelerated Study, Catch-Up, and Replay profiles.

## Slice 9.2 — Tray and minimized operation

Allow the installed application to continue simulation while minimized to the system tray, with clear running, paused, and faulted states.

## Slice 9.3 — Restart and offline catch-up policy

Allow the user to choose:

- Resume without catch-up.
- Bounded catch-up.
- No automatic simulation while closed.
- Optional launch at login.

A full operating-system service is deferred until tray operation and restart recovery are proven.

## Slice 9.4 — Health and fault reporting

Expose last successful cycle, cycle duration, queued catch-up, database size, snapshot retention, active observer count, and fault details.

## Slice 9.5 — Automatic backups

Create verified backups before schema migration, before large catch-up operations, and according to a user-configurable retention policy.

## Milestone 9 completion gate

The installed application can run, pause, close, restart, catch up within configured bounds, fault closed, and recover without duplicate ticks or corrupted observation history.

---

# Milestone 10 — Observation export and browser snapshot viewer

**Status: Deferred until Milestones 1, 6, and 7 are stable**

## Goal

Allow the web browser to display desktop observation state without becoming a second authority.

## Planned slices

- Define `barotrauma-world-observation-v1` export.
- Export a committed snapshot or selected tick range.
- Exclude local paths, donor assets, Steam metadata, credentials, and private player data.
- Add a browser observer page using IndexedDB.
- Render desktop snapshots, events, timelines, and comparisons read-only.
- Require cloning to a new world ID before browser sandbox simulation is allowed.

## Completion gate

The browser reconstructs desktop fixture snapshots exactly and cannot mutate imported authoritative state.

---

# Milestone 11 — Optional local browser bridge

**Status: Deferred**

## Goal

Provide optional read-only observation of a running local desktop world from the browser.

## Planned slices

- Loopback-only HTTP service bound to `127.0.0.1`.
- Random expiring pairing token.
- Read-only status, snapshot, event, and metric endpoints.
- Explicit browser-origin allowlist.
- Visible connection indicator and immediate revoke action.
- Polling first; server-sent events only after compatibility testing.

No SQL, filesystem, donor asset, or mutation endpoint is permitted.

---

# Milestone 12 — Installer and release hardening

**Status: Planned**

## Goal

Deliver the observation application safely through the local installer and top-level download path.

## Slice 12.1 — Installed launchers

Add installed shortcuts or menu actions for:

- Main desktop shell.
- Observation Center.
- Asset setup.
- World import.
- Diagnostics and verification.

## Slice 12.2 — Upgrade and migration safety

Back up worlds before migration, detect unsupported newer schemas, provide recovery instructions, and never overwrite a failed upgrade silently.

## Slice 12.3 — Packaged verification

Verify the installed runtime, SQLite driver, fallback assets, launchers, writable data paths, export paths, and optional donor discovery.

## Slice 12.4 — Release documentation

Document installation, world location, backups, Passive Mode profiles, observation layers, history retention, troubleshooting, and privacy boundaries.

## Milestone 12 completion gate

A release artifact installs, launches, opens or imports a world, runs Passive Mode, displays observation state with fallbacks, backs up and migrates safely, and passes packaged smoke verification.

---

# Cross-cutting verification requirements

Every simulation milestone must test:

- Deterministic results from the same seed and inputs.
- Nonnegative populations, biomass, inventory, and capacities.
- Exact population-flow conservation or explicit casualty accounting.
- No duplicated migration, extraction, material commitment, or response settlement.
- No UI write access through observation registries.
- Transaction rollback on failure.
- Fresh and legacy migration.
- Bounded catch-up.
- Default 960-location performance.
- Clear fault state rather than silent partial success.

# Initial execution order

The next meaningful implementation sequence is:

1. **Milestone 1, Slice 1.1** — observation vocabulary and invariants.
2. **Milestone 1, Slice 1.2** — schema 015 and deterministic seed rows.
3. **Milestone 1, Slice 1.3** — read-only ObservationRegistry.
4. **Milestone 1, Slice 1.4** — desktop population and creature evidence tabs.
5. Begin **Milestone 2** with NPC population accounting before adding settlement projects.

This order creates inspectable data first, then introduces behavior in controlled slices.

# Development Record

Append concise entries here as slices are completed. Each entry should identify the milestone and slice, schema or UI boundary, verification performed, and the next intended slice.

## 2026-07-19 — Development Plan established

- Added this desktop-first milestone roadmap.
- Fixed the SQLite desktop world as the authoritative simulation source.
- Divided passive NPC, settlement, faction, creature, interaction, observation, history, operations, browser compatibility, and installer work into significant milestones and vertical slices.
- Established completion gates and incremental documentation requirements.
- Next intended slice: Milestone 1.1, observation vocabulary and invariants.
