# Shadowrun Street View Sprawl Discovery - Stage 1

Stage 1 adds the first operable Shadowrun spatial tool.

The tool generates nearby Shadowrun-ready locations from a real-world origin without requiring API keys or live map data. It accepts a seed, label, latitude, longitude, radius, site count, discovery focus, and threat profile. It returns deterministic site keys, nearby coordinates, Maps links, Street View links, run-facing hooks, security posture, Matrix surface, magical texture, clues, legwork, related nearby sites, and exportable JSON, GeoJSON, and KML.

## Files

- `shadowrun-sprawl-discovery-engine.js`
- `shadowrun-sprawl-discovery.js`
- `scripts/validate-shadowrun-sprawl-discovery.mjs`
- `scripts/run-shadowrun-sprawl-discovery-browser-verification.mjs`
- `data/shadowrun/sprawl-discovery-phase-status.json`

## Verification

Run:

```bash
node --check shadowrun-sprawl-discovery-engine.js
node --check shadowrun-sprawl-discovery.js
node --check shadowrun-entry.js
node --check scripts/validate-shadowrun-sprawl-discovery.mjs
node scripts/validate-shadowrun-sprawl-discovery.mjs artifacts/shadowrun-sprawl-discovery-verification.json
node scripts/run-shadowrun-sprawl-discovery-browser-verification.mjs artifacts/shadowrun-sprawl-discovery-browser-verification.json artifacts/shadowrun-sprawl-discovery-browser-verification-failure.png
```

The consolidated project gate also includes the static validator through `scripts/validate-npc-all-phases.mjs`.

## Next Adjacent Slices

1. Add optional OpenStreetMap named-place ingestion for live nearby named sites.
2. Promote selected discovery sites into the Facility, Security, and Response Planner.
3. Connect a chosen site package to the Mission and Complication Generator.
4. Add a campaign archive for generated neighborhoods, runs, and after-action notes.
