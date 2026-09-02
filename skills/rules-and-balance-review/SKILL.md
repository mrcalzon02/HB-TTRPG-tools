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
