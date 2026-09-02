---
name: blacklight-engineering-operations
description: Use the Blacklight EXO Crew Operations Engineering station for rectifiers, bus transfer, voltage balancing, breakers, coolant valves, pump selection, power-map work, damage control, and ship-system recovery procedures. Activate for Blacklight EXO power, reactor, electrical, coolant, and engineering-console tasks.
compatibility: Requires the canonical Blacklight EXO Crew Operations browser runtime; Engineering is a distinct station workflow with a station-specific power-map module.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-station: engineering
---

# Blacklight Engineering Operations

Use the **Engineering** station in `blacklight-exo-crew-operations.html`. Station code: `ENG`.

## Canonical implementation

- `blacklight-exo-crew-operations.js`
- `blacklight-exo-engineering-power-map.js`
- `blacklight-exo-crew-auxiliary.js`

## Workflow

1. Select Engineering and the canonical procedure matching the power/coolant/damage-control task.
2. Follow the runtime's rectifier, bus, voltage, breaker, coolant, pump, confirmation, authorization, and execution requirements.
3. Use the engineering power-map surface when the procedure depends on electrical topology rather than guessing system connectivity.
4. Preserve the recorded input sequence, voltage/bus state, required auxiliary controls, and DM Relay difficulty guidance.
5. Coordinate with Helm, Gunnery, Science, Navigation, or Comms when engineering state changes their available systems.

## Hard rules

- Do not invent power-system topology outside the canonical power map.
- Do not treat a correctly entered console sequence as automatic task success.
- Do not bypass breaker/authorization state to force a procedure.
- Keep Engineering logic in the shared simulator and its station-specific module, not in the skill.

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance, Authorship & Usage Notice

This Agent Skill originates in **Calzon's TTRPG Foundry** (`mrcalzon02/HB-TTRPG-tools`) and is maintained under the authority of **mrcalzon02**. It was developed with human creative direction and AI-assisted drafting, analysis, coding, review, testing, and repository integration using **OpenAI ChatGPT** and **GitHub** tooling, alongside any skill-specific runtimes or libraries declared above.

This skill is distributed under the project's custom **Terms of Service & Usage Agreement**, Section 3, **“Permitted Use (the Anti-License)”** (last updated **July 10, 2026**): personal/private/non-commercial use and private adaptation are permitted; commercial use, sale, redistribution for profit, or commercial incorporation of the Platform's source code or proprietary lore assets is prohibited. Attribution is appreciated but not mandated. Third-party systems, lore, trademarks, APIs, libraries, standards, and other external material remain subject to their respective owners' rights.

Keep this notice with copies of `SKILL.md`. See `PROVENANCE.md` in this skill directory and the repository root `TERMS-OF-SERVICE.md` for the complete provenance and governing terms.
