---
name: kaysender-airship-generation
description: Generate Kaysender airships and skyships with semantic interiors, hulls, crew spaces, cargo, armament, defenses, condition damage, faction context, encounter content, and provenance. Use when a user needs a Kaysender vessel, skyship encounter location, or reproducible airship profile.
compatibility: Requires access to HBFoundryAPI or the canonical HB-TTRPG-tools JavaScript runtime; Kaysender lore resources improve setting-aware inputs.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  foundry-capability: kaysender.airship.generate
---

# Kaysender Airship Generation

Use `kaysender.airship.generate` as the authoritative generator and the Kaysender wiki index for setting context.

## Workflow

1. Retrieve the current operation contract for `kaysender.airship.generate`.
2. If the request depends on Kaysender lore, retrieve or search `kaysender.wiki-index` rather than inventing setting facts.
3. Build the input from vessel class, hull culture, core type, purpose/current mission, crew scale, cargo profile, armament, defense system, condition, legal status, faction affiliation, danger level, and seed.
4. Invoke `HBFoundryAPI.invoke('kaysender.airship.generate', input)`.
5. Preserve the returned spatial layout, hull, damage state, populated content, compatibility data, provenance, and validation.
6. Report the seed for repeatable ships.

## Hard rules

- Do not replace culture-driven or class-driven generator behavior with skill prose.
- Do not fabricate Kaysender lore when the wiki collection can be searched.
- Preserve validation and provenance.
- Use the current operation contract for supported fields and defaults.

## Canonical resources

- `kaysender.wiki-index`
- `kaysender.tools-registry`
- `kaysender.airship.generate`

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance, Authorship & Usage Notice

This Agent Skill originates in **Calzon's TTRPG Foundry** (`mrcalzon02/HB-TTRPG-tools`) and is maintained under the authority of **mrcalzon02**. It was developed with human creative direction and AI-assisted drafting, analysis, coding, review, testing, and repository integration using **OpenAI ChatGPT** and **GitHub** tooling, alongside any skill-specific runtimes or libraries declared above.

This skill is distributed under the project's custom **Terms of Service & Usage Agreement**, Section 3, **“Permitted Use (the Anti-License)”** (last updated **July 10, 2026**): personal/private/non-commercial use and private adaptation are permitted; commercial use, sale, redistribution for profit, or commercial incorporation of the Platform's source code or proprietary lore assets is prohibited. Attribution is appreciated but not mandated. Third-party systems, lore, trademarks, APIs, libraries, standards, and other external material remain subject to their respective owners' rights.

Keep this notice with copies of `SKILL.md`. See `PROVENANCE.md` in this skill directory and the repository root `TERMS-OF-SERVICE.md` for the complete provenance and governing terms.
