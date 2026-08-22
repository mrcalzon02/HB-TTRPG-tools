# Living World Observer Implementation Plan

Status: **Active**

This document is the focused implementation plan for Milestone 6 of the desktop Barotrauma World Simulation Toolbox. The authoritative high-level roadmap remains `DEVELOPMENT_PLAN.md`; this file is the executable product path for turning the existing passive simulation into the living Barotrauma World Observer.

## Product definition

The target is one desktop application in which Europa can continue operating while the user watches the committed world rather than manually driving it.

The finished observer must provide a coherent surface where:

- Passive Mode advances the authoritative SQLite world while the observer is open.
- NPC submarines visibly travel between locations instead of teleporting between endpoints.
- Ships encounter hazards, take damage, complete missions, deliver freight, respond to distress calls, recover, fail, and return home according to the existing simulation.
- Stations produce, consume, trade, gain and lose population, receive migrants, sponsor settlement work, and experience faction and environmental pressure.
- Natural ecology, geology, resource extraction, wildlife pressure, and disasters remain authoritative simulation outputs rather than decorative overlays.
- The user can zoom from a world-scale overview down to individual stations, routes, and submarines.
- Visible entities expose human-readable evidence explaining what is happening and why.
- A recent-history stream exposes the world's continuing trials and consequences without becoming a second simulation authority.

A release is not a functioning World Observer merely because a Java window opens or database tables can be viewed.

## Non-negotiable architecture

1. `PassiveWorldSimulationService` remains the only automatic scheduler for an authoritative desktop world.
2. Simulation mutation remains transactional and single-writer.
3. Observer registries and presentation models remain read-only.
4. Visual positions, layers, dossiers, and timelines are derived from committed state.
5. Closing the observer does not implicitly disable persisted Passive Mode.
6. Pausing Passive Mode is an explicit operator action.
7. Barotrauma donor assets remain optional/local-only; procedural fallback visuals must remain sufficient.
8. Detailed registry/evidence windows remain valid advanced/debug surfaces while the unified observer is completed.

## Delivery gates

### Gate 0 — Simulation correctness

**Status: Complete**

The fleet-response verification defect was reproduced and repaired. The responder was physically returning and becoming `DOCKED`, but same-tick recursive dispatch could immediately consume that docking transition and assign the vessel again.

Implemented:

- centralized current-schema dispatch repair in `FleetResponseDispatchPolicy`;
- guards on both automatic dispatch paths against same-completion-tick redispatch;
- completion docking barrier preventing a just-returned responder from re-entering `PREPARING` or `IN_TRANSIT` in the same tick;
- verification of outbound response transit, on-scene work, towing/return transit, casualty recovery, responder return, and final docking.

The full desktop persistence/simulation verification suite has passed after this repair.

### Gate 1 — Living observer shell

**Status: Complete**

Implemented:

- dedicated `BarotraumaWorldObserverApplication` entry point;
- shared authoritative world session;
- automatic resume of previously enabled Passive Mode;
- explicit Run/Pause Passive controls;
- cadence and ticks-per-cycle controls;
- scheduler-driven refresh with bounded two-second fallback refresh;
- committed route-progress interpolation for NPC submarine positions;
- hull, supplies, destination, incident progress, and ETA hover evidence;
- zoom in/out, Fit World, Ctrl+mouse-wheel zoom, and drag panning;
- listener cleanup without silently disabling persisted Passive Mode.

### Gate 2 — Interactive entity inspectors

**Status: Active — core map entities complete**

Implemented:

- stable UUID-backed selection survives live refresh;
- clickable NPC vessels;
- clickable stations/locations;
- clickable NPC transit routes;
- selected entity highlighting;
- persistent live vessel, station/location, and route dossiers;
- empty-map/World Overview return path.

Current vessel dossiers include identity, role, state, hull, supplies, cargo, crew capabilities, mission, route progress, ETA, delays, incident schedule, voyage evidence, encounters, fleet-response roles, response transit, freight, and treasury settlement evidence.

Current station/location dossiers include geography, faction, economy, population, local/inbound traffic, missions, response operations, freight, treasury, ecology, geology, natural resources, extraction history, migration, settlement projects, faction presence, and creature populations.

Remaining dedicated selectable entity classes:

- mission/contract;
- encounter/incident;
- fleet-response operation;
- natural resource site/event;
- migration flow;
- settlement project;
- later historical timeline entries.

### Gate 3 — Human-readable causal documents

**Status: Active — major causal chains integrated**

Implemented document families:

- mission/contract summaries;
- voyage reports;
- encounter reports;
- fleet-response operation dossiers;
- response event logs;
- outbound/return response transit legs;
- NPC freight manifests;
- treasury/settlement records;
- station freight/trade ledgers;
- station treasury ledgers;
- population accounting ledgers;
- migration manifests;
- settlement project reports;
- natural-world ecology/geology/resource evidence;
- extraction ledgers and natural-event reports.

Still required:

- dedicated damage/repair report beyond voyage/response evidence;
- research report navigation;
- direct document index/navigation so a specific causal record can be selected instead of only appearing inside a dossier;
- stable cross-links from timeline event → entity → causal document.

### Gate 4 — Observer layers and world readability

**Status: Active — principal live layers integrated**

The live viewport now loads the authoritative passive, natural-world, and observation registries together and derives visual overlays without mutating the world.

Implemented layer controls:

- ecology pressure;
- geology hazards;
- natural resources;
- recent natural incidents;
- fleet-response operations;
- population / population pressure;
- migration corridors;
- settlement activity;
- faction influence;
- creature pressure.

Implemented evidence integration:

- `WorldObserverNaturalLayer` provides location/world natural-world dossiers and normalized hazard/opportunity signals;
- `WorldObserverCivilLayer` provides population, population-ledger, migration, settlement, faction, and creature dossiers/signals;
- clicked locations expose the committed records behind the visible overlays;
- location hover evidence includes environmental hazard/opportunity, population, migration, creature pressure, and dominant faction data.

Implemented large-world readability:

- `WorldObserverLevelOfDetail` assigns importance from committed natural/civil signals;
- low-value generic labels and markers collapse at world scale;
- stations, selected locations, and high-signal trouble/opportunity locations remain visible;
- detail progressively returns as zoom increases;
- headless contracts verify the projection and LOD policies used for the 960-location observer surface.

Remaining Gate 4 work:

- dedicated map interaction for migration/settlement/fleet/natural markers rather than location-only inspection;
- optional station economy and mission overlays;
- visual legend refinement and density tuning against a real 960-location master world;
- clustering/aggregation if runtime testing shows marker density is still excessive.

### Gate 5 — Temporal observation

**Status: Active — live recent-history timeline implemented**

`WorldObserverTimeline` now merges committed evidence from multiple subsystems into one descending-tick stream:

- NPC voyage events;
- transit encounters;
- fleet-response events;
- station treasury/economic settlement entries;
- natural-world incidents;
- observation/civilization events;
- population ledger changes;
- migration updates;
- settlement-project updates.

`World Overview` renders this recent world timeline beneath the current world/environment/civilization summaries. Timeline entries carry a stable evidence key, tick, category, entity identity, title, details, and bounded severity.

Remaining Gate 5 work:

- timeline filtering by category/entity/severity;
- jump from timeline event to the related map entity/dossier;
- pause live rendering without pausing simulation;
- manual Step control in the observer shell;
- historical snapshot selection;
- compare two ticks/snapshots;
- non-mutating replay/scrub mode;
- visually distinct Live versus Historical state.

### Gate 6 — Long-running observer operation

**Status: Planned**

Required:

- restart recovery of enabled Passive Mode;
- bounded catch-up after downtime;
- observer-visible health/fault status;
- automatic checkpoints/backups according to existing storage contracts;
- rendering throttled independently from accelerated simulation;
- proof that duplicate schedulers cannot run for one world;
- listener/resource-leak tests for repeated open/close cycles;
- unattended soak test with continuing voyages, economy, ecology, migration, and fleet response.

### Gate 7 — Release and packaging

**Status: Planned**

The standalone artifact must launch `BarotraumaWorldObserverApplication`, not the evidence-only Observation Foundation window.

Release acceptance scenario:

1. Start from a clean packaged Windows build.
2. Open or generate a valid master world.
3. Enable Passive Mode.
4. Observe at least one NPC vessel depart.
5. Watch it visibly advance along its route.
6. Observe at least one transit encounter/difficulty.
7. Observe at least one trade/freight mission alter station economic state.
8. Inspect vessel, route, station, mission, encounter, freight, and resulting economic evidence.
9. Observe population/migration/settlement or environmental activity through the world layers.
10. Pause and resume Passive Mode.
11. Close/reopen and confirm configured Passive Mode resumes correctly.
12. Complete a fleet-response cycle with casualty and responder in valid final authoritative states.
13. Run the full verification suite successfully.
14. Run a packaged observer smoke test.
15. Only then publish the executable/portable package.

## Current implementation order

1. ~~Restore fleet-response verification.~~ **Complete.**
2. ~~Build the living observer shell.~~ **Complete.**
3. ~~Integrate core vessel/station/route selection.~~ **Complete.**
4. ~~Integrate principal natural and civilization overlays.~~ **Complete first pass.**
5. ~~Add large-world LOD policy.~~ **Complete first pass.**
6. ~~Add unified recent world timeline.~~ **Complete first pass.**
7. **Next:** make mission, encounter, response, migration, settlement, and natural-event evidence directly selectable/jumpable.
8. Add timeline filters, historical snapshots, comparison, and replay.
9. Prove unattended/soak operation.
10. Repoint standalone packaging to the living observer.
11. Run the packaged end-to-end acceptance scenario and publish only after it passes.

## Verification policy

The PR-scoped `Verify Barotrauma living world observer` workflow is the active development gate. It runs:

- the full Java 17 desktop simulation/persistence verification suite;
- natural-world observer projection verification;
- civilization observer projection verification;
- level-of-detail/readability verification;
- unified timeline verification.

A new observer slice is not promoted merely because it compiles.

## Development record — 2026-08-21

- Added dedicated living observer application entry point and Passive Mode controls.
- Added committed route interpolation and live submarine movement.
- Repaired the fleet-response same-tick responder redispatch defect and restored full verification.
- Added stable click selection and persistent vessel/station/route dossiers.
- Integrated mission, voyage, encounter, fleet-response, freight, and treasury evidence.
- Added ecology, geology, resource, natural-event, population, migration, settlement, faction, and creature evidence models.
- Added switchable natural and civilization viewport layers.
- Added world-scale label/marker level-of-detail policy for the 960-location world.
- Added a unified recent-world timeline in World Overview.
- Expanded the PR workflow so the observer-specific projection policies execute as headless contracts in addition to the full simulation suite.

## Next implementation slice

Promote the timeline and overlay records from passive evidence to **direct navigation targets**: selectable mission, encounter, fleet-response, migration, settlement, and natural-event records with stable IDs and jump-to-entity/map behavior. This is the bridge from a readable observer to an actually explorable history of the world's individual trials and consequences.
