# Wiki Source-Lore Pass 3 — Pirates and Dragon Powers

This pass continues the hard-reference wiki migration by importing the Black Fleet and Dragon Lord source block.

## Added pack

- `data/kaysender/wiki/source-lore-pass-3-pirates-dragons.json`

The pack is loaded after the earlier source-lore passes through:

- `data/kaysender/wiki/wiki-index.json`

## Imported source coverage

This pass covers manuscript material from pages 31–41:

- The Black Fleet.
- Sky Captain Verek Drakemoor.
- The Abyss Harbinger.
- The Shadow Gale.
- The Emberclaw.
- Spire the Hellrod.
- The Dragon Lords and their hierarchy.
- Emperor Trazintharix the Eternal Flame.
- Skyhold Citadel.
- The High Lords of Flame.
- The Wildlands.
- Notable Dragon Lords and their domains.
- Dragon tithes and tribute culture.
- The Tithe Fleet.
- Floating Vaults.

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
[[black-fleet|Black Fleet]]
[[verek-drakemoor|Sky Captain Verek Drakemoor]]
[[hellrod|Spire the Hellrod]]
[[dragon-lords|Dragon Lords]]
[[trazintharix|Emperor Trazintharix the Eternal Flame]]
[[skyhold-citadel|Skyhold Citadel]]
[[tithe-fleet|Tithe Fleet]]
[[floating-vaults|Floating Vaults]]
```

## Notes

This pass creates hard lore nodes that future generators can derive from directly. Pirate generators should no longer treat the Black Fleet as just a random pirate label. Dragon-tithe tools should derive from the tithe hierarchy, tithe fleet, regional collectors, floating vaults, and tribute culture entries.
