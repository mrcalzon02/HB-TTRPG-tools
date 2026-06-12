# Kaysender Wiki Hard-Reference Policy

The Kaysender wiki is the canonical source corpus for the project.

Generators and editors must derive from the wiki and its indexed source chunks. The wiki must not be treated as a short summary layer, a convenience digest, or a temporary memory aid.

## Core rule

Everything in the source core document should eventually exist in the wiki as either:

1. A reader-facing lore entry.
2. A source chunk attached to a lore entry.
3. A legacy mechanics entry marked as `mechanics-legacy`.
4. A conversion-note entry explaining how legacy material should later become Hypertext d20-compatible.
5. A cross-reference/index entry pointing to the correct canonical entries.

No generator should become the authority on lore. Generators should consume the wiki. Editors should enrich the wiki. The source corpus should remain recoverable through linked entries and source references.

## Why this exists

Short summaries are useful for navigation, but dangerous as foundations. If a 392-page manuscript is repeatedly compressed into short summaries, every later generator inherits the loss. Culture becomes a tag. A region becomes a one-line modifier. A faction becomes a random table result. This causes degeneration over time.

The correct flow is:

```text
Source document
  -> full wiki / source chunks / hard references
  -> indexed concepts and hotlinks
  -> generators and editors
  -> exported campaign objects
  -> optional new wiki drafts
```

The wrong flow is:

```text
Source document
  -> short summary
  -> generator guess
  -> editor simplification
  -> even shorter output
```

## Wiki entry standards

A wiki entry should preserve source lore in a reader-facing form.

Each entry should carry:

- Stable `id`.
- Reader-facing `title`.
- `category`.
- Summary for navigation only.
- Body paragraphs preserving the actual lore substance.
- Optional sections for long-form material.
- Hotlinks using `[[entry-id|visible text]]`.
- `sourceStatus` showing whether the entry is a stub, partial import, source-faithful entry, full source import, or derived tool output.
- `sourceRefs` pointing to page ranges, outline headings, or source chunks.
- `sourceChunkIds` when raw or near-raw extracted chunks exist.

## Source status meanings

- `seed-summary`: only a placeholder. Do not use as generator authority.
- `partial-source`: some source material is present, but the source section is not fully represented.
- `source-faithful`: the entry preserves the meaningful lore content of the referenced source section.
- `full-source-import`: the entire source section exists in wiki/source chunks and is cross-linked.
- `derived-tool-output`: created by a generator/editor and not canonical unless later promoted.

## Reader-facing vs builder-facing material

The visible wiki should read like lore.

Builder notes, editor hooks, generator fields, schema ideas, and implementation notes must not dominate the main wiki body. If needed, they belong in:

- Collapsed builder-note sections.
- Separate docs under `docs/`.
- Data schemas.
- Generator config files.
- Derived tool output records.

## Cross-linking standards

Every major concept should be linked. A reader should be able to move from:

- A region to its nations.
- A nation to its capital.
- A culture to its rivalries.
- A creature to its ecology.
- A faction to its allies, enemies, and victims.
- An airship core to its culture of origin.
- A settlement to its region, economy, crisis, and routes.

Use internal hotlinks:

```text
[[entry-id|visible text]]
```

## Ingestion order

The source document should be ingested in stable passes:

1. Outline and page manifest.
2. World overview and cosmology.
3. Peoples and cultural histories.
4. Regions and nations.
5. Capitals and settlements.
6. Factions, guilds, criminal groups, and religions.
7. Airships, cores, construction, equipment, and alchemy.
8. Creatures, diseases, ecology, materials, and hazards.
9. Adventures, encounters, NPCs, and location-specific material.
10. Legacy mechanics and conversion notes.

## Generator rule

A generator config should list which wiki entries and source chunks it depends on.

Example:

```json
{
  "generatorId": "airship-vessel-generator",
  "sourceDependencies": [
    "airships",
    "dwarven-airship-core",
    "elven-airship-core",
    "gnomish-airship-core",
    "human-airship-core",
    "black-fleet",
    "water-trade"
  ]
}
```

If the source entries are still `seed-summary`, the generator should be treated as provisional.

## Current implementation notes

The current wiki has begun this transition but is not finished. The first lore correction pack is `data/kaysender/wiki/source-lore-pass-1.json`. The source ingestion manifest is `data/kaysender/wiki/source-ingestion-manifest.json`.

The next major job is not another generator. The next major job is expanding the wiki until the source document itself is represented as hard-reference lore entries and source chunks.
