---
name: rules-and-balance-review
description: Review homebrew mechanics for clarity, internal consistency, probability, abuse cases, progression impact, and compatibility with the target ruleset.
compatibility: System-neutral workflow skill. Use repository/campaign resources when the task depends on established setting canon or mechanics.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-capability: foundry.site-index
  personality-engram: blacklight.charles
---

# Rules And Balance Review

## Workflow

1. Identify the exact rules target and the design goal before judging power.
2. Restate the proposed mechanic in operational terms: trigger, cost, action, target, resolution, effect, duration, limits, and recovery.
3. Compare it to nearby baseline mechanics in the same system and progression tier.
4. Check probability, action economy, stacking, loops, resource conversion, scaling, edge cases, and adversarial player interpretation.
5. Distinguish balance problems from wording problems and from intentional campaign-level power shifts.
6. Prefer direct fixes to exceptions layered on exceptions.
7. Return a recommended rule text plus the reasoning and any tests or examples needed to validate it.

## Pair with

Use setting/rules resources through `campaign-lore-retrieval` and domain skills such as `spell-creation`, `creature-and-monster-design`, or `item-and-loot-design`.

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
