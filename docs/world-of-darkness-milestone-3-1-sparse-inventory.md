# Milestone 3.1 — Sparse Supernatural Inventory Expansion

**Status: Complete**

This milestone corrects the earlier assumption that every mapped business should receive a definitive supernatural role.

## Completed goals

- Expanded the location system from 70 to 210 deterministic variants.
- Applied twenty-one context states to each of ten canonical urban location archetypes.
- Separated supernatural inventory status from ordinary location type and governance status.
- Established the following deterministic distribution:
  - 57.14% mundane.
  - 28.57% tangentially related.
  - 9.52% active but unregistered.
  - 4.76% formally inventoried.
- Ensured that 85.71% of locations are mundane or only tangential.
- Ensured that 95.24% of locations are absent from formal supernatural inventories.
- Removed definitive havens, caerns, chantries, custodians, occult catalysts, and active supernatural plots from mundane results.
- Made tangential results explicitly uncertain, historical, residual, witnessed, rumored, or route-adjacent.
- Reserved full supernatural infrastructure for active-unregistered and inventoried results.
- Added map-marker and business-card distinctions for all four inventory states.
- Added an inventory-status filter to the visible-business list.
- Added exact inventory totals to scan results.
- Added central-registry validation for inventory status.
- Added `scripts/validate-wod-location-inventory.mjs` to prevent distribution regressions.

## Active files

- `world-of-darkness-spatial-engine-inventory.js`
- `data/world-of-darkness/locations_core_v2.json`
- `data/world-of-darkness/spatial-engine-config.json`
- `scripts/validate-wod-location-inventory.mjs`
- `scripts/ingest-wod-poi-issue.mjs`

## Next sequential work

Milestone 4 resumes with persistence of the selected game line, inventory filter, business-type filter, text filter, and selected business. It should then add faction and political-pressure filters without changing the sparse-inventory distribution established here.
