---
name: party-and-npc-roster-management
description: Maintain player-character, companion, hireling, NPC, faction-agent, and creature rosters with stable IDs and current status.
compatibility: Requires a host that can load Agent Skills. File-backed operations additionally require a writable sandbox/filesystem; randomness additionally requires a cryptographic RNG source.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  personality-engram: blacklight.charles
---

# Party and NPC Roster Management

Use this skill to maintain who exists, who belongs to which group, and their current operational status.

Maintain stable entity IDs across PCs, NPCs, companions, hirelings, summons, creatures, faction agents, and recurring antagonists. Use `roster.csv` for membership and operational status; use `characters.csv` and `character_stats.csv` for identity and mechanics.

Track group/faction, role, status, current location, and short notes without duplicating an entire character sheet into the roster. A dead, missing, captured, retired, hostile, allied, or absent character remains a record unless the user explicitly removes it from campaign history.

Use roster data to feed session preparation, encounter setup, campaign continuity, and initiative management.
