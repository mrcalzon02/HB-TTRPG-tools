# Binary Cube Key Generation Profile Research

Status: active research record  
Canonical engine at time of test: `shadowrun-binary-cube-engine.js` schema `0.2.0`  
Shared research model: `binary-cube-key-generation-research.js` schema `research-0.4.0`  
Research harness: `scripts/research-binary-cube-key-generation-profiles.mjs`

## Purpose

The production Binary Cube key remains the deterministic direct-permutation generator: seed and grid settings initialize the canonical PRNG, which creates complete row, column, and depth permutations plus the data-entry mask. Existing keys and the production transform are unchanged.

This research asks whether alternative deterministic key-generation procedures create useful structural diversity without creating exploitable predictability. Complexity is not treated as security. Every candidate still terminates in one ordinary Binary Cube key whose three mappings are complete permutations and whose six-face collision-free invariant is validated by `ShadowrunBinaryCubeEngine`.

The research generator is deliberately outside the canonical engine. It may propose candidate row/column/depth permutations, but canonical validation, fingerprints, masks, encryption, decryption, package framing, checksums, traces, and collision proofs remain owned by the one authoritative engine.

## Profiles tested

### Direct permutation

The compatibility baseline. Seeded Fisher-Yates-style shuffling creates each complete permutation directly.

### Iterative chain

Starts from identity and repeatedly derives deterministic state from preceding state, applying keyed transpositions. This tests a history-dependent construction.

### Global random transposition walk

Starts from identity and performs a long seeded walk through permutation space using globally selected transpositions. This is a global-mixing walk rather than a spatially local walk.

### Local adjacent walk

A deliberately literal random walk. A walker moves between neighboring permutation positions and swaps only with the adjacent position it enters. This is retained primarily as a structural counterexample.

### Nested permutation composition

Creates independently domain-separated complete permutations and composes them. Every intermediate stage is bijective. Because a composition of permutations is itself a permutation, additional nested stages are not assumed to create an additional encryption layer or additional security.

### Nested hierarchy

Recursively divides the index domain into child regions, permutes leaves, and deterministically rearranges child branches. This tests whether literal hierarchical construction leaves block/locality fingerprints.

### Nested interleaved hierarchy

Retains recursive child derivation but interleaves independently derived child outputs at each merge rather than concatenating intact child regions. This is the current attempt to preserve a genuinely nested derivation while disrupting obvious blocks.

## Test matrix

Seven profiles were evaluated on 12x12, 64x64, and 128x128 grids with sixteen deterministic seed samples per grid/profile: 336 primary generated keys, plus deterministic regeneration, seed mutation, direct-profile comparison, and ciphertext comparison.

Every primary key reproduced exactly from the same seed, passed the canonical algebraic collision-free invariant, and produced a unique key ID within its profile/grid batch. The 12x12 cases also received exhaustive six-face validation.

The same deterministic payload was encrypted under the original and one-character-mutated seeds. Permutation, mask, ciphertext, and structural metrics were kept separate so an apparently healthy ciphertext avalanche could not hide a highly structured key generator.

## Research 0.4 aggregate results

| Profile | Permutation changed after seed mutation | Ciphertext bit change | Adjacency / random expectation | Axis correlation | Mean displacement | Regional predictability | 3D surface roughness |
|---|---:|---:|---:|---:|---:|---:|---:|
| Direct permutation | 96.15% | 49.99% | 1.012x | 0.126 | 34.29% | 37.4% | 34.46% |
| Iterative chain | 96.48% | 49.92% | 1.029x | 0.136 | 34.54% | 37.8% | 34.71% |
| Global random walk | 96.28% | 49.94% | 1.156x | 0.153 | 33.87% | 36.4% | 33.68% |
| **Local adjacent walk** | 48.47% | 49.92% | **29.20x** | **0.964** | **2.16%** | **76.0%** | **4.18%** |
| Nested permutation composition | 96.27% | 49.99% | 1.033x | 0.143 | 34.56% | 37.8% | 34.56% |
| **Nested hierarchy** | 96.36% | 50.04% | **13.38x** | **0.756** | 35.12% | **99.6%** | 34.87% |
| Nested interleaved hierarchy | 95.98% | 49.98% | 1.435x | 0.132 | 34.80% | 38.6% | 34.56% |

Generation time remained small in this matrix, from roughly 1.3 ms aggregate for direct generation to roughly 3 ms for the iterative candidate. Browser-facing research execution nevertheless runs in a dedicated worker so larger future experiments cost time rather than interface responsiveness.

### Important interpretation of regional predictability

The current regional-predictability metric is normalized mutual information between coarse source regions and destination regions. It is useful for comparing generators at the **same grid size**, but its raw value has a finite-sample upward bias on small grids because the current probe uses eight regions. This is especially visible at 12x12, where even the direct baseline reports a high raw value. Therefore this number must not be treated as an absolute security score. The 64x64 and 128x128 rows, and comparison against the direct same-size baseline, are more informative than the aggregate alone.

This bias is one reason the research interface does not treat any individual metric as proof of security or insecurity.

## Adjacency is no longer an automatic rejection rule

The earlier research pass used adjacency preservation as a provisional acceptance gate. That was useful for discovering obvious structure, but it conflated two different questions:

1. Does a generator preserve neighboring relationships?
2. Does that preserved structure give an observer useful predictive information?

Research 0.4 separates them.

Adjacency remains displayed because it is an excellent smoke detector for locality, but the 3D visualizer now has an explicit **Ignore adjacency as a rejection criterion** policy. When enabled, adjacency remains visible and measurable while independent probes continue to examine axis coupling, regional predictability, fixed-position concentration, and unusually short displacement.

This changes the interpretation of several candidates.

### Local adjacent walk still fails without using adjacency

Ignoring adjacency does not rescue the literal local walk. Its three axis permutations correlate at about **0.96**, its mean displacement is only about **2.2%** of the domain, and its regional-predictability signal is far above the well-mixed profiles. In other words, adjacency was not the underlying problem; it was merely exposing a generator that remains strongly predictable from its construction geometry.

The local walk is therefore retained as a useful negative control.

### Literal nested hierarchy still fails without using adjacency

The original nested hierarchy also remains conspicuous even when adjacency is ignored. Its axis correlation is about **0.76**, and its regional source/destination relationship is extraordinarily strong. The problem is not merely that neighboring cells sometimes stay neighbors; large-scale hierarchical information survives the derivation.

### Nested interleaved becomes much more interesting

The interleaved nested candidate is materially different. Its aggregate axis correlation is about **0.13**, its mean displacement is essentially baseline-like, its fixed-point behavior is not unusually concentrated, its 3D surface roughness is baseline-like, and its adjacency excess is comparatively modest at roughly **1.44x** random expectation.

At 64x64, its raw regional-predictability value is approximately 0.29 compared with approximately 0.23 for the direct baseline; at 128x128 it is approximately 0.16 versus approximately 0.11 for direct. Those differences are measurable, but much smaller than the literal nested hierarchy and must be interpreted with the finite-sample caveat above.

Therefore, **if adjacency itself is not considered harmful**, the current independent probes do not justify rejecting Nested Interleaved nearly as strongly as the earlier adjacency-first policy did. It should remain experimental, but it is now one of the more interesting candidates for continued nested-key research.

## 3D Key Generation Structure Visualizer

Scientific Tools now includes **Compare Key Generators in 3D**.

The visualizer generates several candidate keys from the **same seed and same grid size** and displays their actual sampled Latin-cube point fields:

`z = depthPermutation[(rowPermutation[x] + columnPermutation[y]) mod N]`

This is not a decorative approximation. Each displayed sample comes from a canonically validated candidate key. Multiple profiles can therefore be compared under identical starting conditions.

Available comparison sets include structural contrasts, all seven profiles, walk families, nested families, and the current baseline/candidate set. The viewport supports orbit, pan, zoom, camera reset, and optional auto-rotation.

Three render modes are currently available:

- **Point field + neighbor mesh** shows the generated 3D surface and connects neighboring source samples. Sheets, ridges, block boundaries, and unusually smooth local behavior can become visually apparent.
- **Point field only** removes the neighbor mesh for a less cluttered spatial comparison.
- **Source-region colors + mesh** colors contiguous original X/Y source neighborhoods before showing where their generated depths land. This is particularly useful for seeing whether nested or local generators leave recognizable regions, bands, or coherent structures.

The visualizer also reports axis leakage, regional predictability, mean displacement, 3D surface roughness, fixed-point excess, and adjacency. It can show the normal full structural policy or the predictability-first policy that deliberately ignores adjacency as a rejection criterion.

Generation runs in `binary-cube-key-generation-research-worker.js`, with progress, liveness, cancellation, and worker termination. Reseeding uses the same shared cryptographic reseed source as the Binary Cube laboratories.

## What the 3D view can and cannot show

A visually smooth, banded, blocky, or coherent result is evidence worth investigating because it suggests the generator retained recognizable structure.

A visually chaotic result is **not** proof of cryptographic security. High-dimensional dependencies can be invisible to a 3D projection, and a visually random mapping can still be algebraically weak. The image is therefore a diagnostic instrument rather than a security verdict.

Likewise, a visually coherent structure is not automatically unacceptable. If a generator deliberately preserves geometry but that geometry does not improve prediction, key recovery, known-plaintext inference, or search-space reduction, the retained structure may be harmless for the intended experiment. That question should be answered by cryptanalytic tests rather than aesthetics alone.

## Provisional disposition

### Direct permutation — production baseline

Retain unchanged for compatibility. It is simple, fast, deterministic, and remains the reference against which experimental profiles are compared.

### Iterative chain — experimental candidate

No obvious independent structural penalty has emerged. It is somewhat more expensive and has not yet demonstrated a decisive benefit over direct generation.

### Global random transposition walk — experimental candidate

The globally mixing walk remains broadly baseline-like. It is meaningfully different from the failed local walk and should not be conflated with it.

### Local adjacent walk — reject in current form

Rejected because of strong axis coupling, extremely short displacement, regional predictability, fixed-position concentration, and locality. This conclusion does not depend on adjacency alone.

### Nested permutation composition — research candidate, low priority

It remains well mixed, but composing complete permutations ultimately collapses to another complete permutation. No measurable advantage has yet justified its additional derivation complexity.

### Nested hierarchy — reject in current form

Rejected because substantial hierarchical information survives independently of the adjacency metric.

### Nested interleaved hierarchy — continue research

No longer treated as unacceptable merely because adjacency is above random expectation. Its independent metrics are substantially closer to baseline. It should remain experimental until larger-sample structural and direct cryptanalytic tests determine whether the remaining regional/local signals are actually useful to an attacker.

## Acceptance criteria going forward

A profile should not be promoted merely because it produces valid keys or attractive 3D output. Promotion should require:

1. Exact deterministic reproduction from the same seed, grid, profile ID, and profile version.
2. Explicit generation-profile provenance in any new key format so alternate keys cannot be ambiguously regenerated.
3. Canonical collision-free validation on every generated key and exhaustive six-face checks in validation vectors.
4. Seed-mutation ciphertext behavior assessed separately from permutation and mask behavior.
5. Low cross-axis predictive leakage.
6. No unexplained regional or hierarchical predictability relative to the direct same-size baseline.
7. No pathological fixed-point, displacement, cycle, or cross-seed-overlap behavior.
8. Adjacency recorded as a diagnostic, not automatically failed unless the intended threat model makes local preservation relevant.
9. Direct known-plaintext/chosen-plaintext testing for whether observed structure materially reduces uncertainty or search effort.
10. Practical generation cost and freeze-safe execution on slow hardware.
11. Backward compatibility: existing schema-0.2.0 direct keys must continue to validate and reproduce exactly.

## Canonical integration boundary

If alternate generation profiles are eventually promoted, the engine change should add a **generation-profile metadata contract**, not a second encryption implementation. A future key could record fields such as `generationProfile` and `generationProfileVersion`, and those fields would need to participate in new-profile fingerprint provenance.

Legacy direct keys must remain compatible. A seed without its generation-profile provenance is not enough to reproduce an alternate-profile key.

## Current conclusion

The research now supports a more useful question than “does this key look random?”:

> **How much usable predictive information survives the generation process?**

Direct, Iterative Chain, and Global Random Walk remain credible baselines/candidates. Literal Local Walk and Literal Nested Hierarchy remain strong negative controls even when adjacency is ignored. Nested Interleaved is the most interesting changed case: once adjacency is demoted from an automatic failure to a diagnostic, its remaining independent structure is much closer to the direct baseline and deserves deeper known-plaintext, regional-prediction, and larger-grid testing rather than premature rejection.
