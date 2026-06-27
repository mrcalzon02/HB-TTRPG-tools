# Chronicle Spatial Engine Implementation

The binding source document is stored in the repository at:

`SRC/world-of-darkness/chronicle-spatial-engine-governance.docx`

## No-paid-API deployment amendment

The master document originally illustrates direct `google.maps.places.Place` integration. The deployed GitHub Pages implementation deliberately avoids the paid Google Maps JavaScript and Places APIs.

The active client instead uses:

1. An ordinary no-key Google Maps embedded client window for searching, panning, zooming, and visual reference.
2. A full Google Maps launch button for selecting a real business and copying its share/browser URL.
3. A capture form for business name, address, Google Maps URL, type, latitude, and longitude.
4. URL parsing for full Google Maps links containing `@latitude,longitude`, `q=latitude,longitude`, or encoded `!3d...!4d...` coordinates.
5. Manual coordinate entry when Google supplies a shortened link that cannot be resolved by a cross-origin GitHub Pages client.

Google prevents a parent website from reading interactions inside an embedded Maps iframe. The client therefore cannot silently extract a clicked business from the no-key map window. The capture form is the explicit boundary that preserves a no-cost, no-key deployment.

## Deterministic universal baseline

A normalized business identity and its geocoded coordinates produce a stable `gmaps-xxxxxxxx` business key. The business key and six-decimal coordinates form the spatial token, which is processed by MurmurHash3 into a stable unsigned 32-bit seed.

That seed selects exactly one record from each 70-entry core table:

- `data/world-of-darkness/locations_core.json`
- `data/world-of-darkness/characters_core.json`
- `data/world-of-darkness/rumors_core.json`

Identical captured business details resolve the same baseline World of Darkness record in every browser without storing every unclaimed business in the repository.

## Business governance states

- `STANDARD_UNCLAIMED`: deterministic universal baseline.
- `SUPPORTIVE`: Part of the Veil; centrally or locally marked as welcoming interactive storytelling and community activity.
- `OPT_OUT`: Mundane Disconnect; supernatural lore is suppressed.

## Central and local persistence

The runtime uses three layers:

1. **Universal deterministic baseline** — regenerated from business identity and coordinates.
2. **Local Storyteller override** — stored in browser `localStorage` under the business key.
3. **Central repository override** — stored in `data/world-of-darkness/poi_registry.json` and visible to every browser after GitHub Pages deploys it.

## Writing to the repository without a browser token

Static GitHub Pages cannot securely push directly to its own repository. The runtime therefore generates a compact registry patch and opens a prefilled GitHub issue titled `[WOD-POI] ...`.

After submitting that issue, the repository owner manually runs `.github/workflows/ingest-wod-poi.yml` with the issue number. The workflow retrieves the issue body, validates the fenced JSON with `scripts/ingest-wod-poi-issue.mjs`, writes the entry to `poi_registry.json`, and commits it to `main`.

This exposes no GitHub token in browser code and requires no paid Google API integration. Repository Actions must have permission to write repository contents.

## Source preservation

The exact supplied DOCX is committed under `SRC/world-of-darkness/`, and its byte length and SHA-256 digest are recorded in `source-page-references/chronicle-spatial-engine.source.json`.
