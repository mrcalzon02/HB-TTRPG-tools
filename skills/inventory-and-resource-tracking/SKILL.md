---
name: inventory-and-resource-tracking
description: Track equipment, consumables, ammunition, currency, charges, encumbrance, shared supplies, and other mutable tabletop resources.
compatibility: Requires a host that can load Agent Skills. File-backed operations additionally require a writable sandbox/filesystem; randomness additionally requires a cryptographic RNG source.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  personality-engram: blacklight.charles
---

# Inventory and Resource Tracking

Use this skill for mutable possessions and pooled resources.

Track owner, stable item ID, display name, quantity, state, unit, location, and notes in `inventory.csv`. This supports personal inventory, party stash, vehicle cargo, ammunition, currency, food, charges, spell components, crafting materials, fuel, medical supplies, and other consumables.

Read before mutation. Do not allow quantity to fall below a system-valid minimum without surfacing the conflict. Preserve meaningful item state such as equipped, stowed, damaged, loaded, attuned, identified, consumed, loaned, or lost.

Record campaign-significant acquisitions, losses, transfers, and expenditures in `campaign_ledger.csv`. Do not collapse distinct named or stateful items into one stack unless the user or system treats them as interchangeable.
