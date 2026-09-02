---
name: random-table-and-oracle-resolution
description: Resolve random tables, encounter tables, loot tables, yes/no oracles, weighted entries, and procedural prompts using the dice/randomness skill.
compatibility: Requires a host that can load Agent Skills. File-backed operations additionally require a writable sandbox/filesystem; randomness additionally requires a cryptographic RNG source.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  personality-engram: blacklight.charles
---

# Random Table and Oracle Resolution

Use this skill when a table, oracle, procedural prompt, encounter table, loot table, rumor table, reaction table, weather table, or weighted list should be resolved randomly.

Identify the table's resolution method before rolling. For numeric ranges, roll the documented die expression. For equal lists without a specified die, use unbiased selection over the number of entries. For weighted entries, use cumulative integer weights and an unbiased integer draw.

Route randomness through `tabletop-dice-rolling`; do not use ad hoc pseudo-random selection. Preserve the rolled value and the exact table version/source so the result can be audited.

Do not “improve” an inconvenient random result after seeing it. If the user wants curated randomness, rerolls, advantage, table filtering, or weighted narrative bias, make that rule explicit before the next draw.

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance, Authorship & Usage Notice

This Agent Skill originates in **Calzon's TTRPG Foundry** (`mrcalzon02/HB-TTRPG-tools`) and is maintained under the authority of **mrcalzon02**. It was developed with human creative direction and AI-assisted drafting, analysis, coding, review, testing, and repository integration using **OpenAI ChatGPT** and **GitHub** tooling, alongside any skill-specific runtimes or libraries declared above.

This skill is distributed under the project's custom **Terms of Service & Usage Agreement**, Section 3, **“Permitted Use (the Anti-License)”** (last updated **July 10, 2026**): personal/private/non-commercial use and private adaptation are permitted; commercial use, sale, redistribution for profit, or commercial incorporation of the Platform's source code or proprietary lore assets is prohibited. Attribution is appreciated but not mandated. Third-party systems, lore, trademarks, APIs, libraries, standards, and other external material remain subject to their respective owners' rights.

Keep this notice with copies of `SKILL.md`. See `PROVENANCE.md` in this skill directory and the repository root `TERMS-OF-SERVICE.md` for the complete provenance and governing terms.
