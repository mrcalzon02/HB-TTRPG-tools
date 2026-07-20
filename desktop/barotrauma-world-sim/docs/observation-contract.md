# Desktop Observation Contract

This document describes the implemented observation vocabulary and the schema-015 foundation that now depends upon it.

The authoritative contract implementation is:

```text
src/main/java/io/github/mrcalzon02/barotrauma/observation/ObservationContracts.java
```

The dependency-free verification entry point is:

```text
src/main/java/io/github/mrcalzon02/barotrauma/observation/ObservationContractVerification.java
toolbox.cmd verify
```

## Scope

Milestone 1.1 defines stable vocabulary and invariants. Milestone 1.2 stores that vocabulary in schema 015, Milestone 1.3 reconstructs it through the query-only Observation Registry, and Milestone 1.4 exposes it through the read-only desktop Observation Foundation window.

The contract itself does not yet define autonomous population growth, mortality, migration decisions, settlement founding, abandonment, or reclamation. Those behaviors begin with Milestone 2 and must preserve this accounting and evidence boundary.

The contract version is:

```text
barotrauma-world-observation-contract-1
```

The initial rules version is:

```text
desktop-observation-rules-1
```

A change that alters serialized field meaning, removes or renames a stable vocabulary value, or changes deterministic identity input must increment the applicable version rather than silently reinterpreting existing evidence.

## Stable vocabulary

### Observation event categories

- `POPULATION`
- `SETTLEMENT`
- `FACTION`
- `CREATURE`
- `MIGRATION`
- `HABITAT`
- `RESOURCE`
- `TRADE`
- `FLEET`
- `DISASTER`
- `RESEARCH`
- `MISSION`
- `SYSTEM`

### Observed entity types

- `WORLD`
- `LOCATION`
- `STATION`
- `FACTION`
- `VESSEL`
- `NPC_POPULATION`
- `CREATURE_POPULATION`
- `CREATURE_TERRITORY`
- `ROUTE`
- `RESOURCE_SITE`
- `MISSION`
- `OBSERVATION_EVENT`

### Causes

The initial cause vocabulary covers population gains and losses, migration, settlement lifecycle, supply and security changes, habitat and predation, reproduction and starvation, hunting, displacement, extraction, trade, disasters, mission outcomes, imports, initialization, and an explicit `OTHER` category.

A primary cause has a required evidence key and a weight from 1 through 100. Additional contributing causes are stored as an immutable ordered list.

### Population terms

Population accounting separates gains and losses:

```text
gains = births + immigration + other gains
losses = deaths + emigration + hunting losses + disaster losses + other losses
next = current + gains - losses
```

All terms and the current population must be nonnegative. Applying a delta that would produce a negative population fails instead of clamping or silently discarding losses.

### Population-flow states

```text
PLANNED
PREPARING
IN_TRANSIT
RETURNING
ARRIVED
FAILED
CANCELLED
```

Terminal flows cannot restart. Legal transition checks are part of the contract so schema triggers and simulation code can share one expected lifecycle.

### Creature-territory states

```text
DORMANT
FORAGING
NESTING
MIGRATING
EXPANDING
OVERPOPULATED
COLLAPSING
DISPLACED
```

### Visibility and confidence

Observation supports `OMNISCIENT` and `INTELLIGENCE` visibility modes. Confidence is represented by `UNKNOWN`, `LOW`, `MODERATE`, `HIGH`, and `CONFIRMED`, with stable numeric scores from 0 through 100.

## Stable identities

Observation IDs are generated from:

- World UUID.
- Stable namespace token.
- Natural entity or event key.
- Canonical tick.
- Ordinal within that tick and namespace.

The input is normalized and passed through Java's name-based UUID generation. Repeating the same input produces the same UUID; changing an ordinal or other identity component produces a different identity.

Schema-015 deterministic seed rows use world identity plus stable source ordinals and population-class codes to avoid duplicate or order-dependent identities.

## Observation events

An observation event contains:

- Event and world UUIDs.
- Canonical tick and time.
- Event category.
- Primary entity type, UUID, and label.
- Primary cause and evidence key.
- Immutable contributing causes.
- Nonnegative magnitude.
- Visibility mode.
- Confidence.
- Bounded human-readable summary.

The contract provides a canonical dependency-free text codec. Text values use Base64URL fields inside a fixed versioned record. Decoding rejects unsupported versions, malformed field counts, invalid UUIDs, invalid numeric fields, invalid cause weights, blank required evidence, and malformed text data.

The canonical codec is an internal fixture and persistence boundary. Milestone 10 may wrap this information in the larger `barotrauma-world-observation-v1` export format without changing the meaning of the underlying event fields.

## Snapshot identity

A snapshot identity contains:

- Snapshot UUID.
- World UUID.
- Tick sequence.
- Optional parent snapshot UUID.
- Rules-version token.

Ticks cannot be negative, and a snapshot cannot identify itself as its parent. Schema 015 enforces the self-parent restriction and stores one deterministic migration root snapshot per world. Parent ordering, retention, and delta reconstruction are part of Milestone 7.

## Schema 015 application

Schema 015 applies the contract through:

- NPC population records derived from station and civilization state.
- Four initial ecological creature guilds per location.
- Creature territory state.
- Faction location presence.
- Population-flow storage.
- Causal observation events.
- Observation snapshots.
- Metric series.
- Watch-rule storage.
- Read-optimized summary views.

Migration seeding is duplicate-safe and does not rewrite the schema-014 civilization or ecology aggregates from which it derives observation state.

## Query-only reconstruction

`ObservationRegistry` enables `PRAGMA query_only=ON` and provides:

- Current world summary.
- NPC and creature populations.
- Creature territory evidence.
- Faction presence.
- Population flows.
- Events, snapshots, and metrics.
- Changed-since-tick queries.
- Selected-entity event history.

It rejects worlds older than schema 016 and worlds newer than the client supports.

## Verification

`ObservationContractVerification` checks:

- Exact stable event and entity vocabulary ordering.
- Contract and rules versions.
- Repeatable and distinct deterministic UUID generation.
- Population gain, loss, net-change, and application calculations.
- Rejection of negative terms and negative resulting populations.
- Legal population-flow transitions and terminal states.
- Immutable contributing-cause evidence.
- Exact canonical event encode/decode round trips.
- Rejection of unsupported contract versions and invalid cause weights.
- Snapshot self-parent rejection.

Additional focused verification is available through:

```text
toolbox.cmd verify
```

These verify deterministic schema seeds, source-state preservation, constraints, trigger seeding, foreign-key integrity, root snapshots, query-only reconstruction, changed-since-tick behavior, entity history, and unsupported-schema rejection.

All observation verifiers are included in `toolbox.cmd verify`.

## Next implementation slice

Milestone 2.1 will add transactional NPC population accounting. Every per-tick change must record population before and after, gains and losses, capacity inputs, reconciliation with the existing civilization frontier, metric evidence, and a causal observation event. Population movement and settlement lifecycle transitions remain blocked until conservation is established.
