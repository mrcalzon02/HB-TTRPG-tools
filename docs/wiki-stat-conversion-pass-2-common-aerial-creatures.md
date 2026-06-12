# Wiki Stat Conversion Pass 2 — Common Aerial Creatures

This pass continues the correction from lore-only wiki entries to visible Hypertext d20-compatible rules entries.

## Added data pack

- `data/kaysender/wiki/converted-stats-pass-2-common-aerial-creatures.json`

The pack loads after all source-lore packs and after the first Abyss creature statistics pack in:

- `data/kaysender/wiki/wiki-index.json`

Converted statistics packs are intentionally loaded after lore packs so they override old `mechanics-legacy` placeholder sections.

## Entries converted

- `sheffels-creature`
- `skyflayer`
- `flufftrounce`
- `common-aerial-hunters`

## Stat blocks added

- Sheffel.
- Skyflayer.
- Flufftrounce.
- Aetherhawk.
- Storm Eagle.
- Sky Vulture.
- Skywyrm.

## Source basis

This pass converts the existing source-backed aerial creature lore entries from the Kaysender wiki packs:

- `data/kaysender/wiki/source-lore-pass-22-aerial-creatures.json`
- `data/kaysender/wiki/source-lore-pass-43-common-aerial-hunters-depth.json`

The source entries describe creature role, ecology, movement, danger level, and named legacy abilities. This pass turns those descriptions into usable Hypertext d20-compatible stat blocks while retaining source references and source chunk IDs.

## Notes

Skywhales and Sky Maws are intentionally left for the next statistics passes because they are larger, multi-stage, or variant-heavy creature families. They need their own conversion pass rather than being compressed into this common-creature pack.
