# Kaysender Sequential Editor Staging Plan

This plan turns the Kaysender source material into one deep editor at a time instead of trying to build every generator at once.

## Design principle

Each editor should be a campaign operations workbench, not a loose random table.

A finished editor should provide:

- Manual controls for deliberate GM design.
- Randomization buttons for fast play.
- Derived outputs that connect to other systems.
- Source-safe lore summaries.
- Open d20-compatible mechanical hooks where appropriate.
- Copyable or exportable output.
- Cross-links to wiki entries and other modules.
- A clear distinction between lore, GM-only material, and rules-facing conversion material.

## Sequential build order

### Stage 1 — Floating Island / Skyland Editor

Reason: This is the root environment object. It feeds settlement generation, route planning, airship travel, resource scarcity, faction pressure, ecology, markets, and encounters.

Core source themes:

- Floating landmasses are unstable and may drift, fracture, or break trade routes.
- Water is rare in the open sky and must be stored, transported, gathered from rain, or controlled politically.
- Sky ecology provides hazards, materials, herds, predators, and magical resources.
- Settlements survive through fortification, local resources, faction support, trade access, and social adaptation.
- Different peoples respond to floating instability in different ways: fortified stonework, mobile survival, magical stabilization, technological adaptation, sky warfare, or trade flexibility.

Editor outputs:

- Island identity and role.
- Size, altitude, stability, drift, anchor status, and fracture risk.
- Terrain, biome, resources, and ecology.
- Water profile, food profile, and supply pressure.
- Settlement viability and construction notes.
- Route and airship approach difficulty.
- Faction pressure and political conflict.
- Encounter prompts, market prompts, crisis prompts, and wiki draft output.

### Stage 2 — Settlement / Skyport Editor

Builds villages, skyports, fortified communities, farming islands, company camps, pilgrimage stops, guild enclaves, and refugee settlements.

Depends on Stage 1 island outputs.

### Stage 3 — Airship / Vessel Editor

Builds ships by hull culture, core, purpose, crew, cargo, armament, condition, maintenance pressure, legality, and travel role.

Depends on Stage 1 routes and Stage 2 ports.

### Stage 4 — Market / Supply Editor

Builds shops, stalls, water sellers, black-market dealers, repair yards, guild vendors, cargo brokers, and scarcity-driven prices.

Depends on Stage 1 resources, Stage 2 settlement demand, and Stage 3 ship logistics.

### Stage 5 — Faction / Guild Editor

Builds public purpose, hidden agenda, fleet assets, territory, leadership, rivals, clients, reputation, corruption, and campaign hooks.

Depends on all prior editors.

### Stage 6 — Route / Region Editor

Builds abstract maps, air lanes, storm belts, pirate zones, dragon airspace, water routes, salvage corridors, and survey claims.

Depends on island, settlement, vessel, and faction outputs.

### Stage 7 — Ecology / Creature Editor

Builds sky creatures, herds, predators, disease risks, materials, hunting pressure, conservation concerns, and encounter behavior.

Depends on terrain, altitude, and scarcity outputs.

### Stage 8 — Encounter / Job Board Editor

Builds playable mission packets: patron, location, travel problem, faction pressure, reward, complication, timer, and consequences.

Depends on all earlier editors.

## Implementation standard for every editor

Each editor should have:

1. A JSON configuration file under `data/kaysender/editors/`.
2. A schema or documented output shape under `data/kaysender/schemas/`.
3. A runtime view in JavaScript.
4. A related wiki entry or entries.
5. Registry module integration.
6. Exportable output.
7. A smoke-test checklist entry.
8. Development history entry.

## Current active implementation

Stage 1 is now the active workstream:

- `data/kaysender/editors/floating-island-editor.json`
- `data/kaysender/schemas/floating-island-profile.schema.json`
- `kaysender-editors.js`

The initial editor is designed to produce a structured island profile and a draft wiki entry from the selected variables.
