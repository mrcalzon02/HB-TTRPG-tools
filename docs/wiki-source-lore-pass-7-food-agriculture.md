# Wiki Source-Lore Pass 7 — Foodways, Tavern Fare, Agriculture, Husbandry, and Preservation

This pass continues the hard-reference wiki migration by importing the food and agriculture source block from the Kaysender core manuscript.

## Added pack

- `data/kaysender/wiki/source-lore-pass-7-food-agriculture.json`

The pack is loaded after the earlier source-lore passes through:

- `data/kaysender/wiki/wiki-index.json`

## Imported source coverage

This pass covers manuscript material from pages 78–86:

- Foodways of Kaysender.
- Tavern fare of Kaysender.
- Dragonborn tavern fare.
- Tiefling den fare.
- Lizardfolk marsh tavern fare.
- Dwarven agriculture and husbandry.
- Elven agriculture and husbandry.
- Human agriculture and husbandry.
- Gnomish agriculture and husbandry.
- Orcish agriculture and husbandry.
- Halfling agriculture and husbandry.
- Dragonborn agriculture and husbandry.
- Food storage and preservation by culture.

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
[[grim-realities-of-survival|the grim realities of survival]]
[[dwager|Dwager]]
[[fae|Fae]]
[[hume|Hume]]
[[gezistack|Gezistack]]
[[halflings|Halflings]]
[[dragon-kin|Dragon Kin]]
[[water-trade|water trade]]
```

## Notes

This pass creates direct source-backed food and agriculture nodes for settlement, shop, supply, tavern, cargo, and regional-economy generators.

Food is treated as worldbuilding infrastructure rather than flavor text. Agriculture, livestock, preservation, and tavern fare connect directly to scarcity, water access, settlement resilience, trade routes, and cultural identity.
