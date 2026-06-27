# Chronicle Spatial Engine Implementation

The binding source specification is stored in the repository at:

`SRC/world-of-darkness/chronicle-spatial-engine-governance.md`

## Active runtime

The active location runtime is:

`world-of-darkness-spatial-engine-inventory.js`

The active world-seed and cross-generator persistence bridge is:

`world-of-darkness-location-package-bridge.js`

The bridge is loaded immediately after the spatial runtime by `character-sheet-title.js`.

## No-paid-API deployment amendment

The master document originally illustrates direct `google.maps.places.Place` integration. The deployed GitHub Pages implementation deliberately avoids the paid Google Maps JavaScript and Places APIs.

The active client uses:

1. A Leaflet/OpenStreetMap viewport that the browser can inspect directly.
2. Explicit location search through Nominatim only when the user presses **Move Map**.
3. Visible-bound business extraction through Overpass only when the user presses **Scan Visible Area**, unless throttled auto-scan is deliberately enabled.
4. A full Google Maps launch button for cross-checking a selected real-world location.
5. A manual business-capture form.

The discarded Google Maps iframe is not loaded.

## Performance-first loading contract

- Leaflet starts only after the World of Darkness view becomes active.
- The map displays before Chronicle datasets finish loading.
- The default search text is not geocoded during startup.
- No viewport business extraction occurs during startup.
- Auto-scan starts disabled.
- Opt-in auto-scan waits 3.5 seconds after map movement and enforces a twelve-second cooldown.
- Manual scans remain available at zoom level 14 or closer.
- Viewport scans are cached for ten minutes and limited to 90 displayed locations.

## 210-variant sparse supernatural inventory

The active location table is:

`data/world-of-darkness/locations_core_v2.json`

Ten canonical urban archetypes are combined with twenty-one context states to produce 210 deterministic variants.

The distribution is deliberately sparse:

- 57.14% mundane.
- 28.57% tangential.
- 9.52% active but unregistered.
- 4.76% formally inventoried.

Accordingly, 85.71% of generated locations are mundane or merely tangential, and 95.24% are absent from formal supernatural inventories.

Mundane records do not receive false havens, caerns, chantries, custodians, occult catalysts, or active supernatural plots. Tangential records present uncertain, historical, residual, witnessed, rumored, or route-adjacent associations. Full supernatural infrastructure is reserved for active-unregistered and inventoried results.

## Stable real-location identity

A normalized business identity and its coordinates produce a stable key in the form:

`gmaps-xxxxxxxx`

That key identifies the real-world location independently of any Chronicle world.

## Selectable world seeds

Generated Chronicle content is organized by world seed rather than stored in one flat namespace.

The browser world selector combines:

- **Embedded global worlds** from `data/world-of-darkness/generated_location_registry.json`.
- **Local browser worlds** from `localStorage`.

A random local world is created when a browser has none. Users may create additional local worlds with random or supplied seed values and return to them later.

A package key is derived from:

`world seed key + real-location key + game line`

The same business can therefore be generated differently in multiple worlds without collision. Selecting another person's embedded world reproduces and extends that world rather than overwriting it.

## Linked location packages

The shared content pools are stored in:

`data/world-of-darkness/location_crosslink_core.json`

For one selected business and one selected world seed, the bridge generates a complete package containing:

- World-specific inventory status and 210-variant context.
- Public facade and hidden function.
- Evidence confidence and catalogue status.
- Population.
- Struggle.
- Adventure hook.
- Location seed.
- Content item.
- Cross-links to Urban Mystification, Street-Level Nobody, Rumor and Resonance, Character Profiling, Domain Politics, and Chronicle Consequences.

The exact generated text is saved. Published worlds are not silently rewritten when generator tables change later.

## Save Locally

**Save Locally** writes the package beneath its world seed in browser `localStorage`.

Local packages are immutable under their package key. A package must be deleted before a different version can be regenerated under that same world, location, and game line.

Deleting a package does not delete the world seed.

## Submit Globally

**Submit Globally** opens a prefilled GitHub issue containing immutable world-seed metadata and the complete package snapshot.

The repository owner runs:

`.github/workflows/ingest-wod-location-package.yml`

The workflow passes the issue to:

`scripts/ingest-wod-location-package.mjs`

The validator either creates the embedded world or adds the package beneath an existing matching world. Packages submitted under different seeds stack independently.

The global registry is:

`data/world-of-darkness/generated_location_registry.json`

## Immutability and deletion

Embedded world metadata cannot be changed after publication.

Published packages cannot be overwritten:

- Identical resubmissions are accepted as no-ops.
- Different content under the same package key is rejected.
- Replacement requires explicit deletion first.

The owner-only deletion workflow is:

`.github/workflows/delete-wod-location-package.yml`

It calls:

`scripts/delete-wod-location-package.mjs`

The workflow removes one package from one world while preserving the embedded world seed for regeneration and future contributions.

## Browsing and sharing

Package selection writes these URL parameters:

- `wodWorld`
- `wodScope`
- `wodPackage`

Embedded global worlds and packages can therefore be linked directly after deployment. Local links work only in browsers that possess the corresponding local data.

## Claimed businesses

Businesses present in `data/world-of-darkness/poi_registry.json` are excluded from world-seeded generation and submission.

Their integration is intentionally deferred to a later claimed-business governance panel.

## Validation

- `scripts/validate-wod-location-inventory.mjs` protects the 210-variant sparse distribution.
- `scripts/validate-wod-world-seed-packages.mjs` validates the embedded-world registry and confirms that every inventory status has population, struggle, hook, seed, and item content.
- `scripts/ingest-wod-location-package.mjs` performs strict validation before any global package commit.

## Source preservation

The complete supplied master specification is preserved under `SRC/world-of-darkness/`. The original uploaded DOCX byte length and SHA-256 digest remain recorded in `source-page-references/chronicle-spatial-engine.source.json`.
