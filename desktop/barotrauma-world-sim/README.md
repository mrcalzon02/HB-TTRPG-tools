# Barotrauma World Simulation Toolbox

Independent Java 17 Swing migration of the Barotrauma RPG Operations Suite.

## Current status

The desktop project now includes:

- The Java 17 Swing application shell and stable workspace navigation.
- A process-wide desktop-world session shared by the shell, import tools, registries, and simulation monitor.
- Duplicate-safe source, submarine-definition, physical-vessel, and snapshot identities.
- Strict inspection and normalization of version-22 browser-suite exports.
- Safe inspection of official Barotrauma `.save` campaign archives and standalone `.sub` files.
- Desktop-world directories, exclusive writer locks, atomic metadata writes, and sequential SQLite migrations through schema 003.
- In-place migration of schema-001 and schema-002 worlds while preserving existing records.
- Transactional inspection recording and exact-source duplicate prevention.
- Canonical submarine-definition reuse across renamed or repeated designs.
- Explicit one-vessel imports, snapshot chronology, and complete rollback.
- Atomic multi-submarine campaign mapping with mandatory row review.
- Explicit version-22 master-world acceptance into normalized location, station, component-version, state-family, and simulation-metadata tables.
- Read-only normalized world, vessel, and simulation-evidence registries.
- A deterministic canonical-time clock with immutable snapshots and replay verification.
- A single-writer command executor with restart-safe execution sequence numbers.
- Durable command receipts, reviewed checkpoints, stale-state rejection, and restart recovery.
- A manual Swing simulation monitor for enable, disable, step, bounded catch-up, and checkpoint commands.

No website behavior has been removed or redirected. The web suite remains the behavioral reference while desktop parity is developed.

Version-22 acceptance imports world identity and continuity metadata but does **not** automatically run simulation workloads. The imported scheduler begins `PAUSED` with `simulation_enabled = false`. Manual clock commands are available only through the durable single-writer session. Economy, NPC, route, research, mission, and event processors remain disabled.

## Requirements

- JDK 17
- A locally installed Gradle capable of building a Java 17 project

A Gradle wrapper will be added with release automation. Until then, run commands from `desktop/barotrauma-world-sim`.

## Run the desktop shell

```text
gradle run
```

The primary shell launches world inspection and approval, normalized world registry, vessel import, campaign mapping, vessel registry, snapshot approval, and the durable simulation monitor. Opening or creating a desktop world in one participating window updates the shared world selection across the application process.

## Run individual workflows

Version-22 normalized master-world import:

```text
gradle runWebWorldImport
```

Read-only normalized world registry:

```text
gradle runWorldRegistry
```

Manual durable simulation monitor:

```text
gradle runSimulationMonitor
```

One-vessel inspection and approval:

```text
gradle runImportApproval
```

Multi-submarine campaign archive mapping:

```text
gradle runCampaignMapping
```

Read-only definition, vessel, and snapshot registry:

```text
gradle runVesselRegistry
```

Existing-vessel snapshot chronology approval:

```text
gradle runSnapshotApproval
```

## Version-22 world boundary

A version-22 export is inspected and normalized before acceptance. The accepted transaction records:

- The master-world ID and suite version.
- Export and import timestamps.
- Canonical world time, real epoch, source simulation time, and imported tick sequence.
- Rings, shell radius, locations, levels, coordinates, biomes, factions, and station markers.
- Stations and whether station-economy evidence was present.
- Known component versions and top-level state families.
- Active-submarine summary, crew-record count, and economy summary counts.

Source location IDs are retained when present. A deterministic fallback ID is generated only when the source omits one. One desktop world may accept only one master-world import; replacement requires creating another desktop world rather than silently overwriting normalized state.

## Simulation boundary

Schema 003 adds:

- Immutable simulation command receipts.
- Monotonic per-world execution sequence numbers.
- Before and after clock snapshots for every command.
- Durable reviewed checkpoints.
- Current tick, tick-size, command, and checkpoint pointers.
- Stale-before-state rejection.
- Restart recovery from the last durable command sequence.

The deterministic clock has no timer, Swing dependency, or database access. A single-writer executor owns it. The persistent session submits one command, writes its receipt and optional checkpoint to SQLite, and only then begins another command. Any persistence failure permanently faults that session until it is closed and reopened from durable state.

The manual monitor currently permits:

- Enable and disable.
- Explicit deterministic stepping.
- Bounded catch-up to an ISO-8601 canonical target without overshooting partial ticks.
- Explicit checkpoints.

Automatic timed Run remains disabled until economy and NPC workload processors can commit transactionally with the clock.

## Official vessel boundaries

The one-vessel approval workflow accepts standalone `.sub` files and campaign saves containing one submarine payload. Campaign archives containing multiple submarine payloads are redirected to the campaign mapper.

The campaign mapper requires every row to be reviewed before commit. Each payload is assigned either to a new physical vessel or one explicitly selected structurally matching existing vessel. An existing vessel may be targeted only once per archive. Newer source states may become current; older, equal-time, and timestamp-unknown states require explicit historical retention. Any invalid row rolls back the entire campaign archive.

An exact source file cannot be imported twice. A structurally identical submarine with another filename reuses its existing definition but may still create a separate physical vessel.

## Build and verification

Build the application:

```text
gradle build
```

Run the complete persistence and deterministic simulation verification chain:

```text
gradle verifyWorldStore
```

The verification suite covers:

- Fresh database migration through schemas 001, 002, and 003.
- In-place schema-001 migration through schema 003 with record preservation.
- Inspection planning and duplicate prevention.
- Accepted vessel imports and rollback.
- Snapshot chronology and current-state promotion.
- Atomic campaign archive mapping.
- Strict version-22 world normalization.
- Atomic master-world import and replacement rejection.
- Read-only normalized world and vessel registry queries.
- Deterministic clock stepping, catch-up, replay, and checkpoint restore.
- Single-writer command ordering and display-listener isolation.
- Restart-safe execution sequence continuation.
- Durable command receipts and checkpoint transactions.
- Stale-state rejection and rollback.
- Fault-contained persistent-session recovery.
- Read-only simulation evidence reconstruction.

The repository workflow `.github/workflows/barotrauma-desktop.yml` compiles with Java 17 and runs the complete verification chain for desktop-project changes.

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

## Governing documents

- `../../docs/barotrauma-desktop-baseline.md`
- `../../docs/barotrauma-desktop-architecture.md`

The baseline fixes the compatibility and simulation requirements. The architecture document fixes dependency direction, identity boundaries, importer isolation, concurrency rules, and implementation order.

## Stable navigation contract

The desktop shell reserves workspaces for Overview, Active Submarine, World Map, Submarines, Crew, Stations and Economy, Routes and Jobs, Encounters, Cargo and Catalogue, Workshop and R&D, Factions, Reference Library, Import Center, Campaign Journal, Simulation Monitor, and Settings and Backups.

Placeholder panels are intentional during phased migration. Each will be replaced by an application-backed view without changing its navigation identity.

## Current implementation order

Completed foundations:

1. Desktop shell and architecture baseline.
2. Stable identities and duplicate decisions.
3. Version-22 and official-file inspection.
4. Filesystem storage, SQLite locking, and schemas 001–003.
5. Inspection ledger and import planning.
6. Accepted official-vessel transactions with rollback.
7. Shared desktop-world session and primary-shell integration.
8. Definition, vessel, and snapshot registries.
9. Snapshot chronology and current-state promotion rules.
10. Explicit atomic multi-submarine campaign mapping.
11. Normalized version-22 master-world import and read-only world registry.
12. Deterministic clock and single-writer command executor.
13. Durable command receipts, checkpoints, stale-state rejection, and recovery.
14. Manual durable simulation monitor.

Next phases:

1. Add transactional station-economy workload records and processors.
2. Add deterministic NPC-vessel workload records and processors.
3. Add automatic timed scheduling only after workload rollback is proven.
4. Port routes, research, missions, encounters, and remaining web-suite tools.
5. Add persistent recent-world reopening, packaging, and release automation.

## Local files

World databases, logs, imported-source evidence, attachments, backups, and exports belong under local runtime directories and are ignored by Git. Sanitized test fixtures must be stored separately under `src/test/resources` and must not contain private player information.
