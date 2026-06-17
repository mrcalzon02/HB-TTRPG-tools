# Source Page References

Canonical source manuscripts registered for page-level provenance and later multi-pass wiki integration.

Files and receipts in this folder are source records, not automatically normalized or rules-converted content. Each large source is integrated through documented passes that preserve provenance, distinguish lore from mechanics, and avoid silently replacing the original text.

## Registered source manuscripts

- **Chronicles of Elemental Realms: Swamps, Toads, Frogs, and Salamanders** — 21-page fantasy planar-ecology manuscript. It now has a dedicated Elemental Realms wiki and three completed creature and ecology passes: provenance-labeled Hypertext d20 creatures, planar leech taxonomy, and full-stat host, prey, breeding-ground, and feeding-ground ecologies.
- **Solanum Umbra TTRPG** — 248-page post-apocalyptic science-fantasy manuscript. Registered for a dedicated Solanum Umbra wiki and tool section separate from Kaysender and the fantasy corpus.

Exact filenames, byte counts, page counts, SHA-256 checksums, intended binary paths, integration states, and receipt paths are recorded in `source-manifest.json`.

## Source receipts and binary status

The repository connector used for this intake can write UTF-8 source records but cannot transfer the uploaded binary PDF bytes directly into Git. The folder therefore contains canonical `.source.json` receipts for both manuscripts.

Each receipt records:

- Original filename
- Media type
- Page count
- Exact byte count
- SHA-256 checksum
- Intended repository PDF path
- Integration destination
- Current binary-transfer status

The receipts make the source identity auditable and prevent a nonexistent or corrupted PDF from being represented as complete. The raw PDFs remain pending a binary-capable repository transfer. When that transfer is performed, the resulting files must match the recorded byte counts and SHA-256 checksums before `binaryPresentInGit` is changed to `true`.

`node scripts/validate-source-references.mjs` verifies the manifest, both canonical receipts, the dedicated Elemental Realms assignment and pass-three scope, and the intentionally empty Solanum Umbra wiki staging index.

## Integration policy

The Elemental Realms wiki distinguishes detailed manuscript creatures, manuscript-adjacent conversions, index-derived extrapolations, and later canon expansions. Its completed passes record full combat statistics, diet, ecological function, parasite and symbiote classifications, host relationships, feeding grounds, breeding strategies, migration cycles, and predator pressure so planar amphibians, giant insects, arachnoids, spirits, predators, prey, leeches, and their hosts operate as connected food webs.

Solanum Umbra still intentionally contains no integrated content packs. Its source will later be separated into chronology, cosmology, technology, magic, factions, settlements, hazards, bestiary, characters, equipment, rules, and adventure material before final cross-linking.
