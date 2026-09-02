---
name: adventure-module-operations
description: Discover, inspect, and use Foundry adventure modules, room/encounter content, treasure, campaign hooks, and module workspace information. Activate when a user asks how a module is structured, wants module content retrieved, or needs repository-backed adventure/module operations.
compatibility: Module data and pages are remotely retrievable; individual generation/editing actions may remain browser/UI-bound depending on the selected module tool.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-resource: modules.workspace
---

# Adventure Module Operations

Use `modules.workspace`, the Foundry search index, and any module-specific registered resources/capabilities before relying on generic TTRPG assumptions.

## Workflow

1. Identify the requested module, room, encounter, treasure, hook, or operational task.
2. Use `foundry.site-index` and `modules.workspace` to locate the authoritative module surface and any associated generator/editor.
3. If a stable capability exists, retrieve its operation contract and invoke it rather than simulating the result in prose.
4. If the selected module tool is UI-bound, retrieve the available module data and guide the canonical workflow without pretending a headless call occurred.
5. Preserve module IDs, source paths, encounter/treasure provenance, and compatibility/rules-target information when present.

## Hard rules

- Do not collapse multiple modules into one implied canon.
- Do not invent generator outputs when only static module data were retrieved.
- Prefer module-specific content over generic random tables when available.
- Keep generated encounter/location content distinct from authored module canon.

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance, Authorship & Usage Notice

This Agent Skill originates in **Calzon's TTRPG Foundry** (`mrcalzon02/HB-TTRPG-tools`) and is maintained under the authority of **mrcalzon02**. It was developed with human creative direction and AI-assisted drafting, analysis, coding, review, testing, and repository integration using **OpenAI ChatGPT** and **GitHub** tooling, alongside any skill-specific runtimes or libraries declared above.

This skill is distributed under the project's custom **Terms of Service & Usage Agreement**, Section 3, **“Permitted Use (the Anti-License)”** (last updated **July 10, 2026**): personal/private/non-commercial use and private adaptation are permitted; commercial use, sale, redistribution for profit, or commercial incorporation of the Platform's source code or proprietary lore assets is prohibited. Attribution is appreciated but not mandated. Third-party systems, lore, trademarks, APIs, libraries, standards, and other external material remain subject to their respective owners' rights.

Keep this notice with copies of `SKILL.md`. See `PROVENANCE.md` in this skill directory and the repository root `TERMS-OF-SERVICE.md` for the complete provenance and governing terms.
