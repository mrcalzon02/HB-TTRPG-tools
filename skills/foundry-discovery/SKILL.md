---
name: foundry-discovery
description: Discover Calzon's TTRPG Foundry tools, generators, laboratories, campaign resources, operation contracts, and indexed site content. Use when a user asks what the repository can do, wants to find a tool or setting resource, or needs the correct callable capability before executing work.
compatibility: Requires network access to the HB-TTRPG-tools repository or its GitHub Pages site for live discovery.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-capability: foundry.site-index
---

# Foundry Discovery

Use this skill to locate the authoritative Foundry capability or resource before attempting repository-backed work.

## Authoritative discovery surfaces

- Capability manifest: `https://mrcalzon02.github.io/HB-TTRPG-tools/api/foundry-capabilities.json`
- Operation contracts: `https://mrcalzon02.github.io/HB-TTRPG-tools/api/operation-contracts.json`
- Resource collections: `https://mrcalzon02.github.io/HB-TTRPG-tools/api/resource-collections.json`
- Skill index: `https://mrcalzon02.github.io/HB-TTRPG-tools/skills/index.json`
- Search index: `https://mrcalzon02.github.io/HB-TTRPG-tools/search-index.json`

## Workflow

1. Determine whether the request needs a generator/calculator/laboratory, a static campaign or lore resource, or a UI/live-device workflow.
2. Inspect the capability manifest or skill index for the closest stable ID.
3. If the capability is executable, retrieve its operation contract before constructing arguments.
4. If the request is informational, use the registered resource collection and its supported retrieval/search operation.
5. Respect the capability status. Do not describe `browser-ui`, `browser-page-context`, or `live-sensor` capabilities as portable headless APIs.
6. Return the stable capability/resource/skill ID and provenance when useful.

## Hard rules

- Mirrored calls, not mirrored logic.
- Never invent a repository capability because a similarly named HTML page exists.
- Prefer stable IDs over guessed file paths.
- Do not inspect implementation source merely to guess public arguments when `operation-contracts.json` already documents them.
- When a requested capability is not yet headless, identify the canonical UI/page and the dependency rather than fabricating a replacement engine.

## Useful facade calls

When `HBFoundryAPI` is available, prefer `catalog()`, `listCapabilities()`, `describe()`, `listResources()`, `siteIndex()`, and `operationContract()` for discovery.

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance, Authorship & Usage Notice

This Agent Skill originates in **Calzon's TTRPG Foundry** (`mrcalzon02/HB-TTRPG-tools`) and is maintained under the authority of **mrcalzon02**. It was developed with human creative direction and AI-assisted drafting, analysis, coding, review, testing, and repository integration using **OpenAI ChatGPT** and **GitHub** tooling, alongside any skill-specific runtimes or libraries declared above.

This skill is distributed under the project's custom **Terms of Service & Usage Agreement**, Section 3, **“Permitted Use (the Anti-License)”** (last updated **July 10, 2026**): personal/private/non-commercial use and private adaptation are permitted; commercial use, sale, redistribution for profit, or commercial incorporation of the Platform's source code or proprietary lore assets is prohibited. Attribution is appreciated but not mandated. Third-party systems, lore, trademarks, APIs, libraries, standards, and other external material remain subject to their respective owners' rights.

Keep this notice with copies of `SKILL.md`. See `PROVENANCE.md` in this skill directory and the repository root `TERMS-OF-SERVICE.md` for the complete provenance and governing terms.
