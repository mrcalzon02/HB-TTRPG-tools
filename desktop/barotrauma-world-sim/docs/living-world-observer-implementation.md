# Living World Observer Implementation Plan

Status: **Active**

This document is the focused implementation plan for Milestone 6 of the desktop Barotrauma World Simulation Toolbox. The authoritative roadmap remains `DEVELOPMENT_PLAN.md`; this plan defines the executable path for turning the existing passive simulation, registries, and graphical map into the actual living-world observer application.

## Product definition

The target is one desktop application in which an operator can leave Europa running and observe the committed world rather than manually drive it.

The observer must eventually support all of the following from one coherent surface:

- Passive Mode advances the authoritative SQLite world while the observer remains open.
- NPC submarines visibly travel from origin to destination instead of teleporting between location markers.
- Station economies, trade, research, migration, settlement work, fleet response, natural events, fauna pressure, damage, loss, and recovery remain driven by the existing authoritative simulation.
- The viewport can be zoomed and panned without changing world state.
- Stations, vessels, routes, encounters, missions, settlements, natural events, and later creature populations can be selected and inspected.
- Durable simulation evidence is readable as human-facing documents: voyage logs, manifests, contracts, encounter reports, station ledgers, research records, fleet-response records, and related causal history.
- The operator can determine both **what is happening now** and **why it happened**.
- Observation never becomes a second simulation authority. SQLite plus the existing single-writer transaction path remains authoritative.

A release is not considered a functioning World Observer merely because tables exist or a map can be opened.

## Non-negotiable architectural rules

1. `PassiveWorldSimulationService` remains the only automatic desktop scheduler for an authoritative world.
2. Simulation mutation remains transactional and single-writer.
3. Observer registries remain read-only.
4. The visual layer derives positions and presentation from committed state; it does not invent simulation results.
5. Closing an observer window does not implicitly disable persisted Passive Mode.
6. Pausing Passive Mode is an explicit operator action.
7. Donor Barotrauma assets remain optional and local-only; procedural fallbacks remain sufficient to operate the observer.
8. Existing detailed registry/evidence windows remain available as advanced/debug views until the unified observer replaces them.

## Delivery gates

### Gate 0 — Restore simulation verification to green

**Status: Complete**

The fleet-response verification defect was reproduced on the live observer PR and repaired in the authoritative transition path. The failure was not a missing return journey: the responder physically completed its return and was set to `DOCKED`, but recursive fleet-dispatch triggers could consume that docked transition again in the same completion tick.

Implemented correction:

- Centralized current-schema dispatch repair in `FleetResponseDispatchPolicy`.
- Protected both immediate assignment paths from selecting a responder whose `responder_returned_tick` is the current completion tick.
- Added a completion docking barrier that rejects any remaining same-tick attempt to place a just-returned responder back into `PREPARING` or `IN_TRANSIT`.
- Existing current-schema worlds receive the corrected trigger policy on SQLite connection without rewriting world identity or simulation state.
- Outbound response transit, on-scene work, towing/return transit, casualty recovery, responder return, and final `DOCKED` states are covered by the existing full verification suite.

Acceptance result:

- The fresh pull-request workflow `Verify Barotrauma living world observer` completed successfully on 2026-08-21 after the final dispatch-barrier correction.
- `DesktopPersistenceVerificationSuite` passed, including the fleet-response and natural-world contract that previously failed.

### Gate 1 — Living observer shell

**Status: Complete**

The canonical observer entry point and live Passive Mode viewport are now implemented.

Implemented behavior:

- Dedicated `BarotraumaWorldObserverApplication` entry point.
- Opens one authoritative desktop world through the shared `DesktopWorldSession`.
- Resumes Passive Mode automatically when the selected world was previously enabled.
- Explicit Run/Pause Passive controls with cadence and ticks-per-cycle.
- Live refresh after scheduler notifications plus bounded two-second periodic refresh as a safety net.
- NPC vessels render at fractional route positions derived from committed route progress.
- Hover evidence includes committed hull, supplies, destination, incident progress, and revised ETA.
- Zoom in/out, fit-world, Ctrl+mouse-wheel zoom, and middle/right-button drag panning.
- Closing the observer detaches listeners but does not silently pause the simulation.
- Route projection has a headless verification contract and is part of `toolbox.ps1 verify`.

Acceptance:

- Passive Mode can advance without manual Step clicks while the observer remains open.
- A vessel with nonzero route progress renders between its current and destination locations.
- Observer refresh remains query-only.
- Pausing and resuming remain explicit persisted simulation operations.
- The viewport supports whole-world and local inspection scales.

### Gate 2 — Interactive entity inspectors

**Status: Active**

Persistent selection has replaced hover-only evidence for the first three visible entity classes.

Implemented:

- Stable UUID-backed selection survives live refresh.
- Clicking a vessel pins a live vessel dossier.
- Clicking a station/location pins a live station/location dossier.
- Clicking a transit line pins a live route dossier.
- Selected vessels, locations, and routes receive visible map highlighting.
- Clicking empty map space or `World Overview` returns to the world dossier.
- Vessel dossiers expose identity, role, state, hull, supplies, cargo, crew capabilities, mission, origin/destination, progress, ETA, delay, incident schedule, voyage logs, and encounter evidence.
- Station/location dossiers expose geography, faction, economy/condition where applicable, local/inbound NPC traffic, and mission/trade records.
- Route dossiers expose endpoints, progress, ETA, delay, incident count, current mission, hull/supplies, and recent incident evidence.

Remaining inspectors:

- **Mission:** dedicated selectable contract/outcome inspector.
- **Encounter:** dedicated selectable hazard/outcome inspector.
- **Fleet response:** dispatch, outbound, on-scene, return, casualty, and completion evidence.
- **Natural-world site/event:** resource exposure, ecology/geology cause, danger, and generated work.
- Population/migration/settlement/faction inspectors as their corresponding visual layers are integrated.

Selection must continue to survive live refresh by stable entity ID, and all inspector queries must remain read-only.

### Gate 3 — Human-readable document layer

**Status: Active**

The first document rendering is now integrated into the live dossiers rather than exposed only as raw database tables.

Implemented document views:

- Mission/contract summaries in vessel, route, and station/location dossiers.
- Voyage-log documents with tick, event, summary, details, resolution, and state effects.
- Encounter reports with hazard, challenge, roll, margin, outcome, and narrative.
- Station-local mission/trade records.
- Headless dossier verification checks route progress, contracts, voyage evidence, encounter evidence, station economy, and local traffic.

Still required:

- Cargo/trade manifest with freight and treasury consequences.
- Damage and repair report.
- Fleet-response dispatch/recovery report.
- Station market/transaction ledger.
- Research report.
- Migration manifest.
- Settlement project report.
- Natural-world survey/resource report.

Documents are generated from committed evidence and retain stable IDs/ticks so the same event is not rewritten differently on each view.

Acceptance remains:

- Every significant visible incident links to at least one inspectable causal record.
- Trade movement can be followed from mission/manifest through arrival and station economic effect.
- A damaged/lost/recovered vessel exposes the chain of events that produced its current state.

### Gate 4 — Observer layers and world readability

**Status: Planned**

Add selectable map layers without duplicating simulation authority:

- Station status and economy.
- NPC traffic.
- Mission traffic.
- Migration.
- Population pressure.
- Settlement projects.
- Faction influence.
- Fauna/creature pressure.
- Natural resources.
- Natural hazards.
- Fleet-response operations.
- Recent incidents and losses.

Add label density/level-of-detail behavior so the 960-location master world remains readable while zoomed out.

### Gate 5 — Temporal observation

**Status: Planned**

Integrate existing snapshot/evidence foundations into non-mutating observation controls:

- Pause live rendering without pausing simulation.
- Pause simulation explicitly.
- Manual Step.
- Recent-event timeline.
- Jump to event/entity.
- Historical snapshot selection.
- Compare two ticks/snapshots.
- Replay/scrub of recorded state without writing current world state.

Live and historical modes must be visually distinct.

### Gate 6 — Long-running observer operation

**Status: Planned**

Prove that the application can be left running unattended.

Required:

- Restart recovery of enabled Passive Mode.
- Bounded catch-up after downtime.
- Health/fault status visible in the observer.
- Automatic checkpoints/backups according to existing storage contracts.
- Rendering throttled independently from accelerated simulation.
- No duplicate scheduler for the same world.
- No listener/resource leak after opening/closing observer views repeatedly.

### Gate 7 — Release and packaging

**Status: Planned**

The standalone artifact must launch the living observer rather than the evidence-only Observation Foundation window.

Release acceptance scenario:

1. Start from a clean packaged install.
2. Open or generate a valid master world.
3. Enable Passive Mode.
4. Observe at least one NPC vessel depart.
5. Watch the vessel visibly progress along its route.
6. Observe at least one transit encounter or difficulty.
7. Observe at least one completed trade mission that changes station economic state.
8. Inspect the vessel, route, station, mission, encounter, and resulting records.
9. Pause and resume Passive Mode.
10. Close and reopen the observer and confirm configured Passive Mode resumes.
11. Complete a fleet-response cycle with both casualty and responder ending in correct authoritative states.
12. Run the full verification suite successfully.
13. Only then package and publish the World Observer executable/installer.

## Implementation order

The implementation order remains vertical rather than subsystem-by-subsystem:

1. ~~Restore the fleet-response verification gate.~~ **Complete.**
2. ~~Complete Gate 1 living observer shell.~~ **Complete.**
3. **Active:** finish dedicated entity inspectors and evidence navigation.
4. **Active:** deepen document rendering for voyages, trade, encounters, fleet response, and station consequences.
5. Add migration/settlement/natural-world inspectors and layers.
6. Add world readability layers and label level-of-detail.
7. Add timeline/history/replay.
8. Prove unattended operation.
9. Repoint standalone packaging to `BarotraumaWorldObserverApplication`.
10. Run the end-to-end release acceptance scenario.

## Development record

### 2026-08-21 — Gate 1 living observer shell implemented

- Added the dedicated World Observer application entry point.
- Wired the graphical Europa map directly to the real passive runtime.
- Added Passive Mode resume/start/pause controls and runtime status.
- Added scheduler-listener refresh plus two-second bounded refresh fallback.
- Added committed route-progress interpolation for submarine markers.
- Added richer vessel hover evidence for route progress, incidents, and ETA.
- Added zoom-in, zoom-out, fit-world, Ctrl+mouse-wheel zoom, and drag panning.
- Added headless route-projection verification.

### 2026-08-21 — Gate 0 fleet-response blocker cleared

- Added a PR-scoped full Java 17 desktop verification workflow so observer work is verified before merge.
- Reproduced the existing fleet-response responder-docking failure on the feature branch.
- Traced the failure to same-tick recursive redispatch after successful physical return.
- Corrected both immediate fleet assignment paths and added a completion docking barrier.
- Re-ran the full desktop verification suite successfully, including fleet response, towing return, natural world, migration, settlement, transit, logistics, persistence, and observer projection contracts.

### 2026-08-21 — Gate 2/3 interaction and dossier work started

- Added stable click selection for vessels, stations/locations, and transit routes.
- Added persistent live selection that survives refresh by stable UUID.
- Added selected-entity map highlighting.
- Added vessel, route, station/location, and world dossiers.
- Integrated mission contracts, voyage documents, encounter reports, station economy, and local traffic into the evidence pane.
- Added a headless dossier contract to prevent the observer from silently losing the committed facts it is expected to display.

## Next implementation slice

Expose fleet-response operations, freight/trade settlement, and treasury consequences through a read-only observer evidence model, then connect those records to the existing vessel/station/route dossiers. This closes the largest current gap between “watch an NPC move” and “inspect why that voyage happened and what it changed.”
