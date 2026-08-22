# Spatial Site Generation Batch Archive

Batch: **2026-08-22-purpose-aware-variety-03-history-deepened**  
Source commit tested: **c0583f55950c6dc3b0e18c3652f3ca9483115c70**  
Cases: **32** (19 curated + 13 seeded-random)  
Acceptance: **PASS**

This archive preserves purpose-aware site generation results without the redundant rendered `cells` grid. Every case retains its input, resolved layered site profile, historical interactions, semantic program, spatial topology, populated content, compatibility/provenance, validation result, metrics, and deterministic re-generation check. The workflow also runs the normal spatial regression suites before creating this archive.

## Coverage

- Archetypes: 19/19
- Rules targets: blacklight_continuum, kaysender, open_d20, world_of_darkness
- Cultures observed: 13
- Controllers observed: 17
- Biomes observed: 21
- Ecologies observed: 17
- Catalog breadth at test time: 28 axes / 614 selectable values

## Aggregate output

- Rooms: 555
- Corridors: 977
- Doors: 1954
- Inter-deck connectors: 380
- Historical interactions: 111
- Populated hazard entries: 1216
- Populated occupant entries: 323
- Narrative discoveries: 192
- Per-case JSON bytes: 7004925

## Case results

| # | Case | Archetype | Builder culture | Current controller | Ecology | Rules | Rooms | Interactions | Status |
|---:|---|---|---|---|---|---|---:|---:|---|
| 01 | generic-neutral-urban | generic | culture-neutral | civilian-residents | urban-vermin | open_d20 | 9 | 1 | PASS |
| 02 | dwarven-bandit-mansion | mansion | dwarven | bandits | scavenger | world_of_darkness | 19 | 8 | PASS |
| 03 | elven-outlaw-manor | manor | elven | outlaws | overgrown | blacklight_continuum | 20 | 6 | PASS |
| 04 | ancient-desert-tomb | tomb | ancient-unknown | adventuring-company | undead | kaysender | 21 | 4 | PASS |
| 05 | criminal-urban-sewer | sewer | human | criminal-syndicate | urban-vermin | open_d20 | 21 | 1 | PASS |
| 06 | dwarven-goblin-fortress | fortress | dwarven | goblin-clan | fungal | world_of_darkness | 19 | 7 | PASS |
| 07 | occupied-human-school | school | human | military-garrison | urban-vermin | blacklight_continuum | 17 | 3 | PASS |
| 08 | necromancer-arcane-university | arcane_university | elven | necromancers | undead | kaysender | 21 | 2 | PASS |
| 09 | syndicate-guildhall | guildhall | mixed-cosmopolitan | criminal-syndicate | urban-vermin | open_d20 | 13 | 1 | PASS |
| 10 | dragonkin-cult-temple | temple | dragonkin | cult | elemental | world_of_darkness | 15 | 3 | PASS |
| 11 | coastal-refugee-warehouse | warehouse | culture-neutral | refugees | wetland | blacklight_continuum | 14 | 3 | PASS |
| 12 | gnomish-salvage-laboratory | laboratory | gnomish | salvagers | construct | kaysender | 16 | 3 | PASS |
| 13 | halfling-quarantine-bunkhouse | bunkhouse_compound | halfling | plague-survivors | plague | open_d20 | 22 | 7 | PASS |
| 14 | escaped-prisoner-prison | prison | human | escaped-prisoners | urban-vermin | world_of_darkness | 18 | 3 | PASS |
| 15 | urban-plague-hospital | hospital | human | plague-survivors | plague | blacklight_continuum | 16 | 3 | PASS |
| 16 | orcish-mine-dwarven-hold | mine | orcish | dwarven-hold | subterranean | kaysender | 20 | 1 | PASS |
| 17 | flooded-gnomish-industrial | industrial_facility | gnomish | occupation-force | invasive | open_d20 | 21 | 5 | PASS |
| 18 | goblinoid-outlaw-hideout | hideout | goblinoid | outlaws | woodland | world_of_darkness | 13 | 6 | PASS |
| 19 | rebel-civic-building | civic_building | mixed-cosmopolitan | rebels | urban-vermin | blacklight_continuum | 12 | 6 | PASS |
| 20 | seeded-random-01-fortress | fortress | frontier | refugees | plague | kaysender | 15 | 7 | PASS |
| 21 | seeded-random-02-mansion | mansion | orcish | criminal-syndicate | insectile | open_d20 | 18 | 8 | PASS |
| 22 | seeded-random-03-tomb | tomb | orcish | military-garrison | aquatic | world_of_darkness | 21 | 1 | PASS |
| 23 | seeded-random-04-sewer | sewer | human | cult | scavenger | blacklight_continuum | 16 | 1 | PASS |
| 24 | seeded-random-05-arcane-university | arcane_university | goblinoid | bandits | aberrant | kaysender | 27 | 2 | PASS |
| 25 | seeded-random-06-warehouse | warehouse | orcish | adventuring-company | undead | open_d20 | 15 | 2 | PASS |
| 26 | seeded-random-07-laboratory | laboratory | nomadic | abandoned | fungal | world_of_darkness | 15 | 4 | PASS |
| 27 | seeded-random-08-prison | prison | mixed-cosmopolitan | plague-survivors | magical | blacklight_continuum | 14 | 1 | PASS |
| 28 | seeded-random-09-hospital | hospital | ancient-unknown | military-garrison | overgrown | kaysender | 20 | 1 | PASS |
| 29 | seeded-random-10-mine | mine | dwarven | plague-survivors | invasive | open_d20 | 19 | 3 | PASS |
| 30 | seeded-random-11-industrial-facility | industrial_facility | gnomish | bandits | overgrown | world_of_darkness | 18 | 4 | PASS |
| 31 | seeded-random-12-hideout | hideout | mixed-cosmopolitan | abandoned | avian | blacklight_continuum | 11 | 0 | PASS |
| 32 | seeded-random-13-civic-building | civic_building | dwarven | bandits | invasive | kaysender | 19 | 4 | PASS |

## Files

- `summary.json` — aggregate acceptance and coverage.
- `manifest.json` — per-artifact paths, SHA-256 hashes, sizes, and headline dimensions.
- `inputs.json` — exact 32 input specifications.
- `failures.json` — empty on a clean batch; otherwise preserves errors/validation failures.
- `cases/*.json` — the 32 archived generator artifacts.
