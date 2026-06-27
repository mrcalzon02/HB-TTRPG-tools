# Chronicle Spatial Engine Implementation

This runtime is governed by the exact source document stored at:

`SRC/world-of-darkness/CHRONICLE-SPATIAL-ENGINE-MASTER-SPECIFICATION-AND-ARCHITECTURE-GOVERNANCE.docx`

## Implemented governance contract

The former **Working Generator Prototypes** panel is replaced by the **Chronicle Spatial Engine**. The active interface follows the source architecture:

- Google Maps JavaScript API map with normal pan, zoom, Street View, fullscreen, and map-type controls.
- Native Google Maps point-of-interest clicks are intercepted through `event.placeId`, and the standard Google information window is suppressed.
- Place details are loaded through `google.maps.places.Place.fetchFields()`.
- The selected Place ID and geocoded coordinates are converted into a stable MurmurHash3 32-bit spatial seed.
- The seed resolves exactly one location, character, and rumor entry from three 70-entry core datasets.
- Identical businesses resolve identical baseline lore in every browser without a mutable server database.
- Local Storyteller overrides are stored under a Place-ID key in `localStorage`.
- Curated cross-browser claim, opt-out, supportive, and custom-lore overrides are read from `data/world-of-darkness/poi_registry.json`.
- A registry-patch export is available for moving a local Storyteller override into the central repository registry.

## Business type routing

The implementation includes the source mappings:

- `restaurant`, `bar`, and `night_club` → Vampiric Circulatory Node / Anarch Haven
- `book_store` and `library` → Hermetic Chantry Archive / Occult Library
- `hospital` and `pharmacy` → Blood Bank Depot / Mage Alchemical Laboratory
- `cemetery` and `park` → Shadowlands Verge / Werewolf Caern Border

Other Google primary types resolve as a deterministic subverted complex while retaining all location, character, rumor, political-pressure, and mechanical-seed data.

## Claim and verification states

- `STANDARD_UNCLAIMED`: deterministic universal baseline.
- `SUPPORTIVE`: Part of the Veil, with a neon map marker and interface treatment.
- `OPT_OUT`: Mundane Disconnect; supernatural lore is suppressed.

## Central versus local persistence

GitHub Pages cannot securely mutate its own repository without an authenticated write service. The architecture therefore separates:

1. **Universal generated baseline:** deterministic from Place ID and coordinates, so every browser resolves the same record.
2. **Central curated overrides:** static repository data in `poi_registry.json`, visible to every browser after deployment.
3. **Local Storyteller deltas:** browser `localStorage`, as required by the master specification.
4. **Central registry patch export:** produces the exact JSON entry needed for review and repository publication without exposing a GitHub token in client-side code.

## Core data

- `data/world-of-darkness/locations_core.json` — 70 spatial domain entries.
- `data/world-of-darkness/characters_core.json` — 70 character tenure and profiling entries.
- `data/world-of-darkness/rumors_core.json` — 70 atmosphere, scanner, and rumor entries.
- `data/world-of-darkness/poi_registry.json` — central curated business overrides.
- `data/world-of-darkness/spatial-engine-config.json` — map ID, data paths, persistence model, and business mappings.
