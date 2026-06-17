# Magical Syllabus Library Generator

The Magical Syllabus Library Generator is a standalone bibliographic worldbuilding tool for `HB-TTRPG-tools`. It combines the disciplines and canonical course associations from both the Arcane Academic Studies Generator and the Malefic Academic Studies Generator without changing either generator.

## Current development phase

This phase generates fictional book titles and catalogue records rather than complete book contents. Every record includes enough metadata to function as a syllabus entry, library holding, university reading assignment, treasure description, research clue, or sourcebook prompt.

## Combined curriculum scope

The generator reads:

- 14 Arcane Academic Studies disciplines
- 18 Malefic Academic Studies disciplines
- 32 disciplines total

The default library creates ten titles for every discipline, producing a 320-title catalogue.

## Guaranteed publication range

When the complete publication scale is selected, each discipline receives one of every core format:

1. Liturgical Pamphlet
2. Annotated Lecture Notes
3. Practical Field Guide
4. Departmental Handbook
5. Collegiate Textbook
6. Scholarly Monograph
7. Illustrated Arcane Atlas
8. Ritual and Laboratory Manual
9. Hefty Devotional Tome of at least 600 pages
10. Exhaustive Scholastic Concordance of at least 720 pages

Additional titles beyond ten reuse formats randomly while retaining the selected scale.

## Catalogue metadata

Every generated title includes:

- Catalogue code and call number
- Full comedic title and subtitle
- Course or departmental association
- Arcane or Malefic curriculum source
- Luminous, neutral, dubious, or malefic shelf classification
- Publication format, binding, and page count
- Fictional author, publisher, series, and edition
- Intended academic audience
- Circulation restrictions
- A hilariously specific subject note
- Primary topic, required exercise, and known magical complication

## Publishers and scholastic programmes

The fictional publishing network includes Magical Library Press, Undead Publishing Cooperative, Interplanar Scholastics Program, The Wandering Index, Blackglass University Press, The Ninefold Footnote, and numerous responsible, dubious, and openly forbidden imprints.

## Controls

Users can select:

- Arcane, Malefic, or combined curriculum sources
- A single course discipline or all disciplines
- Luminous, neutral, dubious, malefic, or mixed shelves
- Brief, course-sized, substantial, monumental, or complete publication ranges
- Ten to thirty titles per discipline

The catalogue can be copied as structured text or exported as versioned JSON.

## Validation

`scripts/validate-magical-library-generator.mjs` verifies the combined discipline counts, the 320-title default catalogue, unique titles within every discipline, page ranges, publisher and shelf consistency, the guaranteed publication ladder, Arcane-only filtering, Malefic-only filtering, and custom single-discipline generation.
