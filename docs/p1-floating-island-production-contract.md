# P1 Floating Island / Skyland Production Contract

## Stage state

This document prepares P1 without activating it.

P0 remains the sole `required-next` stage until the integrated Island → Settlement → Airship Chromium gate passes. The files described here are schema and fixture preparation permitted by the roadmap policy. They must not be wired into the active adapter, production shell, or migration registry before P0 promotion.

## Purpose

The existing Island editor is a strong quantitative foundation generator. P1 turns that foundation into a persistent world object that can be deliberately edited and referenced by later Population, Settlement, Ecology, Route, Market, Faction, Crisis, Encounter, and Job editors.

The P1 domain profile remains:

```text
floating-island-foundation-profile
```

The P1 domain schema version is:

```text
3.0.0
```

The canonical shared editor envelope remains version `1.0.0`. P1 changes the Island domain data, not the shared envelope contract.

## Contract files

- `data/kaysender/schemas/floating-island-production-profile.schema.json`
- `data/kaysender/editors/fixtures/p1-floating-island-production-valid.json`
- `data/kaysender/editors/fixtures/p1-floating-island-reference-cases.json`

The valid fixture is the implementation target for the future editor. It is intentionally linked across cells, water, resources, sites, hazards, landing zones, ecology, settlement capacity, and route exports.

## Core design principles

### Deliberate editing over regeneration

Map cells and nested entities are persistent records with stable IDs. Random generation may create an initial draft, but subsequent randomization must be selective and must not replace locked or manually edited records.

### Exact parent object

The Island profile is the root spatial object. Later editors inherit a pinned Island envelope revision. They do not copy disconnected summary text.

### Stable references

Every map cell, site, hazard, resource node, water source, reservoir, fault zone, landing zone, approach corridor, habitat, species slot, settlement slot, and route node has a stable ID.

Renaming a record must not change its ID.

Deleting a referenced entity must produce a broken-reference diagnostic before save or export.

### Explicit time behavior

Altitude and horizontal drift are timelines rather than single descriptive labels. Each timeline segment has a stable ID, start day, end day, quantitative values, and forecast confidence.

### Quantitative capacity

Water, food, land, resources, settlement capacity, landing capacity, and route capacity are ledgers. The profile must explain the limiting factor rather than presenting one unsupported capacity number.

### Player and GM separation

Public facts, known sites, and known hazards are exported separately from GM-only sites, hazards, and secrets. Player-facing output must not leak GM-only IDs or text.

## Required editor panels

The future P1 runtime should expose these panels through the shared editor shell.

### Identity and classification

- Name
- Size class
- Shape profile
- Current use
- Sovereignty
- Survey status
- Stable profile ID, schema version, revision, and saved state from the shared shell

### Geometry and composition

- Length, width, and thickness
- Plan, usable, flat, and arable area
- Gross volume and estimated mass
- Ordinary rock, floatstone, soil/sediment, and cavern/void percentages
- Composition reconciliation warning

### Editable map

- Grid columns and rows
- Active and inactive cells
- Cell terrain, elevation, slope, usable percentage, and arable percentage
- Cell links to water, sites, resources, and hazards
- Cell area reconciliation against plan area
- Deliberate add, duplicate, move, deactivate, and delete actions

The editor must not regenerate the whole map when one cell changes.

### Hydrology ledger

- Water sources with location, type, potability, average daily yield, seasonality, and status
- Reservoirs with capacity, current volume, potability, and condition
- Annual renewable water
- Daily sustainable water
- Stored reserve and reserve days
- Distribution loss percentage

### Food capacity ledger

- Arable, pasture, and forage area
- Annual food units
- Sustainable population
- Ninety-day emergency population
- Import dependency percentage

### Resource nodes

- Resource type
- Map cell
- Quality
- Estimated reserve
- Annual safe extraction
- Current status
- Aggregate safe and current extraction totals

### Motion timeline

- Mean altitude
- Altitude segments
- Drift segments
- Forecast horizon
- Confidence per segment
- Gap and overlap diagnostics

### Stability and fracture

- Structural integrity description
- Overall risk
- Annual surface loss
- Fault zones linked to cells
- Fault triggers and estimated loss
- Fracture-event history
- Emergency threshold

### Approaches and landing zones

- Landing-zone location and type
- Maximum vessel class
- Daily capacity
- Weather limits and status
- Approach bearing and altitude corridor
- Linked approach hazards
- Pilot requirements

### Sites and hazards

- Stable IDs and map references
- Status
- Visibility
- Footprint
- Tags
- Cell-level placement and capacity checks

### Ecology envelope

- Habitats linked to cells
- Habitat area and condition
- Capacity index
- Species slots and ecological roles
- Population bands and status
- Aggregate pressure state

### Settlement capacity

- Water-limited population
- Food-limited population
- Land-limited population
- Sustainable population
- Emergency population
- Settlement slots linked to cells, water sources, and landing zones

### Route-node export

- Route nodes linked to cells and landing zones
- Altitude band
- Services
- Node status
- Default route node
- Daily arrival capacity
- Resupply and repair capability
- Chart confidence

### Visibility and output

- Player-known site IDs
- GM-only site IDs
- Player-known hazard IDs
- GM-only hazard IDs
- Public facts
- GM secrets
- Player-safe summary
- GM brief
- Wiki draft
- Downstream export bundles

## Reconciliation rules

These rules are semantic requirements beyond JSON shape validation.

### Identity and uniqueness

- Every nested entity ID must be unique within its entity class.
- `activeCellIds` may contain only existing cell IDs and may not contain duplicates.
- `defaultNodeId` must identify an existing route node.

### Reference integrity

All referenced IDs must exist:

- Cell site, resource, and hazard references
- Water-source and reservoir cell references
- Resource-node cell references
- Fault-zone cell references
- Fracture-event fault references
- Landing-zone cell references
- Approach landing-zone and hazard references
- Site cell references
- Hazard cell references
- Habitat cell references
- Species-slot habitat references
- Settlement-slot cell, water-source, and landing-zone references
- Route-node cell and landing-zone references
- Visibility site and hazard references
- Downstream export references

### Geometry

- Active cell area should reconcile with plan area within a declared tolerance.
- Usable area may not exceed plan area.
- Flat area may not exceed usable area.
- Arable area may not exceed flat area unless a deliberate terrace or vertical-farm exception is recorded later.

### Composition

The four composition percentages must total `100` within a small rounding tolerance.

### Hydrology

- Reservoir current volume may not exceed capacity.
- Daily sustainable water should reconcile with source yield, storage policy, and system losses.
- Reserve days must use the current demand assumption recorded in downstream population or settlement export data.

### Food and settlement capacity

- `settlementCapacity.sustainablePopulation` must equal the lowest binding water, food, or land limit unless an explicit import-support exception exists.
- Emergency population may exceed sustainable population only for a defined emergency duration.
- Import dependency above zero must be visible to Settlement, Route, and Market consumers.

### Resources and fracture

- Current annual extraction above safe extraction requires a warning.
- Extraction from a cell in a fault zone must expose the associated structural risk.
- A fracture event must reference an existing fault zone.

### Timelines

- Segment end day must be greater than start day.
- Timeline segments may not overlap.
- Gaps must be shown as unknown forecast periods rather than silently interpolated.
- Altitude minimum may not exceed altitude maximum.

### Visibility

- A site or hazard ID may not be both player-known and GM-only.
- Player-safe output may include public facts but may not include GM secrets or GM-only IDs.

## Migration from Island 2.0.0

The future migration should be registered only after P0 promotion.

The migration must preserve the existing Island envelope identity and revision history while upgrading domain data to `3.0.0`.

### Direct mappings

- `classification` → expanded classification with provisional sovereignty and survey status
- Existing geometry → quantitative geometry fields
- Existing composition → composition ledger
- Existing hydrology → hydrology summary and provisional source record
- Existing resources → one or more provisional resource nodes
- Existing motion → first altitude and drift timeline segments
- Existing site inventory and map foundation → cells, sites, and provisional hazards
- Existing insertion capacity → settlement and site capacity
- Existing outputs → player-safe summary, GM brief, and wiki draft

### Generated stable IDs

Migration-generated nested IDs must be deterministic from the parent profile ID and source field so repeated migration produces the same IDs.

Examples:

```text
cell-<profile-short-id>-x0-y0
water-<profile-short-id>-primary
resource-<profile-short-id>-primary
landing-<profile-short-id>-primary
route-node-<profile-short-id>-primary
```

### Provisional values

The migration must not fabricate unsupported precision. Quantities that cannot be derived should be marked provisional and accompanied by diagnostics.

Examples include:

- Reservoir volume
- Annual food units
- Exact extraction reserve
- Landing-zone daily capacity
- Habitat population bands
- Fault displacement thresholds

### Migration completion condition

A migrated profile may open in P1 with warnings, but it is not considered production-ready until:

- all broken references are resolved;
- composition and map area reconcile;
- water, food, and settlement capacities reconcile;
- a default route node exists;
- visibility classification is complete; and
- all provisional values have been reviewed or deliberately accepted.

## Downstream export obligations

### Population

- Sustainable population
- Emergency population
- Water, food, and land limits
- Ecology and hazard pressures

### Settlement

- Settlement slots
- Maximum footprint and population
- Water-source IDs
- Landing-zone IDs
- Public hazards and infrastructure constraints

### Ecology

- Habitat IDs
- Cell coverage
- Capacity and condition
- Species slots and pressure

### Route

- Route-node IDs
- Altitude and drift timelines
- Forecast confidence
- Landing and approach capability
- Resupply and repair services

### Market

- Safe extraction
- Current extraction
- Food surplus or dependency
- Water surplus or dependency
- Cargo and arrival capacity

### Faction

- Sovereignty
- Claimable sites and resources
- Strategic landing zones
- Hidden or contested assets

### Crisis

- Fault zones
- Water reserve days
- Food dependency
- Extraction pressure
- Emergency population and evacuation capacity

### Encounter

- Sites
- Hazards
- Approach corridors
- Fault zones
- Habitats
- GM-only locations

## P1 exit gate

P1 is complete only when:

- map cells can be deliberately edited rather than only generated;
- every site, resource, hazard, landing zone, and route node has a stable ID and valid map reference;
- acreage, composition, water, food, population capacity, drift, and fracture calculations reconcile;
- current and migrated profiles round-trip without data loss;
- player output does not leak GM-only information; and
- Population, Settlement, Ecology, and Route fixtures consume the exported profile successfully.
