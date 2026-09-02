---
name: inventory-and-resource-tracking
description: Track equipment, consumables, ammunition, currency, charges, encumbrance, shared supplies, and other mutable tabletop resources.
compatibility: Requires a host that can load Agent Skills. File-backed operations additionally require a writable sandbox/filesystem; randomness additionally requires a cryptographic RNG source.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  personality-engram: blacklight.charles
---

# Inventory and Resource Tracking

Use this skill for mutable possessions and pooled resources.

Track owner, stable item ID, display name, quantity, state, unit, location, and notes in `inventory.csv`. This supports personal inventory, party stash, vehicle cargo, ammunition, currency, food, charges, spell components, crafting materials, fuel, medical supplies, and other consumables.

Read before mutation. Do not allow quantity to fall below a system-valid minimum without surfacing the conflict. Preserve meaningful item state such as equipped, stowed, damaged, loaded, attuned, identified, consumed, loaned, or lost.

Record campaign-significant acquisitions, losses, transfers, and expenditures in `campaign_ledger.csv`. Do not collapse distinct named or stateful items into one stack unless the user or system treats them as interchangeable.

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance, Authorship & Usage Notice

This Agent Skill originates in **Calzon's TTRPG Foundry** (`mrcalzon02/HB-TTRPG-tools`) and is maintained under the authority of **mrcalzon02**. It was developed with human creative direction and AI-assisted drafting, analysis, coding, review, testing, and repository integration using **OpenAI ChatGPT** and **GitHub** tooling, alongside any skill-specific runtimes or libraries declared above.

This skill is distributed under the project's custom **Terms of Service & Usage Agreement**, Section 3, **“Permitted Use (the Anti-License)”** (last updated **July 10, 2026**): personal/private/non-commercial use and private adaptation are permitted; commercial use, sale, redistribution for profit, or commercial incorporation of the Platform's source code or proprietary lore assets is prohibited. Attribution is appreciated but not mandated. Third-party systems, lore, trademarks, APIs, libraries, standards, and other external material remain subject to their respective owners' rights.

Keep this notice with copies of `SKILL.md`. See `PROVENANCE.md` in this skill directory and the repository root `TERMS-OF-SERVICE.md` for the complete provenance and governing terms.
