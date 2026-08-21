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

**Status: Blocking**

The existing fleet-response verification currently demonstrates a release-blocking defect: a responder can complete a recovery operation without returning to the expected docked state.

Required work:

- Reproduce the failing responder return-state path.
- Repair the authoritative transition, not the verification expectation.
- Verify outbound response transit, on-scene work, towing/return transit, casualty recovery, responder return, and final `DOCKED` states.
- Re-run the complete desktop verification suite before any installer is called release-ready.

This defect does not block observer UI development, but it blocks release certification.

### Gate 1 — Living observer shell

**Status: Active**

Establish the canonical observer entry point and turn the existing graphical Europa map into a live Passive Mode surface.

Required behavior:

- Dedicated `BarotraumaWorldObserverApplication` entry point.
- Open one authoritative desktop world through the shared `DesktopWorldSession`.
- Resume Passive Mode automatically when the selected world was previously enabled.
- Explicit Run/Pause Passive controls with cadence and ticks-per-cycle.
- Live refresh after scheduler notifications plus bounded periodic refresh as a safety net.
- Render NPC vessels at fractional route positions from committed route progress.
- Display committed hull, supplies, destination, incident progress, and revised ETA in hover evidence.
- Zoom controls, fit-world control, and scrollable panning.
- Closing the observer detaches listeners but does not silently pause the simulation.

Acceptance:

- With an enabled world open, canonical ticks advance without manual Step clicks.
- A vessel with nonzero route progress appears between its current and destination locations.
- Repeated refresh does not mutate the world.
- Pausing and resuming are explicit and persisted through the existing service.
- The viewport remains usable from whole-world scale to detailed local inspection.

### Gate 2 — Interactive entity inspectors

**Status: Planned**

Replace hover-only evidence with persistent selection and inspectors.

Required inspectors:

- **Vessel:** identity, role, hull, supplies, cargo, crew quality, mission, origin, destination, route progress, ETA, delays, encounters, voyage log, damage history, rescue/recovery state.
- **Station:** status, faction, population, capacity, treasury, supplies, ore, industry, security, integrity, threat, research, production/consumption, arrivals/departures, open work, recent incidents.
- **Route:** endpoints, vessels in transit, traffic, recent hazards, delay pressure, fauna pressure, losses.
- **Mission:** type, origin, target, assigned vessel, difficulty, reward, cargo, progress, outcome.
- **Encounter:** hazard, challenge, roll, margin, outcome, narrative, resulting state deltas.
- **Natural-world site/event:** resource exposure, ecology/geology cause, danger, work generated.

Selection must survive live refresh by stable entity ID.

Acceptance:

- Clicking a visible entity selects it.
- Inspector content updates as the world advances without losing selection.
- No inspector query mutates SQLite.

### Gate 3 — Human-readable document layer

**Status: Planned**

Turn durable evidence into readable in-world/operations documents rather than raw database rows.

Initial document types:

- Cargo/trade manifest.
- Mission contract.
- Voyage log.
- Encounter/incident report.
- Damage and repair report.
- Fleet-response dispatch/recovery report.
- Station market/transaction ledger.
- Research report.
- Migration manifest.
- Settlement project report.
- Natural-world survey/resource report.

Documents are generated from committed evidence and retain stable IDs/ticks so the same event is not rewritten differently on each view.

Acceptance:

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

The implementation order is intentionally vertical rather than subsystem-by-subsystem:

1. Restore the fleet-response verification gate while observer work proceeds.
2. Complete Gate 1 living observer shell.
3. Add stable selection and vessel inspector.
4. Add station and route inspectors.
5. Add document rendering for voyages, trade, encounters, and fleet response.
6. Add migration/settlement/natural-world inspectors and layers.
7. Add timeline/history/replay.
8. Prove unattended operation.
9. Repoint standalone packaging to `BarotraumaWorldObserverApplication`.
10. Run the end-to-end release acceptance scenario.

## First implementation slice — started 2026-08-21

The first slice begins Gate 1 by wiring the existing graphical map directly to the real passive runtime rather than leaving it as a manually refreshed status picture.

Implemented in this slice:

- dedicated World Observer application entry point;
- Passive Mode resume/start/pause controls in the graphical observer;
- scheduler-listener refresh plus two-second bounded refresh fallback;
- committed route-progress interpolation for submarine markers;
- richer vessel hover evidence for route progress, incidents, and ETA;
- zoom-in, zoom-out, fit-world, and Ctrl+mouse-wheel zoom controls;
- listener cleanup that does not silently disable persisted Passive Mode.

Still required before Gate 1 is complete:

- stable click selection and persistent inspectors;
- click-drag viewport panning and improved level-of-detail labels;
- observer-specific headless/model verification for projection and refresh behavior;
- full repository verification after the fleet-response defect is corrected.
