# Solanum Umbra Source Staging

Solanum Umbra is a dedicated post-apocalyptic science-fantasy TTRPG setting. It is intentionally separated from the fantasy-facing Kaysender and general elemental-realm material.

## Current status

The 248-page source manuscript is registered through `source-page-references/source-manifest.json`. Its canonical identity receipt is retained at `source-page-references/Solanum-Umbra-TTRPG.source.json`, including the original filename, byte count, page count, SHA-256 checksum, intended PDF destination, and integration state.

The raw PDF binary is not yet present in Git because the available repository connector cannot write binary attachments. Its intended destination remains `source-page-references/Solanum-Umbra-TTRPG.pdf`, and a later binary-capable transfer must match the recorded checksum before the manifest can mark it present.

The dedicated wiki index exists at `data/solanum-umbra/wiki/wiki-index.json`, but its `packs` list remains empty. No source-derived wiki material should be treated as integrated until it has passed through deliberate extraction and review.

## Deferred multi-pass integration

Later work should proceed through multiple source passes rather than one broad summary:

1. Setting identity, terminology, cosmology, and chronology.
2. The Age of Ascension, Synthesis War, Collapse, and modern era.
3. Synthesis units, commanders, machine societies, and technological abominations.
4. Magic, entropy, cosmic ruptures, fae knowledge, and black-hole mythology.
5. Human survivors, old-world immortals, mortal-born populations, enclaves, and settlements.
6. Hermetic orders, factions, governments, militaries, economies, and conspiracies.
7. Wasteland regions, ruined cities, environmental systems, Tar, black rains, and survival hazards.
8. Paranormal entities, creatures, mutations, bestiary entries, and ecological relationships.
9. Character options, skills, equipment, vehicles, medicine, technology, and rules-facing systems.
10. Adventures, scenarios, stories, named characters, locations, and cross-links.
11. Mechanical normalization, diagnostics, compatibility review, and final wiki indexing.

Each pass should retain page-level provenance and distinguish original lore from later rules conversion or editorial interpretation.

## Separation from fantasy settings

Solanum Umbra receives its own top-level site tab, source tree, wiki index, future registries, and eventual tools. Shared generic utilities may be reused, but setting content should not be silently merged into Kaysender or the general fantasy wiki corpus.
