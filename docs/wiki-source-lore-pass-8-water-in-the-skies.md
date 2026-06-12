# Wiki Source-Lore Pass 8 - Water in the Skies

This pass continues the hard-reference wiki migration by importing the water scarcity and water-supply block from the Kaysender core manuscript.

## Added pack

- `data/kaysender/wiki/source-lore-pass-8-water-in-the-skies.json`

The pack is loaded after the earlier source-lore passes through:

- `data/kaysender/wiki/wiki-index.json`

## Imported source coverage

This pass covers manuscript material from pages 86-90:

- Water scarcity in Kaysender's aerial geography.
- Rare island streams, waterfalls, and freshwater sources.
- Unpredictable rainfall and rain-catching apparatus.
- Cloud-dew collection.
- Contamination and spoilage risks.
- Mundane water storage in casks, kegs, and barrels.
- Water weight and airship cargo constraints.
- Enchanted water storage.
- Arcane Flask of Water.
- Feyborne Waterskin.
- Water supply routes, merchant fleets, and high prices.
- Freshwater economies, political leverage, and conflict over sources.

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

## Legacy mechanics handling

The manuscript gives prices, capacities, consumption periods, action rates, refill behavior, and weights for water containers. These details are preserved in `mechanics-legacy` sections so they remain available for later conversion without being presented as final Hypertext d20-compatible rules.

## Hotlink examples

```text
[[floating-islands|floating islands]]
[[grim-realities-of-survival|the grim realities of survival]]
[[water-trade|water markets]]
[[whisper-web|the Whisper Web]]
[[skyweaver-consortium|the Skyweaver Consortium]]
[[cargo-standards|cargo planning]]
```

## Notes

This pass upgrades the existing `water-trade` seed entry with source-backed lore and creates direct nodes for collection, storage, transport, and enchanted containers. The general adventuring-gear block that follows in the manuscript remains reserved for a later equipment pass.
