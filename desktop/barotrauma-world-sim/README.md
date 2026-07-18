# Barotrauma World Simulation Toolbox

Independent Java 17 Swing migration of the Barotrauma RPG Operations Suite.

## Current status

The desktop project now includes:

- The Java 17 Swing application shell and stable workspace navigation.
- A process-wide desktop-world session shared by the shell, import tools, world registries, vessel registry, and snapshot workflows.
- Duplicate-safe source, submarine-definition, physical-vessel, and snapshot identities.
- Strict inspection and normalization of version-22 browser-suite exports.
- Safe inspection of official Barotrauma `.save` campaign archives and standalone `.sub` files.
- Desktop-world directories, exclusive writer locks, atomic metadata writes, and sequential SQLite migrations through schema 002.
- In-place migration of schema-001 worlds while preserving existing import and vessel records.
- Transactional inspection recording and exact-source duplicate prevention.
- Canonical submarine-definition reuse across renamed or repeated designs.
- Explicit one-vessel imports, snapshot chronology, and complete rollback.
- Atomic multi-submarine campaign mapping with mandatory row review.
- Explicit version-22 master-world acceptance into normalized location, station, component-version, state-family, and simulation-metadata tables.
- Read-only normalized world and vessel registries.

No website behavior has been removed or redirected. The web suite remains the behavioral reference while desktop parity is developed.

Version-22 acceptance imports world identity and continuity metadata but does **not** start the simulation writer. Imported scheduler state is stored as `PAUSED` with `simulation_enabled = false`. Official-file imports still do not create crew, economy transactions, routes, missions, or simulation events.

## Requirements

- JDK 17
- A locally installed Gradle capable of building a Java 17 project

A Gradle wrapper will be added with release automation. Until then, run commands from `desktop/barotrauma-world-sim`.

## Run the desktop shell

```text
gradle run
```

The primary shell launches world inspection and approval, normalized world registry, vessel import, campaign mapping, vessel registry, and snapshot approval. Opening or creating a desktop world in one participating window updates the shared world selection across the application process.

## Run individual workflows

Version-22 normalized master-world import:

```text
gradle runWebWorldImport
```

Read-only normalized world registry:

```text
gradle runWorldRegistry
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

The imported scheduler always remains disabled and `PAUSED`. Continuous simulation is introduced only after command, checkpoint, and recovery contracts are complete.

## Official vessel boundaries

The one-vessel approval workflow accepts standalone `.sub` files and campaign saves containing one submarine payload. Campaign archives containing multiple submarine payloads are redirected to the campaign mapper.

The campaign mapper requires every row to be reviewed before commit. Each payload is assigned either to a new physical vessel or one explicitly selected structurally matching existing vessel. An existing vessel may be targeted only once per archive. Newer source states may become current; older, equal-time, and timestamp-unknown states require explicit historical retention. Any invalid row rolls back the entire campaign archive.

An exact source file cannot be imported twice. A structurally identical submarine with another filename reuses its existing definition but may still create a separate physical vessel.

## Build and verification

Build the application:

```text
gradle build
```

Run the complete persistence verification chain:

```text
gradle verifyWorldStore
```

The verification suite covers:

- Fresh database migration through schemas 001 and 002.
- In-place schema-001 to schema-002 migration with record preservation.
- Inspection planning and duplicate prevention.
- Accepted vessel imports and rollback.
- Snapshot chronology and current-state promotion.
- Atomic campaign archive mapping.
- Strict version-22 world normalization.
- Atomic master-world import and replacement rejection.
- Read-only normalized world and vessel registry queries.
- Confirmation that imported simulation remains disabled and paused.

The repository workflow `.github/workflows/barotrauma-desktop.yml` compiles with Java 17 and runs identity, shared-session, compatibility, filesystem, SQLite, rollback, chronology, campaign, migration, normalized-world, and registry contracts for desktop-project changes.

## Entry points

```text
io.github.mrcalzon02.barotrauma.desktop.BarotraumaWorldSimApplication
io.github.mrcalzon02.barotrauma.desktop.imports.WebWorldImportApprovalWindow
io.github.mrcalzon02.barotrauma.desktop.registry.WorldMapRegistryWindow
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
4. Filesystem storage, SQLite locking, and schemas 001–002.
5. Inspection ledger and import planning.
6. Accepted official-vessel transactions with rollback.
7. Shared desktop-world session and primary-shell integration.
8. Definition, vessel, and snapshot registries.
9. Snapshot chronology and current-state promotion rules.
10. Explicit atomic multi-submarine campaign mapping.
11. Normalized version-22 master-world import and read-only world registry.

Next phases:

1. Persist recent-world reopening and a primary-shell world summary.
2. Add the deterministic simulation clock, command queue, and checkpoint transactions.
3. Add safe elapsed-time catch-up and recovery behavior.
4. Port stations, economy, routes, NPC vessels, research, and simulation scheduling.
5. Add packaging and release automation.

## Local files

World databases, logs, imported-source evidence, attachments, backups, and exports belong under local runtime directories and are ignored by Git. Sanitized test fixtures must be stored separately under `src/test/resources` and must not contain private player information.
