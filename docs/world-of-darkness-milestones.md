# World of Darkness Chronicle Spatial Engine Milestones

Development proceeds sequentially on the single `main` branch. A milestone is not considered complete until its runtime, data contract, interface controls, failure handling, performance gate, and repository documentation are committed.

## Milestone 1 — Source Governance and Canonical Data

**Status: Complete**

- Preserve the Chronicle Spatial Engine master specification under `SRC/world-of-darkness/`.
- Record the original source filename, size, and SHA-256 receipt.
- Establish three deterministic 70-entry core tables: locations, characters, and rumors.
- Establish the central POI registry and configuration contract.

## Milestone 2 — No-Key Spatial Client and Business Capture

**Status: Complete**

- Remove the paid Google Maps JavaScript and Places API requirement.
- Provide a no-key map client and full-map launch path.
- Capture business name, address, coordinates, type, and reference URL.
- Resolve the captured business into a deterministic Chronicle key and 32-bit spatial seed.
- Display the complete World of Darkness record and local Storyteller governance controls.

## Milestone 3 — Visible Viewport Business Extraction

**Status: Complete — Performance stabilization applied**

- Replace the unreadable cross-origin map iframe as the extraction surface with a Leaflet/OpenStreetMap viewport.
- Read the current visible map bounds after pan or zoom.
- Query named amenities, shops, tourism sites, offices, and healthcare locations through Overpass.
- Normalize point, way, and relation results into business records with usable coordinates.
- Apply the same deterministic Chronicle key, 70-entry spatial filter, game-line layer, political pressure, and central-registry status to every visible result.
- Render matching numbered markers on the map.
- Render a searchable and type-filterable business list directly to the right of the map on desktop layouts.
- Selecting a marker or list record opens the full World of Darkness record in the left panel.
- Cache viewport scans for ten minutes, cap visible results, abort stale requests, reject oversized viewports, and provide a second Overpass endpoint as a fallback.

### Milestone 3 performance gate

- Do not load a hidden Google Maps iframe.
- Do not geocode the default search text during startup.
- Do not initiate a business scan during startup.
- Start auto-scan disabled on every page load.
- Initialize the map independently while Chronicle datasets load in the background.
- Delay opt-in auto-scans until the map has remained idle for 3.5 seconds.
- Enforce a twelve-second minimum interval between opt-in auto-scans.
- Skip repeated scans of an unchanged viewport unless the user forces a refresh.
- Update map tiles only after movement becomes idle and keep the tile buffer small.
- Load the map runtime only after the World of Darkness view becomes active.

## Milestone 4 — Persistent Chronicle Overlay and Territory Filters

**Status: Next**

Completion requirements:

- Persist the active game line, list filters, and selected business in addition to the existing map view.
- Visually distinguish unclaimed, supportive, opt-out, and centrally registered locations without requiring selection.
- Add faction, supernatural sphere, political pressure, and registry-state filters.
- Reconcile central-registry updates with cached viewport results.
- Add explicit refresh and cache-expiration indicators.
- Export the currently filtered overlay as GeoJSON and KML.

## Milestone 5 — Domain Politics and Influence Network

**Status: Planned**

- Connect visible businesses into faction domains and influence relationships.
- Generate contested borders, neutral ground, feeding routes, spirit corridors, Mysteries, and hunter surveillance zones.
- Track ownership, claims, favors, hostility, leverage, and changes caused by chronicle events.

## Milestone 6 — Chronicle Persistence and Campaign Consequences

**Status: Planned**

- Add chronicle save slots and portable campaign exports.
- Track location changes, active plots, clocks, consequences, and historical snapshots.
- Preserve deterministic baseline data while storing only campaign deltas.

## Milestone 7 — Verification and Deployment Hardening

**Status: Planned**

- Add browser-level smoke tests for map initialization, viewport extraction, result selection, filtering, and registry merge behavior.
- Add static validation for all World of Darkness runtime and data files.
- Add graceful service-failure diagnostics and offline fallback behavior.
- Confirm attribution, caching, request throttling, and service-policy compliance.
