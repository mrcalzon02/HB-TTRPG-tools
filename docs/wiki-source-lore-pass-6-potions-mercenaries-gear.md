# Wiki Source-Lore Pass 6 — Potions, Mercenaries, Safety Gear, Emergency Equipment, and Cargo

This pass continues the hard-reference wiki migration by importing the next equipment-and-services block from the Kaysender core manuscript.

## Added pack

- `data/kaysender/wiki/source-lore-pass-6-potions-mercenaries-gear.json`

The pack is loaded after the earlier source-lore passes through:

- `data/kaysender/wiki/wiki-index.json`

## Imported source coverage

This pass covers manuscript material from pages 60–78:

- Potion guilds.
- Gilded Flask Guild.
- Iron Cauldron Consortium.
- Verdant Circle Collective.
- Emberforge Alchemists.
- Starlight Elixirs Guild.
- Mercenary companies.
- Iron Vanguard.
- Silver Fangs.
- Emberhawks.
- Stone Shields.
- Gilded Gauntlet.
- Black Scales.
- Wandering Blades.
- Night Wardens.
- Azure Striders.
- Fall-prevention gear and abyss safety.
- Air Sailor’s Rope Harness.
- Sky Bloon Harness.
- Feather Charms.
- Cloudcatch Cloaks.
- Levitation Safety Bands.
- Sky Whistles.
- Parachuting Wyrm Kits.
- Featherlight Parasols.
- Phoenix Pendants.
- Aether Wings Harnesses.
- Eternal Drift Boots.
- Skyweaver’s Sphere.
- Abyssal Amulet.
- Emergency signaling equipment.
- Cargo loads and airship shipping standards.

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

Potion effects and fall-prevention gear include legacy mechanical details in the source. These have been preserved as `mechanics-legacy` notes so they remain available for later conversion without presenting them as final Hypertext d20-compatible rules text.

## Notes

This pass gives future crafting, shop, supply, mercenary, job-board, and airship generators direct source-backed wiki nodes rather than forcing them to derive from generic item tags.
