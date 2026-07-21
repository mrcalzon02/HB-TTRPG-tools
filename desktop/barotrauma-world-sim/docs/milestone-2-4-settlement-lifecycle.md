# Milestone 2.4 — Settlement Lifecycle Projects

**Status:** Active implementation; schema 029, the authoritative transaction, deterministic security-gated progression, canonical expansion, abandonment and reclamation consequences, query-only registry access, and focused verification exist. Production passive-tick integration, conserved founding, physical contribution reconciliation, desktop presentation, migration coverage, and exact-head acceptance remain.

Schema 029 establishes the durable project model required before settlements may be founded, expanded, abandoned, or reclaimed. It does not permit direct settlement teleportation and does not introduce another station simulator.

## Implemented project authority

`settlement_project` records one project at one target location with an explicit kind and guarded lifecycle:

```text
PLANNED → PREPARING → ACTIVE ↔ BLOCKED → COMPLETE
                    ↘ FAILED or CANCELLED
```

The initial project kinds are:

- `FOUNDING`
- `EXPANSION`
- `ABANDONMENT`
- `RECLAMATION`

Each project records its world, target location, optional origin and target stations, related population, assigned transport, sponsoring faction, required and committed materials, supplies, population, transport, security, work progress, timing, failure reason, and summary.

Only one non-terminal project may control a target location at a time. Terminal projects are immutable. Activation is rejected until all material, supply, population, transport, and security commitments meet their requirements. Completion is rejected unless progress equals the project target.

## Contributions and transitions

`settlement_project_contribution` records durable evidence for materials, supplies, population, transport, security, and work. A contribution may reference its source station, source population, source NPC vessel, and a physical population flow. Evidence keys are unique within a project so the same delivery cannot be counted twice.

Contributions are exact rather than silently capped. A contribution that exceeds the remaining requirement is rejected. Work is accepted only while a project is active, and an oversized final work allocation is reduced to the exact remaining progress so its evidence quantity equals the committed state delta.

`settlement_project_transition` records lifecycle changes with tick, progress, evidence, and summary.

## Authoritative transaction

`SettlementProjectTransaction` is the sole schema-029 lifecycle mutation service. Public operations acquire the established world writer lock and commit or roll back project, contribution, and transition rows together. Connection-scoped operations let the passive world transaction use the same authority without introducing a second writer.

Implemented operations cover deterministic planning, contribution recording, preparation, activation, work progress, blocking, resumption, completion, failure, and cancellation. The transaction validates world ownership for referenced locations, stations, populations, vessels, and population flows before accepting them.

The focused transaction verification proves supported activation, exact bounded progress, duplicate-evidence rejection, over-contribution rejection, pre-activation work rejection, terminal immutability, transition evidence, foreign-key integrity, and rollback of project state.

## Deterministic progression engine

`SettlementProjectEngine` advances only `ACTIVE` and `BLOCKED` projects in deterministic project-id order. It reads current station security through the established station simulation state, synchronizes the committed project security value, blocks work below the required threshold, resumes work after recovery, and commits bounded work through `SettlementProjectTransaction`.

When work reaches exact completion, the engine invokes `SettlementProjectConsequences` in the same database connection. A failed consequence therefore rolls back final work, completion, transition evidence, and canonical station mutations together when the engine runs inside the passive world transaction.

## Canonical completion consequences

Implemented completion behavior is deliberately conservative:

- `EXPANSION` strengthens the existing canonical station simulation state, civilization frontier, and NPC population capacities exactly once at committed completion.
- `ABANDONMENT` requires the detailed station population to be zero before it marks the station `FALLEN`, marks the frontier `ABANDONED`, disables the station economy, and disables vendor offers.
- `RECLAMATION` requires the committed population already to exist at the target station before it restores strained station operation, a holding frontier, the station economy, vendor activity, and committed supplies.
- `FOUNDING` currently fails closed. The existing station seed triggers would create an NPC population from the frontier index, so station creation is prohibited until an arrived migration cohort can be handed into the new station without creating people from nothing.

`SettlementProjectConsequencesVerification` proves canonical expansion, fully evacuated abandonment, population-backed reclamation, occupied-station abandonment rejection, founding rejection, absence of partial station creation, and foreign-key integrity.

## Query-only observation

`settlement_project_observation` exposes project identity, kind, status, origin and target names, transport, committed and required support, security, progress, timing, failure, and summary.

`ObservationRegistry.settlementProjects(...)` uses the existing query-only connection. It requires schema 029, supports changed-since filtering and bounded limits, and returns nullable preparation, activation, and completion timing without mutating project state.

`SettlementObservationRegistryVerification` proves schema gating, ordering, limits, changed-since behavior, commitment and progress projection, nullable timing fields, and an unchanged durable-state fingerprint after reads.

## Registered verification

The complete desktop verification suite now includes:

- `SettlementLifecycleSchemaVerification`
- `SettlementProjectTransactionVerification`
- `SettlementProjectEngineVerification`
- `SettlementProjectConsequencesVerification`
- `SettlementObservationRegistryVerification`

These contracts are committed but have not been executed in the current environment.

## Remaining implementation work

The next direct production change is:

```java
SettlementProjectEngine.advance(connection, durable.worldId().toString(), tick);
```

inside the authoritative per-tick sequence of `PassiveWorldTickTransaction`, after population migration synchronization and before later per-tick work completes. The exact placement must keep settlement progress in the same rollback boundary as station economy, migration, vessel movement, research, checkpointing, audit evidence, and the durable clock.

After production integration, the next conserved lifecycle slice must:

1. Convert arrived founding population-flow cohorts into the first population of a newly created canonical station without invoking the generic population seed as a second source of people.
2. Reconcile material and supply contributions with `station_inventory` or physical freight delivery rather than accepting unsupported bookkeeping alone.
3. Reconcile transport commitment with an idle or completed NPC vessel assignment.
4. Classify failed or cancelled committed support as returned, stranded, consumed, or lost.
5. Record completion and failure as causal station changes, observation events, metrics, and audit evidence atomically.
6. Extend the existing Observation Foundation desktop window with settlement-project evidence.

Do not create a second registry, project simulator, or UI data store.

## Acceptance gate

Slice 2.4 remains **Active** until all of the following are true:

1. Production passive ticks invoke `SettlementProjectEngine` directly.
2. Founding, expansion, abandonment, and reclamation consequences mutate canonical station and location state only at committed completion.
3. Contributions are physically reconciled with inventory, population-flow, vessel, and security authorities.
4. Passive-transaction verification proves progress, blocking, completion, consequences, and rollback through the production path.
5. Fresh and legacy worlds migrate through schema 029.
6. The existing desktop observation surface displays project lifecycle and causal evidence.
7. The exact published `main` head compiles under Java 17 and passes `toolbox.cmd verify`.
