# Development History

## 2026-06-12 - Initial static site scaffold

Created the first version of HB TTRPG Tools as a plain HTML, CSS, and JavaScript static site.

Included:

- Main Tools / Utilities / Generators navigation.
- D&D 3.5-compatible browser-editable character sheet.
- Modular 2-panel, 3-panel, and 4-panel layout system.
- Browser print-to-PDF workflow.
- Local autosave and character JSON import/export.
- GitHub Pages workflow scaffold.

## 2026-06-12 - Kaysender extraction framework

Added the first Kaysender extraction framework for moving the setting from a fifth-edition-framed manuscript toward an open d20 / Hypertext d20-compatible campaign operations suite.

Included:

- `docs/kaysender-tool-extraction.md`
- `data/kaysender-tools-registry.json`
- Initial registry modules for wiki, conversion scanning, island generation, route generation, settlement generation, markets, airships, crafting, supply planning, factions, encounters, ecology, NPCs, jobs, tithe crises, and organization operations.

## 2026-06-12 - Kaysender dashboard and alpha tools

Added a Kaysender dashboard tab and registry-driven cards.

Added alpha tools:

- Open d20 Compatibility Scanner
- Floating Island Generator
- Settlement Generator
- Shop and Market Stall Generator
- Airship and Vessel Generator
- Supply, Water, and Survival Planner

Added deployment guide:

- `docs/deployment.md`

## 2026-06-12 - Hypertext wiki and cross-link layer

Added the first Kaysender wiki data and cross-linking system.

Included:

- `data/kaysender/wiki/entries.json`
- `data/kaysender/schemas/wiki-entry.schema.json`
- `data/kaysender/crosslinks/module-entry-map.json`
- `kaysender-wiki.js`
- `docs/cross-linking-plan.md`

The Kaysender Hypertext Wiki is now marked alpha. Registry cards receive wiki chips, wiki entries can link to related entries, and wiki entries can push the dashboard search toward related tools and generators.

## 2026-06-12 - Sequential editor staging and Floating Island editor-alpha

Added the staged editor plan and the first deeper source-derived editor.

Included:

- `docs/kaysender-editor-staging-plan.md`
- `data/kaysender/editors/floating-island-editor.json`
- `data/kaysender/schemas/floating-island-profile.schema.json`
- `kaysender-editors.js`

The Floating Island Generator is now marked `editor-alpha` and launches a detailed Skyland Editor. This editor exposes controls for island role, size, altitude, stability, drift, anchor status, terrain, water, food, resource, ecology, settlement footprint, faction pressure, cultural adaptation, route access, and threat clock.

The editor derives habitability, route value, conflict pressure, collapse risk, and GM complexity scores. It outputs GM notes, settlement hooks, route hooks, market hooks, encounter hooks, draft wiki-entry JSON, and full profile JSON.
