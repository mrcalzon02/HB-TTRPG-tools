# P1 Island Surface Grid Reuse

## Decision

The P1 Floating Island editor will reuse the interaction and state architecture of the Fleet Designer module-grid editor for Island surface-area mapping.

It will not introduce a second unrelated map editor, lifecycle, persistence path, or profile identity system.

The source implementation is:

- `mrcalzon02/Fleet-designer/src/components/VehicleAssemblyPanel.jsx`
- `mrcalzon02/Fleet-designer/src/game/vehicleSlotSystem.js`
- `mrcalzon02/Fleet-designer/src/vehicleSlots.css`

The prepared HB-TTRPG-tools stack is:

- `kaysender-surface-grid-editor.js`
- `kaysender-surface-grid-brushes.js`
- `kaysender-surface-grid-toolbar.js`
- `kaysender-surface-cell-inspector.js`
- `kaysender-island-surface-grid-controller.js`
- `kaysender-surface-grid-editor.css`
- `scripts/validate-p1-surface-grid-model.mjs`
- `data/kaysender/editors/p1-surface-grid-reuse-contract.json`
- `data/kaysender/editors/p1-island-surface-adapter-contract.json`

These files are currently inert P1 preparation artifacts. They are not loaded by `index.html`, are not mounted by the active Island adapter, and do not activate the P1 runtime.

## What is being reused

The Fleet Designer already provides the correct editor pattern:

- A rectangular coordinate grid with inactive space around an irregular active shape.
- Typed cells.
- Selected-cell state.
- A separate cell inspector.
- Assignment records that change cell content without changing cell position.
- Compatibility filtering between a cell and the selected module.
- Clear, reset, and autofill operations.
- Derived validation issues.
- Keyboard-addressable buttons.

For Island mapping, the same pattern becomes:

| Fleet Designer | Floating Island editor |
|---|---|
| Hull template grid | Island coordinate envelope |
| Disabled `.` cell | Open air / inactive coordinate |
| Hull slot | Active Island surface cell |
| Slot type | Surface-zone or terrain category |
| Module assignment | Terrain patch or linked stable entity reference |
| Selected slot | Selected map cell |
| Slot editor | Exact-value cell inspector |
| Compatible modules | Compatible terrain, water, site, resource, or hazard brushes |
| Clear slot | Erase cell content or deactivate surface |
| Autofill hull | Seed an Island outline or fill compatible blank cells |
| Assembly issues | Map, reference, area, and capacity diagnostics |

Separate ledgers such as landing zones, approach corridors, water sources, reservoirs, fault zones, habitats, settlement slots, and route nodes remain separate records. The grid may select their map cell, but it must not misrepresent those records as native cell fields.

## Framework difference

Fleet Designer uses React. HB-TTRPG-tools uses plain browser JavaScript.

The React component is therefore not copied directly. The port preserves the data and interaction model in a framework-free stack:

- `SurfaceGridModel` owns cell state, stable IDs, movement, resizing, events, diagnostics, and map export.
- `SurfaceGridView` renders accessible cell buttons and handles pointer and keyboard input.
- `KaysenderSurfaceGridBrushes` provides grouped cell-native and stable-reference brushes.
- `SurfaceGridToolbar` renders grouped brush controls without changing profile data by itself.
- `SurfaceCellInspector` performs exact editing, lock presentation, and cell-specific diagnostics.
- `IslandSurfaceGridController` binds all of the above to the shared Kaysender lifecycle, active profile, locks, diagnostics, and recovery autosave path.

This keeps model state separate from rendering and allows the same grid engine to support later district, facility, vessel, encounter-zone, regional, or tactical editors.

## Current controls

The prepared grid view supports:

- **Left click:** apply the selected compatible brush.
- **Right click:** erase or deactivate the cell.
- **Enter or Space:** apply the brush from the keyboard.
- **Delete or Backspace:** erase the cell.
- **Arrow keys:** move cell focus.
- **Focus/select:** update the external cell inspector.

Selecting a brush changes interaction state only. It does not dirty the Island record until the brush changes a cell.

Every model mutation emits one event, repaints the view, updates `data.map`, and produces exactly one shared lifecycle dirty mark.

## Stable identity behavior

Surface editing must not replace cell identity.

- Changing terrain preserves the cell ID.
- Exact inspector editing preserves the cell ID.
- Deactivating a cell through the inspector preserves its content and ID.
- Erasing a cell preserves the cell ID by default while clearing its content.
- Reactivating an erased or deactivated cell preserves the cell ID.
- Resizing preserves all in-bounds cells and returns removed out-of-bounds records for confirmation or recovery.
- Export returns the P1 `map` shape and removes internal view-only state.

Stable nested IDs are necessary because sites, water sources, resources, hazards, landing zones, habitats, settlement slots, and route nodes reference map cells.

## Prepared brush catalog

The default catalog is grouped rather than presented as one undifferentiated list.

### Outline

- Activate surface
- Deactivate surface

### Terrain

- Plateau
- Pasture
- Forest
- Wet basin
- Ridge
- Cliff shelf
- Ravine
- Quarry
- Ruins
- Mining scarlands
- Cavern mouth
- Unstable edge

Terrain brushes set a useful starting terrain, slope, usable percentage, and arable percentage. The inspector remains authoritative for exact values.

### Elevation

- Low surface
- Level surface
- Raised surface
- High ridge

Elevation presets are relative to the Island mean altitude.

### Slope

- Flat
- Gentle
- Mixed
- Steep
- Vertical fracture

### Stable reference brushes

Brush factories can link or unlink existing records through cell-native reference fields:

- Water catchment ID
- Site IDs
- Resource node IDs
- Hazard IDs

The brush catalog de-duplicates reference arrays and never creates a second copy of the referenced entity.

## Compatibility rules

The Fleet Designer’s allowed-module categories become Island brush compatibility rules.

Current prepared rules include:

- Water brushes require an active surface cell.
- Water brushes reject steep or vertical-fracture cells unless explicitly overridden.
- Site brushes reject unstable-edge terrain unless explicitly overridden.
- Resource brushes reject wet-basin extraction unless explicitly overridden.
- Locked fields reject only the brush families that would change those fields.
- A lock on `areaKm2` does not automatically block terrain, hazard, or site changes.
- A whole-cell or whole-map lock blocks every affected field under that path.

An incompatible brush visibly marks the cell and must not silently apply.

## Inspector responsibilities

The grid is the spatial selector, not the only editing surface.

The prepared inspector exposes:

- Stable cell ID
- Coordinates
- Active state
- Area
- Terrain
- Elevation
- Slope
- Usable percentage
- Arable percentage
- Water-catchment reference
- Site references
- Resource references
- Hazard references
- Field lock state
- Cell-specific validation messages

The inspector performs exact editing. Brushes perform fast placement and classification.

Inspector input is normalized before reaching the model:

- Percentages are clamped from `0` to `100`.
- Area cannot become negative.
- Empty water references become `null`.
- Comma-separated reference lists are trimmed and de-duplicated.
- Read-only identity and coordinate fields cannot be edited.

An inspector submission changes the model. The model event performs the one lifecycle dirty mark. The inspector does not schedule a second autosave.

## Shared lifecycle integration

The controller is designed around the existing P0 lifecycle rather than inventing its own state machine.

For each model mutation it will:

1. Replace the active Island profile’s `map` block with `SurfaceGridModel.toMap()`.
2. Call `KaysenderEditorLifecycle.markDirty(editorId, message)` exactly once.
3. Allow the existing shared autosave callback and 1.2-second delay to save the recovery envelope.
4. Forward current map diagnostics to the shared diagnostics surface.
5. Notify the future Island adapter through `onProfileChange`.

The following do **not** mark the record dirty:

- Selecting a cell
- Moving keyboard focus
- Selecting a brush
- Opening or closing a brush family
- Rendering diagnostics

## Field-lock paths

The controller uses canonical nested lock paths:

```text
map
map.cells.<cellId>
map.cells.<cellId>.<field>
```

Examples:

```text
map.cells.cell-western-port.areaKm2
map.cells.cell-central-pasture.terrainType
map.cells.cell-eastern-rim.hazardIds
```

The controller maps each brush family to the fields it changes. Terrain brushes check terrain, slope, usable, and arable locks. Elevation checks only elevation. Water, site, resource, and hazard brushes check only their corresponding reference fields.

## Map resizing

Changing grid dimensions is destructive when cells fall outside the new bounds.

The future UI must:

1. Calculate which cells would be removed.
2. Show their IDs and linked entities.
3. Require confirmation.
4. Offer cancellation.
5. Preserve removed records in the recovery state until the edited Island is deliberately saved.
6. Warn when removed cells are still referenced by water, resources, sites, hazards, landing zones, habitats, settlement slots, or route nodes.

The model already returns removed records and preserves every in-bounds cell.

## Randomization

Random map generation is allowed only as an accelerator.

- It may seed a new blank grid.
- It may fill selected blank cells.
- It may respect a selected outline or shape preset.
- It must skip locked target fields.
- It must not overwrite manually edited cells unless they were explicitly selected.
- It must not replace stable cell IDs.
- It must not regenerate the entire Island because one cell changed.

## Adapter integration

The prepared adapter contract defines the future behavior for:

- Opening the surface panel
- Building a canonical profile
- Applying imported, migrated, or recovered profiles
- Validation
- New blank records
- Recovery drafts
- Imports
- Selective randomization
- Canonical export
- Cloning
- Closing and cleanup

The controller will be constructed from the active envelope data and locks. It will not own profile identity, revisioning, imports, drafts, cloning, or exports; those remain shared P0 responsibilities.

## Validation

The prepared validator now covers:

- Loading the P1 Aster Reach fixture.
- Preserving existing stable cell IDs.
- Editing terrain and percentages.
- Erasing, deactivating, and reactivating cells.
- Event emission.
- Arable-versus-usable diagnostics.
- Resize preservation and removal reporting.
- Export into the P1 `map` structure.
- Default terrain, elevation, and slope palettes.
- Water, site, resource, and hazard reference brushes.
- Reference de-duplication and unlinking.
- Compatibility reasons.
- Exact inspector normalization and patch application.
- Field-lock matching and whole-cell lock distinctions.
- Grouped toolbar controls.
- Single lifecycle dirty marking.
- Mouse and keyboard interaction markers.
- Grid, toolbar, and inspector styling.

This validator is preparatory and is not yet part of the blocking P0 workflow.

## Activation rule

After P0 passes and P1 becomes `required-next`:

1. Register the Island `2.0.0` → `3.0.0` migration.
2. Change the Island adapter’s current schema version to `3.0.0`.
3. Load the complete surface-grid stack through the Floating Island adapter.
4. Create toolbar, grid, inspector, and resize mount points.
5. Construct one `IslandSurfaceGridController` from the active envelope data and locks.
6. Merge controller diagnostics with schema and semantic-reference diagnostics.
7. Add the surface-grid validator to the blocking workflow.
8. Exercise the valid and fractured fixtures through live Chromium interaction tests.
