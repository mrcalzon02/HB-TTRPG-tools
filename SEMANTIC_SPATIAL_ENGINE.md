# Semantic Spatial Generation Engine

`semantic-spatial-engine.js` is the single geometry/topology authority for procedural module maps and alien-vessel interiors.

## Contract

Generation is semantic-first. Callers provide room/module roles, optional deck assignments, adjacency constraints, a seed, and layout bounds. The engine builds a connected semantic graph before assigning geometry. It then places non-overlapping room rectangles, routes same-deck Manhattan corridors, creates boundary doors, creates paired interdeck connectors, performs conservative dead-end pruning, and validates the result.

The engine is renderer-neutral. It returns nodes, edges, rooms, corridors, doors, connectors, bounds, and validation. Presentation adapters own conversion into a tile map, SVG, canvas, 3D view, or vessel-specific interface.

## Vessel hull envelope

`vessel-hull-envelope.js` is a derived physical-envelope layer. It does not decide semantic topology or room placement. It gathers the occupied room/corridor/connector volume from the shared engine and wraps that volume in one continuous footprint shared vertically across all decks.

Supported hull shape selectors include:

- `connected-skin` (`skin`, `connected`, and `organic` aliases)
- `oval` / `ellipse`
- `capsule` / `pill`
- `rectangle` / `box`
- `square` / `cube`
- `circle` / `cylinder`

Hull tightness presets are `skin-tight`, `tight`, `close`, `standard`, `loose`, and `very-loose`. Numeric values from 0 to 1 are also accepted, where 1 is tightest. The hull validator requires complete interior containment, a nonempty exterior shell, and a single connected footprint. The shared footprint across decks guarantees vertical skin continuity.

## Browser APIs

- `window.HBSemanticSpatialEngine.generate(spec)`
- `window.HBVesselHullEnvelope.wrap(layout, options)`
- `window.generator.module_map.generate(spec)`
- `window.generator.alien_vessel.generate(spec)`

`generator.module_map` converts a shared-engine layout into the existing `module-map-editor` `{width,height,cells}` schema. `generator.alien_vessel` uses the same engine for command, sensors, bio-printer labs, habitation, recreation, grow labs, cargo, engineering, mechanical, atmosphere/water, damage-control, and damaged compartments across multiple decks, then applies the hull envelope requested with `hullShape` and `hullTightness`.

## Validation

`tests/spatial-engine.test.js` is dependency-free and runs with Node:

```sh
node tests/spatial-engine.test.js
```

The acceptance test verifies deterministic same-seed output, graph reachability, zero room overlap, module-map schema compatibility, paired multi-deck connectors, vessel topology changes from semantic changes, hull containment, hull connectivity, shape aliases, and tightness behavior.

## Integration rule

Do not create a second procedural geometry implementation inside a setting-specific generator. Add semantic inputs, a physical-envelope layer, or a rendering adapter around this engine instead. Existing extraction/manual editing behavior remains independent and can consume the module adapter output without changing its storage schema.
