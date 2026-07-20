# Desktop Passive World Observation Development Plan

This document is the governing **Development Plan** for expanding the installed Barotrauma World Simulation Toolbox into a long-running passive observation application focused on NPC civilization, settlement expansion and contraction, creature populations, migration, ecology, and the interaction between human activity and Europa's natural world.

The desktop Java 17 application and SQLite world database are the authoritative simulator. Browser observation remains deferred until the desktop persistence, history, and export contracts are stable.

## Purpose

The finished application should let an operator leave a world running, return later, and determine:

- Which settlements, populations, and factions expanded or contracted.
- Which stations were founded, reinforced, evacuated, abandoned, or reclaimed.
- Which NPC vessels and population groups moved through the world.
- Which creature populations grew, collapsed, migrated, nested, or were displaced.
- How logistics, traffic, extraction, habitat, prey, predators, security, and disasters interacted.
- Why every important change occurred.
- What changed between selected ticks without modifying the current world.

Every substantial change must be recoverable from committed state, causal events, population ledgers and flows, encounters, metrics, and later historical snapshots.

# Development rules

## Desktop-first authority

The SQLite desktop world is authoritative. A browser may later display exports or a read-only local stream, but it must not independently simulate the same authoritative world.

## Meaningful development slices

A slice should normally include:

1. Persistence or contract changes.
2. Deterministic simulation or read-only registry behavior.
3. Desktop presentation.
4. Verification and failure tests.
5. Documentation updates.

Database-only, UI-only, or documentation-only work may support a slice but does not complete a behavioral milestone alone.

## Milestone completion gate

A milestone may be marked **Complete** only when:

- Every required slice is complete.
- Fresh and legacy migrations are covered.
- Deterministic behavior or read-only reconstruction is verified.
- Desktop UI exposes the behavior.
- Failure behavior is explicit and fault-contained.
- Documentation describes committed behavior.
- `toolbox.cmd verify` includes the milestone contract.

## Documentation discipline

- Keep this file as the single roadmap.
- Update milestone and slice status after each accepted slice.
- Append a Development Record entry.
- Update `README.md` when schema, commands, entry points, or capabilities change.
- Update focused subsystem documents rather than creating replacement roadmaps.

## Compatibility discipline

- Development remains on `main` unless repository policy changes.
- Existing imports, vessel identities, snapshots, and web compatibility remain intact.
- Migrations are forward-only and preserve existing worlds.
- Passive simulation remains single-writer and transactional.
- Observation queries remain query-only.
- Donor assets remain optional and local-only.

## Status legend

- **Complete** — accepted vertical behavior is committed and verified.
- **Active** — current implementation slice.
- **Planned** — scoped but not authoritative.
- **Deferred** — waiting for a prerequisite contract.

# Milestone overview

| Milestone | Name | Status | Primary result |
|---|---|---|---|
| 0 | Existing passive-world baseline | Complete | Schema 014 economy, civilization frontier, fleet response, ecology, geology, extraction, and mapping |
| 1 | Observation foundation | Complete | Schema 015 vocabulary, deterministic population seeds, events, query-only registry, and desktop evidence |
| 2 | NPC population and settlement lifecycle | Active | Schema 016 accounting and schema 027 demographic lifecycle complete; physical migration and settlement projects remain |
| 3 | Faction influence and territorial pressure | Planned | Node and route influence, contested control, and political consequences |
| 4 | Creature population and territory simulation | Planned | Species cohorts, capacity, reproduction, mortality, nests, migration, and competition |
| 5 | NPC–creature–environment interaction | Planned | Hunting, displacement, habitat pressure, predation, and mission feedback |
| 6 | Desktop Observation Center | Planned | Unified live map, layers, inspectors, event stream, and delta refresh |
| 7 | Historical snapshots, timeline, and replay | Planned | Non-mutating playback, comparison, retention, and rollups |
| 8 | Explainability, intelligence views, and watchlists | Planned | Causal summaries, confidence, alerts, and tracked entities |
| 9 | Long-running desktop operation | Planned | Tray operation, restart recovery, bounded catch-up, health, and backups |
| 10 | Observation export and browser snapshot viewer | Deferred | Versioned desktop export and read-only browser playback |
| 11 | Optional local browser bridge | Deferred | Loopback-only paired read service |
| 12 | Installer and release hardening | Planned | Installed launchers, migration safety, diagnostics, and release verification |

---

# Milestone 0 — Existing passive-world baseline

**Status: Complete**

The baseline includes deterministic canonical time, one logical writer, automatic Passive Mode, station economy and consumption, civilization-frontier pressure, NPC missions and voyages, logistics, fleet response, ecology, geology, finite resources, extraction, renewable recovery, and donor-backed or fallback graphical mapping.

---

# Milestone 1 — Observation foundation

**Status: Complete**

## Slice 1.1 — Observation vocabulary and invariants

**Complete**

Implemented stable categories, entities, causes, population terms, flow and territory states, visibility and confidence, deterministic identities, population invariants, snapshot safeguards, and canonical event encoding.

```text
toolbox.cmd verify
```

## Slice 1.2 — Schema 015 observation tables

**Complete**

Added NPC and creature populations, creature territories, faction presence, population flows, observation events, snapshots, metrics, watch rules, deterministic seeds, and read-optimized views without changing schema-014 source aggregates.

```text
toolbox.cmd verify
```

## Slice 1.3 — ObservationRegistry

**Complete**

Added query-only current state, changed-since-tick, selected-entity history, and unsupported-schema rejection.

```text
toolbox.cmd verify
```

## Slice 1.4 — Initial desktop observation surface

**Complete**

Added the read-only Observation Foundation window for populations, territories, influence, flows, events, snapshots, and metrics.

```text
toolbox.cmd observation
```

Focused documentation:

```text
docs/observation-contract.md
```

---

# Milestone 2 — NPC population and settlement lifecycle

**Status: Active**

## Goal

Replace unexplained population-index changes with conserved, causal demographic state while retaining the established civilization frontier as a compatible pressure model.

## Slice 2.1 — Population accounting and reconciliation

**Status: Complete**

Schema 016 adds:

- `npc_population_reconciliation`
- `npc_population_ledger`
- `npc_population_accounting_observation`
- `npc_population_reconciliation_seed`
- `npc_population_tick_accounting`

Every station population receives one ledger row for each advanced civilization tick. The ledger stores before and after totals, births, deaths, immigration, emigration, disaster losses, other gains and losses, capacity and morale inputs, frontier index before and after, cause, evidence, and summary.

The database enforces:

```text
after = before + births + immigration + other gains
               - deaths - emigration - disaster losses - other losses
```

Schema 016 initially recorded frontier-index differences as explicit reconciliation gains or losses. Abandonment was separately identified. Stable ticks produced zero-delta ledger rows without false change events. Detailed cohorts remained nonnegative and exactly matched the ledger after-total. Each tick created total-population and frontier-index metrics; material changes created causal population events with per-tick canonical time during multi-tick catch-up.

The Observation Registry and desktop window expose the complete ledger with changed-since-tick filtering.

```text
toolbox.cmd verify
toolbox.cmd observation
```

Focused documentation:

```text
docs/npc-population-accounting.md
```

### Slice 2.1 acceptance

Satisfied:

- One conserved ledger row per population and tick.
- Cohort totals exactly equal ledger after-total.
- Growth, stable, contraction, and abandonment cases are covered.
- Invalid accounting is rejected.
- Events and metrics share the passive transaction.
- Observation Registry and desktop UI expose the evidence.
- At Slice 2.1 completion, fresh and legacy migration advanced through schema 016.

## Slice 2.2 — Capacity, growth, mortality, and morale

**Status: Complete**

Schema 027 replaces the generic schema-016 population-index reconciliation and the separate schema-022 passive headcount planner with one authoritative demographic lifecycle derived from the detailed NPC cohorts. It adds:

- `npc_demographic_state`
- `npc_demographic_tick_baseline`
- `npc_demographic_tick_result`
- `npc_demographic_tick_plan`
- `npc_demographic_capture_before_tick`
- `npc_demographic_finalize_tick`

The planner uses housing, life-support, and employment capacity; station supplies; medical coverage; integrity; security; threat; fauna pressure; morale; shortage history; and measured attack damage. It commits exactly one immutable result and one conserved ledger row for each evaluated population tick.

Implemented behavior:

- Births require six sustained support ticks, a six-tick birth cooldown, support of at least 70, pressure below 35, and population below 95 percent of effective capacity.
- Births are bounded by available capacity and by slow proportional growth.
- Stable natural mortality remains deterministic and infrequent.
- Over-capacity conditions suppress births immediately, enter an explicit overcrowding state, and create excess mortality only after three overcrowded ticks.
- Sustained shortage, failed life support, low medical coverage, damage, and threat create explicit support-failure mortality.
- Measured fauna attack damage creates explicit disaster casualties rather than a second attack-population writer.
- Morale changes by bounded increments and influences later support or departure pressure.
- Hysteresis counters decay rather than resetting abruptly, preventing rapid oscillation.
- Detailed cohorts are the demographic source of truth. `station_population_state` resident and workforce counts are projections of the same committed result, preserving command-level mutation coverage without a competing simulator.
- The civilization population index is projected from committed detailed population after demographics settle; it no longer independently creates people or removes them.
- Direct out-of-band status or frontier changes do not mutate population through a separate trigger. Their demographic consequence is committed on the next authoritative passive tick.
- Observation events, station population stories, typed changes, and six demographic metrics are derived from the immutable tick result.

The existing Observation Foundation ledger tab exposes births, deaths, disaster losses, capacities, morale, cause, evidence, and summary without introducing a second desktop data path.

```text
toolbox.cmd verify
toolbox.cmd observation
```

### Slice 2.2 acceptance

Satisfied:

- Repeated identical inputs produce identical committed demographic signatures.
- Sustained supported conditions produce bounded births only after hysteresis and cooldown requirements.
- Overcrowding suppresses births before delayed mortality.
- Natural, support-failure, overcrowding, attack, and abandonment losses carry committed evidence.
- One conserved ledger row and one immutable demographic result are written per population and tick.
- Detailed cohorts, station residents, station workforce, and the frontier population index remain projections of one result.
- Multi-tick catch-up preserves ordered per-tick evaluation through the existing single transaction writer.
- Rollback removes the demographic result, ledger, cohorts, station projection, events, changes, and metrics together.
- Fresh, legacy, and pre-renumber local worlds migrate through schema 027.

## Slice 2.3 — Population migration and evacuation

**Status: Active — next implementation slice**

Add durable flows with origin, destination, quantity, cause, transport requirement, preparation, transit, arrival, return, failure, cancellation, and explicit casualties. Initial flows cover ordinary migration, worker transfer, refugee evacuation, and emergency relocation.

## Slice 2.4 — Founding, expansion, abandonment, and reclamation projects

**Status: Planned**

Settlement transitions require committed projects consuming transport, materials, supplies, time, population, and security support. Direct settlement teleportation is not permitted.

## Slice 2.5 — NPC lifecycle desktop evidence

**Status: Planned**

Extend the observation UI with capacity pressure, demographic breakdowns, migration progress, settlement projects, causal explanations, and reconciliation health.

## Milestone 2 completion gate

NPC totals change conservatively and deterministically; migration physically moves people; settlement transitions require projects; UI and evidence explain every gain, loss, departure, arrival, abandonment, and reclamation.

---

# Milestone 3 — Faction influence and territorial pressure

**Status: Planned**

Planned slices:

1. Influence from residents, security, trade, patrols, missions, resources, and allied adjacency.
2. Route-edge influence and traffic control.
3. Dominant, minority, neutral, contested, covert, and withdrawn transitions.
4. Political drift, secession, annexation, neutralization, and ownership consequences.
5. Faction overlays, inspectors, and evidence.

Territory is represented through nodes and routes rather than invented polygons.

---

# Milestone 4 — Creature population and territory simulation

**Status: Planned**

Planned slices:

1. Species-aware aggregated cohorts with guild rollups.
2. Carrying capacity and habitat support.
3. Births, mortality, starvation, and predation.
4. Nests, spawning grounds, and territory pressure.
5. Migration, dispersal, displacement, competition, and collapse.
6. Exceptional individual apex entities only when world significance requires them.
7. Creature overlays and evidence.

```text
next population = current + births + immigration
                - deaths - emigration - hunting losses
```

---

# Milestone 5 — NPC–creature–environment interaction

**Status: Planned**

Planned work includes predator pressure on stations and routes, explicit hunting losses, prey rebound, habitat changes from traffic and extraction, abandoned-site colonization, scavenger consequences, quarantine, infestation, restoration, and bidirectional mission feedback.

---

# Milestone 6 — Desktop Observation Center

**Status: Planned**

Planned slices:

1. Unify graphical map and observation evidence under one controller.
2. Add layers for population, demographic change, faction influence, migration, creature biomass, nests, habitat, resources, traffic, and danger.
3. Add station, species, faction, vessel, route, and resource inspectors.
4. Subscribe to passive-cycle completion and query changed rows.
5. Throttle rendering independently from accelerated simulation.
6. Preserve detailed evidence tables as an advanced view.

The Observation Foundation window remains available until the unified center fully replaces it.

---

# Milestone 7 — Historical snapshots, timeline, and replay

**Status: Planned**

Add periodic snapshots, compact deltas, retention and rollups, pause/step/jump/scrub/compare controls, non-mutating reconstruction, event navigation, and replay verification. Replay never writes current state.

---

# Milestone 8 — Explainability, intelligence views, and watchlists

**Status: Planned**

Add bounded causal summaries, omniscient and in-world intelligence views, confidence and delayed reports, watchlists, and durable observational alerts. Alerts do not automatically intervene.

---

# Milestone 9 — Long-running desktop operation

**Status: Planned**

Add simulation profiles, tray operation, restart policy, bounded catch-up, health reporting, and verified backup retention. A full operating-system service remains deferred until tray operation is proven.

---

# Milestone 10 — Observation export and browser snapshot viewer

**Status: Deferred until Milestones 6 and 7 are stable**

Define `barotrauma-world-observation-v1`, export committed snapshots or ranges, exclude local/private data, and add a read-only IndexedDB browser viewer. Imported desktop worlds cannot be mutated without cloning to a new sandbox identity.

---

# Milestone 11 — Optional local browser bridge

**Status: Deferred**

Provide a loopback-only, paired, expiring, read-only status/snapshot/event/metric service. No SQL, filesystem, donor asset, or mutation endpoint is allowed.

---

# Milestone 12 — Installer and release hardening

**Status: Planned**

Add installed launchers, backup-before-migration, unsupported-newer-schema handling, packaged smoke verification, user documentation, and stable release automation.

# Cross-cutting verification requirements

Every simulation milestone must test:

- Deterministic results from identical seed and inputs.
- Nonnegative populations, biomass, inventory, and capacities.
- Exact population conservation or explicit casualty accounting.
- No duplicated migration, extraction, material commitment, or settlement.
- Query-only observation access.
- Transaction rollback.
- Fresh and legacy migration.
- Bounded catch-up.
- Default 960-location performance.
- Explicit fault state rather than partial silent success.

# Active execution order

1. **Milestone 2.3** — physical migration and evacuation flows.
2. **Milestone 2.4** — founding, abandonment, and reclamation projects.
3. **Milestone 2.5** — complete lifecycle evidence in the desktop observation UI.
4. Begin Milestone 3 only after NPC population movement and settlement transitions are conserved.

# Development Record

## 2026-07-19 — Development Plan established

- Established the desktop-first roadmap.
- Fixed SQLite as the authoritative source.
- Deferred browser authority.

## 2026-07-19 — Milestone 1 completed

- Added observation contracts and invariants.
- Advanced through schema 015.
- Added deterministic NPC and creature observation seeds.
- Added the query-only Observation Registry and desktop evidence window.

## 2026-07-19 — Milestone 2.1 completed

- Advanced the desktop database through schema 016.
- Added a conserved NPC population ledger and reconciliation state.
- Integrated ledger creation into the existing passive frontier transaction.
- Added growth, stable, contraction, and abandonment accounting.
- Added per-tick events and metrics, including correct catch-up chronology.
- Exposed the ledger through the query-only registry and desktop observation window.
- Added focused schema, registry, migration, UI, and documentation coverage.

## 2026-07-20 — Milestone 2.2 completed

- Advanced the desktop database through schema 027.
- Replaced generic frontier-index reconciliation and the separate station headcount planner with one detailed-cohort demographic authority.
- Added deterministic capacity support, pressure, morale, birth cooldown, shortage hysteresis, and overcrowding state.
- Added bounded births, stable natural mortality, delayed overcrowding mortality, support-failure mortality, measured attack casualties, and explicit abandonment losses.
- Projected station resident/workforce state, station causality, observation events, and metrics from the same immutable tick result.
- Added fresh, legacy, pre-renumber, deterministic replay, conservation, rollback, and desktop evidence coverage.

## Next

Implement Milestone 2.3: durable physical migration and evacuation flows that move conserved people between station populations through explicit transport.
