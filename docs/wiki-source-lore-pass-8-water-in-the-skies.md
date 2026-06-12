# Wiki Source-Lore Pass 8 — Water in the Skies

This pass continues the hard-reference wiki migration by importing the water scarcity and water logistics source block from the Kaysender core manuscript.

## Added pack

- `data/kaysender/wiki/source-lore-pass-8-water-in-the-skies.json`

The pack is loaded after the earlier source-lore passes through:

- `data/kaysender/wiki/wiki-index.json`

## Imported source coverage

This pass covers manuscript material from pages 86–90:

- Water in the Skies of Kaysender.
- Aerial geography and lack of natural water sources.
- Challenges of harvesting water.
- Rain-catching apparatus.
- Cloud dew.
- Water storage and transportation.
- Mundane storage such as casks, kegs, and barrels.
- Magical storage such as Arcane Flasks of Water and Feyborne Waterskins.
- Cultural and economic implications of water scarcity.
- Warm and cold weather gear for sky travel.

## Entry structure

Each imported entry includes:

- Reader-facing lore prose.
- Stable wiki ID.
- Category.
- Hotlinks to related wiki entries.
- `sourceStatus: source-faithful`.
- `sourceRefs` pointing back to the Kaysender core PDF page ranges.
- `sourceChunkIds` for future raw-chunk indexing.
- Related entry IDs.
- Related module IDs.

## Hotlink examples

```text
[[floating-islands|floating islands]]
[[cargo-standards|cargo standards]]
[[merchant-fleets-of-kaysender|merchant fleets]]
[[water-trade|water trade]]
[[grim-realities-of-survival|the grim realities of survival]]
[[whisper-web|the Whisper Web]]
[[skyweaver-consortium|the Skyweaver Consortium]]
```

## Legacy mechanics handling

The source text includes item details for water containers, magical storage, and weather gear. These are preserved as `mechanics-legacy` notes where needed so they remain available for later conversion without being treated as final Hypertext d20-compatible rules.

## Notes

This pass gives supply, settlement, airship, route, shop, and survival generators direct source-backed water infrastructure. Water should be treated as world-defining pressure, not a background resource assumption.
