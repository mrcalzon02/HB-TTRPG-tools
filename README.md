# HB TTRPG Tools

A lightweight, browser-based toolkit for homebrew tabletop RPG tools, utilities, generators, and campaign-setting support.

The project is intentionally simple: plain HTML, CSS, JSON, and JavaScript. It can run directly from GitHub Pages without a build step.

## Current structure

- `index.html` — main menu page, character sheet utility, Kaysender module dashboard, and script loading.
- `styles.css` — shared visual system, responsive panel layouts, registry cards, and print/PDF styling.
- `character-sheet-layout.css` — readability, spacing, and wide-panel layout polish for the character sheet.
- `app.js` — tab navigation, panel layout controls, character-sheet math, autosave, import/export, print-to-PDF helpers, registry rendering, and loading for the alpha Kaysender tool layer.
- `character-sheet-title.js` — migrates older local sheet titles to the current Hypertext D20-compatible sheet label.
- `kaysender-tools.js` — alpha interactive Kaysender tools attached to the registry cards.
- `kaysender-wiki.js` — alpha hypertext wiki browser and cross-link layer between lore entries and modules.
- `kaysender-editors.js` — staged deep-editor runtime, beginning with the Floating Island / Skyland Editor.
- `kaysender-settlement-editor.js` — staged deep-editor runtime for settlements and skyports.
- `kaysender-airship-editor.js` — staged deep-editor runtime for airships and vessels.
- `data/kaysender-tools-registry.json` — machine-readable registry for planned, alpha, and editor-alpha Kaysender tools, utilities, and generators.
- `data/kaysender/generators/npc-crew-generator.json` — NPC class, ancestry, narrative-table manifest, and population-band pack index.
- `data/kaysender/generators/npc-crew/bands-*.json` — 37 civilian, authority, outlaw, specialist, and airship population bands used by the NPC and Crew Generator.
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
- `docs/kaysender-tool-extraction.md` — first extraction framework for converting Kaysender into Hypertext d20-compatible campaign utilities.
- `docs/kaysender-editor-staging-plan.md` — sequential plan for building one detailed editor at a time.
- `docs/deployment.md` — GitHub Pages deployment and smoke-test guide.
- `.github/workflows/pages.yml` — optional GitHub Pages deployment workflow.

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
- Airship core and construction frameworks
- Crafting, gadget, and equipment creation
- Supply, water, and survival planning
- Faction, guild, piracy, encounter, ecology, NPC, crew, job board, and crisis generation

The project should keep original Kaysender lore separate from rules-facing mechanical text. Any legacy fifth-edition phrasing should be converted before being treated as reusable public rules content.

## Current alpha Kaysender tools

The following registry cards now launch working alpha or editor-alpha tools:

- Kaysender Hypertext Wiki
- Floating Island Generator and Skyland Editor
- Settlement Generator and Skyport Editor
- Shop and Market Stall Generator
- Airship and Vessel Generator and Editor
- Supply, Water, and Survival Planner
- NPC and Crew Generator

The NPC and Crew Generator supports 37 population bands ranging from children, elderly residents, laborers, farmers, artisans, scribes, government workers, clergy, and merchants through militia, professional soldiers, officers, mercenaries, bandits, criminals, smugglers, pirates, prisoners, refugees, explorers, and specialized airship crews. It can draw from eleven standard player classes, five standard NPC classes, or the indexed Kaysender Airship Engineer, Air Captain, and Sky Warden class concepts. Custom-class numerical mechanics remain explicitly marked conversion-pending.

These are campaign-operation utilities. They are not final balanced rules text and should be treated as drafting aids until the table data and conversion logic are expanded.

## Sequential editor model

The staged editor plan builds one complete editor at a time.

Stage 1 is the **Floating Island / Skyland Editor**. It uses a JSON configuration file to expose manual controls, randomization, derived scores, GM notes, settlement hooks, route hooks, market hooks, encounter hooks, full JSON export, and draft wiki-entry export.

Stage 2 is the **Settlement / Skyport Editor**. It can inherit island context and produces settlement survival, trade, defense, unrest, job, and wiki outputs.

Stage 3 is the **Airship / Vessel Editor**. It can inherit island and settlement context and produces vessel, cargo, crew, route, faction, maintenance, encounter, and wiki outputs.

Later editors should follow the same pattern:

1. JSON configuration.
2. Output schema.
3. Runtime UI.
4. Cross-links to wiki entries and modules.
5. Exportable structured output.
6. Source-safe lore and Hypertext d20-compatible rules-facing language.

## Cross-linking model

The wiki entries use stable IDs and contain both `relatedEntries` and `relatedModules` arrays.

The dashboard cards also receive quick wiki chips, allowing a GM to jump from a generator card to relevant lore. Inside the wiki browser, related wiki entries open directly, while related tool/generator chips push the dashboard search toward the matching module.

This is the first practical bridge between setting lore, campaign utilities, and generator operations.

## Panel layout system

The sheet can be switched between modular 2-panel, 3-panel, and 4-panel layouts. Future tools can reuse the same `.panel-grid`, `.panels-2`, `.panels-3`, and `.panels-4` layout classes.

## Local use

Open `index.html` through a local web server, or publish through GitHub Pages. Directly opening `index.html` from disk may block the JSON registry fetch in some browsers.

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/`.

## GitHub Pages

This repo includes a Pages workflow. Once GitHub Pages is enabled for the repository using GitHub Actions as the source, pushes to `main` will publish the static site.

See `docs/deployment.md` for deployment and smoke-test steps.

## Roadmap placeholders

Future additions can fill in:

- Tools: rule references, airship construction, crafting systems, organization operations, campaign management helpers
- Utilities: sheet builders, wiki browsing, supply planners, trackers, printable aids
- Generators: treasure, settlements, encounters, dungeons, factions, rumors, routes, markets, ships, and homebrew item builders

This project is for homebrew tabletop use and avoids copying any official proprietary sheet layout or protected rulebook text.
