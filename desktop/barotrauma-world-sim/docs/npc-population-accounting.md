# NPC Population Accounting and Demographic Lifecycle

This document describes the implemented **Milestone 2.1 and Milestone 2.2** boundary for the desktop passive-world simulation.

The authoritative implementation is:

```text
src/main/java/io/github/mrcalzon02/barotrauma/persistence/NpcPopulationAccountingSchema.java
src/main/java/io/github/mrcalzon02/barotrauma/persistence/NpcDemographicLifecycleSchema.java
src/main/java/io/github/mrcalzon02/barotrauma/persistence/NpcPopulationAccountingVerification.java
src/main/java/io/github/mrcalzon02/barotrauma/persistence/NpcDemographicLifecycleVerification.java
```

The focused verification command is:

```text
toolbox.cmd verify
```

## Purpose

Schema 015 created detailed NPC population cohorts while the established civilization frontier still used an older `population_index`. Schema 016 introduced a conserved ledger so those representations could not silently diverge. Schema 027 completes the next slice by making the detailed cohorts and their ledger the demographic authority.

Population may change only through committed terms:

```text
after = before + births + immigration + other gains
               - deaths - emigration - disaster losses - other losses
```

The station resident/workforce record and frontier population index are now projections of the same committed result rather than independent population simulators.

## Schema 016 accounting foundation

### `npc_population_reconciliation`

Stores one reconciliation record per station population:

- Stable population, world, and station identity.
- Initial and last civilization population index.
- Baseline detailed persons per index point.
- Last detailed total.
- Last reconciled tick.
- Reconciliation state.

The baseline was derived once from the schema-015 detailed total and the existing frontier population index, avoiding compounding drift.

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

Every value is nonnegative, and a nonconserved row is rejected.

Schema 027 rebuilds the table without discarding history and expands the accepted material causes to include `BIRTHS`, `DEATHS`, and `DISASTER` while retaining recovery, shortage, abandonment, and other evidence categories.

## Schema 027 demographic lifecycle

Schema 027 removes the older generic population-index writer and the separate passive station-headcount planner. It installs one demographic planner and one finalizer:

- `npc_demographic_state`
- `npc_demographic_tick_baseline`
- `npc_demographic_tick_result`
- `npc_demographic_tick_plan`
- `npc_demographic_capture_before_tick`
- `npc_demographic_finalize_tick`

### Durable state

`npc_demographic_state` stores the slowly changing memory required to avoid oscillation:

- Sustained surplus-support ticks.
- Sustained shortage-pressure ticks.
- Overcrowding ticks.
- Explicit overcrowding state: `WITHIN_CAPACITY`, `SUPPRESSED`, `STRAINED`, or `CRITICAL`.
- Last support and pressure scores.
- Last birth and mortality ticks.
- Last evaluated tick.

### Immutable tick result

`npc_demographic_tick_result` stores the complete calculation before any dependent projection is written. It includes:

- All cohort and station inputs.
- Effective capacity.
- Medical coverage.
- Support and pressure scores.
- Hysteresis counters and overcrowding state.
- Births, deaths, disaster losses, and abandonment losses.
- Before and after population totals.
- Before and after morale.
- Before and after frontier population index.
- Measured attack damage points.
- Primary cause, evidence key, and summary.

Downstream ledger rows, cohort updates, station changes, observation events, and metrics read this immutable result. They do not recalculate demographic terms from already-mutated live state.

## Inputs and scoring

Effective capacity is the minimum of:

- Housing capacity.
- Life-support capacity.
- Employment capacity.

Support and pressure incorporate:

- Available capacity.
- Supplies and ration support.
- Medical personnel relative to population.
- Integrity.
- Security.
- Threat.
- Fauna pressure.
- Morale.
- Shortage history.
- Measured attack damage.

The scores are deterministic integers from 0 to 100. Their exact components are committed in the schema rather than sampled from runtime randomness.

## Births

Births require all of the following:

- Effective capacity greater than zero.
- Population below 95 percent of effective capacity.
- Support score of at least 70.
- Pressure score below 35.
- Six sustained support ticks.
- A six-tick cooldown since the previous birth event.
- No higher-priority mortality, disaster, or abandonment result in the tick.

Growth is slow and bounded:

```text
births = min(available capacity, max(1, population / 500))
```

New births enter the civilian cohort. They do not manufacture workers or specialists.

## Mortality and disaster losses

### Natural mortality

Stable natural mortality is deterministic and infrequent. It occurs only on the committed cycle defined by the planner and is suppressed when a higher-priority cause is present.

### Overcrowding

Crossing capacity immediately suppresses births and enters an explicit overcrowding state. It does not immediately remove population.

Excess mortality begins only after three overcrowded ticks. The loss is bounded against both the population and the measured excess above capacity. Evidence is recorded as `overcrowding-excess-mortality`.

### Support failure

Sustained shortage pressure can create excess mortality when supplies, integrity, medical coverage, or the overall pressure score cross committed thresholds. Evidence is recorded as `support-failure-excess-mortality`.

### Fauna attacks

The planner reads measured integrity and security damage from the committed fauna attack event for that tick. Those damage points create explicit `disaster_losses` with evidence `measured-fauna-attack-casualties`.

This replaces the old independent attack-casualty writer. An attack can no longer mutate the station headcount outside the detailed cohort ledger.

### Abandonment

If the station is fallen, its frontier is abandoned, or integrity is exhausted, remaining population is committed as explicit abandonment loss. There is no separate direct-evacuation population writer competing with the passive demographic transaction.

A direct out-of-band status or frontier transition is therefore reflected demographically on the next authoritative passive tick.

## Morale and hysteresis

Morale changes slowly:

- Severe pressure may reduce morale by two points.
- Moderate pressure may reduce morale by one point.
- Sustained support without overcrowding may increase morale by one point.
- Otherwise morale remains unchanged.

Support, shortage, and overcrowding counters decay rather than resetting immediately. Birth and mortality cooldowns are stored durably. This prevents conditions near a threshold from creating alternating growth and loss every tick.

## Cohort allocation

The detailed NPC cohorts are authoritative.

When population is lost, each noncivilian cohort receives a proportional share of the loss using integer-safe arithmetic. Civilians absorb the final remainder so the cohort sum exactly equals the ledger after-total. No cohort may become negative.

When population is gained through births, the gain enters civilians. Later migration and workforce slices may assign arriving or trained people to other cohorts through explicit evidence.

## Station and frontier projection

Schema 027 realigns `station_population_state` to the detailed population at migration while preserving its imported-versus-generated provenance, then treats it as a projection:

- `resident_count` equals the detailed cohort total.
- `workforce_count` equals the sum of industrial, logistics, security, medical, and scientific personnel.
- The station population baseline counts and tick are realigned once at schema-027 migration while preserving imported-versus-generated provenance, so later coverage measures only the consolidated authority.
- `station_population_coverage` must report zero unexplained resident and workforce delta.
- Command-scoped mutation coverage still observes the projection update and is satisfied by station changes derived from the same tick result.

The civilization `population_index` is recalculated from the committed detailed total and the stable reconciliation baseline. Frontier pressure may influence demographic support, but changing the index no longer independently creates or removes people.

## Passive transaction integration

The demographic baseline is captured before a station tick. The shared `station_passive_consumption` trigger performs consumption, station damage, frontier movement, status changes, and event collection, then marks the demographic baseline ready. The demographic finalizer runs only after all required station evidence for that tick exists.

Because the process remains inside `PassiveWorldTickTransaction`, the demographic result shares one transaction with:

- Station consumption and production.
- Civilization pressure and station status.
- NPC missions and movement.
- Fleet response.
- Ecology and geology.
- Extraction and logistics.
- The durable command receipt and checkpoint.

A failed cycle rolls back the demographic result, ledger, cohorts, station projection, observation events, station stories, typed changes, metrics, and hysteresis state together.

## Evidence and chronology

Material changes create one population observation event and one station population story derived from the immutable result. Stable ticks still create the ledger and metrics but do not create false material-change events.

Schema 027 creates these metrics on every evaluated tick:

- `accounted-total-population`
- `frontier-population-index`
- `demographic-support-score`
- `demographic-pressure-score`
- `demographic-morale`
- `effective-population-capacity`

For bounded multi-tick catch-up, canonical event time is derived per ledger tick from the transaction clock context. Ordered catch-up ticks therefore retain their own chronology.

## Desktop observation

The existing Observation Foundation window includes an **NPC Population Ledger** tab showing:

- Before and after totals.
- Births, deaths, disaster losses, and other terms.
- Housing, life-support, and employment capacity.
- Morale.
- Frontier index before and after.
- Primary cause and evidence.
- Reconciliation state.
- Stable baseline.
- Human-readable summary containing support, pressure, capacity, and overcrowding state.

The query-only `ObservationRegistry` retains its existing column contract; schema 027 appends deeper demographic fields to the database view without breaking the desktop reader. Changed-after-tick filtering continues to apply to current populations, ledger rows, events, and metrics.

## Verification

The schema-016 verifier continues to cover the original conservation and migration boundary.

The schema-027 verifier adds:

- Two identical fixture runs with identical committed signatures.
- Migration alignment between detailed cohorts and station headcounts.
- Sustained-support birth hysteresis and cooldown.
- Immediate birth suppression under overcrowding.
- Delayed overcrowding mortality.
- Support-failure mortality.
- Measured fauna attack casualties.
- Exact ledger and immutable-result conservation.
- Exact cohort, resident, and workforce projection.
- Zero unexplained station population coverage.
- Transaction rollback.
- Foreign-key integrity.
- Fresh, legacy, and pre-renumber migration through schema 027.

## Next slice

Milestone 2.3 adds durable physical migration and evacuation flows. People must leave an origin cohort, require transport, survive or fail in transit, and arrive at a destination before they can enter another station population.
