---
name: module-map-generation
description: Generate semantic purpose-aware TTRPG locations, buildings, dungeons, laboratories, fortresses, sewers, tombs, civic sites, and encounter spaces using the Foundry shared spatial engine. Use when a user needs a deterministic module map or structured adventure location.
compatibility: Requires access to HBFoundryAPI or the canonical browser JavaScript runtime on HB-TTRPG-tools.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-capability: spatial.module-map.generate
---

# Module Map Generation

Use the canonical capability `spatial.module-map.generate`.

## Workflow

1. Retrieve the current contract for `spatial.module-map.generate` from `api/operation-contracts.json` or `HBFoundryAPI.operationContract()`.
2. Translate the user's intent into semantic inputs such as location archetype, adventure purpose, danger level, faction, rules target, damage state, and deterministic seed.
3. Prefer built-in archetypes when they fit. Use explicit roles/adjacency only when the user needs a custom semantic program.
4. Invoke the authoritative generator through `HBFoundryAPI.invoke('spatial.module-map.generate', input)` or the documented canonical runtime.
5. Preserve `spatialLayout`, populated content, compatibility, semantic program, and provenance in machine-facing outputs. Summarize them for humans rather than discarding them.
6. If the user requests a repeatable result, preserve and report the seed.

## Output expectations

A normal result contains an editor-compatible cell map plus the complete multi-room semantic spatial layout and populated adventure content. Treat validation/provenance fields as part of the result, not decoration.

## Hard rules

- Do not redraw or independently generate topology in the skill.
- Do not substitute random room lists for the shared spatial engine.
- Do not silently change the seed when reproducing a result.
- Use the operation contract for current accepted inputs; do not guess undocumented fields.

## Discovery links

- Capability manifest: `https://mrcalzon02.github.io/HB-TTRPG-tools/api/foundry-capabilities.json`
- Operation contracts: `https://mrcalzon02.github.io/HB-TTRPG-tools/api/operation-contracts.json`

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance, Authorship & Usage Notice

This Agent Skill originates in **Calzon's TTRPG Foundry** (`mrcalzon02/HB-TTRPG-tools`) and is maintained under the authority of **mrcalzon02**. It was developed with human creative direction and AI-assisted drafting, analysis, coding, review, testing, and repository integration using **OpenAI ChatGPT** and **GitHub** tooling, alongside any skill-specific runtimes or libraries declared above.

This skill is distributed under the project's custom **Terms of Service & Usage Agreement**, Section 3, **“Permitted Use (the Anti-License)”** (last updated **July 10, 2026**): personal/private/non-commercial use and private adaptation are permitted; commercial use, sale, redistribution for profit, or commercial incorporation of the Platform's source code or proprietary lore assets is prohibited. Attribution is appreciated but not mandated. Third-party systems, lore, trademarks, APIs, libraries, standards, and other external material remain subject to their respective owners' rights.

Keep this notice with copies of `SKILL.md`. See `PROVENANCE.md` in this skill directory and the repository root `TERMS-OF-SERVICE.md` for the complete provenance and governing terms.
