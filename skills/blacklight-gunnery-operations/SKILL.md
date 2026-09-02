---
name: blacklight-gunnery-operations
description: Use the Blacklight EXO Crew Operations Gunnery station for weapon safing, bank selection, track modes, range gating, capacitor state, arming, fire-control confirmation, engagement preparation, and combat fire-control procedures. Activate for Blacklight EXO weapons-console and gunnery tasks.
compatibility: Requires the canonical Blacklight EXO Crew Operations browser runtime; Gunnery is a distinct station workflow with station-specific fire-control confirmation support.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-station: gunnery
---

# Blacklight Gunnery Operations

Use the **Gunnery** station in `blacklight-exo-crew-operations.html`. Station code: `GUN`.

## Canonical implementation

- `blacklight-exo-crew-operations.js`
- `blacklight-exo-gunnery-fire-control-confirm.js`
- `blacklight-exo-crew-auxiliary.js`

## Workflow

1. Select Gunnery and choose the canonical procedure matching the requested engagement or fire-control task.
2. Use the runtime's weapon-safe, weapon-bank, track-mode, range-gate, capacitor, arming, confirmation, authorization, and execution controls exactly as required by that procedure.
3. Preserve any station dependencies, especially Navigation/Science targeting support and Engineering power constraints.
4. Return the recorded player input sequence and DM Relay guidance for adjudication.
5. Treat the simulator as an RP/procedural console: it does not independently determine whether an attack succeeds.

## Hard rules

- Do not bypass weapon safing/arming/confirmation states.
- Do not invent hit rolls, damage, or target outcomes from console state alone.
- Do not copy the fire-control state machine into the skill.
- Keep the canonical Crew Operations runtime as the single procedure authority.

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance, Authorship & Usage Notice

This Agent Skill originates in **Calzon's TTRPG Foundry** (`mrcalzon02/HB-TTRPG-tools`) and is maintained under the authority of **mrcalzon02**. It was developed with human creative direction and AI-assisted drafting, analysis, coding, review, testing, and repository integration using **OpenAI ChatGPT** and **GitHub** tooling, alongside any skill-specific runtimes or libraries declared above.

This skill is distributed under the project's custom **Terms of Service & Usage Agreement**, Section 3, **“Permitted Use (the Anti-License)”** (last updated **July 10, 2026**): personal/private/non-commercial use and private adaptation are permitted; commercial use, sale, redistribution for profit, or commercial incorporation of the Platform's source code or proprietary lore assets is prohibited. Attribution is appreciated but not mandated. Third-party systems, lore, trademarks, APIs, libraries, standards, and other external material remain subject to their respective owners' rights.

Keep this notice with copies of `SKILL.md`. See `PROVENANCE.md` in this skill directory and the repository root `TERMS-OF-SERVICE.md` for the complete provenance and governing terms.
