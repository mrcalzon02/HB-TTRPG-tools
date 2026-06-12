# Deployment Guide

HB TTRPG Tools is a static site. It does not require a package manager, bundler, build step, database, or server runtime.

## Current deployment target

Use GitHub Pages with GitHub Actions.

The workflow file is already present at:

- `.github/workflows/pages.yml`

The workflow publishes the repository root as the site artifact.

## Required GitHub repository setting

In the repository settings:

1. Open **Settings**.
2. Open **Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Save the setting.
5. Push to `main` or run the workflow manually.

The workflow will deploy the static site after GitHub Pages is enabled.

## Local testing

Do not rely on opening `index.html` directly from disk for full testing. Browser file restrictions may block JSON loading.

Use a small local static server from the repository root.

Example with Python:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

## Deployment smoke test

After deployment, confirm:

- The main navigation shows **Tools**, **Utilities**, **Generators**, and **Kaysender**.
- The Kaysender dashboard loads module cards from `data/kaysender-tools-registry.json`.
- The dashboard status line reports that the Kaysender registry loaded.
- Alpha modules display launch buttons.
- The **Kaysender Hypertext Wiki** card displays **Launch Alpha Wiki**.
- Wiki chips appear on registry cards and open related wiki entries.
- The wiki browser loads entries from `data/kaysender/wiki/entries.json`.
- Wiki search and category filtering work.
- Related wiki entry chips open other wiki entries.
- Related tool/generator chips push the Kaysender dashboard search toward matching modules.
- The following alpha tools open and produce results:
  - Kaysender Hypertext Wiki
  - Open d20 Compatibility Scanner
  - Floating Island Generator
  - Settlement Generator
  - Shop and Market Stall Generator
  - Airship and Vessel Generator
  - Supply, Water, and Survival Planner
- The character sheet still autosaves locally and prints through the browser print dialog.

## Current alpha deployment caveats

The Kaysender alpha tools are campaign-operation helpers, not finalized open d20 mechanical conversions.

The compatibility scanner is a keyword-based early warning system. It does not replace legal review, editorial review, or final rules conversion.

The generators currently use client-side JavaScript tables. Their outputs should be treated as quick GM-facing drafts until each generator gets a richer table file and balancing pass.

The wiki entries are seed operational entries. They are not a full manuscript migration and should remain separate from final rules-facing conversion material.

## Next deployment hardening tasks

- Add a visible version number to the site footer.
- Add a static smoke-test checklist page.
- Add richer JSON data tables under `data/kaysender/tables/`.
- Move generator tables out of JavaScript and into JSON.
- Move the module-to-wiki cross-link map out of JavaScript and into JSON.
- Add import/export for generated Kaysender entries.
- Add a richer wiki entry schema and expanded Kaysender wiki data files.
- Add GitHub issue templates for new modules, bugs, conversion tasks, and generator table requests.
