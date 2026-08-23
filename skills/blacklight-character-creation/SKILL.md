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
