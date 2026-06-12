# Wiki Stat Conversion Pass 1 — Beasts of the Abyss

This pass fixes the problem where creature wiki entries displayed only lore and placeholder legacy-ability text instead of usable Hypertext d20-compatible statistics.

## Added data pack

- `data/kaysender/wiki/converted-stats-pass-1-abyss-creatures.json`

The pack loads after all source-lore packs in:

- `data/kaysender/wiki/wiki-index.json`

Loading converted statistics after lore packs is intentional. It lets source-lore entries remain readable while allowing final converted stat blocks to override old placeholder sections.

## Entry converted

- `beasts-of-the-abyss`

## Stat blocks added

- Abyssal Maw.
- Shadowwing Leviathan.
- Sable Tendrils.
- Blackclaw.
- Nightmare Hound.
- Gloomrider.

## Renderer changes

The wiki renderer now supports `statBlocks` and displays them as visible stat cards with:

- Ruleset and conversion status.
- Creature type, size, and alignment.
- Challenge Rating and experience.
- Hit Dice and hit points.
- Initiative and speed.
- Armor Class, touch AC, and flat-footed AC.
- Base attack/grapple.
- Attack and full attack.
- Space/reach.
- Fortitude, Reflex, and Will saves.
- Strength, Dexterity, Constitution, Intelligence, Wisdom, and Charisma.
- Special attacks.
- Special qualities.
- Skills.
- Feats.
- Environment, organization, treasure, advancement, and level adjustment.
- Tactics.
- Conversion notes.

## Schema changes

`data/kaysender/schemas/wiki-entry.schema.json` now includes `statBlocks`, with a structured Hypertext d20-compatible stat block schema.

## Source basis

The converted statistics are derived from the Kaysender source descriptions of the Abyssal Maw, Shadowwing Leviathan, Sable Tendrils, Blackclaw, Nightmare Hound, and Gloomrider. The source provides appearance, behavior, danger, and named abilities; this pass converts that source material into working d20-style statistics.

## Next targets

- Abyss layer and Infernal Core hazard stat blocks.
- Airship and ship-combat stat systems.
- Sky creature stat blocks.
- Disease, flora, and environmental hazard stat blocks.
