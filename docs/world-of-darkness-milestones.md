# World of Darkness Chronicle Spatial Engine Milestones

Development proceeds sequentially on the single `main` branch. A milestone is not considered complete until its runtime, data contract, interface controls, failure handling, performance gate, and repository documentation are committed.

## Milestone 1 — Source Governance and Canonical Data

**Status: Complete**

- Preserve the Chronicle Spatial Engine master specification under `SRC/world-of-darkness/`.
- Record the original source filename, size, and SHA-256 receipt.
- Establish deterministic location, character, and rumor data contracts.
- Establish the central POI registry and configuration contract.

## Milestone 2 — No-Key Spatial Client and Location Capture

**Status: Complete**

- Remove the paid Google Maps JavaScript and Places API requirement.
- Provide a no-key map client and full-map launch path.
- Capture location name, address, coordinates, type, reference URL, and source identity.
- Resolve the captured location into a deterministic Chronicle key and spatial seed.
- Display the complete World of Darkness record and local Storyteller governance controls.

## Milestone 3 — Named Viewport Extraction

**Status: Complete — performance stabilization and scope expansion applied**

- Use a Leaflet/OpenStreetMap viewport as the inspectable extraction surface.
- Read the current visible bounds after pan or zoom.
- Query every OpenStreetMap node, way, or relation carrying a `name` tag.
- Include businesses, named buildings, roads, parks, schools, religious sites, monuments, natural features, water features, trails, transit sites, civic facilities, neighborhoods, and boundaries.
- Normalize named results into stable location records with usable coordinates, OSM identity, feature class, selected source tags, and reference URL.
- Render numbered markers and a searchable location list.
- Selecting a marker or list record opens the complete World of Darkness record.
- Cache viewport scans for ten minutes, cap client-visible results at 90, reject oversized viewports, abort stale requests, and use a fallback Overpass endpoint.

### Milestone 3 performance gate

- Do not load a hidden Google Maps iframe.
- Do not geocode the default search text during startup.
- Do not initiate a location scan during startup.
- Start auto-scan disabled on every page load.
- Initialize the map independently while Chronicle datasets load in the background.
- Delay opt-in auto-scans until the map remains idle for 3.5 seconds.
- Enforce a twelve-second minimum interval between opt-in auto-scans.
- Skip unchanged viewports unless the user forces a refresh.
- Load the map runtime only after the World of Darkness view becomes active.

### Milestone 3.1 — Sparse Supernatural Inventory

**Status: Complete**

- Expand the location system from 70 to 210 deterministic variants.
- Keep 57.14% mundane, 28.57% tangential, 9.52% active but unregistered, and 4.76% formally inventoried for dedicated single-catalog generation.
- Prevent mundane sites from receiving false havens, caerns, chantries, custodians, or active supernatural plots.

### Milestone 3.2 — World-Seeded Location Packages

**Status: Complete**

- Provide selectable local and embedded global world seeds.
- Save complete immutable location packages beneath one world seed.
- Allow the same real location to exist differently across many worlds without overwrite.
- Require deletion before regeneration under the same world, location, and game line.
- Exclude claimed businesses until their later governance panel is implemented.

### Milestone 3.3 — Local and Global World Scans

**Status: Complete**

- Expose the current world label, seed key, raw seed value, local/global scope, package counts, and viewport-coverage counts directly above the map.
- Add **Scan Visible Area Locally** to generate and save up to 90 named-location packages in browser storage.
- Add **Scan Visible Area Globally** to prepare a compact viewport manifest.
- Rescan submitted bounds server-side through the owner-approved GitHub Actions workflow.
- Add every missing eligible named-location package to the selected embedded world without overwriting existing packages.
- Record local and global scan coverage, including bounds, center, zoom, game line, result counts, response-cap state, and package keys.
- Preserve one global world namespace per seed while stacking independent worlds side by side.

### Milestone 3.4 — Context-Aware Location Variant Expansion

**Status: Complete**

- Preserve the 21 original context states and add 21 new context-aware states.
- Produce 42 effective contexts across 10 archetypes for 420 effective location variants.
- Preserve the sparse single-catalog distribution at 57.14% mundane, 28.57% tangential, 9.52% active but unregistered, and 4.76% inventoried.
- Double population, struggle, adventure-hook, location-seed, and item pools from 8 to 16 entries each.
- Provide four linked-content entries per inventory status in every output pool.
- Score context and content candidates by active game line, mapped category, named-feature class, and retained OSM tags.
- Add explicit setting frames for Unified, Vampire, Werewolf, Changing Breeds, Hunter, Changeling, and Mage.
- Keep the real mapped place as the source of truth rather than replacing it with a generic archetype name.
- Add a context-aware browser preview and immediate enrichment for newly saved local packages and local viewport scans.
- Enrich only packages created by the current global-ingestion issue, preserving older published snapshots unchanged.
- Validate deterministic VTM bar, WTA park, Changing Breeds natural-site, Hunter transit, Changeling park, Mage library, and Unified civic-site cases.

### Milestone 3.5 — Radial Progressive Location Hydration

**Status: Complete — live browser timing still required**

- Open the Leaflet map before loading visible Chronicle records.
- Suppress the legacy all-at-once renderer after an Overpass response.
- Sort visible named locations by distance from the current map center.
- Limit the active browser queue to 90 visible locations.
- Hydrate exactly one location record at a time.
- Yield to browser painting between identity, stored-information, and deterministic-context stages.
- Display one progress bar per location and one overall radial progress bar.
- Add markers only as individual records become ready.
- Cancel the current queue when the map begins moving or zooming.
- Require a new scan to restart from the new center rather than continuing to process the abandoned viewport.
- Keep world-seed, global-registry, influence-overlay, and context-enhancement systems dormant until the radial pass finishes.
- Provide **Load Chronicle Tools Now** as an explicit override for users who need advanced tools before the queue completes.
- Preserve deep-link behavior by loading required advanced systems when `wodWorld`, `wodPackage`, `wodScope`, or `wodSpatial=1` is present.
- Validate nearest-first ordering, one-record concurrency, cancellation markers, individual progress controls, and deferred advanced loading through GitHub Actions.

### Milestone 3.6 — Neighborhood Theme and Local Detail Diversification

**Status: Complete — automated regression passed**

- Retire the visible-map generator's use of the nominal 70-entry character and rumor tables, which contained only ten genuinely distinct profile bundles repeated across pressure variants.
- Replace complete bundled biographies and rumor trios with independently selected component pools.
- Keep a single regional supernatural theme stable within a quantized neighborhood cell and active game line.
- Diversify every location-level field independently, including facade, operational pressure, manifestation, mechanical complication, alignment, tenure, appearance, behavioral tell, temporal object, anchor behavior, trauma, secret, vulnerability, sensory condition, sensory consequence, media source, incident, instruction, rumor source, claim, and consequence.
- Track values already used inside the active neighborhood and radial pass so equally suitable alternatives are consumed before a field repeats.
- Preserve deterministic replay for the same ordered scan while avoiding nearby duplicate bundles.
- Derive fitness, sports, religious, cemetery, education, transit, natural, retail, office, industrial, road, and historic classifications from retained OpenStreetMap tags.
- Prevent a fitness business from receiving a churchyard public facade unless its actual mapped tags support a cemetery or religious interpretation.
- Provide at least 9,216 facade combinations, 576 sensory combinations, 6,144 media combinations, 6,144 rumor combinations, and 82,944 character presentations per game line before context, regional theme, secret, trauma, vulnerability, and mechanical combinations are counted.
- Store a regional theme and eight-character diversity signature in every diversified record.
- Generate world-specific packages by rotating the compositional pools with the selected world seed.
- Preserve the exact diversified snapshot through local save, global submission, global ingestion, browser reload, and later context-aware processing.
- Upgrade new immutable packages to schema `2.1.0` while continuing to accept legacy schema `2.0.0` packages.
- Validate a sample of 24 tightly clustered Seattle fitness locations: one regional theme, unique complete facade, character, anchor, trauma, secret, vulnerability, sensory, media, rumor, mechanical, and signature outputs, plus deterministic replay.

### Milestone 3.7 — Unified High-Density Cross-Catalog Generation

**Status: Complete — browser, package, workflow, and server regressions passed**

- Treat **Unified World of Darkness** as a cross-catalog aggregation mode rather than a seventh isolated game line.
- Draw local catalog lenses from Vampire: The Masquerade, Werewolf: The Apocalypse, Changing Breeds, Hunter, Changeling: The Dreaming, and Mage.
- Increase Unified's deterministic 21-slot distribution to 5 mundane, 8 tangential, 5 active-but-unregistered, and 3 inventoried locations.
- Produce a Unified supernatural-or-adjacent rate of 76.19% and an active-or-inventoried rate of 38.10%.
- Preserve the dedicated single-catalog profile at 12 mundane, 6 tangential, 2 active-but-unregistered, and 1 inventoried location, or 42.86% supernatural-or-adjacent.
- Keep one Unified overlap theme stable across a neighborhood while rotating individual locations through all six catalogs before reusing a local catalog lens.
- Accept that Vampire, Werewolf, Changing Breeds, Hunter, Changeling, and Mage locations may appear directly beside one another.
- Score each location's context, prototype, manifestation, and associated character against its selected local catalog lens.
- Combine catalog-specific manifestations with Unified overlap manifestations.
- Preserve `catalogLine` and `catalogLabel` in generated records and inside the immutable regional-theme snapshot used by browser packages.
- Keep mundane Unified records explicitly mundane even though they retain a deterministic catalog assignment for rotation and later regeneration.
- Generate global schema `2.1.0` packages through the pure `world-seeded-cross-catalog-server-rescan-3.1.0` package factory.
- Store catalog and inventory-status counts in global scan coverage records.
- Use one-pass v3 global ingestion without the legacy post-ingestion context rewrite.
- Validate browser and server samples of 24 clustered locations, all six catalogs, six-catalog first-cycle rotation, deterministic replay, persisted catalog identity, and dedicated Vampire isolation.
- Require the production owner workflow to invoke `ingest-wod-world-scan-rescan-v3.mjs` and prohibit fallback to the legacy rescan path.

## Milestone 4 — Persistent Chronicle Overlay and Territory Filters

**Status: In progress — seed, scan, context, radial loading, detail diversity, and Unified cross-catalog foundations complete**

Completed foundations:

- Persist local world seeds, active world selection, local packages, and local scan coverage.
- Store global packages and global scan coverage by embedded world seed.
- Distinguish local-only, local-with-global-counterpart, and embedded-global editing modes.
- Refresh the global register without overwriting local work.
- Preserve real-world, game-line, catalog-lens, and context metadata in newly generated location packages.
- Preserve the complete diversified detail snapshot and regional theme in local and global world packages.
- Keep advanced overlay and registry systems deferred until the map and visible-location queue are usable.

Remaining requirements:

- Persist the active game line, list filters, and selected location.
- Add faction, political-pressure, registry-state, evidence-confidence, and Unified catalog-lens filters.
- Add explicit cache-age and coverage-age indicators.
- Export filtered packages and overlays as GeoJSON and KML.

## Milestone 5 — Domain Politics and Influence Network

**Status: Groundwork started**

Completed foundations:

- Add `influence_overlay_registry.json` as the repository authority for future curated influence geometry.
- Define supported point, circle, line, polygon, and multipolygon geometry.
- Define Kindred, Garou, Changing Breeds, Hunter, Dreaming, Awakened, mixed, and unknown spheres.
- Render provisional package-derived influence circles on the active map.
- Use dashed circles for local packages and solid circles for globally embedded packages.
- Scale provisional radius by tangential, active-unregistered, and inventoried status.
- Filter the provisional overlay by local/global scope and supernatural sphere.
- Make context-aware setting, feature, category, tag, selected-output, regional-theme, catalog-lens, and diversity metadata available for later influence generation.

Remaining requirements:

- Connect locations into faction domains and influence relationships.
- Generate contested borders, neutral ground, feeding routes, spirit corridors, Mysteries, wards, and hunter surveillance zones.
- Add curated geometry submission and governance workflows.
- Track ownership, claims, favors, hostility, leverage, and chronicle-driven changes.

## Milestone 6 — Chronicle Persistence and Campaign Consequences

**Status: Planned**

- Add chronicle save slots and portable campaign exports.
- Track location changes, active plots, clocks, consequences, and historical snapshots.
- Preserve deterministic baseline data while storing only campaign deltas.

## Milestone 7 — Verification and Deployment Hardening

**Status: In progress**

- Validate named-location matching, radial ordering and cancellation, runtime order, world-scan schemas, influence registry, JavaScript syntax, 420 effective variants, doubled output pools, neighborhood anti-repetition, Unified density, six-catalog rotation, persisted catalog identity, v3 global ingestion, diversified package ingestion, and deterministic setting-aware samples through GitHub Actions.
- Add browser-level smoke tests for map initialization, map relocation before scanning, radial hydration, queue cancellation, result selection, diversified record display, local save, global submission, package reload, local scan, global rescan submission, overlay rendering, filtering, and registry merge behavior.
- Add graceful service-failure diagnostics and offline fallback behavior.
- Confirm attribution, caching, request throttling, and service-policy compliance.
