# Barotrauma World Simulation Toolbox

Independent Java 17 Swing migration of the Barotrauma RPG Operations Suite.

## Current status

The project currently contains the first dependency-free desktop shell. It establishes the permanent project path, package identity, navigation IDs, master-world baseline display, simulation status area, and Import Center boundary.

No current website behavior has been removed or redirected. The web suite remains the behavioral reference while desktop parity is developed.

## Requirements

- JDK 17
- Gradle capable of building a Java 17 project

A Gradle wrapper will be added when the project's build and release automation is established. Until then, run from this directory with a locally installed Gradle:

```text
gradle run
```

Build the application JAR with:

```text
gradle build
```

## Entry point

```text
io.github.mrcalzon02.barotrauma.desktop.BarotraumaWorldSimApplication
```

## Governing documents

- `../../docs/barotrauma-desktop-baseline.md`
- `../../docs/barotrauma-desktop-architecture.md`

The baseline fixes the current compatibility and simulation requirements. The architecture document fixes dependency direction, identity boundaries, importer isolation, concurrency rules, and implementation order.

## Initial navigation contract

The desktop shell reserves stable workspaces for:

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

Placeholder panels are intentional in the first scaffold. Each will be replaced by an application-backed view without changing its navigation identity.

## Immediate implementation order

1. Add content-bundle inventory and validation.
2. Add domain identity records for world, campaign source, submarine definition, vessel instance, and vessel snapshot.
3. Add deterministic hashing and duplicate-decision tests.
4. Add a read-only version-22 suite inspector.
5. Select SQLite and JSON dependencies deliberately.
6. Establish database migration 001.
7. Commit version-22 import into a desktop world.

## Local files

Future world databases, logs, extracted temporary files, backups, and imported source artifacts belong under local runtime directories and are ignored by Git. Sanitized test fixtures must be stored separately under `src/test/resources` and must not contain private player information.
