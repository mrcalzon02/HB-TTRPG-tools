---
name: kaysender-crafting-and-modules
description: Use Kaysender crafting, equipment, gadget, ship-module, ship-weapon, airship-core, materials, facilities, quality, legality, flaw, improvement, and construction data. Activate when a user wants to design or inspect Kaysender equipment or ship systems using the repository's canonical crafting workflow.
compatibility: The authoritative crafting generator is currently browser-workflow based; its manifests, templates, modifiers, and schemas are remotely retrievable.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-module: crafting-gadget-equipment
---

# Kaysender Crafting and Ship Modules

Use the canonical Kaysender crafting generator and its data manifests rather than inventing an independent recipe/balance system.

## Authoritative data

- `data/kaysender/generators/crafting/crafting-generator.json`
- `data/kaysender/generators/crafting/equipment-templates.json`
- `data/kaysender/generators/crafting/ship-module-templates.json`
- `data/kaysender/generators/crafting/crafting-modifiers.json`
- `data/kaysender/schemas/crafting-project.schema.json`

## Workflow

1. Identify whether the request is personal equipment, technical/survival gear, weapon/armor work, ship module, ship weapon/defense, or airship core.
2. Retrieve the canonical manifest/templates/modifiers needed for the project.
3. Use the browser generator when an actual randomized/simulated construction workflow is requested and the runtime is available.
4. Preserve complexity, project DC, work units, staffing/labor assumptions, materials, facility/quality modifiers, cost/value drafts, skills, operating effects, activation, limitations, power, maintenance, legality, complications, improvements, flaws, and test results when produced.
5. Treat generated balance values as campaign/playtest material unless the repository explicitly marks them publication-final.

## Hard rules

- Do not duplicate the construction simulator in skill prose.
- Do not invent module effects outside the authoritative template/modifier system when a repository pattern exists.
- Preserve schema-compatible project data when returning machine-facing results.
- Do not promote the workflow to headless callable status until its canonical logic is extracted and registered.

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance, Authorship & Usage Notice

This Agent Skill originates in **Calzon's TTRPG Foundry** (`mrcalzon02/HB-TTRPG-tools`) and is maintained under the authority of **mrcalzon02**. It was developed with human creative direction and AI-assisted drafting, analysis, coding, review, testing, and repository integration using **OpenAI ChatGPT** and **GitHub** tooling, alongside any skill-specific runtimes or libraries declared above.

This skill is distributed under the project's custom **Terms of Service & Usage Agreement**, Section 3, **“Permitted Use (the Anti-License)”** (last updated **July 10, 2026**): personal/private/non-commercial use and private adaptation are permitted; commercial use, sale, redistribution for profit, or commercial incorporation of the Platform's source code or proprietary lore assets is prohibited. Attribution is appreciated but not mandated. Third-party systems, lore, trademarks, APIs, libraries, standards, and other external material remain subject to their respective owners' rights.

Keep this notice with copies of `SKILL.md`. See `PROVENANCE.md` in this skill directory and the repository root `TERMS-OF-SERVICE.md` for the complete provenance and governing terms.
