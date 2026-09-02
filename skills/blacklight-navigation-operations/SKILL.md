---
name: blacklight-navigation-operations
description: Use the Blacklight EXO Crew Operations Navigation station for reference selection, transfer and avoidance solutions, azimuth/elevation plotting, delta-v and timebase work, rendezvous, dead reckoning, debris corridors, gravity assists, and solution relay to Helm. Activate for Blacklight EXO navigation-console procedures.
compatibility: Requires the canonical Blacklight EXO Crew Operations browser runtime; Navigation is a distinct station workflow inside the shared simulator.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-station: navigation
---

# Blacklight Navigation Operations

Use the **Navigation** station in `blacklight-exo-crew-operations.html` and the shared `blacklight-exo-crew-operations.js` authority. Station code: `NAV`.

## Workflow

1. Select Navigation in the Crew Operations simulator.
2. Choose the canonical procedure matching the route/plotting problem: transfer, collision avoidance, rendezvous, formation work, dead reckoning, hazard corridor, or other registered Navigation procedure.
3. Use the displayed reference, solver, azimuth/elevation, delta-v, timebase, validation, and solution-latch controls in the prescribed sequence.
4. Preserve the recorded input sequence and DM Relay difficulty guidance.
5. Hand off validated maneuver solutions to Helm where the scenario calls for execution by the pilot station.

## Hard rules

- Do not substitute the separate EXO interstellar jump calculator for Crew Operations Navigation unless the request specifically concerns cluster/FTL jump routing.
- Do not invent navigation procedures or precomputed outcomes outside the canonical runtime.
- Do not roll for the character or convert DM Relay guidance into automatic success/failure.
- Keep Navigation and Helm separate: Navigation solves/relays; Helm executes vessel motion.

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance, Authorship & Usage Notice

This Agent Skill originates in **Calzon's TTRPG Foundry** (`mrcalzon02/HB-TTRPG-tools`) and is maintained under the authority of **mrcalzon02**. It was developed with human creative direction and AI-assisted drafting, analysis, coding, review, testing, and repository integration using **OpenAI ChatGPT** and **GitHub** tooling, alongside any skill-specific runtimes or libraries declared above.

This skill is distributed under the project's custom **Terms of Service & Usage Agreement**, Section 3, **“Permitted Use (the Anti-License)”** (last updated **July 10, 2026**): personal/private/non-commercial use and private adaptation are permitted; commercial use, sale, redistribution for profit, or commercial incorporation of the Platform's source code or proprietary lore assets is prohibited. Attribution is appreciated but not mandated. Third-party systems, lore, trademarks, APIs, libraries, standards, and other external material remain subject to their respective owners' rights.

Keep this notice with copies of `SKILL.md`. See `PROVENANCE.md` in this skill directory and the repository root `TERMS-OF-SERVICE.md` for the complete provenance and governing terms.
