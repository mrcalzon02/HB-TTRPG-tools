# Shared Topology Engine — Donjon-Informed Adaptation Rules

## Architectural purpose

Donjon is preserved here because its generation order provides a reusable spatial model for several HB-TTRPG-tools generators. The project should implement **one authoritative topology engine** and supply it with different semantic programs rather than maintaining unrelated dungeon, module, station, and vessel layout algorithms.

The topology engine owns spatial relationships and connectivity. Domain generators own meaning.

## Current implementation status

The Modules workspace now uses `module-random-dungeon-generator.js` as the authoritative browser implementation for Donjon-informed random module topology. It is an original project JavaScript implementation of the reference generation phases and does not execute or transplant the upstream Perl source at runtime.

The visible reference corpus is registered in `data/modules/module-inventory.json` and exposed through `data/modules/module-index.json` plus `module-reference-library.js`. Preserved examples are deliberately treated as examples, templates, and use cases rather than as loose archival source files. The current corpus includes the extracted Northern Watchtower and Veteck Henrina'yea modules plus preserved source references such as Caves of Whispering Wild, Secret Chambers of Sabiesha, Secret Prison of Souls, Tomb of Antwig, and other module/adventure examples.

The first implementation target is the generic adventure-module generator. Its topology stages are now field masking, room emplacement, room opening/door selection, corridor tunneling with configurable directional persistence, stair placement, dead-end pruning, cleanup/validation statistics, and conversion into Module Map Editor state. Small 39 × 39 and huge 73 × 65 presets correspond to dimensions represented by the example corpus.

## Reference generation phases

The shared engine should expose project-native equivalents of these general phases:

1. **Initialize spatial field** — establish dimensions, masks, forbidden cells, hull/footprint shape, deck boundaries, and seeded randomness.
2. **Place semantic spaces** — fit required and optional rooms/zones while respecting collision and adjacency constraints.
3. **Open spaces** — select valid entrances, doors, hatches, or apertures according to space size and topology requirements.
4. **Build connectivity** — carve corridors, passages, service routes, or transit trunks using configurable directional persistence and routing behavior.
5. **Place connectors** — insert stairs, ladders, lifts, shafts, ramps, airlocks, docking passages, or deck-to-deck hatches as the consuming domain requires.
6. **Clean topology** — prune unwanted dead ends, repair isolated regions, enforce reachability, and preserve deliberately required cul-de-sacs.
7. **Validate graph** — verify that critical semantic spaces satisfy accessibility, redundancy, security-zone, and route constraints.
8. **Render** — translate the validated topology into the consuming generator's visual language only after the graph is mechanically coherent.

## Semantic-first requirement

The engine must accept a semantic program instead of inventing purpose after geometry.

For a generic adventure module, the program may request an entry region, encounter spaces, objective rooms, hazards, secret routes, service corridors, vertical connectors, and exits.

For an alien vessel, the program can be assembled from race, faction, technology, mission, scale, and crew generators. A vessel might therefore require propulsion, power generation/distribution, command, sensors, life support, habitation, medical, cargo, maintenance, docking, weapons, laboratories, fabrication, biological systems, or culturally specific spaces before topology begins.

Those spaces receive functional adjacency and separation constraints. Examples include propulsion near engineering support, medical reachable from habitation, docking connected to cargo handling, command protected from exterior access, hazardous power systems isolated from crew areas, and maintenance routes reaching critical machinery.

## Multi-deck generalization

A stair is treated as one member of a broader connector class. The same topology contract should support:

- stair up / stair down;
- ladder or maintenance ladder;
- lift or elevator;
- ramp;
- hatch;
- pressure airlock;
- vertical service shaft;
- transit tube;
- faction- or species-specific movement systems.

This allows the same engine to operate on terrestrial structures and multi-deck spacecraft without maintaining separate connectivity logic.

## Variation without duplicated engines

Consumers may configure footprint masks, corridor persistence, dead-end tolerance, room density, connector density, symmetry, redundancy, damage state, and cultural/technological biases. Those are parameters and constraints on one engine, not justification for cloned implementations.

## Provenance rule

Any production implementation materially informed by this reference should link back to:

`SRC/third-party/donjon-dungeon/README.md`

and retain upstream credit to:

https://donjon.bin.sh/code/dungeon/

The native topology engine should use original project code unless direct source adaptation is deliberately chosen and licensed accordingly.
