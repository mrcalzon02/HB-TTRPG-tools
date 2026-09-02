---
name: tabletop-check-resolution
description: Recognize requested checks, saves, contests, attacks, and other dice-based resolutions; gather only missing rule inputs and route the actual roll through the dice skill.
compatibility: Requires a host that can load Agent Skills. File-backed operations additionally require a writable sandbox/filesystem; randomness additionally requires a cryptographic RNG source.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  personality-engram: blacklight.charles
---

# Tabletop Check Resolution

Use this skill for requested checks, saves, attacks, contests, opposed rolls, tests, and similar dice-based resolution.

Recognize phrases such as “roll Perception,” “make a save,” “attack at +5,” “2d6 versus difficulty 8,” or “opposed Strength check.” Separate four things: the dice expression, modifier, target/opponent, and interpretation rule.

If the user supplied an explicit complete roll expression, do not ask unnecessary questions. If a system-specific modifier or success rule is missing and materially required, retrieve it from the active character/campaign/rules state when available. Never invent a proficiency, target number, dice pool, exploding-die rule, advantage rule, or success threshold.

Route the actual random draw through `tabletop-dice-rolling`. Then apply only the known interpretation rule and, when relevant, record resulting state through encounter or character tracking skills.

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance, Authorship & Usage Notice

This Agent Skill originates in **Calzon's TTRPG Foundry** (`mrcalzon02/HB-TTRPG-tools`) and is maintained under the authority of **mrcalzon02**. It was developed with human creative direction and AI-assisted drafting, analysis, coding, review, testing, and repository integration using **OpenAI ChatGPT** and **GitHub** tooling, alongside any skill-specific runtimes or libraries declared above.

This skill is distributed under the project's custom **Terms of Service & Usage Agreement**, Section 3, **“Permitted Use (the Anti-License)”** (last updated **July 10, 2026**): personal/private/non-commercial use and private adaptation are permitted; commercial use, sale, redistribution for profit, or commercial incorporation of the Platform's source code or proprietary lore assets is prohibited. Attribution is appreciated but not mandated. Third-party systems, lore, trademarks, APIs, libraries, standards, and other external material remain subject to their respective owners' rights.

Keep this notice with copies of `SKILL.md`. See `PROVENANCE.md` in this skill directory and the repository root `TERMS-OF-SERVICE.md` for the complete provenance and governing terms.
