# Desktop Observation Contract

This document describes the implemented Milestone 1.1 boundary for passive world observation.

The authoritative implementation is:

```text
src/main/java/io/github/mrcalzon02/barotrauma/observation/ObservationContracts.java
```

The dependency-free verification entry point is:

```text
src/main/java/io/github/mrcalzon02/barotrauma/observation/ObservationContractVerification.java
gradle verifyObservationContract
```

## Scope

Milestone 1.1 defines stable vocabulary and invariants before schema 015 stores observation state. It does not yet add database tables, population seeding, new passive simulation behavior, or observation UI.

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

This mechanism is intended for schema-015 seed rows, observation events, snapshots, metric samples, and later deterministic population flows.

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

The canonical codec is an internal fixture and persistence boundary for early development. Milestone 10 may wrap this information in the larger `barotrauma-world-observation-v1` export format without changing the meaning of the underlying event fields.

## Snapshot identity

A snapshot identity contains:

- Snapshot UUID.
- World UUID.
- Tick sequence.
- Optional parent snapshot UUID.
- Rules-version token.

Ticks cannot be negative, and a snapshot cannot identify itself as its parent. Parent ordering and database existence constraints will be added with schema 015 and historical snapshot work.

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

The verifier is included in `verifyWorldStore` and is also available independently through `gradle verifyObservationContract`.

## Next implementation slice

Milestone 1.2 will introduce schema 015. Its tables must use this vocabulary and must not redefine equivalent status strings independently. The migration will seed NPC and creature observation rows deterministically from existing schema-014 station, civilization, ecology, and world-location state without modifying those source aggregates.
