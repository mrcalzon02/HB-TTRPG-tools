# HB TTRPG Tools

A lightweight, browser-based toolkit for homebrew tabletop RPG tools, utilities, generators, and campaign-setting support.

The project is intentionally simple: plain HTML, CSS, JSON, and JavaScript. It can run directly from GitHub Pages without an application build step.

## Blacklight Intelligence: Charles

Charles now has two repository-level reference documents intended for both human authors and AI integrations:

- [Charles Personality Profile](docs/blacklight/charles-personality-profile.md) — the human-readable baseline for who Charles is, how he speaks, how he behaves, his relationship to the user, operating modes, and canon discipline.
- [Charles Personality Engram Specification](docs/blacklight/charles-personality-engram.md) — the compact `CE1` semantic personality capsule for token-efficient prompt assembly across GPT, Gemini, Claude, local models, and other reasoning layers.

The profile and engram describe Charles's presentation and response logic. Specific Blacklight facts, history, campaign state, and deeper Charles lore remain authoritative in the relevant repository sources and should be retrieved only when needed.

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
- `kaysender-editors.js` — Floating Island / Skyland domain editor runtime.
- `kaysender-settlement-editor.js` — Settlement / Skyport domain editor runtime.
- `kaysender-airship-editor.js` — Airship / Vessel domain editor runtime.
- `kaysender-editor-kernel.js` — canonical profile envelope, stable IDs, revisions, locks, drafts, context adaptation, and base diagnostics.
- `kaysender-editor-field-mapping.js` — shared nested and flat profile-to-form mapping service.
- `kaysender-editor-adapter-registry.js` — adapter contract and registry used by separate domain editors.
- `kaysender-editor-builtins.js` — registered Island, Settlement, and Airship adapters and current schema versions.
- `kaysender-editor-migrations.js` — versioned profile migration registry, including legacy flat Island migration to schema `2.0.0`.
- `kaysender-editor-kernel-adapters.js` — schema compatibility, adapter activation, pinned inheritance, and import normalization.
- `kaysender-editor-lifecycle.js` — dirty-state tracking, autosave, recovery, and unsaved-change protection.
- `kaysender-editor-repository.js` — persistent multi-record browser repository and index repair.
- `kaysender-editor-production.js` — generic shared editor shell and lifecycle actions.
- `kaysender-editor-record-library.js` — identity-safe record saving, cloning, opening, deletion, and visible record identity.
- `kaysender-editor-parent-library.js` — direct saved-parent selection, pinned revision health, and deliberate parent refresh.
- `kaysender-editor-error-boundary.js` — recoverable runtime diagnostics.
- `kaysender-editor-live-smoke.js` — integrated Island → Settlement → Airship browser smoke chain and receipt generation.
- `kaysender-npc-generator.js` — population-band NPC and crew generator runtime.
- `kaysender-crafting-generator.js` — Hypertext d20-compatible equipment, gadget, ship-module, ship-weapon, and airship-core recipe generator and construction simulator.
- `data/kaysender-tools-registry.json` — machine-readable registry for planned, alpha, and editor-alpha Kaysender tools, utilities, and generators.
- `data/kaysender/editors/editor-roadmap.json` — machine-readable production order, dependencies, required inputs, required outputs, and exit gates for all main-line editors.
- `data/kaysender/editors/p0-implementation-status.json` — machine-readable P0 implementation and promotion state.
- `data/kaysender/schemas/editor-profile-envelope.schema.json` — canonical shared editor envelope with pinned-revision inheritance.
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
- `data/kaysender/editors/floating-island-editor.json` — source-derived configuration for the Floating Island editor.
- `data/kaysender/editors/settlement-editor.json` — source-derived configuration for the Settlement editor.
- `data/kaysender/editors/airship-editor.json` — source-derived configuration for the Airship editor.
- `data/kaysender/schemas/wiki-entry.schema.json` — schema for future Kaysender wiki entries.
- `data/kaysender/schemas/floating-island-profile.schema.json` — schema for generated floating island profiles.
- `data/kaysender/schemas/settlement-profile.schema.json` — schema for generated settlement profiles.
- `data/kaysender/schemas/airship-profile.schema.json` — schema for generated airship profiles.
- `scripts/validate-crafting-data.mjs` — dependency-free validator for crafting manifests, template IDs, modes, scales, complexities, materials, power sources, and required fields.
- `scripts/validate-editor-roadmap.mjs` — validates production-stage numbering, dependencies, registry coverage, P0 outputs, and the single active next-stage rule.
- `scripts/validate-editor-kernel.mjs` — validates base envelope behavior, revisions, draft protection, domain context adaptation, and generic shell markers.
- `scripts/validate-editor-migrations.mjs` — functionally validates legacy Island migration and idempotence.
- `scripts/validate-editor-adapter-integration.mjs` — validates current, legacy, outdated, future, and wrong-profile behavior through the complete adapter import path.
- `scripts/validate-editor-inheritance.mjs` — validates pinned inheritance references and legacy-reference normalization.
- `scripts/validate-editor-runtime-structure.mjs` — validates shared runtime structure and runs the adapter and inheritance integration tests.
- `scripts/run-p0-browser-verification.mjs` — runs the integrated P0 browser gate in Playwright Chromium.
- `scripts/validate-p0-browser-verification.mjs` — validates the P0 receipt, smoke harness, runner, and Pages workflow contract.
- `docs/kaysender-tool-extraction.md` — first extraction framework for converting Kaysender into Hypertext d20-compatible campaign utilities.
- `docs/kaysender-editor-staging-plan.md` — human-readable production order and editor completion standards.
- `docs/development-history.md` — architecture and implementation milestones.
- `docs/deployment.md` — GitHub Pages deployment, Chromium gate, artifacts, and smoke-test guide.
- `.github/workflows/pages.yml` — blocking validation, Chromium smoke, artifact upload, and GitHub Pages deployment workflow.

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

The original Island, Settlement, and Airship stages are retained as prototype history. Production development follows the dependency order in `data/kaysender/editors/editor-roadmap.json` and `docs/kaysender-editor-staging-plan.md`.

Only one main-line editor is implemented at a time on the single active branch `main`. Random generators remain accelerators; they do not count as completed editors.

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

### P0 shared framework status

The P0 framework implementation is complete and recorded as `framework-implementation-complete-pending-runtime-gate`.

The shared infrastructure now supplies separate registered editors with:

- stable record identity and revision behavior;
- explicit schema versions and versioned migrations;
- nested and legacy-flat field mapping;
- malformed, wrong-profile, outdated, and future-schema diagnostics;
- recovery drafts, dirty-state tracking, and unsaved-change protection;
- persistent multi-record storage;
- explicit **Update Existing Record** and **Save as New Clone** behavior;
- pinned-revision inheritance with current, stale, unavailable, and locally older reference states;
- direct saved-parent selection and deliberate **Refresh to Latest Parent** behavior;
- canonical JSON, wiki drafts, provenance, locks, validation, and recoverable diagnostics.

P0 is not promoted by code completion alone. The integrated Island → Settlement → Airship Chromium gate must pass on `main`, produce a valid P0 verification receipt, and reach deployment successfully. Until that occurs, P0 remains the sole `required-next` stage and P1 remains closed.

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

This repository includes a blocking Pages workflow. Pushes to `main` run all validators, install Playwright Chromium, execute the integrated P0 browser gate, validate its receipt, upload the `p0-browser-verification` artifact, and deploy only after success.

See `docs/deployment.md` for the pipeline, artifact contents, local commands, and promotion rules.

## Roadmap placeholders

Future additions outside the established main-line editor order can fill in:

- Tools: expanded rule references and campaign reporting helpers
- Utilities: sheet builders, wiki browsing, printable aids, and migration utilities
- Generators: optional treasure, rumor, dungeon, and cosmetic-content generators that consume established editor records

This project is for homebrew tabletop use and avoids copying any official proprietary sheet layout or protected rulebook text.

## Terms of Service & Usage Agreement

**Last Updated: July 7, 2026**

### 1. Nature of Service

This website (hereinafter referred to as the "Platform") serves as a private, non-commercial, fan-made utility suite intended exclusively for the facilitation of tabletop role-playing games (TTRPGs). The Platform is provided on an "as-is" and "as-available" basis. The developer makes no representations or warranties of any kind, express or implied, regarding the accuracy, reliability, or availability of the tools, generators, or data contained herein.

### 2. Intellectual Property & Third-Party Rights

The developer acknowledges and respects the intellectual property rights of all third-party entities.

**External IP:** References to systems, lore, or terminology belonging to established intellectual properties, including but not limited to World of Darkness (Paradox Interactive), Shadowrun (Topps Company, Inc.), and other associated systems, remain the sole and exclusive property of their respective license holders.

**No Affiliation:** This Platform is an independent, unofficial project and is not affiliated with, endorsed by, or sponsored by the aforementioned intellectual property owners.

**Original Material:** All original code, architecture, and proprietary UI elements developed for this Platform are provided under the terms outlined in Section 3.

### 3. Permitted Use (the "Anti-License")

The objective of this Platform is to support personal creative expression. Users are granted the following permissions regarding the non-commercial use of this material:

**Personal Use:** Users are authorized to utilize all generators, workspaces, and utilities for private, non-commercial tabletop gaming sessions.

**Adaptation:** Users may view, adapt, and modify the underlying source code for personal, private projects.

**Prohibition of Commercial Exploitation:** Any commercial use, sale, redistribution for profit, or inclusion of this Platform’s source code or proprietary lore assets in commercial products is strictly prohibited.

**Attribution:** While not mandated, credit to the original creator is appreciated when adaptations are shared within non-commercial hobbyist circles.

### 4. Limitation of Liability

Under no circumstances shall the developer of this Platform be held liable for any direct, indirect, incidental, or consequential damages arising from the use of, or inability to use, these tools. This includes, but is not limited to, loss of campaign data, technical failures during sessions, or disruptions to game-play environments.

### 5. Governance

By accessing this Platform, the user acknowledges that the Platform’s primary purpose is the advancement of the tabletop hobby. The developer reserves the right to modify these terms, deprecate tools, or restructure the Platform’s offerings at their sole discretion without prior notice to ensure the continued security and integrity of the project.

For inquiries regarding the scope of these terms, please refer to the project repository metadata.
