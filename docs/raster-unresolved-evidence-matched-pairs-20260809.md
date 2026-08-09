# [SYSTEM REPORT] Raster Unresolved-Evidence Matched Pairs — 2026-08-09

**Active Operation:** remove pooled carrier bias from the first unresolved-evidence corpus  
**Rule Integrity:** production raster priors and Asset Presence thresholds remain unchanged  
**Execution Depth:** 256 clean-to-embedded matched comparisons · flag transitions · risk deltas · carrier/rate/target/placement strata

## Why matched pairs

The first 260-case unresolved-evidence corpus showed strong carrier dependence. In particular, the clean colored-noise carrier already produced roughly the same unresolved score as its embedded variants. Pooling fundamentally different carriers therefore exaggerates apparent separation.

This analysis compares every embedded case with the clean baseline from the **same carrier class**. It reduces carrier-level bias by asking what changed after embedding rather than comparing unrelated absolute scores. It does not remove every confound: there are still only four clean carrier baselines, and repeated seeded payload variants from one carrier are not independent real-world samples.

No production weight or Presence threshold is changed by this study.

## Top-line matched result

Across **256 matched embedded cases**:

- mean `missRiskEvidence` delta: **+0.16616474**;
- median delta: **+0.12**;
- minimum delta: **−0.10948608**;
- maximum delta: **+0.50123008**;
- positive deltas: **141 / 256 = 55.08%**;
- negative deltas: **2 / 256 = 0.78%**;
- unchanged: **113 / 256 = 44.14%**.

The current provisional unresolved score therefore moves upward more often than downward, but it is unchanged on nearly half of the controlled embedded cases. That is useful diagnostic behavior, not a calibrated detector.

The legacy luma scalar remains much weaker as a monotonic signal:

- mean embedded-minus-clean delta: **+0.0240720**;
- median: **0**;
- minimum: **−0.1249618**;
- maximum: **+0.8750382**.

This reinforces the Pipeline 0.3 decision to keep below-threshold structure in Miss-Risk instead of simply lowering the Asset Presence threshold.

## Matched flag transitions

| Flag | Gained | Lost | Retained | Absent | Net gain rate |
| --- | ---: | ---: | ---: | ---: | ---: |
| `single-valid-estimator` | 0 | 0 | 0 | 256 | 0.00% |
| `estimator-disagreement` | 32 | 1 | 63 | 160 | +12.11% |
| `nonzero-below-legacy-threshold` | 106 | 0 | 64 | 86 | **+41.41%** |
| `localized-global-divergence` | 41 | 6 | 122 | 87 | +13.67% |
| `cross-channel-payload-divergence` | 85 | 0 | 64 | 107 | **+33.20%** |

When the clean baseline did not already contain the flag:

- `nonzero-below-legacy-threshold` activated in **55.21%** of eligible pairs;
- `cross-channel-payload-divergence` activated in **44.27%**;
- `localized-global-divergence` activated in **32.03%**;
- `estimator-disagreement` activated in **16.67%**.

The two strongest matched signals are therefore the same two that looked strongest in the pooled view: `nonzero-below-legacy-threshold` and `cross-channel-payload-divergence`. That agreement is encouraging, but it is not enough to fit production weights because carrier diversity is still extremely small.

`localized-global-divergence` is visibly less stable: it was gained 41 times but also **lost six times**. On the canonical-clean carrier its net matched gain was actually negative.

`single-valid-estimator` was never exercised at all. The current corpus therefore supplies no empirical support for its provisional weight.

## Carrier-specific matched behavior

| Carrier | Mean risk delta | Median | Positive delta pairs | Negative delta pairs |
| --- | ---: | ---: | ---: | ---: |
| canonical clean | +0.19425 | +0.25363 | 59.38% | 1.56% |
| smooth gradient | +0.24940 | +0.28 | 76.56% | 0% |
| structured edges | +0.22272 | +0.28 | 84.38% | 0% |
| colored noise | **−0.00171** | **0** | **0%** | 1.56% |

The colored-noise result is the decisive warning. Across all 64 embedded variants of that carrier, **not one pair increased the current unresolved score**. The mean change was slightly negative. For this carrier, the current unresolved-evidence combination is effectively non-discriminative.

That means any future fitted model must explicitly test robustness against carrier texture/noise characteristics. A model that performs well on smooth and edge-structured carriers but fails on high-entropy textured carriers cannot be treated as generally calibrated.

## Carrier-specific flag movement

### Canonical clean

Net matched changes:

- `estimator-disagreement`: +25.0%;
- `nonzero-below-legacy-threshold`: +46.88%;
- `localized-global-divergence`: **−9.38%**;
- `cross-channel-payload-divergence`: +43.75%.

### Smooth gradient

- `estimator-disagreement`: +25.0%;
- `nonzero-below-legacy-threshold`: +57.81%;
- `localized-global-divergence`: +42.19%;
- `cross-channel-payload-divergence`: +45.31%.

### Structured edges

- `estimator-disagreement`: 0%;
- `nonzero-below-legacy-threshold`: +60.94%;
- `localized-global-divergence`: +21.88%;
- `cross-channel-payload-divergence`: +43.75%.

### Colored noise

- `estimator-disagreement`: −1.56%;
- every other tracked flag: **0% net movement**.

## Payload-density matched behavior

| Requested overwrite rate | Mean risk delta | Positive pair rate | Dominant matched flag changes |
| --- | ---: | ---: | --- |
| 0.025 | +0.04958 | 20.31% | below-threshold +17.19%; cross-channel +1.56% |
| 0.10 | +0.20488 | 68.75% | below-threshold +65.63% |
| 0.25 | **+0.24119** | 65.63% | cross-channel +59.38%; below-threshold +56.25% |
| 0.50 | +0.16901 | 65.63% | cross-channel +59.38%; below-threshold +26.56% |

The response remains non-monotonic. The mean risk delta peaks at the 0.25 requested overwrite rate rather than 0.50. At 0.50 the cross-channel flag remains common while the below-threshold flag becomes much less discriminative. A future model must not assume a simple linear payload-to-score relationship.

## Target and placement effects

Mean matched risk delta by target:

- R: **+0.17967**, positive in 60.94% of pairs;
- G: **+0.20140**, positive in 59.38%;
- B: **+0.10060**, positive in only 40.63%;
- RGB: **+0.18298**, positive in 59.38%.

Blue-channel-only embedding is the weakest target under the current evidence profile and deserves explicit coverage in future independent-carrier testing.

Sequential and shuffled placement had almost identical mean deltas:

- sequential: **+0.16755**, positive in 52.34%;
- shuffled: **+0.16478**, positive in 57.81%.

Placement therefore appears less important than carrier class in this small experiment.

## Decision

The evidence supports continuing the unresolved-evidence architecture but **does not support changing the current production priors**.

The next experiment must increase the number of **independent clean carrier instances**, not merely increase the number of payload seeds applied to the same four carriers. Carrier instances should be split into development and untouched holdout sets before any candidate weighting model is evaluated.

A useful minimum next design is four controlled carrier families × sixteen independently generated carrier instances. Twelve instances per family can be used for development characterization and four per family reserved for holdout. Each carrier can receive a small fixed set of embedded partners, but train/holdout assignment must follow the carrier instance so related derivatives never cross the split.

## Scientific boundary

Matched subtraction reduces carrier confounding; it does not turn this synthetic corpus into a representative real-world sample. The current score increased on 55.08% of embedded pairs, failed to move on 44.14%, and had essentially no discrimination on the colored-noise carrier. These results are evidence about the present model’s behavior, not a probability that hidden content exists.