---
name: character-sheet-import
description: Import character sheets and normalize their identity, stats, resources, conditions, inventory, and provenance into the shared tabletop CSV state.
compatibility: Requires a host that can load Agent Skills. File-backed operations additionally require a writable sandbox/filesystem; randomness additionally requires a cryptographic RNG source.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  personality-engram: blacklight.charles
---

# Character Sheet Import

Use this skill when the user supplies or references a character sheet that should become usable campaign state.

## Supported inputs

Prefer structured inputs first: CSV, JSON, YAML, exported text, or form data. Plain Markdown and text sheets are acceptable. PDF/image sheets require a host that can actually read the file; do not pretend to have extracted fields that were not observed.

## Workflow

1. Preserve the original source artifact and record its filename/path.
2. Identify character name, system, player/owner if present, and whether the sheet represents a PC, NPC, companion, creature, or other entity.
3. Normalize identity into `characters.csv`.
4. Normalize mutable and rules-relevant fields into long-form `character_stats.csv`; keep the source's own labels unless a system authority provides canonical names.
5. Route equipment and carried resources to `inventory.csv` when useful.
6. Record uncertain or unreadable fields rather than guessing.
7. If a value appears derived, preserve the observed value and note derivation only when known from the authoritative rules.
8. Append a ledger entry identifying the import source and timestamp.

Use `tabletop-sandbox-data-management` for persistence and `character-stat-tracking` for subsequent mutations.

## Re-import

A re-import is reconciliation, not blind replacement. Compare source values with tracked state, surface material conflicts, and do not erase campaign changes merely because an older sheet was imported again.
