# Wiki Source-Lore Correction Pass 1

This pass corrects the visible wiki direction after the first deep wiki expansion leaned too heavily toward editor support text.

## Correction

The displayed wiki should read like a lore wiki first. It should not feel like a behind-the-scenes editor design document.

The first correction pack is:

- `data/kaysender/wiki/source-lore-pass-1.json`

The wiki index now loads this pack last:

- `data/kaysender/wiki/wiki-index.json`

Because later packs override earlier entries by stable ID, this lets source-facing lore replace the previous editor-heavy visible entries while preserving earlier support data for future use.

## Source material used

This pass is based on the early manuscript sections covering:

- Kaysender's opening premise.
- Floating continents and drifting islands.
- Airships, dragons, pirates, scoundrels, and the unknown abyss below.
- Sheffels.
- The Grays.
- Sky-dwelling creatures, levitation, buoyant oils, magical glands, and atmospheric life.
- Land-bound peoples.
- Dwager.
- Dragon Kin.
- Lizzzefaire.
- Hume.
- Fae.
- Halflings.
- Gezistack.
- Messara.
- Valeria.
- The Black Fleet.

## Entries corrected or added

- `kaysender-overview`
- `floating-islands`
- `sky-ecology`
- `sheffels`
- `grays`
- `peoples-of-kaysender`
- `dwager`
- `dragon-kin`
- `lizzzefaire`
- `hume`
- `fae`
- `halflings`
- `gezistack`
- `messara`
- `valeria-valthorn`
- `black-fleet`

## Ongoing rule

Visible wiki entries should prioritize:

1. Reader-facing lore.
2. In-world history and culture.
3. Named places, people, factions, creatures, economies, and conflicts.
4. Hotlinked relationships between source concepts.

Builder/editor notes should not dominate visible wiki entries. If technical metadata is needed, it should be separated from the lore body or moved into a collapsed/back-end layer.

## Next correction targets

- Expand the rest of the Messara nation entries from the manuscript.
- Add more source-derived location entries.
- Expand Dragon Lords, Dunhallow Roost, factions, guilds, criminals, and economy entries with lore-first prose.
- Add creature and disease entries from the manuscript.
- Add equipment, alchemy, potion, and weather-gear lore entries.
