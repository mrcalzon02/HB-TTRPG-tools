# Wiki Source-Lore Pass 5 — Criminal Trade, Slavery, and Abolition

This pass continues the hard-reference wiki migration by importing the unsavory merchant guild, criminal trade, slavery, servitude, oppression, and abolition source block.

## Added pack

- `data/kaysender/wiki/source-lore-pass-5-criminal-trade-slavery.json`

The pack is loaded after the earlier source-lore passes through:

- `data/kaysender/wiki/wiki-index.json`

## Imported source coverage

This pass covers manuscript material from pages 53–60:

- Unsavory Merchant Guilds, Trade Groups, and Slaver Organizations in Kaysender.
- The Black Chain Consortium.
- The Rusted Compass Company.
- The Crimson Fog Cartel.
- The Bonehold Syndicate.
- The Broken Coin Guild.
- The Sable Tide.
- The Chainwing Exchange.
- The Tarnished Veil.
- Indentured Servitude: The Gilded Cage.
- Slavery: The Darkest Chain.
- Life of the Oppressed.
- The Thin Veil of Morality.
- Cultural Divide and the Fight for Abolition.

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
[[black-chain-consortium|The Black Chain Consortium]]
[[rusted-compass-company|The Rusted Compass Company]]
[[crimson-fog-cartel|The Crimson Fog Cartel]]
[[bonehold-syndicate|The Bonehold Syndicate]]
[[chainwing-exchange|The Chainwing Exchange]]
[[indentured-servitude|indentured servitude]]
[[slavery-in-kaysender|slavery]]
[[free-sky-brotherhood|Free Sky Brotherhood]]
```

## Notes

This pass is intentionally grim and should remain reader-facing rather than becoming a generator convenience table. It provides the lore foundation for future job-board, resistance, abolition, criminal trade, pirate, and faction tools.

This material should be handled carefully in playable outputs. The wiki preserves the worldbuilding source, while generators should provide tools for rescue, resistance, exposure, escape, liberation, law enforcement, investigation, and political struggle rather than exploitative spectacle.
