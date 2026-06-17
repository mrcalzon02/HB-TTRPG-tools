# Solanum Umbra Native-System Wiki

## Policy

Solanum Umbra is an independent tabletop roleplaying system. Its mechanics and terminology are imported natively, not translated into Hypertext d20, D&D 3.5, or another external rules chassis.

Permitted normalization is limited to structured entries, categories, cross-links, searchable tables, interface fields, page provenance, and explicit ambiguity notes. Missing or conflicting source rules remain visible for later native-system adjudication.

## Verified source

`SRC/Solanum-Umbra-TTRPG.pdf`

- 248 pages
- 1,325,003 bytes
- SHA-256 `2f1d5d0df591b4d637e4845645370946568cb6aecc786a4bbef5411e4e82f9ff`

## Current import

Eight packs and thirty-six wiki entries are registered. Native source coverage is continuous from pages 82–188, with the entity generator imported from pages 228–232.

### 1. Character creation and sheets — pages 104–116

Six 1d20 attributes; Health, Armor, Initiative, and SKILL formulas; origins; careers; motivations; ancestry guidance; cyborg variants; the more-than-49% full-cyberization threshold; six data-seizure stages; and a native character-sheet schema.

### 2. Career talents and backgrounds — pages 131–144

Minor and Major Talents for Hunter, Mechanic, Medic, Scavenger, and Warlord; sixty career-talent results; six background tables; the default -4 untrained penalty; and equipment requirements.

Trader is listed as a career but no Trader talent tables were found.

### 3. Crafting and resources — pages 151–167

Communications and resource tiers; technology, availability, complexity, time, mentor, tool, skill, workshop, and material modifiers; outcome ladder; and worked examples.

The source calls several positive values “difficulty modifiers” while adding them to the d20 result. Both the printed procedure and the contradiction are preserved.

### 4. Combat, cover, and vehicles — pages 167–188

Initiative, one-action turns, twenty skill/action pairings, tactical movement, zones of control, melee modes, ranged falloff, point-blank attacks, camouflage, cover values, ballistic and energy interactions, line of sight, and vehicle combat.

The manuscript supplies two overlapping melee methods. Base Defensive Value, zone-of-control ties, Advanced Tech falloff, and tactical-to-catalog vehicle speed conversion remain unresolved.

### 5. Fay entity generator — pages 228–232

Seven complete tables generate type, size, appearance, behavior, powers, weakness, and motivation. Combat statistics are not invented.

### 6. Synthesis enemy forces — pages 82–104

Four force families and thirty-six named enemy profiles:

- Unit 0 Forces
- Techno-Phantom Collective
- Bio-Machine Juggernauts
- The Anarchic Swarm

Each family contains Foot Soldier, Scout, Tank, Brute, Grenadier, Leader, Fortress, Abomination, and Infiltrator roles.

### 7. Cybernetics, biotics, and degradation — pages 117–130

Five cybernetic technology levels; eight body-part cost rows; installation time and risk; prosthetic performance; body-percentage multipliers; biotic power requirements; twelve enhancements; hardwired-interface security; social consequences; and twenty-one long-term degradation outcomes.

The printed cybernetic cost formula conflicts with its Elite upper-arm example. The example gives a listed cost of 7,500 credits, multiplier 1, and final cost 7,500 credits. The formula remains flagged rather than being silently rewritten.

### 8. Profession advancement and equipment — pages 143–157

Two advancement tracks cover Novice to Expert and Expert to Master. The printed transition totals are 38,500 XP and 60,500 XP respectively.

Equipment entries include:

- Six knife tiers
- Six pistol tiers
- Six rifle tiers
- Six healing-item tiers
- Head, body, arm, hand, and foot armor
- Six pack tiers
- Communications and sorted resources
- Trade goods and Synthesis salvage

All native damage dice, credit values, defense bonuses, recovery bonuses, and item effects are preserved.

## Native role and class structure

The manuscript does not define a separate player-class subsystem. Player identity and advancement use:

- Origin
- Career
- Career Minor and Major Talents
- Novice profession
- Expert profession
- Master profession

References to “class” elsewhere concern social classes, enemy unit classes, vehicle classes, or location categories. No foreign class layer is being added.

## Recorded source gaps

- Attribute values 9–11 are printed as “-1 to +1” without exact mapping.
- Trader lacks talent tables.
- Crafting positive “difficulty” values are added to success rolls.
- Melee combat has two calculation methods.
- Zone-of-control ties are undefined.
- Base Defensive Value is undefined.
- Advanced Tech range falloff is ambiguous.
- Tactical and catalog vehicle speeds lack conversion.
- Cybernetic cost formula and worked example conflict.

## Interface

The Solanum browser displays and searches narrative entries, procedures, formulas, tables, sheet fields, worked examples, enemy profiles, related entries, and page references.

## Source isolation

Twelve additional files in `SRC/` remain unassigned. Their exact paths are stored in `source-page-references/unassigned-src-inventory.json`; none are treated as Solanum sources without review.

## Validation

The Pages workflow runs:

- `node scripts/validate-source-references.mjs`
- `node scripts/validate-solanum-umbra-native-wiki.mjs`
- `node --check solanum-umbra-entry.js`

The validators cover the verified PDF, eight packs, thirty-six entries, native formulas, careers, advancement, cybernetics, crafting, equipment, combat, entity generation, and enemy forces.
