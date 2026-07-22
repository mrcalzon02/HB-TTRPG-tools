# Milestone 2.4 — Settlement Lifecycle Projects

**Status:** Active implementation. Schemas 029–032 now define guarded projects, staged founding migration, exact terminal contribution disposition, and physical-support ownership. Authoritative project, founding, contribution, termination, consequence, observation, and deterministic lifecycle code exists. The existing desktop observation surface displays project, founding-flow, and disposition evidence. Direct production passive-tick invocation, production-path rollback coverage, complete Java/JDBC verification, and exact-head acceptance remain open.

Schema 029 establishes the durable project model required before settlements may be founded, expanded, abandoned, or reclaimed. Schema 030 extends the conserved NPC migration authority so a founding cohort can arrive at an unoccupied location, remain accounted for in transit staging, and become the first canonical station population only when its project completes. Schema 031 requires every physical commitment to receive an immutable terminal classification before a contributed project may fail or be cancelled. Schema 032 validates existing support evidence during migration and enforces source shape, project ownership, single-use population flows, and one assigned vessel across nonterminal projects.

## Implemented project authority

`settlement_project` records one project at one target location with an explicit kind and guarded lifecycle:

```text
PLANNED → PREPARING → ACTIVE ↔ BLOCKED → COMPLETE
                    ↘ FAILED or CANCELLED
```

The project kinds are `FOUNDING`, `EXPANSION`, `ABANDONMENT`, and `RECLAMATION`. Each project records its world, target location, optional origin and target stations, related population, assigned transport, sponsoring faction, required and committed materials, supplies, population, transport, security, work progress, timing, failure reason, and summary.

Only one nonterminal project may control a target location at a time. Schema 032 additionally permits one assigned NPC vessel across `PLANNED`, `PREPARING`, `ACTIVE`, and `BLOCKED` projects, while allowing canonical reuse after the earlier project becomes terminal. Terminal projects are immutable. Activation is rejected until all material, supply, population, transport, and security commitments meet their requirements. Completion is rejected unless progress equals the project target.

## Contributions and transitions

`settlement_project_contribution` records durable evidence for materials, supplies, population, transport, security, and work. Evidence keys are unique within a project. Contributions are exact rather than silently capped, work is accepted only while a project is active, and the final work allocation is reduced to the exact remaining progress.

`SettlementProjectTransaction` exposes explicit world-scoped methods for material and supply inventory, assigned transport, arrived population, and security. The generic public contribution operation accepts security only; materials, supplies, population, transport, and work cannot be minted through that public path. Connection-scoped operations remain available to the established single-writer transaction and are constrained by schema-032 guards.

`SettlementProjectContributionAuthority` reconciles commitments with canonical physical state:

- material commitments deduct unreserved `item-steel` from the project origin;
- supply commitments deduct unreserved `item-rations` from the project origin;
- transport commitments require the assigned NPC vessel to be idle and docked at the project origin;
- existing-station population commitments require an arrived station-bound population flow;
- founding population commitments require an arrived `FOUNDING_SITE` flow linked to the same project and target location.

All physical support methods require an active transaction. Inventory deduction and contribution evidence share a local savepoint, so rejected or duplicate evidence cannot consume stock. Outer transaction rollback restores both physical stock and project commitments.

Schema 032 requires source columns to match contribution kind, validates every source against the owning project, permanently prevents one arrived population flow from supporting multiple projects, and rejects duplicate nonterminal vessel assignment before work begins.

`settlement_project_transition` records lifecycle changes with tick, progress, evidence, and summary.

## Authoritative transactions

`SettlementProjectTransaction` is the sole settlement-project lifecycle mutation service. Public operations acquire the established world writer lock and commit or roll back project, contribution, and transition rows together. Connection-scoped operations let the passive world transaction use the same authority without introducing a second writer.

`SettlementFoundingMigrationTransaction` is the schema-030 authority for founding-site movement. It plans the exact required cohort against a `PREPARING` founding project, reuses the canonical migration transaction for preparation and departure, stages a complete arrived cohort without inventing a destination population, and performs the final one-to-one station handoff after project completion.

A founding project blocks duplicate active flows and unconsumed staged arrivals. A flow that is cancelled, failed, or fully returned releases the still-preparing project for a deterministic replacement attempt. Returned terminal flows are excluded from final handoff selection.

The ordinary migration public transaction accepts every supported schema from 028 through the current schema 032 rather than incorrectly requiring schema exactly 028.

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

Physical returns, classification rows, and lifecycle transition share a savepoint. A failed terminal transition restores inventory and removes all provisional disposition evidence before control returns to the caller. The connection-scoped disposition authority explicitly requires an active transaction.

## Deterministic migration and project progression

`NpcPopulationMigrationEngine` remains the single passive migration synchronizer. It distinguishes founding-site arrivals inside its existing `IN_TRANSIT` branch:

- an undamaged founding transport stages the complete cohort as `ARRIVED` without creating a station;
- deterministic travel casualties cause the complete committed cohort to return rather than accepting a partial founding population;
- a completed return restores the exact cohort at the origin and releases the project for a distinct replacement flow;
- ordinary station-bound migration retains its existing destination-capacity and arrival behavior.

`SettlementProjectEngine` processes projects in deterministic project-id order. A `PLANNED` project enters `PREPARING` on one tick without accumulating work. A fully supported `PREPARING` project enters `ACTIVE` on a later tick, also without accumulating work. Active work blocks when canonical station security falls below the requirement, resumes after recovery, and advances in bounded deterministic units through `SettlementProjectTransaction`.

When work reaches exact completion, the engine invokes `SettlementProjectConsequences` in the same database connection. A failed consequence therefore rolls back final work, completion, contribution evidence, transition evidence, station initialization, population evidence, and canonical world mutation together when the engine runs inside the passive world transaction.

## Canonical completion consequences

- `FOUNDING` consumes one staged founding flow, creates one canonical station at the project target, installs exact detailed cohorts and immutable aggregate baselines, activates strained station operation and a holding frontier, and records immigration, handoff, cohort, and observation evidence.
- `EXPANSION` strengthens the existing station simulation state, civilization frontier, and NPC population capacities exactly once.
- `ABANDONMENT` requires the detailed station population to be zero before marking the station `FALLEN`, the frontier `ABANDONED`, and disabling economy and vendors.
- `RECLAMATION` requires the committed population at the target before restoring strained operation, a holding frontier, economy, vendors, and committed supplies.

Focused verification includes successful conserved founding and a deliberate handoff failure proving complete rollback of project work, terminal transition, station creation, location activation, detailed population, aggregate population, ledger evidence, observation evidence, and handoff rows.

## Query-only observation and desktop presentation

`settlement_project_observation` exposes project identity, kind, status, origin and target names, transport, committed and required support, security, progress, timing, failure, and summary. `ObservationRegistry.settlementProjects(...)` uses the existing query-only connection, requires schema 029 or later, supports changed-since filtering and bounded limits, and returns nullable preparation, activation, and completion timing without mutating project state.

`settlement_founding_migration_observation` projects the founding flow, project, update tick, staged quantity, losses, station, founded population, handoff timing, and handoff evidence. `ObservationRegistry.settlementFoundingMigrations(...)` exposes that view through the same query-only connection with schema-030 gating, changed-since filtering, bounded limits, nullable pre-handoff fields, and no alternate registry or UI data store.

`settlement_contribution_disposition_observation` projects immutable terminal classification, contribution and project identity, physical source station, population, vessel or flow, quantity, tick, evidence key, and summary. `ObservationRegistry.settlementContributionDispositions(...)` exposes it through the same query-only connection with schema-031 gating, changed-since filtering, bounded limits, and durable-state fingerprint verification.

The existing Observation Foundation desktop window includes read-only `Settlement Projects`, `Founding Migrations`, and `Contribution Dispositions` tabs. They share the existing changed-since filter, bounded query limit, background refresh worker, and active desktop-world session.

## Migration coverage

`WorldStorageContracts.DATABASE_SCHEMA_VERSION` is 32 and the forward dispatcher routes schemas 029, 030, 031, and 032 directly to their canonical schema classes.

Schema 032 first validates preexisting schema-031 support history inside the migration transaction. It rejects malformed source shapes, unauthorized project sources, reused population flows, and duplicate nonterminal vessel assignments before installing its indexes and triggers. Valid completed WORK history and historical vessel reuse across terminal projects remain migration-compatible.

The fresh-world, schema-001 legacy-world, and pre-renumber local-world migration contracts require the authoritative current schema. Each path asserts schema-029 project state and guards, schema-030 founding handoff and conservation objects, schema-031 disposition state and guards, schema-032 source and ownership objects, complete migration-ledger history, and zero foreign-key violations.

Schema-032 SQL and migration rollback behavior have been exercised against SQLite in the current environment. Invalid histories remained at schema 31 with no durable or temporary schema-032 objects. The complete Java/JDBC migration chain has not yet been executed on the exact published head.

## Registered verification

The complete desktop verification suite includes:

- `SettlementLifecycleSchemaVerification`
- `SettlementFoundingMigrationSchemaVerification`
- `SettlementContributionDispositionSchemaVerification`
- `SettlementPhysicalSupportHardeningSchemaVerification`
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
- fresh, legacy, and pre-renumber schema-032 coverage inside `WorldDatabaseMigrationsVerification`

The transaction and deterministic-engine verifiers now install schema 032 and use correctly shaped physical source evidence, including real arrived population flows.

## Remaining implementation work

The next direct production change remains:

```java
SettlementProjectEngine.advance(connection, durable.worldId().toString(), tick);
```

inside the authoritative per-tick sequence of `PassiveWorldTickTransaction`, immediately after population migration synchronization and before research. That placement keeps migration arrival, preparation, activation, project progress, founding handoff, station mutation, research, checkpointing, audit evidence, and durable-clock advancement inside one rollback boundary.

After production integration:

1. extend `PassiveWorldSimulationVerification` with a real production-path settlement project and deliberate post-settlement rollback probe;
2. execute fresh, legacy, and pre-renumber migration contracts through schema 032 under Java 17 and SQLite JDBC;
3. execute exact-head compilation and `toolbox.cmd verify`.

## Acceptance gate

Slice 2.4 remains **Active** until all of the following are true:

1. Production passive ticks invoke `SettlementProjectEngine` directly.
2. Founding, expansion, abandonment, and reclamation mutate canonical station and location state only at committed completion.
3. Contributions remain physically reconciled with inventory, population-flow, vessel, security, schema-032 ownership, and terminal disposition authorities.
4. Passive-transaction verification proves migration staging, preparation, activation, progress, blocking, completion, consequences, founding handoff, and rollback through the production path.
5. Fresh, legacy, and pre-renumber worlds execute successfully through schemas 029, 030, 031, and 032.
6. The existing desktop observation surface displays project, founding, and disposition lifecycle evidence.
7. The exact published `main` head compiles under Java 17 and passes `toolbox.cmd verify`.
