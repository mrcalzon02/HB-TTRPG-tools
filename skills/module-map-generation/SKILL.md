---
name: module-map-generation
description: Generate semantic purpose-aware TTRPG locations, buildings, dungeons, laboratories, fortresses, sewers, tombs, civic sites, and encounter spaces using the Foundry shared spatial engine. Use when a user needs a deterministic module map or structured adventure location.
compatibility: Requires access to HBFoundryAPI or the canonical ordered browser JavaScript runtime on HB-TTRPG-tools.
metadata:
  author: mrcalzon02
  version: "1.1.0"
  foundry-capability: spatial.module-map.generate
---

# Module Map Generation

Use the canonical capability `spatial.module-map.generate`.

The portable companion package is `skills/module-map-generation/manifest.json`. Its runtime list is not an alternate implementation: it names the exact canonical scripts and their required load order. The deterministic non-destructive proof definition is `skills/module-map-generation/self-test.json`.

## Workflow

1. Retrieve the current contract for `spatial.module-map.generate` from `api/operation-contracts.json` or `HBFoundryAPI.operationContract()`.
2. Translate the user's intent into the documented semantic inputs: location archetype, site profile/context, adventure purpose, danger level, faction/controller, rules target, damage/condition context, and deterministic seed as applicable.
3. Prefer built-in archetypes when they fit. Use explicit roles/adjacency only when the user needs a custom semantic program. Unless the user explicitly requests semantic mutation of custom roles, preserve the canonical context-only custom-role policy.
4. Before direct portable execution, inspect `skills/module-map-generation/manifest.json` and verify that the host can load the exact same-origin runtime scripts in their declared order:
   - `semantic-spatial-engine.js`
   - `semantic-content-populator.js`
   - `module-map-generator.js`
5. In a compatible host, run the declared deterministic self-test before promoting the capability to `self-test-passed` or `ready`. In an incompatible host, report the runtime limitation rather than recreating the generator.
6. Invoke the authoritative generator through `HBFoundryAPI.invoke('spatial.module-map.generate', input)` or the documented canonical runtime `generator.module_map.generate(input)`.
7. Preserve `spatialLayout`, populated content, compatibility, semantic program, site profile, validation, and provenance in machine-facing outputs. Summarize them for humans rather than discarding them.
8. If the user requests a repeatable result, preserve and report the seed.

## Execution boundary

Repository presence, successful skill loading, or knowledge of the operation contract does not establish runtime readiness. Browser-JavaScript execution begins at `runtime-required`; only observed compatible runtime loading and the declared self-test can promote the current host toward `ready`.

Do not translate the canonical JavaScript implementation into Python or independently recreate its topology, profile-layer, content-population, or randomization logic merely because another language runtime is available.

## Output expectations

A normal result contains an editor-compatible cell map plus the complete multi-room semantic spatial layout, resolved site profile, layered semantic program, populated adventure content, compatibility metadata, validation, and provenance. Treat validation/provenance fields as part of the result, not decoration.

## Hard rules

- Do not redraw or independently generate topology in the skill.
- Do not substitute random room lists for the shared spatial engine.
- Do not silently change the seed when reproducing a result.
- Use the operation contract for current accepted inputs; do not guess undocumented fields.
- Preserve the capability registry's exact runtime script set and dependency order.
- Do not claim the portable package passed its self-test unless that test actually executed successfully in the current host.

## Discovery links

- Portable companion manifest: `https://mrcalzon02.github.io/HB-TTRPG-tools/skills/module-map-generation/manifest.json`
- Deterministic self-test: `https://mrcalzon02.github.io/HB-TTRPG-tools/skills/module-map-generation/self-test.json`
- Capability manifest: `https://mrcalzon02.github.io/HB-TTRPG-tools/api/foundry-capabilities.json`
- Operation contracts: `https://mrcalzon02.github.io/HB-TTRPG-tools/api/operation-contracts.json`
- Browser proof harness: `https://mrcalzon02.github.io/HB-TTRPG-tools/ai-skill-test.html`

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance, Authorship & Usage Notice

This Agent Skill originates in **Calzon's TTRPG Foundry** (`mrcalzon02/HB-TTRPG-tools`) and is maintained under the authority of **mrcalzon02**. It was developed with human creative direction and AI-assisted drafting, analysis, coding, review, testing, and repository integration using **OpenAI ChatGPT** and **GitHub** tooling, alongside any skill-specific runtimes or libraries declared above.

This skill is distributed under the project's custom **Terms of Service & Usage Agreement**, Section 3, **“Permitted Use (the Anti-License)”** (last updated **July 10, 2026**): personal/private/non-commercial use and private adaptation are permitted; commercial use, sale, redistribution for profit, or commercial incorporation of the Platform's source code or proprietary lore assets is prohibited. Attribution is appreciated but not mandated. Third-party systems, lore, trademarks, APIs, libraries, standards, and other external material remain subject to their respective owners' rights.

Keep this notice with copies of `SKILL.md`. See `PROVENANCE.md` in this skill directory and the repository root `TERMS-OF-SERVICE.md` for the complete provenance and governing terms.
