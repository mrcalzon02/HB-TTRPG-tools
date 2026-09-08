---
name: alien-vessel-generation
description: Generate deterministic semantic multi-deck alien vessel interiors, including reconnaissance ships, damaged variants, hull envelopes, compartments, damage annotations, and validation. Use when a user needs an alien ship layout, wreck interior, or vessel encounter space.
compatibility: Requires access to HBFoundryAPI or the canonical ordered HB-TTRPG-tools browser JavaScript runtime.
metadata:
  author: mrcalzon02
  version: "1.1.0"
  foundry-capability: spatial.alien-vessel.generate
---

# Alien Vessel Generation

Use the canonical capability `spatial.alien-vessel.generate`.

The portable companion package is `skills/alien-vessel-generation/manifest.json`. Its deterministic non-destructive proof definition is `skills/alien-vessel-generation/self-test.json`. These files reference the canonical runtime; they do not contain a second vessel generator.

## Workflow

1. Retrieve the current operation contract for `spatial.alien-vessel.generate`.
2. Capture the requested faction, vessel type, profile, damage severity, size/decks, hull shape/tightness, seed, and any additional semantic compartments.
3. Before direct portable execution, inspect the companion manifest and verify that the host can load the exact same-origin runtime scripts in canonical order:
   - `semantic-spatial-engine.js`
   - `vessel-hull-envelope.js`
   - `alien-vessel-generator.js`
4. In a compatible host, run the declared deterministic self-test before promoting the capability to `self-test-passed` or `ready`. In an incompatible host, report the runtime limitation rather than recreating the generator or hull adapter.
5. Invoke `HBFoundryAPI.invoke('spatial.alien-vessel.generate', input)` or the documented canonical runtime `generator.alien_vessel.generate(input)`.
6. Preserve the canonical `semanticSummary`, `spatialLayout`, hull envelope, deterministic damage annotations, and combined validation result.
7. Surface validation failures rather than converting them into a plausible-looking fictional layout.
8. For reproducibility, preserve and report the final seed.

## Profiles and hulls

Use built-in profile names documented by the operation contract when possible. Add custom roles only when the requested ship requires compartments beyond the canonical profile.

Hull shape and tightness are owned by `vessel-hull-envelope.js`. Use the operation contract for canonical shapes, aliases, named tightness presets, and numeric tightness behavior instead of inventing geometry rules in the skill.

## Execution boundary

Repository presence, successful skill loading, or knowledge of the operation contract does not establish runtime readiness. Browser-JavaScript execution begins at `runtime-required`; only observed compatible runtime loading and the declared self-test can promote the current host toward `ready`.

Do not translate the canonical JavaScript implementation into Python or independently recreate its topology, hull geometry, profile inheritance, or deterministic damage-selection logic merely because another runtime is available.

## Hard rules

- The shared semantic spatial engine owns topology.
- The vessel hull-envelope adapter owns the enclosing ship shape.
- Do not create a second vessel-layout or hull algorithm inside the skill.
- Do not hide hull/spatial validation errors.
- Use the public operation contract instead of inferring inputs from model knowledge.
- Preserve the capability registry's exact runtime script set and dependency order.
- Do not claim the portable package passed its self-test unless that test actually executed successfully in the current host.

## Discovery links

- Portable companion manifest: `https://mrcalzon02.github.io/HB-TTRPG-tools/skills/alien-vessel-generation/manifest.json`
- Deterministic self-test: `https://mrcalzon02.github.io/HB-TTRPG-tools/skills/alien-vessel-generation/self-test.json`
- Capability manifest: `https://mrcalzon02.github.io/HB-TTRPG-tools/api/foundry-capabilities.json`
- Operation contracts: `https://mrcalzon02.github.io/HB-TTRPG-tools/api/operation-contracts.json`
- Browser proof harness: `https://mrcalzon02.github.io/HB-TTRPG-tools/ai-skill-test.html`

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance, Authorship & Usage Notice

This Agent Skill originates in **Calzon's TTRPG Foundry** (`mrcalzon02/HB-TTRPG-tools`) and is maintained under the authority of **mrcalzon02**. It was developed with human creative direction and AI-assisted drafting, analysis, coding, review, testing, and repository integration using **OpenAI ChatGPT** and **GitHub** tooling, alongside any skill-specific runtimes or libraries declared above.

This skill is distributed under the project's custom **Terms of Service & Usage Agreement**, Section 3, **“Permitted Use (the Anti-License)”** (last updated **July 10, 2026**): personal/private/non-commercial use and private adaptation are permitted; commercial use, sale, redistribution for profit, or commercial incorporation of the Platform's source code or proprietary lore assets is prohibited. Attribution is appreciated but not mandated. Third-party systems, lore, trademarks, APIs, libraries, standards, and other external material remain subject to their respective owners' rights.

Keep this notice with copies of `SKILL.md`. See `PROVENANCE.md` in this skill directory and the repository root `TERMS-OF-SERVICE.md` for the complete provenance and governing terms.
