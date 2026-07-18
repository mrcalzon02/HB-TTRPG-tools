# Barotrauma Desktop Migration Baseline

**Baseline date:** 2026-07-17  
**Target runtime:** Java 17  
**Desktop UI:** Swing  
**Repository policy:** one active branch, `main`

## Purpose

This document freezes the current Barotrauma web-suite behavior that the independent desktop application must preserve or deliberately migrate. It is not a promise that every internal JavaScript implementation detail will survive. It records the user-visible capabilities, data contracts, persistence boundaries, simulation behavior, and compatibility requirements that must remain traceable during the Java conversion.

The desktop application is an independent native program. It must not be implemented as an embedded browser, a Swing wrapper around the existing website, or a direct execution host for the current dynamically assembled JavaScript runtime.

## Current source authority

The existing implementation is distributed across the following source families:

- `data/barotrauma-tools-registry.json`
- `barotrauma-rpg-tools.html`
- `barotrauma-rpg-tools-loader.js`
- `data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-*.txt`
- `data/barotrauma/tools/catalog/`
- `data/barotrauma/tools/submarines/`
- `data/barotrauma/tools/custom/`
- `data/barotrauma/tools/items/`
- `data/barotrauma/tools/world/`
- `data/barotrauma/tools/factions/`
- `data/barotrauma/tools/locations/`
- `data/barotrauma/tools/creatures/`
- `data/barotrauma/tools/encounters/`
- `data/barotrauma/wiki/`

The Java application must preserve provenance. Exact-source wiki material, official-game metadata, original campaign material, and derived tabletop mechanics must remain distinguishable in the desktop datastore.

## Existing available modules

The registry currently identifies these modules as available:

1. The Crewman's Primer wiki.
2. Barotrauma RPG rules wiki.
3. Barotrauma RPG Character Sheet.
4. Submarine Manager.
5. Custom Content Workshop and R&D.
6. Encounter Planner.
7. Route Planner and Encounter Tables.
8. Expanded Europa Public World State.

The runtime also contains integrated systems that are broader than the registry cards:

- official and custom submarine catalogues;
- character inventory and item compatibility;
- crew submissions and crew management;
- cargo manifests and station commerce;
- faction and organization seeding;
- location-level assignment and validation;
- station research and superior-design validation;
- route crossing and route event resolution;
- creature and general encounter systems;
- expedition integration;
- Active Submarine Dashboard;
- active submarine transit;
- dashboard commissioning and operational boundaries;
- world-economy station production;
- NPC freight vessel scheduling and trade completion;
- item recipe and production systems;
- per-vessel management authorization;
- Job System;
- Masterworld Observer.

These integrated systems are part of the desktop migration scope even when they are not exposed as separate registry cards.

## Existing portable suite format

The current full-suite JSON export writes:

- `version: 22`;
- export timestamp;
- master world ID;
- registry and subsystem versions;
- the complete current state object.

The desktop application's first compatibility importer must accept version 22. Import must normalize the source state into desktop records rather than storing the entire object as the permanent database model.

The importer must preserve the original version-22 file and its SHA-256 digest in import history. Unknown source fields must be retained in a compatibility payload or reported explicitly; they must not disappear silently.

## Current browser persistence boundary

The web application stores its working suite under:

```text
hb-barotrauma-rpg-operations-suite-v1
```

The stored state is a deeply nested JavaScript object. The desktop database must replace this single-object persistence model with explicit records, foreign keys, schema migrations, transactions, checkpoints, and an append-only audit journal.

## Master-world defaults

The current large-world defaults are:

| Property | Baseline |
|---|---:|
| Canonical start | `2175-01-01T00:00:00.000Z` |
| Real epoch | `2026-06-20T08:00:00.000Z` |
| Time scale | `1` |
| Mandatory inward voyage rings | `48` |
| Default locations | `960` |
| Guaranteed station target | `180` |
| Branching value | `48` |
| Shell radius | `7008` |
| Location levels | `10` |
| Unique core | Eye of Europa |

Level 1 is the frontier shell. Levels 2 through 9 move inward. Level 10 is the unique Eye of Europa.

The desktop application may support smaller test worlds and future alternate profiles, but the baseline master world must open and simulate without regeneration.

## Existing world-economy behavior

The web runtime currently:

- checks simulation progress once per minute;
- calculates elapsed cycles from `lastSimulatedAt`;
- limits catch-up work to a configured maximum cycle count;
- processes stations in bounded batches;
- processes NPC vessels in bounded batches;
- completes arrivals for vessels already in transit;
- dispatches eligible docked freight vessels;
- updates simulation summaries and tick sequence;
- saves after completing a progressive simulation pass.

The Java engine must preserve the observable results while replacing browser timers with a deterministic single-writer simulation service.

The application must support:

- pause;
- resume;
- one-cycle step;
- controlled acceleration;
- elapsed-time catch-up on startup;
- manual catch-up;
- checkpoint before large catch-up operations;
- cancellation before transaction commit;
- diagnostic summary of processed stations, departures, arrivals, trades, research, and events.

## Desktop continuity rule

The initial desktop release is not required to remain active after the operating system terminates the application. Instead, it must persist the canonical clock and perform deterministic elapsed-time catch-up when the world is reopened.

A later headless service mode may support continuous operation without the Swing window. That service mode is outside the first parity release and must use the same simulation engine and database, not a second implementation.

## Official Barotrauma campaign save boundary

The official campaign `.save` format is a GZip stream containing a custom series of entries. It is not a conventional ZIP file.

Each contained entry uses:

1. a 32-bit little-endian filename length;
2. a UTF-16LE filename;
3. a 32-bit little-endian content length;
4. raw content bytes.

A normal campaign save contains `gamesession.xml` and one or more `.sub` files. The selected submarine and owned-submarine names are read from `gamesession.xml` and matched to those contained files.

The desktop importer must decode the format independently. It must not execute Barotrauma assemblies, scripts, workshop code, or mod code.

## Official standalone submarine boundary

A standalone `.sub` file is a GZip-compressed XML document.

The importer must retain at minimum:

- original filename;
- original SHA-256 digest;
- canonical XML SHA-256 digest;
- source name and description;
- game version;
- type and class;
- price and tier;
- dimensions;
- cargo capacity;
- recommended crew minimum and maximum;
- recommended crew experience;
- required content packages;
- campaign compatibility flags;
- official check value when present;
- unknown XML and unresolved content references.

The importer must not treat a source submarine's descriptive metadata as equivalent to the desktop application's derived tabletop statistics.

## Import safety limits

The first official-save importer must reject or quarantine:

- negative filename or content lengths;
- filename lengths over 255 characters;
- absolute paths;
- parent-directory traversal;
- duplicate archive paths;
- truncated payloads;
- unsupported compression;
- XML external entities;
- excessive nesting;
- excessive entry count;
- excessive decompressed bytes;
- missing `gamesession.xml` for campaign imports;
- missing referenced submarine entries;
- malformed XML;
- files whose declared structure and extension disagree.

All limits must be configurable in one importer policy object and covered by automated tests.

## Identity and duplicate-prevention baseline

Duplicate prevention has four separate identities.

### Source artifact identity

```text
SHA-256(original uploaded bytes)
```

An exact repeated file is an already-recorded import, regardless of its filename.

### Contained entry identity

```text
SHA-256(extracted entry bytes)
```

This detects repeated `gamesession.xml` or `.sub` payloads inside differently named campaign files.

### Submarine definition identity

```text
SHA-256(canonicalized submarine XML)
```

Canonicalization must remove irrelevant formatting differences while retaining meaningful attributes and elements. A definition describes a design, not a particular campaign vessel.

### Vessel snapshot identity

A snapshot identity combines:

- world or campaign identity;
- vessel-instance identity;
- submarine-definition identity;
- imported operational state;
- source save time or a stable equivalent;
- canonical snapshot payload.

Two campaigns may contain the same submarine design while representing separate physical vessels. A later save of the same vessel must become another snapshot rather than another vessel.

Name alone is never sufficient to merge definitions, vessels, campaigns, or snapshots.

## Required duplicate outcomes

| Import situation | Required outcome |
|---|---|
| Exact same file | Skip mutation and show previous import |
| Renamed file with identical bytes | Skip mutation and show previous import |
| Different campaign archive containing identical `.sub` entry | Reuse definition |
| Same definition used by another campaign | Create or associate a separate vessel instance |
| Newer snapshot of known vessel | Append snapshot and optionally promote current state |
| Older snapshot of known vessel | Preserve as historical snapshot after explicit review |
| Same name, different canonical structure | Create a distinct definition |
| Ambiguous vessel association | Require resolution; do not auto-merge |

Database uniqueness constraints must enforce exact duplicate prevention. User-interface warnings alone are insufficient.

## Data ownership and authority

The desktop world database is authoritative for the desktop simulation.

Imported Barotrauma files are immutable source artifacts. Import does not write back into the game save.

Imported records must track:

- source type;
- source filename;
- source digest;
- import timestamp;
- source game version;
- conversion version;
- warnings;
- unresolved content packages;
- created or associated desktop records;
- user decisions made during ambiguity resolution.

## Swing concurrency baseline

All Swing component mutation occurs on the Event Dispatch Thread.

Simulation, import, decompression, XML parsing, database migration, backup, map generation, indexing, and heavy validation occur off the Event Dispatch Thread.

The simulation engine is a single logical writer. UI actions submit commands; they do not mutate shared domain state directly.

The UI receives immutable display snapshots or query results.

## Database baseline

The intended persistence engine is SQLite with:

- foreign keys enabled;
- write-ahead logging;
- numbered schema migrations;
- transactionally committed simulation cycles;
- append-only audit records;
- import history;
- checkpoint history;
- rotating backup support;
- integrity checks on open;
- recovery reporting after interrupted writes.

The SQLite driver is not part of the first dependency-free Swing shell commit. It will be added when the persistence module and its version policy are established.

## Packaging baseline

The target is a self-contained Java 17 desktop application packaged with `jpackage`.

Planned deliverables are:

- Windows application image;
- Windows installer;
- Linux application image;
- Linux package where the build environment supports it;
- portable application-image archive;
- checksums;
- release notes;
- world backup and restore documentation.

Packaging is platform-specific and must be tested on each target operating system.

## Phase-zero exit gate

Phase zero is complete when:

1. this baseline is committed;
2. the architecture record is committed;
3. a clean version-22 suite export is retained outside the public repository or committed only after sanitization;
4. representative sanitized importer fixtures are identified;
5. expected world, economy, vessel, route, encounter, and research values are recorded;
6. the Java project location and package identity are fixed;
7. no existing web behavior has been altered to begin the desktop work.

## Change control

Any later decision that intentionally breaks this baseline must be recorded in the desktop architecture document with:

- the old behavior;
- the new behavior;
- the reason;
- migration impact;
- compatibility impact;
- test impact;
- data-recovery consequences.
