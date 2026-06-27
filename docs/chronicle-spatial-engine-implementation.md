# Chronicle Spatial Engine Implementation

The binding source specification is stored in the repository at:

`SRC/world-of-darkness/chronicle-spatial-engine-governance.md`

## No-paid-API deployment amendment

The master document originally illustrates direct `google.maps.places.Place` integration. The deployed GitHub Pages implementation deliberately avoids the paid Google Maps JavaScript and Places APIs.

The active client now uses:

1. A Leaflet/OpenStreetMap viewport that the browser can inspect directly.
2. Explicit location search through Nominatim only when the user presses **Move Map**.
3. Visible-bound business extraction through Overpass only when the user presses **Scan Visible Area**, unless throttled auto-scan is deliberately enabled.
4. A full Google Maps launch button for cross-checking a selected real-world location without embedding or loading Google Maps in the application.
5. A manual capture form for business name, address, reference URL, type, latitude, and longitude.

The discarded Google Maps iframe is no longer loaded. This removes a redundant map request and avoids paying the startup cost for a cross-origin window the application cannot inspect.

## Performance-first loading contract

The active runtime is `world-of-darkness-spatial-engine-fast.js`.

Its load order is intentionally separated:

- The Chronicle interface is constructed without external map or data requests.
- Leaflet starts only after the World of Darkness view becomes active.
- The map is displayed as soon as Leaflet loads.
- The three Chronicle data tables and central registry load in the background and do not block the map.
- The default search text is not geocoded during startup.
- No viewport business extraction occurs during startup.
- Auto-scan starts disabled on every page load.

When auto-scan is enabled manually, it waits until the map has remained idle for 3.5 seconds, requires zoom level 15 or closer, enforces a twelve-second minimum interval, and skips an unchanged viewport. Manual scans remain available at zoom level 14 or closer.

Map tile updates occur after movement becomes idle, animation overhead is disabled, and the retained tile buffer is intentionally small.

## Visible business extraction

A manual or permitted throttled scan reads the current map bounds and queries named OpenStreetMap amenities, shops, tourism locations, offices, and healthcare locations. Point, way, and relation results are normalized to a common business record.

Viewport results are cached for ten minutes. The runtime limits each displayed result set to 90 locations, aborts superseded requests, rejects oversized viewports, and can fall back to a second Overpass endpoint.

Every extracted location is processed through the same deterministic World of Darkness pipeline and appears as both a numbered marker and an entry in the right-hand business list.

## Deterministic universal baseline

A normalized business identity and its geocoded coordinates produce a stable `gmaps-xxxxxxxx` business key. The business key and six-decimal coordinates form the spatial token, which is processed by MurmurHash3 into a stable unsigned 32-bit seed.

That seed selects exactly one record from each 70-entry core table:

- `data/world-of-darkness/locations_core.json`
- `data/world-of-darkness/characters_core.json`
- `data/world-of-darkness/rumors_core.json`

Identical captured business details resolve the same baseline World of Darkness record in every browser without storing every unclaimed business in the repository.

## Business governance states

- `STANDARD_UNCLAIMED`: deterministic universal baseline.
- `SUPPORTIVE`: Part of the Veil; centrally or locally marked as welcoming interactive storytelling and community activity.
- `OPT_OUT`: Mundane Disconnect; supernatural lore is suppressed.

## Central and local persistence

The runtime uses three layers:

1. **Universal deterministic baseline** — regenerated from business identity and coordinates.
2. **Local Storyteller override** — stored in browser `localStorage` under the business key.
3. **Central repository override** — stored in `data/world-of-darkness/poi_registry.json` and visible to every browser after GitHub Pages deploys it.

## Writing to the repository without a browser token

Static GitHub Pages cannot securely push directly to its own repository. The runtime therefore generates a compact registry patch and opens a prefilled GitHub issue titled `[WOD-POI] ...`.

After submitting that issue, the repository owner manually runs `.github/workflows/ingest-wod-poi.yml` with the issue number. The workflow retrieves the issue body, validates the fenced JSON with `scripts/ingest-wod-poi-issue.mjs`, writes the entry to `poi_registry.json`, and commits it to `main`.

This exposes no GitHub token in browser code and requires no paid Google API integration. Repository Actions must have permission to write repository contents.

## Source preservation

The complete supplied master specification is preserved as repository Markdown under `SRC/world-of-darkness/`. The original uploaded DOCX byte length and SHA-256 digest remain recorded in `source-page-references/chronicle-spatial-engine.source.json` so the original binary source is still independently verifiable.
