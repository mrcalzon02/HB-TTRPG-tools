# Barotrauma World Simulation Toolbox

Independent Java 17 Swing migration of the Barotrauma RPG Operations Suite.

## Current status

The desktop project now includes:

- The Java 17 Swing shell with stable workspace navigation and a process-wide selected-world session.
- Inspection-first version-22, `.save`, and `.sub` compatibility.
- Duplicate-safe source, submarine-definition, physical-vessel, and snapshot identities.
- Atomic vessel imports, campaign mapping, snapshot chronology, rollback, and read-only registries.
- Sequential SQLite migrations through **schema 007** for fresh and existing desktop worlds.
- A deterministic canonical-time clock, one logical writer, immutable command receipts, reviewed checkpoints, stale-state rejection, and restart recovery.
- A live Europa World Map with explicitly controlled **Passive Mode**.
- Transactional station, NPC vessel, route, mission, research, encounter, item-production, freight, market, and treasury workloads.
- Explicit imported-player-vessel enrollment, route planning, shared transit challenges, docking, freight loading, and delivery.
- Automatic timed cycles while Passive Mode is enabled.

No website behavior has been removed or redirected. The web suite remains the behavioral reference while desktop parity is developed.

A normalized version-22 world imports with simulation disabled and paused. Passive Mode begins only after the operator explicitly enables it from the World Map. Once enabled, one process-wide scheduler owns that world. Every cycle advances the deterministic clock and commits all passive workload changes together; a failed cycle rolls back and faults closed.

## Requirements

- JDK 17
- A locally installed Gradle capable of building a Java 17 project

A Gradle wrapper will be added with release automation. Until then, run commands from `desktop/barotrauma-world-sim`.

## Run the desktop shell

```text
gradle run
```

Opening a desktop world in one participating window updates the shared selection across the application process.

## Live World Map and Passive Mode

```text
gradle runWorldRegistry
```

The World Map provides:

- **World Summary** — canonical time, current tick, cadence, and last passive cycle.
- **Locations** and **Normalized Stations** — imported Europa map evidence.
- **Station Economy** — credits, supplies, ore, industry, security, integrity, threat, research, and station condition.
- **NPC Voyages** — clickable NPC vessel records and a pinned, continuously refreshing voyage log.
- **Missions and Routes** — origin, target, assigned vessel, route progress, difficulty, reward, and completion state.
- **Research** — station projects, progress, siege effects, and completion.
- **Encounters** — transit hazards, challenge, roll, effective result margin, outcome, and narrative.

Passive Mode controls allow a real-time cadence from one second to one hour and one to 1,000 canonical ticks per cycle. Closing the World Map does not stop an enabled process-wide scheduler. Reopening the World Map resumes a configuration previously left enabled.

Only one passive scheduler is created for a world in the application process. The manual clock monitor becomes read-only while that scheduler owns the writer.

## Station logistics, markets, and freight

```text
gradle runStationLogistics
```

Schema 006 introduced item-level logistics and schema 007 hardened freight behavior. The logistics console exposes:

- Item catalogue definitions and base values.
- Production recipes with declared inputs, outputs, cycle timing, and credit costs.
- Per-station inventory, reservations, and reorder points.
- Vendor buy and sell prices that react to local threat.
- Production runs and their station treasury costs.
- READY, IN_TRANSIT, DELIVERED, LOST, and cancelled freight lots.
- Station treasury entries for production and freight movement.

The initial catalogue contains Europan ore, fabricated steel, reactor fuel rods, medical supplies, rations, coilgun ammunition, research samples, and luxury goods. Initial recipes smelt steel, assemble fuel rods, prepare medical supplies, and fabricate ammunition.

Each passive cycle:

1. Produces raw ore and rations according to station capacity.
2. Chooses at most one affordable recipe per station and tick so input inventory cannot be spent twice.
3. Consumes recipe inputs and adds outputs.
4. Deducts production costs from station credits and writes treasury evidence.
5. Reprices vendor offers according to local threat and station condition.
6. Creates READY freight opportunities where one station has a shortage and another has surplus stock.

Completed NPC trade, mining, and salvage work can create freight lots. NPC return docking delivers those lots without depending on recursive SQLite triggers, updates inventory and station credits, and writes treasury history.

## Imported player-vessel transit and freight

```text
gradle runPlayerTransit
```

An imported physical vessel can be enrolled at a normalized world location without changing its definition, physical identity, or snapshot chronology.

The player transit console supports:

- Selecting an active imported vessel.
- Enrolling it at a start location.
- Planning a destination and mission context.
- Resolving one transit challenge at a time.
- Accumulating route delay from costly setbacks.
- Recording hull, supply, route, encounter, and narrative evidence.
- Docking after arrival.
- Loading READY freight only while docked at its source station.
- Carrying freight through the same route system.
- Delivering freight only after docking at its declared destination.

Freight loading and delivery update station inventory, vessel cargo, station credits, treasury entries, freight state, player voyage logs, and audit history in one transaction.

## Shared transit and encounter resolution

Player and NPC voyages call the same dependency-free deterministic resolver. Given the same world, vessel, route, sequence, mission, and capability inputs, the result is identical.

Current hazards include:

- Thermal vent fields.
- Ice shear.
- Ballast-control failure.
- Reactor instability.
- Hostile fauna.
- Abyssal predators.
- Current reversal.
- Navigation and instrument blackouts.

Hazard selection is deterministic but varied across route sequences. Resolution records challenge, roll, effective capability, margin, outcome, hull and supply consequences, delay, and narrative.

## Passive world behavior

Stations remain `RISING`, `STABLE`, `STRAINED`, `BESIEGED`, or `FALLEN` according to credits, supplies, industry, security, integrity, and threat.

NPC roles include Trader, Miner, Hunter, Patrol, Research, Salvage, and Courier. Their mission set includes Trade, Mining, Fauna Clearing, Station Defense, Research, Salvage, and Transit.

Each NPC retains its location, destination, route progress, hull, supplies, cargo, crew quality, navigation, engineering, combat, mining, and research capability. It moves through preparation, outbound transit, work, return, docking, disablement, and loss states while accumulating a persistent voyage history.

## Manual durable clock monitor

```text
gradle runSimulationMonitor
```

When Passive Mode is off, the manual monitor permits enable, disable, explicit stepping, bounded catch-up, and explicit checkpoints.

When Passive Mode is active, the monitor loads the durable clock read-only and directs workload control back to the World Map. This prevents two control surfaces from intentionally producing competing command sequences.

## Import and registry workflows

Version-22 normalized master-world import:

```text
gradle runWebWorldImport
```

One-vessel inspection and approval:

```text
gradle runImportApproval
```

Multi-submarine campaign archive mapping:

```text
gradle runCampaignMapping
```

Definition, physical-vessel, and snapshot registry:

```text
gradle runVesselRegistry
```

Existing-vessel snapshot chronology approval:

```text
gradle runSnapshotApproval
```

## Persistence boundaries

- **Schema 001** — source, definition, vessel, snapshot, warning, and audit identity.
- **Schema 002** — normalized master-world, locations, stations, component versions, state families, and imported scheduler metadata.
- **Schema 003** — durable clock receipts, checkpoints, current tick state, sequence continuation, and recovery pointers.
- **Schema 004** — passive configuration, station state, missions, NPC vessels, voyage logs, encounters, and research.
- **Schema 005** — research uniqueness and return-voyage docking safeguards.
- **Schema 006** — item catalogue, recipes, inventory, vendors, production, freight, treasury, player-vessel state, player logs, and player encounters.
- **Schema 007** — non-recursive NPC freight delivery and passive READY freight generation from station shortages.

A passive cycle is one SQLite transaction containing its clock receipt, checkpoint, station changes, mission changes, NPC movement, transit encounters, voyage logs, research progress, inventory production, market updates, freight generation, treasury evidence, and audit summary. Any invalid or stale before-state rejects the complete cycle.

Player route and freight actions use the same exclusive world lock but do not advance the passive clock. Each explicit action commits or rolls back independently against the current durable world state.

## Build and verification

Build the application:

```text
gradle build
```

Run the complete verification chain:

```text
gradle verifyWorldStore
```

The suite covers:

- Fresh and legacy migration through schema 007.
- Official vessel imports, rollback, campaign mapping, and snapshot chronology.
- Version-22 normalization and master-world replacement rejection.
- Deterministic clock replay, command ordering, checkpoint persistence, and restart recovery.
- Shared player/NPC transit replay and hazard diversity.
- Station economy initialization and updates.
- Mission creation and role-aware NPC assignment.
- NPC departure, route advancement, hazards, encounters, voyage logs, return, and docking.
- Research persistence and station-defense effects.
- Item catalogue, station inventory, vendor offers, production runs, and treasury entries.
- Passive shortage detection and READY freight generation.
- Player freight loading at source, route traversal, docking, delivery, inventory transfer, and treasury effects.
- A real timed Passive Mode cycle.
- Persistent disablement and fault-contained scheduler recovery.

The workflow `.github/workflows/barotrauma-desktop.yml` compiles with Java 17 and runs this chain for desktop-project changes.

## Entry points

```text
io.github.mrcalzon02.barotrauma.desktop.BarotraumaWorldSimApplication
io.github.mrcalzon02.barotrauma.desktop.registry.WorldMapRegistryWindow
io.github.mrcalzon02.barotrauma.desktop.logistics.StationLogisticsWindow
io.github.mrcalzon02.barotrauma.desktop.logistics.PlayerVesselTransitWindow
io.github.mrcalzon02.barotrauma.desktop.simulation.SimulationMonitorWindow
io.github.mrcalzon02.barotrauma.desktop.imports.WebWorldImportApprovalWindow
io.github.mrcalzon02.barotrauma.desktop.imports.WorldImportApprovalWindow
io.github.mrcalzon02.barotrauma.desktop.imports.CampaignVesselMappingWindow
io.github.mrcalzon02.barotrauma.desktop.registry.WorldVesselRegistryWindow
io.github.mrcalzon02.barotrauma.desktop.registry.VesselSnapshotApprovalWindow
```

## Current implementation order

Completed:

1. Desktop shell, architecture baseline, stable identities, and safe import inspection.
2. Official vessel transactions, campaign mapping, snapshot chronology, and registries.
3. Normalized version-22 master-world import and world registry.
4. Deterministic clock, single-writer commands, receipts, checkpoints, and recovery.
5. Automatic Passive Mode scheduling.
6. Station rise/fall state, missions, NPC vessels, routes, research, encounters, and voyage logs.
7. Item-level station catalogue, inventory, vendor, production, freight, and treasury state.
8. Imported player-vessel enrollment, route planning, shared transit challenges, docking, freight loading, and delivery.

Next:

1. Add rescue, towing, repair, refuel, rearm, and reinforcement operations for disabled player and NPC vessels.
2. Add player mission acceptance, reward settlement, and faction consequences.
3. Add equipment-level cargo manifests and capacity derived from imported submarine data.
4. Port the remaining faction, campaign journal, reference-library, and workshop authoring tools.
5. Add persistent recent-world reopening, backups, packaging, and release automation.

## Governing documents

- `../../docs/barotrauma-desktop-baseline.md`
- `../../docs/barotrauma-desktop-architecture.md`

The baseline fixes compatibility and simulation requirements. The architecture document fixes dependency direction, identity boundaries, importer isolation, concurrency rules, and implementation order.

## Local files

World databases, logs, imported-source evidence, attachments, backups, and exports belong under local runtime directories and are ignored by Git. Sanitized fixtures must remain separate and must not contain private player information.
