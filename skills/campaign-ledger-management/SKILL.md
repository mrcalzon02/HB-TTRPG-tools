---
name: campaign-ledger-management
description: Keep an append-only campaign change ledger and current-state CSVs so campaign events and stat mutations are reviewable and reversible.
compatibility: Requires a host that can load Agent Skills. File-backed operations additionally require a writable sandbox/filesystem; randomness additionally requires a cryptographic RNG source.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  personality-engram: blacklight.charles
---

# Campaign Ledger Management

Use this skill as the audit trail for mutable campaign state.

`campaign_ledger.csv` is append-only by default. Every significant event should identify a timestamp when available, entity ID, event type, changed key, previous value, new value, source, and notes. Sources may be a user instruction, imported sheet, dice result, session event, rules adjudication, or tool output.

The ledger does not replace current-state tables. Current CSVs answer “what is true now”; the ledger answers “how did it get that way?”

Never retroactively rewrite history to hide a correction. Append a correcting event that references the earlier mistake. This makes campaign state reviewable, reversible, and suitable for continuity work across long-running sessions.
