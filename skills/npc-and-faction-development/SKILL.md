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
