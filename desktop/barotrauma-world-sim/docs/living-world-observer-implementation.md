# Living World Observer Implementation Plan

Status: **Active — release path**

This is the authoritative implementation path for turning the Barotrauma desktop simulation into a passive, explorable Living World Observer. `DEVELOPMENT_PLAN.md` remains the high-level project roadmap; this document defines the product gate for the observer.

## Product target

The finished application is a double-clickable Windows desktop application in which Europa can continue operating while the user watches the committed world.

The observer must support:

- one authoritative Passive Mode scheduler advancing the SQLite world;
- NPC submarines visibly travelling between stations and locations;
- transit hazards, fauna encounters, delays, damage, rescue, fleet response, freight and trade;
- station production, consumption, treasury, population, migration, settlement, faction pressure and research;
- natural ecology, geology, resources, wildlife pressure and incidents;
- zoomable and pannable whole-world observation;
- selection of vessels, stations, routes and causal evidence;
- readable mission, voyage, encounter, freight, economy, population, migration, settlement and response records;
- a live recent-history timeline;
- historical evidence inspection without mutating the current world;
- unattended operation with visible runtime health and bounded restart catch-up.

A release is not considered a functioning World Observer merely because a Java window or database table opens.

## Architectural rules

1. `PassiveWorldSimulationService` is the only automatic simulation scheduler for an authoritative world.
2. All mutation stays inside the established single-writer transactional path.
3. Observer registries, projections, timelines and inspectors are read-only.
4. Visual positions and overlays are derived from committed state.
5. Closing an observer window never silently disables persisted Passive Mode.
6. Pausing Passive Mode is an explicit operator action.
7. Donor Barotrauma assets remain optional and local-only; fallback visuals must keep the observer functional.
8. Historical/replay presentation must never overwrite current authoritative state.
9. Release packaging must execute the Living World Observer entry point, not the legacy toolbox shell.

## Gate 0 — Simulation correctness

**Status: Complete**

Completed:

- reproduced the fleet-response responder docking defect;
- identified same-tick recursive redispatch after a responder returned home;
- guarded both automatic dispatch paths;
- added the responder completion docking barrier;
- verified outbound response, on-scene work, return transit, casualty recovery and final docking;
- restored the complete desktop persistence/simulation verification suite.

## Gate 1 — Living observer shell

**Status: Complete**

Completed:

- dedicated `BarotraumaWorldObserverApplication`;
- shared desktop world session;
- automatic resume of persisted Passive Mode;
- Run/Pause Passive controls;
- cadence and ticks-per-cycle controls;
- manual authoritative Step control;
- live scheduler notifications plus bounded refresh fallback;
- committed route-progress interpolation for NPC submarines;
- zoom, Fit World, Ctrl+mouse-wheel zoom and drag panning;
- live/frozen view distinction;
- listener cleanup without disabling the runtime.

## Gate 2 — Interactive entity inspection

**Status: Active — core interaction complete**

Completed:

- stable UUID-backed selection across refresh;
- clickable vessels;
- clickable stations/locations;
- clickable routes;
- selected-entity highlighting;
- persistent vessel, station/location and route dossiers;
- timeline-to-record navigation with stable IDs and map anchors;
- direct record inspection for missions, encounters, fleet response, freight, treasury, natural events, extraction, population, migration, settlement and civilization events.

Remaining:

- direct hit targets for non-location overlay symbols such as migration flows, settlement projects, fleet-response operations and natural-event markers;
- optional direct research-project selection;
- a unified document/index browser for records not currently visible on the map or timeline.

## Gate 3 — Human-readable causal documents

**Status: Active — major chains complete**

Implemented:

- mission/contract records;
- voyage reports;
- encounter/hazard reports;
- fleet-response dossiers and event logs;
- outbound and return fleet-response legs;
- freight manifests;
- station trade/freight ledgers;
- treasury/economic settlement records;
- population accounting ledgers;
- migration manifests;
- settlement project reports;
- natural ecology/geology/resource evidence;
- extraction and natural-event reports.

Remaining:

- dedicated damage/repair report beyond voyage/response evidence;
- research report navigation;
- stable cross-links between related documents where the causal chain spans multiple registries.

## Gate 4 — World layers and large-world readability

**Status: Active — principal layers complete**

Implemented layers:

- ecology;
- geology;
- natural resources;
- natural incidents;
- fleet response;
- population pressure;
- migration;
- settlement activity;
- faction influence;
- creature pressure.

Implemented readability:

- 960-location level-of-detail policy;
- low-value marker/label suppression at world scale;
- selected/station/high-signal locations remain visible;
- progressive detail as zoom increases;
- headless projection and LOD verification.

Remaining:

- direct interaction with overlay-specific markers;
- optional economy/mission overlays;
- real-master-world density tuning;
- clustering only if runtime tests prove it is needed.

## Gate 5 — Temporal observation

**Status: Active — first functional pass complete**

Implemented:

- merged recent-world timeline;
- category filtering;
- minimum-severity filtering;
- stable evidence keys;
- jump from timeline record to record dossier and map anchor;
- Freeze View without pausing simulation;
- manual Step when Passive Mode is paused;
- historical snapshot selection;
- previous-snapshot comparison;
- visibly distinct Live / Frozen / Historical evidence state.

Remaining:

- arbitrary two-snapshot comparison;
- timeline range controls;
- non-mutating replay/scrub presentation;
- richer event-to-event causal navigation.

## Gate 6 — Long-running observer operation

**Status: Active**

Already implemented:

- persisted Passive Mode restart recovery;
- bounded restart catch-up policy;
- process-wide single scheduler ownership;
- listener removal without stopping the simulation;
- runtime health model including cycles committed, cycle timing and faults;
- observer-visible Passive Mode running/fault status.

Current slice:

- add a sustained unattended observer soak verification;
- repeatedly query map/passive/natural/civil/timeline registries while the scheduler is writing;
- require continuing committed cycles and authoritative tick advancement;
- require no runtime fault and valid cycle health;
- require duplicate enable calls to retain one scheduler owner;
- require clean disable/cleanup.

Remaining after the first soak contract:

- longer accelerated soak against the large master world;
- explicit checkpoint/backup acceptance evidence;
- repeated UI open/close resource-leak test where practical outside headless CI;
- performance thresholds for large-world rendering independently of simulation cadence.

## Gate 7 — Release and packaging

**Status: Active**

Current slice:

- keep the project JAR/toolbox entry point available for development;
- repoint `jpackage` at `BarotraumaWorldObserverApplication`;
- package the installed application as **Barotrauma World Observer**;
- build a Windows `app-image` first;
- require `Barotrauma World Observer.exe` to exist;
- execute that packaged `.exe` with `--verify-launch`;
- only after the executable smoke test succeeds, build the MSI;
- keep the existing immutable release version unchanged during this development validation so a new public release is not falsely promoted.

Final release acceptance scenario:

1. Build from clean verified source.
2. Package a bundled-runtime Windows observer.
3. Launch the packaged executable successfully.
4. Open or generate a valid world.
5. Enable Passive Mode.
6. Observe an NPC vessel depart and visibly move along its route.
7. Observe at least one transit encounter/difficulty.
8. Observe a trade/freight mission alter station economic state.
9. Inspect the vessel, route, station, mission, encounter, freight and economic evidence.
10. Observe at least one population/migration/settlement or environmental change.
11. Pause and resume Passive Mode.
12. Close/reopen and confirm configured Passive Mode resumes correctly.
13. Complete a fleet-response cycle with valid casualty and responder final states.
14. Complete unattended soak validation without a scheduler fault.
15. Run the full verification suite on Linux and Windows.
16. Bump the release manifest to a World Observer version/name.
17. Publish only that accepted build.

## Verification authority

`toolbox.ps1 verify` is the canonical release gate. It must include the full persistence/simulation suite plus observer-specific contracts rather than leaving observer tests only in a PR workflow.

The canonical observer verification set includes:

- observer launcher contract;
- route projection;
- live inspector rendering;
- natural-world layers;
- civilization layers;
- large-world level of detail;
- timeline generation;
- timeline navigation;
- historical evidence;
- manual stepping;
- restart catch-up policy;
- restart catch-up runtime;
- single scheduler ownership/listener cleanup;
- unattended observer soak.

The Windows package command adds a second gate: the packaged bundled-runtime `.exe` must launch successfully before the MSI is accepted.

## Current implementation order

1. ~~Fleet-response correctness.~~ **Complete**
2. ~~Living observer shell.~~ **Complete**
3. ~~Core vessel/station/route selection.~~ **Complete**
4. ~~Principal natural/civil layers.~~ **Complete first pass**
5. ~~Large-world LOD.~~ **Complete first pass**
6. ~~Unified timeline and evidence navigation.~~ **Complete first pass**
7. ~~Freeze/manual-step/historical evidence comparison.~~ **Complete first pass**
8. **Current:** unattended soak verification and release-gate consolidation.
9. **Current:** repoint Windows packaging to the Living World Observer and smoke-test its executable.
10. Next: direct overlay hit targets and missing research/damage document navigation.
11. Next: large-master-world accelerated soak and packaged end-to-end acceptance.
12. Final: bump the release identity and publish the accepted World Observer build.

## Development record — 2026-08-21

The implementation has moved from separate simulation/database windows to a coherent living-world observer:

- fleet-response correctness restored;
- passive scheduler integrated with the observer;
- submarines visibly interpolate along routes;
- zoom/pan and whole-world LOD implemented;
- vessel/station/route selection and dossiers implemented;
- natural and civilization layers implemented;
- timeline and stable evidence navigation implemented;
- manual stepping and historical evidence inspection implemented;
- restart catch-up and scheduler ownership contracts implemented.

The active boundary is now operational confidence and packaging: prove sustained read/write observation, then make the double-clickable Windows application launch the Living World Observer directly.
