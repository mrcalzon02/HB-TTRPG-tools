# [SYSTEM REPORT] Raster Carrier Conditioning Holdout — 2026-08-09

**Active Operation:** determine whether existing evidence-profile measurements identify naturally saturated raster carriers  
**Rule Integrity:** no production weights, Presence thresholds, or detector formulas changed  
**Execution Depth:** 15 existing context measurements · 48 development carriers · 16 untouched holdout carriers · development-only cut points

## Result

Carrier conditioning is real, but the strongest apparent conditioning variables are partly **circular with the unresolved detector itself** and must not be promoted as independent correction variables.

The first genuinely useful non-circular signal is **luma residual roughness**. It replicated across development and untouched holdout: carriers with higher residual roughness began with a higher clean unresolved baseline and showed a substantially smaller embedding-induced increase in the current unresolved score.

This supports a future carrier-regime model, but it does **not** justify changing production behavior yet.

## Method

The independent-carrier corpus retained 15 measurements already produced by `BinaryCubeSteganalysisEvidenceProfile`. No new steganalysis detector math was introduced.

For each context feature:

1. the median was computed using only the 48 development clean carriers;
2. development carriers were split below/above that median;
3. the same numerical cut point was then applied unchanged to the 16 untouched holdout clean carriers;
4. the feature was correlated with clean unresolved baseline and with mean embedded-minus-clean risk delta; and
5. a research-only replicated-saturation score rewarded features that were positively associated with clean unresolved baseline and negatively associated with embedding response in **both** splits.

The ranking is descriptive, not fitted production logic.

## Strongest replicated associations

| Feature | Replicated score | Holdout clean-risk rho | Holdout embedding-delta rho |
| --- | ---: | ---: | ---: |
| `crossChannelPayloadRange` | **0.8886** | +0.9186 | −0.9071 |
| `crossChannelEstimatorAgreementRange` | **0.8675** | +0.8828 | −0.8814 |
| `lumaResidualRoughness` | **0.4961** | +0.5868 | −0.5844 |
| `lumaEstimatorSpread` | 0.4164 | +0.5872 | −0.5736 |
| `crossChannelResidualRoughnessRange` | 0.0725 | +0.5347 | −0.6538 |

The two top numerical results are not acceptable as independent normalization evidence.

### Why the top two are circular

`crossChannelPayloadRange` is derived from the same RS/SPA payload-estimate structure used by the evidence profile, and a sufficiently large payload range directly creates `cross-channel-payload-divergence`, one of the flags used by the current unresolved score.

`crossChannelEstimatorAgreementRange` is likewise derived from the same RS/SPA estimator agreement family that contributes to estimator-disagreement diagnostics.

Conditioning the unresolved score on either of those variables would partly amount to using the detector’s own internal symptom to explain away the score generated from that symptom. The strong correlation is scientifically interesting but not independent evidence that a carrier is intrinsically noisy.

`lumaEstimatorSpread` has the same conceptual problem: it is an RS/SPA estimator-disagreement quantity and should remain in the detector-evidence family rather than being treated as external carrier context.

## Luma residual roughness

`lumaResidualRoughness` is more useful because the current diagnostic flags do **not** use it as a predicate.

Development-only median cut point:

**0.020788593215063805**

### Development

Below the cut point:

- clean mean unresolved evidence: **0.27308**;
- mean embedded-minus-clean risk delta: **+0.07148**.

At/above the cut point:

- clean mean unresolved evidence: **0.36881**;
- mean embedded-minus-clean risk delta: **+0.04084**.

Spearman correlations:

- roughness vs clean unresolved baseline: **+0.6062**;
- roughness vs mean embedding-induced delta: **−0.4053**.

### Untouched holdout

The same development-derived cut point separated the holdout more strongly.

Below:

- clean mean unresolved evidence: **0.22209**;
- mean embedded-minus-clean risk delta: **+0.12422**.

At/above:

- clean mean unresolved evidence: **0.39747**;
- mean embedded-minus-clean risk delta: **−0.00620**.

Holdout Spearman correlations:

- roughness vs clean unresolved baseline: **+0.5868**;
- roughness vs mean embedding-induced delta: **−0.5844**.

That is exactly the saturation pattern we were looking for: rougher carriers already produce more unresolved evidence when clean, while embedding produces less additional response.

## What this does and does not establish

The result supports treating residual roughness as a **carrier-context candidate**. It does not yet establish a correction formula.

Residual roughness may still be acting as a proxy for procedural carrier family. A useful normalization must work *within* more than one carrier family, not merely separate smooth images from noisy images. The next analysis should therefore exclude features derived from current flag predicates and test the remaining carrier-context features both globally and within each procedural family.

`crossChannelResidualRoughnessRange` is also interesting but did **not** replicate cleanly in development: its development correlations were very weak despite strong holdout correlations. That makes it unsuitable for promotion at this stage.

Several other residual, LSB, and chi-square context measurements also require family-conditioned inspection before any normalization experiment is justified.

## Decision

Production behavior remains unchanged:

- `RASTER_UNRESOLVED_FLAG_WEIGHTS` remain `provisional-prior`;
- fitted cases remain 0;
- the aggregate unresolved multiplier remains 0.24;
- Asset Presence continues to use the retained selected-channel rule and thresholds;
- unresolved evidence continues to affect only Miss-Risk.

The next research gate will explicitly separate **detector-derived/circular variables** from **carrier-context variables** and require a candidate context feature to show useful direction within multiple carrier families before it is even considered for a research normalization model.

## Scientific boundary

A context feature that predicts the current score is not automatically an independent explanation of that score. Features derived from the same RS/SPA estimates or the same flag predicates can create tautological associations. Only non-circular context measurements should be considered for future normalization, and even those must survive family-level and untouched-carrier validation before affecting production.