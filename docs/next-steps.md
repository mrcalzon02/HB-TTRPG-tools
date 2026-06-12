# Next Steps

## Immediate next build pass

The next useful development pass should focus on moving from alpha scripts toward data-driven modules.

### 1. Move generator tables into JSON

Current alpha generators store their tables inside `kaysender-tools.js`. Move those tables into:

- `data/kaysender/tables/floating-islands.json`
- `data/kaysender/tables/settlements.json`
- `data/kaysender/tables/markets.json`
- `data/kaysender/tables/airships.json`
- `data/kaysender/tables/supply-events.json`

### 2. Move cross-link maps into JSON

The module-to-wiki map now has a JSON staging file at:

- `data/kaysender/crosslinks/module-entry-map.json`

The runtime should eventually load that file instead of mirroring the map in `kaysender-wiki.js`.

### 3. Add exportable generated results

Generated islands, settlements, markets, ships, and supply projections should be copyable and exportable as JSON.

Generated objects should be able to become:

- Campaign notes.
- Draft wiki entries.
- Saved encounter seeds.
- Location records.
- Ship records.
- Faction assets.

### 4. Add backlinks

Wiki entries should eventually show:

- Entries they link to.
- Entries that link back to them.
- Modules they link to.
- Modules that use them as quick wiki context.

### 5. Add validators

Add browser-side validation for:

- Missing wiki IDs.
- Missing module IDs.
- Broken related entries.
- Broken related modules.
- Empty summaries.
- Entries with rules-facing language but no conversion note.

### 6. Continue manuscript extraction

The next lore extraction pass should prioritize:

- Peoples and cultures.
- Messara nations and capitals.
- Major factions.
- Airship construction cultures.
- Water trade and scarcity infrastructure.
- Dragon tithe systems.
- Pirate and black-market organizations.

Each extracted item should become a source-safe operational wiki entry rather than a direct manuscript paste.
