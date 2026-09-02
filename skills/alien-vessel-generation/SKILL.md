---
name: alien-vessel-generation
description: Generate deterministic semantic multi-deck alien vessel interiors, including reconnaissance ships, damaged variants, hull envelopes, compartments, damage annotations, and validation. Use when a user needs an alien ship layout, wreck interior, or vessel encounter space.
compatibility: Requires access to HBFoundryAPI or the canonical HB-TTRPG-tools browser JavaScript runtime.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-capability: spatial.alien-vessel.generate
---

# Alien Vessel Generation

Use the canonical capability `spatial.alien-vessel.generate`.

## Workflow

1. Retrieve the current operation contract for `spatial.alien-vessel.generate`.
2. Capture the requested faction, vessel type, profile, damage severity, size/decks, hull shape/tightness, seed, and any additional semantic compartments.
3. Invoke `HBFoundryAPI.invoke('spatial.alien-vessel.generate', input)` in an appropriate runtime.
4. Preserve the canonical `semanticSummary`, `spatialLayout`, hull envelope, damage annotations, and validation result.
5. Surface validation failures rather than converting them into a plausible-looking fictional layout.
6. For reproducibility, preserve and report the final seed.

## Profiles

Use built-in profile names documented by the operation contract when possible. Add custom roles only when the requested ship requires compartments beyond the canonical profile.

## Hard rules

- The shared semantic spatial engine owns topology.
- The vessel hull-envelope adapter owns the enclosing ship shape.
- Do not create a second vessel-layout algorithm inside the skill.
- Do not hide hull/spatial validation errors.
- Use the public operation contract instead of inferring inputs from source code.

## Discovery links

- Capability manifest: `https://mrcalzon02.github.io/HB-TTRPG-tools/api/foundry-capabilities.json`
- Operation contracts: `https://mrcalzon02.github.io/HB-TTRPG-tools/api/operation-contracts.json`

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance, Authorship & Usage Notice

This Agent Skill originates in **Calzon's TTRPG Foundry** (`mrcalzon02/HB-TTRPG-tools`) and is maintained under the authority of **mrcalzon02**. It was developed with human creative direction and AI-assisted drafting, analysis, coding, review, testing, and repository integration using **OpenAI ChatGPT** and **GitHub** tooling, alongside any skill-specific runtimes or libraries declared above.

This skill is distributed under the project's custom **Terms of Service & Usage Agreement**, Section 3, **“Permitted Use (the Anti-License)”** (last updated **July 10, 2026**): personal/private/non-commercial use and private adaptation are permitted; commercial use, sale, redistribution for profit, or commercial incorporation of the Platform's source code or proprietary lore assets is prohibited. Attribution is appreciated but not mandated. Third-party systems, lore, trademarks, APIs, libraries, standards, and other external material remain subject to their respective owners' rights.

Keep this notice with copies of `SKILL.md`. See `PROVENANCE.md` in this skill directory and the repository root `TERMS-OF-SERVICE.md` for the complete provenance and governing terms.
