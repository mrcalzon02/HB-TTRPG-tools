# Milestone 3.4 — Context-Aware Location Variant Expansion

**Status: Complete**

This milestone doubles the internal location-generation depth again while preserving already published world packages.

## Effective location matrix

The original location source remains intact:

- 10 canonical location archetypes.
- 21 original inventory and context states.
- 210 original combinations.

A new additive expansion contributes another 21 context states with the same inventory distribution:

- 12 mundane.
- 6 tangential.
- 2 active but unregistered.
- 1 inventoried.

The effective generation matrix is now:

`10 archetypes × 42 contexts = 420 location variants`

The distribution remains deliberately sparse:

- 57.14% mundane.
- 28.57% tangential.
- 9.52% active but unregistered.
- 4.76% inventoried.

Existing published packages are not rewritten. The additive resolver applies only while a new package is being created or ingested.

## Doubled linked output pools

Each linked output pool previously contained eight entries: two for each inventory status.

The expansion adds another eight entries to each pool, producing sixteen effective entries per pool and four choices per inventory status:

- Population.
- Struggle.
- Adventure hook.
- Location seed.
- Item.

This produces 80 effective linked-content entries across the five pools while preserving status-aware selection.

## Context-aware selection inputs

New generation no longer chooses only from inventory status. The resolver scores candidates using:

- World seed.
- Stable real-location key.
- Inventory status.
- Active game line.
- Mapped location category.
- Named-feature classification.
- Retained OpenStreetMap tags.

A candidate receives stronger preference when its declared hooks match the location and game line. A deterministic hash resolves ties, so the same world, place, line, and data always produce the same result.

## Game-line setting frames

The resolver contains explicit setting frames for:

- Unified All Systems.
- Vampire: The Masquerade.
- Werewolf: The Apocalypse.
- Werewolf Changing Breeds.
- Hunter: The Reckoning.
- Changeling.
- Mage: The Awakening.

Each frame defines the questions and narrative priorities applied to the same real-world location.

Examples:

- A bar in Vampire prioritizes feeding routes, domain, retainers, prestation, and Masquerade risk.
- A park in Werewolf prioritizes spiritual ecology, the Gauntlet, Weaver structure, Wyrm contamination, and territorial duty.
- A natural feature in Changing Breeds prioritizes species-specific niches, migration, kin networks, and old inter-Fera compacts.
- A transit site in Hunter prioritizes evidence, surveillance, human vulnerability, access, and the risk of a mistaken conclusion.
- A playground or park in Changeling prioritizes recurring stories, childhood memory, wonder, thresholds, and Banality.
- A library in Mage prioritizes Mysteries, resonance, institutional knowledge, symbols, and competing occult interpretations.
- Unified mode prioritizes overlapping readings, incompatible claims, and the real-world function preventing any one faction from taking simple control.

## Real-world context preservation

The context-aware package explicitly preserves the mapped location as the source of truth. It records:

- Actual location name and address.
- Actual category.
- Named-feature class.
- Selected OSM tags.
- Selected archetype and context.
- Matched game-line, category, feature, and tag hooks.
- Setting-specific focus.
- Contextual Storyteller questions.
- Selected context-aware output IDs.

The archetype is an interpretive layer rather than a replacement identity. A real library remains a library; it may align with an archetype because of access, records, architecture, or resonance, but it is not renamed into a generic prototype.

## Browser behavior

The ordered runtime now loads:

1. Existing named-location, spatial, package, scan, and global-rescan systems.
2. `world-of-darkness-context-aware-core.js`.
3. `world-of-darkness-context-output-normalizer.js`.
4. `world-of-darkness-context-aware-variants.js`.

The browser bridge:

- Shows a Context-Aware Synthesis preview for the currently generated package.
- Enriches newly saved individual local packages.
- Enriches all newly created packages from a local viewport scan.
- Preserves the existing singular `outputs.item` package field.
- Dispatches a refresh event after local enrichment.

## Global ingestion behavior

Both global workflows run the issue-scoped server enricher after validating and writing new packages:

- Individual package ingestion.
- Global viewport-rescan ingestion.

The server enricher only processes packages carrying the current GitHub issue number. It does not sweep or alter older packages in the registry.

## Validation

The validation suite now enforces:

- 21 base contexts plus 21 additive contexts.
- 42 effective contexts per archetype.
- 420 effective location variants.
- Exact preservation of the sparse inventory percentages.
- 8 base plus 8 additive entries in every linked pool.
- 16 effective entries per pool.
- Four entries per inventory status in each pool.
- Applicability metadata on every new context and output entry.
- Setting frames for all seven supported generator modes.
- Ordered browser runtime loading.
- Issue-scoped global enrichment.
- Deterministic sample generation for VTM, WTA, Changing Breeds, Hunter, Changeling, Mage, and Unified mode.
- Different game-line interpretations for comparable real-world feature families.

## Active files

- `data/world-of-darkness/location_context_expansion_v3.json`
- `data/world-of-darkness/location_crosslink_expansion_v2.json`
- `world-of-darkness-context-aware-core.js`
- `world-of-darkness-context-output-normalizer.js`
- `world-of-darkness-context-aware-variants.js`
- `scripts/enrich-wod-location-context.mjs`
- `scripts/validate-wod-context-aware-variants.mjs`

## Next work

The next sequential step is to make context-aware package metadata available to the influence-network layer. Sphere overlays can then use the selected real-world profile, setting frame, output hooks, and contextual questions when generating domains, routes, borders, wards, surveillance zones, spirit corridors, and contested territory.
