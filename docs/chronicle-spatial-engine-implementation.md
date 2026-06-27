# Chronicle Spatial Engine Implementation

The binding source specification is stored in the repository at:

`SRC/world-of-darkness/chronicle-spatial-engine-governance.md`

## Active runtime

The ordered World of Darkness runtime is:

1. `world-of-darkness-named-location-bridge.js`
2. `world-of-darkness-spatial-engine-inventory.js`
3. `world-of-darkness-location-package-bridge.js`
4. `world-of-darkness-world-scan-overlay.js`
5. `world-of-darkness-global-rescan-bridge.js`
6. `world-of-darkness-context-aware-core.js`
7. `world-of-darkness-context-output-normalizer.js`
8. `world-of-darkness-context-aware-variants.js`

The ordered loader is `character-sheet-title.js`.

## No-paid-API deployment amendment

The master document originally illustrates direct `google.maps.places.Place` integration. The deployed GitHub Pages implementation deliberately avoids the paid Google Maps JavaScript and Places APIs.

The active client uses:

1. A Leaflet/OpenStreetMap viewport that the browser can inspect directly.
2. Explicit location search through Nominatim only when the user presses **Move Map**.
3. Visible-bound named-location extraction through Overpass only when the user deliberately scans, unless throttled auto-scan is enabled.
4. A full Google Maps launch button for cross-checking a selected real-world location.
5. A manual named-location capture form.

The discarded Google Maps iframe is not loaded.

## Performance-first loading contract

- Leaflet starts only after the World of Darkness view becomes active.
- The map displays before Chronicle datasets finish loading.
- The default search text is not geocoded during startup.
- No viewport extraction occurs during startup.
- Auto-scan starts disabled.
- Opt-in auto-scan waits 3.5 seconds after map movement and enforces a twelve-second cooldown.
- Manual scans remain available at zoom level 14 or closer.
- Viewport scans are cached for ten minutes and limited to 90 displayed locations.

## All named locations

The active scan scope is every OpenStreetMap node, way, or relation carrying a `name` tag inside the current visible bounds.

Eligible examples include:

- Businesses and shops.
- Named buildings.
- Roads, streets, paths, and trails.
- Parks, green spaces, and natural features.
- Schools, campuses, libraries, and hospitals.
- Religious and historic sites.
- Transit locations.
- Public and civic facilities.
- Water features, infrastructure, neighborhoods, and boundaries.

The named-location bridge preserves OSM identity, coordinates, feature class, selected source tags, and viewport context for later package generation.

## 420-variant sparse supernatural inventory

The original source table remains:

`data/world-of-darkness/locations_core_v2.json`

It contains ten canonical archetypes and twenty-one original context states, producing 210 original combinations.

The additive context table is:

`data/world-of-darkness/location_context_expansion_v3.json`

It contributes another twenty-one context states and real-world/game-line applicability hooks.

The effective matrix is:

`10 archetypes × 42 contexts = 420 location variants`

The distribution remains deliberately sparse:

- 57.14% mundane.
- 28.57% tangential.
- 9.52% active but unregistered.
- 4.76% formally inventoried.

Accordingly, 85.71% of generated locations are mundane or merely tangential, and 95.24% are absent from formal supernatural inventories.

Mundane records do not receive false havens, caerns, chantries, custodians, occult catalysts, or active supernatural plots. Tangential records present uncertain, historical, residual, witnessed, rumored, route-adjacent, or cross-system associations. Full supernatural infrastructure is reserved for active-unregistered and inventoried results.

## Context-aware generation

New package generation scores candidates using:

- World seed.
- Stable real-location key.
- Inventory status.
- Active game line.
- Mapped category.
- Named-feature class.
- Retained OpenStreetMap tags.

The supported setting frames are:

- Unified All Systems.
- Vampire: The Masquerade.
- Werewolf: The Apocalypse.
- Werewolf Changing Breeds.
- Hunter: The Reckoning.
- Changeling.
- Mage: The Awakening.

The mapped location remains the source of truth. The selected archetype is an interpretive layer and does not replace the real name, category, address, access pattern, institutional role, ecology, or infrastructure.

The context-aware package records:

- Selected context and archetype.
- Effective variant number out of 420.
- Real-world category and named-feature class.
- Retained OSM tags.
- Matched game-line, category, feature, and tag hooks.
- Setting-specific focus and Storyteller questions.
- Selected population, struggle, hook, seed, and item IDs.

## Stable real-location identity

A normalized named-location identity and its coordinates produce a stable key in the form:

`gmaps-xxxxxxxx`

That key identifies the real-world place independently of any Chronicle world.

## Selectable world seeds

Generated Chronicle content is organized by world seed rather than stored in one flat namespace.

The browser world selector combines:

- **Embedded global worlds** from `data/world-of-darkness/generated_location_registry.json`.
- **Local browser worlds** from `localStorage`.

A random local world is created when a browser has none. Users may create additional local worlds with random or supplied seed values and return to them later.

A package key is derived from:

`world seed key + real-location key + game line`

The same real place can therefore be generated differently in multiple worlds without collision. Selecting another person's embedded world reproduces and extends that world rather than overwriting it.

## Doubled linked location packages

The original shared content pools are stored in:

`data/world-of-darkness/location_crosslink_core.json`

The additive context-aware pools are stored in:

`data/world-of-darkness/location_crosslink_expansion_v2.json`

Each pool now contains sixteen effective entries: four for each inventory status.

The five pools are:

- Population.
- Struggle.
- Adventure hook.
- Location seed.
- Item.

A complete package contains:

- World-specific inventory status and 420-variant context.
- Public facade and hidden function.
- Evidence confidence and catalogue status.
- Context-aware setting and real-world metadata.
- Population.
- Struggle.
- Adventure hook.
- Location seed.
- Content item.
- Cross-links to Urban Mystification, Street-Level Nobody, Rumor and Resonance, Character Profiling, Domain Politics, and Chronicle Consequences.

The exact generated text is saved. Existing published packages are not silently rewritten when generator tables change later.

## Save locally

**Save Locally** writes the package beneath its world seed in browser `localStorage`.

The context-aware browser bridge enriches the newly created package as part of the save transaction. Local viewport scans are enriched through the package keys stored in that scan's coverage record.

Local packages remain immutable under their package key. A package must be deleted before a different version can be regenerated under the same world, location, and game line.

Deleting a package does not delete the world seed.

## Submit globally

**Submit Globally** opens a prefilled GitHub issue containing immutable world-seed metadata and the complete package snapshot.

The individual package workflow is:

`.github/workflows/ingest-wod-location-package.yml`

The global viewport workflow is:

`.github/workflows/ingest-wod-world-scan-batch.yml`

Both workflows validate and write new packages, then run:

`scripts/enrich-wod-location-context.mjs`

The server enricher is issue-scoped. It processes only packages stamped with the current issue number, ensuring that older published snapshots are not rewritten.

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

Locations present in `data/world-of-darkness/poi_registry.json` are excluded from unclaimed world-seeded generation and submission.

Their integration is intentionally deferred to a later claimed-business governance panel.

## Validation

- `scripts/validate-wod-location-inventory.mjs` protects the 420-variant sparse distribution and all applicability metadata.
- `scripts/validate-wod-world-seed-packages.mjs` validates sixteen effective entries per output pool and four entries per status.
- `scripts/validate-wod-context-aware-variants.mjs` exercises deterministic VTM, WTA, Changing Breeds, Hunter, Changeling, Mage, and Unified sample locations.
- `scripts/validate-wod-world-scan-overlay.mjs` validates runtime order, governed paths, world scans, and influence-overlay contracts.
- `scripts/ingest-wod-location-package.mjs` and `scripts/ingest-wod-world-scan-rescan.mjs` perform strict validation before global package creation.

## Source preservation

The complete supplied master specification is preserved under `SRC/world-of-darkness/`. The original uploaded DOCX byte length and SHA-256 digest remain recorded in `source-page-references/chronicle-spatial-engine.source.json`.
