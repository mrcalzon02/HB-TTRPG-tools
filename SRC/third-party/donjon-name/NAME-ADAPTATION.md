# Name Generation Adaptation Boundary

## Purpose

Build one reusable project-native naming engine that can consume canonical HB-TTRPG corpora and serve many generator families without duplicating naming logic.

## Shared engine contract

The engine should accept a named corpus/profile plus deterministic generation options and return structured results such as:

- generated name,
- corpus/profile id and version,
- seed,
- length constraints,
- optional prefix/suffix or phonotactic constraints,
- confidence/quality diagnostics,
- provenance of the project-native corpus used.

## Canonical consumers

The same engine can support:

- people and NPC names,
- race/species names,
- cultures and languages,
- factions and corporations,
- settlements and nations,
- planets and star systems,
- ships and ship classes,
- technologies and artifacts,
- modules/adventures,
- browser generators,
- mirrored callable AI tools.

## Integration rule

The naming engine should not own lore. Race/faction/culture generators supply the corpus and constraints; the naming engine supplies statistically coherent candidate strings.

For alien-vessel generation this permits a chain such as:

race/culture profile -> naming corpus -> faction vocabulary -> vessel-class grammar -> generated ship name

while the shared topology engine independently handles the vessel's physical arrangement.

## Dataset boundary

Use HB-TTRPG-owned or otherwise clearly reusable corpora as authoritative datasets. The Donjon Egyptian example data is a useful demonstration of the data-file interface but is not the default seed corpus for project-native generators.
