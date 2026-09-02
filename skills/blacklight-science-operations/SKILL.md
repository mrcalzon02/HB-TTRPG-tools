---
name: blacklight-science-operations
description: Use the Blacklight EXO Crew Operations Science station for receiver bands, apertures, gain, integration, emitter inhibition/gating, scanning, contact analysis, sensor confirmation, and science-console procedures. Activate for Blacklight EXO sensors, scanning, analysis, and science-station tasks.
compatibility: Requires the canonical Blacklight EXO Crew Operations browser runtime; Science is a distinct station workflow with station-specific tape-router support.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-station: science
---

# Blacklight Science Operations

Use the **Science / Scanning** station in `blacklight-exo-crew-operations.html`. Station code: `SCI`.

## Canonical implementation

- `blacklight-exo-crew-operations.js`
- `blacklight-exo-science-tape-router.js`
- `blacklight-exo-crew-auxiliary.js`

## Workflow

1. Select Science and the canonical procedure matching the scan, receiver, contact-analysis, or emitter task.
2. Use the displayed receiver-band, aperture, gain, integration, emitter, confirmation, authorization, and auxiliary controls in the prescribed sequence.
3. Use the Science tape/router support when the procedure routes or records sensor information.
4. Preserve recorded player inputs and DM Relay guidance for adjudication.
5. Relay sensor/targeting information to Navigation, Gunnery, Helm, Engineering, or Comms when the procedure establishes those dependencies.

## Hard rules

- Do not convert scanner visualization into facts the canonical procedure did not establish.
- Do not invent sensor resolution or contact identification outside the runtime/lore context.
- Do not roll for the character or declare success from console state alone.
- Keep Science procedures distinct from the separate Signals Laboratory scientific tooling.

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance, Authorship & Usage Notice

This Agent Skill originates in **Calzon's TTRPG Foundry** (`mrcalzon02/HB-TTRPG-tools`) and is maintained under the authority of **mrcalzon02**. It was developed with human creative direction and AI-assisted drafting, analysis, coding, review, testing, and repository integration using **OpenAI ChatGPT** and **GitHub** tooling, alongside any skill-specific runtimes or libraries declared above.

This skill is distributed under the project's custom **Terms of Service & Usage Agreement**, Section 3, **“Permitted Use (the Anti-License)”** (last updated **July 10, 2026**): personal/private/non-commercial use and private adaptation are permitted; commercial use, sale, redistribution for profit, or commercial incorporation of the Platform's source code or proprietary lore assets is prohibited. Attribution is appreciated but not mandated. Third-party systems, lore, trademarks, APIs, libraries, standards, and other external material remain subject to their respective owners' rights.

Keep this notice with copies of `SKILL.md`. See `PROVENANCE.md` in this skill directory and the repository root `TERMS-OF-SERVICE.md` for the complete provenance and governing terms.
