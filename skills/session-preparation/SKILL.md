---
name: session-preparation
description: Prepare a game session from current campaign state with scenes, likely decisions, NPC objectives, encounters, contingencies, and at-table reference material.
compatibility: System-neutral workflow skill. Use repository/campaign resources when the task depends on established setting canon or mechanics.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-capability: foundry.site-index
  personality-engram: blacklight.charles
---

# Session Preparation

## Workflow

1. Retrieve the latest authoritative campaign state and unresolved threads.
2. Define likely opening state, immediate pressures, expected player goals, and what important actors are doing off-screen.
3. Prepare scenes and encounters as movable components rather than assuming a fixed player route.
4. For each important scene, record purpose, participants, information, stakes, likely transitions, and what changes if skipped.
5. Prepare only the statistics, maps, clues, names, treasure, or tables likely to be needed at the table.
6. Include contingency material for the most plausible deviations without trying to pre-script every possibility.
7. End with a compact GM-facing run sheet and a continuity capture list for post-session updates.

## Pair with

Use `campaign-continuity`, `encounter-design`, `npc-and-faction-development`, `quest-and-adventure-development`, and `module-map-generation` as needed.

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
