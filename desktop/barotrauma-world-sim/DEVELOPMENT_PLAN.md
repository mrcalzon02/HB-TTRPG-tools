# Desktop Passive World Observation Development Plan

This document is the governing **Development Plan** for expanding the installed Barotrauma World Simulation Toolbox into a long-running passive observation application focused on NPC civilization, settlement expansion and contraction, creature populations, migration, ecology, and the interaction between human activity and Europa's natural world.

The desktop Java 17 application and its SQLite world database are the primary implementation target and authoritative simulator. Browser work remains deferred until the desktop observation model, persistence contract, history, and export format are stable.

## Purpose

The finished desktop application should allow an operator to leave a world running, return later, and understand:

- Which stations, outposts, populations, and factions expanded or contracted.
- Which settlements were founded, reinforced, evacuated, abandoned, or reclaimed.
- Which NPC vessels, convoys, patrols, rescue craft, and migration groups moved through the world.
- Which creature populations grew, collapsed, migrated, nested, hunted, or were displaced.
- How traffic, extraction, habitat, prey, predators, security, logistics, and disasters affected one another.
- Why every important change happened.
- What changed between two selected ticks without rewriting the current world.

The application must provide durable evidence rather than unexplained animation. Every substantial change must be recoverable from committed state, causal events, population flows, encounters, metrics, and observation history.

# Development rules

## Desktop-first authority

The SQLite desktop world is authoritative. The browser may later display exported or locally streamed observation data, but it must not silently simulate the same authoritative world independently.

## Meaningful development slices

A slice is a small vertical implementation that produces observable value and can be independently verified. A slice should normally include:

1. Persistence or data-contract changes.
2. Deterministic simulation behavior or read-only registry behavior.
3. Desktop presentation or operator access.
4. Verification fixtures and failure tests.
5. Documentation updates in this Development Plan and the relevant subsystem document.

Database-only, UI-only, or documentation-only work may be necessary supporting slices, but they do not complete a behavioral milestone by themselves.

## Milestone completion gate

A milestone may be marked **Complete** only when:

- Every required slice is complete.
- Fresh and legacy migrations pass.
- Deterministic replay or read-only reconstruction passes where applicable.
- The desktop UI exposes the implemented behavior.
- Failure behavior is explicit and fault-contained.
- Relevant documentation describes committed behavior rather than intended behavior.
- `verifyWorldStore` includes the milestone contract.

## Documentation discipline

This file remains the single milestone roadmap. As development proceeds:

- Update the milestone status table.
- Mark completed slices and record their schema or application boundary.
- Add a concise entry to the Development Record.
- Update `README.md` when commands, entry points, schema versions, or completed capabilities change.
- Update focused documents such as `NATURAL_WORLD.md`, `docs/donor-assets.md`, or `docs/observation-contract.md` when their subsystem boundary changes.
- Do not create a replacement roadmap for each milestone.

## Branch and compatibility discipline

- Development remains on `main` unless repository policy is explicitly changed.
- Existing normalized imports, vessel identities, snapshots, and web-suite compatibility remain intact.
- Forward migrations preserve existing worlds.
- Passive simulation remains single-writer and transactional.
- Observation queries remain read-only.
- Donor Barotrauma assets remain local-only and optional.

## Status legend

- **Complete** — accepted vertical behavior is committed and verified.
- **Active** — current milestone receiving implementation slices.
- **Planned** — scoped but not yet authoritative.
- **Deferred** — intentionally waiting for a required earlier contract.

# Milestone overview

| Milestone | Name | Status | Primary result |
|---|---|---|---|
| 0 | Existing passive-world baseline | Complete | Schema 014 economy, civilization frontier, fleet response transit, ecology, geology, extraction, and graphical mapping |
| 1 | Observation foundation | Complete | Schema 015 vocabulary, deterministic population seeds, event evidence, query-only registry, and desktop evidence window |
| 2 | NPC population and settlement lifecycle | Active | Population accounting, growth, contraction, migration, evacuation, founding, abandonment, and reclamation |
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

The baseline includes:

- Deterministic canonical time and one logical writer.
- Automatic Passive Mode scheduling.
- Station economy, consumption, civilization-frontier states, and monster pressure.
- NPC missions, vessels, routes, encounters, research, freight, production, and markets.
- Material-gated rescue, towing, repair, refuel, rearm, and reinforcement operations.
- Physical outbound and return response transit.
- Persistent ecology, geology, natural events, finite resources, extraction, depletion, and renewable recovery.
- Donor-backed or fallback graphical assets and a graphical Europa map.

Milestone 0 remains the platform for observation expansion. Its aggregate civilization and ecology values are source evidence, not disposable prototypes.

---

# Milestone 1 — Observation foundation

**Status: Complete**

## Goal

Create the persistence and read-only observation contracts required by later population behavior without introducing unexplained autonomous expansion.

## Slice 1.1 — Observation vocabulary and invariants

**Status: Complete**

Implemented:

- Stable event categories, entity types, causes, population terms, flow states, territory states, visibility modes, and confidence levels.
- Nonnegative and conserved population accounting.
- Legal population-flow transitions.
- Deterministic observation identities.
- Snapshot-parent safeguards.
- Immutable event evidence.
- Versioned canonical event encoding and decoding.

Verification:

```text
gradle verifyObservationContract
```

Focused documentation:

```text
docs/observation-contract.md
```

## Slice 1.2 — Schema 015 observation tables

**Status: Complete**

Schema 015 adds:

- `npc_population_state`
- `creature_population_state`
- `creature_territory_state`
- `faction_location_presence`
- `population_flow`
- `world_observation_event`
- `observation_snapshot`
- `observation_metric_series`
- `observer_watch_rule`

It also adds read-optimized observation views and deterministic triggers.

NPC populations are seeded from schema-014 station economy and civilization state. Four ecological guild populations—herbivore, predator, scavenger, and bioaccumulator—are seeded per ecological location. Territory, faction, event, metric, and root-snapshot evidence is created without mutating the schema-014 source aggregates.

Verification:

```text
gradle verifyObservationFoundation
```

The focused verifier checks deterministic seed identities, duplicate-safe reruns, later-row trigger seeding, source-state preservation, constraints, and foreign-key integrity.

## Slice 1.3 — ObservationRegistry

**Status: Complete**

Implemented a strictly query-only registry providing:

- Current world overview.
- NPC population summaries.
- Creature population and territory summaries.
- Faction presence.
- Population flows.
- Observation events.
- Snapshots and metrics.
- Changed-since-tick queries.
- Selected-entity event history.
- Rejection of older or newer unsupported schemas.

Verification:

```text
gradle verifyObservationRegistry
```

## Slice 1.4 — Initial desktop observation surface

**Status: Complete**

The read-only Observation Foundation window exposes:

- World summary.
- NPC populations and capacities.
- Creature guilds and territories.
- Faction presence.
- Population flows.
- Observation events.
- Snapshots.
- Metric series.
- Changed-after-tick filtering.

Launch with:

```text
gradle runObservationFoundation
```

This is an evidence console, not yet the final graphical Observation Center.

## Milestone 1 completion gate

Satisfied: stable vocabulary, schema migration, deterministic seed state, read-only reconstruction, desktop visibility, focused verification, and documentation are committed. New population behavior may now depend on schema 015.

---

# Milestone 2 — NPC population and settlement lifecycle

**Status: Active**

## Goal

Replace the current abstract population index with conserved, explainable population changes while retaining the existing civilization frontier as a compatible pressure model.

## Slice 2.1 — Population accounting and reconciliation

**Status: Active — next implementation slice**

Add a transactional per-tick population ledger containing:

- Population before and after.
- Births.
- Deaths.
- Immigration.
- Emigration.
- Disaster casualties.
- Other explicit gains and losses.
- Capacity and morale inputs.
- Cause evidence.

Reconcile the new detailed population total with the existing `population_index` without allowing either representation to silently overwrite the other.

**Acceptance:** every NPC population change satisfies the accounting identity, creates event and metric evidence, is deterministic from the same inputs, and rolls back with the passive tick.

## Slice 2.2 — Capacity, growth, mortality, and morale

Add slow bounded behavior driven by:

- Housing capacity.
- Life-support capacity.
- Employment capacity.
- Food and supply availability.
- Medical support.
- Integrity and security.
- Threat and fauna pressure.
- Morale.

Growth must be capacity-supported. Mortality must be evidence-backed. Hysteresis prevents stations from alternating rapidly between growth and decline.

## Slice 2.3 — Population migration and evacuation

Create durable population flows with:

- Origin and destination.
- Quantity.
- Cause.
- Preparation, transit, arrival, return, failure, and cancellation state.
- Transport requirement.
- Departure and arrival ticks.
- Explicit casualty accounting.

Initial flows include ordinary migration, worker transfer, refugee evacuation, and emergency relocation.

## Slice 2.4 — Founding, expansion, abandonment, and reclamation projects

Settlement transitions require committed projects rather than direct state flips.

Projects include:

- Colony founding.
- Outpost expansion.
- Capacity construction.
- Emergency evacuation.
- Formal abandonment.
- Reclamation.

Projects consume transport, construction material, supplies, time, and security support.

## Slice 2.5 — NPC lifecycle desktop evidence

Extend the observation window with:

- Population-ledger history.
- Capacity pressure.
- Migration and evacuation progress.
- Settlement projects.
- Expansion and contraction causes.
- Reconciliation state with the civilization frontier.

## Milestone 2 completion gate

NPC population totals change conservatively and deterministically; migration physically moves people; settlement transitions require projects; UI and evidence explain every gain, loss, departure, arrival, abandonment, and reclamation.

---

# Milestone 3 — Faction influence and territorial pressure

**Status: Planned**

## Planned slices

1. Influence production from residents, security, trade, patrols, missions, resources, and allied adjacency.
2. Route-edge influence and traffic control.
3. Contested, covert, dominant, minority, neutral, and withdrawn presence transitions.
4. Political drift, secession, annexation, neutralization, and ownership consequences.
5. Faction overlays, inspectors, and causal evidence.

Territory is represented as node and route control. No invented geographic polygons are required.

---

# Milestone 4 — Creature population and territory simulation

**Status: Planned**

## Planned slices

1. Replace guild-only seeds with species-aware aggregated cohorts while retaining guild rollups.
2. Carrying capacity and habitat support.
3. Births, natural mortality, starvation, and predation.
4. Nests, spawning grounds, territory pressure, and migration readiness.
5. Migration, dispersal, displacement, competition, and population collapse.
6. Exceptional individual apex entities only where world significance justifies individual simulation.
7. Creature overlays, inspectors, and evidence.

Creature accounting follows:

```text
next population = current + births + immigration - deaths - emigration - hunting losses
```

---

# Milestone 5 — NPC–creature–environment interaction

**Status: Planned**

## Planned slices

- Predator expansion affecting station threat and route danger.
- Hunting and fauna-clearing operations reducing populations with explicit losses.
- Prey release and ecological rebound after predator removal.
- Traffic, sonar, pollution, mining, and harvesting affecting habitat and migration.
- Abandoned stations becoming nests, feeding grounds, or reclamation targets.
- Refugee, casualty, and carcass consequences feeding scavenger pressure.
- Habitat restoration, quarantine, infestation, and nest-clearing missions.
- Bidirectional evidence between population, ecology, missions, and logistics.

---

# Milestone 6 — Desktop Observation Center

**Status: Planned**

## Planned slices

1. Unify the graphical map and observation evidence under one controller.
2. Add map layers for population, growth, faction influence, migration, creature biomass, selected species, nests, habitat, resources, traffic, and danger.
3. Add selected station, species, faction, vessel, route, and resource inspectors.
4. Subscribe to passive-cycle completion and query changed rows rather than reloading the world.
5. Throttle rendering independently from accelerated simulation.
6. Preserve detailed evidence tables as an advanced view.

The initial schema-015 Observation Foundation window remains available until the unified center fully replaces its role.

---

# Milestone 7 — Historical snapshots, timeline, and replay

**Status: Planned**

## Planned slices

- Periodic complete observation snapshots.
- Smaller event and metric deltas between snapshots.
- Retention policy and aggregate rollups.
- Pause, step, jump, scrub, compare, and return-to-live controls.
- Non-mutating reconstruction of prior ticks.
- Event navigation and selected-entity history.
- Replay verification from snapshots plus deltas.

Replay must never rewrite current authoritative state.

---

# Milestone 8 — Explainability, intelligence views, and watchlists

**Status: Planned**

## Planned slices

1. Bounded human-readable causal summaries generated from committed causes.
2. Omniscient GM view.
3. In-world intelligence view with estimates, confidence, delayed reports, and hidden information.
4. Watchlists for stations, factions, vessels, species, routes, locations, and resource sites.
5. Durable observational alerts for contraction, abandonment, colonization, migration, nest creation, apex detection, route interruption, contested influence, and depletion.

Alerts remain observational and do not automatically intervene.

---

# Milestone 9 — Long-running desktop operation

**Status: Planned**

## Planned slices

- Observation Only, Real-Time Slow, Standard Passive, Accelerated Study, Catch-Up, and Replay profiles.
- Minimized and system-tray operation.
- Resume without catch-up, bounded catch-up, or no closed-application simulation policies.
- Optional launch at login.
- Health reporting for last cycle, duration, queued work, database size, retention, and faults.
- Verified backups before migration, large catch-up, and according to retention policy.

A full operating-system service remains deferred until tray operation and restart recovery are proven.

---

# Milestone 10 — Observation export and browser snapshot viewer

**Status: Deferred until Milestones 6 and 7 are stable**

## Planned slices

- Define `barotrauma-world-observation-v1`.
- Export one committed snapshot or selected tick range.
- Exclude local paths, donor assets, Steam metadata, credentials, and unselected private player data.
- Add a browser observer using IndexedDB.
- Render desktop snapshots, events, timelines, and comparisons read-only.
- Require cloning to a new world ID before browser sandbox simulation.

The browser must reconstruct desktop fixtures exactly and cannot mutate imported authoritative state.

---

# Milestone 11 — Optional local browser bridge

**Status: Deferred**

## Planned slices

- Loopback-only service bound to `127.0.0.1`.
- Random expiring pairing token.
- Read-only status, snapshot, event, and metric endpoints.
- Explicit browser-origin allowlist.
- Visible connection indicator and immediate revoke action.
- Polling first; server-sent events only after compatibility testing.

No SQL, filesystem, donor asset, or mutation endpoint is permitted.

---

# Milestone 12 — Installer and release hardening

**Status: Planned**

## Planned slices

1. Installed shortcuts for the shell, Observation Center, asset setup, import, and diagnostics.
2. Backup-before-migration and unsupported-newer-schema handling.
3. Installed-runtime, SQLite, fallback-asset, launcher, writable-path, and donor-discovery smoke verification.
4. Installation, world location, backups, profiles, layers, retention, troubleshooting, and privacy documentation.
5. Stable top-level installer download and release automation.

A release must install, launch, open or import a world, run Passive Mode, display observation state with fallbacks, migrate safely, and pass packaged smoke verification.

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

# Active execution order

The next meaningful implementation sequence is:

1. **Milestone 2, Slice 2.1** — transactional NPC population accounting and reconciliation.
2. **Milestone 2, Slice 2.2** — capacity-supported growth, mortality, and morale.
3. **Milestone 2, Slice 2.3** — migration and evacuation flows.
4. **Milestone 2, Slice 2.4** — founding, abandonment, and reclamation projects.
5. **Milestone 2, Slice 2.5** — lifecycle evidence in the desktop observation window.

This order establishes conservation and evidence before allowing settlement movement or state transitions.

# Development Record

## 2026-07-19 — Development Plan established

- Established the desktop-first milestone roadmap.
- Fixed the SQLite desktop world as the authoritative simulation source.
- Deferred browser authority until desktop contracts are stable.

## 2026-07-19 — Milestone 1.1 completed

- Added dependency-free observation vocabulary and invariants.
- Added deterministic IDs, population accounting, flow transitions, snapshot safeguards, and canonical event encoding.
- Added `verifyObservationContract` and focused contract documentation.

## 2026-07-19 — Milestone 1.2 completed

- Advanced the desktop database to schema 015.
- Added NPC populations, creature populations and territories, faction presence, flows, events, snapshots, metrics, and watch rules.
- Added deterministic, duplicate-safe seed rows and source-state preservation checks.
- Added `verifyObservationFoundation` and fresh/legacy migration coverage.

## 2026-07-19 — Milestone 1.3 completed

- Added the query-only `ObservationRegistry`.
- Added current, changed-since-tick, and selected-entity history queries.
- Added unsupported-schema rejection and `verifyObservationRegistry`.

## 2026-07-19 — Milestone 1.4 completed

- Added the read-only Observation Foundation desktop window.
- Exposed populations, territories, faction presence, flows, events, snapshots, metrics, and tick filtering.
- Added `runObservationFoundation`.

## Next

Implement Milestone 2.1: transactional NPC population accounting and reconciliation with the existing civilization frontier.
