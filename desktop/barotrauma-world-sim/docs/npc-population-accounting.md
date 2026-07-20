# NPC Population Accounting

This document describes the implemented **Milestone 2.1** boundary for the desktop passive-world simulation.

The implementation is:

```text
src/main/java/io/github/mrcalzon02/barotrauma/persistence/NpcPopulationAccountingSchema.java
src/main/java/io/github/mrcalzon02/barotrauma/persistence/NpcPopulationAccountingVerification.java
```

The focused verification command is:

```text
gradle verifyNpcPopulationAccounting
```

## Purpose

Schema 015 created detailed NPC population cohorts, but the established civilization frontier still used its older `population_index`. Schema 016 adds a conserved ledger between those representations before any independent demographic growth, migration, evacuation, colony founding, abandonment project, or reclamation behavior is allowed.

The ledger ensures that population cannot appear or disappear without an explicit accounting term.

## Schema 016 objects

### `npc_population_reconciliation`

Stores one reconciliation record per station population:

- Stable population, world, and station identity.
- Initial and last civilization population index.
- Baseline detailed persons per index point.
- Last detailed total.
- Last reconciled tick.
- Reconciliation state: `SEEDED`, `ALIGNED`, `INDEX_GAIN`, `INDEX_LOSS`, or `ABANDONED`.

The baseline is derived once from the schema-015 detailed total and the existing frontier population index. It is not recomputed each tick, avoiding compounding drift.

### `npc_population_ledger`

Stores exactly one row per population and canonical tick with:

- Population before and after.
- Births and deaths.
- Immigration and emigration.
- Disaster losses.
- Other gains and losses.
- Housing, life-support, employment, and morale inputs.
- Frontier population index before and after.
- Primary cause, evidence key, and summary.

The database enforces:

```text
after = before + births + immigration + other gains
               - deaths - emigration - disaster losses - other losses
```

Every value is nonnegative, and a nonconserved row is rejected.

### `npc_population_accounting_observation`

Provides a read-optimized ledger view joined to station names and reconciliation state. The query-only `ObservationRegistry` exposes this view to the desktop client.

## Passive transaction integration

The `npc_population_tick_accounting` trigger runs after the existing civilization-frontier row advances to a newer tick. It does not create a second scheduler or writer.

Because the frontier update already occurs inside `PassiveWorldTickTransaction`, population accounting shares the same transaction as:

- Station consumption.
- Civilization pressure.
- NPC missions and movement.
- Fleet response.
- Ecology and geology.
- Extraction and logistics.
- The durable clock receipt and checkpoint.

A failed passive cycle therefore rolls back the population ledger, detailed cohorts, metrics, and events together with the rest of the tick.

## Current reconciliation behavior

Milestone 2.1 does not yet invent births, deaths, or migration.

When the existing frontier population index changes, schema 016 computes the corresponding detailed target from the stable baseline:

```text
target detailed population = baseline persons per index × new population index
```

The difference is recorded explicitly as:

- `other_gains` with cause `SUPPLY_RECOVERY`, or
- `other_losses` with cause `SUPPLY_SHORTAGE`.

If the frontier becomes `ABANDONED` or station integrity reaches zero, the target is zero and the loss is recorded with cause `ABANDONMENT` and evidence key `frontier-abandonment-reconciliation`.

If the index does not change, a zero-delta ledger row is still written. This proves that the population was evaluated and conserved during that tick without creating a false event.

Milestone 2.2 will replace generic reconciliation differences with capacity-supported demographic terms while retaining the same conservation equation.

## Cohort reconciliation

When the detailed total changes:

- Industrial, logistics, security, medical, scientific, temporary, and refugee cohorts are scaled proportionally using integer-safe arithmetic.
- Civilians receive the remainder so cohort totals exactly equal the ledger after-total.
- No cohort is allowed to become negative.
- If a population restarts from zero in a later milestone, the initial restored total falls into civilians until explicit demographic or migration rules allocate it.

## Evidence and chronology

Material changes create one `POPULATION` observation event. Stable ticks do not create false change events.

Every tick creates:

- `accounted-total-population` metric.
- `frontier-population-index` metric.

For bounded multi-tick catch-up, event time is calculated from the pre-cycle canonical clock, tick size, and ledger tick. Events inside one catch-up batch therefore retain their own canonical timestamps rather than all receiving the command's final time.

## Desktop observation

The Observation Foundation window includes an **NPC Population Ledger** tab showing:

- Before and after totals.
- All gain and loss terms.
- Capacity and morale inputs.
- Frontier index before and after.
- Cause and evidence.
- Reconciliation state.
- Stable baseline.
- Human-readable summary.

Changed-after-tick filtering applies to ledger rows, current population rows, events, and metrics.

## Verification

The focused schema-016 verifier covers:

- Deterministic reconciliation seeding.
- Population-index growth.
- A conserved no-change tick.
- Population-index contraction.
- Abandonment to zero.
- Exact cohort totals.
- Event magnitude and per-tick canonical time.
- Two metrics per evaluated tick.
- Rejection of nonconserved ledger rows.
- Foreign-key integrity.

The query-only registry verifier also executes one schema-016 tick and confirms current, changed-since-tick, and selected-entity history reconstruction.

## Next slice

Milestone 2.2 adds slow bounded demographic behavior driven by capacity, supplies, medical support, integrity, security, threat, fauna pressure, and morale. Births, deaths, and other causes must become explicit ledger terms; the accounting equation and transactional boundary established here remain unchanged.
