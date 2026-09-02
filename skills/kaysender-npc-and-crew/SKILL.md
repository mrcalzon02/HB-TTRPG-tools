---
name: kaysender-npc-and-crew
description: Use the Kaysender NPC and Crew Generator, population bands, ancestry/name data, class pools, occupations, crew roles, faction ties, dispositions, and open-d20 stat stubs. Activate when a user needs Kaysender NPCs, civilians, officials, specialists, pirates, or airship crew members.
compatibility: The authoritative generator is currently browser-UI/state-bound; its JSON manifests and population packs are remotely retrievable for inspection and guidance.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-module: npc-crew-generator
---

# Kaysender NPC and Crew

Use the canonical `kaysender-npc-generator.js` workflow and `data/kaysender/generators/npc-crew-generator.json` data family.

## Workflow

1. Determine the requested population band, class pool, power tier, age band, ancestry, count, and any crew/faction constraints.
2. Retrieve the NPC/Crew manifest and its population-band packs when the user needs option discovery or rules explanation.
3. When the Kaysender browser runtime is available, use the canonical NPC/Crew Generator for actual randomized generation.
4. If the browser runtime is unavailable, do not claim a canonical random draw occurred. Explain or filter authoritative options instead.
5. Preserve population band, ancestry/age, occupation, class/level, crew role, faction tie, readiness, and rules-status information in generated outputs.

## Hard rules

- Do not copy the weighted-choice/randomization algorithm into this skill.
- Do not present conversion-pending custom class statistics as finalized rules.
- Keep source-derived Kaysender population data authoritative.
- Promote this skill to callable status only after the existing generator logic is extracted into a canonical headless core.

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance, Authorship & Usage Notice

This Agent Skill originates in **Calzon's TTRPG Foundry** (`mrcalzon02/HB-TTRPG-tools`) and is maintained under the authority of **mrcalzon02**. It was developed with human creative direction and AI-assisted drafting, analysis, coding, review, testing, and repository integration using **OpenAI ChatGPT** and **GitHub** tooling, alongside any skill-specific runtimes or libraries declared above.

This skill is distributed under the project's custom **Terms of Service & Usage Agreement**, Section 3, **“Permitted Use (the Anti-License)”** (last updated **July 10, 2026**): personal/private/non-commercial use and private adaptation are permitted; commercial use, sale, redistribution for profit, or commercial incorporation of the Platform's source code or proprietary lore assets is prohibited. Attribution is appreciated but not mandated. Third-party systems, lore, trademarks, APIs, libraries, standards, and other external material remain subject to their respective owners' rights.

Keep this notice with copies of `SKILL.md`. See `PROVENANCE.md` in this skill directory and the repository root `TERMS-OF-SERVICE.md` for the complete provenance and governing terms.
