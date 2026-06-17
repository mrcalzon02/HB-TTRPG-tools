# Solanum Umbra Native-System Wiki

## Core policy

Solanum Umbra is maintained as an independent tabletop roleplaying system. Its mechanics and terminology are imported natively.

The wiki does not translate Solanum Umbra into Hypertext d20, D&D 3.5, or another external system. Permitted normalization is limited to structure, indexing, cross-links, searchable tables, interface fields, page-level provenance, and explicit ambiguity notes.

Unclear, missing, duplicated, or conflicting source rules remain visible for later native-system adjudication.

## Source identity

The authoritative source is `SRC/Solanum-Umbra-TTRPG.pdf`.

- Pages: 248
- Bytes: 1,325,003
- SHA-256: `2f1d5d0df591b4d637e4845645370946568cb6aecc786a4bbef5411e4e82f9ff`

## Current foundation import

Seven packs and twenty-nine wiki entries are registered.

### Pack 1: Character creation and sheet foundation

Source pages 104–116.

Includes six 1d20 attributes; Health, Armor, Initiative, and SKILL formulas; five origins; six listed careers; motivations; ancestry guidance; cyborg variants; the more-than-49% full-cyberization threshold; six data-seizure stages; and a native character-sheet field schema.

### Pack 2: Career talents and backgrounds

Source pages 131–144.

Includes Minor and Major Talent tables for Hunter, Mechanic, Medic, Scavenger, and Warlord; sixty total career-talent results; six optional background tables; the default -4 untrained penalty; and profession, talent, and minimum-attribute equipment requirements.

Trader is listed as a career but no Trader talent tables were found. The omission remains explicit.

### Pack 3: Crafting and resources

Source pages 151–167.

Includes communications and resource tiers, technology modifiers, resource availability, complexity and time, the five-result outcome ladder, mentor and tool support, crafter skill, workshop quality, material quality, and worked examples.

The source calls several positive values “difficulty modifiers” while adding them to the d20 result. The printed procedure and contradiction are both preserved.

### Pack 4: Combat, cover, and vehicles

Source pages 167–188.

Includes initiative, one-action turns, twenty skill/action pairings, five-foot grid movement, zones of control, melee modes, ranged falloff, point-blank penalties, camouflage, cover values, ballistic and energy interactions, line of sight, large-entity cover, and the vehicle-combat framework.

The source presents two overlapping melee methods. Base Defensive Value, zone-of-control ties, Advanced Tech falloff, and tactical-to-catalog vehicle speed conversion remain unresolved.

### Pack 5: Fay entity generator

Source pages 228–232.

Seven complete generation tables cover type, size, appearance, behavior, powers, weakness, and motivation. The generator remains narrative; combat statistics are not invented.

### Pack 6: Synthesis enemy forces

Source pages 82–104.

Four force families are indexed:

- Unit 0 Forces
- Techno-Phantom Collective
- Bio-Machine Juggernauts
- The Anarchic Swarm

Each family has Foot Soldier, Scout, Tank, Brute, Grenadier, Leader, Fortress, Abomination, and Infiltrator roles. The roster contains thirty-six named profiles with design, strength, and weakness. Numerical combat statistics are not invented where the source gives only qualitative descriptions.

### Pack 7: Cybernetics, biotics, and degradation

Source pages 117–130.

Includes:

- Five cybernetic technology levels
- Eight body-part cost rows across all five technology levels
- Installation time, complexity, and risk
- Prosthetic performance modifiers from -4 through +4
- Five cybernetic body-percentage bands and cost multipliers
- Five biotic power-unit requirements
- Twelve named biotic enhancements and augmentations
- Hardwired interface and isolated-terminal security doctrine
- Full-cyborg social stigma and integration concerns
- Twenty-one long-term degradation outcomes
- Decade-based d100 degradation and recurring rolls every 1d6 years after forty years

The printed cybernetic cost formula conflicts with its worked example. The source example gives an Elite upper arm a listed cost of 7,500 credits, a multiplier of 1, and a final cost of 7,500 credits. The wiki preserves that result and marks the formula unresolved rather than squaring the body-part price.

## Recorded source gaps

The current receipt and validators preserve these issues:

- Attribute values 9–11 are printed as “-1 to +1” without an exact mapping.
- Trader lacks Minor and Major Talent tables.
- Positive crafting “difficulty” values are added to the success roll.
- Melee combat has both direct formulas and a primary-stat bonus method.
- Zone-of-control ties are undefined.
- Base Defensive Value is undefined in the imported combat section.
- Advanced Tech range falloff is ambiguous.
- Tactical vehicle movement and catalog speeds use different units without conversion.
- The cybernetic cost formula conflicts with its worked example.

## Wiki interface

The Solanum workspace displays and searches narrative entries, ordered procedures, native formulas, reference tables, sheet fields, worked examples, enemy role profiles, related entries, and page-level sources. The generic renderer also displays the new cybernetic tables and degradation procedure without additional subsystem-specific code.

## Source inventory isolation

Twelve additional files are present in `SRC/` but remain unassigned. Their exact paths are stored in `source-page-references/unassigned-src-inventory.json`. They are not treated as Solanum sources until their intended settings are reviewed.

## Validation

The Pages workflow runs:

- `node scripts/validate-source-references.mjs`
- `node scripts/validate-solanum-umbra-native-wiki.mjs`
- `node --check solanum-umbra-entry.js`

The validators check the verified source binary, seven pack paths, twenty-nine unique entries, native formulas, career and background counts, crafting and combat tables, explicit source ambiguities, seven entity-generator tables, four force families, thirty-six enemy roles, five cybernetic tiers, eight body parts, twelve enhancements, and twenty-one degradation outcomes.

## Files

- `data/solanum-umbra/wiki/wiki-index.json`
- `data/solanum-umbra/wiki/native-rules-pass-1-character-creation.json`
- `data/solanum-umbra/wiki/native-rules-pass-2-career-talents-backgrounds.json`
- `data/solanum-umbra/wiki/native-rules-pass-3-crafting-resources.json`
- `data/solanum-umbra/wiki/native-rules-pass-4-combat-cover-vehicles.json`
- `data/solanum-umbra/wiki/native-rules-pass-5-entity-generator.json`
- `data/solanum-umbra/wiki/native-enemies-pass-1-synthesis-forces.json`
- `data/solanum-umbra/wiki/native-rules-pass-6-cybernetics-biotics-degradation.json`
- `scripts/validate-solanum-umbra-native-wiki.mjs`
- `solanum-umbra-entry.js`
- `source-page-references/Solanum-Umbra-TTRPG.source.json`
