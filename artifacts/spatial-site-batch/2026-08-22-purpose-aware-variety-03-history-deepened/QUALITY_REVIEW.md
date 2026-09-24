# Spatial Site Batch Quality Review

Batch: **2026-08-22-purpose-aware-variety-03-history-deepened**  
Archive acceptance: **32/32 PASS**  
Curated review mean: **99.2/100**  
Seeded-random review mean: **98.8/100**

This is a second-stage quality review of already-valid generator artifacts. It does not replace spatial validation. It looks for outputs that are technically valid but potentially over-connected, under-interacted, over-saturated, thinly populated, or unusually far from the curated control distribution.

## Cohort comparison

| Metric | Curated mean | Seeded-random mean | Delta |
|---|---:|---:|---:|
| interactionsPerRoom | 0.227 | 0.17 | -25.1% |
| adaptedRoleRatio | 0.215 | 0.124 | -42.3% |
| hazardsPerRoom | 2.084 | 2.184 | 4.8% |
| occupantsPerRoom | 0.672 | 0.42 | -37.5% |
| narrativePerRoom | 0.371 | 0.305 | -17.8% |
| secretAccessPerRoom | 0.195 | 0.226 | 15.9% |
| corridorsPerRoom | 1.924 | 1.512 | -21.4% |
| connectorsPerRoom | 0.499 | 0.848 | 69.9% |

## Repeated review patterns

- **narrative-discovery-thin** (low): 4 case(s) — generic-neutral-urban, syndicate-guildhall, orcish-mine-dwarven-hold, seeded-random-12-hideout
- **curated-outlier-occupantsPerRoom** (low): 2 case(s) — seeded-random-10-mine, seeded-random-12-hideout
- **curated-outlier-connectorsPerRoom** (low): 1 case(s) — seeded-random-10-mine
- **curated-outlier-secretAccessPerRoom** (low): 1 case(s) — seeded-random-06-warehouse
- **secret-density-under-delivery** (medium): 1 case(s) — orcish-mine-dwarven-hold

## Recommended next changes

- **MEDIUM — secret traversal scaling:** 1 high-secret cases produce little secret access. Map secretDensity to topology-safe alternate access and hidden room connections rather than only content tags.
- **LOW — content phrase diversity:** Exact-string uniqueness is low in one or more populated content categories. Add semantic phrasing variants only after structural interaction quality is addressed; do not use cosmetic text variety to hide repeated mechanics.

## Case review

| # | Case | Kind | Score | Band | History pressure | Interactions/room | Adapted ratio | Hazards/room | Occupants/room | Connectors/room | Findings |
|---:|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 16 | orcish-mine-dwarven-hold | curated | 90 | healthy | 2 | 0.05 | 0 | 2.55 | 0.75 | 1.3 | 2 |
| 29 | seeded-random-10-mine | seeded-random | 94 | healthy | 0 | 0.158 | 0.105 | 2.789 | 0.105 | 1.368 | 2 |
| 31 | seeded-random-12-hideout | seeded-random | 94 | healthy | 0 | 0 | 0 | 1.455 | 0.091 | 0.909 | 2 |
| 01 | generic-neutral-urban | curated | 97 | healthy | 0 | 0.111 | 0 | 0.778 | 0.556 | 0 | 1 |
| 09 | syndicate-guildhall | curated | 97 | healthy | 1 | 0.077 | 0 | 0.538 | 0.615 | 0 | 1 |
| 25 | seeded-random-06-warehouse | seeded-random | 97 | healthy | 0 | 0.133 | 0.133 | 1.867 | 0.6 | 0.667 | 1 |
| 02 | dwarven-bandit-mansion | curated | 100 | healthy | 4 | 0.421 | 0.474 | 2.105 | 0.579 | 0.842 | 0 |
| 03 | elven-outlaw-manor | curated | 100 | healthy | 4 | 0.3 | 0.35 | 2 | 0.8 | 1.3 | 0 |
| 04 | ancient-desert-tomb | curated | 100 | healthy | 4 | 0.19 | 0.19 | 2.857 | 0.81 | 0.286 | 0 |
| 05 | criminal-urban-sewer | curated | 100 | healthy | 2 | 0.048 | 0 | 1.571 | 0.619 | 0.571 | 0 |
| 06 | dwarven-goblin-fortress | curated | 100 | healthy | 5 | 0.368 | 0.316 | 2.421 | 0.895 | 1.158 | 0 |
| 07 | occupied-human-school | curated | 100 | healthy | 2 | 0.176 | 0.118 | 1.765 | 0.529 | 0 | 0 |
| 08 | necromancer-arcane-university | curated | 100 | healthy | 4 | 0.095 | 0.095 | 2.905 | 0.857 | 0.476 | 0 |
| 10 | dragonkin-cult-temple | curated | 100 | healthy | 2 | 0.2 | 0.267 | 2.267 | 0.467 | 0.933 | 0 |
| 11 | coastal-refugee-warehouse | curated | 100 | healthy | 3 | 0.214 | 0.214 | 2.5 | 0.5 | 0.857 | 0 |
| 12 | gnomish-salvage-laboratory | curated | 100 | healthy | 4 | 0.188 | 0.125 | 2.688 | 0.688 | 0 | 0 |
| 13 | halfling-quarantine-bunkhouse | curated | 100 | healthy | 5 | 0.318 | 0.364 | 2.182 | 0.545 | 0 | 0 |
| 14 | escaped-prisoner-prison | curated | 100 | healthy | 4 | 0.167 | 0.111 | 2.167 | 0.556 | 0.333 | 0 |
| 15 | urban-plague-hospital | curated | 100 | healthy | 4 | 0.188 | 0.188 | 2.375 | 0.875 | 0 | 0 |
| 17 | flooded-gnomish-industrial | curated | 100 | healthy | 5 | 0.238 | 0.143 | 2.762 | 0.667 | 1.429 | 0 |
| 18 | goblinoid-outlaw-hideout | curated | 100 | healthy | 3 | 0.462 | 0.538 | 0.923 | 0.538 | 0 | 0 |
| 19 | rebel-civic-building | curated | 100 | healthy | 4 | 0.5 | 0.583 | 2.25 | 0.917 | 0 | 0 |
| 20 | seeded-random-01-fortress | seeded-random | 100 | healthy | 0 | 0.467 | 0.267 | 1.867 | 0.2 | 0.933 | 0 |
| 21 | seeded-random-02-mansion | seeded-random | 100 | healthy | 0 | 0.444 | 0.444 | 2.222 | 0.778 | 1.111 | 0 |
| 22 | seeded-random-03-tomb | seeded-random | 100 | healthy | 0 | 0.048 | 0 | 2.238 | 0.476 | 0.762 | 0 |
| 23 | seeded-random-04-sewer | seeded-random | 100 | healthy | 0 | 0.063 | 0 | 2.5 | 0.188 | 0 | 0 |
| 24 | seeded-random-05-arcane-university | seeded-random | 100 | healthy | 0 | 0.074 | 0.074 | 2.593 | 0.667 | 1.111 | 0 |
| 26 | seeded-random-07-laboratory | seeded-random | 100 | healthy | 0 | 0.267 | 0.2 | 2.733 | 0.267 | 0.8 | 0 |
| 27 | seeded-random-08-prison | seeded-random | 100 | healthy | 0 | 0.071 | 0 | 1.857 | 0.429 | 0.286 | 0 |
| 28 | seeded-random-09-hospital | seeded-random | 100 | healthy | 0 | 0.05 | 0 | 1.45 | 0.2 | 1 | 0 |
| 30 | seeded-random-11-industrial-facility | seeded-random | 100 | healthy | 0 | 0.222 | 0.278 | 2.556 | 0.667 | 1.333 | 0 |
| 32 | seeded-random-13-civic-building | seeded-random | 100 | healthy | 0 | 0.211 | 0.105 | 2.263 | 0.789 | 0.737 | 0 |

## Exact-string diversity

- **hazards:** 145/1216 exact strings unique (0.119).
- **occupants:** 88/323 exact strings unique (0.272).
- **narrativeDiscoveries:** 44/192 exact strings unique (0.229).

The machine-readable detail, evidence, outlier thresholds, and per-case findings are preserved in `quality-review.json`.
