# Barotrauma World Simulation Toolbox

Independent Java 17 Swing migration of the Barotrauma RPG Operations Suite.

## Current status

The desktop project now includes:

- A Java 17 Swing shell with stable workspace navigation and a process-wide selected-world session.
- Inspection-first version-22, `.save`, and `.sub` compatibility.
- Duplicate-safe source, submarine-definition, physical-vessel, and snapshot identities.
- Atomic vessel imports, campaign mapping, snapshot chronology, rollback, and read-only registries.
- Sequential SQLite migrations through **schema 015** for fresh and existing desktop worlds.
- A deterministic canonical-time clock, one logical writer, immutable command receipts, checkpoints, stale-state rejection, and restart recovery.
- A live Europa World Map with explicitly controlled **Passive Mode**.
- Transactional station, NPC vessel, route, mission, research, encounter, production, freight, market, treasury, consumption, civilization-frontier, fleet-response-transit, ecology, geology, natural-resource, extraction, depletion, and renewable-recovery workloads.
- Persistent schema-015 NPC populations, creature guild populations and territories, faction presence, population-flow records, observation events, snapshots, metrics, and watch-rule storage.
- A strictly query-only `ObservationRegistry` and read-only desktop Observation Foundation window.
- Automatic timed cycles while Passive Mode is enabled.
- Local donor-installation discovery for Barotrauma graphical assets, with packaged and procedural fallbacks.
- A milestone-backed **Development Plan** for NPC settlement lifecycle, faction influence, creature populations, observation history, and long-running installed operation.

No website behavior has been removed or redirected. The web suite remains a compatibility reference while the desktop becomes the authoritative simulation and observation client.

A normalized version-22 world imports with simulation disabled and paused. Passive Mode begins only after the operator explicitly enables it. Once enabled, one process-wide scheduler owns that world. Every cycle advances the deterministic clock and commits all passive workloads together; a failed cycle rolls back and faults closed.

## Development Plan

The governing roadmap is:

```text
DEVELOPMENT_PLAN.md
```

Milestone 1, the Observation Foundation, is complete. The active milestone is **Milestone 2 — NPC Population and Settlement Lifecycle**. Its next slice adds transactional population accounting and reconciliation with the existing civilization frontier before migration, colony founding, abandonment, or reclamation behavior is allowed.

Every milestone requires persistence, deterministic behavior, desktop visibility, failure handling, migration coverage, verification, and documentation before it is marked complete.

## Requirements

- JDK 17
- A locally installed Gradle capable of building a Java 17 project
- Optional: a locally installed copy of Barotrauma for donor graphical assets

A Gradle wrapper will be added with release automation. Until then, run commands from `desktop/barotrauma-world-sim`.

## Core launch commands

```text
gradle run
gradle runWorldRegistry
gradle runGraphicalWorldMap
gradle runObservationFoundation
gradle runCivilizationFrontier
gradle runNaturalWorld
gradle runStationLogistics
gradle runPlayerTransit
gradle runSimulationMonitor
```

Opening a desktop world in one participating window updates the shared selection across the application process.

## Observation Foundation

```text
gradle runObservationFoundation
```

The initial read-only observation window exposes:

- World identity, canonical time, and aggregate observation counts.
- NPC population cohorts and total population by station.
- Housing, life-support, employment, and morale seed values.
- Creature herbivore, predator, scavenger, and bioaccumulator guild populations.
- Creature territory status, pressure, nesting strength, and observation confidence.
- Faction presence and influence by location.
- Population-flow records.
- Causal observation events.
- Root and later observation snapshots.
- Metric series.
- Changed-after-tick filtering.

This window is an evidence console. Schema 015 seeds detailed observation state from schema-014 civilization and ecology aggregates but does not yet independently advance population totals. Milestone 2 adds the first conserved population behavior.

The registry uses `PRAGMA query_only=ON`, rejects unsupported schemas, supports changed-since-tick queries, and can retrieve selected-entity event history.

See:

```text
docs/observation-contract.md
```

## Live World Map and Passive Mode

```text
gradle runWorldRegistry
gradle runGraphicalWorldMap
```

The registry provides canonical time, locations, stations, NPC voyages, missions, routes, research, encounters, and Passive Mode controls. The graphical map displays locations, active NPC routes, vessel conditions, and donor-backed or fallback map assets.

Passive Mode cadence ranges from one second to one hour and from one to 1,000 canonical ticks per cycle. Multi-tick catch-up processes every canonical tick in order. Only one passive scheduler exists for a world in the application process. The manual clock monitor becomes read-only while that scheduler owns the writer.

## Station consumption and civilization frontier

```text
gradle runCivilizationFrontier
```

Every active station consumes supplies on every passive tick. Rations cover demand first; uncovered demand accelerates abstract supply loss. Shortages slowly affect integrity, security, industry, population capacity, civilization strength, and frontier position. Deliveries arrest decline and allow recovery.

Frontier states are:

- `EXPANDING`
- `HOLDING`
- `CONTESTED`
- `CONTRACTING`
- `ABANDONED`

Fauna pressure grows around threatened or undersupplied stations. Monster attacks can damage the station and force the civilian perimeter inward. Schema 015 now records a detailed seed population corresponding to this aggregate state; Milestone 2 will reconcile future detailed population changes with the frontier model.

## Fleet response transit, rescue, and towing

Disabled NPC vessels create `RESCUE` or `TOWING` operations. Besieged stations create `REINFORCEMENT` operations. `REPAIR`, `REFUEL`, and `REARM` are also represented.

Response phases are:

- `WAITING`
- `OUTBOUND`
- `ON_SCENE`
- `RETURNING`
- `COMPLETE`

Responders physically travel through the shared transit engine, can encounter hazards, require real station materials on scene, and must survive the return or towing leg before a casualty is restored. Retry attempts preserve committed materials and evidence.

## Natural world, extraction, ecology, and geology

```text
gradle runNaturalWorld
```

Every location has persistent ecology:

- Primary producers and algae.
- Herbivore biomass.
- Predator biomass and migration pressure.
- Scavengers and bioaccumulators.
- Nutrient load and habitat integrity.

Every location also has persistent geology:

- Tectonic stress.
- Hydrothermal activity.
- Mineral exposure.
- Cave instability.
- Sediment flux.

Natural activity creates mining, research, salvage, and fauna-clearing work. Schema 013 gives resource sites finite reserves, extraction evidence, permanent mineral depletion, and renewable biological dormancy and recovery. Schema 015 translates ecological aggregates into initial observable creature guild populations and territory state without replacing the ecology model.

See `NATURAL_WORLD.md` for the detailed subsystem boundary.

## Station logistics, markets, and freight

```text
gradle runStationLogistics
```

The logistics console exposes item definitions, recipes, station inventory, vendor offers, production runs, freight lots, and treasury entries. Natural extraction creates typed freight. Player and NPC deliveries affect inventory, treasury evidence, station health, civilization support, and fleet-recovery materials.

## Imported player-vessel transit and freight

```text
gradle runPlayerTransit
```

Imported physical vessels retain definition, identity, and snapshot chronology. The player transit console supports enrollment, source loading, route planning, deterministic transit challenges, docking, freight loading, and delivery.

Player and NPC voyages use the same transit resolver. Hazards include thermal vents, ice shear, ballast failure, reactor instability, hostile fauna, abyssal predators, current reversals, and navigation blackouts.

## Graphical asset setup

```text
gradle runAssetSetup
```

The setup window searches Windows, Linux, Flatpak Steam, and macOS locations and reads Steam `libraryfolders.vdf` files. Modes are:

- **Automatic** — use the first validated donor installation.
- **Manual** — retain an explicitly selected Barotrauma installation or `Content` directory.
- **Fallback only** — never read donor files.

Only the local path and mode are stored in:

```text
~/.barotrauma-world-sim/assets.properties
```

Official assets are referenced from the user's installation at runtime and are never copied into the repository or releases. Missing roles use independent packaged or procedural fallbacks.

See `docs/donor-assets.md`.

## Import and registry workflows

```text
gradle runWebWorldImport
gradle runImportApproval
gradle runCampaignMapping
gradle runVesselRegistry
gradle runSnapshotApproval
```

These cover normalized master-world import, one-vessel approval, campaign mapping, vessel and snapshot inspection, and chronology attachment.

## Persistence boundaries

- **Schema 001** — source, definition, vessel, snapshot, warning, and audit identity.
- **Schema 002** — normalized master world, locations, stations, component versions, state families, and imported scheduler metadata.
- **Schema 003** — durable clock receipts, checkpoints, current tick state, sequence continuation, and recovery pointers.
- **Schema 004** — passive configuration, station state, missions, NPC vessels, voyage logs, encounters, and research.
- **Schema 005** — research uniqueness and return-voyage docking safeguards.
- **Schema 006** — item catalogue, recipes, inventory, vendors, production, freight, treasury, player-vessel state, logs, and encounters.
- **Schema 007** — non-recursive NPC freight delivery and shortage-driven freight generation.
- **Schema 008** — variable station consumption, shortage history, civilization and fauna state, frontier movement, attacks, and delivery support.
- **Schema 009** — UUID-safe contraction missions, recovery evidence, and outward expansion missions.
- **Schema 010** — fleet response, ecology, geology, natural events, and exposed resource sites.
- **Schema 011** — immediate response assignment, reassignment, and material-gated recovery.
- **Schema 012** — responder mission protection and natural-resource or predator-driven NPC missions.
- **Schema 013** — finite reserves, extraction batches, typed freight settlement, depletion, and renewable recovery.
- **Schema 014** — response phases, outbound and return transit, linked encounters, one-time material commitment, retries, and final recovery.
- **Schema 015** — NPC and creature observation populations, creature territories, faction presence, population flows, causal events, snapshots, metrics, watch rules, deterministic seeds, and read-optimized views.

A passive cycle remains one SQLite transaction containing the clock receipt, checkpoint, station economy, consumption, frontier changes, response transit, ecology, geology, extraction, mission changes, NPC movement, encounters, research, production, markets, freight, treasury evidence, and audit summary. Milestone 2 will add detailed NPC population accounting to that same transaction.

## Build and verification

```text
gradle build
gradle verifyWorldStore
gradle verifyVisualAssets
gradle verifyObservationContract
gradle verifyObservationFoundation
gradle verifyObservationRegistry
```

The verification chain covers:

- Donor discovery, atlas cropping, packaged and procedural fallbacks.
- Observation vocabulary, deterministic IDs, population invariants, flow transitions, and event encoding.
- Fresh and legacy migration through schema 015.
- Deterministic, duplicate-safe population and territory seeds.
- Preservation of schema-014 civilization and ecology source state.
- Observation constraints, trigger seeding, foreign-key integrity, and root snapshots.
- Query-only summaries, changed-since-tick queries, entity history, and unsupported-schema rejection.
- Imports, snapshots, normalized worlds, clock replay, commands, checkpoints, and recovery.
- Station economy, consumption, civilization movement, missions, voyages, research, encounters, production, freight, and treasury.
- Fleet response assignment, outbound travel, material gating, return or towing travel, retries, and final restoration.
- Ecology, geology, resource exposure, extraction, typed delivery, depletion, and renewable recovery.

The workflow `.github/workflows/barotrauma-desktop.yml` is intended to compile with Java 17 and run the complete chain for desktop-project changes.

## Entry points

```text
io.github.mrcalzon02.barotrauma.desktop.BarotraumaWorldSimApplication
io.github.mrcalzon02.barotrauma.desktop.observation.ObservationFoundationWindow
io.github.mrcalzon02.barotrauma.desktop.assets.DonorAssetSetupWindow
io.github.mrcalzon02.barotrauma.desktop.registry.WorldMapRegistryWindow
io.github.mrcalzon02.barotrauma.desktop.registry.DonorBackedWorldMapWindow
io.github.mrcalzon02.barotrauma.desktop.frontier.CivilizationFrontierWindow
io.github.mrcalzon02.barotrauma.desktop.nature.NaturalWorldAndFleetWindow
io.github.mrcalzon02.barotrauma.desktop.logistics.StationLogisticsWindow
io.github.mrcalzon02.barotrauma.desktop.logistics.PlayerVesselTransitWindow
io.github.mrcalzon02.barotrauma.desktop.simulation.SimulationMonitorWindow
```

## Active implementation order

Completed foundation:

1. Desktop architecture, imports, identities, and registries.
2. Deterministic clock and automatic Passive Mode.
3. Station economy, logistics, player and NPC transit.
4. Civilization frontier, fleet response, natural world, and finite resources.
5. Donor and fallback graphical assets.
6. Observation contract, schema 015, query-only registry, and desktop evidence window.

Next:

1. Milestone 2.1 — transactional NPC population accounting and frontier reconciliation.
2. Milestone 2.2 — capacity-supported growth, mortality, and morale.
3. Milestone 2.3 — migration and evacuation flows.
4. Milestone 2.4 — founding, abandonment, and reclamation projects.
5. Milestone 2.5 — lifecycle evidence in the desktop observation window.

## Governing documents

- `DEVELOPMENT_PLAN.md`
- `../../docs/barotrauma-desktop-baseline.md`
- `../../docs/barotrauma-desktop-architecture.md`
- `NATURAL_WORLD.md`
- `docs/donor-assets.md`
- `docs/observation-contract.md`

## Local files

World databases, logs, imported-source evidence, attachments, backups, exports, and donor configuration belong under local runtime directories and are ignored by Git. Sanitized fixtures must remain separate and must not contain private player information or copied proprietary game assets.
