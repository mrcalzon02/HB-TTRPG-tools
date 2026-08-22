# Donjon Fractal World Generator — Upstream Reference

This package records the provenance of the fractal world-generation source exposed by Donjon at:

- Source/documentation page: https://donjon.bin.sh/code/world/
- Original source: https://donjon.bin.sh/code/world/worldgen-2.2.c
- Donjon-hosted corrected source: https://donjon.bin.sh/code/world/worldgen-2.2a.c

Donjon credits the original fractal world generator to **John Olsson** and describes the algorithm as repeated random great-circle faulting, followed by histogram-based sea-level selection and map projection. Donjon states that both linked C source versions are provided under GNU GPL version 2. The source header itself permits GPL version 2 or, at the user's option, any later version.

## Archive role

This is an upstream reference package, not the authoritative HB-TTRPG world generator.

The intended project-native adaptation should separate reusable concepts into deterministic services such as:

- seeded elevation/fault generation,
- land/water ratio selection,
- latitude/ice or climate masks,
- projection transforms,
- continent/region extraction,
- semantic biome/settlement/faction overlays,
- renderer-independent map data.

The resulting engine can serve generic world maps, campaign continents, alien planets, strategic maps, planetary survey tools, and mirrored AI/tool calls without duplicating logic.

See `WORLD-ADAPTATION.md` for the project integration boundary and `UPSTREAM-MANIFEST.json` for machine-readable provenance.
