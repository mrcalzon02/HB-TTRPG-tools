---
name: settlement-and-location-development
description: Develop settlements and important locations from purpose, population, infrastructure, districts, conflict, and playable spatial logic.
compatibility: System-neutral workflow skill. Use repository/campaign resources when the task depends on established setting canon or mechanics.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-capability: foundry.site-index
  personality-engram: blacklight.charles
---

# Settlement And Location Development

## Workflow

1. Define why the location exists, who sustains it, what it produces or protects, and what larger network it belongs to.
2. Establish scale, population band, environment, access routes, governance, security, economy, utilities, and major constraints.
3. Divide large settlements into districts or functional zones with distinct reasons to visit.
4. Add landmarks, institutions, services, faction presence, hazards, rumors, and active problems.
5. Ensure infrastructure is physically and economically plausible for the setting unless deliberate fantasy or science-fiction rules supersede it.
6. When a map is needed, route spatial generation through `module-map-generation` rather than reproducing its algorithm.
7. Record intact, damaged, occupied, abandoned, or repurposed states when location history matters.

## Pair with

Use `module-map-generation`, `npc-and-faction-development`, `campaign-lore-retrieval`, and `quest-and-adventure-development`.

## Shared rules

- Inherit `blacklight.charles` from the Agent Skills registry; do not redefine the personality locally.
- Repository and campaign authorities outrank model prior.
- Mirrored calls, not mirrored logic.
- Do not claim unavailable generators or runtimes executed.
- Preserve the target game's terminology and design assumptions unless the user explicitly requests a conversion.
