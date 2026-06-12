# Wiki Source-Lore Pass 4 — Merchant Fleets and Communication Networks

This pass continues the hard-reference wiki migration by importing the merchant fleet and magical communication infrastructure source block.

## Added pack

- `data/kaysender/wiki/source-lore-pass-4-merchant-communications.json`

The pack is loaded after the earlier source-lore passes through:

- `data/kaysender/wiki/wiki-index.json`

## Imported source coverage

This pass covers manuscript material from pages 42–52:

- Merchant Fleets and Organizations of Kaysender.
- The Surveyor's Guild.
- The Whisper Web.
- The Skyweaver Consortium.
- The Aetherbound Company.
- The Free Flotilla.
- The Ember Guild.
- The Gilded Current.
- The World Whispering Web.
- The Resonant Concord.
- Locator Glyphs.
- Tracker's Beacon.

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

Tracker's Beacon includes a `mechanics-legacy` section. The source mechanics are preserved as source material, but the entry explicitly marks them as legacy material that should be converted before being treated as final Hypertext d20-compatible rules text.

## Hotlink examples

```text
[[surveyors-guild|The Surveyor's Guild]]
[[whisper-web|The Whisper Web]]
[[skyweaver-consortium|The Skyweaver Consortium]]
[[world-whispering-web|World Whispering Web]]
[[resonant-concord|Resonant Concord]]
[[locator-glyphs|Locator Glyphs]]
[[tracker-beacon|Tracker's Beacon]]
```

## Notes

This pass creates hard lore nodes for Kaysender's trade and communications infrastructure. Future market, airship, route, organization, and crafting tools should derive from these entries instead of generic merchant or communication tags.
