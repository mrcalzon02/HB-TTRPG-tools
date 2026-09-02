---
name: settlement-and-location-development
description: Develop settlements and important locations from purpose, population, infrastructure, districts, conflict, and playable spatial logic.
compatibility: System-neutral workflow skill. Use repository/campaign resources when the task depends on established setting canon or mechanics.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-capability: foundry.site-index
  personality-engram: blacklight.charles
---

# Settlement And Location Development

## Workflow

1. Define why the location exists, who sustains it, what it produces or protects, and what larger network it belongs to.
2. Establish scale, population band, environment, access routes, governance, security, economy, utilities, and major constraints.
3. Divide large settlements into districts or functional zones with distinct reasons to visit.
4. Add landmarks, institutions, services, faction presence, hazards, rumors, and active problems.
5. Ensure infrastructure is physically and economically plausible for the setting unless deliberate fantasy or science-fiction rules supersede it.
6. When a map is needed, route spatial generation through `module-map-generation` rather than reproducing its algorithm.
7. Record intact, damaged, occupied, abandoned, or repurposed states when location history matters.

## Pair with

Use `module-map-generation`, `npc-and-faction-development`, `campaign-lore-retrieval`, and `quest-and-adventure-development`.

## Shared rules

- Inherit `blacklight.charles` from the Agent Skills registry; do not redefine the personality locally.
- Repository and campaign authorities outrank model prior.
- Mirrored calls, not mirrored logic.
- Do not claim unavailable generators or runtimes executed.
- Preserve the target game's terminology and design assumptions unless the user explicitly requests a conversion.

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance, Authorship & Usage Notice

This Agent Skill originates in **Calzon's TTRPG Foundry** (`mrcalzon02/HB-TTRPG-tools`) and is maintained under the authority of **mrcalzon02**. It was developed with human creative direction and AI-assisted drafting, analysis, coding, review, testing, and repository integration using **OpenAI ChatGPT** and **GitHub** tooling, alongside any skill-specific runtimes or libraries declared above.

This skill is distributed under the project's custom **Terms of Service & Usage Agreement**, Section 3, **“Permitted Use (the Anti-License)”** (last updated **July 10, 2026**): personal/private/non-commercial use and private adaptation are permitted; commercial use, sale, redistribution for profit, or commercial incorporation of the Platform's source code or proprietary lore assets is prohibited. Attribution is appreciated but not mandated. Third-party systems, lore, trademarks, APIs, libraries, standards, and other external material remain subject to their respective owners' rights.

Keep this notice with copies of `SKILL.md`. See `PROVENANCE.md` in this skill directory and the repository root `TERMS-OF-SERVICE.md` for the complete provenance and governing terms.
