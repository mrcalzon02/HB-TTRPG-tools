# P1 Floating Island / Skyland Production Contract

## Stage state

This document defines the prepared P1 implementation without activating it.

P0 remains the sole `required-next` stage until the integrated Island → Settlement → Airship Chromium gate passes. None of the prepared P1 assets may be added to `index.html`, registered as runtime migrations, loaded beside the active built-ins file, or promoted into the blocking workflow before P0 promotion.

Prepared profile contract:

```text
profileType: floating-island-foundation-profile
schemaVersion: 3.0.0
envelopeVersion: 1.0.0
```

The active runtime remains Island `2.0.0`.

## Runtime ownership

The prepared Island editor uses one shared application lifecycle and two coordinated domain models.

### Shared Kaysender production runtime

The existing shared runtime continues to own:

- Canonical envelope identity and revision
- Record library and active-record selection
- Recovery drafts and autosave timing
- Import normalization and migration invocation
- Clone behavior and provenance
- Parent inheritance and pinned revisions
- Canonical copy, download, and export
- Unsaved-change confirmation

P1 does not create a second persistence, identity, or recovery system.

### Structured Island production model

`KaysenderIslandV3ProfileModel.IslandProfileModel` owns the complete working Island profile except for live map interaction.

It provides:

- Atomic scalar field batches
- Normalized numeric, boolean, enum, list, line-array, and JSON values
- Fifteen stable-record collections
- Deterministic record IDs with local numeric collision suffixes
- Stable-ID protection after creation
- Precise section, record, and field locks
- Reference discovery before deletion
- Canonical derived-data and downstream-export rebuilding

### Surface-grid model

`IslandSurfaceGridController` owns live editing of `profile.map`.

After a surface mutation, the surface controller performs the one shared lifecycle dirty transition. Its map is then merged into the structured production model under dirty suppression. This synchronization must never create a second dirty mark.

### Legacy Island form

The existing Island `2.0.0` form remains a scalar seed and compatibility projection surface.

It may initialize or update supported scalar values, but it is not authoritative for deliberate v3 records. Legacy projection maps arbitrary v3 classifications and domain states into supported select options without rewriting authoritative v3 values.

## Authoritative implementation files

### Schema, semantic domain, and canonical transformation

- `data/kaysender/schemas/floating-island-production-profile.schema.json`
- `kaysender-island-v3-schema-validator.js`
- `kaysender-island-v3-domain.js`
- `kaysender-island-v3-transformers.js`
- `kaysender-island-v3-consumer-builders.js`

### Structured production editor

- `kaysender-island-v3-profile-model.js`
- `kaysender-island-v3-panels.js`
- `kaysender-island-v3-panels-lifecycle.js`
- `kaysender-island-v3-panels-atomic.js`
- `kaysender-island-v3-panels.css`
- `data/kaysender/editors/p1-island-production-panels-contract.json`
- `scripts/validate-p1-island-production-panels.mjs`
- `scripts/validate-p1-island-profile-locks.mjs`

### Surface editor and resize recovery

- `kaysender-surface-grid-editor.js`
- `kaysender-surface-grid-brushes.js`
- `kaysender-surface-grid-toolbar.js`
- `kaysender-surface-cell-inspector.js`
- `kaysender-surface-grid-resize.js`
- `kaysender-island-surface-grid-controller.js`
- `kaysender-surface-grid-editor.css`
- `kaysender-surface-grid-resize.css`
- `data/kaysender/editors/p1-surface-grid-reuse-contract.json`
- `data/kaysender/editors/fixtures/p1-island-surface-resize-case.json`

### Final adapter chain

The adapter factory is layered in this exact order:

1. `kaysender-island-v3-adapter-factory.js`
2. `kaysender-island-v3-adapter-schema-bridge.js`
3. `kaysender-island-v3-legacy-projection.js`
4. `kaysender-island-v3-adapter-panels-bridge.js`

The panel bridge is the final factory wrapper before `kaysender-editor-builtins-v3-prepared.js` registers the adapter.

Additional activation artifacts:

- `kaysender-island-v3-adapter.css`
- `data/kaysender/editors/p1-island-surface-adapter-contract.json`
- `data/kaysender/editors/p1-island-activation-manifest.json`
- `docs/p1-island-activation-runbook.md`
- `scripts/validate-p1-island-panel-bridge.mjs`
- `scripts/validate-p1-island-v3-adapter-factory.mjs`
- `scripts/validate-p1-island-activation-manifest.mjs`

## Structured production panels

The prepared browser editor contains fourteen scalar panels:

1. Identity and Classification
2. Geometry
3. Composition
4. Hydrology Ledger
5. Food Capacity
6. Resource Extraction
7. Motion Forecast
8. Stability Summary
9. Ecology Summary
10. Settlement Capacity
11. Route Capability
12. Visibility
13. Outputs
14. Derived Reconciliation

It also contains fifteen stable-record collection panels:

1. Water Sources
2. Reservoirs
3. Resource Nodes
4. Altitude Timeline
5. Drift Timeline
6. Fault Zones
7. Fracture Events
8. Landing Zones
9. Approach Corridors
10. Sites
11. Hazards
12. Habitats
13. Species Slots
14. Settlement Slots
15. Route Nodes

Map cells are intentionally excluded from these panels because they belong to the surface-grid editor.

Derived reconciliation and downstream exports are generated values. Derived values are displayed read-only; downstream export objects are not manually editable.

## Advanced JSON mirror

The base adapter’s sixteen JSON block editors remain available only as a collapsed, read-only advanced inspection view.

The structured production model rewrites these mirrors after changes. They do not accept authoritative edits and cannot bypass typed controls, stable-ID protections, precise locks, semantic validation, or schema validation.

## Deliberate editing rules

### Atomic scalar changes

A scalar-panel submission is intercepted by the final atomic wrapper and submitted through one `setFields` call.

All locks are checked before mutation. If one submitted path is locked, the entire batch aborts without partially changing unlocked fields.

One successful scalar submission creates one profile-model event and one shared lifecycle dirty transition.

### Stable record identity

Nested records use stable prefixed IDs.

Examples:

```text
water-western-springs
resource-central-iron
fault-eastern-rim
landing-western-skyport
site-central-cistern
habitat-central-pasture
settlement-slot-western-port
route-node-western-skyport
```

A record’s ID becomes read-only after creation. Renaming its display name never changes its ID.

New records receive deterministic IDs from their collection prefix and preferred label. Local collisions use numeric suffixes rather than random values or timestamps.

### Reference-guarded deletion

Removing a nested record is blocked while another profile path references it.

The model returns every referencing path, allowing the UI to explain exactly what must be repaired. A future dedicated repair workflow may perform a deliberate forced deletion, but ordinary panel removal may not silently break references.

### Precise locks

Lock matching follows these rules:

- A top-level section lock blocks all descendants.
- A whole-record lock blocks all fields and deletion of that record.
- A child field lock blocks only that field.
- A child field lock does not disable sibling fields.
- A child field lock does not disable unrelated record insertion into the collection.
- Record deletion checks both ancestor and descendant locks because deletion would remove every field.

## Surface-grid obligations

The Fleet Designer grid interaction pattern becomes the Island surface editor without importing React.

- Inactive coordinates represent open air outside the Island outline.
- Active cells retain stable `cell-*` IDs.
- Left click, Enter, or Space applies a compatible brush.
- Right click, Delete, or Backspace erases cell content while retaining identity.
- Arrow keys move focus.
- Cell and brush selection do not dirty the profile.
- Exact cell values remain editable through the selected-cell inspector.
- Imported values render through `textContent` or form values rather than interpreted HTML.

### Resize preview and recovery

Grid resizing is a previewed operation.

Before destructive resize, the editor reports:

- Removed cells and active cells
- Removed surface area
- Outgoing cell water, site, resource, and hazard links
- Direct ledger records anchored to removed cells
- Dependent records that rely on affected water sources, landing zones, fault zones, or habitats

Destructive resize requires explicit in-panel confirmation. Browser `confirm()` is not used.

Preview and cancellation do not mutate or dirty the profile. Confirmed resize uses the model’s existing resize event for the one dirty transition and retains a transient recovery snapshot outside canonical domain data.

Stale plans are rejected if dimensions, cell IDs, or cell coordinates changed after preview.

## Canonical build pipeline

Canonical save or export performs the following sequence:

1. Flush queued structured production events.
2. Merge the latest surface-controller map into the production model under dirty suppression.
3. Mirror the structured profile into the read-only advanced JSON blocks.
4. Synchronize supported legacy scalar seed changes without replacing deliberate v3 records.
5. Force `profileType` and schema version.
6. Recalculate the `derived` block with `KaysenderIslandV3Domain.applyDerived`.
7. Rebuild downstream exports with the final wrapped generic consumer builder.
8. Run structural diagnostics.
9. Run semantic and reference diagnostics.
10. Run surface-grid diagnostics.
11. Run synchronous closed-object schema validation.
12. Return the detached domain profile to the shared envelope runtime only when no error remains.

Canonical rebuilding does not mark the editor dirty by itself.

## Semantic reconciliation

The domain engine validates:

- Nested ID uniqueness
- Active-cell and default-route-node integrity
- Every cell, water, resource, fault, landing, site, hazard, habitat, settlement, route, and visibility reference
- Geometry ordering and active map-area reconciliation
- Composition totals
- Reservoir volume versus capacity
- Binding water, food, and land population limits
- Resource overextraction and fault-zone pressure
- Timeline ranges, overlap, and unknown gaps
- Player and GM visibility conflicts
- GM-secret and non-public-ID leakage into player-safe output

Warnings are retained in `derived.warnings`. Missing references are retained in `derived.brokenReferenceIds`.

The synchronous schema gate additionally rejects missing required properties, unknown properties in closed objects, wrong primitive types, invalid enums, malformed IDs, numeric-bound failures, insufficient array cardinality, and duplicate unique-array entries.

## Island 2.0.0 → 3.0.0 migration

The authoritative migration specification is:

```text
data/kaysender/editors/p1-island-v2-to-v3-migration-contract.json
```

The migration is executable in isolation but deliberately unregistered.

It copies every unambiguous v2 value and creates deterministic region and site-slot crosswalks:

```text
R001    → cell-r001
RUIN-01 → site-ruin-01
```

V2 generated site slots become planned or unknown records, not falsely completed sites. Quantitative information absent from v2 becomes visible conservative placeholders with warnings rather than invented precision.

The v2 maximum supported population becomes a land-limited estimate only. Sustainable population remains zero until water and food limits are quantified.

Migration registration occurs only after primitive transformers, the generic consumer wrapper, schema and projection layers, structured panel layers, and the final panel bridge have loaded.

## Downstream consumer boundaries

The final wrapped transformer generates detached payloads for:

- Population
- Settlement
- Ecology
- Route planning

Consumer constraints are derived from the current profile. They may not contain Aster Reach-specific assumptions when another Island is edited or migrated.

Standard consumer payloads exclude non-public parent records and secret text. When exported from a canonical envelope, consumers retain pinned parent profile and revision references.

## Activation sequence

After P0 passes and P1 becomes `required-next`:

1. Apply `p1-island-activation-manifest.json` exactly once.
2. Add all prepared CSS assets.
3. Replace the Kaysender script segment with the declared order.
4. Remove `kaysender-editor-builtins.js` from the page.
5. Load `kaysender-editor-builtins-v3-prepared.js`; never load both built-ins files.
6. Register the final wrapped Island migration exactly once.
7. Register the final structured, schema-enforcing Island adapter exactly once.
8. Keep Settlement and Airship at schema `1.0.0`.
9. Add every manifest-listed P1 validator to the blocking workflow.
10. Run the complete Chromium scenario matrix.

## P1 exit gate

P1 is complete only when observed browser receipts prove that:

- Structured scalar and collection editing covers every v3 section.
- Atomic submissions create one dirty transition.
- Precise locks affect only intended paths.
- Referenced records cannot be silently removed.
- The advanced JSON view remains read-only and synchronized.
- Surface changes synchronize without duplicate dirty transitions.
- Resize preview, cancellation, confirmation, and recovery work correctly.
- Recovery, import, migration, clone, save, and export preserve stable nested IDs.
- The v2 source fixture migrates to the expected deterministic v3 core.
- Schema and semantic errors block canonical envelope creation.
- Player-safe and standard consumer payloads exclude non-public source content.
- Island loads into Settlement and Island plus Settlement load into Airship as pinned revisions.
- Valid, malformed, projected, structured-edit, referenced-removal, locked-field, renamed, migrated, fractured, blank-working, and cell-removal scenarios pass Chromium.
- The roadmap explicitly promotes P1 before P2 begins runtime work.
