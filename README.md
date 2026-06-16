# HB TTRPG Tools

A lightweight, browser-based toolkit for homebrew tabletop RPG tools, utilities, generators, and campaign-setting support.

The project is intentionally simple: plain HTML, CSS, JSON, and JavaScript. It can run directly from GitHub Pages without a build step.

## Current structure

- `index.html` — main menu page, character sheet utility, Kaysender module dashboard, and script loading.
- `styles.css` — shared visual system, responsive panel layouts, registry cards, and print/PDF styling.
- `character-sheet-layout.css` — readability, spacing, and wide-panel layout polish for the character sheet.
- `app.js` — tab navigation, panel layout controls, character-sheet math, autosave, import/export, print-to-PDF helpers, registry rendering, and loading for the alpha Kaysender tool layer.
- `character-sheet-title.js` — migrates older local sheet titles and loads supplemental generator runtimes.
- `spell-creator.html` — standalone workspace for the project-standard Spell Creator.
- `spell-creator-vocabulary.js` — standard spell themes, class traditions, naming pools, descriptive prose, components, practical uses, and origins.
- `spell-creator-mechanics.js` — mechanical spell roles, delivery shapes, saves, conditions, ranges, components, damage and healing progression, caster-level scaling, and balance diagnostics.
- `module-spell-creator.js` — interactive Spell Creator controls, visible spell presentation, copy support, vocabulary auditing, and JSON export.
- `spell-creator-entry.js` — generator-menu launcher for the standalone Spell Creator.
- `kaysender-tools.js` — alpha interactive Kaysender tools attached to the registry cards.
- `kaysender-wiki.js` — alpha hypertext wiki browser and cross-link layer between lore entries and modules.
- `kaysender-editors.js` — staged deep-editor runtime, beginning with the Floating Island / Skyland Editor.
- `kaysender-settlement-editor.js` — staged deep-editor runtime for settlements and skyports.
- `kaysender-airship-editor.js` — staged deep-editor runtime for airships and vessels.
- `kaysender-npc-generator.js` — population-band NPC and crew generator runtime.
- `kaysender-crafting-generator.js` — Hypertext d20-compatible equipment, gadget, ship-module, ship-weapon, and airship-core recipe generator and construction simulator.
- `data/kaysender-tools-registry.json` — machine-readable registry for planned, alpha, and editor-alpha Kaysender tools, utilities, and generators.
- `data/kaysender/editors/editor-roadmap.json` — machine-readable production order, dependencies, required inputs, required outputs, and exit gates for all main-line editors.
- `data/kaysender/generators/npc-crew-generator.json` — NPC class, ancestry, narrative-table manifest, and population-band pack index.
- `data/kaysender/generators/npc-crew/bands-*.json` — 37 civilian, authority, outlaw, specialist, and airship population bands used by the NPC and Crew Generator.
- `data/kaysender/generators/crafting/crafting-generator.json` — crafting generator manifest containing complexity, facility, quality, scale, and mode definitions.
- `data/kaysender/generators/crafting/equipment-templates.json` — personal equipment, technical devices, survival gear, weapons, and armor-upgrade patterns.
- `data/kaysender/generators/crafting/ship-module-templates.json` — airship hull, support, navigation, weapon, defense, propulsion, and core patterns.
- `data/kaysender/generators/crafting/crafting-modifiers.json` — manufacturers, materials, power sources, legality, flaws, improvements, and complications.
- `data/kaysender/schemas/crafting-project.schema.json` — schema for exported crafting projects and later editor imports.
- `data/kaysender/wiki/wiki-index.json` — multi-pack wiki loader index.
- `data/kaysender/wiki/entries.json` — seed Kaysender wiki entries with related-entry and related-module links.
- `data/kaysender/wiki/*-depth.json` — deeper source-derived wiki packs for world, peoples, nations, factions/economy, and airships.
- `data/kaysender/editors/floating-island-editor.json` — source-derived configuration for the first staged deep editor.
- `data/kaysender/editors/settlement-editor.json` — source-derived configuration for the second staged deep editor.
- `data/kaysender/editors/airship-editor.json` — source-derived configuration for the third staged deep editor.
- `data/kaysender/schemas/wiki-entry.schema.json` — schema for future Kaysender wiki entries.
- `data/kaysender/schemas/floating-island-profile.schema.json` — schema for generated floating island profiles.
- `data/kaysender/schemas/settlement-profile.schema.json` — schema for generated settlement profiles.
- `data/kaysender/schemas/airship-profile.schema.json` — schema for generated airship profiles.
- `scripts/validate-crafting-data.mjs` — dependency-free validator for crafting manifests, template IDs, modes, scales, complexities, materials, power sources, and required fields.
- `scripts/validate-editor-roadmap.mjs` — validates production-stage numbering, dependencies, registry module coverage, and the single active next-stage rule.
- `docs/kaysender-tool-extraction.md` — first extraction framework for converting Kaysender into Hypertext d20-compatible campaign utilities.
- `docs/kaysender-editor-staging-plan.md` — human-readable production order and editor completion standards.
- `docs/deployment.md` — GitHub Pages deployment and smoke-test guide.
- `.github/workflows/pages.yml` — GitHub Pages deployment workflow with crafting-data, editor-roadmap, and JavaScript syntax validation.

## First included utility

### AD and D 3.5 - Hypertext D20 compatible character sheet

The current Utility page provides a browser-editable fantasy d20 character sheet with fields for:

- Basic character and player information
- Ability scores and modifiers
- Armor class, hit points, initiative, movement, BAB, grapple, and saves
- Skills with ranks, ability modifiers, miscellaneous modifiers, and totals
- Weapons, armor, equipment, feats, traits, notes, and spell notes

Use **Print / Save as PDF** in the browser to create a PDF copy. The sheet is designed to print cleanly on letter-sized paper.

## Kaysender setting framework

Kaysender is being migrated from a fifth-edition-framed source manuscript into a Hypertext d20-compatible campaign operations suite.

The site includes a **Kaysender** dashboard that loads module cards from `data/kaysender-tools-registry.json`. The registry currently tracks planned, alpha, and editor-alpha modules for:

- Hypertext wiki support
- Floating island generation and deep skyland editing
- World map and route generation
- Settlement, skyport, and district generation
- Population generation
- Shop and market stall generation
- Airship and vessel generation and deep vessel editing
- Airship core, ship-module, and construction systems
- Crafting, gadget, weapon, armor, and equipment creation
- Supply, water, and survival planning
- Faction, guild, piracy, encounter, ecology, NPC, crew, job board, and crisis generation

The project keeps original Kaysender lore separate from rules-facing mechanical text. Legacy fifth-edition mechanics are converted before being treated as reusable public rules content.

## Current alpha Kaysender tools

The following registry cards now launch working alpha or editor-alpha tools:

- Kaysender Hypertext Wiki
- Floating Island Generator and Skyland Editor
- Settlement Generator and Skyport Editor
- Shop and Market Stall Generator
- Airship and Vessel Generator and Editor
- Airship Core and Ship Module Builder
- Crafting, Gadget, and Equipment Creator
- Supply, Water, and Survival Planner
- NPC and Crew Generator

The general **Generators** page also launches the standalone **Spell Creator**, which is the project’s single standard spell-generation workflow.

### Spell Creator

The Spell Creator builds complete Hypertext d20-compatible spell drafts rather than flavor-only stubs. It provides spell level, class assignment, school, role, delivery shape, damage or energy type, saves or attack resolution, conditions, range, concentration, ritual casting, component burden, spell resistance, target or area, duration, damage or healing progression, caster-level caps, generous manifestation and origin text, practical-use guidance, automatic balance warnings, copyable full spell text, and JSON export.

The former split Normal and Eccentric spell placeholders are not part of the active generator system. All standard spell work is consolidated in `spell-creator.html` and its dedicated vocabulary, mechanics, and module files.

### NPC and Crew Generator

The NPC and Crew Generator supports 37 population bands ranging from children, elderly residents, laborers, farmers, artisans, scribes, government workers, clergy, and merchants through militia, professional soldiers, officers, mercenaries, bandits, criminals, smugglers, pirates, prisoners, refugees, explorers, and specialized airship crews.

It draws from eleven standard player classes, five standard NPC classes, and the converted Kaysender Airship Engineer, Air Captain, and Sky Warden class families.

### Crafting, Equipment, and Ship Systems Generator

The crafting engine currently contains 43 reusable project patterns:

- 19 personal-equipment, survival, technical, communication, medical, weapon, and armor patterns
- 13 general ship-module patterns
- 5 ship-weapon and defense patterns
- 6 airship-core patterns

Generated projects include:

- Hypertext d20 complexity and project DC
- Work units, staffing assumptions, and estimated labor days
- Material quality and facility modifiers
- Planned raw-material cost and draft market value
- Construction, research, and testing skills
- Operating effect, activation, limitations, weight, and module slot
- Power source and maintenance requirements
- Legal status, complication, planned improvements, and possible flaws
- Optional simulation of research, repeated construction checks, exceptional progress, material loss, minor or major failures, and final testing
- Individual project JSON, batch JSON, and draft wiki-entry export

The current complexity model uses Routine, Standard, Complex, Advanced, and Revolutionary projects with DCs from 10 to 30. Work is scaled from personal equipment through crew-served installations, ship modules, and major core systems.

These tools are campaign-operation and playtest utilities. Generated prices, save DCs, structural values, and ship effects should be tuned through campaign play before being treated as final publication-ready balance.

## Main-line editor production model

The original island, settlement, and airship stages are retained as prototype history. Production development now follows the dependency order in `data/kaysender/editors/editor-roadmap.json` and `docs/kaysender-editor-staging-plan.md`.

Only one main-line editor is implemented at a time. Random generators remain accelerators; they do not count as completed editors.

The production order is:

1. **P0 — Shared Editor Kernel and Profile Contract**
2. **P1 — Promote Floating Island / Skyland Editor**
3. **P2 — Population and Demographics Editor**
4. **P3 — Promote Settlement / Skyport Editor**
5. **P4 — City District, Civic Site, and Facility Editor**
6. **P5 — Crafting, Equipment, Ship Module, and Production Editor**
7. **P6 — NPC, Crew, Household, and Roster Editor**
8. **P7 — Promote Airship / Vessel Editor**
9. **P8 — Sky Ecology, Creature, Herd, and Disease Editor**
10. **P9 — World Region, Route, and Airspace Editor**
11. **P10 — Market, Supply Chain, Inventory, and Production Editor**
12. **P11 — Faction, Guild, Government, and Fleet Editor**
13. **P12 — Organization Operations, Finance, Logistics, and Project Editor**
14. **P13 — Black Market, Piracy, Smuggling, and Criminal Network Editor**
15. **P14 — Draconic Tithe, Settlement Crisis, and Intervention Editor**
16. **P15 — Encounter, Hazard, Chase, and Conflict Editor**
17. **P16 — Job Board, Mission Packet, and Campaign Hook Editor**

P0 is the required next implementation because the existing alpha editors duplicate shell behavior and use mismatched profile assumptions. The shared kernel will establish stable IDs, schema migration, validated inheritance, dedicated New blank record actions, local draft recovery, selective randomization, canonical exports, provenance, diagnostics, and common accessible controls before another specialized editor is built.

Each production editor must clear its documented exit gate before work advances to the next stage.

## Cross-linking model

The wiki entries use stable IDs and contain both `relatedEntries` and `relatedModules` arrays.

The dashboard cards also receive quick wiki chips, allowing a GM to jump from a generator card to relevant lore. Inside the wiki browser, related wiki entries open directly, while related tool/generator chips push the dashboard search toward the matching module.

Generated crafting projects can export draft wiki entries containing operation, construction, material, power, and maintenance sections.

## Panel layout system

The sheet can be switched between modular 2-panel, 3-panel, and 4-panel layouts. Future tools can reuse the same `.panel-grid`, `.panels-2`, `.panels-3`, and `.panels-4` layout classes.

## Local use

Open `index.html` through a local web server, or publish through GitHub Pages. Directly opening `index.html` from disk may block the JSON registry fetch in some browsers.

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/`.

## GitHub Pages

This repo includes a Pages workflow. Once GitHub Pages is enabled for the repository using GitHub Actions as the source, pushes to `main` will validate and publish the static site.

See `docs/deployment.md` for deployment and smoke-test steps.

## Roadmap placeholders

Future additions outside the established main-line editor order can fill in:

- Tools: expanded rule references and campaign reporting helpers
- Utilities: sheet builders, wiki browsing, printable aids, and migration utilities
- Generators: optional treasure, rumor, dungeon, and cosmetic-content generators that consume established editor records

This project is for homebrew tabletop use and avoids copying any official proprietary sheet layout or protected rulebook text.
