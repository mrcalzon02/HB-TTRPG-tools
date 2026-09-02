---
name: party-and-npc-roster-management
description: Maintain player-character, companion, hireling, NPC, faction-agent, and creature rosters with stable IDs and current status.
compatibility: Requires a host that can load Agent Skills. File-backed operations additionally require a writable sandbox/filesystem; randomness additionally requires a cryptographic RNG source.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  personality-engram: blacklight.charles
---

# Party and NPC Roster Management

Use this skill to maintain who exists, who belongs to which group, and their current operational status.

Maintain stable entity IDs across PCs, NPCs, companions, hirelings, summons, creatures, faction agents, and recurring antagonists. Use `roster.csv` for membership and operational status; use `characters.csv` and `character_stats.csv` for identity and mechanics.

Track group/faction, role, status, current location, and short notes without duplicating an entire character sheet into the roster. A dead, missing, captured, retired, hostile, allied, or absent character remains a record unless the user explicitly removes it from campaign history.

Use roster data to feed session preparation, encounter setup, campaign continuity, and initiative management.

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance, Authorship & Usage Notice

This Agent Skill originates in **Calzon's TTRPG Foundry** (`mrcalzon02/HB-TTRPG-tools`) and is maintained under the authority of **mrcalzon02**. It was developed with human creative direction and AI-assisted drafting, analysis, coding, review, testing, and repository integration using **OpenAI ChatGPT** and **GitHub** tooling, alongside any skill-specific runtimes or libraries declared above.

This skill is distributed under the project's custom **Terms of Service & Usage Agreement**, Section 3, **“Permitted Use (the Anti-License)”** (last updated **July 10, 2026**): personal/private/non-commercial use and private adaptation are permitted; commercial use, sale, redistribution for profit, or commercial incorporation of the Platform's source code or proprietary lore assets is prohibited. Attribution is appreciated but not mandated. Third-party systems, lore, trademarks, APIs, libraries, standards, and other external material remain subject to their respective owners' rights.

Keep this notice with copies of `SKILL.md`. See `PROVENANCE.md` in this skill directory and the repository root `TERMS-OF-SERVICE.md` for the complete provenance and governing terms.
