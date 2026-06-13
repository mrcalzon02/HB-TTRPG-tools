# Kaysender Source-to-Wiki Export Audit

## Verdict

The source document has **not** yet been fully exported to the wiki.

The current wiki has extensive thematic coverage and 58 registered source-lore passes, followed by eight converted-statistics passes. However, it does not yet satisfy a strict one-to-one export standard in which every substantive source heading, named subject, rules subsystem, table, item, creature, location, organization, artifact, and legend is represented by either:

- a dedicated full wiki entry;
- a complete subsection inside an explicitly linked parent entry; or
- a mechanics-complete stat block or operational rules object when the source provides game mechanics.

## Confirmed missing standalone source entries

The following source headings were checked against the repository and currently have no dedicated wiki entry or source-lore pack match:

1. **The Lost Continent of Azh'Thanar**
   - The unbroken western continent.
   - Primeval jungles, vast rivers, mountains, prehistoric megafauna, impossible giant-built ruins, colossal bones, vanished elven records, sealed dwarven records, and draconic silence.
   - This is a substantial final source section and requires a full location/history/ecology entry rather than a short paragraph.

2. **The Legend of Aelric Skywarden: The First Protector of the Light**
   - This named legend is present in the source heading sequence but no dedicated Aelric entry was found in the wiki.
   - It requires a full NPC/legend entry and any described relics, vows, abilities, institutions, or historical consequences should be split into linked entries where appropriate.

3. **The Dwarven Lecture on Airflight**
   - This source heading was not found as a dedicated wiki entry.
   - It should be exported as a cultural/technical document preserving the dwarven explanation, terminology, operating principles, and any explicit mechanics rather than reduced to a general flight summary.

## Confirmed exactness problem

Many current lore packs are editorial restructurings or summaries. That is useful for reader-facing navigation, but it is not the same as exact export.

A source topic is not considered fully exported merely because a related broad entry exists. Completion requires preserving:

- all named subtopics;
- all operational procedures;
- all DCs, costs, durations, limits, prerequisites, failure effects, and tables;
- all distinct variants, levels, archetypes, and examples;
- all named people, ships, artifacts, organizations, locations, creatures, diseases, plants, and hazards;
- all relationships and source-specific distinctions.

## Required export standard going forward

Every new source export must meet these rules:

1. **Full understanding before entry creation**
   - Read the entire source section and its continuation pages.
   - Identify whether the subject is lore-only, mechanical, or mixed.

2. **Mechanics completeness**
   - Creatures receive full Hypertext d20-compatible stat blocks.
   - Items and artifacts receive complete operation, activation, limits, costs, failure states, and interaction rules.
   - Classes and backgrounds retain complete progression, prerequisites, proficiencies, features, tables, and choices.
   - Systems retain checks, DCs, modifiers, timing, outcomes, critical results, and examples.
   - Ships and organizations retain complete statistics and operating procedures where supplied.

3. **No short-blurb substitution**
   - A short summary may introduce an entry, but it cannot replace the source's substantive description or mechanics.

4. **Source-faithful versus setting-derived labeling**
   - Direct manuscript exports use `source-faithful`.
   - Added names, inferred systems, or connective lore use `setting-derived` and must be clearly identified.

5. **Heading-level auditability**
   - Each substantive source heading should map to a stable wiki entry ID or a named section in a parent entry.
   - Source references should include page ranges, outline titles, and chunk IDs whenever available.

## Current coverage status

- Broad topic coverage: **high**
- Mechanics conversion coverage: **partial but expanding**
- Named-heading coverage: **incomplete**
- One-to-one exact export: **not verified and currently false**
- Final completion declaration: **not yet permitted**

## Next export priority

1. The Lost Continent of Azh'Thanar
2. The Legend of Aelric Skywarden
3. The Dwarven Lecture on Airflight
4. A complete residual heading audit across all 392 source pages
5. Table-by-table mechanics verification for classes, backgrounds, ships, equipment, crafting, tracking, fleet combat, organization management, training, escape, hazards, diseases, flora, and encounter systems
