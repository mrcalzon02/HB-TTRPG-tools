# Barotrauma World Simulation Toolbox

Independent Java 17 Swing migration of the Barotrauma RPG Operations Suite.

## Current status

The desktop project now includes:

- A Java 17 Swing shell with stable workspace navigation and a process-wide selected-world session.
- Inspection-first version-22, `.save`, and `.sub` compatibility.
- Duplicate-safe source, submarine-definition, physical-vessel, and snapshot identities.
- Atomic vessel imports, campaign mapping, snapshot chronology, rollback, and read-only registries.
- Sequential SQLite migrations through **schema 026** for fresh and existing desktop worlds.
- A deterministic canonical-time clock, one logical writer, immutable command receipts, reviewed checkpoints, stale-state rejection, and restart recovery.
- A live Europa World Map with explicitly controlled **Passive Mode**.
- Transactional station, NPC vessel, route, mission, research, encounter, production, freight, market, treasury, consumption, civilization-frontier, fleet-response-transit, ecology, geology, natural-resource, extraction, depletion, and renewable-recovery workloads.
- Explicit imported-player-vessel enrollment, route planning, shared transit challenges, docking, freight loading, and delivery.
- Persistent schema-015 NPC populations, creature guild populations and territories, faction presence, population-flow records, observation events, snapshots, metrics, and watch-rule storage.
- Conserved schema-016 NPC population reconciliation and ledger accounting against the established civilization frontier.
- A strictly query-only `ObservationRegistry` and read-only desktop Observation Foundation window.
- Automatic timed cycles while Passive Mode is enabled.
- Local donor-installation discovery for Barotrauma graphical assets, with packaged binary PNG fallbacks.
- A retained install inventory and categorized import-candidate index for future local graphics, audio, music, background, UI, map, creature, item, and effects integration.
- An immutable desktop-side local media catalog with content-root isolation, SHA-256 metadata fingerprints, retained-index parsing, traversal rejection, and available/changed/missing resolution states.
- A distributable original-audio seed library containing 20 project-owned effects and five project-owned music tracks, kept separate from local-install donor media.
- Event-backed resident and workforce headcounts, allocation-backed faction defense plans, exact passive-command provenance, and enforced explanation coverage for authoritative population mutations.
- Time-gated NPC voyage legs whose persisted incident budget comes from the shared player route approximation, with quiet elapsed progress, deterministic auto-resolved incident slots, cumulative delay and revised arrivals, fleet-response links, and live observer progress/incident reports.
- An accepted economy roadmap in which generated worlds contain 1.5–2.0 million people across a feasible 80–120 principal habitats; imported worlds retain their supplied bounds and may classify surplus source nodes as auxiliary installations. Ownership, demographics, institutions, control, professional labor, essential-service burden, interdependent production, and expansion remain distinct state. The same roadmap specifies replacing crewless NPC bootstrapping with persisted training/build variance, role-valid crew congregation, physical hull provenance and acquisition, capable-yard construction, full-complement NPC commissioning, and an explicit player skeleton-crew exception.

No website behavior has been removed or redirected. The web suite remains a compatibility reference while the desktop becomes the authoritative simulation and observation client.

A normalized version-22 world imports with simulation disabled and paused. Passive Mode begins only after the operator explicitly enables it from the World Map. Once enabled, one process-wide scheduler owns that world. Every cycle advances the deterministic clock and commits all passive workload changes together; a failed cycle rolls back and faults closed.

## Development plans

`DEVELOPMENT_PLAN.md` governs the observation and population lifecycle: its Observation Foundation and conserved population-accounting slices are complete. The economy and station continuation is tracked in `docs/development-milestone-ledger.md`; E1 macro-population feasibility and policy profiles are the current implementation slice.

Every milestone requires persistence, deterministic behavior, desktop visibility, failure handling, migration coverage, verification, and documentation before it is marked complete.

## Requirements

- JDK 17 or newer
- Network access on the first setup so the pinned SQLite JDBC runtime can be downloaded and checksum-verified
- Optional: a locally installed copy of Barotrauma for donor graphical assets

No Gradle installation or wrapper is used. Run the commands below from `desktop/barotrauma-world-sim`. The Windows launcher calls the PowerShell toolbox, compiles with the JDK, packages the application, and keeps generated files under ignored `build/no-gradle` and `lib` directories.

## Graphical asset setup

```text
toolbox.cmd asset-setup
```

The setup window searches common Windows, Linux, Flatpak Steam, and macOS Barotrauma locations. It also reads Steam `libraryfolders.vdf` files so installations on additional disks can be found.

The user may choose:

- **Automatic** — re-scan Steam libraries and use the first validated donor installation.
- **Manual** — retain an explicitly selected Barotrauma installation, app bundle, executable directory, or `Content` directory.
- **Fallback only** — never read donor files and use the packaged neutral PNG artwork.

Only the local path and selection mode are stored in:

```text
~/.barotrauma-world-sim/assets.properties
```

Official Barotrauma assets are referenced from the user's installation at runtime. They are never copied into this repository or a release package. If the parent game is removed, moved, or unavailable, each unresolved logical role automatically uses its packaged fallback PNG.

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

The repository-level scanner at `../../data/barotrauma/tools/index-barotrauma-install.bat` records the installed content layout for development and produces:

```text
data/barotrauma/tools/asset-index/all-files.csv
data/barotrauma/tools/asset-index/graphical-assets.csv
data/barotrauma/tools/asset-index/importable-assets.csv
data/barotrauma/tools/asset-index/index-summary.txt
```

The current planning snapshot contains 3,189 files and 2,003 categorized media candidates. These indexes provide relative-path metadata; the installed desktop client must still resolve the underlying media from the user's own validated Barotrauma installation.

## Run the desktop shell

```text
toolbox.cmd run
```

Opening a desktop world in one participating window updates the shared selection across the application process.

## Observation Foundation

```text
toolbox.cmd observation
```

The read-only observation window exposes world identity and time; NPC population cohorts; creature guild populations and territories; faction presence; population flows; causal events; snapshots; metric series; and changed-after-tick filtering. Schema 015 seeds this evidence from the established civilization and ecology state. Schema 016 adds conserved NPC population accounting and frontier reconciliation.

The registry enables SQLite query-only mode, rejects unsupported schemas, and retrieves selected-entity history without mutating the world. See `docs/observation-contract.md` and `docs/npc-population-accounting.md`.

## Live World Map and Passive Mode

```text
toolbox.cmd world-map
```

The World Map provides canonical time, locations, stations, NPC voyages, missions, routes, research, encounters, and Passive Mode controls.

Passive Mode cadence ranges from one second to one hour and from one to 1,000 canonical ticks per cycle. A multi-tick catch-up processes station, civilization, fleet-response transit, ecology, geology, extraction, and renewable-recovery changes one canonical tick at a time. Closing the World Map does not stop an enabled process-wide scheduler.

Only one passive scheduler is created for a world in the application process. The manual clock monitor becomes read-only while that scheduler owns the writer.

## Station consumption and civilization frontier

```text
toolbox.cmd frontier
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
toolbox.cmd natural-world
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
toolbox.cmd logistics
```

The logistics console exposes item definitions, production recipes, station inventory, vendor offers, production runs, freight lots, and treasury entries.

Each passive cycle consumes supplies, permits ration recovery, runs at most one affordable recipe per station, deducts costs, reprices vendors, and creates freight opportunities where shortages and surpluses coexist. The former rule that granted every functioning station free ore each cycle has been removed.

Natural extraction delivers Raw Europan Ore, Rare Europan Minerals, Hydrothermal Compounds, Bioactive Compounds, or Algae Biomass through the existing freight pipeline. Player and NPC deliveries update inventory, treasury evidence, station condition, civilization support, and the material base required for fleet recovery.

## Imported player-vessel transit and freight

```text
toolbox.cmd player-transit
```

An imported physical vessel can be enrolled without changing its definition, physical identity, or snapshot chronology. The player transit console supports enrollment, source loading, route planning, one deterministic transit challenge at a time, docking, and delivery at the declared destination.

Player and NPC voyages call the same dependency-free deterministic transit resolver. Current hazards include thermal vent fields, ice shear, ballast failure, reactor instability, hostile fauna, abyssal predators, current reversals, and navigation blackouts.

NPC travel is elapsed-time gated. Each leg persists the same two-to-24 challenge budget estimated for an equivalent player route, converts it to a versioned three-elapsed-ticks-per-challenge duration, and distributes exactly-once incident slots through that period. Quiet ticks still advance the vessel. Due incidents auto-resolve through the shared engine; their delays move the remaining slots and arrival estimate together. The NPC Voyages observer shows current progress, remaining ticks, resolved/planned incidents, next incident, original/revised arrival, hull, supplies, bounded progress reports, and terminal entries.

## Manual durable clock monitor

```text
toolbox.cmd simulation-monitor
```

When Passive Mode is off, the manual monitor permits enable, disable, explicit stepping, bounded catch-up, and explicit checkpoints. When Passive Mode is active, it becomes read-only and directs workload control back to the World Map.

## Import and registry workflows

```text
toolbox.cmd web-import
toolbox.cmd import-approval
toolbox.cmd campaign-mapping
toolbox.cmd vessel-registry
toolbox.cmd snapshot-approval
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
- **Schema 015** — NPC and creature observation populations, creature territories, faction presence, population flows, causal events, snapshots, metrics, watch rules, deterministic seeds, and read-optimized views.
- **Schema 016** — conserved NPC population reconciliation and ledgers that keep detailed cohorts aligned with the established civilization frontier.
- **Schema 017** — controlled causal event/reason vocabularies, versioned significance policy, station stories, arithmetic-checked typed changes, population events, resource-declared/bounded faction-plan contracts, and station history queries.
- **Schema 018** — transaction-scoped station baselines, one bounded consumption/shortage story per station tick, typed ration/supply/streak changes, and complete consumption-log causality coverage.
- **Schema 019** — durable production outcomes, automatic input and credit shortfalls, deterministic equipment failures and sabotage, one bounded story per attempt, and arithmetic-checked material, credit, and damage changes.
- **Schema 020** — carrier-neutral player/NPC freight baselines, one story per delivered lot, and typed inventory, credit, station-recovery, shortage, civilization, and fauna changes.
- **Schema 021** — measured pre/post snapshots for attacks and passive frontier movement, exact threat/damage/civilization arithmetic, direct recovery transitions, transition state evidence, and single-entry abandonment stories.
- **Schema 022** — explicitly distinguished imported-estimate/generated-allocation baselines followed by event-backed resident/workforce counts, proportional migration, measured attack casualties, direct or passive evacuation, and reconciliation coverage.
- **Schema 023** — actual-attack-backed faction plans, credit escrow, workforce assignment, ammunition reservation/consumption, defense execution, terminal settlement, and honest unfunded, understaffed, or legacy states.
- **Schema 024** — receipt-validated transaction-scoped command provenance for passive station stories without false attribution of direct actions.
- **Schema 025** — versioned explanation policy, complete command-scoped population mutation capture, state-tick diagnostics, and commit enforcement for uncovered or stale-tick resident/workforce changes.
- **Schema 026** — time-gated NPC transit legs, shared player-equivalent incident budgets, stratified due slots, stable resolver sequences, encounter/log links, cumulative delay, revised arrival, fleet-response linkage, and an active observer projection.

A passive cycle is one SQLite transaction containing its clock receipt, checkpoint, station economy, consumption, frontier changes, response assignment and transit, on-scene recovery, return or towing travel, ecological and geological changes, resource exposure, extraction batches, depletion or recovery, mission changes, NPC movement, transit encounters, voyage logs, research progress, production, markets, freight, treasury evidence, and audit summary.

## Build and verification

```text
toolbox.cmd setup
toolbox.cmd build
toolbox.cmd verify
```

`setup` downloads the pinned SQLite JDBC runtime once and verifies its published SHA-256 checksum. `verify` also performs setup automatically, rebuilds the JAR, and runs the complete contract chain.

The verification chain covers:

- Donor installation validation, saved local pointers, donor-first selection, and fallback-only resolution.
- Real packaged PNG fallback resources for station, vessel, fauna, and geology roles.
- Observation vocabulary, deterministic population and territory seeds, query-only histories, and conserved NPC population accounting.
- Fresh, legacy, and pre-renumber local-development migration through schema 026.
- Official vessel imports, rollback, campaign mapping, and snapshot chronology.
- Version-22 normalization and master-world replacement rejection.
- Deterministic clock replay, command ordering, checkpoints, and restart recovery.
- Shared player/NPC route-exposure estimation, deterministic transit replay, and hazard diversity.
- Quiet NPC progress without manufactured encounters; exactly-once due-slot resolution; slot/encounter/log reconciliation; cumulative-delay and revised-arrival arithmetic; and fleet-response transit integration.
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
- Complete station-consumption-to-story coverage, exact before/delta/after arithmetic, and cleanup of transaction-scoped causal baselines.
- Complete production-attempt-to-story coverage for success, input shortfall, credit shortfall, equipment failure, and sabotage, including exact input, output, credit, and integrity arithmetic.
- Player and NPC freight delivery stories with carrier attribution, exact inventory deltas, arithmetic reconciliation, and transaction-baseline cleanup.
- Measured attack, recovery, expansion, contraction, and abandonment stories with fauna attribution, exact typed deltas, transition evidence, bounded per-tick volume, and baseline cleanup.
- Event-backed resident/workforce migration, measured attack casualties, complete evacuation, exact population arithmetic, and zero unexplained cumulative headcount drift.
- Credit/workforce/ammunition-backed faction defense preparation and execution, single consumption, personnel release, consequence stories, and honest legacy/unfunded backing states.
- Exact passive-command provenance for station stories, no false command link on direct freight delivery, and cleanup of transaction-scoped provenance context.
- Enforced command-scoped resident/workforce mutation coverage with zero unexplained committed changes.

The workflow `.github/workflows/barotrauma-desktop.yml` compiles with Java 17 and runs this chain for desktop-project changes.

## Entry points

```text
io.github.mrcalzon02.barotrauma.desktop.BarotraumaWorldSimApplication
io.github.mrcalzon02.barotrauma.desktop.assets.DonorAssetSetupWindow
io.github.mrcalzon02.barotrauma.desktop.registry.WorldMapRegistryWindow
io.github.mrcalzon02.barotrauma.desktop.observation.ObservationFoundationWindow
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
10. Material-gated NPC rescue, towing, repair, refuel, rearm, and station reinforcement operations.
11. Passive ecological regrowth, food-web movement, predator feeding-ground expansion, biological accumulation, geological activity, and natural-resource exposure.
12. Natural-resource, predator, and fleet-response integration with the shared NPC mission system.
13. Donor Barotrauma asset discovery, local pointer storage, binary PNG fallbacks, setup UI, and packaging boundaries.
14. Finite resource harvesting, depletion, typed freight settlement, environmental impact, renewable dormancy, and recovery.
15. Fleet responder outbound travel, on-scene gating, return and towing transit, shared hazards, retries, and final home-arrival recovery.
16. Read-only donor-install scanning and a categorized media index covering graphics, music, ambience, creature audio/art, sound effects, backgrounds, UI, maps, items, fonts, video, and effects.
17. Secure desktop local-media catalog, retained-index reader, user-content exclusion, fingerprinting, stale-file detection, and background setup-window catalog inspection.
18. Schema-015 observation foundation: deterministic NPC and creature population seeds, faction presence, flows, snapshots, metrics, query-only registry, and desktop evidence window.
19. Schema-016 conserved NPC population accounting and frontier reconciliation.
20. Schema-017 station-causality foundation: event and reason contracts, significance policy, typed changes, population reconciliation, faction resource reservations, rollback verification, and read-only station history.
21. Schema-018 transaction-scoped causal collection for routine consumption and shortages, including typed ration, supply, shortage-streak, and surplus-streak changes.
22. Gradle-free JDK build, checksum-verified SQLite setup, one-command desktop launchers, and CI verification.
23. Fleet-response stabilization that prevents an on-scene or towed casualty from degrading to lost before home arrival.
24. Schema-019 production causality: success, material and credit shortfalls, equipment failure, sabotage, outcome diagnostics, bounded stories, and typed inventory, credit, and integrity changes.
25. Schema-020 delivery causality: normalized player/NPC baselines, carrier attribution, bounded freight stories, and typed inventory, trade, recovery, shortage, civilization, and fauna effects.
26. Schema-021 attack and frontier causality: measured before/after snapshots, exact damage and threat changes, direct recovery transitions, expansion/contraction evidence, and non-repeating abandonment.
27. Schema-022 authoritative population foundation: an explicit imported estimate, resident/workforce state, proportional immigration/emigration, measured attack casualties, evacuation, and reconciliation.
28. Schema-023 allocation-backed faction defense: funded preparation, exact credits/personnel/ammunition commitments, next-tick execution, and consequence stories.
29. Schema-024 command provenance: exact receipt/tick/canonical links for passive stories and honest non-attribution for direct transactions.
30. Schema-025 enforced mutation explanations for authoritative resident and workforce changes.
31. Schema-026 time-gated NPC voyages: shared player-equivalent challenge budgets, three-tick-per-challenge elapsed scheduling, quiet progress, persisted deterministic incident slots, shared autoresolution, cumulative delays and shifted due times, dual-gated arrival, fleet-response linkage, bounded voyage reports, and live observer progress/incident/ETA fields.
32. Original project audio seed library: 20 effects and five music tracks packaged as owned resources for the later opt-in desktop audio service.

Next:

1. Implement E1: generated/enrichment profiles, feasibility, principal/auxiliary classification, constrained faction shares, explicit `GENERATED_ALLOCATION` versus imported population provenance, versioned NPC complement and vessel/dock staffing budgets, once-sampled training/build variance, opening-fleet provenance, Barsuk fallback deadlines, and industrial-health thresholds.
2. Implement E2–E3: station archetype and categorical owner/controller/governor domains; normal/fallback hull provenance and normal/scrap-yard capability; conserved resident/presence/workforce/embarked cohorts; professional labor and paired migration; the 35%-of-residents essential-worker target; sampled prerequisite-based 30-to-180-day submariner training; role-valid organic/faction crew formation and congregation travel; full NPC versus player-skeleton billets; and conserved Barsuk child/remainder formation lineage.
3. Implement E4–E5: the 5% life-support threshold, explained `0.9^n` infrastructure decay/recovery, many-to-many station dependency cascades, model-specific capable-yard construction, Barsuk scrap-assembly inputs and nonproduction evidence, and cargo handling gated by ship and dock labor, equipment, storage, and elapsed time.
4. Implement E6–E7: cohort-, trained-crew-, and resource-backed station/fleet expansion; physical hull sale, lease, assignment, transfer, refit, construction and certified Barsuk fallback; local/remote acquisition, passenger travel, shipyard waiting, sea trials, full-complement NPC commissioning and crew split; named crew/cargo/subsystem consequences on schema-026 voyages; and strategic faction/organic decisions driven by fallback saturation and other causal evidence.
5. Implement E8 station/vessel history, ownership, economy, expansion, crew formation/recruitment/travel, sampled training/build forecasts, hull reservations, shipyard queues, commission blockers, watch coverage, dock throughput, paginated voyage replay, incident drill-through, knowledge labels, `Why Barsuk?`, shipyard health, and "Why did this change?" surfaces.
6. Add player-directed response/resource missions, acceptance, settlement, and faction consequences.
7. Connect indexed donor/fallback graphics and opt-in local audio roles to the desktop panels.
8. Add equipment-level cargo manifests, recent-world reopening, backups, packaging, and release automation.

## Governing documents

- `../../docs/barotrauma-desktop-baseline.md`
- `../../docs/barotrauma-desktop-architecture.md`
- `NATURAL_WORLD.md`
- `docs/donor-assets.md`
- `docs/asset-import-milestones.md`
- `DEVELOPMENT_PLAN.md`
- `docs/observation-contract.md`
- `docs/npc-population-accounting.md`
- `docs/development-milestone-ledger.md`
- `docs/station-causality-milestone.md`
- `docs/europa-economy-population-ownership-expansion.md`

The baseline fixes compatibility and simulation requirements. The architecture document fixes dependency direction, identity boundaries, importer isolation, concurrency rules, and implementation order.

## Local files

World databases, logs, imported-source evidence, attachments, backups, exports, and donor asset configuration belong under local runtime directories and are ignored by Git. Sanitized fixtures must remain separate and must not contain private player information or copied proprietary game assets.
