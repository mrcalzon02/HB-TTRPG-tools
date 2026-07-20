# Milestone 2.3 — Conserved Migration Foundation

**Status:** Active foundation implemented; passive planning, automatic progression, and complete desktop presentation remain.

Schema 028 establishes the first authoritative physical population-movement slice for the desktop world simulator. It extends the existing schema-015 `population_flow` record rather than introducing a competing movement table, retains schema-027 detailed NPC cohorts as population authority, and reuses schema-026 `npc_transit_leg` as the transport timeline.

## Implemented behavior

The migration transaction supports four initial flow kinds:

- ordinary migration;
- worker transfer;
- refugee evacuation;
- emergency relocation.

Each flow records its origin and destination populations and stations, requested quantity, exact cohort composition, cause, assigned NPC vessel, transport capacity, preparation state, transit leg, departure and arrival timing, return state, casualties, stranded survivors, cancellation, and failure reason.

People remain counted at the origin while a flow is planned or preparing. `prepare` reserves an exact cohort and assigns a docked NPC vessel. `depart` is permitted only after that vessel has entered the established NPC transit system and has an active `npc_transit_leg`; only then are the reserved people removed from the origin. `arrive` and `completeReturn` require an arrived transit leg at the expected location before survivors are added to a destination or restored to the origin.

A failed released flow cannot make people disappear. Every embarked person must reconcile as arrived, returned, explicitly lost, or stranded. Pre-departure cancellation releases reservations without changing population.

## Authoritative records

Schema 028 adds:

- `npc_population_flow_cohort` — exact planned, embarked, arrived, returned, lost, and stranded cohort quantities;
- `npc_population_flow_transition` — immutable lifecycle transition history;
- `npc_population_flow_observation` — read-optimized physical-flow projection;
- `npc_population_migration_conservation` — world-level station, in-transit, and casualty reconciliation;
- lifecycle transition and terminal-state guards.

The existing `npc_population_ledger` is migrated forward without losing schema-027 history and now accepts migration, evacuation, emigration, immigration, and return causes. Origin departure and destination/return arrival each receive their own conserved ledger entry and causal station evidence.

## Transaction boundary

`NpcPopulationMigrationTransaction` is the sole schema-028 mutation service. Public operations acquire the existing world writer lock and commit or roll back all flow, cohort, population, ledger, station projection, observation, and transition records together. Connection-scoped operations are available to the passive simulation transaction for the next integration slice.

The service does not implement a second vessel simulator. It synchronizes its lifecycle with the existing NPC transit authority:

```text
plan → prepare → existing vessel departure and npc_transit_leg
     → migration departure release → existing elapsed transit
     → migration arrival, return, or explicit failure
```

## Verification foundation

`NpcPopulationMigrationVerification` covers deterministic replay and all four initial flow kinds, including:

- successful migration with casualties;
- cancelled worker transfer before departure;
- refugee evacuation and return;
- failed emergency relocation with casualties and stranded survivors;
- exact cohort and ledger conservation;
- invalid lifecycle rejection;
- transaction rollback;
- foreign-key integrity.

Fresh, legacy, and pre-renumber migration verification now requires schema 028 objects. The complete desktop verification suite invokes the migration contract after schema-027 demographic verification.

## Remaining Milestone 2.3 work

The milestone remains **Active**. The next slice must integrate deterministic flow planning and lifecycle synchronization into `PassiveWorldTickTransaction`, including transport availability, pressure-based flow creation, transit progress, destination capacity, and fault containment. After that behavior is authoritative, `ObservationRegistry` and the desktop Observation Foundation should expose the complete schema-028 flow projection and conservation health.
