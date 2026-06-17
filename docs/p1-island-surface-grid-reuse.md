# P1 Island Surface Grid Reuse

## Decision

The P1 Floating Island editor will reuse the interaction and state architecture of the Fleet Designer module-grid editor for Island surface-area mapping.

It will not introduce a second unrelated map editor.

The source implementation is:

- `mrcalzon02/Fleet-designer/src/components/VehicleAssemblyPanel.jsx`
- `mrcalzon02/Fleet-designer/src/game/vehicleSlotSystem.js`
- `mrcalzon02/Fleet-designer/src/vehicleSlots.css`

The HB-TTRPG-tools port is:

- `kaysender-surface-grid-editor.js`
- `kaysender-surface-grid-editor.css`
- `scripts/validate-p1-surface-grid-model.mjs`
- `data/kaysender/editors/p1-surface-grid-reuse-contract.json`

These files are currently inert P1 preparation artifacts. They are not loaded by `index.html` and do not activate the P1 runtime.

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
| Module assignment | Terrain brush or linked entity placement |
| Selected slot | Selected map cell |
| Slot editor | Cell inspector |
| Compatible modules | Compatible terrain, site, resource, water, hazard, or infrastructure brushes |
| Clear slot | Erase or deactivate surface cell |
| Autofill hull | Seed an Island outline or fill compatible blank cells |
| Assembly issues | Map, reference, area, and capacity diagnostics |

## Framework difference

Fleet Designer uses React. HB-TTRPG-tools uses plain browser JavaScript.

The React component is therefore not copied directly. The port preserves the data and interaction model in a framework-free form:

- `SurfaceGridModel` owns cell state and emits change events.
- `SurfaceGridView` renders buttons and handles pointer and keyboard input.
- The model can be validated without a browser.
- The view can be mounted later by the Floating Island adapter.

This keeps model state separate from rendering and allows the same grid model to support later district, facility, vessel, encounter-zone, or regional editors.

## Current controls

The prepared grid view supports:

- **Left click:** apply the selected compatible brush.
- **Right click:** erase or deactivate the cell.
- **Enter or Space:** apply the brush from the keyboard.
- **Delete or Backspace:** erase the cell.
- **Arrow keys:** move cell focus.
- **Focus/select:** update the external cell inspector.

Every model change emits an event and repaints the mounted view.

## Stable identity behavior

Surface editing must not replace cell identity.

- Changing terrain preserves the cell ID.
- Erasing a cell preserves the cell ID by default.
- Reactivating an erased cell preserves the cell ID.
- Resizing preserves all in-bounds cells and returns the removed out-of-bounds records for confirmation or recovery.
- Export returns the P1 `map` shape and removes internal view-only flags.

Stable nested IDs are necessary because sites, water sources, resources, hazards, settlement slots, and route nodes reference map cells.

## Island brush families

The future P1 toolbar should group brushes into modes rather than displaying one enormous undifferentiated palette.

### Outline

- Activate surface cell
- Deactivate surface cell
- Mark unstable edge
- Mark inaccessible void

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
- Scarlands
- Cavern mouth

### Elevation and slope

This mode edits quantitative elevation and slope fields through the selected-cell inspector. A brush may apply preset bands, but exact values remain manually editable.

### Hydrology

- Catchment assignment
- Spring or water-source link
- Reservoir link
- Drainage or overflow marker

### Sites and infrastructure

- Settlement site
- Dock or landing zone
- Cistern
- Road or access point
- Shrine
- Watchpoint
- Ruin
- Hidden facility

### Resources

- Mineral node
- Floatstone node
- Agricultural zone
- Forage zone
- Timber or biological resource

### Hazards and stability

- Fault zone
- Fracture edge
- Weather hazard
- Approach hazard
- Contamination
- Creature pressure

### Visibility

- Public
- Known locally
- Rumored
- GM-only

## Compatibility rules

The Fleet Designer’s allowed-module categories become Island brush compatibility rules.

Examples:

- A reservoir may require an active cell with a water catchment or suitable basin terrain.
- A conventional landing zone may reject steep or vertical-fracture cells.
- Arable terrain presets may reject cells whose usable percentage is below the preset minimum.
- A settlement site may require adequate usable area and reject critical fault zones unless explicitly overridden.
- Resource brushes may be restricted by composition and geology.
- GM visibility brushes apply to linked sites and hazards, not terrain geometry itself.

An incompatible brush must visibly mark the cell and must not silently apply.

## Inspector responsibilities

The grid is the spatial selector, not the only editing surface.

Selecting a cell should expose an inspector for:

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
- Lock state
- Validation messages

The inspector performs exact editing. Brushes perform fast placement and classification.

## Map resizing

Changing grid dimensions is destructive when cells fall outside the new bounds.

The future UI must:

1. Calculate which cells would be removed.
2. Show their IDs and linked entities.
3. Require confirmation.
4. Offer cancellation.
5. Preserve removed records in the recovery draft until the edited Island is deliberately saved.

## Randomization

Random map generation is allowed only as an accelerator.

- It may seed a new blank grid.
- It may fill selected blank cells.
- It may respect a selected outline or shape preset.
- It must not overwrite locked or manually edited cells.
- It must not regenerate the entire Island because one cell changed.

## Validation

The prepared model validator covers:

- Loading the P1 Aster Reach fixture.
- Preserving existing stable cell IDs.
- Editing terrain and percentages.
- Erasing and reactivating cells.
- Event emission.
- Arable-versus-usable diagnostics.
- Resize preservation and removal reporting.
- Export into the P1 `map` structure.
- Mouse and keyboard interaction markers.
- Brush compatibility checks.

This validator is preparatory and is not yet part of the blocking P0 workflow.

## Activation rule

After P0 passes and P1 becomes `required-next`:

1. Load `kaysender-surface-grid-editor.css` and `kaysender-surface-grid-editor.js` through the Floating Island adapter.
2. Bind `SurfaceGridModel` to the active Island envelope’s `data.map` object.
3. Add the brush toolbar and selected-cell inspector.
4. Route model changes through the shared P0 lifecycle so they mark the Island dirty and autosave recovery drafts.
5. Add P1 semantic-reference validation.
6. Add the surface-grid validator to the blocking workflow.
7. Exercise the valid and fractured fixtures through the browser runtime.
