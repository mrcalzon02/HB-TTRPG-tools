---
name: character-stat-tracking
description: Track current and maximum character statistics, resources, conditions, derived values, and changes in the shared tabletop CSV state.
compatibility: Requires a host that can load Agent Skills. File-backed operations additionally require a writable sandbox/filesystem; randomness additionally requires a cryptographic RNG source.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  personality-engram: blacklight.charles
---

# Character Stat Tracking

Use this skill for mutable character state across any tabletop system.

Track values in `character_stats.csv` by stable `character_id`, `scope`, and `key`. Examples include HP, wounds, stress, Humanity, Edge, spell slots, armor, ammunition, XP, reputation, fatigue, conditions, clocks, custom homebrew meters, and temporary bonuses.

## Rules

Read current state before changing it. Preserve current and maximum values separately when the system uses both. Record units or semantic types when useful. Do not invent a maximum, modifier, derived stat, or recovery rule that is not present in the sheet, campaign state, or authoritative rules.

For campaign-significant changes, append the old and new values to `campaign_ledger.csv`. If a user says “take 7 damage,” calculate the new tracked value from observed state, apply the system's known damage rule if available, and show the resulting state. If the rule is unknown, record the raw requested change rather than hallucinating system mechanics.

Use `tabletop-sandbox-data-management` for file operations.
