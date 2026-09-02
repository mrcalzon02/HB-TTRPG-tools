---
name: npc-and-faction-development
description: Develop system-neutral NPCs and factions while preserving setting canon, internal motives, relationships, and usable table hooks.
compatibility: System-neutral workflow skill. Use repository/campaign resources when the task depends on established setting canon or mechanics.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-capability: foundry.site-index
  personality-engram: blacklight.charles
---

# Npc And Faction Development

## Workflow

1. Establish setting, rules target, social scale, and the NPC or faction's purpose in play.
2. Retrieve relevant campaign lore before inventing canon-sensitive details.
3. Define role, goals, resources, constraints, relationships, leverage, fears, and likely responses to player action.
4. Separate public-facing facts, hidden information, rumors, and GM-only truths when useful.
5. For factions, define leadership, membership, assets, territory, doctrine, rivals, allies, internal fractures, and escalation behavior.
6. Produce only the mechanical detail the target game actually needs; do not force a foreign stat format onto the setting.
7. Preserve unresolved hooks and contradictions intentionally when they create useful play rather than accidentally papering them over.

## Pair with

Use `campaign-lore-retrieval` for canon, `quest-and-adventure-development` for hooks, `encounter-design` for immediate opposition, and setting-specific NPC/character skills when available.

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
