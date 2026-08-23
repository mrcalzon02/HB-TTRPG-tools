---
name: spell-creation
description: Use the Foundry Spell Creator to build complete Hypertext d20-compatible spell drafts with level, class, school, role, delivery, saves or attacks, damage/healing, conditions, range, duration, components, resistance, scaling, balance diagnostics, manifestation text, origin, and practical uses. Activate for repository-backed spell design.
compatibility: The canonical Spell Creator is currently a browser workflow composed from spell-creator.html and its vocabulary/mechanics/module JavaScript files.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-page: spell-creator.html
---

# Spell Creation

Use the repository's single standard Spell Creator workflow. Do not revive retired split spell-generator placeholders.

## Canonical implementation

- `spell-creator.html`
- `spell-creator-vocabulary.js`
- `spell-creator-mechanics.js`
- `module-spell-creator.js`
- `spell-creator-entry.js`

## Workflow

1. Capture the requested spell concept, level/power target, class/tradition, mechanical role, delivery shape, damage/healing/condition intent, range, duration, components, and special constraints.
2. Use the canonical browser Spell Creator when runtime access is available.
3. Preserve its mechanical fields, scaling/caps, practical-use guidance, manifestation/origin prose, and balance diagnostics.
4. If the browser runtime is unavailable, use the canonical vocabulary/mechanics sources for explanation or guided design, but do not claim the canonical generator executed.
5. Prefer JSON/schema-compatible output when the user wants reusable generator data.

## Hard rules

- The current Spell Creator is the authoritative standard spell workflow.
- Do not substitute the former Normal/Eccentric placeholder generators.
- Do not silently discard balance warnings.
- Do not create a parallel spell progression formula inside the skill.
