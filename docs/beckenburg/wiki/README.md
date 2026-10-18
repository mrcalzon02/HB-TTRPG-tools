# Beckenburg — Player & Design Wiki

**Source-derived reference | 18 October 2026 | Java 17 alpha / production roadmap**

The Beckenburg Project is an original asymmetric supernatural investigation game. Hunters investigate a haunted building and resolve its haunting by identifying the entity, warding its anchor and completing the correct rite. A ghost can be operated by another player or by AI under the same host-controlled rules.

**How to read this wiki:** **In source** = a rule, catalog record, UI or code path exists in current Java source, not an independent claim that a packaged Windows build has passed acceptance. **Prototype** = usable in a limited solo or LAN game path. **Planned** = specified in project documents but not yet a full playable feature. The [stage ledger](../stage-ledger.json) and [quality gates](../QUALITY_GATES.md) govern verification.

## Contents

| Page | What's covered |
| --- | --- |
| [How to play and rules](rules.md) | Mission sequence, 1–6 hunters, human/AI ghost, victory conditions, rites, difficulty, practical controls |
| [Evidence and the journal](evidence.md) | Measurements, thresholds, manual ticks, exclusions, actual ghost compatibility and incomplete detectors |
| [Ghost field guide](ghosts.md) | All 13 species, signature behaviors, movement, sightings, evidence possibilities and required rituals |
| [Equipment and items](equipment.md) | Six present loadout items, counters, van systems, all 42 registered catalog entries and scope |
| [Shops, currency and costs](shops-and-costs.md) | Exact current purchase prices, healing, sanity restoration, credit rules, rewards and planned economy |
| [Locations and ritual sites](locations.md) | Authored house, castle headquarters and eight planned map families with all three planned ritual installations |

## Current scope, at a glance

- **13 ghost species** have Java traits, action preferences and assigned rites. Full species-specific audiovisual abilities and balance testing remain in development.
- **1 playable site category**: the House, with twelve indoor rooms and three exterior zones; the other eight categories are planned, not substituted with house geometry.
- **Three outcomes:** banishment, cleansing and absolution; their physical house installations and host-side timing exist.
- **42 equipment catalog entries**: 8 starter-equivalent, 13 optional, 7 van/truck and 14 original Beckenburg tools. This is a *scope catalog*, not 42 purchasable functional objects.
- **Evidence is an investigator conclusion.** Raw scans are logged; the investigator manually checks evidence; the roster dims incompatible ghosts. The game does not authenticate a player's tick or insert deliberately fabricated paranormal evidence.
- **Shop prices** are currently implemented for solo UV lamp and salt ownership and three grades each of health and sanity medicine; the rest of the proposed equipment does not have a finalized retail price.

## Source policy and limitations

The wiki gives precedence to the live Java implementation for actual behavior, catalog and prices, then current specific design documents for unimplemented plans. Old species-coded EMF, cold and voice subtype labels are **retired compatibility data**, not player-facing evidence. Previous requirements to collect three 'confirmed' readings conflict with the current manual-evidence design and are **not rules of the intended game**. Do not treat speculation or registry presence as an obtained item.

Primary sources: [game design](../README.md), [evidence roadmap](../EQUIPMENT_EVIDENCE_ROADMAP.md), [manual journal](../MANUAL_EVIDENCE_JOURNAL.md), [ghost behavior and ritual catalog](../GHOST_EVIDENCE_LOOP_CATALOG.md), [source implementation](../../../software/beckenburg/README.md), [site designs](../locations-environments.md) and [ritual site specifications](../environments/THREE_RITUAL_SITES.md). Every topic page links the specific code or document used. This wiki contains no copied artwork or third-party guide text.
