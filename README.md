# HB TTRPG Tools

A lightweight, browser-based toolkit for homebrew tabletop RPG tools, utilities, generators, and campaign-setting support.

The project is intentionally simple: plain HTML, CSS, JSON, and JavaScript. It can run directly from GitHub Pages without a build step.

## Current structure

- `index.html` — main menu page, character sheet utility, Kaysender module dashboard, and script loading.
- `styles.css` — shared visual system, responsive panel layouts, registry cards, and print/PDF styling.
- `app.js` — tab navigation, panel layout controls, character-sheet math, autosave, import/export, print-to-PDF helpers, registry rendering, and loading for the alpha Kaysender tool layer.
- `kaysender-tools.js` — alpha interactive Kaysender tools attached to the registry cards.
- `kaysender-wiki.js` — alpha hypertext wiki browser and cross-link layer between lore entries and modules.
- `data/kaysender-tools-registry.json` — machine-readable registry for planned and alpha Kaysender tools, utilities, and generators.
- `data/kaysender/wiki/entries.json` — seed Kaysender wiki entries with related-entry and related-module links.
- `data/kaysender/schemas/wiki-entry.schema.json` — schema for future Kaysender wiki entries.
- `docs/kaysender-tool-extraction.md` — first extraction framework for converting Kaysender into open d20-compatible campaign utilities.
- `docs/deployment.md` — GitHub Pages deployment and smoke-test guide.
- `.github/workflows/pages.yml` — optional GitHub Pages deployment workflow.

## First included utility

### D&D 3.5-compatible character sheet PDF creator

The current Utility page provides a browser-editable fantasy d20 character sheet with fields for:

- Basic character and player information
- Ability scores and modifiers
- Armor class, hit points, initiative, movement, BAB, grapple, and saves
- Skills with ranks, ability modifiers, miscellaneous modifiers, and totals
- Weapons, armor, equipment, feats, traits, notes, and spell notes

Use **Print / Save as PDF** in the browser to create a PDF copy. The sheet is designed to print cleanly on letter-sized paper.

## Kaysender setting framework

Kaysender is being migrated from a fifth-edition-framed source manuscript into an open d20 / Hypertext d20-compatible campaign operations suite.

The site includes a **Kaysender** dashboard that loads module cards from `data/kaysender-tools-registry.json`. The registry currently tracks planned and alpha modules for:

- Hypertext wiki support
- Open d20 compatibility scanning
- Floating island generation
- World map and route generation
- Settlement and district generation
- Population generation
- Shop and market stall generation
- Airship and vessel generation
- Airship core and construction frameworks
- Crafting, gadget, and equipment creation
- Supply, water, and survival planning
- Faction, guild, piracy, encounter, ecology, NPC, crew, job board, and crisis generation

The project should keep original Kaysender lore separate from rules-facing mechanical text. Any legacy fifth-edition phrasing should be converted before being treated as reusable public rules content.

## Current alpha Kaysender tools

The following registry cards now launch working alpha tools:

- Kaysender Hypertext Wiki
- Open d20 Compatibility Scanner
- Floating Island Generator
- Settlement Generator
- Shop and Market Stall Generator
- Airship and Vessel Generator
- Supply, Water, and Survival Planner

These are campaign-operation utilities. They are not final balanced rules text and should be treated as drafting aids until the table data and conversion logic are expanded.

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
- Utilities: sheet builders, wiki browsing, conversion scanning, supply planners, trackers, printable aids
- Generators: NPCs, treasure, settlements, encounters, dungeons, factions, rumors, routes, markets, ships, and homebrew item builders

This project is for homebrew tabletop use and avoids copying any official proprietary sheet layout or protected rulebook text.
