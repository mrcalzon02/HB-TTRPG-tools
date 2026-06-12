# Kaysender Cross-Linking Plan

This document records the current cross-link layer and the next steps for turning Kaysender into a true hypertext campaign operations system.

## Current state

The project now has three linked layers:

1. **Registry modules** in `data/kaysender-tools-registry.json`.
2. **Wiki entries** in `data/kaysender/wiki/entries.json`.
3. **Runtime cross-linking** in `kaysender-wiki.js`.

The registry defines tools, utilities, generators, status, priority, and data families.

The wiki data defines lore entries with stable IDs, categories, tags, related wiki entries, and related module IDs.

The runtime script reads the wiki data, adds wiki chips to module cards, opens a searchable wiki browser, and lets wiki entries push the dashboard search toward related modules.

## Current seed wiki entries

- Kaysender Overview
- Floating Islands
- The Scarcity Loop
- Airships and Vessels
- Messara
- Valeria and Valthorn
- Dragon Lords and Tribute Networks
- The Black Fleet
- Surveyor's Guild
- Skyweaver Consortium
- Water Trade
- Sky Ecology

## Link direction model

### Module to wiki

Each registry card can receive quick wiki chips based on a module-to-entry map.

Example:

- `floating-island-generator` links to `floating-islands`, `scarcity-loop`, and `sky-ecology`.
- `airship-vessel-generator` links to `airships`, `black-fleet`, and `surveyors-guild`.
- `supply-water-planner` links to `scarcity-loop`, `water-trade`, and `airships`.

This allows a GM to start with a tool and immediately open the relevant setting context.

### Wiki to module

Each wiki entry has `relatedModules`.

Example:

- `scarcity-loop` links to `supply-water-planner`, `settlement-generator`, `shop-market-generator`, and `world-map-route-generator`.
- `water-trade` links to `supply-water-planner`, `shop-market-generator`, `settlement-generator`, and `world-map-route-generator`.
- `black-fleet` links to `black-market-piracy-generator`, `airship-vessel-generator`, `encounter-generator`, and `shop-market-generator`.

This allows a GM to start with lore and jump back to operational tools.

### Wiki to wiki

Each entry has `relatedEntries`.

This produces hypertext navigation inside the setting itself.

## Cross-link design rules

- Lore entries should not copy large manuscript sections directly into the site.
- Rules-facing mechanics should stay separate from lore until converted into open d20-compatible language.
- Each wiki entry should have a stable slug ID.
- Each generator should eventually output IDs that can be saved as future wiki entries or campaign notes.
- Related module IDs must match registry module IDs exactly.
- Related entry IDs must match wiki entry IDs exactly.

## Next cross-linking tasks

1. Move the hardcoded `moduleEntryMap` from `kaysender-wiki.js` into JSON.
2. Add a `relatedEntries` and `relatedModules` preview directly to each registry card.
3. Add export buttons to save generated outputs as draft wiki entries.
4. Add an `entryType` field for lore, rules, GM-only, settlement, faction, vessel, market, route, and creature entries.
5. Add visibility controls for player-facing vs GM-only material.
6. Add backlinks so each wiki entry can show which modules and entries point to it.
7. Add a broken-link validator for wiki IDs and registry module IDs.
8. Add source-trace fields for manuscript extraction review without exposing protected source wording.
