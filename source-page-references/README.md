# Source Page References

Canonical source documents retained for page-level provenance and later multi-pass wiki integration.

Files in this folder are reference manuscripts, not automatically normalized or rules-converted content. Each large source should be integrated through documented passes that preserve source provenance, distinguish lore from mechanics, and avoid silently replacing the original text.

## Registered source manuscripts

- **Chronicles of Elemental Realms: Swamps, Toads, Frogs, and Salamanders** — 21-page fantasy planar-ecology manuscript. Retained for later integration into the general fantasy wiki corpus.
- **Solanum Umbra TTRPG** — 248-page post-apocalyptic science-fantasy manuscript. Retained for a dedicated Solanum Umbra wiki and tool section separate from Kaysender and the fantasy corpus.

Exact filenames, byte counts, page counts, SHA-256 checksums, integration states, and encoded source-part paths are recorded in `source-manifest.json`.

## Lossless source storage

The repository connector used for source intake writes UTF-8 files rather than raw binary objects. The PDFs are therefore retained losslessly as base64 source bundles under `encoded/`. This is storage encoding only; it does not alter or extract the documents.

Run:

```bash
node scripts/materialize-source-pdfs.mjs
```

The materializer reconstructs the original `.pdf` files at their registered destinations and refuses to write them unless both the exact byte count and SHA-256 checksum match the uploaded sources.

`node scripts/validate-source-references.mjs` independently verifies the stored bundles, PDF signatures, checksums, manifest, and deferred Solanum Umbra wiki state.

## Integration policy

These manuscripts require repeated, source-backed passes. The Solanum Umbra wiki index intentionally contains no integrated content packs yet. Its source will later be separated into chronology, cosmology, technology, magic, factions, settlements, hazards, bestiary, characters, equipment, rules, and adventure material before final cross-linking.
