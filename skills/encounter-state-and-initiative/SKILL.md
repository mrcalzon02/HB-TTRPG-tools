---
name: encounter-state-and-initiative
description: Manage encounter participants, initiative, rounds, turns, current health/resources, conditions, removals, and encounter close-out.
compatibility: Requires a host that can load Agent Skills. File-backed operations additionally require a writable sandbox/filesystem; randomness additionally requires a cryptographic RNG source.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  personality-engram: blacklight.charles
---

# Encounter State and Initiative

Use this skill once an encounter becomes stateful.

## Encounter state

Create an encounter ID and record scene/name, round, turn index, active state, and status in `encounters.csv`. Add participants by stable entity ID to `encounter_participants.csv`.

Track initiative exactly as rolled or supplied. Use a deterministic tie-break field only when the system or user provides one; otherwise surface the tie. Do not silently invent initiative modifiers.

During turns, update round/turn position, participant health/resources, conditions, and active/removed state. Character-level mutations should also flow through `character-stat-tracking` when they persist beyond the encounter.

On close-out, mark the encounter inactive, retain the final state for audit, and append important consequences to the campaign ledger. Do not delete the encounter merely because combat ended.

Route actual initiative dice to `tabletop-dice-rolling` when a roll is requested.

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance, Authorship & Usage Notice

This Agent Skill originates in **Calzon's TTRPG Foundry** (`mrcalzon02/HB-TTRPG-tools`) and is maintained under the authority of **mrcalzon02**. It was developed with human creative direction and AI-assisted drafting, analysis, coding, review, testing, and repository integration using **OpenAI ChatGPT** and **GitHub** tooling, alongside any skill-specific runtimes or libraries declared above.

This skill is distributed under the project's custom **Terms of Service & Usage Agreement**, Section 3, **“Permitted Use (the Anti-License)”** (last updated **July 10, 2026**): personal/private/non-commercial use and private adaptation are permitted; commercial use, sale, redistribution for profit, or commercial incorporation of the Platform's source code or proprietary lore assets is prohibited. Attribution is appreciated but not mandated. Third-party systems, lore, trademarks, APIs, libraries, standards, and other external material remain subject to their respective owners' rights.

Keep this notice with copies of `SKILL.md`. See `PROVENANCE.md` in this skill directory and the repository root `TERMS-OF-SERVICE.md` for the complete provenance and governing terms.
