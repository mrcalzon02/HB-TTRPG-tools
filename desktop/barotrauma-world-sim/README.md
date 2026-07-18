# Barotrauma World Simulation Toolbox

Independent Java 17 Swing migration of the Barotrauma RPG Operations Suite.

## Current status

The desktop project now includes:

- The Java 17 Swing shell with stable workspace navigation and a process-wide selected-world session.
- Inspection-first version-22, `.save`, and `.sub` compatibility.
- Duplicate-safe source, submarine-definition, physical-vessel, and snapshot identities.
- Atomic vessel imports, campaign mapping, snapshot chronology, rollback, and read-only registries.
- Sequential SQLite migrations through **schema 005** for fresh and existing desktop worlds.
- A deterministic canonical-time clock, one logical writer, immutable command receipts, reviewed checkpoints, stale-state rejection, and restart recovery.
- A live Europa World Map with explicitly controlled **Passive Mode**.
- Transactional station economy, NPC vessel, route, mission, research, transit-hazard, encounter, and voyage-log workloads.
- Automatic timed cycles while Passive Mode is enabled.

No website behavior has been removed or redirected. The web suite remains the behavioral reference while desktop parity is developed.

A normalized version-22 world still imports with simulation disabled and paused. Passive Mode begins only after the operator explicitly enables it from the World Map. Once enabled, one process-wide scheduler owns that world. Every cycle advances the deterministic clock and commits all workload changes together; a failed cycle rolls back and faults closed.

## Requirements

- JDK 17
- A locally installed Gradle capable of building a Java 17 project

A Gradle wrapper will be added with release automation. Until then, run commands from `desktop/barotrauma-world-sim`.

## Run the desktop shell

```text
gradle run
```

The primary shell launches world import and inspection, the live World Map, vessel workflows, registries, and the manual durable clock monitor. Opening a desktop world in one participating window updates the shared selection across the process.

## Live World Map and Passive Mode

```text
gradle runWorldRegistry
```

The World Map is the passive simulation console. It provides:

- **World Summary** — canonical time, current tick, cadence, and last passive cycle.
- **Locations** and **Normalized Stations** — imported Europa map evidence.
- **Station Economy** — credits, supplies, ore, industry, security, integrity, threat, research, and station condition.
- **NPC Voyages** — clickable NPC vessel records and a pinned, continuously refreshing voyage log.
- **Missions and Routes** — origin, target, assigned vessel, route progress, difficulty, reward, and completion state.
- **Research** — station projects, progress, siege effects, and completion.
- **Encounters** — transit hazards, challenge, roll, effective result margin, outcome, and narrative.

Passive Mode controls let the operator select a real-time cadence from one second to one hour and one to 1,000 canonical ticks per cycle. Closing the World Map does not stop an enabled process-wide scheduler. Opening the World Map again resumes a configuration previously left enabled.

Only one passive scheduler is created for a world in the application process. The manual clock monitor becomes read-only while that scheduler owns the writer.

## Passive world behavior

### Stations and economy

Each imported station receives persistent simulation state. Production, consumption, ore availability, industry, security, integrity, threat, and completed missions determine whether it is:

- `RISING`
- `STABLE`
- `STRAINED`
- `BESIEGED`
- `FALLEN`

Threatened stations generate defense and fauna-clearing work. Supply shortages generate trade work. Ore shortages generate mining work. Successful NPC missions feed credits, supplies, ore, security, research, and threat reduction back into station state.

### NPC vessels and routes

Passive Mode creates persistent NPC submarines with role-specific capabilities:

- Trader
- Miner
- Hunter
- Patrol
- Research
- Salvage
- Courier

Each vessel retains its location, destination, route progress, hull, supplies, cargo, crew quality, navigation, engineering, combat, mining, and research capability. It moves through preparing, transit, mission work, return, docking, disablement, and loss states.

### Missions

The current deterministic mission set includes:

- Trade
- Mining
- Fauna clearing
- Station defense
- Research
- Salvage
- Transit

Mission creation, assignment, progress, completion, failure, rewards, and station effects are durable database records.

### Shared transit and encounter resolution

NPC voyages call the same dependency-free deterministic transit resolver intended for player transit. Given the same world, vessel, route, tick, mission, and capability inputs, player and NPC resolution is identical.

Current hazards include thermal vents, ice shear, ballast failure, reactor instability, hostile fauna, abyssal predators, current reversal, and navigation/instrument blackouts. Resolution records the challenge, roll, effective capability, margin, outcome, hull and supply consequences, delay, and narrative.

### Voyage logs

Every NPC vessel accumulates a persistent voyage history containing mission assignment, departure, hazards, damage, mission progress, completion, distress, and return evidence. Selecting a vessel in the World Map pins that vessel while the table and log refresh around it.

## Manual durable clock monitor

```text
gradle runSimulationMonitor
```

When Passive Mode is off, the manual monitor permits:

- Enable and disable.
- Explicit deterministic stepping.
- Bounded catch-up to an ISO-8601 canonical target.
- Explicit checkpoints.

When Passive Mode is active, the manual monitor loads the durable clock read-only and directs workload control back to the World Map. This prevents two user interfaces from producing competing command sequences.

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

Schema 001 established source, definition, vessel, snapshot, warning, and audit identity.

Schema 002 added normalized master-world, location, station, component-version, state-family, and imported scheduler metadata.

Schema 003 added durable clock command receipts, checkpoints, current tick state, sequence continuation, and recovery pointers.

Schema 004 added passive configuration, station state, missions, NPC vessels, voyage logs, encounters, and station research.

Schema 005 hardens research uniqueness and return-voyage docking/unloading for worlds created during schema-004 development.

A passive cycle is one SQLite transaction containing its clock receipt, checkpoint, station changes, mission changes, NPC movement, transit encounters, voyage logs, research progress, and audit summary. Any invalid or stale before-state rejects the entire cycle.

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

- Fresh and legacy migration through schema 005.
- Official vessel imports, rollback, campaign mapping, and snapshot chronology.
- Version-22 normalization and master-world replacement rejection.
- Deterministic clock replay, command ordering, checkpoint persistence, and restart recovery.
- Shared player/NPC transit resolution.
- Station economy initialization and updates.
- Mission creation and role-aware assignment.
- NPC departure, route advancement, hazards, encounters, and voyage logs.
- Research persistence and station-defense effects.
- A real timed Passive Mode cycle.
- Persistent disablement and fault-contained scheduler recovery.

The workflow `.github/workflows/barotrauma-desktop.yml` compiles with Java 17 and runs this chain for desktop-project changes.

## Entry points

```text
io.github.mrcalzon02.barotrauma.desktop.BarotraumaWorldSimApplication
io.github.mrcalzon02.barotrauma.desktop.imports.WebWorldImportApprovalWindow
io.github.mrcalzon02.barotrauma.desktop.registry.WorldMapRegistryWindow
io.github.mrcalzon02.barotrauma.desktop.simulation.SimulationMonitorWindow
io.github.mrcalzon02.barotrauma.desktop.imports.WorldImportApprovalWindow
io.github.mrcalzon02.barotrauma.desktop.imports.CampaignVesselMappingWindow
io.github.mrcalzon02.barotrauma.desktop.registry.WorldVesselRegistryWindow
io.github.mrcalzon02.barotrauma.desktop.registry.VesselSnapshotApprovalWindow
```

## Current implementation order

Completed foundations:

1. Desktop shell, architecture baseline, stable identities, and safe import inspection.
2. Official vessel transactions, campaign mapping, snapshot chronology, and registries.
3. Normalized version-22 master-world import and world registry.
4. Deterministic clock, single-writer commands, receipts, checkpoints, and recovery.
5. Schema-005 passive world persistence.
6. Automatic Passive Mode scheduling.
7. Station economy and station rise/fall state.
8. NPC vessel creation, assignment, navigation, return, disablement, and loss.
9. Routes and deterministic player/NPC transit resolution.
10. Trade, mining, fauna-clearing, defense, research, salvage, and transit missions.
11. Research projects, encounter records, and clickable NPC voyage logs.

Next phases:

1. Expand station markets into item-level production, consumption, vendor inventories, freight lots, and treasury transactions.
2. Add player-facing transit submission to the shared resolver and connect active imported player vessels to map routes.
3. Add rescue, repair, reinforcement, faction, and multi-vessel response behavior.
4. Port the remaining cargo catalogue, workshop/R&D, faction, journal, and reference-library tools.
5. Add persistent recent-world reopening, backups, packaging, and release automation.

## Governing documents

- `../../docs/barotrauma-desktop-baseline.md`
- `../../docs/barotrauma-desktop-architecture.md`

The baseline fixes compatibility and simulation requirements. The architecture document fixes dependency direction, identity boundaries, importer isolation, concurrency rules, and implementation order.

## Local files

World databases, logs, imported-source evidence, attachments, backups, and exports belong under local runtime directories and are ignored by Git. Sanitized fixtures must remain separate and must not contain private player information.
