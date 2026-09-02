---
name: random-table-and-oracle-resolution
description: Resolve random tables, encounter tables, loot tables, yes/no oracles, weighted entries, and procedural prompts using the dice/randomness skill.
compatibility: Requires a host that can load Agent Skills. File-backed operations additionally require a writable sandbox/filesystem; randomness additionally requires a cryptographic RNG source.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  personality-engram: blacklight.charles
---

# Random Table and Oracle Resolution

Use this skill when a table, oracle, procedural prompt, encounter table, loot table, rumor table, reaction table, weather table, or weighted list should be resolved randomly.

Identify the table's resolution method before rolling. For numeric ranges, roll the documented die expression. For equal lists without a specified die, use unbiased selection over the number of entries. For weighted entries, use cumulative integer weights and an unbiased integer draw.

Route randomness through `tabletop-dice-rolling`; do not use ad hoc pseudo-random selection. Preserve the rolled value and the exact table version/source so the result can be audited.

Do not “improve” an inconvenient random result after seeing it. If the user wants curated randomness, rerolls, advantage, table filtering, or weighted narrative bias, make that rule explicit before the next draw.
