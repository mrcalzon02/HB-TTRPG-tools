# World Generation Adaptation Boundary

## Purpose

Use the Donjon/John Olsson world-generation reference to inform a reusable HB-TTRPG planetary/world topology pipeline while preserving clear provenance and licensing boundaries.

## Reference concepts

The upstream documentation describes a pipeline based on repeated random great-circle faulting, histogram-derived sea level, elevation coloring, and selectable projections. These concepts are useful beyond a single fantasy world map.

## Project-native service model

A future shared world engine should expose renderer-independent structured output:

1. seeded world parameters,
2. elevation field,
3. sea-level threshold and land/water mask,
4. latitude/climate/ice masks,
5. connected landmass and ocean regions,
6. projection-ready coordinates,
7. semantic overlays supplied by domain generators,
8. validation metrics,
9. render/export adapters.

Semantic overlays should come from the campaign domain rather than the terrain algorithm. Examples include cultures, factions, species, technology levels, settlement density, hazards, political borders, trade routes, alien biospheres, and exploration sites.

## Consumers

The same native world engine should be usable by:

- generic fantasy/science-fiction world generators,
- campaign-region generators,
- alien planet generators,
- strategic faction maps,
- exploration/survey tools,
- settlement and route generators,
- browser UI,
- mirrored callable tools / MCP or API adapters.

## Licensing rule

Do not erase the GPL boundary by copying upstream implementation into a file labeled as project-native permissive code. If implementation is independently authored from algorithmic concepts, document that fact and retain this provenance link. If GPL implementation expression is incorporated or translated, treat that resulting implementation under the applicable GPL obligations.
