# The Europan Crewman's Primer Wiki

## Purpose

The Europan Crewman's Primer is an original, unofficial Barotrauma-inspired field-manual wiki contained within the Barotrauma workspace of HB TTRPG Tools. It is written as an accumulated professional handbook for submarine crews operating beneath Europa's ice.

The Primer is not a transcription of proprietary game text. Its prose, doctrine, procedures, warnings, field notes, and editorial footnotes are original campaign material designed to support roleplay, campaign preparation, table reference, and later Barotrauma-oriented tools.

## Current implementation

The active alpha implementation contains 21 ordered, searchable, and cross-linked sections across three JSON packs.

- `data/barotrauma/wiki/crewmans-primer-index.json` — canonical title, edition, category list, reading order, entry count, pack list, disclaimer, and editorial rules.
- `data/barotrauma/wiki/crewmans-primer-pack-1.json` — Sections I–VII: foundation, crew conduct, command, watchstanding, communications, and weapons safety.
- `data/barotrauma/wiki/crewmans-primer-pack-2.json` — Sections VIII–XIV: damage control, engineering, medicine, exterior operations, navigation, and logistics.
- `data/barotrauma/wiki/crewmans-primer-pack-3.json` — Sections XV–XXI: salvage, security, psychology, crew culture, cults, emergency priorities, and institutional memory.
- `barotrauma-entry.js` — registry rendering, Primer launch action, search, category filtering, section navigation, footnote rendering, and related-section cross-links.
- `scripts/validate-barotrauma-crewmans-primer.mjs` — dependency-free structural and doctrine validator.
- `scripts/run-barotrauma-primer-browser-verification.mjs` — Playwright verification of the live wiki interaction path.

## Section catalogue

1. Purpose, Scope, and the First Rule
2. The Hull and the Ocean
3. The Crew Compact
4. Command, Orders, and Accountability
5. Watchstanding and Handover
6. Communications, Alarms, and Useful Brevity
7. Weapons and the Line-of-Fire Doctrine
8. Damage Control and Compartment Survival
9. Reactor and Electrical Systems
10. Mechanical Systems, Hull, and Ballast
11. Medical Response and Biosecurity
12. Diving and Exterior Operations
13. Navigation, Sonar, and Piloting
14. Logistics, Munitions, and the Last Spare
15. Salvage, Outposts, and Derelicts
16. Hostile Boarding and Internal Security
17. Depth Psychology and Crew Strain
18. The Assistant and the Clown Question
19. The Two Calls Below the Ice
20. The Emergency Priority Ladder
21. Incident Reports, Lessons, and the Crew's Memory

## Entry contract

Every Primer entry must contain:

- `id` — stable lowercase kebab-case identifier.
- `sectionNumber` — unique Roman numeral or other approved display number.
- `category` — one of the categories registered in the index.
- `title` — visible section heading.
- `subtitle` — short in-world maxim or framing sentence.
- `summary` — concise statement of the section's purpose.
- `body` — one or more explanatory paragraphs.
- `doctrine` — one or more operational rules.
- `procedures` — one or more titled ordered procedures with nonempty steps.
- `warnings` — one or more concise safety warnings.
- `fieldNotes` — one or more in-world observations.
- `relatedEntries` — one or more valid entry IDs.
- `footnotes` — optional editorial or contextual notes.

IDs are permanent once published. Renaming a visible title is acceptable; changing an ID requires migration of every reading-order and related-entry reference.

## Writing standard

Primer prose should remain professional, direct, dryly humorous, and visibly shaped by preventable disasters. It should read as a manual written by people who have lost colleagues to unclear orders, bad repairs, hidden symptoms, poor inventory, reckless gunfire, and jokes that crossed into sabotage.

The tone may be severe, but it must distinguish between eccentricity and evidence. Clothing, jokes, ritual, belief, or social identity are not themselves proof of sabotage or infection. Intervention should be based on conduct, access, exposure, coercion, tampering, or credible evidence.

Procedures should be immediately usable. Explanatory prose may be atmospheric, but doctrine and steps must remain legible during play.

## Protected doctrine

The validator treats several concepts as foundational and prevents their accidental removal.

### Line-of-fire rule

The weapons section must preserve the strict rule:

> Never fire through a crew member's occupied space.

Crouching, partial elevation, probable movement, or confidence in the shooter does not create a safe firing lane. The shooter must reposition, hold fire, or order the foreground clear.

### Crew culture and clown conduct

The Assistant and Clown section must continue to distinguish harmless absurdity from theft, coercion, false alarms, impersonation, system tampering, contamination, drugging, obstruction, or escalating a prank after consent has ended.

### Honkmother and Husk comparison

The Two Calls Below the Ice must continue to discuss both the Children of the Honkmother and the Church of the Husk. It must not collapse them into the same phenomenon.

The Children are examined primarily through public performance, disruption, escalating prank culture, social solidarity, and operational interference. The Church is examined through secrecy, deliberate infection, bodily transformation, parasite distribution, coercion, and biosecurity risk.

The section must also preserve the institutional caution that material abandonment, weak medicine, failed logistics, and political neglect can create recruitment conditions that security operations alone cannot resolve.

## Adding a new section

1. Choose the pack that best matches the section's place in the reading order, or create a new pack when an existing file would become difficult to maintain.
2. Add the complete entry using the entry contract above.
3. Register the entry ID exactly once in `readingOrder`.
4. Increase `entryCount`.
5. Add any new category to the canonical category list.
6. Add at least one related-section link and ensure reciprocal links where useful.
7. Update the section catalogue in this document.
8. Run the structural validator and browser verification.

A section should not be marked complete merely because prose exists. Completion requires valid data, resolved cross-links, live rendering, search discoverability, category placement, and deployment-gate coverage.

## Validation

Run the dependency-free data and integration validator:

```bash
node scripts/validate-barotrauma-crewmans-primer.mjs
```

After Playwright is installed, run the live browser verification:

```bash
node scripts/run-barotrauma-primer-browser-verification.mjs \
  artifacts/barotrauma-primer-browser-verification.json \
  artifacts/barotrauma-primer-browser-verification-failure.png \
  artifacts/barotrauma-primer-browser-verification-failure.json
```

The GitHub Pages workflow runs both checks automatically. The structural validator checks pack loading, entry counts, unique IDs and section numbers, category registration, reading order, cross-link resolution, registry activation, runtime markers, site integration, and protected doctrine. The browser verification opens the Barotrauma workspace, launches the Primer, confirms all 21 sections, exercises search, checks the line-of-fire doctrine, follows the cult cross-link, and tests category filtering.

## Status language

- `planned` — concept exists only in the registry or roadmap.
- `foundation` — data or interface skeleton exists but is not a complete user-facing reference.
- `alpha` — usable live reference with validation, while prose and coverage may continue expanding.
- `beta` — broad intended coverage is present and editorial stabilization has begun.
- `stable` — schema, navigation, and core doctrine are considered publication-ready for the project.

The Crewman's Primer is currently `alpha`.
