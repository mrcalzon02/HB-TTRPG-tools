# Solanum Umbra Native-System Wiki

## Core policy

Solanum Umbra is maintained as an independent tabletop roleplaying system. Its mechanics and terminology are imported natively.

The wiki does not translate Solanum Umbra into Hypertext d20, D&D 3.5, or another external system. Permitted normalization is limited to structure, indexing, cross-links, searchable tables, interface fields, page-level provenance, and explicit ambiguity notes.

Unclear, missing, duplicated, or conflicting source rules remain visible for later native-system adjudication.

## Source identity

The authoritative source is:

`SRC/Solanum-Umbra-TTRPG.pdf`

Verified identity:

- Pages: 248
- Bytes: 1,325,003
- SHA-256: `2f1d5d0df591b4d637e4845645370946568cb6aecc786a4bbef5411e4e82f9ff`

## Current foundation import

Six packs and twenty-five wiki entries are registered.

### Pack 1: Character creation and sheet foundation

Source pages 104–116.

Includes:

- Six attributes rolled on 1d20
- Health = CON + STR
- Armor = CON + DEX
- Initiative = DEX + INT
- SKILL = INT + WIS
- Five origins
- Six listed careers
- Mechanic benefit and skill examples
- Motivation table
- Pre-Fall Human, Post-Fall Human, and Fae guidance
- Cyborg ancestry variants
- More-than-49% full-cyberization threshold
- Six stages of data seizures and system errors
- Native character-sheet field schema

### Pack 2: Career talents and backgrounds

Source pages 131–144.

Includes:

- Hunter Minor and Major Talents
- Mechanic Minor and Major Talents
- Medic Minor and Major Talents
- Scavenger Minor and Major Talents
- Warlord Minor and Major Talents
- Sixty total career-talent results
- Six optional background-generation tables
- General talent resolution
- Default -4 penalty when no relevant talent or training applies
- Equipment profession, talent, and minimum-attribute requirements

Trader is listed as a career in character creation, but no Trader talent tables were found. The omission remains explicit.

### Pack 3: Crafting and resources

Source pages 151–167.

Includes:

- Communications technology tiers
- Sorted resource tiers
- Technology-level modifiers
- Resource-availability modifiers
- Complexity and crafting-time table
- Five-result crafting outcome ladder
- Mentor modifiers
- Tool and component modifiers
- Crafter skill modifiers
- Workshop quality modifiers
- Material quality modifiers
- Worked Modern-weapon example

The source calls several positive values “difficulty modifiers” while adding them to the d20 result. The wiki preserves this printed procedure and records the terminology conflict.

### Pack 4: Combat, cover, and vehicles

Source pages 167–188.

Includes:

- Initiative roll and persistent turn order
- One-action turns
- Twenty native skill/action attribute pairings
- Five-foot tactical grid
- Standard 30-foot movement
- Adjacent-square zones of control
- Opposed Strength movement checks
- Close Combat, Wrestling, and Unarmed Combat
- Ranged technology and range falloff
- Point-blank penalties
- Camouflage modifiers
- Cover Defensive Values
- Ballistic and energy cover interactions
- Line of sight and large-entity cover
- Vehicle movement, cover, armor, mounted weapons, critical systems, and maintenance

The source presents two overlapping melee calculation methods. Base Defensive Value, ties in zone-of-control checks, Advanced Tech range falloff, and tactical-to-catalog vehicle speed conversion remain unresolved.

### Pack 5: Fay entity generator

Source pages 228–232.

Seven complete generation tables cover:

1. Entity type
2. Size
3. Appearance
4. Behavior
5. Abilities and powers
6. Weakness
7. Alignment or motivation

The generator remains narrative and native. Combat statistics are not invented.

### Pack 6: Synthesis enemy forces

Source pages 82–104.

Four force families are indexed:

- Unit 0 Forces
- Techno-Phantom Collective
- Bio-Machine Juggernauts
- The Anarchic Swarm

Each family has nine recurring battlefield roles:

- Foot Soldier
- Scout
- Tank
- Brute
- Grenadier
- Leader
- Fortress
- Abomination
- Infiltrator

The roster contains thirty-six named enemy profiles with faction, role, visual design, principal strength, and principal weakness. Numerical Health, Armor, attacks, damage, or encounter ratings are not invented where the source supplies only qualitative descriptions.

## Recorded source gaps

The current receipt and validators preserve these issues:

- Attribute values 9–11 are printed as providing “-1 to +1” without an exact mapping.
- Trader is listed as a career but lacks Minor and Major Talent tables.
- Crafting positive “difficulty” values are added to the success roll.
- Melee combat is described through both direct raw-stat formulas and a primary-stat bonus method.
- Zone-of-control ties are undefined.
- Base Defensive Value is not defined in the imported combat section.
- Advanced Tech range falloff is printed ambiguously.
- Tactical vehicle movement and catalog speeds use different units without a conversion rule.

## Wiki interface

The Solanum workspace now displays and searches:

- Narrative entries
- Ordered creation, generation, and procedure sequences
- Native formulas
- Reference tables
- Character-sheet field groups
- Worked examples
- Enemy role profiles
- Related-entry links
- Page-level source references

## Source inventory isolation

Twelve additional files are present in `SRC/` but remain unassigned. Their exact paths are stored in:

`source-page-references/unassigned-src-inventory.json`

They are not treated as Solanum sources until their intended settings are reviewed.

## Validation

The Pages workflow runs:

- `node scripts/validate-source-references.mjs`
- `node scripts/validate-solanum-umbra-native-wiki.mjs`
- `node --check solanum-umbra-entry.js`

The validators check the verified source binary, all six pack paths, twenty-five unique entries, native formulas, career and background counts, crafting and combat tables, explicit source ambiguities, seven entity-generator tables, four force families, and thirty-six enemy roles.

## Files

- `data/solanum-umbra/wiki/wiki-index.json`
- `data/solanum-umbra/wiki/native-rules-pass-1-character-creation.json`
- `data/solanum-umbra/wiki/native-rules-pass-2-career-talents-backgrounds.json`
- `data/solanum-umbra/wiki/native-rules-pass-3-crafting-resources.json`
- `data/solanum-umbra/wiki/native-rules-pass-4-combat-cover-vehicles.json`
- `data/solanum-umbra/wiki/native-rules-pass-5-entity-generator.json`
- `data/solanum-umbra/wiki/native-enemies-pass-1-synthesis-forces.json`
- `scripts/validate-solanum-umbra-native-wiki.mjs`
- `solanum-umbra-entry.js`
- `source-page-references/Solanum-Umbra-TTRPG.source.json`
