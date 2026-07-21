# Milestone 2.4 — Settlement Lifecycle Projects

**Status:** Active foundation implemented; authoritative project transactions, passive progression, settlement-state mutation, observation registry integration, desktop presentation, and exact-head verification remain.

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

`settlement_project_contribution` records durable evidence for:

- materials;
- supplies;
- population;
- transport;
- security;
- work.

A contribution may reference its source station, source population, source NPC vessel, and a physical population flow. Evidence keys are unique within a project so the same delivery cannot be counted twice.

`settlement_project_transition` records lifecycle changes with tick, progress, evidence, and summary.

## Query-only observation

`settlement_project_observation` exposes project identity, kind, status, origin and target names, transport, committed and required support, security, progress, timing, failure, and summary. This is a read-only projection and does not create a second simulation authority.

## Verification foundation

`SettlementLifecycleSchemaVerification` applies the real schema-029 statements against minimal prerequisite authorities and verifies:

- all tables and the observation view are created;
- a fully supported project may prepare, activate, and complete;
- unsupported activation is rejected;
- illegal lifecycle transitions are rejected;
- terminal mutation is rejected;
- duplicate active projects at one target location are rejected;
- the schema preserves foreign-key integrity.

The focused verification is registered in `DesktopPersistenceVerificationSuite`.

## Next implementation slice

The next change must add one authoritative `SettlementProjectTransaction` rather than direct SQL mutation from callers. It should:

1. Plan projects deterministically with exact requirements.
2. Commit contributions through existing inventory, population-flow, NPC-vessel, and station-security authorities.
3. Progress active work during `PassiveWorldTickTransaction` inside the same rollback boundary.
4. Apply founding, expansion, abandonment, and reclamation consequences to canonical station and location state only when a project completes.
5. Record transitions, observations, station changes, and audit evidence atomically.
6. Contain failure by preserving committed resources and explicitly recording whether they were returned, stranded, consumed, or lost.

After that transaction exists, add query-only registry access and extend the existing Observation Foundation window. Do not mark Slice 2.4 complete until fresh and legacy migration, deterministic progression, failure rollback, desktop evidence, and exact-head `toolbox.cmd verify` have passed.
