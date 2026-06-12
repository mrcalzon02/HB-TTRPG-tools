# Wiki Depth Pass 1

This pass expands the Kaysender wiki from short seed entries into source-faithful, editor-feeding lore packs.

## Purpose

The staged editors were starting to hit a ceiling because the wiki layer only contained short summary entries. This pass adds richer source-derived entries that can feed future editor controls, output tags, inheritance logic, and cross-links.

## Architecture change

The wiki now uses a multi-pack loader:

- `data/kaysender/wiki/wiki-index.json`
- `data/kaysender/wiki/entries.json`
- `data/kaysender/wiki/world-depth.json`
- `data/kaysender/wiki/peoples-depth.json`
- `data/kaysender/wiki/messara-nations-depth.json`
- `data/kaysender/wiki/factions-economy-depth.json`
- `data/kaysender/wiki/airships-depth.json`

Files later in the index can extend or override earlier entries by stable entry ID.

## Runtime change

`kaysender-wiki.js` now:

- Loads the wiki index.
- Loads every listed wiki pack.
- Merges entries by stable ID.
- Searches body and section text, not just title and tags.
- Renders optional titled sections.
- Converts internal wiki hotlinks written as `[[entry-id|visible text]]` into clickable links.
- Preserves related-entry chips and related-module chips.

## Deep entries added or expanded

### World layer

- Kaysender Overview
- Floating Islands and Skylands
- The Scarcity Loop
- Water Trade
- Sky Ecology

### Peoples layer

- Peoples of Kaysender
- Dwager / Dwarves
- Dragon Kin / Dragonborn
- Lizzzefaire / Lizardfolk
- Hume / Humans
- Fae / Elves
- Halflings
- Gezistack / Gnomes

### Messara and nations layer

- Messara
- Valeria and Valthorn
- Faelenor and Mirathen
- Teralon and Vorrik
- Silvalis and Neylithar
- Vornak and Grimhold
- Rylune and Falyris
- Zarovar and Kalthor
- Eldrath and Druun
- Imbria and Solaar

### Factions and economy layer

- Dragon Lords and Tribute Networks
- The Black Fleet
- Surveyor's Guild
- Skyweaver Consortium
- Black Chain Consortium
- Free Sky Brotherhood
- Dunhallow Roost

### Airships layer

- Airships and Vessels
- Dwarven Airship Core
- Elven Airship Core
- Dragon Kin Airship Core
- Gnomish Airship Core
- Human Airship Core

## Hotlink convention

Use this format inside summaries, body paragraphs, and section paragraphs:

```text
[[entry-id|visible text]]
```

Example:

```text
The settlement depends on [[water-trade|water convoys]] and [[airships|airship traffic]].
```

## Next wiki expansion targets

- Potion guilds and alchemical economy.
- Criminal trade groups beyond the first faction pass.
- Detailed equipment and weather gear entries.
- Creature and disease entries.
- City district and capital subentries.
- Airship class pages.
- Route and region pages.
- Individual source-safe location pages.
