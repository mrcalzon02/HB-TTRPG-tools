# Source Page References

Canonical source manuscripts registered for page-level provenance and multi-pass wiki integration.

Receipts in this folder preserve source identity, while verified binaries live in `SRC/`. Each assigned source is integrated through documented passes that preserve provenance, distinguish manuscript material from later expansion, and avoid silently replacing the original text.

## Assigned and verified sources

- **Chronicles of Elemental Realms: Swamps, Toads, Frogs, and Salamanders** — 21-page fantasy planar-ecology manuscript with a dedicated Elemental Realms wiki and three completed creature and ecology passes.
- **Solanum Umbra TTRPG** — 248-page post-apocalyptic science-fantasy manuscript with an active native-system wiki import. Six packs now cover character creation, character-sheet foundations, career talents, backgrounds, crafting, resources, combat, cover, vehicles, supernatural entity generation, four Synthesis force families, and thirty-six named enemy roles.
- **Mad Martiken’s Menagerie of Magical Services** — 14-page Kaysender location manuscript integrated under **Locations of Note**, with source material and later rules or conversation expansions kept distinct.

Exact filenames, byte counts, page counts, SHA-256 checksums, repository paths, integration states, and receipt paths are recorded in `source-manifest.json`.

## Verified repository binaries

The three assigned PDFs are present in `SRC/` and match their recorded byte counts and SHA-256 checksums:

- `SRC/Chronicles of Elemental Realms_ Swamps, Toads, Frogs, and Salamanders.pdf`
- `SRC/Solanum-Umbra-TTRPG.pdf`
- `SRC/Mad Martiken’s Menagerie of Magical Services.pdf`

The source validator reads and hashes these files during the Pages workflow. A binary cannot be represented as verified merely because a similarly named file exists.

## Unassigned source inventory

Twelve additional documents are present in `SRC/` but are not yet assigned to a setting or wiki. Their exact paths are recorded in:

`source-page-references/unassigned-src-inventory.json`

The inventory includes Barotrauma, Ember Tales, VS-D6, Vintage Story/Pontivar, Voyages of the Suther, and several standalone location manuscripts. They remain outside Solanum Umbra until their provenance and intended destinations are reviewed.

## Receipt fields

Each assigned-source receipt records:

- Original filename
- Media type
- Page count
- Exact byte count
- SHA-256 checksum
- Verified repository path
- Integration destination
- Current import state
- Imported scope
- Provenance and mechanics policy

`node scripts/validate-source-references.mjs` verifies the manifest, receipts, assigned binary identities, wiki assignments, and the existence of every unassigned source path.

## Integration policies

### Elemental Realms

The Elemental Realms wiki distinguishes manuscript creatures, manuscript-adjacent conversions, index-derived extrapolations, and later canon expansions. Completed passes record statistics, diet, ecology, parasite and symbiote classifications, host relationships, feeding grounds, breeding strategies, migration cycles, and predator pressure.

### Mad Martiken

The Mad Martiken location preserves manuscript facts and marks conversion additions separately. Quoted service tiers remain intact, while added pricing, checks, stabilization, reversibility, and conversation material remain visibly identified as expansion.

### Solanum Umbra

Solanum Umbra is an entirely separate native rules system. It is **not** converted into Hypertext d20, D&D 3.5, or another game.

Solanum import work may normalize:

- JSON structure
- Wiki categories
- Cross-links
- Search fields
- Character-sheet fields
- Table presentation
- Page-level provenance
- Explicit ambiguity and conflict notes

It must not replace native attributes, formulas, careers, talents, combat resolution, cyberization, crafting, equipment, enemies, or entities with mechanics from another system.

Current native import ranges are:

- Pages 82–116: Synthesis forces and character creation
- Pages 131–144: career talents, backgrounds, and equipment requirements
- Pages 151–188: resources, crafting, combat, cover, and vehicles
- Pages 228–232: supernatural entity generator

The active Solanum roadmap continues with advancement, cybernetic installation, biotic requirements, detailed equipment and vehicle catalogues, remaining professional structures, settlements and services, named creatures and anomalies, and army construction.
