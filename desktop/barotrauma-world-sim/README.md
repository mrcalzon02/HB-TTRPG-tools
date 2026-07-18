# Barotrauma World Simulation Toolbox

Independent Java 17 Swing migration of the Barotrauma RPG Operations Suite.

## Current status

The desktop project now includes:

- The Java 17 Swing application shell and stable workspace navigation.
- A process-wide desktop-world session shared by the shell, import tools, vessel registry, and snapshot workflows.
- Duplicate-safe source, submarine-definition, physical-vessel, and snapshot identities.
- Read-only inspection of version-22 browser-suite exports.
- Safe inspection of official Barotrauma `.save` campaign archives and standalone `.sub` files.
- Desktop-world directories, exclusive writer locks, atomic metadata writes, and SQLite schema migration 001.
- Transactional inspection recording and exact-source duplicate prevention.
- Canonical submarine-definition reuse across renamed or repeated designs.
- Explicit one-vessel imports with complete rollback.
- Read-only definition, physical-vessel, and snapshot-chronology registries.
- Newer-snapshot promotion and explicitly approved historical retention for older, equal-time, or timestamp-unknown sources.
- An atomic campaign archive mapper where every submarine payload is reviewed and assigned either to a new physical vessel or one structurally matching existing vessel.
- Complete rollback when any row in a multi-submarine campaign mapping fails.

No website behavior has been removed or redirected. The web suite remains the behavioral reference while desktop parity is developed.

Version-22 world exports remain inspection-only. The accepted official-file transactions do not yet create crew, economy, route, mission, or simulation-event state.

## Requirements

- JDK 17
- A locally installed Gradle capable of building a Java 17 project

A Gradle wrapper will be added with release automation. Until then, run commands from `desktop/barotrauma-world-sim`.

## Run the desktop shell

```text
gradle run
```

The primary shell launches the inspection, import, campaign-mapping, vessel-registry, and snapshot-approval windows. Opening or creating a desktop world in one participating window updates the shared world selection across the application process.

## Run individual workflows

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

## Import boundaries

The one-vessel approval workflow accepts standalone `.sub` files and campaign saves containing one submarine payload. Campaign archives containing multiple submarine payloads are redirected to the campaign mapper.

The campaign mapper requires every row to be reviewed before commit. Each payload is assigned to one of two actions:

- Create a new physical vessel while reusing or creating its canonical submarine definition.
- Attach the payload to one explicitly selected existing vessel with the same canonical definition.

An existing vessel may be targeted only once per archive. Newer source states may become current. Older, equal-time, and timestamp-unknown states require explicit historical retention. Any invalid row rolls back the entire campaign archive.

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

This verifies inspection planning, duplicate prevention, accepted imports, rollback, registry queries, snapshot chronology, and atomic campaign archive mapping.

The repository workflow `.github/workflows/barotrauma-desktop.yml` compiles with Java 17 and runs identity, shared-session, compatibility, filesystem, SQLite, rollback, chronology, and campaign-mapping contracts for desktop-project changes.

## Entry points

```text
io.github.mrcalzon02.barotrauma.desktop.BarotraumaWorldSimApplication
io.github.mrcalzon02.barotrauma.desktop.imports.WorldImportApprovalWindow
io.github.mrcalzon02.barotrauma.desktop.imports.CampaignVesselMappingWindow
io.github.mrcalzon02.barotrauma.desktop.registry.WorldVesselRegistryWindow
io.github.mrcalzon02.barotrauma.desktop.registry.VesselSnapshotApprovalWindow
```

## Governing documents

- `../../docs/barotrauma-desktop-baseline.md`
- `../../docs/barotrauma-desktop-architecture.md`

The baseline fixes the current compatibility and simulation requirements. The architecture document fixes dependency direction, identity boundaries, importer isolation, concurrency rules, and implementation order.

## Stable navigation contract

The desktop shell reserves workspaces for:

- Overview
- Active Submarine
- World Map
- Submarines
- Crew
- Stations and Economy
- Routes and Jobs
- Encounters
- Cargo and Catalogue
- Workshop and R&D
- Factions
- Reference Library
- Import Center
- Campaign Journal
- Simulation Monitor
- Settings and Backups

Placeholder panels are intentional during phased migration. Each will be replaced by an application-backed view without changing its navigation identity.

## Current implementation order

Completed foundations:

1. Desktop shell and architecture baseline.
2. Stable identities and duplicate decisions.
3. Version-22 and official-file inspection.
4. Filesystem storage, SQLite schema, and world locking.
5. Inspection ledger and import planning.
6. Accepted official-vessel transactions with rollback.
7. Shared desktop-world session and primary-shell integration.
8. Definition, vessel, and snapshot registries.
9. Snapshot chronology and current-state promotion rules.
10. Explicit atomic multi-submarine campaign mapping.

Next phases:

1. Import the version-22 master world into normalized desktop tables.
2. Establish a persistent world-session summary and recent-world reopening.
3. Add the deterministic simulation clock, command queue, and checkpoint transactions.
4. Port stations, economy, routes, NPC vessels, research, and simulation scheduling.
5. Add packaging and release automation.

## Local files

World databases, logs, imported-source evidence, attachments, backups, and exports belong under local runtime directories and are ignored by Git. Sanitized test fixtures must be stored separately under `src/test/resources` and must not contain private player information.
