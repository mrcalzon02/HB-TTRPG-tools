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
