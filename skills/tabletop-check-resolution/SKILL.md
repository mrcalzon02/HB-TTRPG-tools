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
