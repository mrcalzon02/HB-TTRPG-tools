# Chronicles of the Elemental Realms Wiki

The Chronicles of the Elemental Realms now has a dedicated top-level wiki section independent from Kaysender and Solanum Umbra. The first integration pass focuses on Hypertext d20 / 3.5-compatible creature references for every detailed, named, indexed, or ecologically relevant creature identified in the 21-page source manuscript, plus clearly labeled later canon expansions.

## Current creature-reference pass

The registry contains 45 creature references across ten categories:

- Primordial Swamps and Guardians
- Plane of Water
- Plane of Fire
- Plane of Earth
- Ethereal and Astral Bogs
- Plane of Air
- Para-Elemental Quagmire
- Unconventional Planes
- Swamp Arthropods and Adjacent Fauna
- Contextual Fauna and Prey

Every entry includes armor class, touch and flat-footed AC, hit points, Hit Dice, saves, movement, base attack and grapple, space and reach, abilities, skills, feats, attacks, special attacks, special qualities, environment, organization, treasure, advancement, challenge rating, combat behavior, diet, and ecological function.

## Provenance states

Creature cards visibly distinguish four origins:

1. **Manuscript creature** — the manuscript contains a detailed species profile. Mechanics are derived from that profile.
2. **Manuscript-adjacent conversion** — the creature or creature class is explicitly mentioned, but complete statistics required editorial construction.
3. **Index-derived conversion** — the name appears in the source index or heading without a full treatment. These entries are low-confidence and provisional.
4. **New canon expansion** — material added after source intake. These entries never claim manuscript page references.

## New canon creatures

The first expansion includes:

- **Cinder Frog** — an ash-burrowing fire amphibian that blinds attackers with cinders and helps burned wetlands recover.
- **Magnetic Frog Beast** — a lodestone marsh predator capable of pulling metal-bearing creatures, disarming weapons, and reversing metallic projectiles.
- **Snode** — a snake toad whose body remains crouched beneath muck while its long neck is mistaken for a serpent.

## Deep swamp food webs

The setting treats amphibious beasts as varied in diet as they are in form. Herbivores, filter feeders, scavengers, mineral eaters, insect hunters, carrion feeders, ambush predators, and apex guardians coexist across the planes.

Seven full arthropod ecology references establish the supporting food web:

- Mire Lantern Beetle
- Reed-Shear Mantis
- Bogglass Spider
- Emberback Scarab
- Magnet Midge Swarm
- Astral Threadmite Swarm
- Quagmire Mud Crab

These creatures pollinate, decompose, aerate sediment, spread spores, process carrion, prey upon amphibians, and serve as prey for larger frogs, toads, salamanders, and planar guardians.

## Files

- `data/elemental-realms/wiki/wiki-index.json`
- `elemental-realms-creature-core.js`
- `elemental-realms-creatures-primary.js`
- `elemental-realms-creatures-secondary.js`
- `elemental-realms-creatures-expansions.js`
- `elemental-realms-creatures-context.js`
- `elemental-realms-entry.js`
- `elemental-realms-wiki.css`
- `scripts/validate-elemental-realms-wiki.mjs`

## Validation

The validator checks the exact 45-entry registry, ten categories, unique IDs, required statistics, diets, ecology text, source-page discipline, provenance labels, confidence labels, the three featured canon expansions, ten detailed manuscript creatures, and seven statted arthropod entries.
