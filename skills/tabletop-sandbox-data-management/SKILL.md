---
name: tabletop-sandbox-data-management
description: Create and maintain system-neutral CSV state in a writable host sandbox for characters, stats, encounters, inventory, campaign ledgers, and tactical battlespace state.
compatibility: Requires a host that can load Agent Skills. File-backed operations additionally require a writable sandbox/filesystem; randomness additionally requires a cryptographic RNG source; battlespace PNG rendering additionally requires Python 3 and Pillow.
metadata:
  author: mrcalzon02
  version: "1.1.0"
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
- `battlefield_maps.csv`: `map_id,name,encounter_id,width_cells,height_cells,feet_per_cell,distance_rule,origin,notes,updated_at`
- `battlefield_tokens.csv`: `map_id,token_id,entity_id,name,faction,x,y,width_cells,height_cells,z_cells,color,status,notes,updated_at`
- `battlefield_terrain.csv`: `map_id,cell_x,cell_y,terrain_code,passable,movement_cost,cover,blocks_los,color,notes,updated_at`
- `battlefield_effects.csv`: `map_id,effect_id,source_token_id,shape,origin_x,origin_y,target_x,target_y,radius_cells,length_cells,width_cells,cells,color,status,notes,updated_at`

Use stable IDs. Do not make a character's display name, token display name, or encounter label the sole key.

The battlespace tables belong to `tabletop-battlespace-visualization`. They store authoritative grid geometry. Generated PNG previews are disposable projections and are not a replacement database.

## Mutation rules

Before changing a tracked value, read the current row. Update the current-state table and append a corresponding ledger row whenever the mutation is campaign-significant. Prefer atomic file replacement rather than partial in-place writes.

For battlespace corrections, change integer cell coordinates or effect state first, validate map bounds, then regenerate any requested preview from the structured tables. Never treat image editing as the state mutation path.

Do not silently delete unknown columns or records. When importing an unfamiliar system, preserve unmapped values as named stats or notes.

## Portable helpers

When Python execution is available, use `scripts/tabletop_state.py` as the canonical helper for initializing core tables, upserting characters, setting stats, reading character state, and appending ledger events.

For grid spatial state and Pillow diagnostics, load the sibling `tabletop-battlespace-visualization` skill and use its `scripts/battlespace.py` helper. Its minimum rendering contract is exactly one pixel per grid cell.

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance, Authorship & Usage Notice

This Agent Skill originates in **Calzon's TTRPG Foundry** (`mrcalzon02/HB-TTRPG-tools`) and is maintained under the authority of **mrcalzon02**. It was developed with human creative direction and AI-assisted drafting, analysis, coding, review, testing, and repository integration using **OpenAI ChatGPT** and **GitHub** tooling, alongside any skill-specific runtimes or libraries declared above.

This skill is distributed under the project's custom **Terms of Service & Usage Agreement**, Section 3, **“Permitted Use (the Anti-License)”** (last updated **July 10, 2026**): personal/private/non-commercial use and private adaptation are permitted; commercial use, sale, redistribution for profit, or commercial incorporation of the Platform's source code or proprietary lore assets is prohibited. Attribution is appreciated but not mandated. Third-party systems, lore, trademarks, APIs, libraries, standards, and other external material remain subject to their respective owners' rights.

Keep this notice with copies of `SKILL.md`. See `PROVENANCE.md` in this skill directory and the repository root `TERMS-OF-SERVICE.md` for the complete provenance and governing terms.
