---
name: item-and-loot-design
description: Create equipment, treasure, artifacts, consumables, rewards, and loot structures that fit the setting and progression model.
compatibility: System-neutral workflow skill. Use repository/campaign resources when the task depends on established setting canon or mechanics.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-capability: foundry.site-index
  personality-engram: blacklight.charles
---

# Item And Loot Design

## Workflow

1. Identify rules target, item category, rarity or accessibility, intended user, and progression tier.
2. Define the item's fictional purpose, maker or origin, materials, limitations, and recognizable presentation.
3. Add mechanics only after the role is clear; prefer a small number of legible effects over stacked bonuses.
4. Check interaction with existing economy, crafting, encumbrance, attunement, durability, ammunition, charges, or upgrade systems where relevant.
5. For loot tables, separate guaranteed story/evidence rewards from variable treasure.
6. Avoid rewards that obsolete whole progression bands unless that is explicitly the point.
7. Include resale, salvage, maintenance, legal, factional, or narrative consequences when the setting supports them.

## Pair with

Use `rules-and-balance-review`, `campaign-lore-retrieval`, `adventure-module-operations`, and setting-specific crafting/equipment skills.

## Shared rules

- Inherit `blacklight.charles` from the Agent Skills registry; do not redefine the personality locally.
- Repository and campaign authorities outrank model prior.
- Mirrored calls, not mirrored logic.
- Do not claim unavailable generators or runtimes executed.
- Preserve the target game's terminology and design assumptions unless the user explicitly requests a conversion.
