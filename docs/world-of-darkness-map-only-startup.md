# Chronicle Spatial Engine — Genuine Map-Only Startup

## Problem

The earlier staged loader still entered a hard-stop state while displaying **Loading lightweight map…**.

The label was inaccurate. The active startup stage still loaded `world-of-darkness-spatial-engine-inventory.js`, which did all of the following before or during Leaflet initialization:

- Started the Chronicle configuration request.
- Requested location, character, rumor, and central-registry data concurrently.
- Parsed those JSON files.
- Expanded prototype and context tables into runtime arrays.
- Built the complete three-column spatial interface.
- Installed the legacy named-location bridge.
- Attached a mutation observer across the spatial-engine subtree.

Leaflet then created and changed map, control, pane, tile, and attribution DOM beneath that observed subtree. Those changes could repeatedly trigger interface patching while the map library and Chronicle data were both being initialized.

The result was not a genuinely lightweight map stage. It was the previous full spatial engine beginning its work behind a new loading label.

## Replacement runtime

The active explicit-open core is now:

1. `world-of-darkness-lightweight-map-core.js`
2. `world-of-darkness-radial-location-loader.js`
3. `world-of-darkness-radial-scan-compat.js`

The following files remain in the repository but are no longer loaded during map startup:

- `world-of-darkness-named-location-bridge.js`
- `world-of-darkness-spatial-engine-inventory.js`

They are retained as historical and compatibility sources only.

## Map-only guarantees

Before the user scans a viewport, the active map core performs:

- Zero Chronicle dataset requests.
- Zero location, character, rumor, or registry expansion.
- Zero mutation observers.
- Zero automatic scans.
- Zero marker generation.
- Zero world-seed or influence-overlay initialization.

The only external runtime dependency at this stage is Leaflet itself, followed by ordinary OpenStreetMap tiles after the map mounts.

## Leaflet failure containment

Leaflet JavaScript now uses two sources in sequence:

1. jsDelivr.
2. unpkg.

Each source has a 4.5-second timeout. A failed or stalled source is removed before the fallback is attempted.

Leaflet CSS loads independently and does not delay JavaScript startup. If the primary stylesheet fails, the fallback stylesheet is requested without blocking map creation.

If both JavaScript sources fail, the spatial panel displays an explicit renderer error while the rest of the World of Darkness workspace remains usable.

## Scan and hydration sequence

After the map is movable, the user may relocate it anywhere before pressing **Discover Named Locations**.

The viewport request then:

1. Requests named OpenStreetMap features within the visible bounds.
2. Hands the response to the radial loader.
3. Suppresses the legacy all-at-once renderer.
4. Sorts locations by distance from the current map center.
5. Limits the active queue to 90 locations.
6. Loads exactly one Chronicle record at a time.
7. Adds each marker only after that individual record is ready.
8. Yields to browser painting between stages and records.
9. Cancels the abandoned queue when the map begins moving or zooming.

## Compatibility bridge

`world-of-darkness-radial-scan-compat.js` restores the public contracts required by the deferred systems without restoring the legacy startup runtime.

It provides:

- The completed `wod:named-location-scan-complete` event.
- The latest-scan snapshot used by world scans and overlays.
- Radial hydration metadata.
- Loaded-record counts.
- Manual named-location generation through the existing form.

## Deferred Chronicle tools

The following remain dormant until radial loading completes or the user presses **Load Chronicle Tools Now**:

- World-seed package management.
- Local and global viewport scans.
- Global rescan submission.
- Context-aware 420-variant enrichment.
- Influence overlays.
- Registry workflow notes.

Deep links containing `wodWorld`, `wodPackage`, `wodScope`, or `wodSpatial=1` may still request the advanced systems automatically after the map becomes usable.

## Validation

Two focused validators govern the architecture:

- `scripts/validate-main-page-lazy-boot.mjs`
- `scripts/validate-wod-map-only-core.mjs`

The map-only validator fails if:

- Either retired core script returns to active startup.
- The map core references Chronicle data files.
- The map core contains `loadCoreData`.
- The map core installs a mutation observer.
- The Leaflet fallback and timeout markers disappear.
- Radial ordering, cancellation, progress, or sequential processing disappears.
- The compatibility scan event or latest-scan handoff disappears.

## Remaining verification

Static architecture and syntax are protected through GitHub Actions. Live browser timing remains required after GitHub Pages publishes the new head. The primary measurements should be:

- Time from **Open Chronicle Spatial Engine** to a movable Leaflet map.
- Main-thread responsiveness while Leaflet loads.
- Whether either CDN reaches its timeout.
- Time from scan response to the first radial record.
- Responsiveness while the 90-record queue progresses.
