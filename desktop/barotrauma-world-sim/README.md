# Barotrauma World Simulation Toolbox

Independent Java 17 Swing migration of the Barotrauma RPG Operations Suite.

## Current status

The desktop project now includes:

- A Java 17 Swing shell with stable workspace navigation and a process-wide selected-world session.
- Inspection-first version-22, `.save`, and `.sub` compatibility.
- Duplicate-safe source, submarine-definition, physical-vessel, and snapshot identities.
- Atomic vessel imports, campaign mapping, snapshot chronology, rollback, and read-only registries.
- Sequential SQLite migrations through **schema 009** for fresh and existing desktop worlds.
- A deterministic canonical-time clock, one logical writer, immutable command receipts, reviewed checkpoints, stale-state rejection, and restart recovery.
- A live Europa World Map with explicitly controlled **Passive Mode**.
- Transactional station, NPC vessel, route, mission, research, encounter, production, freight, market, treasury, consumption, and civilization-frontier workloads.
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

The World Map provides canonical time, locations, stations, NPC voyages, missions, routes, research, encounters, and Passive Mode controls.

Passive Mode cadence ranges from one second to one hour and from one to 1,000 canonical ticks per cycle. A multi-tick catch-up still processes station consumption and civilization changes one canonical tick at a time. Closing the World Map does not stop an enabled process-wide scheduler.

Only one passive scheduler is created for a world in the application process. The manual clock monitor becomes read-only while that scheduler owns the writer.

## Station consumption and civilization frontier

```text
gradle runCivilizationFrontier
```

Every active station now consumes supplies on every passive tick. Consumption is deterministic for replay but varies around each station’s local baseline, generally moving through a small baseline-minus-one, baseline, or baseline-plus-one pattern.

Ration inventory covers demand first. When rations are insufficient, the station pays additional abstract supply cost. Low abstract supplies also count as shortage pressure even when a small ration reserve remains. This prevents a station from maintaining itself indefinitely without regular deliveries.

Shortages are deliberately slow rather than immediately catastrophic:

- The shortage streak rises one tick at a time and falls gradually after normal supply resumes.
- Integrity begins degrading only after shortage pressure persists.
- Security and industry decline on slower milestone intervals.
- Population capacity moves only after long sustained shortage or long stable surplus.
- Civilization strength and frontier position respond more quickly than population, but still move incrementally.
- A station becomes contested, contracting, or eventually abandoned only after persistent logistical and fauna pressure.

The civilian frontier uses five states:

- `EXPANDING` — stable supply and security allow civilization to push outward.
- `HOLDING` — the station is maintaining its current perimeter.
- `CONTESTED` — fauna pressure or shortage is challenging the perimeter.
- `CONTRACTING` — persistent shortage or monster pressure is forcing civilization inward.
- `ABANDONED` — integrity, population capacity, or frontier position has collapsed.

The frontier console exposes:

- Current supplies and ration stock.
- Last and baseline consumption.
- Shortage and surplus streaks.
- Population capacity and civilization strength.
- Fauna pressure and frontier position.
- Station integrity, security, threat, and industry.
- Per-tick consumption history.
- Shortage, recovery, delivery, expansion, contraction, abandonment, and monster-attack events.
- NPC missions generated in response to contraction or expansion.

## Monster attacks and civilization response

Fauna pressure grows when stations are threatened or undersupplied and recedes when security is strong and local threat is controlled. At deterministic intervals, sufficiently high fauna pressure can produce a direct monster attack.

A successful attack can:

- Damage station integrity.
- Reduce security.
- Increase local threat and fauna pressure.
- Reduce civilization strength.
- Force the civilian frontier inward.
- Move the station into contested or contracting condition.

When a station becomes contested or contracting, Passive Mode can generate a UUID-safe `DEFENSE` or `FAUNA_CLEARING` mission for NPC assignment. When supply and security stabilize the station, a recovery event is retained. When civilization begins expanding again, the world can generate outward `TRANSIT` or `RESEARCH` work.

This creates a continuing give-and-take: monsters and shortage push the inhabited frontier inward, while deliveries, patrols, clearing missions, research, industry, and security push civilization outward.

## Deliveries and recovery

Delivered cargo now has item-specific station consequences in addition to inventory and treasury effects:

- **Rations** restore abstract supplies and rapidly reduce accumulated shortage pressure.
- **Medical supplies** restore supplies and integrity while modestly reducing fauna pressure.
- **Fuel rods** restore supplies and support industry.
- **Coilgun ammunition** reinforces security and suppresses fauna pressure.
- **Fabricated steel** restores integrity and supports industry.

A delivery does not instantly create population or territory. It arrests decline, reduces shortage pressure, strengthens civilization, and allows later passive ticks to produce recovery and gradual expansion. Regular delivery therefore matters more than one isolated shipment.

## Station logistics, markets, and freight

```text
gradle runStationLogistics
```

The logistics console exposes item definitions, production recipes, station inventory, vendor offers, production runs, freight lots, and treasury entries.

The initial catalogue contains Europan ore, fabricated steel, reactor fuel rods, medical supplies, rations, coilgun ammunition, research samples, and luxury goods. Initial recipes smelt steel, assemble fuel rods, prepare medical supplies, and fabricate ammunition.

Each passive cycle:

1. Advances station economy and consumes local supplies.
2. Produces limited raw ore and rations according to station capacity.
3. Chooses at most one affordable recipe per station and tick so input inventory cannot be spent twice.
4. Consumes recipe inputs and adds outputs.
5. Deducts production costs and writes treasury evidence.
6. Reprices vendor offers according to threat and station condition.
7. Creates READY freight opportunities where one station has a shortage and another has surplus stock.
8. Updates civilization and fauna pressure from the resulting supply position.

Completed NPC trade, mining, and salvage work can create freight lots. NPC return docking delivers those lots without recursive SQLite trigger dependence, updates inventory and station credits, and writes treasury and civilization evidence.

## Imported player-vessel transit and freight

```text
gradle runPlayerTransit
```

An imported physical vessel can be enrolled at a normalized world location without changing its definition, physical identity, or snapshot chronology.

The player transit console supports selecting an imported vessel, enrolling it, loading READY freight at its source, planning a destination and mission context, resolving one deterministic transit challenge at a time, accumulating route delay from costly setbacks, docking, and delivering cargo at its declared destination.

Freight loading and delivery update station inventory, vessel cargo, station credits, treasury entries, freight state, player voyage logs, audit history, and—on delivery—the receiving station’s civilization-support state in one transaction.

## Shared transit and encounter resolution

Player and NPC voyages call the same dependency-free deterministic resolver. Given the same world, vessel, route, sequence, mission, and capability inputs, the result is identical.

Current hazards include thermal vent fields, ice shear, ballast failure, reactor instability, hostile fauna, abyssal predators, current reversals, and navigation blackouts. Hazard selection is deterministic but varied across route sequences.

## Passive world behavior

Stations remain `RISING`, `STABLE`, `STRAINED`, `BESIEGED`, or `FALLEN` according to credits, supplies, industry, security, integrity, threat, and civilization-frontier state.

NPC roles include Trader, Miner, Hunter, Patrol, Research, Salvage, and Courier. Their mission set includes Trade, Mining, Fauna Clearing, Station Defense, Research, Salvage, and Transit.

Each NPC retains location, destination, route progress, hull, supplies, cargo, crew quality, navigation, engineering, combat, mining, and research capability. It moves through preparation, outbound transit, work, return, docking, disablement, and loss states while accumulating persistent voyage history.

## Manual durable clock monitor

```text
gradle runSimulationMonitor
```

When Passive Mode is off, the manual monitor permits enable, disable, explicit stepping, bounded catch-up, and explicit checkpoints. When Passive Mode is active, it becomes read-only and directs workload control back to the World Map.

## Import and registry workflows

```text
gradle runWebWorldImport
gradle runImportApproval
gradle runCampaignMapping
gradle runVesselRegistry
gradle runSnapshotApproval
```

These commands cover normalized master-world import, one-vessel approval, campaign vessel mapping, vessel/snapshot inspection, and chronology attachment.

## Persistence boundaries

- **Schema 001** — source, definition, vessel, snapshot, warning, and audit identity.
- **Schema 002** — normalized master-world, locations, stations, component versions, state families, and imported scheduler metadata.
- **Schema 003** — durable clock receipts, checkpoints, current tick state, sequence continuation, and recovery pointers.
- **Schema 004** — passive configuration, station state, missions, NPC vessels, voyage logs, encounters, and research.
- **Schema 005** — research uniqueness and return-voyage docking safeguards.
- **Schema 006** — item catalogue, recipes, inventory, vendors, production, freight, treasury, player-vessel state, player logs, and player encounters.
- **Schema 007** — non-recursive NPC freight delivery and passive READY freight generation from station shortages.
- **Schema 008** — variable station consumption, shortage history, population/civilization/fauna state, frontier movement, monster attacks, and delivery support.
- **Schema 009** — UUID-safe contraction missions, recovery evidence, and outward expansion missions.

A passive cycle is one SQLite transaction containing its clock receipt, checkpoint, station economy, consumption, frontier changes, mission changes, NPC movement, transit encounters, voyage logs, research progress, production, market updates, freight generation, treasury evidence, and audit summary. Any invalid or stale before-state rejects the complete cycle.

Player route and freight actions use the same exclusive world lock but do not advance the passive clock. Each explicit action commits or rolls back independently against the current durable world state.

## Build and verification

```text
gradle build
gradle verifyWorldStore
```

The verification chain covers:

- Fresh and legacy migration through schema 009.
- Official vessel imports, rollback, campaign mapping, and snapshot chronology.
- Version-22 normalization and master-world replacement rejection.
- Deterministic clock replay, command ordering, checkpoints, and restart recovery.
- Shared player/NPC transit replay and hazard diversity.
- Station economy, missions, NPC assignment, voyages, encounters, and research.
- Item catalogue, inventory, vendor offers, production, freight, and treasury entries.
- Per-tick station consumption with deterministic variation.
- Slow shortage accumulation, degradation, population capacity, and frontier contraction.
- Delivery-driven shortage reduction and station recovery.
- Stable-surplus frontier expansion and outward NPC missions.
- Deterministic monster attacks and defensive NPC responses.
- UUID compatibility of frontier-generated missions.
- Player freight loading, route traversal, docking, delivery, inventory transfer, treasury effects, and civilization support.
- A real timed Passive Mode cycle and fault-contained recovery.

The workflow `.github/workflows/barotrauma-desktop.yml` compiles with Java 17 and runs this chain for desktop-project changes.

## Entry points

```text
io.github.mrcalzon02.barotrauma.desktop.BarotraumaWorldSimApplication
io.github.mrcalzon02.barotrauma.desktop.registry.WorldMapRegistryWindow
io.github.mrcalzon02.barotrauma.desktop.frontier.CivilizationFrontierWindow
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
9. Variable station consumption, slow shortage degradation, monster pressure, civilization contraction, recovery, and expansion.

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
