# [SYSTEM REPORT] Raster Unresolved-Evidence Corpus — 2026-08-09

**Active Operation:** characterize Pipeline 0.3 unresolved raster evidence before empirical fitting  
**Rule Integrity:** production priors and Presence thresholds remain unchanged  
**Execution Depth:** 4 carrier classes · 256 embedded controls · 4 clean controls · R/G/B/luma evidence profile

## Result

The first multi-carrier sweep confirms that the new unresolved-evidence path carries useful information, but it also shows strong **carrier dependence**. The result does **not** justify fitting or replacing the current production prior weights.

The workflow receipt is produced by `scripts/validate-raster-unresolved-evidence-corpus.mjs` from `scripts/research-raster-unresolved-evidence-corpus.mjs`. The research workflow completed successfully with 260 controlled cases.

## Experimental design

Four 64×64 carrier classes were used:

- canonical clean demonstration fixture;
- synthetic smooth gradient;
- synthetic structured edges; and
- deterministic colored noise.

Each embedded case used deterministic pseudorandom LSB replacement. The sweep crossed R, G, B, and RGB targets with requested payload rates of 0.025, 0.10, 0.25, and 0.50, sequential or shuffled placement, and two deterministic seeds. Raster evidence was profiled across R/G/B/luma using 32×32 localization tiles.

This produced **4 clean cases and 256 embedded cases**. The imbalance is intentional for characterization but is not suitable for direct probability fitting.

## Top-line observations

| Measure | Clean controls | Embedded controls |
| --- | ---: | ---: |
| Cases | 4 | 256 |
| Any unresolved flag | 50.0% | 89.84% |
| Luma legacy mixed-or-positive | 25.0% | 17.58% |
| Mean current-prior `missRiskEvidence` | 0.1353 | 0.3015 |
| Median current-prior `missRiskEvidence` | 0.0200 | 0.3088 |
| Maximum current-prior `missRiskEvidence` | 0.5012 | 0.5012 |

The legacy luma detector is visibly non-monotonic and weak in this corpus: embedded cases were not more likely than clean controls to cross the old mixed/positive threshold. That reinforces the decision to keep unresolved evidence separate from Asset Presence rather than lowering the Presence threshold.

## Flag prevalence

| Diagnostic flag | Clean rate | Embedded rate | Difference |
| --- | ---: | ---: | ---: |
| `single-valid-estimator` | 0.0% | 0.0% | 0.0 pp |
| `estimator-disagreement` | 25.0% | 37.11% | +12.11 pp |
| `nonzero-below-legacy-threshold` | 25.0% | 66.41% | +41.41 pp |
| `localized-global-divergence` | 50.0% | 63.67% | +13.67 pp |
| `cross-channel-payload-divergence` | 25.0% | 58.20% | +33.20 pp |

`nonzero-below-legacy-threshold` has the largest observed contrast in this sweep, followed by `cross-channel-payload-divergence`. Neither is yet calibrated: the clean denominator is only four carrier classes, and some classes are synthetic.

`localized-global-divergence` again appears frequently in clean material. The earlier single clean fixture already warned that localization divergence was non-specific; this sweep reinforces that boundary.

`single-valid-estimator` never fired. Its current prior therefore remains unsupported by this corpus rather than disproven; future geometries or smaller/sparser samples may still exercise it.

## Carrier dependence

| Carrier | Clean any-flag | Embedded any-flag | Clean mean risk | Embedded mean risk |
| --- | ---: | ---: | ---: | ---: |
| canonical clean | 100% | 98.44% | 0.0400 | 0.2343 |
| smooth gradient | 0% | 76.56% | 0.0000 | 0.2494 |
| structured edges | 0% | 84.38% | 0.0000 | 0.2227 |
| colored noise | 100% | 100% | 0.5012 | 0.4995 |

The colored-noise carrier is the most important warning. Its clean control already produces approximately **0.5012** current-prior unresolved evidence, while its embedded variants average approximately **0.4995**. For that carrier class, the present aggregate unresolved score provides essentially no separation.

This means a pooled clean-versus-embedded average can hide severe carrier-specific false-positive behavior. Any future fitted model must either normalize for carrier characteristics or demonstrate robustness across sufficiently diverse carrier classes.

## Payload-density behavior

| Requested payload rate | Any unresolved flag | Luma legacy mixed-or-positive | Mean current-prior risk |
| --- | ---: | ---: | ---: |
| 0.025 | 64.06% | 10.94% | 0.1849 |
| 0.10 | 100% | 17.19% | 0.3402 |
| 0.25 | 96.88% | 25.0% | 0.3765 |
| 0.50 | 98.44% | 17.19% | 0.3043 |

The current evidence response is **not monotonic with payload density**. Mean unresolved evidence peaks in this sweep around the 0.25 requested overwrite rate and declines at 0.50. The legacy luma mixed-or-positive rate is also non-monotonic. A future calibration must therefore not assume that “more embedded bits” maps linearly to a larger detector score.

## Decision

No production weight or Presence threshold changes are justified by this experiment.

The current `RASTER_UNRESOLVED_FLAG_WEIGHTS` remain **`provisional-prior`**, with **0 fitted cases**. The aggregate unresolved multiplier remains 0.24. These values continue to function only as conservative uncertainty-retention controls.

The next useful experiment is a **matched-pair carrier study**: generate many clean carrier instances across texture families and compare each clean raster directly with one or more controlled embedded versions derived from that same raster. Pairwise flag gains/losses and risk deltas will reduce the distortion caused by pooling fundamentally different carrier classes.

## Scientific boundary

These measurements characterize one synthetic test design and one canonical demonstration fixture. They are not real-world steganography prevalence estimates, not universal sensitivity/specificity measurements, and not probabilities of hidden content. Repeated transformations of one procedural family do not become independent real-world samples merely because their seeds differ.