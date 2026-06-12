# Wiki Source-Lore Pass 2 — Messara Nations and Survival Conditions

This pass continues the hard-reference wiki migration by importing the next major source section from the Kaysender core manuscript.

## Scope

The pass adds:

- `data/kaysender/wiki/source-lore-pass-2-messara.json`

The wiki index now loads this pack after `source-lore-pass-1.json` so these entries override older summarized or editor-support versions.

## Imported source coverage

This pass covers early manuscript material from the Messara nation and survival sections:

- Faelenor and Mirathen.
- Teralon and Vorrik.
- Silvalis and Neylithar.
- Vornak and Grimhold.
- Rylune and Falyris.
- Zarovar and Kalthor.
- Eldrath and Druun.
- Imbria and Solaar.
- The Grim Realities of Survival in Kaysender.

## Entry structure

Each imported entry includes:

- Reader-facing lore prose.
- Stable wiki ID.
- Category.
- Hotlinks to related entries.
- `sourceStatus: source-faithful`.
- `sourceRefs` pointing back to the Kaysender core PDF page ranges.
- `sourceChunkIds` for future raw-chunk indexing.
- Related entry IDs.
- Related module IDs.

## Hotlink examples

The pass adds cross-links such as:

```text
[[messara|Messara]]
[[sheffels|sheffels]]
[[scarcity-loop|scarcity loop]]
[[water-trade|water trade]]
[[black-fleet|Black Fleet]]
```

## Why this pass matters

The previous wiki entries existed, but many were summary-level. That is not enough for generator derivation.

This pass starts correcting that by turning nation entries into hard lore references with economics, culture, religion, government, military, capital identity, notable features, and challenges. Generators can now derive from richer source-backed wiki material instead of thin summary tags.

## Next source pass

The next import pass should continue after the survival section and into the next source-outline block. The likely next area is the expanded Black Fleet / faction material and the following location or organization entries, depending on the PDF outline order.
