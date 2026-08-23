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
