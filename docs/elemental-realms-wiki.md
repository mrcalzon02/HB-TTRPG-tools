# Chronicles of the Elemental Realms Wiki

The Chronicles of the Elemental Realms has a dedicated top-level wiki section independent from Kaysender and Solanum Umbra. The current integration contains Hypertext d20 / 3.5-compatible creature references for every detailed, named, indexed, or ecologically relevant creature identified in the 21-page source manuscript, plus clearly labeled later canon expansions.

## Current creature-reference pass

The registry contains 60 creature references across eleven categories:

- Primordial Swamps and Guardians
- Plane of Water
- Plane of Fire
- Plane of Earth
- Ethereal and Astral Bogs
- Plane of Air
- Para-Elemental Quagmire
- Unconventional Planes
- Swamp Arthropods and Adjacent Fauna
- Planar Leeches, Parasites, and Symbiotes
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

## The leech catalogue

The second expansion adds a historical catalogue dispute and fifteen fully statted creatures colloquially classified as leeches.

The catalogue uses a relational and topological definition rather than a strict anatomical one: a leech is any creature whose primary sustenance is obtained by feeding upon another creature. Blood-feeding annelids are included, but so are creatures that drain heat, breath, memory, elemental flame, mineral salts, diseased tissue, dream activity, or other host-derived resources.

This deliberately preserves the historical ambiguity between parasitic and symbiotic feeders. A parasitic feeder extracts value while harming or weakening the host. A symbiotic feeder still consumes material or energy from the host, but returns a service such as wound cleaning, poison filtering, thermal regulation, or nightmare removal. Facultative species can move between both states according to hunger, density, season, handling, or planar conditions.

The author openly acknowledges that anatomical purists, annelid catalogists, lamprey specialists, ooze scholars, and competing swamp cataloguing societies will object to this usage. Their objections are represented in each entry’s catalogue note rather than used to erase ecological similarities.

### Leech entries

- Bloodreed Leech — parasitic primordial-swamp blood feeder.
- Mire-Mender Leech — symbiotic wound cleaner and medicinal feeder.
- Tideglass Leech — water-plane cleaner attached to immense aquatic hosts.
- Stoneblood Burrower — earth-plane mineral and vitality parasite.
- Breathwick Leech — air-plane respiratory feeder that can become a spore-filtering symbiote.
- Memory Leech — ethereal and astral parasite feeding on recent memory.
- Brine-Sump Leech — para-elemental toxin filter that can continue into destructive dehydration.
- Ember Vein Leech — fire-plane heat vampire sustained by ambient flame.
- Cinder-Suture Leech — fire-plane medicinal feeder that cauterizes wounds.
- Furnace-Maw Leech — great attachment predator and apex heat parasite.
- Ashen Brood Leech Swarm — mass fire-swamp infestation draining shallow body heat.
- Pyroclast Lamprey — lava-swimming feeder that siphons elemental flame.
- Hearthshare Leech — mutualistic thermal regulator that stores and returns excess heat.
- Slag-Bloom Leech — facultative cleaner of flame toads and other fire creatures.
- Dream Leech — unconventional-plane feeder that may consume nightmares or all restorative dreaming.

Seven of the fifteen entries are flame-aligned. This is at least twice the largest grouping assigned to any other single planar affinity. The catalogue’s working explanation is energetic: ambient fire can satisfy locomotion, digestion, thermal maintenance, and other basic functions, leaving host-derived heat available for growth, storage, defense, and reproduction. Heat-draining niches can therefore diversify more readily in fire swamps than equivalent feeder niches elsewhere.

Every leech card includes morphology, feeding mode, planar affinity, primary sustenance, and a cataloguing-dispute note in addition to the standard creature statistics.

## Deep swamp food webs

The setting treats amphibious beasts as varied in diet as they are in form. Herbivores, filter feeders, scavengers, mineral eaters, insect hunters, carrion feeders, ambush predators, parasites, symbiotes, and apex guardians coexist across the planes.

Seven full arthropod ecology references establish the supporting food web:

- Mire Lantern Beetle
- Reed-Shear Mantis
- Bogglass Spider
- Emberback Scarab
- Magnet Midge Swarm
- Astral Threadmite Swarm
- Quagmire Mud Crab

These creatures pollinate, decompose, aerate sediment, spread spores, process carrion, prey upon amphibians, and serve as prey for larger frogs, toads, salamanders, planar guardians, and leech-like feeders.

## Files

- `data/elemental-realms/wiki/wiki-index.json`
- `elemental-realms-creature-core.js`
- `elemental-realms-creatures-primary.js`
- `elemental-realms-creatures-secondary.js`
- `elemental-realms-creatures-expansions.js`
- `elemental-realms-creatures-leeches.js`
- `elemental-realms-creatures-context.js`
- `elemental-realms-entry.js`
- `elemental-realms-wiki.css`
- `scripts/validate-elemental-realms-wiki.mjs`

## Validation

The validator checks the exact 60-entry registry, eleven categories, unique IDs, required statistics, diets, ecology text, source-page discipline, provenance labels, confidence labels, the three original featured canon expansions, fifteen leech catalogue entries, all leech classification fields, all three feeding modes, the fire-plane multiplicity rule, ten detailed manuscript creatures, and seven statted arthropod entries.
