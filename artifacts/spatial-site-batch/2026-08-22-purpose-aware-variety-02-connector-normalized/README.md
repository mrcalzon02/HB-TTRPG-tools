# Spatial Site Generation Batch Archive

Batch: **2026-08-22-purpose-aware-variety-02-connector-normalized**  
Source commit tested: **5debe8bb0171a6fbb62b1d0e5f7f454d32253ebd**  
Cases: **32** (19 curated + 13 seeded-random)  
Acceptance: **PASS**

This archive preserves purpose-aware site generation results without the redundant rendered `cells` grid. Every case retains its input, resolved layered site profile, historical interactions, semantic program, spatial topology, populated content, compatibility/provenance, validation result, metrics, and deterministic re-generation check. The workflow also runs the normal spatial regression suites before creating this archive.

## Coverage

- Archetypes: 19/19
- Rules targets: blacklight_continuum, kaysender, open_d20, world_of_darkness
- Cultures observed: 12
- Controllers observed: 20
- Biomes observed: 19
- Ecologies observed: 19
- Catalog breadth at test time: 28 axes / 614 selectable values

## Aggregate output

- Rooms: 555
- Corridors: 914
- Doors: 1828
- Inter-deck connectors: 376
- Historical interactions: 92
- Populated hazard entries: 1187
- Populated occupant entries: 294
- Narrative discoveries: 179
- Per-case JSON bytes: 6535834

## Case results

| # | Case | Archetype | Builder culture | Current controller | Ecology | Rules | Rooms | Interactions | Status |
|---:|---|---|---|---|---|---|---:|---:|---|
| 01 | generic-neutral-urban | generic | culture-neutral | civilian-residents | urban-vermin | open_d20 | 9 | 1 | PASS |
| 02 | dwarven-bandit-mansion | mansion | dwarven | bandits | scavenger | world_of_darkness | 19 | 8 | PASS |
| 03 | elven-outlaw-manor | manor | elven | outlaws | overgrown | blacklight_continuum | 20 | 1 | PASS |
| 04 | ancient-desert-tomb | tomb | ancient-unknown | adventuring-company | undead | kaysender | 21 | 4 | PASS |
| 05 | criminal-urban-sewer | sewer | human | criminal-syndicate | urban-vermin | open_d20 | 21 | 1 | PASS |
| 06 | dwarven-goblin-fortress | fortress | dwarven | goblin-clan | fungal | world_of_darkness | 19 | 7 | PASS |
| 07 | occupied-human-school | school | human | military-garrison | urban-vermin | blacklight_continuum | 17 | 3 | PASS |
| 08 | necromancer-arcane-university | arcane_university | elven | necromancers | undead | kaysender | 21 | 2 | PASS |
| 09 | syndicate-guildhall | guildhall | mixed-cosmopolitan | criminal-syndicate | urban-vermin | open_d20 | 13 | 1 | PASS |
| 10 | dragonkin-cult-temple | temple | dragonkin | cult | elemental | world_of_darkness | 15 | 3 | PASS |
| 11 | coastal-refugee-warehouse | warehouse | culture-neutral | refugees | wetland | blacklight_continuum | 14 | 3 | PASS |
| 12 | gnomish-salvage-laboratory | laboratory | gnomish | salvagers | construct | kaysender | 16 | 3 | PASS |
| 13 | halfling-quarantine-bunkhouse | bunkhouse_compound | halfling | plague-survivors | plague | open_d20 | 22 | 1 | PASS |
| 14 | escaped-prisoner-prison | prison | human | escaped-prisoners | urban-vermin | world_of_darkness | 18 | 3 | PASS |
| 15 | urban-plague-hospital | hospital | human | plague-survivors | plague | blacklight_continuum | 16 | 3 | PASS |
| 16 | orcish-mine-dwarven-hold | mine | orcish | dwarven-hold | subterranean | kaysender | 20 | 1 | PASS |
| 17 | flooded-gnomish-industrial | industrial_facility | gnomish | occupation-force | invasive | open_d20 | 21 | 5 | PASS |
| 18 | goblinoid-outlaw-hideout | hideout | goblinoid | outlaws | woodland | world_of_darkness | 13 | 1 | PASS |
| 19 | rebel-civic-building | civic_building | mixed-cosmopolitan | rebels | urban-vermin | blacklight_continuum | 12 | 1 | PASS |
| 20 | seeded-random-01-fortress | fortress | culture-neutral | military-garrison | arachnid | kaysender | 14 | 4 | PASS |
| 21 | seeded-random-02-mansion | mansion | mixed-cosmopolitan | criminal-syndicate | feral | open_d20 | 15 | 4 | PASS |
| 22 | seeded-random-03-tomb | tomb | gnomish | cult | reptilian | world_of_darkness | 20 | 5 | PASS |
| 23 | seeded-random-04-sewer | sewer | human | industrial-workers | fungal | blacklight_continuum | 25 | 7 | PASS |
| 24 | seeded-random-05-arcane-university | arcane_university | colonial | necromancers | scavenger | kaysender | 19 | 1 | PASS |
| 25 | seeded-random-06-warehouse | warehouse | mixed-cosmopolitan | adventuring-company | fiendish | open_d20 | 13 | 1 | PASS |
| 26 | seeded-random-07-laboratory | laboratory | culture-neutral | military-garrison | arachnid | world_of_darkness | 16 | 3 | PASS |
| 27 | seeded-random-08-prison | prison | orcish | dragonkin-host | overgrown | blacklight_continuum | 20 | 1 | PASS |
| 28 | seeded-random-09-hospital | hospital | mixed-cosmopolitan | smugglers | aquatic | kaysender | 15 | 5 | PASS |
| 29 | seeded-random-10-mine | mine | elven | adventuring-company | aquatic | open_d20 | 20 | 3 | PASS |
| 30 | seeded-random-11-industrial-facility | industrial_facility | orcish | bandits | wetland | world_of_darkness | 19 | 3 | PASS |
| 31 | seeded-random-12-hideout | hideout | orcish | abandoned | herbivore-heavy | blacklight_continuum | 14 | 2 | PASS |
| 32 | seeded-random-13-civic-building | civic_building | dwarven | refugees | parasite | kaysender | 18 | 1 | PASS |

## Files

- `summary.json` — aggregate acceptance and coverage.
- `manifest.json` — per-artifact paths, SHA-256 hashes, sizes, and headline dimensions.
- `inputs.json` — exact 32 input specifications.
- `failures.json` — empty on a clean batch; otherwise preserves errors/validation failures.
- `cases/*.json` — the 32 archived generator artifacts.
