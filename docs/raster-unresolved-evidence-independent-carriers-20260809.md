# [SYSTEM REPORT] Raster Unresolved-Evidence Independent Carrier Holdout — 2026-08-09

**Active Operation:** test carrier-independent robustness of Pipeline 0.3 unresolved raster evidence  
**Rule Integrity:** production weights and Asset Presence thresholds remain frozen  
**Execution Depth:** 64 independent carriers · 48 development / 16 untouched holdout · two matched embedded partners per carrier

## Decision

The independent-carrier holdout does **not** justify fitting or changing production `RASTER_UNRESOLVED_FLAG_WEIGHTS`.

The experiment confirms that some evidence features—especially `cross-channel-payload-divergence`—retain directional signal on untouched carriers. It also confirms that the current combined unresolved score is strongly carrier-dependent and remains weak on high-frequency noise. The correct next step is carrier conditioning/normalization research, not threshold lowering or weight fitting.

The current model therefore remains **`provisional-prior`**, with **0 fitted cases**, and the aggregate unresolved contribution to Miss-Risk remains `0.24 * unresolvedEvidenceIndex`.

## Experimental design

Carrier instance, not embedding seed, was treated as the unit of independence.

Four procedural carrier families were generated:

- `smooth-field`;
- `edge-field`;
- `correlated-noise`; and
- `high-frequency-noise`.

Each family contained 16 independently seeded clean carrier instances. Instances 1–12 were assigned to development and 13–16 to holdout **before** any embedded derivatives were generated. Every derivative remained in the same split as its clean carrier.

This produced:

- 48 development carriers;
- 16 untouched holdout carriers;
- 64 total clean carriers;
- two standardized embedded partners per carrier;
- 128 matched embedded partners; and
- 192 total rasters.

The standardized partners were:

1. `rgb-low`: RGB target, 0.10 requested payload rate, shuffled placement;
2. `blue-medium`: blue-only target, 0.25 requested payload rate, shuffled placement.

Blue-only embedding was retained deliberately because the preceding matched-pair experiment identified it as the weakest target under the existing evidence profile.

## Development versus holdout

| Measure | Development | Holdout |
| --- | ---: | ---: |
| Clean carriers | 48 | 16 |
| Embedded partner pairs | 96 | 32 |
| Clean mean unresolved evidence | 0.32095 | 0.29882 |
| Clean median unresolved evidence | 0.30880 | 0.30880 |
| Mean embedded-minus-clean risk delta | +0.05616 | +0.06716 |
| Median risk delta | 0 | 0 |
| Positive partner delta rate | 45.83% | 43.75% |
| Negative partner delta rate | 8.33% | 6.25% |
| Carrier-mean positive delta rate | 56.25% | **50.0%** |

The development and holdout averages are reasonably similar, which suggests the split itself is behaving sensibly. The absolute performance, however, is not sufficient for calibration: more than half of holdout partner comparisons fail to increase the current unresolved score, and exactly half of holdout carriers have a non-positive mean response across their two embedded partners.

The current score is therefore useful as an uncertainty-retention mechanism but not a reliable stand-alone embedding discriminator.

## Clean carrier flag prevalence

The most important warning is that several “suspicious” flags are already common in untouched clean carriers.

| Flag | Development clean rate | Holdout clean rate |
| --- | ---: | ---: |
| `single-valid-estimator` | 0% | 0% |
| `estimator-disagreement` | 31.25% | 31.25% |
| `nonzero-below-legacy-threshold` | **83.33%** | **75.0%** |
| `localized-global-divergence` | 52.08% | 56.25% |
| `cross-channel-payload-divergence` | 45.83% | 43.75% |

This changes the interpretation of the earlier pooled result. `nonzero-below-legacy-threshold` looked highly promising when only four clean carrier classes were available, but with independent carrier instances it is already present in three quarters of holdout clean carriers. It cannot be treated as a general positive discriminator in its current form.

`single-valid-estimator` remains entirely unexercised by this corpus and still has no empirical support for its provisional weight.

## Matched flag movement on holdout

Across 32 holdout embedded partner pairs:

| Flag | Gained | Lost | Net gain rate |
| --- | ---: | ---: | ---: |
| `single-valid-estimator` | 0 | 0 | 0% |
| `estimator-disagreement` | 1 | 1 | 0% |
| `nonzero-below-legacy-threshold` | 6 | 2 | +12.5% |
| `localized-global-divergence` | 3 | 1 | +6.25% |
| `cross-channel-payload-divergence` | 10 | 0 | **+31.25%** |

`cross-channel-payload-divergence` is the strongest surviving directional feature. It gained ten times on holdout and was never lost. That is a useful research signal, but its clean prevalence is still 43.75%, so the raw flag cannot simply be promoted into positive evidence.

## Standardized partner behavior

### RGB low-density partner

Holdout, 16 pairs:

- mean risk delta: **+0.076784**;
- positive delta rate: 43.75%;
- negative delta rate: 6.25%;
- `nonzero-below-legacy-threshold` net gain: +18.75%;
- `cross-channel-payload-divergence` net gain: +25.0%.

### Blue-only medium-density partner

Holdout, 16 pairs:

- mean risk delta: **+0.05754**;
- positive delta rate: 43.75%;
- negative delta rate: 6.25%;
- `nonzero-below-legacy-threshold` net gain: +6.25%;
- `cross-channel-payload-divergence` net gain: **+37.5%**.

Blue-only embedding remains difficult for the current aggregate score, but cross-channel divergence responds more consistently than the other tracked flags.

## Carrier-family holdout behavior

| Family | Clean mean risk | Mean partner delta | Positive partner rate | Positive carrier-mean rate |
| --- | ---: | ---: | ---: | ---: |
| smooth-field | 0.0800 | **+0.22954** | **100%** | **100%** |
| edge-field | 0.35171 | +0.00714 | 37.5% | 50% |
| correlated-noise | 0.37764 | +0.01757 | 25% | 25% |
| high-frequency-noise | 0.38592 | +0.01440 | **12.5%** | 25% |

Carrier texture dominates the response.

Smooth carriers behave well: every holdout embedded partner increased unresolved evidence. Edge-structured carriers are already highly flagged when clean and show almost no average separation after embedding. Correlated noise is weaker still. High-frequency noise remains the clearest blind spot: only one of eight holdout embedded partners increased the current score.

Development high-frequency noise was even more saturated: clean mean unresolved evidence was `0.50123008`, mean embedded-minus-clean delta was **−0.00456**, and **0%** of embedded partner pairs increased the score.

This is the same failure mode observed in the earlier colored-noise carrier, now reproduced across independently seeded carrier instances. It is therefore not an artifact of one synthetic image.

## What survives holdout

The independent holdout supports three conclusions:

1. **Cross-channel divergence contains real directional information.** It remains the strongest matched flag under holdout, including blue-only embedding.
2. **Absolute unresolved flag presence is badly confounded by carrier structure.** Clean edge/noise carriers already carry high scores and common flags.
3. **The current aggregate score saturates on noisy carriers.** Adding hidden LSB structure often produces little or no additional score because the clean carrier already occupies the same evidence region.

The next research target should therefore be **carrier-conditioned evidence**, not a stronger raw weight. Existing luma/R/G/B residual roughness, co-occurrence, LSB entropy, pair-equalization chi-square, and cross-channel measurements should be tested as context variables that identify naturally noisy/saturated carriers and interpret a flag relative to that carrier regime.

## Scientific boundary

This study improves independence by splitting on carrier instance before generating derivatives. It still uses procedural carrier families and controlled LSB replacement, so it does not establish real-world prevalence, universal sensitivity/specificity, or a probability of hidden content. The holdout demonstrates that production fitting would be premature. Production weights remain unchanged.