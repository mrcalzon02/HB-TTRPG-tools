---
name: quest-and-adventure-development
description: Develop quests, scenarios, missions, mysteries, and adventures with clear motives, branches, evidence, consequences, and reusable module structure.
compatibility: System-neutral workflow skill. Use repository/campaign resources when the task depends on established setting canon or mechanics.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-capability: foundry.site-index
  personality-engram: blacklight.charles
---

# Quest And Adventure Development

## Workflow

1. Define premise, initiating pressure, player-facing objective, hidden truth if any, and why action matters now.
2. Identify principal actors, their goals, and what changes if the players do nothing.
3. Build scenes, locations, clues, encounters, and decision points as a network rather than a single mandatory path whenever possible.
4. For mysteries, ensure essential conclusions have redundant clue paths and do not depend on one successful roll.
5. Define success, partial success, failure, retreat, and unintended-resolution consequences.
6. Tie rewards and discoveries to the fiction rather than treating them as detached completion prizes.
7. Package reusable rooms, encounter hooks, treasure, NPCs, and transitions through `adventure-module-operations` when appropriate.

## Pair with

Use `campaign-lore-retrieval`, `npc-and-faction-development`, `encounter-design`, `settlement-and-location-development`, and `adventure-module-operations`.

## Shared rules

- Inherit `blacklight.charles` from the Agent Skills registry; do not redefine the personality locally.
- Repository and campaign authorities outrank model prior.
- Mirrored calls, not mirrored logic.
- Do not claim unavailable generators or runtimes executed.
- Preserve the target game's terminology and design assumptions unless the user explicitly requests a conversion.

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance, Authorship & Usage Notice

This Agent Skill originates in **Calzon's TTRPG Foundry** (`mrcalzon02/HB-TTRPG-tools`) and is maintained under the authority of **mrcalzon02**. It was developed with human creative direction and AI-assisted drafting, analysis, coding, review, testing, and repository integration using **OpenAI ChatGPT** and **GitHub** tooling, alongside any skill-specific runtimes or libraries declared above.

This skill is distributed under the project's custom **Terms of Service & Usage Agreement**, Section 3, **“Permitted Use (the Anti-License)”** (last updated **July 10, 2026**): personal/private/non-commercial use and private adaptation are permitted; commercial use, sale, redistribution for profit, or commercial incorporation of the Platform's source code or proprietary lore assets is prohibited. Attribution is appreciated but not mandated. Third-party systems, lore, trademarks, APIs, libraries, standards, and other external material remain subject to their respective owners' rights.

Keep this notice with copies of `SKILL.md`. See `PROVENANCE.md` in this skill directory and the repository root `TERMS-OF-SERVICE.md` for the complete provenance and governing terms.
