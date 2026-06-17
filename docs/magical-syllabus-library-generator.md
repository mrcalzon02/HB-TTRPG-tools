# Magical Syllabus Library Generator

The Magical Syllabus Library Generator is a standalone bibliographic worldbuilding tool for `HB-TTRPG-tools`. It combines the disciplines and canonical course associations from both the Arcane Academic Studies Generator and the Malefic Academic Studies Generator without changing either generator.

## Current development phase

This phase establishes complete publication profiles before full pamphlet, chapter, textbook, and grand-tome content generation begins. Every generated title is now a structured fictional object rather than a title string.

The profile data is designed to support syllabus entries, university holdings, treasure descriptions, research clues, bookseller listings, classroom props, sourcebook prompts, and the later systematic generation of the publication’s actual contents.

## Combined curriculum scope

The generator reads:

- 14 Arcane Academic Studies disciplines
- 18 Malefic Academic Studies disciplines
- 32 disciplines total

The default library creates ten publications for every discipline, producing a 320-profile catalogue.

## Guaranteed publication range

When the complete publication scale is selected, each discipline receives one of every core format:

1. Liturgical Pamphlet — one to twenty pages
2. Loose-Leaf Study Guide — ten to forty-eight pages
3. Practical Field Guide
4. Departmental Handbook
5. Collegiate Textbook
6. Scholarly Monograph
7. Illustrated Arcane Atlas
8. Ritual and Laboratory Manual
9. Hefty Devotional Tome of at least 600 pages
10. Exhaustive Scholastic Concordance of at least 720 pages

Additional publications beyond ten reuse formats randomly while retaining the selected scale.

## Mandatory publication profile

Every generated publication always includes:

- Catalogue code and call number
- Full comedic title and subtitle
- Complete content summary
- Complete physical description
- Course or departmental association
- Arcane or Malefic curriculum source
- Luminous, neutral, dubious, or malefic shelf classification
- Publication format and page count
- Fictional author name, biographical origin, specialty, and reputation
- Publisher, series, edition, and institutional origin
- Production origin and approximate age
- Condition and rarity
- Price, valuation note, and acquisition method
- Composition, substrate, ink, cover or wrapper, dimensions, illustration style, leaf arrangement, and approximate weight
- Intended academic audience
- Circulation restrictions
- Primary topic, required exercise, and known magical complication

## Ratings

Every publication receives seven ratings from 0 to 100 with descriptive labels:

- Confidence
- Usefulness
- Readability
- Practical utility
- Scholarly value
- Authenticity
- Safety

The ratings account for publication scale, curriculum source, shelf alignment, and controlled random variation. A readable student pamphlet may have high readability but modest scholarly value. A monumental forbidden concordance may be authentic and academically valuable while being difficult to read and exceptionally unsafe.

## Format-sensitive construction

The physical generator respects the scale of the publication.

A pamphlet is a single loose or folded set of common leaves with no permanent binding. It may be distributed by an instructor, sold at cost by the academy supply shop, or produced by a student arts-and-crafts club as a pay-it-forward guide for the next semester.

A loose-leaf study guide may use a simple clip, paper cord, wrapper, or borrowed envelope. It is not described as an ancient obsidian codex.

Field guides, handbooks, and textbooks use ordinary collegiate cloth, practical stitching, academy boards, treated paper, and plausible trade-press production.

Only specialist monographs, atlases, laboratory manuals, devotional tomes, and concordances can receive progressively elaborate construction, provenance, metal fittings, monumental boards, rare substrates, or ancient-copy histories.

## Optional copy-specific details

Not every publication receives every possible feature. The probability and intensity increase with publication scale, age, and shelf alignment.

Optional details include:

- Scent or smell
- Detectable magical aura
- Marginalia
- Extended provenance
- Ownership or copy history
- Copy-specific magical quirk

Every publication always receives a handling description, but an ordinary one-page pamphlet may have no scent, aura, provenance, or magical oddity at all.

## Publishers and scholastic programmes

The fictional publishing network includes Magical Library Press, Undead Publishing Cooperative, Interplanar Scholastics Program, The Wandering Index, Blackglass University Press, The Ninefold Footnote, and numerous responsible, dubious, and openly forbidden imprints.

## Controls and export

Users can select:

- Arcane, Malefic, or combined curriculum sources
- A single course discipline or all disciplines
- Luminous, neutral, dubious, malefic, or mixed shelves
- Brief, course-sized, substantial, monumental, or complete publication ranges
- Ten to thirty publications per discipline

The catalogue can be copied as structured text or exported as versioned JSON. Publication-profile exports use schema version `2.0.0` and preserve the complete nested metadata needed by later content-generation systems.

## Validation

`scripts/validate-magical-library-generator.mjs` verifies:

- The combined discipline counts and 320-profile default catalogue
- Unique titles within every discipline
- Required summary, description, author, origin, price, composition, rarity, condition, and rating records
- All seven ratings and their valid score ranges
- Page ranges and publisher/shelf consistency
- The guaranteed publication ladder
- Pamphlets with no permanent binding
- Loose-leaf study packets with temporary packet construction
- Substantial binding for monumental publications
- Arcane-only filtering
- Malefic-only filtering
- Custom single-discipline generation
