---
name: garrvel-resident-state-of-mind
description: Build and maintain source-grounded Garrvel resident rosters, household networks, subjective beliefs, emotional snapshots, event consequences, and Excel workbook continuity.
compatibility: Public declarative skill; workbook read/write requires separately authorized host tools. No private runner access.
metadata:
  required-personality-engram: blacklight.charles
  required-skill-index: skills/index.json
  author: mrcalzon02
  version: "0.1.0"
  execution-mode: public-declarative
---

# Garrvel Resident State of Mind

Before activation verify the reciprocal Charles engram and skills/index.json integrity binding. Inherit Charles; never fork the personality. Host tools and permissions control all actual reads and writes.

## Purpose
Maintain an interconnected fictional population for Garrvel, the aging Alaskan fishing settlement south of Sitka. Preserve indigenous and Russian-era historical layers, fishing and tourism economies, generational tensions, migration, and the dangerous fog as established setting motifs. Do not assert invented residents or supernatural claims as canon.

## Existing Foundry skill routing
Use existing `npc-and-faction-development`, `interpersonal-theory-of-mind-modeling`, `settlement-and-location-development`, `party-and-npc-roster-management`, `campaign-continuity`, `campaign-ledger-management`, and `tabletop-sandbox-data-management` for their respective canonical workflows. Mirror calls; do not duplicate their algorithms.

## Workbook model
Support Excel .xlsx or host-authorized native Sheets. Prefer these normalized tables:
- Residents: resident_id, display_name, aliases, age_band, occupation, household_id, location_id, canon_status, source_id, notes
- Households: household_id, address_or_area, members, resources, circumstances
- Businesses: business_id, location_id, employer_ids, services, economic_state
- Relationships: relationship_id, source_resident_id, target_resident_id, relationship_type, sentiment, trust, visibility, effective_from, source_id
- MindSnapshots: snapshot_id, resident_id, story_time, mood, stress, fear, desire, belief, coping, confidence, trigger_event_id, source_id
- Knowledge: claim_id, resident_id, proposition, epistemic_status, confidence, evidence_source_id, secrecy
- Events: event_id, story_time, description, location_id, canon_status, source_id
- EventEffects: event_id, resident_id, observed_or_inferred, effect, snapshot_id
- Sources: source_id, title, URL_or_reference, excerpt_location, reliability
- Continuity: issue_id, entity_id, conflicting_sources, resolution_status, notes

IDs must remain stable across edits. Foreign keys must resolve. Keep narrative dates distinct from edit timestamps. Use unknown rather than fabricated values.

## Operations
1. `resident.create`: check existing names/aliases, allocate stable ID, mark proposed unless cited canon.
2. `resident.update`: preserve prior sourced facts and audit changes.
3. `household.link`: verify member and household references.
4. `relationship.link`: record directional feelings separately when asymmetrical.
5. `mind.snapshot`: append time-indexed subjective state; never overwrite historical states.
6. `knowledge.record`: distinguish truth, rumor, suspicion, lie, unknown, and narrator-only fact.
7. `event.apply`: log event and per-resident effects, not a global automatic mood rewrite.
8. `continuity.audit`: detect dangling IDs, duplicates, contradictory facts, source gaps and canon promotions.
9. `roster.export`: produce .xlsx and/or structured JSON with version and source manifest.

## Canon and source hierarchy
Author-confirmed canon > directly preserved story source > continuity archive reconstruction > proposed creative addition > inference. Label every proposed resident explicitly. Never treat a character's belief as world truth. Never silently canonize, delete, or retcon records. Preserve the original dictated name Garfield in archival text while using Garrvel as the revised setting name.

## Source and integration limitations
The State of Mind reference workbook has not been verified. Map its original sheets, columns, formulas, and validations before claiming full compatibility; use this schema only as an interim adapter. The preliminary Garrvel roster is not proof of established character canon. Never publish personal secrets, user data, or private runner controls in the public repository.

## Acceptance checks
Validate workbook openability, all required sheets, unique IDs, valid references, canon labels, non-destructive history, event-to-snapshot links, and round-trip export. For every real integration claim, require host-observed tests, commit SHA and readback. This skill by itself grants no execution or persistent storage.

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->
## Provenance, Authorship & Usage Notice
This Agent Skill originates in Calzon's TTRPG Foundry (`mrcalzon02/HB-TTRPG-tools`) under mrcalzon02, with AI-assisted development. Subject to the repository's `TERMS-OF-SERVICE.md`, including its noncommercial restrictions.
