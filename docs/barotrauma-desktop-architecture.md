# Barotrauma World Simulation Toolbox Architecture

**Status:** Accepted initial architecture  
**Target:** Java 17 and Swing  
**Project path:** `desktop/barotrauma-world-sim/`  
**Primary package:** `io.github.mrcalzon02.barotrauma`

## Decision summary

The Barotrauma RPG Operations Suite will be migrated into an independent Java 17 desktop application with a Swing interface, a deterministic simulation engine, a normalized SQLite world database, a versioned compatibility importer for the existing web suite, and a separately isolated importer for legitimate Barotrauma `.save` and `.sub` files.

The project will not embed the existing website, run the current JavaScript runtime through an engine, or persist the entire world as one JSON object.

## Architectural goals

The desktop application must:

- preserve the current available tools and integrated simulation systems;
- open and simulate the established master world without regenerating it;
- run independently from GitHub Pages and a browser;
- remain responsive while importing, simulating, backing up, and rendering large worlds;
- support deterministic pause, resume, step, acceleration, and catch-up;
- preserve source provenance and imported artifacts;
- prevent duplicate campaign, vessel, definition, and snapshot creation;
- make database mutation transactional and auditable;
- permit a later headless service without rewriting simulation rules;
- retain one active repository branch, `main`.

## Non-goals for the first parity release

The first desktop parity release will not:

- edit and write official Barotrauma saves;
- execute game or workshop code;
- operate a public multiplayer server;
- provide cloud accounts;
- claim cryptographic security for local vessel locks;
- replace the existing public web reference library;
- complete every registry module currently marked planned;
- remain active after the application process is terminated.

## Repository layout

```text
desktop/barotrauma-world-sim/
├── README.md
├── toolbox.cmd
├── toolbox.ps1
├── src/
│   ├── main/
│   │   ├── java/io/github/mrcalzon02/barotrauma/
│   │   │   ├── desktop/
│   │   │   ├── application/
│   │   │   ├── domain/
│   │   │   ├── simulation/
│   │   │   ├── persistence/
│   │   │   ├── importers/
│   │   │   │   ├── websuite/
│   │   │   │   └── officialsave/
│   │   │   └── content/
│   │   └── resources/
│   └── test/
│       ├── java/
│       └── resources/
└── packaging/
```

The initial scaffold may contain fewer packages, but dependencies must point inward toward domain and application contracts rather than from domain code into Swing.

## Module responsibilities

### Desktop

The desktop layer owns:

- Swing windows and panels;
- navigation;
- view models;
- user command submission;
- progress and error presentation;
- import previews;
- world-open and world-close workflows;
- read-only display snapshots.

It does not own simulation rules, archive decoding, identity rules, or SQL.

### Application

The application layer owns use cases and orchestration:

- create world;
- open world;
- close world;
- run simulation cycle;
- catch up world;
- import web suite;
- inspect official save;
- commit accepted import;
- create checkpoint;
- restore checkpoint;
- back up world;
- export portable world;
- query dashboard summaries.

Application services coordinate domain objects and repositories through explicit commands and queries.

### Domain

The domain layer owns stable records and rules:

- world and canonical clock;
- location graph;
- stations and station economies;
- factions and relationships;
- submarine definitions;
- vessel instances and snapshots;
- crew and assignments;
- cargo and transactions;
- routes and transit;
- encounters and events;
- research and construction;
- import identity and provenance;
- audit entries.

Domain code has no Swing, SQL, filesystem, JSON-library, or XML-parser dependency.

### Simulation

The simulation layer owns deterministic world progression:

- command intake at cycle boundaries;
- canonical clock advancement;
- arrivals;
- station production and consumption;
- freight dispatch;
- trade completion;
- research progression;
- upkeep and failure processing;
- encounter scheduling and resolution;
- faction and station consequence updates;
- cycle summaries;
- deterministic random streams.

It produces a proposed cycle result that is committed transactionally.

### Persistence

The persistence layer owns:

- SQLite connection lifecycle;
- migrations;
- repositories;
- transactions;
- integrity checks;
- checkpoints;
- backups;
- audit journal storage;
- import history;
- recovery reporting.

The first schema will be written only after the domain identity model and version-22 mapping table are reviewed.

### Web-suite importer

The web-suite importer owns:

- accepting current version-22 JSON;
- validating the export envelope;
- preserving source payload and digest;
- mapping nested web state into normalized import records;
- reporting unknown fields;
- reconstructing current world, vessel, crew, economy, route, event, and research state;
- producing an import proposal without direct database mutation.

### Official-save importer

The official-save importer owns:

- bounded GZip input;
- custom campaign archive decoding;
- standalone `.sub` decoding;
- secure XML parsing;
- campaign and submarine metadata extraction;
- artifact, entry, canonical definition, and snapshot fingerprints;
- unresolved content-package reporting;
- import preview and ambiguity candidates;
- an import proposal without direct database mutation.

## Dependency direction

```text
Swing desktop
    ↓
Application services
    ↓
Domain contracts ← Simulation engine
    ↑
Persistence adapters
    ↑
Compatibility import adapters
```

Infrastructure implements interfaces declared at the application or domain boundary. Domain records must remain usable in unit tests without opening Swing or SQLite.

## Command and query separation

UI components submit commands such as:

- `CreateWorld`
- `OpenWorld`
- `AdvanceWorld`
- `PauseSimulation`
- `DispatchVessel`
- `PurchaseCargo`
- `AssignCrew`
- `StartResearch`
- `ResolveEncounter`
- `InspectImport`
- `CommitImport`
- `CreateCheckpoint`

Queries return immutable projections such as:

- `WorldSummary`
- `SimulationStatus`
- `VesselSummary`
- `StationSummary`
- `RouteSummary`
- `ImportPreview`
- `DuplicateCandidateSummary`

Swing models are rebuilt or updated from those projections. They do not hold mutable authoritative world entities.

## Concurrency model

### Event Dispatch Thread

The Swing Event Dispatch Thread performs:

- component construction;
- component mutation;
- navigation changes;
- display-model updates;
- lightweight validation and command creation.

### Simulation executor

A single scheduled executor performs simulation commands. This is the sole logical writer of simulation state.

### Import executor

A bounded worker executor performs:

- hashing;
- decompression;
- XML parsing;
- JSON parsing;
- canonicalization;
- preview construction.

### Persistence serialization

Database writes occur through application transactions. Simulation writes are serialized. Import proposals are committed only after acceptance and duplicate resolution.

### Snapshot publication

After a successful transaction, the application publishes an immutable display snapshot. Swing receives it on the Event Dispatch Thread.

## Simulation clock

The world stores:

- canonical in-world timestamp;
- last committed real timestamp;
- time scale;
- paused state;
- tick sequence;
- deterministic random-stream positions;
- catch-up policy;
- last cycle summary.

A simulation request calculates elapsed eligible cycles, applies the configured catch-up ceiling, creates a pre-catch-up checkpoint when appropriate, and commits completed cycles atomically in bounded groups.

The result must not depend on Swing repaint frequency or wall-clock timer drift.

## Randomness

All simulation randomness must be reproducible.

Random streams should be partitioned by purpose, for example:

- station production;
- freight dispatch;
- route encounters;
- creature encounters;
- maintenance failures;
- market variation;
- research complications.

Each stream derives from the world seed plus a stable stream identifier and persisted position. UI preview generation must not consume authoritative simulation randomness.

## Persistence identity model

### World

A desktop world has an application-generated UUID and may retain the imported master-world ID.

### Campaign source

An imported campaign source has:

- source artifact digest;
- source save metadata;
- source campaign identity evidence;
- import history;
- associations to one desktop world.

### Submarine definition

A definition represents canonical structure and source metadata. It is shared when the same design appears in multiple campaigns.

### Vessel instance

A vessel instance represents a physical or campaign-specific vessel. It belongs to one desktop world and references one current definition revision.

### Vessel snapshot

A snapshot records a vessel at one source or simulation point. Snapshots are immutable.

### Current vessel state

Current operational state is a promoted projection derived from a snapshot plus later committed desktop events. Importing an older snapshot does not automatically roll back the current vessel.

## Duplicate resolution

Duplicate resolution is ordered:

1. exact source artifact digest;
2. exact contained-entry digest;
3. canonical submarine definition digest;
4. explicit source campaign and vessel evidence;
5. existing import association;
6. user-reviewed candidate matching;
7. new record creation.

Names are display evidence only.

A duplicate decision is recorded as an audit entry containing candidates, evidence, decision, operator choice, and resulting associations.

## Import transaction model

Import has two stages.

### Inspection stage

Inspection is read-only and produces:

- source summary;
- extracted entries;
- metadata;
- warnings;
- unresolved packages;
- duplicate candidates;
- proposed new records;
- proposed associations;
- proposed current-state changes.

### Commit stage

Commit requires an accepted inspection result. The application verifies that the world and duplicate candidates have not changed, then applies the proposal in one transaction.

A failed commit leaves no partially imported records.

## Content migration

Static content should be copied or transformed into desktop resources only when required for independent operation.

The preferred order is:

1. preserve existing JSON and Markdown as resources;
2. create typed loaders and validators;
3. create a desktop content index;
4. transform only performance-critical or schema-stabilized content;
5. keep original source paths in provenance.

The desktop application must validate duplicate IDs and unresolved references during development builds and content tests.

## Swing shell

The main window uses:

- left navigation list;
- `CardLayout` workspace area;
- persistent status bar;
- world title and canonical time;
- simulation state indicator;
- last-save indicator;
- background-task indicator.

Initial navigation targets are:

- Overview;
- Active Submarine;
- World Map;
- Submarines;
- Crew;
- Stations and Economy;
- Routes and Jobs;
- Encounters;
- Cargo and Catalogue;
- Workshop and R&D;
- Factions;
- Reference Library;
- Import Center;
- Campaign Journal;
- Simulation Monitor;
- Settings and Backups.

Early scaffold panels may be placeholders, but navigation IDs should remain stable.

## Error handling

Expected operational failures are represented as typed results, not uncaught exceptions shown directly to users.

Every user-visible error should include:

- what operation failed;
- whether world state changed;
- whether automatic rollback occurred;
- where diagnostic details were written;
- what recovery action is available.

Unexpected exceptions are logged with a correlation ID. The Swing shell remains open where recovery is safe.

## Logging and audit distinction

Application logs are technical diagnostics and may rotate.

The audit journal is world history and must persist. It records meaningful actions such as:

- world creation;
- import acceptance;
- duplicate resolution;
- vessel promotion;
- manual clock changes;
- catch-up simulation;
- route dispatch;
- trade completion;
- research completion;
- checkpoint creation;
- checkpoint restoration;
- backup restoration.

## Version policy

The desktop application has independent versions for:

- application release;
- database schema;
- domain contract;
- simulation rules;
- version-22 importer;
- official-save importer;
- content bundle.

An application release may update more than one version. Import and migration reports must state all relevant versions.

## Testing strategy

### Unit tests

- domain identity;
- canonical hashing;
- duplicate decisions;
- clock calculation;
- deterministic random streams;
- station cycles;
- transit;
- trade;
- research;
- encounter selection;
- import limits.

### Golden compatibility tests

- version-22 suite import;
- official `.save` archive listing;
- `gamesession.xml` extraction;
- standalone `.sub` extraction;
- canonical XML digest;
- repeated import idempotence;
- renamed duplicate;
- same name with different design;
- same design in different campaign;
- newer and older vessel snapshots.

### Integration tests

- database migration;
- transaction rollback;
- checkpoint restore;
- simulation commit and reload;
- import commit and reload;
- interrupted-operation recovery;
- large-world query performance.

### Desktop tests

- application startup;
- navigation;
- worker completion publication;
- no long-running work on the Event Dispatch Thread;
- close-world protection;
- unsaved or active-operation warnings.

## Build and packaging

The desktop project uses a small PowerShell toolbox and the standard JDK 17 tools directly. Gradle is not required.

SQLite JDBC is pinned by version, downloaded from Maven Central on first setup, and accepted only after its published SHA-256 checksum matches. JSON and XML inspection remain implemented with the JDK.

`toolbox.cmd build` compiles and packages the application JAR. Future native packaging may use `jlink` or `jpackage` through this same documented toolchain.

## Implementation sequence

1. Commit migration baseline and architecture.
2. Add dependency-free Java 17 Swing shell.
3. Add content bundle inventory and validators.
4. Add domain identity records and tests.
5. Add version-22 inspection and mapping model.
6. Select and add SQLite driver; establish migration 001.
7. Commit version-22 import into a world database.
8. Port read-only dashboards.
9. Port editable tools.
10. Port deterministic simulation.
11. Add official `.save` and `.sub` inspection.
12. Add duplicate-safe official import.
13. Harden, profile, package, and release.

## Architecture change record

Material changes to this document must add a dated section describing:

- decision changed;
- previous rule;
- replacement rule;
- reason;
- migration consequence;
- test consequence;
- recovery consequence.

Silent architectural drift is not accepted for persistence, identity, simulation order, importer safety, or source provenance.
