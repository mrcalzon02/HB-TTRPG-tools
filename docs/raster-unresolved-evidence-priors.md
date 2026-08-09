# [SYSTEM REPORT] Raster Unresolved-Evidence Prior Model

**Active Operation:** document the Pipeline 0.3 raster miss-risk prior before empirical fitting  
**Rule Integrity:** unresolved evidence remains separate from Asset Presence  
**Execution Depth:** flag-level prior weights → deduplicated combination → routed Miss-Risk contribution

## Purpose

Diagnostic Pipeline 0.3 retains suspicious or ambiguous raster structure that does not meet the existing positive-detection threshold. This information is carried as **unresolved / miss-risk evidence**. It is deliberately separate from `positiveEvidence`, detector status, Asset Presence, and Certainty.

The current raster unresolved-evidence model has status **`provisional-prior`**. Its numerical weights are engineering priors. They are **not probabilities**, **not posterior probabilities**, and **not fitted from the calibration corpus**.

## Current prior weights

The authoritative runtime values remain in `BinaryCubeDiagnosticPipeline.constants.RASTER_UNRESOLVED_FLAG_WEIGHTS`.

| Diagnostic flag | Prior contribution |
| --- | ---: |
| `single-valid-estimator` | 0.22 |
| `estimator-disagreement` | 0.18 |
| `nonzero-below-legacy-threshold` | 0.28 |
| `localized-global-divergence` | 0.04 |
| `cross-channel-payload-divergence` | 0.12 |

**Fitted cases: 0.** The values above were selected conservatively to retain unresolved structure while the calibration corpus is still too small to estimate flag-specific detection or miss probabilities.

## Combination rule

Repeated instances of the same flag are deduplicated first. Distinct flag contributions are then combined as a bounded complement product:

`unresolved = 1 - product(1 - flagWeight)`

This is an engineering aggregation rule, not a probabilistic independence claim. Deduplication prevents four channel views from multiplying one repeated symptom simply because the same diagnostic condition appeared more than once.

For the routed detector, the resulting value is stored as `finding.missRiskEvidence`. Aggregate evidence then computes the maximum sample-adjusted unresolved contribution across findings as `unresolvedEvidenceIndex` and adds:

`0.24 * unresolvedEvidenceIndex`

to the existing aggregate Miss-Risk expression. The **0.24 multiplier is also a provisional engineering prior**, not an empirically fitted probability.

## Presence boundary

The unresolved-evidence path MUST NOT:

- increase `positiveEvidence`;
- change the legacy selected-channel raster status;
- relax the existing mixed (`0.12`) or positive (`0.35`) raster thresholds;
- increase Asset Presence merely because a diagnostic flag exists; or
- be described as a probability that steganography is present.

Pipeline 0.3 therefore intentionally preserves the known RGB-LSB false negative for Asset Presence while retaining its below-threshold evidence as Miss-Risk.

## Existing controlled observations

The historical calibration baseline contains two raster cases: one clean negative control and one known RGB-LSB positive control. Under the retained Presence rule the raster detector has `TP=0`, `TN=1`, `FN=1`, `FP=0`, sensitivity `0`, specificity `1`, and balanced accuracy `0.5` on those two cases. That result demonstrates a blind spot; it is nowhere near enough data to fit five flag-specific weights.

The Pipeline 0.3 routing validation keeps the same Presence outcome while exposing the orthogonal unresolved signal:

- clean raster control: `missRiskEvidence = 0`;
- known RGB-LSB false-negative control: `missRiskEvidence = 0.28` because `nonzero-below-legacy-threshold` is present;
- the clean control does not inherit that flag;
- repeated copies of one flag do not multiply the contribution.

Separate blind-spot characterization has also shown that `localized-global-divergence` can occur in a clean control. Its presence therefore cannot be promoted into positive evidence without additional calibration.

## Requirements before replacing the priors

A future empirical model should use a versioned corpus with enough independent cover sources, image geometries, channel targets, payload densities, placement strategies, payload patterns, and seeds to estimate both sensitivity and false-positive behavior. Calibration must be split by carrier/source where practical so repeated transforms of one base image are not mistaken for independent evidence.

Any fitted replacement must version its corpus and model separately, publish per-flag support counts and uncertainty, retain an out-of-sample holdout, and demonstrate that changes to Miss-Risk do not silently alter the Asset Presence contract. Until those conditions are met, the current values remain **`provisional-prior`**.

## Scientific boundary

A higher unresolved-evidence or Miss-Risk index means the selected methods left more relevant uncertainty under this model. It does not mean there is that numerical probability of hidden content. Conversely, low unresolved evidence does not prove absence. The model exists to keep known detector limitations visible without manufacturing certainty.