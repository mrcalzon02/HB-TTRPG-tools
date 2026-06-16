# Arcane Academic Studies Generator

The Arcane Academic Studies Generator is a standalone worldbuilding tool opened from the general Generators page. It creates fictional magical education at either individual-course or full-program scale.

## Academic scope

The generator includes fourteen primary disciplines: Alchemy, Abjuration, Enchantment, Divination, Demonology, Geomancy, Pyrotechnics, Temporal Studies, Inter-Planar Studies, Invocation, Sorcery, Cabbalism, Magical Arts, and Military Magic. A second discipline is selected for interdisciplinary course names, lessons, practical work, and hazards.

The supplied title set is preserved as canonical inspiration, including Analytical Temporal Engineering, Comparative Pyrotechnic Geomancy, Essential Inter-Planar Taxonomy, Inadvisable Applied Demonology, Remedial Pyrotechnic Alchemy, Relativistic Alchemy, Temporal Taxonomy, and Theoretical Popular Abjuration.

## Generated program structure

Programs may be generated as a survey course, certificate, minor, major, graduate program, or doctoral track. Each program contains:

- Institution, institutional character, department, credential, and safety policy
- Admission requirements and program learning outcomes
- A term-by-term prerequisite sequence
- A comprehensive examination and capstone requirement
- A core academic library and faculty note
- Full course records rather than title-only placeholders

Each course contains:

- Stable course code, title, level, credits, format, instructor, and facility
- Catalogue description and prerequisite
- Learning outcomes
- Five or six curriculum units with instructional and study methods
- Laboratory or practicum work
- Two assignments
- Midterm and final examination formats
- Required books, tools, and protective materials
- Principal magical hazard and passing standard

## Controls

Users may direct or randomize the institution type, program type, primary discipline, secondary discipline, teaching orientation, entry level, and safety policy. A course-count override supports one, four, six, eight, ten, or twelve courses. Up to ten complete programs may be generated in one batch.

## Export

The visible curriculum can be copied as structured plain text. JSON export includes a schema version, generator identifier, generation timestamp, and complete nested program, term, course, syllabus, assessment, material, and hazard records.

## Validation

`scripts/validate-arcane-academic-generator.mjs` verifies the supplied canonical titles and exercises every discipline across every academic level and teaching orientation. It rejects missing program identity, incomplete course sequences, broken prerequisite chains, absent examinations, incomplete syllabi, missing materials, or missing capstone requirements.
