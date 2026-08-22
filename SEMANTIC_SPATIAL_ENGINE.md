# Shared Semantic Spatial Generation System

The repository uses one shared spatial authority for procedural locations and vessels. Setting-specific generators are clients of this authority; they must not duplicate topology or geometry logic.

## Pipeline

`semantic program → connectivity requirements → spatial topology → geometry → content population → rendering / presentation`

The semantic program is authoritative. A mansion, tomb, sewer, fortress, academy, airship, or alien vessel must define what spaces exist and how they relate before rooms are positioned. Presentation code may render or edit the resulting structure, but it must not silently replace that semantic/topological decision layer.

## Authorities and clients

- `semantic-spatial-engine.js` — deterministic seeded topology and geometry authority. It builds the semantic graph, assigns decks, places non-overlapping rooms, creates same-deck corridors and boundary doors, creates paired interdeck connectors, prunes only safe optional dead ends, and validates reachability.
- `semantic-content-populator.js` — deterministic post-topology content authority. It reads room role, tags, entrance depth, access zone, danger, faction, adventure purpose, damage state, and rules target; it does not create geometry.
- `vessel-hull-envelope.js` — continuous vessel envelope authority used after spatial generation.
- `module-map-generator.js` — general site adapter. It selects a purpose-aware semantic program, calls the shared engine, calls the content population layer, and emits the existing `module-map-editor` `{ width, height, cells }` schema.
- `alien-vessel-generator.js` — Alpthon/alien-vessel semantic client of the shared engine and hull envelope.
- `kaysender-airship-generator.js` — Kaysender semantic client of the same shared engine, content layer, and hull envelope.

## Vessel hull envelope

Supported hull selectors remain `connected-skin` (`skin`, `connected`, `organic`), `oval` / `ellipse`, `capsule` / `pill`, `rectangle` / `box`, `square` / `cube`, and `circle` / `cylinder`. Tightness presets remain `skin-tight`, `tight`, `close`, `standard`, `loose`, and `very-loose`; numeric 0–1 selectors remain supported with 1 as tightest. Hull validation still requires complete interior containment, a nonempty outer shell, and a single connected footprint shared vertically across decks.

## Browser APIs

- `window.HBSemanticSpatialEngine.generate(spec)`
- `window.HBSemanticContentPopulator.populate(layout, options)`
- `window.HBVesselHullEnvelope.wrap(layout, options)`
- `window.generator.module_map.generate(spec)`
- `window.generator.alien_vessel.generate(spec)`
- `window.generator.kaysender_airship.generate(profile)`

Browser clients remain distinct:

- `module-map-generator-entry.js`
- `alien-vessel-generator-entry.js`
- `kaysender-airship-generator-entry.js` / `kaysender-airship-generator.html`

## Purpose-aware module generation

`generator.module_map.generate()` accepts `locationArchetype` (also `archetype` or `locationType`). Built-in profiles currently include:

`generic`, `mansion`, `manor`, `tomb`, `sewer`, `fortress`, `school`, `bunkhouse_compound`, `arcane_university`, `guildhall`, `temple`, `warehouse`, `laboratory`, `prison`, `hospital`, `mine`, `industrial_facility`, `hideout`, and `civic_building`.

Aliases such as `castle`, `military installation`, `academy`, `catacomb`, `crypt`, `sewers`, and `barracks` resolve to the appropriate canonical profile.

Archetypes are not cosmetic themes. They provide different room purposes, access patterns, service/public/private/security divisions, vertical organization, objectives, hazards, treasure/evidence opportunities, and special routes. Callers may still provide an explicit `roles` array; explicit roles replace the archetype's default room program while the archetype remains available as context for content population. An explicit `adjacency` array likewise overrides the default adjacency program.

Example:

```js
const map = generator.module_map.generate({
  seed: 'estate-17',
  locationArchetype: 'mansion',
  rulesTarget: 'open_d20',
  dangerLevel: 5,
  faction: 'House Valmere',
  adventurePurpose: 'investigation'
});
```

## Semantic content population

`semantic-content-populator.js` runs after topology generation and before presentation. It produces per-room arrays for:

- occupants / opposition
- social encounters
- traps
- environmental hazards
- security measures
- treasure
- evidence / clues
- objectives
- narrative discoveries
- locked / restricted areas
- secret access
- encounter pressure

The layer is deterministic for the topology seed plus content seed and rules target. It records provenance rather than blending rules families invisibly. Supported compatibility identifiers are:

- `open_d20` — open d20 / Hypertext d20-compatible
- `world_of_darkness` — World of Darkness
- `blacklight_continuum` — Blacklight Continuum
- `kaysender` — Kaysender, with open-d20-compatible presentation where required

The returned `compatibility.mechanicalDetailsAreSettingScoped` flag is deliberately explicit.

## Kaysender airship adapter

`generator.kaysender_airship.generate(profile)` consumes the vocabulary already used by the Kaysender Airship / Vessel Editor: vessel class, hull culture, core type, purpose, crew scale, cargo profile, armament, defense system, condition, legal status, and faction affiliation/entanglement.

Those values are semantic inputs, not just labels. Examples:

- vessel class controls deck count, scale, berth and cargo capacity;
- hull culture changes additional room programs, connectivity density, room scale, and default hull shape;
- core technology adds culture/technology-specific core support or ritual spaces;
- purpose adds mission planning or mission handling space;
- crew scale changes berth demand;
- cargo type can add cistern banks, passenger compartments, salvage processing, concealed contraband storage, medical stores, or ordnance cargo;
- armament and defenses add weapons, armory, and defense-control spaces;
- serious condition problems add damage-control infrastructure;
- irregular legal status adds concealed registry/papers infrastructure, while commissioned vessels can add orders/security space;
- faction entanglement can add a liaison / secure-communications compartment.

Kaysender then uses `vessel-hull-envelope.js` for the physical envelope and `semantic-content-populator.js` with `rulesTarget: 'kaysender'` for deterministic encounter/content population.

## Module editor compatibility

`module-map-editor.js` remains the manual/extraction/persistence/rendering authority. Generated maps continue to emit `width`, `height`, and `cells`, with walls, floors, labels, doors, and stairs encoded into the existing cell model. The generator adds semantic/layout/content metadata around that schema without removing the editor's image/PDF extraction, manual painting, JSON import/export, SVG export, labels, doors, secret doors, traps, stairs, or module-viewer bridge behavior.

## Validation

`tests/spatial-engine.test.js` exercises deterministic topology, required rooms, connectivity, non-overlap, corridor/door relationships, safe pruning, paired interdeck connectors, multi-deck reachability, module schema compatibility, archetype differentiation, custom-role preservation, deterministic content population, compatibility provenance, Kaysender input/culture differentiation, alien-vessel regression behavior, and hull containment/connectivity.

Run:

```sh
node --check semantic-spatial-engine.js
node --check semantic-content-populator.js
node --check module-map-generator.js
node --check kaysender-airship-generator.js
node --check module-map-generator-entry.js
node --check kaysender-airship-generator-entry.js
node tests/spatial-engine.test.js
```
