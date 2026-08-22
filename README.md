# HB TTRPG Tools

A lightweight, browser-based toolkit for homebrew tabletop RPG tools, utilities, generators, and campaign-setting support.

The project is intentionally simple: plain HTML, CSS, JSON, and JavaScript. It can run directly from GitHub Pages without an application build step.

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