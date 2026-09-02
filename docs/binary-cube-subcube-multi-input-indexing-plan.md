# Binary Cube Subcube Multi-Input Indexing Plan

**Project:** Cube Encryption Laboratory / HB-TTRPG-tools  
**Authority scope:** Planned strengthening experiment for representing each source bit across multiple indexed cube-entry positions.  
**Status:** Design gate; not yet an encryption mode.  
**Security classification:** Experimental TTRPG obfuscation research, not production cryptography.

## Intent

The proposed subcube strengthening method changes the relationship between source data and cube-entry positions. In the current Binary Cube path, a source bit ultimately occupies one payload position before the cube permutation/projection transform. The proposed method makes one source bit affect multiple indexed entry positions distributed across distinct subcube regions before the canonical cube transform.

This document calls that mechanism **subcube multi-input indexing**: one logical source bit is encoded into a small keyed set of physical input bits, each assigned to a different indexed placement whenever capacity permits. The term describes the data representation and placement stage only. It does not claim that the design is cryptographically strong or production-ready.

## Why this is separate from pre-entry masking

Reversible XOR field masks such as white noise, newspaper cut-out, plasma noise, and cellular diffusion can obscure visible low-entropy structure. A fixed mask does not create avalanche diffusion: flipping one source bit still flips only one corresponding masked bit before cube entry.

Subcube multi-input indexing is intended to test a different hypothesis: whether deliberately causing one logical source bit to modify several physically separated cube-entry positions improves post-transform diffusion, reduces localized recoverability, or changes repeated-pattern leakage in a measurable way.

The two mechanisms may later be composed, but they must be tested independently first so strength changes can be attributed to the correct layer.

## Baseline experiment: direct replication

The simplest diagnostic implementation copies source bit `b[i]` to a fan-out of `R` indexed positions. Example with `R = 3`:

- logical bit 0 -> physical positions P(0,0), P(0,1), P(0,2)
- logical bit 1 -> physical positions P(1,0), P(1,1), P(1,2)
- and so on

The placement schedule is deterministic from separate subcube indexing parameters and must avoid duplicate physical positions. Placements for one logical bit should cross distinct subcube regions when enough regions exist.

Direct replication is a control design, not the preferred strengthening design. It increases redundancy and can improve corruption tolerance, but repeating a bit at several known positions may increase exploitable structure.

## Preferred experiment: keyed multi-placement coding

The preferred first strengthening candidate masks each logical bit into a keyed codeword before placement.

For logical source bit index `i` and fan-out `R`:

1. Derive a deterministic base codeword `C_i` of length `R` from a separate indexing/mixing seed and logical index `i`.
2. Derive a deterministic odd-weight delta codeword `D_i` of length `R`. The delta should affect several placements, preferably all placements for odd fan-outs such as 3, 5, or 7.
3. Encode source bit 0 as `C_i`.
4. Encode source bit 1 as `C_i XOR D_i`.
5. Place the resulting `R` physical bits at the keyed index set `P_i` across distinct subcube regions where possible.
6. After cube decryption, gather the indexed physical bits, regenerate `C_i` and `D_i`, and decode the logical source bit only when the observed codeword matches a valid state under the selected tolerance rule.

This structure means changing one logical source bit can intentionally change multiple pre-cube input positions rather than one. The effect must then be measured through the existing perturbation-strength analyzer rather than assumed to be useful.

## Subcube partition model

A subcube region is a deterministic partition of the pre-cube input field used only for indexing and analysis. Initial experiments should support at least these partition families:

- contiguous square/rectangular regions;
- interleaved lattice regions;
- checkerboard/modulo regions;
- keyed shuffled regions;
- hierarchical regions where a large field is partitioned into coarse regions and then local cells.

The first implementation should prefer a simple deterministic partition with easy validation. More complex region maps are justified only if measurements show a reason to add them.

## Index schedule requirements

For every encoded source bit, the schedule must record or reproducibly derive:

- logical source index;
- fan-out count;
- physical placement indexes;
- subcube/region identity for each placement;
- local position within each region;
- schedule seed/version;
- source bit length;
- encoded physical bit length;
- collision count, which must be zero for an accepted schedule;
- any unused/padding positions.

A validator must reject schedules with duplicate physical positions, out-of-range indexes, missing placements, incompatible versions, or a fan-out that cannot be represented in the selected field capacity.

## Recovery material and package separation

The index schedule seed and coding parameters are recovery material. During experiments they should remain separate from ciphertext alongside the Binary Cube key and any pre-entry mask descriptor.

Putting all recovery seeds directly into the ciphertext package may still be useful for transparent scientific demonstrations, but that mode must be labeled as a reproducibility mode rather than a secrecy-strengthening mode.

## Configuration surface

Initial configuration should expose:

- enabled/disabled;
- fan-out `R` (initial candidates 1, 3, 5, 7);
- region count or partition dimensions;
- indexing seed;
- coding mode (`direct-replication` control vs `keyed-codeword` experiment);
- placement strategy;
- corruption tolerance (`strict`, later optional majority/error-detection modes);
- maximum expansion ratio;
- whether placements must occupy distinct regions.

Defaults should remain conservative. Fan-out 1 is the exact baseline and must reproduce the current non-subcube input relationship.

## Required human interface

The human laboratory should visualize one logical source bit and all physical placements that it influences. A useful inspection view should allow selecting a logical source index and highlighting:

- the source bit;
- generated codeword;
- every physical placement;
- each placement's subcube/region;
- post-cube destination locations where diagnostics can resolve them;
- recovery result and any conflicting/missing shares.

The interface should also display expansion ratio, collision state, region coverage, fan-out, and measured diffusion changes against baseline.

## Required API surface

The eventual shared module should provide bounded operations such as:

- `listSubcubeIndexingModes()`
- `buildSubcubeIndexPlan(request)`
- `validateSubcubeIndexPlan(plan)`
- `encodeSubcubeInputs(bits, planOrOptions)`
- `decodeSubcubeInputs(encodedBits, plan)`
- `analyzeSubcubeCoverage(plan)`
- `runSubcubeIndexingSelfTest()`

High-level masked/cube workflows may later accept a subcube indexing configuration only after the standalone module passes its own acceptance gates.

## Required AI/tool projection

AI hosts should receive the same configuration names and validation semantics as humans and conventional callers. Tool projection should expose plan discovery, plan generation/validation, encode/decode experimentation, and analysis. It must not present the mode as stronger merely because fan-out is greater than one.

## Validation gates before encryption integration

The standalone indexing layer must pass all of these before it can enter the normal encrypt/decrypt workflow:

1. **Determinism:** same source length, seed, configuration, and version -> identical schedule and codewords.
2. **Exact recovery:** encoded -> decoded returns the exact original bits.
3. **Fan-out enforcement:** every logical bit affects exactly the configured number of physical positions unless a documented capacity fallback rejects the request.
4. **No placement collisions:** no physical input position is assigned to two logical placements unless a later explicitly designed multiplexing mode permits it.
5. **Cross-region coverage:** when required, placements for a logical bit occupy distinct subcube regions.
6. **One-bit perturbation:** flipping one logical source bit changes the expected multi-placement codeword positions before cube entry.
7. **Post-cube diffusion:** the existing strength analyzer measures whether the multi-placement change materially increases ciphertext diffusion versus fan-out 1.
8. **Localized damage:** corrupting/removing one subcube region produces a recorded recovery outcome rather than silent wrong plaintext.
9. **Wrong plan/seed rejection:** incorrect recovery material must fail validation or decoding clearly.
10. **Boundary lengths:** test payloads immediately below, at, and above encoded block/region boundaries.
11. **Expansion accounting:** report physical-bit expansion and runtime/memory cost for every test.
12. **Pattern analysis:** rerun all-zero, all-one, alternating, and repeated-byte packages to determine whether redundancy introduces new visible structure.

## Strength measurements

For each tested fan-out and placement strategy, compare against the exact same plaintext, cube key, and baseline configuration. Record:

- plaintext-bit perturbation -> pre-cube Hamming change;
- plaintext-bit perturbation -> final ciphertext Hamming change;
- minimum/mean/maximum diffusion;
- number of subcube regions affected;
- repeated-block similarity;
- low-entropy ciphertext statistics;
- localized corruption recovery;
- encoded expansion ratio;
- runtime and memory overhead.

The mode is worth integrating only if it provides a repeatable benefit that justifies its cost and does not introduce a worse structural weakness.

## Relationship to planned strengthening methods

Subcube multi-input indexing belongs in the same comparative strengthening campaign as:

- pre-entry field masking;
- block-to-block chaining;
- key-schedule changes;
- data-dependent diffusion stages;
- nested/subcube transforms;
- optional error-detection or recovery coding.

These are candidate mechanisms, not a stack that should automatically be enabled together. Test each mechanism independently, then test combinations only after individual effects are understood.

## Next implementation step

Build the standalone indexing planner/validator first with fan-out 1 and 3 plus `direct-replication` and `keyed-codeword` modes. Do not modify `shadowrun-binary-cube-engine.js` during that first experiment. Feed the encoded bitfield into the existing engine through a high-level experimental workflow, use the current strength analyzer for before/after measurement, and only then decide whether subcube multi-input indexing merits promotion into the ordinary laboratory workflow.
