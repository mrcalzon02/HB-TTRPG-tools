---
name: character-stat-tracking
description: Track current and maximum character statistics, resources, conditions, derived values, and changes in the shared tabletop CSV state.
compatibility: Requires a host that can load Agent Skills. File-backed operations additionally require a writable sandbox/filesystem; randomness additionally requires a cryptographic RNG source.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  personality-engram: blacklight.charles
---

# Character Stat Tracking

Use this skill for mutable character state across any tabletop system.

Track values in `character_stats.csv` by stable `character_id`, `scope`, and `key`. Examples include HP, wounds, stress, Humanity, Edge, spell slots, armor, ammunition, XP, reputation, fatigue, conditions, clocks, custom homebrew meters, and temporary bonuses.

## Rules

Read current state before changing it. Preserve current and maximum values separately when the system uses both. Record units or semantic types when useful. Do not invent a maximum, modifier, derived stat, or recovery rule that is not present in the sheet, campaign state, or authoritative rules.

For campaign-significant changes, append the old and new values to `campaign_ledger.csv`. If a user says “take 7 damage,” calculate the new tracked value from observed state, apply the system's known damage rule if available, and show the resulting state. If the rule is unknown, record the raw requested change rather than hallucinating system mechanics.

Use `tabletop-sandbox-data-management` for file operations.

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance, Authorship & Usage Notice

This Agent Skill originates in **Calzon's TTRPG Foundry** (`mrcalzon02/HB-TTRPG-tools`) and is maintained under the authority of **mrcalzon02**. It was developed with human creative direction and AI-assisted drafting, analysis, coding, review, testing, and repository integration using **OpenAI ChatGPT** and **GitHub** tooling, alongside any skill-specific runtimes or libraries declared above.

This skill is distributed under the project's custom **Terms of Service & Usage Agreement**, Section 3, **“Permitted Use (the Anti-License)”** (last updated **July 10, 2026**): personal/private/non-commercial use and private adaptation are permitted; commercial use, sale, redistribution for profit, or commercial incorporation of the Platform's source code or proprietary lore assets is prohibited. Attribution is appreciated but not mandated. Third-party systems, lore, trademarks, APIs, libraries, standards, and other external material remain subject to their respective owners' rights.

Keep this notice with copies of `SKILL.md`. See `PROVENANCE.md` in this skill directory and the repository root `TERMS-OF-SERVICE.md` for the complete provenance and governing terms.
