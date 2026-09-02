---
name: tabletop-sandbox-data-management
description: Create and maintain system-neutral CSV state in a writable host sandbox for characters, stats, encounters, inventory, and campaign ledgers.
compatibility: Requires a host that can load Agent Skills. File-backed operations additionally require a writable sandbox/filesystem; randomness additionally requires a cryptographic RNG source.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  personality-engram: blacklight.charles
---

# Tabletop Sandbox Data Management

Use this skill as the shared persistence layer for tabletop work when the host exposes a writable sandbox or filesystem.

## Storage location

Use a dedicated `ttrpg_state/` directory. In ChatGPT-style writable sandboxes, prefer `/mnt/data/ttrpg_state/` when available. In other hosts, use the host's equivalent persistent working directory. Never claim persistence beyond the lifetime or scope the host actually provides.

Preserve imported source files. Normalize into working CSVs rather than destructively rewriting the original sheet.

## Canonical CSVs

Use these system-neutral tables:

- `characters.csv`: `character_id,name,kind,system,player,source_file,status,notes,updated_at`
- `character_stats.csv`: `character_id,scope,key,value,value_type,max_value,unit,notes,updated_at`
- `roster.csv`: `roster_id,entity_id,group_id,role,status,location,notes,updated_at`
- `encounters.csv`: `encounter_id,name,round,turn_index,active,status,scene,updated_at`
- `encounter_participants.csv`: `encounter_id,participant_id,initiative,order_key,hp_current,hp_max,conditions,resources,active,notes,updated_at`
- `inventory.csv`: `owner_id,item_id,name,quantity,state,unit,location,notes,updated_at`
- `campaign_ledger.csv`: `timestamp,entity_id,event_type,key,old_value,new_value,source,notes`

Use stable IDs. Do not make a character's display name the sole key.

## Mutation rules

Before changing a tracked value, read the current row. Update the current-state table and append a corresponding ledger row whenever the mutation is campaign-significant. Prefer atomic file replacement rather than partial in-place writes.

Do not silently delete unknown columns or records. When importing an unfamiliar system, preserve unmapped values as named stats or notes.

## Portable helper

When Python execution is available, use `scripts/tabletop_state.py` as the canonical helper for initializing tables, upserting characters, setting stats, reading character state, and appending ledger events.
