---
name: campaign-lore-retrieval
description: Search and retrieve authoritative campaign lore, rules references, factions, wiki entries, modules, archives, and setting data across Kaysender, Blacklight Continuum, Warhammer 40K, Barotrauma, Shadowrun, World of Darkness, Solanum Umbra, and Foundry module resources. Use when a user asks what the campaign canon says or needs setting-grounded information.
compatibility: Requires network access to the HB-TTRPG-tools GitHub Pages resources or repository files.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-resource: foundry.campaign-lore-index
---

# Campaign and Lore Retrieval

Use the Foundry resource/index APIs rather than relying on memory when the repository contains the answer.

## Workflow

1. Identify the relevant setting/workspace.
2. Prefer a setting-specific index when available: `kaysender.wiki-index`, `blacklight.complete-lore-index`, `warhammer.lore-index`, or `barotrauma.encounter-index`. Use `foundry.campaign-lore-index` for cross-setting discovery.
3. Inspect the resource descriptor's `supports` list before choosing `getResource`, `expandResourceIndex`, `searchCollection`, or `searchResources`.
4. Search narrowly first, then expand to broader collections when necessary.
5. Retrieve the matching authoritative resource and ground the answer in its actual content.
6. Preserve provenance: identify the resource ID/path used, especially when combining multiple settings or source layers.

## Canon boundaries

- Keep different settings separate unless the user explicitly requests a crossover or comparison.
- Distinguish original setting lore from converted rules/mechanics when the repository does so.
- Do not treat generated content as established lore unless the relevant source marks it canonical.
- If indexed sources conflict, prefer the more authoritative/current layer and describe the discrepancy.

## Hard rules

- Do not fabricate lore to fill a failed search.
- Do not scrape rendered pages when an authoritative JSON resource exists.
- Do not collapse source provenance when merging results.
- Use the self-described resource operation contracts rather than guessing how an index is structured.
