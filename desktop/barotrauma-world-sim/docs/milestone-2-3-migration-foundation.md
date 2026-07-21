# Milestone 2.3 — Conserved Population Migration

**Status:** Active implementation; the migration authority, deterministic engine, observation surface, and focused verification exist, but production passive-tick integration remains incomplete.

Schema 028 establishes the authoritative physical population-movement slice for the desktop world simulator. It extends the existing schema-015 `population_flow` record rather than introducing a competing movement table, retains schema-027 detailed NPC cohorts as population authority, and reuses schema-026 `npc_transit_leg` as the transport timeline.

## Implemented flow kinds

The migration authority supports:

- ordinary migration;
- worker transfer;
- refugee evacuation;
- emergency relocation.

Each flow records its origin and destination populations, stations, and locations; requested quantity; exact cohort composition; cause; assigned NPC vessel; transport capacity; preparation state; outbound transit leg; departure and arrival timing; return state; casualties; stranded survivors; cancellation; and explicit failure reason.

People remain counted at the origin while a flow is planned or preparing. `prepare` reserves exact cohorts and assigns a docked NPC vessel. `depart` is permitted only after that vessel has entered the established NPC transit system with an active `npc_transit_leg`; only then are the reserved people removed from the origin. `arrive` and `completeReturn` require physical arrival at the expected location before survivors are added to the destination or restored to the origin.

A released flow cannot make people disappear. Every embarked person must reconcile as arrived, returned, explicitly lost, or stranded. Pre-departure cancellation and failure release reservations without changing population and return a preparing vessel to the origin dock.

## Authoritative records

Schema 028 adds:

- `npc_population_flow_cohort` — exact planned, embarked, arrived, returned, lost, and stranded cohort quantities;
- `npc_population_flow_transition` — durable lifecycle transition history;
- `npc_population_flow_observation` — read-optimized physical-flow projection;
- `npc_population_migration_conservation` — world-level station, in-flow, and casualty reconciliation;
- lifecycle transition, conservation, and terminal-state guards.

The existing `npc_population_ledger` is migrated forward without losing schema-027 history and accepts migration, evacuation, emigration, immigration, and return causes. Origin departure and destination or return arrival write conserved ledger terms and causal station evidence through the same transaction.

## Transaction boundary

`NpcPopulationMigrationTransaction` remains the sole schema-028 lifecycle mutation service. Public operations acquire the established world writer lock and commit or roll back flow, cohort, population, ledger, station projection, observation, vessel-release, and transition records together. Connection-scoped operations allow the passive tick transaction to use the same authority without introducing a second writer.

The service does not implement another vessel simulator. Migration synchronizes with the existing NPC vessel and transit authorities:

```text
plan → prepare → existing vessel departure and npc_transit_leg
     → exact cohort release → existing elapsed transit and incidents
     → arrival, return, or explicit failure
```

Migration-reserved vessels are excluded from ordinary mission assignment while a flow is active.

## Deterministic planning and synchronization engine

`NpcPopulationMigrationEngine` performs deterministic bounded planning and lifecycle synchronization from committed station, demographic, vessel, and transit state.

Planning considers sustained pressure including overcrowding, shortage, low morale, failed support, threat, refugee pressure, and destination workforce or housing capacity. It deterministically selects one eligible origin, one compatible destination, an exact bounded quantity, exact cohorts, and one idle vessel at the origin. It does not create multiple active origin flows for the same population.

When invoked, the engine synchronizes:

- prepared flows with physical outbound vessel departure;
- in-transit flows with arrival, destination-capacity recheck, vessel loss, or vessel disablement;
- return flows with physical return arrival, loss, or stranded-survivor outcomes;
- flow progress with the established transit-leg elapsed state.

Destination-capacity rejection has focused coverage through `IN_TRANSIT → RETURNING → physical RETURN leg → ARRIVED at origin`, and rejected passengers remain outside both station populations until the return leg physically arrives. Delays alone do not invent casualties. Lost and irrecoverably disabled transports must explicitly account for every embarked person.

## Production integration gap

`PassiveWorldTickTransaction` currently advances ordinary NPC vessel movement but does not invoke `NpcPopulationMigrationEngine.advanceAndPlan(...)`. The focused engine verification therefore proves the engine contract in isolation, not that a normal Passive Mode tick currently plans or synchronizes migration.

The required production change is direct and narrow: invoke the existing migration engine inside the authoritative per-tick transaction after `processVessels(...)` and before later per-tick work completes. This placement lets migration observe the vessel state committed for that tick, release prepared cohorts after physical departure, settle arrivals, order returns after destination-capacity rejection, and create new pressure-driven flows inside the same rollback boundary.

No trigger, wrapper, scheduler, compatibility layer, or second migration authority should be introduced as a substitute. The production tick itself must call the existing engine.

## Query-only observation and desktop evidence

`ObservationRegistry` exposes schema-028 migration rows with changed-since filtering and bounded result limits. It also exposes the world-level migration conservation projection and rejects pre-schema-028 worlds for migration-specific queries.

The existing Observation Foundation window uses that registry directly. Its **NPC Migration** tab displays lifecycle status, kind, cause, origin, destination, reserved, embarked, arrived, returned, lost, and stranded quantities; assigned transport; progress and duration; preparation, departure, arrival, and return ticks; failure reason; summary; and flow identity. The summary also displays station population, population physically in flows, recorded migration losses, and total migration-accounted population.

This remains one read-only desktop data path. No parallel UI storage or independent simulation authority was added.

## Verification coverage

The registered verification chain includes:

- `NpcPopulationMigrationVerification` for all four flow kinds, exact cohort and ledger conservation, cancellation, preparation failure, return, casualties, stranded survivors, invalid transitions, rollback, and foreign-key integrity;
- `NpcPopulationMigrationEngineVerification` for deterministic automatic planning, outbound synchronization, destination-capacity rejection, physical return transit, and origin restoration;
- `MigrationObservationRegistryVerification` for schema gating, changed-since behavior, limits, transport evidence, conserved quantities, and world-level conservation;
- fresh, legacy, and pre-renumber migration checks requiring schema 028 objects;
- complete-suite registration through `DesktopPersistenceVerificationSuite`.

The next verification addition must exercise migration through `PassiveWorldTickTransaction` rather than calling `NpcPopulationMigrationEngine` directly. It must prove that a real passive tick creates or advances flows in the same transaction as vessel movement and that rollback removes both vessel and migration changes together.

## Remaining acceptance work

Milestone 2.3 remains **Active** until all of the following are true:

1. `PassiveWorldTickTransaction` directly invokes the migration engine in its authoritative per-tick sequence.
2. A focused passive-transaction integration verification proves planning, departure, arrival or return, conservation, and rollback through that production path.
3. The exact published `main` head compiles with Java 17 and passes `toolbox.cmd verify`.

Any discovered failure must be repaired in the authoritative migration, transit, registry, desktop, or passive-tick implementation rather than hidden behind adapters or compatibility mutators.

After those gates pass, update `DEVELOPMENT_PLAN.md` and `README.md` to record the accepted schema-028 migration slice. Do not mark Milestone 2 complete: settlement founding, expansion, abandonment, reclamation projects, and the remaining lifecycle desktop evidence still belong to Slices 2.4 and 2.5.
