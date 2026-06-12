# HB TTRPG Tools

A lightweight, browser-based toolkit for homebrew tabletop RPG tools, utilities, and generators.

The project is intentionally simple: plain HTML, CSS, and JavaScript. It can run directly from GitHub Pages without a build step.

## Current structure

- `index.html` — main menu page and tool interface.
- `styles.css` — shared visual system, responsive panel layouts, and print/PDF styling.
- `app.js` — tab navigation, panel layout controls, character-sheet math, autosave, import/export, and print-to-PDF helpers.
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

## Panel layout system

The sheet can be switched between modular 2-panel, 3-panel, and 4-panel layouts. Future tools can reuse the same `.panel-grid`, `.panels-2`, `.panels-3`, and `.panels-4` layout classes.

## Local use

Open `index.html` in a browser.

## GitHub Pages

This repo includes a Pages workflow. Once GitHub Pages is enabled for the repository using GitHub Actions as the source, pushes to `main` will publish the static site.

## Roadmap placeholders

Future additions can fill in:

- Tools: rule references, encounter aids, campaign helpers
- Utilities: sheet builders, trackers, printable aids
- Generators: NPCs, treasure, settlements, encounters, dungeons, factions, rumors, and homebrew item builders

This project is for homebrew tabletop use and avoids copying any official proprietary sheet layout or protected rulebook text.