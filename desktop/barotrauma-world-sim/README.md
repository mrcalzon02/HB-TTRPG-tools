# Barotrauma World Simulation Toolbox

Independent Java 17 Swing migration of the Barotrauma RPG Operations Suite.

## Current status

The desktop project now includes:

- A Java 17 Swing shell with stable workspace navigation and a process-wide selected-world session.
- Inspection-first version-22, `.save`, and `.sub` compatibility.
- Duplicate-safe source, submarine-definition, physical-vessel, and snapshot identities.
- Atomic vessel imports, campaign mapping, snapshot chronology, rollback, and read-only registries.
- Sequential SQLite migrations through **schema 014** for fresh and existing desktop worlds.
- A deterministic canonical-time clock, one logical writer, immutable command receipts, reviewed checkpoints, stale-state rejection, and restart recovery.
- A live Europa World Map with explicitly controlled **Passive Mode**.
- Transactional station, NPC vessel, route, mission, research, encounter, production, freight, market, treasury, consumption, civilization-frontier, fleet-response-transit, ecology, geology, natural-resource, extraction, depletion, and renewable-recovery workloads.
- Explicit imported-player-vessel enrollment, route planning, shared transit challenges, docking, freight loading, and delivery.
- Automatic timed cycles while Passive Mode is enabled.
- Local donor-installation discovery for Barotrauma graphical assets, with packaged binary PNG and procedural fallbacks.
- A milestone-backed **Development Plan** for desktop NPC population, settlement expansion and contraction, faction influence, creature populations, observation history, and long-running installed operation.

No website behavior has been removed or redirected. The web suite remains the behavioral reference while desktop parity is developed.

A normalized version-22 world imports with simulation disabled and paused. Passive Mode begins only after the operator explicitly enables it from the World Map. Once enabled, one process-wide scheduler owns that world. Every cycle advances the deterministic clock and commits all passive workload changes together; a failed cycle rolls back and faults closed.

## Development Plan

The governing desktop expansion roadmap is:

```text
DEVELOPMENT_PLAN.md
```

The Development Plan divides passive observation work into significant milestones and smaller vertical development slices. Each milestone requires persistence, deterministic behavior, desktop visibility, failure handling, migration coverage, verification, and documentation before it may be marked complete.

The current planned sequence begins with observation vocabulary and schema 015, then adds NPC population and settlement lifecycle behavior, faction influence, persistent creature populations, NPC–creature interaction, a unified Desktop Observation Center, historical replay, watchlists, long-running tray operation, and only later browser snapshot compatibility.

## Requirements

- JDK 17
- A locally installed Gradle capable of building a Java 17 project
- Optional: a locally installed copy of Barotrauma for donor graphical assets

A Gradle wrapper will be added with release automation. Until then, run commands from `desktop/barotrauma-world-sim`.

## Graphical asset setup

```text
gradle runAssetSetup
```

The setup window searches common Windows, Linux, Flatpak Steam, and macOS Barotrauma locations. It also reads Steam `libraryfolders.vdf` files so installations on additional disks can be found.

The user may choose:

- **Automatic** — re-scan Steam libraries and use the first validated donor installation.
- **Manual** — retain an explicitly selected Barotrauma installation, app bundle, executable directory, or `Content` directory.
- **Fallback only** — never read donor files and use the packaged independent fallback artwork.

Only the local path and selection mode are stored in:

```text
~/.barotrauma-world-sim/assets.properties
```

Official Barotrauma assets are referenced from the user's installation at runtime. They are never copied into this repository or a release package. If the parent game is removed, moved, or unavailable, each unresolved logical role automatically uses its packaged or procedural fallback.

Common default locations include:

```text
C:\Program Files (x86)\Steam\steamapps\common\Barotrauma
C:\Program Files\Steam\steamapps\common\Barotrauma
~/.local/share/Steam/steamapps/common/Barotrauma
~/.steam/steam/steamapps/common/Barotrauma
~/.var/app/com.valvesoftware.Steam/.local/share/Steam/steamapps/common/Barotrauma
~/Library/Application Support/Steam/steamapps/common/Barotrauma
```

On macOS, the asset tree normally resolves under `Barotrauma.app/Contents/MacOS/Content`.

See `docs/donor-assets.md` for validation, custom-library, packaging, and redistribution rules.

## Run the desktop shell

```text
gradle run
```

Opening a desktop world in one participating window updates the shared selection across the application process.

## Live World Map and Passive Mode

```text
gradle runWorldRegistry
gradle runGraphicalWorldMap
```

The World Map registry provides canonical time, locations, stations, NPC voyages, missions, routes, research, encounters, and Passive Mode controls. The graphical map displays locations, active NPC routes, vessel conditions, and donor-backed or fallback map assets.

Passive Mode cadence ranges from one second to one hour and from one to 1,000 canonical ticks per cycle. A multi-tick catch-up processes station, civilization, fleet-response transit, ecology, geology, extraction, and renewable-recovery changes one canonical tick at a time. Closing the World Map does not stop an enabled process-wide scheduler.

Only one passive scheduler is created for a world in the application process. The manual clock monitor becomes read-only while that scheduler owns the writer.

## Station consumption and civilization frontier

```text
gradle runCivilizationFrontier
```

Every active station consumes supplies on every passive tick. Consumption is deterministic for replay but varies around each station’s local baseline. Ration inventory covers demand first; uncovered demand accelerates abstract supply loss. This prevents a station from sustaining itself indefinitely without regular deliveries.

Shortages are deliberately slow rather than immediately catastrophic. Integrity, security, industry, population capacity, civilization strength, and frontier position deteriorate at different milestone rates. Deliveries arrest decline and allow later ticks to create recovery and gradual expansion.

The civilian frontier uses five states:

- `EXPANDING`
- `HOLDING`
- `CONTESTED`
- `CONTRACTING`
- `ABANDONED`

Fauna pressure grows when stations are threatened or undersupplied and recedes when security is strong. Deterministic monster attacks can damage integrity, reduce security, increase threat, and force the civilian perimeter inward. Contraction creates defense and fauna-clearing work; recovery and expansion create outward research or transit work.

## Fleet response transit, rescue, and towing

Disabled NPC vessels create durable `RESCUE` or `TOWING` operations. Besieged stations create `REINFORCEMENT` operations. The operation model also supports `REPAIR`, `REFUEL`, and `REARM` categories.

Qualified Salvage, Patrol, and Courier vessels receive response priority. A vessel assigned to an active response is protected from ordinary world-mission assignment.

Every response now follows explicit phases:

- `WAITING`
- `OUTBOUND`
- `ON_SCENE`
- `RETURNING`
- `COMPLETE`

Assignment creates a physical outbound transit leg. The responder uses the same deterministic NPC transit engine as ordinary voyages and can encounter thermal vents, ice shear, mechanical failures, fauna, current reversals, and navigation blackouts. Recovery progress is blocked until the responder reaches the target.

On scene, the origin station must possess the declared quantities of fabricated steel, fuel rods, coilgun ammunition, and medical supplies. Those materials are committed once. On-scene completion creates a second return or towing leg rather than teleporting the casualty home.

The casualty remains disabled until the responder survives the return leg and reaches home. If a responder is disabled or lost in either direction, the operation returns to the response queue with its attempt history preserved. Already committed materials are not charged again when a replacement responder completes the return.

## Natural world, extraction, ecology, and geology

```text
gradle runNaturalWorld
```

Every normalized world location receives persistent ecological state:

- Primary producers and microbial activity.
- Algal blooms.
- Herbivore biomass.
- Predator biomass and feeding-ground migration pressure.
- Scavenger biomass.
- Biological accumulator mass.
- Nutrient load.
- Habitat integrity.

Producer and algal growth support herbivore expansion. Herbivore concentrations support predator expansion. Predator migration can increase nearby station threat and generate fauna-clearing work. Scavengers recycle biological material, while sustained biological activity can expose renewable Bioactive Accumulator or Algae Harvest sites.

Every location also receives geological state:

- Tectonic stress.
- Hydrothermal activity.
- Mineral exposure.
- Cave instability.
- Sediment flux.

Hydrothermal eruptions and rockfalls can expose ore veins, rare minerals, and hydrothermal deposits. Geological activity changes richness and accessibility rather than treating resources as a permanently static catalogue.

Natural activity feeds the NPC mission queue:

- Ore veins and rare minerals create `MINING` work.
- Hydrothermal and bioactive sites create `RESEARCH` work.
- Algae harvest sites create `SALVAGE` work.
- Predator feeding-ground expansion creates `FAUNA_CLEARING` work.

Schema 013 gives each natural-resource site a finite reserve, carrying capacity, harvesting rate, recovery state, extraction count, and last-harvest evidence. Completed resource missions create one capability-sensitive extraction batch and one typed freight lot. Mineral extraction reduces exposure and increases cave instability; biological harvesting reduces biomass and habitat integrity.

Nonrenewable mineral sites remain depleted at zero reserve. Renewable algae and bioactive sites enter dormancy, recover according to local habitat integrity, and return to the mission queue with a bounded fraction of carrying capacity.

The natural-world console exposes ecology, geology, resource reserves, recovery progress, extraction history, fleet-response phases, outbound and return legs, response-linked transit hazards, and completion logs while Passive Mode runs.

See `NATURAL_WORLD.md` for the detailed subsystem boundary.

## Station logistics, markets, and freight

```text
gradle runStationLogistics
```

The logistics console exposes item definitions, production recipes, station inventory, vendor offers, production runs, freight lots, and treasury entries.

Each passive cycle consumes supplies, permits ration recovery, runs at most one affordable recipe per station, deducts costs, reprices vendors, and creates freight opportunities where shortages and surpluses coexist. The former rule that granted every functioning station free ore each cycle has been removed.

Natural extraction delivers Raw Europan Ore, Rare Europan Minerals, Hydrothermal Compounds, Bioactive Compounds, or Algae Biomass through the existing freight pipeline. Player and NPC deliveries update inventory, treasury evidence, station condition, civilization support, and the material base required for fleet recovery.

## Imported player-vessel transit and freight

```text
gradle runPlayerTransit
```

An imported physical vessel can be enrolled without changing its definition, physical identity, or snapshot chronology. The player transit console supports enrollment, source loading, route planning, one deterministic transit challenge at a time, docking, and delivery at the declared destination.

Player and NPC voyages call the same dependency-free deterministic transit resolver. Current hazards include thermal vent fields, ice shear, ballast failure, reactor instability, hostile fauna, abyssal predators, current reversals, and navigation blackouts.

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
- **Schema 010** — fleet-response operations, ecology, geology, natural events, and exposed renewable or mineral resource sites.
- **Schema 011** — immediate response assignment, responder reassignment after docking, and material-gated recovery progress.
- **Schema 012** — responder protection from ordinary missions and natural-resource or predator-driven NPC mission generation.
- **Schema 013** — finite resource reserves, typed extraction batches, legacy-reward restoration, freight settlement, permanent mineral depletion, and renewable dormancy/regrowth.
- **Schema 014** — response phases, outbound and return/towing transit legs, response-linked encounters, one-time material commitment, retry attempts, and final recovery after home arrival.

A passive cycle is one SQLite transaction containing its clock receipt, checkpoint, station economy, consumption, frontier changes, response assignment and transit, on-scene recovery, return or towing travel, ecological and geological changes, resource exposure, extraction batches, depletion or recovery, mission changes, NPC movement, transit encounters, voyage logs, research progress, production, markets, freight, treasury evidence, and audit summary.

## Build and verification

```text
gradle build
gradle verifyWorldStore
gradle verifyVisualAssets
```

The verification chain covers:

- Donor installation validation, saved local pointers, donor-first selection, atlas cropping, and fallback-only resolution.
- Packaged PNG and procedural fallback resources for graphical roles.
- Fresh and legacy migration through schema 014.
- Official vessel imports, rollback, campaign mapping, and snapshot chronology.
- Version-22 normalization and master-world replacement rejection.
- Deterministic clock replay, command ordering, checkpoints, and restart recovery.
- Shared player/NPC transit replay and hazard diversity.
- Station economy, consumption, civilization movement, missions, NPC assignment, voyages, encounters, and research.
- Item catalogue, inventory, vendor offers, production, freight, and treasury entries.
- Delivery-driven station recovery and frontier expansion.
- Monster attacks and defensive NPC responses.
- Immediate fleet-response assignment and responder reservation.
- Outbound response transit before on-scene progress.
- Response-linked transit encounters and arrival evidence.
- Material stalling before resupply and one-time material commitment afterward.
- A second return or towing leg before casualty restoration.
- Retry-safe reassignment after responder loss without duplicate material consumption.
- Ecology and geology initialization for every normalized location.
- Algal blooms, predator feeding-ground expansion, hydrothermal or rockfall events, and bioactive accumulator sites.
- Natural-resource and predator events entering the shared NPC mission queue.
- Finite reserve initialization and bounded capability-sensitive extraction.
- Exact removal of historical generic mission rewards before real freight settlement.
- Typed resource delivery into station inventory and site-attributed treasury evidence.
- Renewable dormancy, recovery, recurring missions, and permanent nonrenewable depletion.
- A real timed Passive Mode cycle and fault-contained recovery.

The workflow `.github/workflows/barotrauma-desktop.yml` compiles with Java 17 and runs this chain for desktop-project changes.

## Entry points

```text
io.github.mrcalzon02.barotrauma.desktop.BarotraumaWorldSimApplication
io.github.mrcalzon02.barotrauma.desktop.assets.DonorAssetSetupWindow
io.github.mrcalzon02.barotrauma.desktop.registry.WorldMapRegistryWindow
io.github.mrcalzon02.barotrauma.desktop.registry.DonorBackedWorldMapWindow
io.github.mrcalzon02.barotrauma.desktop.frontier.CivilizationFrontierWindow
io.github.mrcalzon02.barotrauma.desktop.nature.NaturalWorldAndFleetWindow
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

Completed baseline:

1. Desktop shell, architecture baseline, stable identities, and safe import inspection.
2. Official vessel transactions, campaign mapping, snapshot chronology, and registries.
3. Normalized version-22 master-world import and world registry.
4. Deterministic clock, single-writer commands, receipts, checkpoints, and recovery.
5. Automatic Passive Mode scheduling.
6. Station rise/fall state, missions, NPC vessels, routes, research, encounters, and voyage logs.
7. Item-level station catalogue, inventory, vendor, production, freight, and treasury state.
8. Imported player-vessel enrollment, route planning, shared transit challenges, docking, freight loading, and delivery.
9. Variable station consumption, slow shortage degradation, monster pressure, civilization contraction, recovery, and expansion.
10. Material-gated NPC rescue, towing, repair, refuel, rearm, and station reinforcement operations.
11. Passive ecological regrowth, food-web movement, predator feeding-ground expansion, biological accumulation, geological activity, and natural-resource exposure.
12. Natural-resource, predator, and fleet-response integration with the shared NPC mission system.
13. Donor Barotrauma asset discovery, local pointer storage, atlas-aware lookup, independent fallbacks, setup UI, and packaging boundaries.
14. Finite resource harvesting, depletion, typed freight settlement, environmental impact, renewable dormancy, and recovery.
15. Fleet responder outbound travel, on-scene gating, return and towing transit, shared hazards, retries, and final home-arrival recovery.
16. Graphical donor-backed world-map rendering and focused visual-asset verification.

Active development direction:

1. Milestone 1.1 — observation vocabulary and invariants.
2. Milestone 1.2 — schema 015 population, territory, influence, flow, event, and snapshot foundations.
3. Milestone 1.3 — read-only ObservationRegistry and changed-since-tick queries.
4. Milestone 1.4 — initial desktop population and creature observation surfaces.
5. Milestone 2 — NPC population accounting and settlement lifecycle.

See `DEVELOPMENT_PLAN.md` for all milestone slices, completion gates, verification requirements, and the incremental Development Record.

## Governing documents

- `DEVELOPMENT_PLAN.md`
- `../../docs/barotrauma-desktop-baseline.md`
- `../../docs/barotrauma-desktop-architecture.md`
- `NATURAL_WORLD.md`
- `docs/donor-assets.md`

The Development Plan governs milestone sequencing and incremental progress records. The baseline fixes compatibility and simulation requirements. The architecture document fixes dependency direction, identity boundaries, importer isolation, and concurrency rules. Focused subsystem documents describe the behavior that is already implemented.

## Local files

World databases, logs, imported-source evidence, attachments, backups, exports, and donor asset configuration belong under local runtime directories and are ignored by Git. Sanitized fixtures must remain separate and must not contain private player information or copied proprietary game assets.
