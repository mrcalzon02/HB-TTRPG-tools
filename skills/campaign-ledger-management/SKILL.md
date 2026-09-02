---
name: campaign-ledger-management
description: Keep an append-only campaign change ledger and current-state CSVs so campaign events and stat mutations are reviewable and reversible.
compatibility: Requires a host that can load Agent Skills. File-backed operations additionally require a writable sandbox/filesystem; randomness additionally requires a cryptographic RNG source.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  personality-engram: blacklight.charles
---

# Campaign Ledger Management

Use this skill as the audit trail for mutable campaign state.

`campaign_ledger.csv` is append-only by default. Every significant event should identify a timestamp when available, entity ID, event type, changed key, previous value, new value, source, and notes. Sources may be a user instruction, imported sheet, dice result, session event, rules adjudication, or tool output.

The ledger does not replace current-state tables. Current CSVs answer “what is true now”; the ledger answers “how did it get that way?”

Never retroactively rewrite history to hide a correction. Append a correcting event that references the earlier mistake. This makes campaign state reviewable, reversible, and suitable for continuity work across long-running sessions.

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance, Authorship & Usage Notice

This Agent Skill originates in **Calzon's TTRPG Foundry** (`mrcalzon02/HB-TTRPG-tools`) and is maintained under the authority of **mrcalzon02**. It was developed with human creative direction and AI-assisted drafting, analysis, coding, review, testing, and repository integration using **OpenAI ChatGPT** and **GitHub** tooling, alongside any skill-specific runtimes or libraries declared above.

This skill is distributed under the project's custom **Terms of Service & Usage Agreement**, Section 3, **“Permitted Use (the Anti-License)”** (last updated **July 10, 2026**): personal/private/non-commercial use and private adaptation are permitted; commercial use, sale, redistribution for profit, or commercial incorporation of the Platform's source code or proprietary lore assets is prohibited. Attribution is appreciated but not mandated. Third-party systems, lore, trademarks, APIs, libraries, standards, and other external material remain subject to their respective owners' rights.

Keep this notice with copies of `SKILL.md`. See `PROVENANCE.md` in this skill directory and the repository root `TERMS-OF-SERVICE.md` for the complete provenance and governing terms.
