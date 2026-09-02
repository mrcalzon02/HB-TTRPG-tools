---
name: encounter-state-and-initiative
description: Manage encounter participants, initiative, rounds, turns, current health/resources, conditions, removals, and encounter close-out.
compatibility: Requires a host that can load Agent Skills. File-backed operations additionally require a writable sandbox/filesystem; randomness additionally requires a cryptographic RNG source.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  personality-engram: blacklight.charles
---

# Encounter State and Initiative

Use this skill once an encounter becomes stateful.

## Encounter state

Create an encounter ID and record scene/name, round, turn index, active state, and status in `encounters.csv`. Add participants by stable entity ID to `encounter_participants.csv`.

Track initiative exactly as rolled or supplied. Use a deterministic tie-break field only when the system or user provides one; otherwise surface the tie. Do not silently invent initiative modifiers.

During turns, update round/turn position, participant health/resources, conditions, and active/removed state. Character-level mutations should also flow through `character-stat-tracking` when they persist beyond the encounter.

On close-out, mark the encounter inactive, retain the final state for audit, and append important consequences to the campaign ledger. Do not delete the encounter merely because combat ended.

Route actual initiative dice to `tabletop-dice-rolling` when a roll is requested.
