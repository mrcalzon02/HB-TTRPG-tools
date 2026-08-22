# Spatial Site Batch Quality Review

Batch: **2026-08-22-purpose-aware-variety-02-connector-normalized**  
Archive acceptance: **32/32 PASS**  
Curated review mean: **95.6/100**  
Seeded-random review mean: **99.1/100**

This is a second-stage quality review of already-valid generator artifacts. It does not replace spatial validation. It looks for outputs that are technically valid but potentially over-connected, under-interacted, over-saturated, thinly populated, or unusually far from the curated control distribution.

## Cohort comparison

| Metric | Curated mean | Seeded-random mean | Delta |
|---|---:|---:|---:|
| interactionsPerRoom | 0.157 | 0.176 | 12.1% |
| adaptedRoleRatio | 0.118 | 0.142 | 20.3% |
| hazardsPerRoom | 2.032 | 2.125 | 4.6% |
| occupantsPerRoom | 0.566 | 0.454 | -19.8% |
| narrativePerRoom | 0.261 | 0.366 | 40.2% |
| secretAccessPerRoom | 0.181 | 0.166 | -8.3% |
| corridorsPerRoom | 1.834 | 1.377 | -24.9% |
| connectorsPerRoom | 0.499 | 0.838 | 67.9% |

## Repeated review patterns

- **thin-adaptation-coverage** (medium): 4 case(s) — elven-outlaw-manor, halfling-quarantine-bunkhouse, goblinoid-outlaw-hideout, rebel-civic-building
- **thin-history-interactions** (medium): 4 case(s) — elven-outlaw-manor, halfling-quarantine-bunkhouse, goblinoid-outlaw-hideout, rebel-civic-building
- **narrative-discovery-thin** (low): 3 case(s) — generic-neutral-urban, halfling-quarantine-bunkhouse, seeded-random-06-warehouse
- **secret-density-under-delivery** (medium): 3 case(s) — syndicate-guildhall, orcish-mine-dwarven-hold, rebel-civic-building
- **curated-outlier-occupantsPerRoom** (low): 2 case(s) — seeded-random-07-laboratory, seeded-random-10-mine
- **curated-outlier-narrativePerRoom** (low): 1 case(s) — seeded-random-04-sewer

## Recommended next changes

- **HIGH — historical interaction matrix:** 4 cases show strong historical pressure with little or no explicit adaptation. Add interaction rules for the specific controller/archetype/ecology combinations listed by the flagged cases; do not add generic random rooms.
- **MEDIUM — secret traversal scaling:** 3 high-secret cases produce little secret access. Map secretDensity to topology-safe alternate access and hidden room connections rather than only content tags.
- **LOW — content phrase diversity:** Exact-string uniqueness is low in one or more populated content categories. Add semantic phrasing variants only after structural interaction quality is addressed; do not use cosmetic text variety to hide repeated mechanics.

## Case review

| # | Case | Kind | Score | Band | History pressure | Interactions/room | Adapted ratio | Hazards/room | Occupants/room | Connectors/room | Findings |
|---:|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 19 | rebel-civic-building | curated | 79 | review | 4 | 0.083 | 0 | 1.917 | 0.583 | 0 | 3 |
| 13 | halfling-quarantine-bunkhouse | curated | 83 | review | 5 | 0.045 | 0 | 2.045 | 0.364 | 0 | 3 |
| 03 | elven-outlaw-manor | curated | 86 | review | 4 | 0.05 | 0 | 1.8 | 0.65 | 1.3 | 2 |
| 18 | goblinoid-outlaw-hideout | curated | 86 | review | 3 | 0.077 | 0 | 0.846 | 0.462 | 0 | 2 |
| 09 | syndicate-guildhall | curated | 93 | healthy | 1 | 0.077 | 0 | 0.308 | 0.462 | 0 | 1 |
| 16 | orcish-mine-dwarven-hold | curated | 93 | healthy | 2 | 0.05 | 0 | 2.6 | 0.85 | 1.3 | 1 |
| 01 | generic-neutral-urban | curated | 97 | healthy | 0 | 0.111 | 0 | 0.889 | 0.222 | 0 | 1 |
| 23 | seeded-random-04-sewer | seeded-random | 97 | healthy | 0 | 0.28 | 0.24 | 2.76 | 0.28 | 0.8 | 1 |
| 25 | seeded-random-06-warehouse | seeded-random | 97 | healthy | 0 | 0.077 | 0 | 1.769 | 0.385 | 0 | 1 |
| 26 | seeded-random-07-laboratory | seeded-random | 97 | healthy | 0 | 0.188 | 0.188 | 1.563 | 0.125 | 1 | 1 |
| 29 | seeded-random-10-mine | seeded-random | 97 | healthy | 0 | 0.15 | 0.1 | 2.55 | 0.1 | 1.2 | 1 |
| 02 | dwarven-bandit-mansion | curated | 100 | healthy | 4 | 0.421 | 0.474 | 2.053 | 0.579 | 0.842 | 0 |
| 04 | ancient-desert-tomb | curated | 100 | healthy | 4 | 0.19 | 0.19 | 2.857 | 0.667 | 0.286 | 0 |
| 05 | criminal-urban-sewer | curated | 100 | healthy | 2 | 0.048 | 0 | 1.429 | 0.619 | 0.571 | 0 |
| 06 | dwarven-goblin-fortress | curated | 100 | healthy | 5 | 0.368 | 0.316 | 2.316 | 0.842 | 1.158 | 0 |
| 07 | occupied-human-school | curated | 100 | healthy | 2 | 0.176 | 0.118 | 1.647 | 0.471 | 0 | 0 |
| 08 | necromancer-arcane-university | curated | 100 | healthy | 4 | 0.095 | 0.095 | 2.952 | 0.524 | 0.476 | 0 |
| 10 | dragonkin-cult-temple | curated | 100 | healthy | 2 | 0.2 | 0.267 | 2.333 | 0.4 | 0.933 | 0 |
| 11 | coastal-refugee-warehouse | curated | 100 | healthy | 3 | 0.214 | 0.214 | 2.5 | 0.786 | 0.857 | 0 |
| 12 | gnomish-salvage-laboratory | curated | 100 | healthy | 4 | 0.188 | 0.125 | 2.813 | 0.25 | 0 | 0 |
| 14 | escaped-prisoner-prison | curated | 100 | healthy | 4 | 0.167 | 0.111 | 2 | 0.556 | 0.333 | 0 |
| 15 | urban-plague-hospital | curated | 100 | healthy | 4 | 0.188 | 0.188 | 2.5 | 0.75 | 0 | 0 |
| 17 | flooded-gnomish-industrial | curated | 100 | healthy | 5 | 0.238 | 0.143 | 2.81 | 0.714 | 1.429 | 0 |
| 20 | seeded-random-01-fortress | seeded-random | 100 | healthy | 0 | 0.286 | 0.286 | 2.214 | 0.357 | 0.857 | 0 |
| 21 | seeded-random-02-mansion | seeded-random | 100 | healthy | 0 | 0.267 | 0.267 | 2.2 | 0.733 | 1.067 | 0 |
| 22 | seeded-random-03-tomb | seeded-random | 100 | healthy | 0 | 0.25 | 0.2 | 2.55 | 0.55 | 0.9 | 0 |
| 24 | seeded-random-05-arcane-university | seeded-random | 100 | healthy | 0 | 0.053 | 0 | 1.895 | 0.579 | 0.947 | 0 |
| 27 | seeded-random-08-prison | seeded-random | 100 | healthy | 0 | 0.05 | 0 | 1.9 | 0.85 | 0.9 | 0 |
| 28 | seeded-random-09-hospital | seeded-random | 100 | healthy | 0 | 0.333 | 0.267 | 1.867 | 0.333 | 0.4 | 0 |
| 30 | seeded-random-11-industrial-facility | seeded-random | 100 | healthy | 0 | 0.158 | 0.158 | 2.474 | 0.421 | 1.263 | 0 |
| 31 | seeded-random-12-hideout | seeded-random | 100 | healthy | 0 | 0.143 | 0.143 | 1.714 | 0.357 | 1 | 0 |
| 32 | seeded-random-13-civic-building | seeded-random | 100 | healthy | 0 | 0.056 | 0 | 2.167 | 0.833 | 0.556 | 0 |

## Exact-string diversity

- **hazards:** 130/1187 exact strings unique (0.11).
- **occupants:** 81/294 exact strings unique (0.276).
- **narrativeDiscoveries:** 20/179 exact strings unique (0.112).

The machine-readable detail, evidence, outlier thresholds, and per-case findings are preserved in `quality-review.json`.
