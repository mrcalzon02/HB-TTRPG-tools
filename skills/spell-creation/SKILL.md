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

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance, Authorship & Usage Notice

This Agent Skill originates in **Calzon's TTRPG Foundry** (`mrcalzon02/HB-TTRPG-tools`) and is maintained under the authority of **mrcalzon02**. It was developed with human creative direction and AI-assisted drafting, analysis, coding, review, testing, and repository integration using **OpenAI ChatGPT** and **GitHub** tooling, alongside any skill-specific runtimes or libraries declared above.

This skill is distributed under the project's custom **Terms of Service & Usage Agreement**, Section 3, **“Permitted Use (the Anti-License)”** (last updated **July 10, 2026**): personal/private/non-commercial use and private adaptation are permitted; commercial use, sale, redistribution for profit, or commercial incorporation of the Platform's source code or proprietary lore assets is prohibited. Attribution is appreciated but not mandated. Third-party systems, lore, trademarks, APIs, libraries, standards, and other external material remain subject to their respective owners' rights.

Keep this notice with copies of `SKILL.md`. See `PROVENANCE.md` in this skill directory and the repository root `TERMS-OF-SERVICE.md` for the complete provenance and governing terms.
