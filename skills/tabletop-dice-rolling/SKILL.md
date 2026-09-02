---
name: tabletop-dice-rolling
description: Recognize tabletop dice commands and produce auditable unbiased rolls using a host cryptographic RNG when available.
compatibility: Requires a host that can load Agent Skills. File-backed operations additionally require a writable sandbox/filesystem; randomness additionally requires a cryptographic RNG source.
metadata:
  author: mrcalzon02
  version: "1.1.0"
  personality-engram: blacklight.charles
---

# Tabletop Dice Rolling

Use this skill whenever a user gives an explicit dice expression or asks Charles to roll dice.

## Recognition

Recognize case-insensitive standard notation and common command wrappers, including `d20`, `2d2`, `4D6`, `10D100`, `/roll 2d20+5`, `roll 3d8-2`, and equivalent natural-language requests. The guaranteed portable range is 1–10 dice with 2–100 sides per die. A missing count means one die. Integer modifiers may be positive or negative.

Do not silently interpret an ambiguous number as a die roll. Preserve the user's expression and report the normalized notation used.

## Roll modes

Recognize two first-class result modes, case-insensitively:

- **`cumulative`** — roll every die, add the dice together, apply any expression modifier to the aggregate, and present one final total. Example: `roll 6d10 cumulative` returns one number. Individual die values may be retained internally for auditability, but they are not read out as the user-facing result.
- **`individual total`** — roll every die independently and read out each result in roll order. Example: `roll 6d10 individual total` returns six separate die results. Do not collapse them into a single displayed sum. If the notation includes an aggregate modifier, retain and report that modifier separately rather than silently applying it to every die.

Accept natural aliases such as `individual`, `each`, and `per die` for `individual total`. If no mode is stated, default to `cumulative` unless a higher-level system skill explicitly defines another default. Preserve the resolved mode in the roll record.

## Randomness authority

Prefer a host cryptographic random source. In Python sandboxes use `secrets.randbelow(sides) + 1`. In modern browser JavaScript use `crypto.getRandomValues` with rejection sampling. Never fall back to `Math.random()` or a deterministic pseudo-random seed while claiming the result is random.

Cryptographic host randomness is not the same as a physical true-random-number generator. If the host does not expose a hardware or independently attested entropy source, describe the roll as cryptographically generated or unbiased host randomness rather than physically true random.

If no trustworthy random source is available, do not invent a roll. State that the current host cannot produce an auditable random result.

## Result record

Return or retain the original command, normalized notation, resolved mode, individual die results, subtotal, modifier, aggregate total, user-facing presentation payload, entropy source class, and timestamp when the host can supply one. Never rewrite a roll after seeing the result unless the user explicitly requests a reroll.

## Portable helpers

When executable skill scripts are allowed, prefer `scripts/secure_dice.py` in a Python sandbox or `scripts/secure-dice.js` in a browser-capable host. These helpers reject unsupported notation and do not use weak fallback RNGs.

## Cross-skill use

`tabletop-check-resolution` and `random-table-and-oracle-resolution` should route actual randomness through this skill. Character, encounter, loot, and campaign skills may record roll results but must not regenerate them during persistence.

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance, Authorship & Usage Notice

This Agent Skill originates in **Calzon's TTRPG Foundry** (`mrcalzon02/HB-TTRPG-tools`) and is maintained under the authority of **mrcalzon02**. It was developed with human creative direction and AI-assisted drafting, analysis, coding, review, testing, and repository integration using **OpenAI ChatGPT** and **GitHub** tooling, alongside any skill-specific runtimes or libraries declared above.

This skill is distributed under the project's custom **Terms of Service & Usage Agreement**, Section 3, **“Permitted Use (the Anti-License)”** (last updated **July 10, 2026**): personal/private/non-commercial use and private adaptation are permitted; commercial use, sale, redistribution for profit, or commercial incorporation of the Platform's source code or proprietary lore assets is prohibited. Attribution is appreciated but not mandated. Third-party systems, lore, trademarks, APIs, libraries, standards, and other external material remain subject to their respective owners' rights.

Keep this notice with copies of `SKILL.md`. See `PROVENANCE.md` in this skill directory and the repository root `TERMS-OF-SERVICE.md` for the complete provenance and governing terms.
