---
name: campaign-continuity
description: Maintain campaign canon, timelines, unresolved threads, state changes, callbacks, and consequences across sessions or archived materials.
compatibility: System-neutral workflow skill. Use repository/campaign resources when the task depends on established setting canon or mechanics.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-capability: foundry.site-index
  personality-engram: blacklight.charles
---

# Campaign Continuity

## Workflow

1. Retrieve authoritative campaign records before filling gaps from memory or model prior.
2. Separate established canon, current state, unresolved questions, rumors, and proposed additions.
3. Reconcile dates, locations, NPC status, faction state, inventory or asset changes, promises, debts, injuries, discoveries, and open objectives.
4. Flag genuine contradictions instead of silently choosing one version.
5. Preserve consequences from player action and propagate them to affected factions, locations, resources, and future hooks.
6. Produce a concise continuity record suitable for the next session or future retrieval.
7. Never retroactively rewrite established events unless the user explicitly chooses a retcon.

## Pair with

Use `campaign-lore-retrieval`, `session-preparation`, and whichever setting-specific skills own the affected material.

## Shared rules

- Inherit `blacklight.charles` from the Agent Skills registry; do not redefine the personality locally.
- Repository and campaign authorities outrank model prior.
- Mirrored calls, not mirrored logic.
- Do not claim unavailable generators or runtimes executed.
- Preserve the target game's terminology and design assumptions unless the user explicitly requests a conversion.
