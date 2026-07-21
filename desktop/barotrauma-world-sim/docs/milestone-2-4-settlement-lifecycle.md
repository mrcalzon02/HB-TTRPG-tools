# Milestone 2.4 — Settlement Lifecycle Projects

**Status:** Active implementation; schema 029 project lifecycle, schema 030 staged founding migration, schema 031 exact terminal contribution disposition, authoritative project, founding, contribution and termination transactions, deterministic migration and project progression, all four canonical completion consequences, query-only project, founding-migration and disposition observation, fresh and legacy migration contracts, and focused rollback verification exist. Production passive-tick integration, desktop presentation, migration execution, and exact-head acceptance remain.

Schema 029 establishes the durable project model required before settlements may be founded, expanded, abandoned, or reclaimed. Schema 030 extends the conserved NPC migration authority so a founding cohort can arrive at an unoccupied location, remain accounted for in transit staging, and become the first canonical station population only when its project completes. Schema 031 requires every physical commitment to receive an immutable terminal classification before a contributed project may fail or be cancelled.

## Implemented project authority

`settlement_project` records one project at one target location with an explicit kind and guarded lifecycle:

```text
PLANNED → PREPARING → ACTIVE ↔ BLOCKED → COMPLETE
                    ↘ FAILED or CANCELLED
```

The project kinds are `FOUNDING`, `EXPANSION`, `ABANDONMENT`, and `RECLAMATION`. Each project records its world, target location, optional origin and target stations, related population, assigned transport, sponsoring faction, required and committed materials, supplies, population, transport, security, work progress, timing, failure reason, and summary.

Only one non-terminal project may control a target location at a time. Terminal projects are immutable. Activation is rejected until all material, supply, population, transport, and security commitments meet their requirements. Completion is rejected unless progress equals the project target.

## Contributions and transitions

`settlement_project_contribution` records durable evidence for materials, supplies, population, transport, security, and work. Evidence keys are unique within a project. Contributions are exact rather than silently capped, work is accepted only while a project is active, and the final work allocation is reduced to the exact remaining progress.

`SettlementProjectContributionAuthority` reconciles commitments with canonical physical state:

- material commitments deduct unreserved `item-steel` from the project origin;
- supply commitments deduct unreserved `item-rations` from the project origin;
- transport commitments require the assigned NPC vessel to be idle and docked at the project origin;
- existing-station population commitments require an arrived station-bound population flow;
- founding population commitments require an arrived `FOUNDING_SITE` flow linked to the same project and target location.

Inventory deduction and contribution evidence share a local savepoint, so rejected or duplicate evidence cannot consume stock. Outer transaction rollback restores both physical stock and project commitments.

`settlement_project_transition` records lifecycle changes with tick, progress, evidence, and summary.

## Authoritative transactions

`SettlementProjectTransaction` is the sole schema-029 lifecycle mutation service. Public operations acquire the established world writer lock and commit or roll back project, contribution, and transition rows together. Connection-scoped operations let the passive world transaction use the same authority without introducing a second writer.

`SettlementFoundingMigrationTransaction` is the schema-030 authority for founding-site movement. It plans the exact required cohort against a `PREPARING` founding project, reuses the canonical migration transaction for preparation and departure, stages a complete arrived cohort without inventing a destination population, and performs the final one-to-one station handoff after project completion.

A founding project blocks duplicate active flows and unconsumed staged arrivals. A flow that is cancelled, failed, or fully returned releases the still-preparing project for a deterministic replacement attempt. Returned terminal flows are excluded from final handoff selection.

The ordinary migration public transaction accepts every supported schema from 028 through the current schema 031 rather than incorrectly requiring schema exactly 028.

## Staged founding migration and conservation

Schema 030 adds two explicit NPC destination modes:

- `STATION_POPULATION` retains ordinary migration into an existing destination population;
- `FOUNDING_SITE` requires a matching founding project, forbids a destination population or station, and stages the released cohort at the project target location.

`settlement_founding_handoff` is unique by project, flow, station, and founded population. Its guard requires a completed founding project, an arrived founding flow physically released from its origin, an exact survivor quantity, a station at the project target, and a detailed station population equal to the staged cohort.

The migration conservation view counts staged founders in `population_in_flows` until the handoff exists. At handoff, those same people move exactly once into station population without changing total accounted world population.

Founding deliberately creates the station in a zero-resident `FALLEN` seed state. The existing trigger chain initializes logistics, vendors, civilization, observation, demographic, and population authorities without creating residents. The exact arrived cohorts then replace the zero detailed population. A schema-030 handoff trigger replaces the zero aggregate row with an immutable `GENERATED_ALLOCATION` baseline containing the exact founder resident and workforce counts.

## Terminal contribution disposition

Schema 031 adds one immutable disposition row for each contributed support record. Supported classifications are:

- `RETURNED`
- `STRANDED`
- `CONSUMED`
- `LOST`

The database rejects a `FAILED` or `CANCELLED` transition while any contribution lacks a disposition. `SettlementContributionDispositionTransaction` validates one plan per contribution, restores returned steel and rations, validates population outcomes against migration-flow quantities, validates transport outcomes against canonical vessel state, requires released security to be returned, requires performed work to be consumed, records immutable evidence, and only then applies the terminal transition.

Physical returns, classification rows, and lifecycle transition share a savepoint. A failed terminal transition restores inventory and removes all provisional disposition evidence before control returns to the caller.

## Deterministic migration and project progression

`NpcPopulationMigrationEngine` remains the single passive migration synchronizer. It distinguishes founding-site arrivals inside its existing `IN_TRANSIT` branch:

- an undamaged founding transport stages the complete cohort as `ARRIVED` without creating a station;
- deterministic travel casualties cause the complete committed cohort to return rather than accepting a partial founding population;
- a completed return restores the exact cohort at the origin and releases the project for a distinct replacement flow;
- ordinary station-bound migration retains its existing destination-capacity and arrival behavior.

`SettlementProjectEngine` advances only `ACTIVE` and `BLOCKED` projects in deterministic project-id order. It reads canonical station security, blocks unsupported work, resumes after recovery, and commits bounded work through `SettlementProjectTransaction`.

When work reaches exact completion, the engine invokes `SettlementProjectConsequences` in the same database connection. A failed consequence therefore rolls back final work, completion, contribution evidence, transition evidence, station initialization, population evidence, and canonical world mutation together when the engine runs inside the passive world transaction.

## Canonical completion consequences

- `FOUNDING` consumes one staged founding flow, creates one canonical station at the project target, installs exact detailed cohorts and immutable aggregate baselines, activates strained station operation and a holding frontier, and records immigration, handoff, cohort, and observation evidence.
- `EXPANSION` strengthens the existing station simulation state, civilization frontier, and NPC population capacities exactly once.
- `ABANDONMENT` requires the detailed station population to be zero before marking the station `FALLEN`, the frontier `ABANDONED`, and disabling economy and vendors.
- `RECLAMATION` requires the committed population at the target before restoring strained operation, a holding frontier, economy, vendors, and committed supplies.

Focused verification includes successful conserved founding and a deliberate handoff failure proving complete rollback of project work, terminal transition, station creation, location activation, detailed population, aggregate population, ledger evidence, observation evidence, and handoff rows.

## Query-only observation

`settlement_project_observation` exposes project identity, kind, status, origin and target names, transport, committed and required support, security, progress, timing, failure, and summary. `ObservationRegistry.settlementProjects(...)` uses the existing query-only connection, requires schema 029 or later, supports changed-since filtering and bounded limits, and returns nullable preparation, activation, and completion timing without mutating project state.

`settlement_founding_migration_observation` projects the founding flow, project, update tick, staged quantity, losses, station, founded population, handoff timing, and handoff evidence. `ObservationRegistry.settlementFoundingMigrations(...)` exposes that view through the same query-only connection with schema-030 gating, changed-since filtering, bounded limits, nullable pre-handoff fields, and no alternate registry or UI data store.

`settlement_contribution_disposition_observation` projects immutable terminal classification, contribution and project identity, physical source station, population, vessel or flow, quantity, tick, evidence key, and summary. `ObservationRegistry.settlementContributionDispositions(...)` exposes it through the same query-only connection with schema-031 gating, changed-since filtering, bounded limits, and durable-state fingerprint verification.

## Migration coverage

`WorldStorageContracts.DATABASE_SCHEMA_VERSION` is 31 and the forward dispatcher routes schemas 029, 030, and 031 directly to their canonical schema classes.

The fresh-world, schema-001 legacy-world, and pre-renumber local-world migration contracts now require the authoritative current schema rather than a hard-coded schema 028. Each path asserts schema-029 project state and guards, schema-030 founding handoff and conservation objects, schema-031 disposition state and guards, complete migration-ledger history, and zero foreign-key violations.

These contracts are committed but have not been executed in the current environment.

## Registered verification

The complete desktop verification suite includes:

- `SettlementLifecycleSchemaVerification`
- `SettlementFoundingMigrationSchemaVerification`
- `SettlementContributionDispositionSchemaVerification`
- `SettlementProjectTransactionVerification`
- `SettlementProjectContributionAuthorityVerification`
- `SettlementContributionDispositionTransactionVerification`
- `SettlementProjectEngineVerification`
- `SettlementProjectConsequencesVerification`
- `SettlementFoundingMigrationTransactionVerification`
- `SettlementObservationRegistryVerification`
- `SettlementFoundingObservationRegistryVerification`
- `SettlementContributionDispositionObservationRegistryVerification`
- founding-site staging, casualty return, origin restoration, and replacement-flow coverage inside `NpcPopulationMigrationEngineVerification`
- fresh, legacy, and pre-renumber schema-031 coverage inside `WorldDatabaseMigrationsVerification`

## Remaining implementation work

The next direct production change remains:

```java
SettlementProjectEngine.advance(connection, durable.worldId().toString(), tick);
```

inside the authoritative per-tick sequence of `PassiveWorldTickTransaction`, immediately after population migration synchronization and before later per-tick work completes. That placement keeps migration arrival, project progress, founding handoff, station mutation, research, checkpointing, audit evidence, and durable-clock advancement inside one rollback boundary.

After production integration:

1. extend the existing Observation Foundation desktop window with project, founding, and disposition evidence;
2. execute fresh, legacy, and pre-renumber migration contracts through schema 031;
3. execute exact-head Java 17 compilation and `toolbox.cmd verify`.

## Acceptance gate

Slice 2.4 remains **Active** until all of the following are true:

1. Production passive ticks invoke `SettlementProjectEngine` directly.
2. Founding, expansion, abandonment, and reclamation mutate canonical station and location state only at committed completion.
3. Contributions remain physically reconciled with inventory, population-flow, vessel, security, and terminal disposition authorities.
4. Passive-transaction verification proves migration staging, progress, blocking, completion, consequences, founding handoff, and rollback through the production path.
5. Fresh, legacy, and pre-renumber worlds execute successfully through schemas 029, 030, and 031.
6. The existing desktop observation surface displays project, founding, and disposition lifecycle evidence.
7. The exact published `main` head compiles under Java 17 and passes `toolbox.cmd verify`.
