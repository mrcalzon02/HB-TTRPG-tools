# World of Darkness Blueprint Integration

This implementation pass restores the substance of two previously uncommitted planning documents by converting their prototype specifications into repository code, implementation notes, and live browser architecture.

## Source documents

The source uploads were:

- `World of Darkness Character Profiling & Tenure Engine_ Master Data Blueprints.docx`
- `World of Darkness Campaign Assistant_ Generator Prototype Specifications.docx`

Their source names, byte counts, SHA-256 digests, and implementation roles are recorded in `source-page-references/world-of-darkness-blueprints.source.json`.

## Implemented prototype contracts

The World of Darkness workspace includes five functional deterministic engines:

1. **Unified Location and Political Overlay Generator** — resolves a U.S. location label or coordinate into five stable supernatural sites, Google Maps launch links, and exportable GeoJSON/KML overlays.
2. **Urban Mystification Engine** — adapts mundane urban footprints into supernatural and political layers.
3. **Street-Level Nobody Oracle** — creates an immediately playable pedestrian, confrontation dialogue, alignment, and hidden clue.
4. **Gothic-Punk Rumor and Resonance Mill** — generates sensory atmosphere, media traffic, and an urban legend.
5. **Character Profiling and Tenure Engine** — creates tenure, historical tether, traumatic catalyst, supernatural tell, phobia, secret plot, and vulnerability.

Ten canonical prototypes are combined with seven pressure variants, producing exactly **70 deterministic variants per engine**. The same seed always resolves to the same variant.

## Game-line adaptation

The active workspace follows the requested tabs:

- Unified World of Darkness
- Vampire: The Masquerade
- Werewolf: The Apocalypse
- Werewolf Changing Breeds
- Hunter: The Reckoning
- Changeling
- Mage: The Awakening

The source documents also contain Wraith: The Oblivion, Mage: The Ascension, and Changeling: The Dreaming examples. Those remain preserved as source inspiration and are adapted through the requested game-line profiles rather than exposed as additional top-level tabs in this pass.

## Google Maps boundary

The browser runtime does not require or embed a Google Maps API key. It opens standard Google Maps search URLs and exports open overlay formats. Future work may add optional geocoding and richer map rendering behind a user-supplied provider key.
