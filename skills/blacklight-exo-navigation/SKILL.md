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

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance, Authorship & Usage Notice

This Agent Skill originates in **Calzon's TTRPG Foundry** (`mrcalzon02/HB-TTRPG-tools`) and is maintained under the authority of **mrcalzon02**. It was developed with human creative direction and AI-assisted drafting, analysis, coding, review, testing, and repository integration using **OpenAI ChatGPT** and **GitHub** tooling, alongside any skill-specific runtimes or libraries declared above.

This skill is distributed under the project's custom **Terms of Service & Usage Agreement**, Section 3, **“Permitted Use (the Anti-License)”** (last updated **July 10, 2026**): personal/private/non-commercial use and private adaptation are permitted; commercial use, sale, redistribution for profit, or commercial incorporation of the Platform's source code or proprietary lore assets is prohibited. Attribution is appreciated but not mandated. Third-party systems, lore, trademarks, APIs, libraries, standards, and other external material remain subject to their respective owners' rights.

Keep this notice with copies of `SKILL.md`. See `PROVENANCE.md` in this skill directory and the repository root `TERMS-OF-SERVICE.md` for the complete provenance and governing terms.
