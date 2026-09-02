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
