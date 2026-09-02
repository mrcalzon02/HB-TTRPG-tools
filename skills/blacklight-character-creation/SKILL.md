---
name: blacklight-character-creation
description: Guide Blacklight Continuum character creation using the repository's authoritative character rules, archetypes, supernatural subgroup options, equipment, factions, random-character content, and canonical UI generator. Activate when a user asks to create, randomize, review, or explain a Blacklight character.
compatibility: Rules/content resources are remotely retrievable; the current random-character generator is browser-UI/state-bound pending canonical core extraction.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-capability: blacklight.random-character
---

# Blacklight Character Creation

Use the repository's character-creation resources and the canonical Blacklight character generator without inventing a parallel character system.

## Authoritative resources

- `blacklight.character-options`
- `blacklight.character-creation`
- `blacklight.random-character-content`
- subgroup rules registered in the Blacklight resource collection
- equipment/artifact/alien-technology resources when relevant
- `blacklight.complete-lore-index` for faction and setting context

## Workflow

1. Determine whether the user wants rules guidance, option discovery, a review of an existing character, or actual random generation.
2. Retrieve the relevant character/rules resources before selecting archetypes, subgroup options, practices, equipment, or lore.
3. If the canonical Blacklight random-character UI/runtime is available, use it for actual random generation.
4. If the UI runtime is unavailable, do not claim a canonical random roll occurred. You may explain available options, build a user-directed character from authoritative rules, or identify what the canonical generator would need.
5. Keep mechanical choices grounded in the character-creation foundation and associated subgroup/equipment resources.
6. Preserve provenance for unusual options, faction ties, relics, alien technology, or campaign-specific material.

## Hard rules

- Do not create a second random-character algorithm in the skill.
- Do not merge subgroup mechanics unless repository rules permit it.
- Keep lore and mechanics distinguishable when the source data separates them.
- Do not call UI-bound generation headless until the canonical generator core is extracted and registered.

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance, Authorship & Usage Notice

This Agent Skill originates in **Calzon's TTRPG Foundry** (`mrcalzon02/HB-TTRPG-tools`) and is maintained under the authority of **mrcalzon02**. It was developed with human creative direction and AI-assisted drafting, analysis, coding, review, testing, and repository integration using **OpenAI ChatGPT** and **GitHub** tooling, alongside any skill-specific runtimes or libraries declared above.

This skill is distributed under the project's custom **Terms of Service & Usage Agreement**, Section 3, **“Permitted Use (the Anti-License)”** (last updated **July 10, 2026**): personal/private/non-commercial use and private adaptation are permitted; commercial use, sale, redistribution for profit, or commercial incorporation of the Platform's source code or proprietary lore assets is prohibited. Attribution is appreciated but not mandated. Third-party systems, lore, trademarks, APIs, libraries, standards, and other external material remain subject to their respective owners' rights.

Keep this notice with copies of `SKILL.md`. See `PROVENANCE.md` in this skill directory and the repository root `TERMS-OF-SERVICE.md` for the complete provenance and governing terms.
