---
name: blacklight-exo-navigation
description: Use the Blacklight Continuum EXO Cluster navigation and jump-calculation capability for route and FTL jump questions. Activate when a user asks for EXO travel, jump calculations, route evaluation, or cluster navigation using the canonical Blacklight cartography context.
compatibility: Requires the Blacklight EXO cartography page context with its cluster-spatial and FTL runtimes initialized; this is not currently a portable headless JavaScript capability.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-capability: blacklight.exo.jump.calculate
---

# Blacklight EXO Navigation

Use `blacklight.exo.jump.calculate` only in its documented EXO cartography page context.

## Workflow

1. Retrieve the current operation contract for `blacklight.exo.jump.calculate`.
2. Resolve the requested start/end systems using the authoritative EXO cartography/cluster state. Do not invent seed IDs from display names.
3. Confirm that the canonical page runtime is initialized before invocation.
4. Invoke the documented jump calculator with start seed, end seed, and any documented family/path-level options.
5. Return the canonical calculation and preserve system/route identifiers needed to reproduce it.
6. If the page context is unavailable, explain that the capability is discoverable but not currently headless; do not reproduce its cluster model in skill prose.

## Lore support

Use `blacklight.complete-lore-index` when navigation depends on setting, faction, historical, or campaign context. Keep lore retrieval distinct from numeric jump calculation.

## Hard rules

- Do not fabricate a second EXO cluster topology.
- Do not silently convert page-context status into a server/API claim.
- Use stable seeds/IDs where the canonical runtime expects them.
- Use the operation contract for current inputs.
