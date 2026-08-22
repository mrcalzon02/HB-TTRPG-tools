# Spatial Site Batch Quality Review

Batch: **2026-08-22-purpose-aware-variety-01**  
Archive acceptance: **32/32 PASS**  
Curated review mean: **89.4/100**  
Seeded-random review mean: **93.7/100**

This is a second-stage quality review of already-valid generator artifacts. It does not replace spatial validation. It looks for outputs that are technically valid but potentially over-connected, under-interacted, over-saturated, thinly populated, or unusually far from the curated control distribution.

## Cohort comparison

| Metric | Curated mean | Seeded-random mean | Delta |
|---|---:|---:|---:|
| interactionsPerRoom | 0.157 | 0.143 | -8.9% |
| adaptedRoleRatio | 0.118 | 0.095 | -19.5% |
| hazardsPerRoom | 2.009 | 2.415 | 20.2% |
| occupantsPerRoom | 0.564 | 0.501 | -11.2% |
| narrativePerRoom | 0.182 | 0.121 | -33.5% |
| secretAccessPerRoom | 0.178 | 0.182 | 2.2% |
| corridorsPerRoom | 2.049 | 1.598 | -22% |
| connectorsPerRoom | 2.662 | 3.116 | 17.1% |

## Repeated review patterns

- **narrative-discovery-thin** (low): 12 case(s) — generic-neutral-urban, elven-outlaw-manor, syndicate-guildhall, halfling-quarantine-bunkhouse, orcish-mine-dwarven-hold, goblinoid-outlaw-hideout, rebel-civic-building, seeded-random-04-sewer, seeded-random-06-warehouse, seeded-random-07-laboratory, seeded-random-11-industrial-facility, seeded-random-13-civic-building
- **high-connector-density** (medium): 11 case(s) — dwarven-bandit-mansion, ancient-desert-tomb, criminal-urban-sewer, dragonkin-cult-temple, seeded-random-03-tomb, seeded-random-04-sewer, seeded-random-05-arcane-university, seeded-random-06-warehouse, seeded-random-07-laboratory, seeded-random-08-prison, seeded-random-12-hideout
- **connector-saturation** (high): 6 case(s) — elven-outlaw-manor, dwarven-goblin-fortress, necromancer-arcane-university, orcish-mine-dwarven-hold, flooded-gnomish-industrial, seeded-random-13-civic-building
- **thin-adaptation-coverage** (medium): 4 case(s) — elven-outlaw-manor, halfling-quarantine-bunkhouse, goblinoid-outlaw-hideout, rebel-civic-building
- **thin-history-interactions** (medium): 4 case(s) — elven-outlaw-manor, halfling-quarantine-bunkhouse, goblinoid-outlaw-hideout, rebel-civic-building
- **secret-density-under-delivery** (medium): 3 case(s) — criminal-urban-sewer, dragonkin-cult-temple, rebel-civic-building
- **curated-outlier-interactionsPerRoom** (low): 1 case(s) — seeded-random-01-fortress

## Recommended next changes

- **HIGH — historical interaction matrix:** 4 cases show strong historical pressure with little or no explicit adaptation. Add interaction rules for the specific controller/archetype/ecology combinations listed by the flagged cases; do not add generic random rooms.
- **HIGH — vertical connector semantics:** 17 cases have high connector density. Audit whether connector entries represent intentional traversable shafts/stairs or repeated connector points; normalize only if they represent duplicate traversal semantics.
- **MEDIUM — secret traversal scaling:** 3 high-secret cases produce little secret access. Map secretDensity to topology-safe alternate access and hidden room connections rather than only content tags.
- **LOW — content phrase diversity:** Exact-string uniqueness is low in one or more populated content categories. Add semantic phrasing variants only after structural interaction quality is addressed; do not use cosmetic text variety to hide repeated mechanics.

## Case review

| # | Case | Kind | Score | Band | History pressure | Interactions/room | Adapted ratio | Hazards/room | Occupants/room | Connectors/room | Findings |
|---:|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 03 | elven-outlaw-manor | curated | 68 | attention | 4 | 0.05 | 0 | 2.05 | 0.6 | 5.8 | 4 |
| 19 | rebel-civic-building | curated | 76 | review | 4 | 0.083 | 0 | 1.917 | 0.5 | 0 | 4 |
| 16 | orcish-mine-dwarven-hold | curated | 82 | review | 2 | 0.05 | 0 | 2.5 | 0.6 | 5.5 | 2 |
| 32 | seeded-random-13-civic-building | seeded-random | 82 | review | 0 | 0.059 | 0 | 2.294 | 0.588 | 5.059 | 2 |
| 13 | halfling-quarantine-bunkhouse | curated | 83 | review | 5 | 0.045 | 0 | 2.091 | 0.545 | 0 | 3 |
| 18 | goblinoid-outlaw-hideout | curated | 83 | review | 3 | 0.077 | 0 | 0.769 | 0.769 | 0 | 3 |
| 06 | dwarven-goblin-fortress | curated | 85 | review | 5 | 0.368 | 0.316 | 2.526 | 0.789 | 5.368 | 1 |
| 08 | necromancer-arcane-university | curated | 85 | review | 4 | 0.095 | 0.095 | 2.857 | 0.667 | 5.333 | 1 |
| 17 | flooded-gnomish-industrial | curated | 85 | review | 5 | 0.238 | 0.143 | 2.857 | 0.714 | 7.524 | 1 |
| 05 | criminal-urban-sewer | curated | 86 | review | 2 | 0.048 | 0 | 1.381 | 0.667 | 4.476 | 2 |
| 10 | dragonkin-cult-temple | curated | 86 | review | 2 | 0.2 | 0.267 | 2.2 | 0.4 | 4.133 | 2 |
| 23 | seeded-random-04-sewer | seeded-random | 90 | healthy | 0 | 0.059 | 0 | 2.765 | 0.294 | 3.294 | 2 |
| 25 | seeded-random-06-warehouse | seeded-random | 90 | healthy | 0 | 0.063 | 0 | 2.813 | 0.438 | 4.25 | 2 |
| 26 | seeded-random-07-laboratory | seeded-random | 90 | healthy | 0 | 0 | 0 | 2.467 | 0.267 | 4.8 | 2 |
| 02 | dwarven-bandit-mansion | curated | 93 | healthy | 4 | 0.421 | 0.474 | 2 | 0.474 | 3.579 | 1 |
| 04 | ancient-desert-tomb | curated | 93 | healthy | 4 | 0.19 | 0.19 | 2.81 | 0.524 | 4 | 1 |
| 22 | seeded-random-03-tomb | seeded-random | 93 | healthy | 0 | 0.208 | 0.208 | 2.583 | 0.542 | 4.75 | 1 |
| 24 | seeded-random-05-arcane-university | seeded-random | 93 | healthy | 0 | 0.133 | 0.133 | 2.733 | 0.667 | 3.067 | 1 |
| 27 | seeded-random-08-prison | seeded-random | 93 | healthy | 0 | 0.188 | 0.063 | 2.25 | 0.688 | 5 | 1 |
| 31 | seeded-random-12-hideout | seeded-random | 93 | healthy | 0 | 0.125 | 0.125 | 2.063 | 0.313 | 5 | 1 |
| 01 | generic-neutral-urban | curated | 97 | healthy | 0 | 0.111 | 0 | 0.667 | 0.444 | 0 | 1 |
| 09 | syndicate-guildhall | curated | 97 | healthy | 1 | 0.077 | 0 | 0.231 | 0.615 | 0 | 1 |
| 20 | seeded-random-01-fortress | seeded-random | 97 | healthy | 0 | 0.467 | 0.267 | 1.933 | 0.467 | 2.667 | 1 |
| 30 | seeded-random-11-industrial-facility | seeded-random | 97 | healthy | 0 | 0.067 | 0 | 2.467 | 0.667 | 0 | 1 |
| 07 | occupied-human-school | curated | 100 | healthy | 2 | 0.176 | 0.118 | 1.588 | 0.529 | 0 | 0 |
| 11 | coastal-refugee-warehouse | curated | 100 | healthy | 3 | 0.214 | 0.214 | 2.429 | 0.5 | 2.429 | 0 |
| 12 | gnomish-salvage-laboratory | curated | 100 | healthy | 4 | 0.188 | 0.125 | 2.813 | 0.375 | 0 | 0 |
| 14 | escaped-prisoner-prison | curated | 100 | healthy | 4 | 0.167 | 0.111 | 2.056 | 0.5 | 2.444 | 0 |
| 15 | urban-plague-hospital | curated | 100 | healthy | 4 | 0.188 | 0.188 | 2.438 | 0.5 | 0 | 0 |
| 21 | seeded-random-02-mansion | seeded-random | 100 | healthy | 0 | 0.133 | 0.133 | 2.4 | 0.8 | 0 | 0 |
| 28 | seeded-random-09-hospital | seeded-random | 100 | healthy | 0 | 0.176 | 0.176 | 2 | 0.529 | 0 | 0 |
| 29 | seeded-random-10-mine | seeded-random | 100 | healthy | 0 | 0.188 | 0.125 | 2.625 | 0.25 | 2.625 | 0 |

## Exact-string diversity

- **hazards:** 138/1206 exact strings unique (0.114).
- **occupants:** 84/294 exact strings unique (0.286).
- **narrativeDiscoveries:** 25/89 exact strings unique (0.281).

The machine-readable detail, evidence, outlier thresholds, and per-case findings are preserved in `quality-review.json`.
