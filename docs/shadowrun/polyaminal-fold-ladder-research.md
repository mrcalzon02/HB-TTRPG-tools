# Polyaminal Fold Ladder Compression Research
## Practicality, Functional Model, Risks, and Phased Development Plan

**Repository:** `mrcalzon02/HB-TTRPG-tools`  
**Workspace:** Shadowrun  
**Branch policy:** `main` only  
**Working name:** Polyaminal Fold Ladder, abbreviated **PFL**  
**Current classification:** Lossless reversible transform and experimental binary compressor; **not encryption**  
**Prototype files:** `shadowrun-polyaminal-fold-engine.js` and `scripts/validate-shadowrun-polyaminal-fold.mjs`

---

## 1. Naming and conceptual interpretation

“Polyaminal” is being retained as Christopher Vardeman’s project term for a structure made from multiple interlocking, recursively connected binary layers. It is not being treated as an established computer-science term. Within this project, the name describes a network in which each fold produces two related outputs:

- an **anchor stream**, containing the first bit of each pair;
- a **swing stream**, recording whether the second bit remains the same as the anchor or swings to its opposite value.

The anchor stream is folded again. That creates a ladder of progressively smaller anchor levels and a stack of swing levels. The phrase “a fold of a fold of a fold” therefore has a precise implementation meaning rather than remaining metaphorical.

The proposed system should not be described as layered encryption. Repeating reversible rearrangements does not automatically provide cryptographic security. The practical and honest architecture is:

```text
source data
    ↓
binary segmentation
    ↓
recursive anchor/swing fold ladder
    ↓
per-stage gated compression
    ↓
compact deterministic package
    ↓
optional encryption or Shadowrun cube permutation
```

Compression must happen before a genuine encryption stage. Once strong encryption has made the data resemble random noise, the fold ladder normally has no useful statistical structure left to exploit.

---

## 2. Core reversible fold

For each binary pair `(a, b)`, define:

```text
anchor = a
swing  = a XOR b
```

The original pair is recovered with:

```text
a = anchor
b = anchor XOR swing
```

The pair transformation is therefore lossless and reversible.

For an eight-bit example:

```text
input:       a b c d e f g h
stage 1 A:   a   c   e   g
stage 1 S:   a⊕b c⊕d e⊕f g⊕h
```

The anchor stream is folded again:

```text
stage 2 A:   a       e
stage 2 S:   a⊕c     e⊕g
```

Then once more:

```text
root:        a
stage 3 S:   a⊕e
```

The final representation is one root bit plus all swing stages. For a block of `N` bits, where `N` is a power of two:

```text
1 + N/2 + N/4 + N/8 + ... + 1 = N
```

That identity is critical. The raw fold by itself does **not** compress anything. It conserves the exact original information count. Its value is that it reorganizes the information into stage streams whose statistical properties may be easier to encode.

---

## 3. Why the fold can expose compressible structure

The swing bit answers a simple question: did the second bit equal the first bit?

- `0` means the pair stayed the same: `00` or `11`.
- `1` means the pair switched: `01` or `10`.

This produces useful behavior for several data families:

### Long constant regions

A block of all zeros or all ones produces constant swing planes. Every stage can be represented by a tiny constant marker rather than storing every bit.

### Repeating alternation

A pattern such as `010101...` produces a first swing stage full of ones and an anchor stream full of zeros. The later stages are then constant. This is an important demonstration that the ladder can expose structure that ordinary same-bit run detection would miss.

### Periodic and aligned signals

Signals with powers-of-two repetition periods can produce sparse or constant differences at particular ladder depths. This makes the transform potentially useful for telemetry, bit planes, masks, game-state flags, machine-state snapshots, and other structured binary sources.

### Text and byte-oriented data

Text converted directly to one continuous binary stream can produce some biased stages, especially where byte high bits and repeated character structures align. However, plain bit adjacency is not optimized for text, so gains are expected to be modest unless a byte or bit-plane preconditioner is added.

### Random or encrypted data

Random-looking data produces swing planes that remain near an even mixture of zeros and ones. Those stages cannot be encoded more cheaply than raw bits, and the stage identifiers and header create slight expansion. This is required behavior, not a defect in the reversibility logic.

---

## 4. Gated stage selection

Every swing stage is passed through a deterministic gate. The gate estimates the actual encoded cost of each available stage representation and selects the smallest one.

The initial prototype provides four gates:

### Gate 0 — Raw

Store every swing bit directly. This is the fallback when no compression method is worthwhile.

### Gate 1 — Constant

Store one value when the entire stage is all zeros or all ones.

### Gate 2 — Run-length

Store the first bit and Elias-gamma-coded run lengths. This benefits long contiguous runs.

### Gate 3 — Sparse minority positions

Select whichever bit is less common, then store its count and delta-coded positions. This benefits heavily biased stages even when the minority bits are scattered rather than forming long runs.

Each stage stores a two-bit gate identifier. Because the decoder already knows the stage’s expected length from the block size and ladder level, the individual stage does not need a separate length field.

This is the practical meaning assigned to the requested “series of gated swing information” approach: the swing layer is not blindly compressed by one method. It passes through a cost gate that chooses among multiple reversible representations.

---

## 5. Segmentation and packing

The prototype supports power-of-two blocks:

- 64 bits
- 128 bits
- 256 bits
- 512 bits
- 1,024 bits
- 2,048 bits
- 4,096 bits

Each block is independently folded. The final block is padded with zeros, while the package header preserves the exact original bit length so padding is removed after decompression.

The compact binary stream contains:

1. a four-byte `PFL1` magic value;
2. binary format version;
3. block-size exponent;
4. original bit length;
5. one root bit per block;
6. one gated encoding for every swing stage in every block.

The binary stream is base64-encoded for transport inside the current JSON package. A non-cryptographic FNV-1a checksum detects accidental corruption. The checksum is explicitly not a message-authentication code and does not prevent deliberate modification.

---

## 6. Unpacking and reconstruction

Decoding follows the exact reverse ladder:

1. validate package format and checksum;
2. read block size and original length from the binary header;
3. read one root bit;
4. decode each swing stage through its recorded gate;
5. begin with the root anchor stream;
6. process swing stages in reverse order;
7. reconstruct each pair as `(anchor, anchor XOR swing)`;
8. concatenate restored blocks;
9. trim the final padding to the original bit length.

No heuristic guessing is needed during decompression. Every gate is deterministic and self-delimiting relative to its known stage length.

---

## 7. Initial prototype measurements

The first deterministic prototype uses 1,024-bit blocks for the following fixtures:

| Fixture | Input bits | Encoded bits | Ratio | Change |
|---|---:|---:|---:|---:|
| All zeros | 4,096 | 204 | 0.0498 | 95.02% smaller |
| Alternating `01` | 4,096 | 204 | 0.0498 | 95.02% smaller |
| Power-of-two aligned long runs | 4,096 | 204 | 0.0498 | 95.02% smaller |
| Repeated English sentence encoded as bytes | 4,320 | 4,055 | 0.9387 | 6.13% smaller |
| Deterministic random bits | 4,096 | 4,254 | 1.0386 | 3.86% larger |

These numbers demonstrate feasibility, but they do not establish competitive performance. The highly structured fixtures align unusually well with the present block boundaries. Broader corpora and comparisons against established codecs are required before any performance claim is justified.

The current automated validator performs:

- fold/unfold conservation checks;
- 392 complete encode/decode round trips;
- all seven supported block sizes;
- boundary lengths immediately below, at, and above block boundaries;
- multi-block payloads;
- deterministic structured and random benchmarks;
- bitstream corruption detection.

---

## 8. Practicality assessment

### What is practical now

The following parts are technically sound and already implemented:

- exact reversible anchor/swing transformation;
- recursively stacked fold levels;
- deterministic segmentation;
- gated per-stage coding;
- compact binary packing;
- lossless unpacking;
- corruption detection;
- bounded block memory;
- fallback to raw stage storage.

### What remains experimental

The following claims are not yet established:

- that PFL outperforms established general-purpose compressors;
- that the current bit ordering is optimal for any broad data class;
- that repeated folds provide encryption;
- that the system is resistant to cryptanalysis;
- that the current stage gates are near-optimal;
- that the method scales efficiently to very large files in its browser implementation.

### Where it may be useful

PFL is most promising as:

- a preconditioner for binary masks and bit planes;
- a low-complexity telemetry or state-vector codec;
- a compressor for repeated flags and structured machine-state snapshots;
- a visualization tool for hierarchical binary correlations;
- a Shadowrun Matrix puzzle and fictional data-packaging system;
- a research front end before a stronger entropy coder.

### Where it is currently weak

PFL is likely weak for:

- already compressed files;
- encrypted data;
- high-entropy media payloads;
- short inputs where header cost dominates;
- data whose useful relationships are not adjacent or power-of-two aligned;
- byte-oriented sources without a suitable preconditioner.

---

## 9. Encryption boundary

PFL must remain clearly separated from encryption.

A practical secure pipeline would be:

```text
plaintext
  → optional source-specific preconditioner
  → Polyaminal Fold compression
  → standard authenticated encryption
  → transmission or storage
```

For the Shadowrun tool suite, a fictional or puzzle-oriented path may instead be:

```text
binary paydata
  → Polyaminal Fold compression
  → Binary Cube face permutation
  → Matrix package
```

The second path can be entertaining and mechanically rich, but it must remain labeled as game-use obfuscation rather than real security.

Applying a cryptographic transformation between fold stages would generally defeat later compression because each encrypted layer would destroy the visible regularity the next fold requires. Therefore “layered encryption” should be interpreted as layered reversible encoding until the final outer encryption step.

---

# Phased development plan

## PFL Phase 0 — Concept normalization

**Goal:** Convert the fold-stack description into an exact reversible model.

**Completed work:**

- defined anchors and swings;
- defined recursive ladder order;
- proved raw bit conservation;
- separated compression from encryption terminology;
- selected a deterministic block model.

**Gate:** `unfold(fold(block)) == block` for every tested block.

**Status:** Completed.

---

## PFL Phase 1 — Gated prototype codec

**Goal:** Determine whether stage streams can be compressed in practice.

**Completed work:**

- raw gate;
- constant gate;
- run-length gate;
- sparse minority-position gate;
- exact gate-cost comparison;
- Elias-gamma integer coding;
- compact bit writer and reader;
- multi-block framing;
- corruption checksum.

**Gate:** Arbitrary test payloads round-trip and random input falls back primarily to raw stages.

**Status:** Completed as schema `0.1.0`.

---

## PFL Phase 2 — Repository validation and deployment gate

**Goal:** Prevent regression and make the prototype part of normal repository verification.

**Work items:**

1. run syntax validation on the engine;
2. execute all block-boundary round trips;
3. preserve benchmark fixtures;
4. record a machine-readable validation summary;
5. call the validator from the GitHub Pages workflow;
6. stop deployment if PFL validation fails.

**Gate:** Continuous integration reports all PFL assertions and round trips as passing.

**Status:** Validator implemented; workflow integration is part of the current development pass.

---

## PFL Phase 3 — No-expansion package mode

**Goal:** Prevent high-entropy inputs from expanding unnecessarily.

**Work items:**

1. calculate complete compressed block cost before emission;
2. add a per-block or per-package raw escape mode;
3. store the original block directly when folded encoding is not smaller;
4. include the raw-mode flag in checksum coverage;
5. test incompressible and adversarial inputs.

**Gate:** Encoded output is never more than a small fixed header larger than raw input, with an optional strict mode that rejects compression when no savings exist.

---

## PFL Phase 4 — Preconditioning experiments

**Goal:** Expose correlations that are not visible in direct adjacent-bit order.

**Candidate preconditioners:**

- byte bit-plane transpose;
- word bit-plane transpose;
- XOR against previous byte or word;
- delta coding for integer streams;
- Gray-code conversion;
- stride and interleave transforms;
- source-defined channel separation.

**Gate:** Every preconditioner is independently reversible and selected only when total package cost decreases.

---

## PFL Phase 5 — Adaptive segmentation

**Goal:** Reduce dependence on fixed power-of-two alignment.

**Work items:**

1. compare several block sizes on sample windows;
2. select block size by actual encoded cost;
3. investigate block-boundary shifts;
4. add bounded cross-block state;
5. prevent pathological search cost;
6. serialize segmentation decisions compactly.

**Gate:** Adaptive mode improves a representative structured corpus without materially worsening random-data performance.

---

## PFL Phase 6 — Stronger entropy back end

**Goal:** Determine whether the fold ladder is useful as a front end to established entropy coding.

**Candidates:**

- canonical Huffman coding;
- range coding;
- arithmetic coding;
- asymmetric numeral systems;
- dictionary coding for repeated stage patterns.

**Gate:** Comparisons distinguish gains caused by the fold transform from gains caused by the entropy coder itself.

---

## PFL Phase 7 — Corpus and baseline evaluation

**Goal:** Establish realistic usefulness.

**Required datasets:**

- plain text;
- JSON and structured logs;
- binary masks;
- bitmap and image bit planes;
- integer telemetry;
- executable or machine-code samples;
- already compressed files;
- encrypted and random controls.

**Required baselines:**

- raw storage;
- run-length encoding;
- gzip or DEFLATE;
- Brotli;
- Zstandard;
- a bit-plane-specific compressor where appropriate.

**Metrics:**

- compressed size;
- encode time;
- decode time;
- peak memory;
- block latency;
- corruption behavior;
- streaming feasibility.

**Gate:** Identify at least one defensible source class where PFL offers a useful tradeoff, or honestly classify the method as primarily educational and game-oriented.

---

## PFL Phase 8 — Shadowrun laboratory interface

**Goal:** Make the ladder visible and usable at the table.

**Planned controls:**

- binary input;
- block size;
- fold and unfold actions;
- stage-by-stage anchor and swing views;
- gate selected for each stage;
- stage density and encoded cost;
- compression ratio;
- package import and export;
- corruption simulation;
- optional handoff to Binary Cube Encryption Laboratory.

**Gate:** A user can see exactly where compression occurred and pass the resulting bitstream into the existing cube tool.

---

## PFL Phase 9 — Optional authenticated encryption adapter

**Goal:** Provide a proper security boundary without inventing a custom cipher.

**Work items:**

1. keep the core PFL engine encryption-neutral;
2. compress before encryption;
3. use a standard authenticated-encryption primitive through a vetted platform API;
4. derive keys with an established key-derivation method;
5. keep compression metadata inside authenticated coverage;
6. document compression side-channel risks for interactive or attacker-influenced plaintext.

**Gate:** Security claims apply only to the standard encryption adapter, never to the fold ladder itself.

---

## 10. Immediate next actions

The next development pass should:

1. add PFL and Binary Cube validators to the deployment workflow;
2. add no-expansion raw package mode;
3. build a browser stage visualizer;
4. add byte bit-plane and previous-byte XOR preconditioners;
5. compare those modes against raw PFL on text, masks, and telemetry fixtures;
6. create a clean handoff from PFL output into the Binary Cube tool;
7. preserve benchmark receipts so performance claims remain reproducible.

---

## 11. Current and next contextual checkpoint

The work being done now converts the proposed stacked folding concept into a real reversible codec with measurable behavior. This moves the project forward by replacing ambiguous “compression through repeated encryption” language with a working anchor/swing ladder, deterministic gates, binary packing, and reproducible tests.

The next work must integrate the validator into continuous deployment and add a no-expansion fallback, because those two steps establish a trustworthy baseline before visual tooling, adaptive segmentation, or cube-pipeline integration is attempted.
