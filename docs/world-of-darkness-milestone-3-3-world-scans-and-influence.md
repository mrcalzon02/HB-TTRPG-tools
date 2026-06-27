# Milestone 3.3 — Local and Global World Scans with Influence Groundwork

**Status: Complete**

This milestone connects named-location discovery, world-seed selection, immutable package persistence, global coverage, and the first supernatural spheres-of-influence map layer.

## Current world seed exposure

The Chronicle Spatial Engine now displays the active world directly above the map:

- World label.
- Stable `wodworld-xxxxxxxx` seed key.
- Raw seed value used for deterministic generation.
- Editing mode: local-only, local with a global counterpart, or embedded global.
- Number of locally stored packages.
- Number of globally embedded packages.
- Number of local viewport scans.
- Number of global viewport scans.
- Number of currently visible named locations still absent from the global register for the selected game line.

The raw seed and key can be copied from the interface. The selected seed remains governed by the combined embedded/local selector in the location-package panel.

## Named-location discovery

The discovery layer queries every OpenStreetMap node, way, or relation carrying a `name` tag inside the visible bounds.

Published scan context includes:

- OSM element type and ID.
- Name.
- Coordinates.
- Address when present.
- Feature classification.
- Selected source tags.
- Visible bounds, center, and zoom.
- Discovery timestamp.
- Server result cap and whether it was reached.

The live map instance and latest scan are exposed through `WODNamedLocationBridge` and custom events so other Chronicle systems can consume one authoritative viewport state.

## Scan Visible Area Locally

The local scan processes the nearest 90 named locations in the current viewport under the active world seed and selected game line.

For every eligible unclaimed location it:

- Produces the stable real-location key.
- Produces the stable world/location/game-line package key.
- Selects the world-specific 210-variant location context.
- Generates population, struggle, adventure hook, location seed, and item content.
- Stores OSM and viewport provenance in `location.spatialContext`.
- Saves the full immutable package beneath the active world in browser storage.
- Records local scan coverage.

Existing packages are retained without overwrite. Claimed locations are counted and deferred to the later claimed-business integration panel.

## Scan Visible Area Globally

The global button prepares a compact GitHub issue rather than embedding dozens of generated locations into a URL.

The compact issue contains only:

- Immutable world-seed metadata.
- Selected game line.
- Scan key.
- Viewport bounds, center, and zoom.
- Browser discovery count and response-cap state.

The repository owner runs `.github/workflows/ingest-wod-world-scan-batch.yml` with the issue number.

The workflow calls `scripts/ingest-wod-world-scan-rescan.mjs`, which:

1. Validates the seed and viewport.
2. Queries every named OpenStreetMap element inside the submitted bounds.
3. Uses the same viewport-size server caps as the browser.
4. Normalizes and sorts named locations by distance from the viewport center.
5. Processes the nearest 90 locations.
6. Skips claimed locations.
7. Generates complete immutable packages for every missing world/location/game-line key.
8. Preserves every existing package.
9. Records global scan coverage and server result counts.
10. Commits the resulting registry changes to `main`.

This allows one viewport scan to add every previously unscanned eligible location to the active embedded world without an oversized issue or one issue per location.

## Expanded location storage context

World-scan packages include `location.spatialContext` with:

- Source service.
- OSM type and ID.
- Direct OSM URL.
- Named-feature class.
- Selected OSM source tags.
- Scan key.
- Scan zoom.
- Scan bounds.
- Scan center.
- Discovery timestamp.

The global world record also stores `scanCoverage` keyed by `wodscan-xxxxxxxx`, including package keys, result counts, exclusions, response-cap state, and the game line used.

## Influence overlay groundwork

`data/world-of-darkness/influence_overlay_registry.json` is now the repository authority for future curated supernatural geography.

It supports the planned geometry types:

- Point.
- Circle.
- LineString.
- Polygon.
- MultiPolygon.

The initial vocabulary includes:

- Kindred.
- Garou.
- Changing Breeds.
- Hunter.
- Dreaming.
- Awakened.
- Mixed.
- Unknown.

The current runtime renders provisional circles from generated packages:

- Tangential locations: 120 metres.
- Active-unregistered locations: 240 metres.
- Inventoried locations: 420 metres.
- Mundane locations: no influence circle.

Local package circles are dashed. Global package circles are solid. The overlay can be filtered by local/global source and supernatural sphere.

These circles are scaffolding, not final faction borders. Later work will replace or supplement them with curated domains, routes, corridors, wards, caerns, chantries, havens, contested areas, and surveillance zones.

## Active files

- `world-of-darkness-named-location-bridge.js`
- `world-of-darkness-world-scan-overlay.js`
- `world-of-darkness-global-rescan-bridge.js`
- `scripts/ingest-wod-world-scan-rescan.mjs`
- `.github/workflows/ingest-wod-world-scan-batch.yml`
- `data/world-of-darkness/generated_location_registry.json`
- `data/world-of-darkness/influence_overlay_registry.json`
- `scripts/validate-wod-world-scan-overlay.mjs`
- `.github/workflows/validate-wod-world-scan-overlay.yml`

## Next work

The next sequential work is to persist the active game line and map filters, add evidence-confidence and political-pressure filters, and begin converting provisional circles into actual faction and supernatural-domain geometry stored by world seed.
