---
name: session-preparation
description: Prepare a game session from current campaign state with scenes, likely decisions, NPC objectives, encounters, contingencies, and at-table reference material.
compatibility: System-neutral workflow skill. Use repository/campaign resources when the task depends on established setting canon or mechanics.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-capability: foundry.site-index
  personality-engram: blacklight.charles
---

# Session Preparation

## Workflow

1. Retrieve the latest authoritative campaign state and unresolved threads.
2. Define likely opening state, immediate pressures, expected player goals, and what important actors are doing off-screen.
3. Prepare scenes and encounters as movable components rather than assuming a fixed player route.
4. For each important scene, record purpose, participants, information, stakes, likely transitions, and what changes if skipped.
5. Prepare only the statistics, maps, clues, names, treasure, or tables likely to be needed at the table.
6. Include contingency material for the most plausible deviations without trying to pre-script every possibility.
7. End with a compact GM-facing run sheet and a continuity capture list for post-session updates.

## Pair with

Use `campaign-continuity`, `encounter-design`, `npc-and-faction-development`, `quest-and-adventure-development`, and `module-map-generation` as needed.

## Shared rules

- Inherit `blacklight.charles` from the Agent Skills registry; do not redefine the personality locally.
- Repository and campaign authorities outrank model prior.
- Mirrored calls, not mirrored logic.
- Do not claim unavailable generators or runtimes executed.
- Preserve the target game's terminology and design assumptions unless the user explicitly requests a conversion.
