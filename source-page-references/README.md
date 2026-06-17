# Source Page References

Canonical source manuscripts registered for page-level provenance and multi-pass wiki integration.

Receipts in this folder preserve source identity, while verified PDF binaries now live in `SRC/`. Each source is integrated through documented passes that preserve provenance, distinguish manuscript material from later expansion, and avoid silently replacing the original text.

## Registered source manuscripts

- **Chronicles of Elemental Realms: Swamps, Toads, Frogs, and Salamanders** — 21-page fantasy planar-ecology manuscript. It has a dedicated Elemental Realms wiki and three completed creature and ecology passes.
- **Solanum Umbra TTRPG** — 248-page post-apocalyptic science-fantasy manuscript. Its dedicated wiki is now importing the game as its own native system. The first pass covers character creation, sheet fields, attributes, derived statistics, origins, careers, skills, motivations, ancestry and cyborg variants, the 49% cyberization threshold, and six stages of data seizures.
- **Mad Martiken’s Menagerie of Magical Services** — 14-page Kaysender location manuscript integrated under **Locations of Note** with its source material and separately labeled rules expansion.

Exact filenames, byte counts, page counts, SHA-256 checksums, repository paths, integration states, and receipt paths are recorded in `source-manifest.json`.

## Verified PDF binaries

The three registered PDFs are present in `SRC/` and match their recorded byte counts and SHA-256 checksums:

- `SRC/Chronicles of Elemental Realms_ Swamps, Toads, Frogs, and Salamanders.pdf`
- `SRC/Solanum-Umbra-TTRPG.pdf`
- `SRC/Mad Martiken’s Menagerie of Magical Services.pdf`

The source validator reads and hashes these files during the Pages workflow. A binary cannot be represented as verified merely because a similarly named file exists.

Six additional source PDFs are currently inventoried but unassigned to a setting destination:

- `SRC/Caves of Whispering wild 10.pdf`
- `SRC/The Northern Watchtower 09.pdf`
- `SRC/The Secret Chambers of Sabiesha the Enchantress 10.pdf`
- `SRC/The Secret Prison of Souls 10.pdf`
- `SRC/Tomb of Antwig 05.pdf`
- `SRC/Veteck Henrina'yea 09.pdf`

They remain outside Solanum Umbra until their provenance and intended wiki placement are reviewed.

## Receipt fields

Each receipt records:

- Original filename
- Media type
- Page count
- Exact byte count
- SHA-256 checksum
- Verified repository path
- Integration destination
- Current import state
- Imported scope and provenance policy where applicable

`node scripts/validate-source-references.mjs` verifies the manifest, receipts, binary file identities, setting assignments, and current wiki state.

## Integration policy

### Elemental Realms

The Elemental Realms wiki distinguishes manuscript creatures, manuscript-adjacent conversions, index-derived extrapolations, and later canon expansions. Its completed passes record combat statistics, diet, ecological function, parasite and symbiote classifications, host relationships, feeding grounds, breeding strategies, migration cycles, and predator pressure.

### Mad Martiken

The Mad Martiken location preserves manuscript facts and marks conversion additions separately. Quoted service tiers remain intact, while added pricing, checks, stabilization, reversibility, and conversation material remain visibly identified as expansion.

### Solanum Umbra

Solanum Umbra is an entirely separate native rules system. It is **not** converted into Hypertext d20, 3.5, or another game.

Solanum import work may normalize:

- JSON structure
- Wiki categories
- Cross-links
- Search fields
- Character-sheet fields
- Table presentation
- Page-level provenance
- Explicit ambiguity notes

It must not replace native attributes, formulas, careers, skills, combat resolution, cyberization, crafting, classes, enemies, or entities with mechanics from another system.

The first native pass imports pages 104–116. Later passes will cover advancement, resolution, combat, cover, vehicles, crafting, roles, classes, cybernetics, equipment, enemies, factions, paranormal entities, and soul hazards.
