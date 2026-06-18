# P1 Floating Island / Skyland Production Contract

## Stage state

This document prepares P1 without activating it.

P0 remains the sole `required-next` stage until the integrated Island → Settlement → Airship Chromium gate passes. Nothing described here may be loaded by the active Island adapter, added to `index.html`, registered as a runtime migration, or promoted into the blocking workflow before P0 promotion.

The P1 domain profile remains:

```text
floating-island-foundation-profile
```

The prepared P1 domain schema version is:

```text
3.0.0
```

The canonical editor envelope remains version `1.0.0`.

## Authoritative contract files

### Domain contract

- `data/kaysender/schemas/floating-island-production-profile.schema.json`
- `data/kaysender/editors/fixtures/p1-floating-island-production-valid.json`
- `data/kaysender/editors/fixtures/p1-floating-island-production-edge-fractured.json`
- `data/kaysender/editors/fixtures/p1-floating-island-reference-cases.json`

### Reusable surface editor

- `kaysender-surface-grid-editor.js`
- `kaysender-surface-grid-brushes.js`
- `kaysender-surface-grid-toolbar.js`
- `kaysender-surface-cell-inspector.js`
- `kaysender-island-surface-grid-controller.js`
- `kaysender-surface-grid-editor.css`
- `data/kaysender/editors/p1-surface-grid-reuse-contract.json`
- `data/kaysender/editors/p1-island-surface-adapter-contract.json`
- `docs/p1-island-surface-grid-reuse.md`
- `scripts/validate-p1-surface-grid-model.mjs`

### Migration preparation

- `data/kaysender/editors/fixtures/p1-island-v2-migration-source.json`
- `data/kaysender/editors/p1-island-v2-to-v3-migration-contract.json`
- `data/kaysender/editors/fixtures/p1-island-v2-to-v3-expected-core.json`

### Downstream consumer preparation

- `data/kaysender/editors/p1-downstream-consumer-contract.json`
- `data/kaysender/editors/fixtures/p1-population-consumer-input.json`
- `data/kaysender/editors/fixtures/p1-settlement-consumer-input.json`
- `data/kaysender/editors/fixtures/p1-ecology-consumer-input.json`
- `data/kaysender/editors/fixtures/p1-route-consumer-input.json`
- `scripts/validate-p1-migration-and-consumers.mjs`

The valid Aster Reach fixture is the complete implementation target. The fractured Cinder Shards fixture ensures the contract also supports zero-sustainability, expedition-only, unstable Islands.

## Core design principles

### Deliberate editing over regeneration

Map cells and nested entities are persistent records with stable IDs. Random generation may seed a new draft or selected blank cells, but it must never regenerate an entire existing Island because one field changed.

### One shared lifecycle

The Island surface grid does not own a second dirty-state, autosave, import, clone, or export system. Its controller writes `profile.map`, marks the existing shared lifecycle dirty exactly once per model mutation, and relies on the shared recovery draft path.

### Stable references

Every map cell, site, hazard, resource node, water source, reservoir, fault zone, landing zone, approach corridor, habitat, species slot, settlement slot, and route node has a stable ID.

Renaming a record does not change its ID. Deleting or deactivating a referenced entity must produce a diagnostic before canonical save or export.

### Quantitative ledgers

Water, food, land, resources, settlement capacity, landing capacity, and route capacity are explicit ledgers. Sustainable population must identify its binding limit rather than presenting one unsupported number.

### Explicit movement

Altitude and horizontal drift are timelines with stable segment IDs, quantitative ranges, start and end days, and confidence. Unknown forecast periods remain explicit gaps.

### Player and GM separation

Public facts, player-known sites, and player-known hazards are exported separately from GM-only IDs and secrets. Standard downstream consumer payloads exclude GM-only source IDs and secret text.

## Required runtime panels

After activation, the shared Island editor exposes:

1. Identity and classification
2. Geometry and composition
3. Editable surface grid
4. Hydrology ledger
5. Food-capacity ledger
6. Resource nodes
7. Motion timeline
8. Stability and fracture history
9. Landing zones and approach corridors
10. Sites and hazards
11. Ecology envelope
12. Settlement capacity
13. Route-node export
14. Visibility and outputs

The surface grid provides spatial selection and rapid brush placement. Exact values and reference lists remain editable through the selected-cell inspector.

## Surface-grid obligations

The reusable Fleet Designer grid pattern becomes the Island surface editor.

- Inactive coordinates represent open air outside the Island outline.
- Active cells retain stable `cell-*` IDs.
- Left click, Enter, or Space applies a compatible brush.
- Right click, Delete, or Backspace erases cell content while retaining identity.
- Arrow keys move focus.
- Cell selection updates the inspector without dirtying the profile.
- Brush selection changes interaction state without dirtying the profile.
- Each actual model mutation produces one lifecycle dirty mark.
- Grid resize preserves in-bounds records and returns removed records for confirmation and recovery.

Field locks are precise. A lock on `map.cells.<id>.areaKm2` does not block unrelated terrain or hazard changes. Whole-map and whole-cell locks block their descendants.

## Semantic reconciliation

### Identity

- Nested IDs are unique within their entity class.
- `activeCellIds` identifies existing cells only.
- `defaultNodeId` identifies an existing route node.

### References

Every referenced ID must resolve, including:

- Cell site, resource, water, and hazard references
- Water-source and reservoir cell references
- Fault-zone cell references
- Fracture-event fault references
- Landing-zone cell references
- Approach landing-zone and hazard references
- Habitat cell references
- Species-slot habitat references
- Settlement-slot cell, water, and landing references
- Route-node cell and landing references
- Visibility site and hazard references
- Downstream export references

### Geometry and composition

- Active cell area reconciles with plan area within a declared tolerance.
- Usable area does not exceed plan area.
- Flat area does not exceed usable area.
- Arable area does not exceed flat area without a recorded exception.
- Composition totals `100` within rounding tolerance.

### Water, food, and settlement

- Reservoir volume does not exceed capacity.
- Sustainable water reconciles with source yield, storage policy, and losses.
- `settlementCapacity.sustainablePopulation` equals the lowest binding water, food, or land limit unless an explicit supported-import exception exists.
- Emergency population exceeds sustainable population only for a defined emergency period.

### Resources and stability

- Extraction above safe annual extraction produces a warning.
- Extraction from a fault-zone cell exposes structural risk.
- Fracture events reference existing fault zones.

### Timelines

- Segment end day exceeds start day.
- Segments do not overlap.
- Gaps remain unknown rather than being silently interpolated.
- Altitude minimum does not exceed maximum.

### Visibility

- No site or hazard is both player-known and GM-only.
- Player-safe outputs contain no GM-only IDs or secret text.

## Island 2.0.0 → 3.0.0 migration

The authoritative migration specification is:

```text
data/kaysender/editors/p1-island-v2-to-v3-migration-contract.json
```

It is prepared but deliberately unregistered.

### Preservation policy

The migration copies every unambiguous v2 value and creates deterministic crosswalks:

```text
R001      → cell-r001
RUIN-01   → site-ruin-01
```

Repeated migration of the same v2 record therefore produces the same nested IDs. Cell and site crosswalks come from source region and source slot IDs rather than random values or runtime timestamps.

### Generated site-slot policy

V2 `mapFoundation.siteSlots` were generated capacity placeholders, not completed world objects.

- `known` slots migrate as `unknown` sites with `known-locally` visibility.
- `unassigned` slots migrate as `planned` sites with `gm-only` visibility.
- Every migrated slot receives a `migrated-v2-slot` tag.
- Migration does not claim the site is active, occupied, or fully designed.

### Conservative provisional values

V2 did not retain enough evidence for several v3 ledgers. The migration must not fabricate precision.

The prepared contract uses zero or empty conservative placeholders for:

- Water throughput, potability certainty, storage, and reserve days
- Food units and sustainable food population
- Resource reserves and safe extraction tonnage
- Drift bearing
- Fault locations and fracture history
- Landing daily capacity and supported vessel class
- Route arrivals, services, repair, and resupply

Each placeholder produces an explicit warning.

The v2 `maximumSupportedPopulation` becomes only `landLimitedPopulation`. Water- and food-limited populations remain zero until reviewed, so migrated sustainable population remains zero.

### Migration completion condition

A migrated Island may open with warnings, but it is not production-ready until:

- all broken references are resolved;
- map area and composition reconcile;
- water, food, and settlement capacities are quantified and reconcile;
- drift bearing and landing details are reviewed;
- route services and capacity are reviewed;
- visibility classification is complete; and
- provisional values are deliberately accepted or replaced.

The expected deterministic outcome for the Morrow Shelf fixture is recorded in:

```text
data/kaysender/editors/fixtures/p1-island-v2-to-v3-expected-core.json
```

## Downstream consumer boundaries

The authoritative consumer specification is:

```text
data/kaysender/editors/p1-downstream-consumer-contract.json
```

Consumers receive detached, minimal payloads rather than unrestricted access to the entire parent Island profile.

When exported from a canonical envelope, every consumer stores the parent `profileId` and `revision` as a pinned-revision reference.

### Population consumer

Receives:

- Water-, food-, and land-limited population
- Sustainable and emergency population
- Habitable cell summaries
- Settlement-slot summaries
- Supply and extraction pressure
- Known hazards
- Route-access capacity

### Settlement consumer

Receives:

- One selected settlement slot
- Its host cell
- Only the water sources and landing zones referenced by that slot
- Available route nodes
- Public or locally known sites and hazards
- Island and slot capacity limits

### Ecology consumer

Receives:

- Habitats and species slots
- Habitat-covered cells
- Water context
- Public hazards
- Settlement, extraction, and food pressure

### Route consumer

Receives:

- Route nodes and default node
- Referenced landing zones
- Approach corridors
- Altitude and drift forecasts
- Referenced public approach hazards
- Route capability and resupply context

Standard consumer payloads exclude GM-only IDs and secret text. Imported payloads are detached copies and cannot mutate the parent Island.

## Activation sequence

After P0 passes and P1 becomes `required-next`:

1. Register `island-2.0.0-to-3.0.0` in the existing migration registry.
2. Change the built-in Island adapter’s current schema version to `3.0.0`.
3. Load the complete surface-grid stack through the Island adapter.
4. Construct the surface controller from the active envelope data and locks.
5. Bind all production panels to one canonical Island profile.
6. Emit downstream payloads through the prepared consumer boundaries.
7. Add both P1 validators to the blocking workflow.
8. Exercise valid, migrated, and fractured fixtures through live Chromium interaction tests.

## P1 exit gate

P1 is complete only when:

- the Island editor deliberately edits every required v3 section;
- surface-grid changes survive save, recovery, import, clone, and export;
- the v2 source fixture migrates to the expected deterministic v3 core;
- player-safe output and standard consumer payloads contain no GM-only source content;
- Population, Settlement, Ecology, and Route payloads reconcile with the active Island revision;
- the valid and fractured fixtures pass the live-browser workflow; and
- the roadmap explicitly promotes P1 before P2 begins runtime work.
