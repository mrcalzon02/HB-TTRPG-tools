---
name: encounter-design
description: Design combat, social, exploration, hazard, pursuit, puzzle, or mixed encounters around player choices and meaningful consequences.
compatibility: System-neutral workflow skill. Use repository/campaign resources when the task depends on established setting canon or mechanics.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-capability: foundry.site-index
  personality-engram: blacklight.charles
---

# Encounter Design

## Workflow

1. Define encounter purpose, expected player objectives, environment, opposition, stakes, and failure consequences.
2. Identify the rules target and party capability before assigning difficulty.
3. Build at least two viable approaches when the fiction permits it.
4. Include terrain, information, timing, reinforcements, exits, leverage, and changing conditions as appropriate.
5. Check action economy, damage pressure, control effects, resource drain, and escape routes for mechanical encounters.
6. Distinguish intended challenge from unavoidable punishment; telegraph lethal or irreversible threats.
7. End with concrete triggers for escalation, de-escalation, surrender, retreat, discovery, or transition to the next scene.

## Pair with

Use `module-map-generation` for encounter space, `creature-and-monster-design` for custom opposition, `npc-and-faction-development` for social actors, and `item-and-loot-design` for rewards.

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
