---
name: tabletop-battlespace-visualization
description: Maintain a system-neutral grid battlespace in CSV, calculate relative positioning/ranges/areas, and render deliberately primitive Pillow previews down to exactly one pixel per grid cell.
compatibility: Requires a host that can load Agent Skills. State mutation requires writable CSV storage. Preview rendering requires Python 3 and Pillow. Rules adjudication still requires the active system's distance, line-of-sight, cover, movement, and area-template rules when those differ from the generic geometric model.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  personality-engram: blacklight.charles
  execution-class: host-sandbox
---

# Tabletop Battlespace Visualization

Use this skill whenever Charles or another Agent Skills consumer needs an explicit spatial model of a tabletop battlefield: token placement, relative position, proximity, movement, range, elevation, terrain occupancy, areas of effect, or a low-resolution battlefield preview that a human can visually correct.

The authoritative battlespace is **structured state, not the image**. The PNG is a diagnostic projection of CSV coordinates. Never infer or overwrite authoritative coordinates from rendered pixels when the CSV state is available.

## Core design requirement

The minimum supported render mode is **exactly one pixel per grid cell**. A 40×30-cell battlefield must therefore be renderable as a 40×30-pixel image. A 100×100-cell battlefield must be renderable as a 100×100-pixel image.

This is not a degraded fallback. It is the canonical lowest-common-denominator representation. The renderer must remain usable by primitive reasoning hosts with only Python, Pillow, CSV file I/O, and ordinary image access.

Higher-resolution previews are derived from the same cell raster with nearest-neighbor scaling. Do not introduce antialiasing, interpolated coordinates, textures, sprites, decorative backgrounds, lighting, perspective, or other visual dependencies into the authoritative rendering path.

## Coordinate model

Use integer grid coordinates.

- `(0,0)` is the top-left cell of the raster.
- `x` increases to the right/east.
- `y` increases downward/south.
- Human instructions such as “left two” mean `dx=-2`; “right two” means `dx=+2`; “up one” means `dy=-1`; “down one” means `dy=+1`.
- `z_cells` is optional integer elevation measured in grid-cell units.
- `feet_per_cell` belongs to map state. Five feet per cell is the normal default for a conventional five-foot grid, but it is metadata rather than a hard-coded universal tabletop rule.
- Multi-cell creatures or objects occupy rectangular integer footprints using `width_cells` and `height_cells`.

Never convert cell coordinates into pixel coordinates for game-state persistence. Pixel positions are a render concern only.

## Canonical CSV state

Store battlespace files beside the other `ttrpg_state/` CSVs managed by `tabletop-sandbox-data-management`.

`battlefield_maps.csv`

`map_id,name,encounter_id,width_cells,height_cells,feet_per_cell,distance_rule,origin,notes,updated_at`

`battlefield_tokens.csv`

`map_id,token_id,entity_id,name,faction,x,y,width_cells,height_cells,z_cells,color,status,notes,updated_at`

`battlefield_terrain.csv`

`map_id,cell_x,cell_y,terrain_code,passable,movement_cost,cover,blocks_los,color,notes,updated_at`

`battlefield_effects.csv`

`map_id,effect_id,source_token_id,shape,origin_x,origin_y,target_x,target_y,radius_cells,length_cells,width_cells,cells,color,status,notes,updated_at`

Use stable IDs. `token_id` identifies a battlefield representation; `entity_id` links it to the character/NPC/creature tracked by the broader tabletop state family. Display name is never the sole key.

## Primitive raster contract

The renderer begins from a raw raster whose dimensions are exactly `width_cells × height_cells`. Each logical grid cell owns exactly one source pixel.

The baseline composite layer order is:

1. empty/background cell;
2. terrain cell;
3. active effect/AoE cell;
4. token occupancy;
5. collision marker when more than one token claims the same cell.

Flat RGB colors only are sufficient. Token faction colors should have stable defaults, while explicit token/effect/terrain RGB values may override them. At one pixel per cell, text labels, borders, icons, and grid lines are unnecessary and must not be required.

Because a single pixel cannot simultaneously display every overlapping semantic layer, the renderer must support separate `terrain`, `effects`, and `occupancy` rasters in addition to the normal `composite` raster. Geometry and rules queries use CSV state directly rather than relying on visible pixels.

Every rendered token preview should have a sidecar legend containing at least token ID, entity ID, name, faction, coordinates, footprint, elevation, and color. This allows a reasoning host to correlate primitive colored pixels with structured identities without requiring text inside the image.

If several tokens claim the same cell, mark the pixel with the collision color and report the conflicting token IDs in structured output. Do not silently hide one occupant behind another.

## Human correction loop

Human visual correction is an authoritative state-edit request, not an image-edit request.

Examples:

- “P1 should be two squares left.” → update `P1.x -= 2`.
- “I am one square farther up.” → update that token's `y -= 1`.
- “Move E3 to 17,9.” → set `E3.x=17`, `E3.y=9`.
- “That blast starts one square to the right.” → update the effect origin in structured state, recompute affected cells, then rerender.

After a correction, validate map bounds, persist the coordinates, record campaign-significant movement through the campaign ledger when appropriate, and regenerate the preview from the CSV state.

Never manipulate the previous PNG as the mechanism for moving a token.

## Spatial operations

The portable helper exposes the following operation classes. Hosts may wrap the same semantics as tool/API calls.

- `init` — initialize the battlespace CSV tables.
- `upsert-map` — create or update map dimensions, scale, encounter binding, and geometric distance rule.
- `place` — create/update a token at an absolute coordinate and footprint.
- `move` — move a token by absolute coordinates or relative `dx/dy/dz` offsets.
- `distance` — calculate geometric separation between token footprints under the selected map distance rule.
- `within` — return tokens within a supplied physical distance of a source token.
- `affected` — return tokens whose occupied cells intersect an explicitly stored or geometrically generated effect cell set.
- `render` — render `composite`, `terrain`, `effects`, or `occupancy` PNG output at `cell_pixels >= 1`.

The helper path is `scripts/battlespace.py`.

## Distance and rules boundaries

The generic geometry helper may represent `grid-chebyshev`, `manhattan`, or `euclidean` distance. These modes describe geometry only.

Do not silently decide a game's diagonal movement rule, reach rule, cover rule, line-of-sight rule, squeezing rule, threatened-area rule, or template-inclusion rule. If the active ruleset defines one, that ruleset is authoritative. If the system rule is unknown and the distinction affects adjudication, report the geometric result and identify the unresolved rules assumption.

For multi-cell tokens, distance is measured between the nearest occupied cells rather than blindly center-to-center. System-specific rules may override that interpretation.

## Areas of effect

`battlefield_effects.csv` can store either an explicit semicolon-delimited cell set such as `12,8;13,8;13,9` or a primitive geometric shape description.

Explicit cells are preferred whenever an authoritative rules engine has already determined the affected squares. The portable helper can generate simple geometric `circle`, `square`, `line`, and `rectangle` approximations for visualization and generic spatial queries. Those approximations must not be presented as a system's official template logic unless the active system confirms them.

A later system adapter may calculate cones, emanations, hexes, unusual templates, walls, facing arcs, or volumetric effects and write the resulting explicit cell set without changing this renderer.

## Relationship to the other tabletop skills

Use `encounter-state-and-initiative` for rounds, turns, initiative, participant combat state, and encounter lifecycle. Use this skill only for spatial state.

Use `character-stat-tracking` for HP, wounds, stress, conditions, resources, and similar entity state. A token may reference that entity through `entity_id`; do not duplicate its complete character sheet in `battlefield_tokens.csv`.

Use `campaign-ledger-management` for campaign-significant movement, placement, effect, or battlefield-state history when persistence/audit matters.

Use `tabletop-sandbox-data-management` as the shared CSV persistence foundation.

Use `tabletop-check-resolution` and `tabletop-dice-rolling` for actual game checks/randomness. Battlespace geometry never grants a random source.

## Portable rendering acceptance criteria

A compliant implementation must satisfy all of the following:

- Render a valid `width_cells × height_cells` RGB PNG at `cell_pixels=1`.
- Produce no mandatory text, font, icon, texture, sprite, WebGL, SVG, canvas, browser, or network dependency for the baseline PNG.
- Use nearest-neighbor scaling when `cell_pixels > 1` so cell geometry remains exact.
- Preserve token coordinates independently of image resolution.
- Represent a 2×2 token as exactly four source pixels in the occupancy raster.
- Reject token footprints that leave map bounds rather than clipping them silently.
- Detect and report token-cell collisions.
- Provide a structured legend/readout beside the preview.
- Allow the exact same CSV state to regenerate the exact same cell-color geometry, except for intentionally changed state.
- Never claim that a PNG was rendered or a CSV mutation was saved without host read/write evidence.

## Hard boundaries

The preview is deliberately simplistic. Do not turn this skill into a conventional decorative VTT renderer by default.

Do not infer real tactical state from a hand-drawn or generated image when authoritative CSV coordinates exist. Do not let a visual preview silently mutate canonical state. Do not fabricate file persistence, Pillow availability, map contents, distances, line of sight, or successful movements when the host cannot execute or verify them.
