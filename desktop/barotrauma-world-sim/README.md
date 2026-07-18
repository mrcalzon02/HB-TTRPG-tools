# Barotrauma World Simulation Toolbox

Independent Java 17 Swing migration of the Barotrauma RPG Operations Suite.

## Current status

The desktop project now includes:

- The Java 17 Swing application shell and stable workspace navigation.
- Duplicate-safe source, submarine-definition, vessel-instance, and snapshot identities.
- Read-only inspection of version-22 browser-suite exports.
- Safe inspection of official Barotrauma `.save` campaign archives and standalone `.sub` files.
- Desktop-world directories, exclusive writer locks, atomic metadata writes, and SQLite schema migration 001.
- Transactional inspection recording and exact-source duplicate prevention.
- Canonical submarine-definition reuse across renamed or repeated designs.
- Explicitly accepted vessel imports that create world-specific vessel instances and immutable source snapshots.
- Complete rollback when any part of a multi-vessel accepted import fails.
- A standalone Swing approval window for creating or opening a world, inspecting a source, reviewing the plan, and confirming the import.

No website behavior has been removed or redirected. The web suite remains the behavioral reference while desktop parity is developed.

Version-22 world exports remain inspection-only. The currently accepted import transaction is limited to official `.save` and `.sub` vessel sources. It does not yet create crew, economy, route, mission, or simulation-event state.

## Requirements

- JDK 17
- A locally installed Gradle capable of building a Java 17 project

A Gradle wrapper will be added with release automation. Until then, run commands from `desktop/barotrauma-world-sim`.

## Run the desktop shell

```text
gradle run
```

## Run the vessel import approval workflow

```text
gradle runImportApproval
```

The approval workflow is intentionally inspection-first:

1. Create or open a desktop world.
2. Select a version-22 JSON export, official `.save`, or standalone `.sub` file.
3. Review the stored source identity, warnings, and duplicate plan.
4. For official vessel sources, explicitly confirm creation of the planned physical vessel instances and source snapshots.
5. If any database operation fails, the complete accepted import is rolled back.

An exact source file cannot be imported twice. A structurally identical submarine with another filename reuses its existing definition but can still create a separate physical vessel instance.

## Build and verification

Build the application:

```text
gradle build
```

Run the SQLite planning and accepted-import verification suite:

```text
gradle verifyWorldStore
```

The repository also contains `.github/workflows/barotrauma-desktop.yml`, which compiles the desktop application with Java 17 and runs the compatibility, identity, storage, SQLite, duplicate, rollback, and accepted-import checks for desktop-project changes.

## Entry points

Main desktop shell:

```text
io.github.mrcalzon02.barotrauma.desktop.BarotraumaWorldSimApplication
```

Import approval workflow:

```text
io.github.mrcalzon02.barotrauma.desktop.imports.WorldImportApprovalWindow
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
6. Accepted official-vessel transaction with rollback.
7. Standalone Swing import approval workflow.

Next phases:

1. Integrate world open/create and import approval into the main desktop shell.
2. Add submarine, vessel, and snapshot registry queries and views.
3. Add snapshot chronology and current-snapshot promotion rules.
4. Import the version-22 master world into normalized desktop tables.
5. Port stations, economy, routes, NPC vessels, research, and simulation scheduling.

## Local files

World databases, logs, imported-source evidence, attachments, backups, and exports belong under local runtime directories and are ignored by Git. Sanitized test fixtures must be stored separately under `src/test/resources` and must not contain private player information.
