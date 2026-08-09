# [SYSTEM REPORT] Scientific Diagnostic Evaluation Pipeline — Top-Line Architecture and Implementation Plan

**Active operation:** build a deterministic, concurrent, evidence-calibrated diagnostic pipeline above the existing Decryption Dashboard, Information & Deobfuscation Suite, Media Forensics Suite, Advanced Steganalysis Laboratory, Binary Cube cryptanalytic tools, and known-ground-truth demonstration corpus.  
**Rule integrity:** existing specialist tools remain authoritative; the pipeline routes work to them and combines their evidence without duplicating their algorithms or replacing their scientific caveats.  
**Execution depth:** slow/thorough by design, cancelable, progress-reporting, worker/cooperative where available, and callable from both the browser dashboard and a local Node.js runtime.

## Objective

The dashboard needs a single file-ingestion path that decides what an asset appears to be, determines which detectors are technically applicable, runs those detectors in a deterministic order, permits independent detectors within a stage to execute concurrently, and then produces an evidence ledger rather than a binary yes/no result.

The primary scientific distinction is between **absence of positive evidence** and **evidence of absence**. A method that did not find a payload may simply be the wrong detector for the concealment method. The pipeline therefore reports not only positive-evidence strength but also how much of the applicable detector space was actually exercised and how much residual miss-risk remains.

## Top-line indices

The first pipeline report exposes four normalized indices. They are evidence indices, **not posterior probabilities**.

- **Asset Presence Index** — weighted ratio of positive evidence to positive-plus-negative evidence among detectors that actually completed.
- **Certainty Index** — combines detector coverage, sample sufficiency, agreement of the resulting evidence direction, and the number of independent evidence families contributing materially.
- **Coverage Index** — fraction of the weighted applicable detector plan that completed successfully.
- **Undetected / Miss-Risk Index** — rises when an applicable detector could not execute, detectors were inconclusive, the sample is weak, errors occurred, or the material remains highly opaque/random-like after available tests.

A low Asset Presence Index with low Coverage or high Miss-Risk must be reported as inconclusive rather than “nothing is there.”

## Deterministic order of operations

### Stage 0 — Acquisition and asset classification

Record byte length, caller MIME hints, magic signatures, text-likeness, entropy, printable ratio, bit density, and known Binary Cube artifact signatures. This stage decides the initial routing graph.

### Stage 1 — Broad independent baselines

Run the Information & Deobfuscation statistical analysis and the Media Forensics full sweep concurrently where their runtimes allow it. These are deliberately independent evidence families: compression/randomness/information structure on one side, and bit-plane/container/signal carving on the other.

### Stage 2 — Asset-specific detectors

Route only applicable methods:

- Binary Cube artifacts → canonical Decryption Dashboard structural diagnostics.
- Text-like assets → Unicode / zero-width / bidi / variation-selector / trailing-whitespace steganography diagnostics.
- PNG → chunk metadata, text chunks, and post-IEND/trailing-data analysis.
- JPEG → metadata plus baseline coefficient-domain inspection where supported.
- Decoded raster → localized RS, Sample Pair Analysis, residual statistics, and tile-level steganalysis.
- WAVE/audio → the existing Media Forensics PCM, bit-plane, spectrum, carrier and modem diagnostics already included in the media sweep.

### Stage 3 — Deep inference and attack surface

Thorough mode adds ranked reversible deobfuscation. Exhaustive mode additionally runs the bounded Binary Cube attack suite when the file is a recognized Binary Cube artifact. Future detector families can be registered at this stage without changing the earlier routing contract.

## Execution profiles

**Triage** runs acquisition, broad information statistics, broad media forensics, and inexpensive format-specific inspection. It is the fastest profile.

**Thorough** is the default. It adds pixel/coefficient steganalysis where available and the reversible deobfuscation sweep. This profile is intentionally slow but remains cancelable and progress-reporting.

**Exhaustive** adds bounded cryptanalytic attack suites and the largest candidate limits. The goal is time-for-coverage rather than interactive speed.

## Concurrency and offloading contract

Stages execute in fixed numerical order so results remain reproducible and understandable. Independent detectors within one stage may run concurrently, but their output is sorted back into declared deterministic order before scoring or rendering.

The orchestrator itself must not absorb specialist algorithms. Expensive detectors retain their current execution model:

- Media Forensics may use its dedicated Web Worker.
- Advanced Steganalysis uses its dedicated Web Worker.
- Information & Deobfuscation uses the shared cooperative scheduler for long candidate scoring.
- Binary Cube cryptanalytic runs retain the canonical dashboard/cooperative execution contract.
- The local Node.js runner executes the same routing and score model without requiring the GitHub Pages site.

## Local/offline execution

The first local target is a dependency-free Node.js command-line runner using only modules already present in the repository and Node built-ins. It reads a file directly from disk and emits the same diagnostic report schema used by the browser pipeline.

For PNG files, the local runner includes a bounded built-in decoder for common 8-bit, non-interlaced PNG color modes so pixel-domain RS/SPA analysis can run without a browser. JPEG coefficient analysis remains available locally through the existing coefficient parser. Unsupported raster variants increase Miss-Risk rather than being silently treated as clean.

A later desktop shell can wrap the exact same pipeline contract. It should not fork or reproduce the scientific models.

## Demonstration and calibration path

Known-ground-truth demonstration assets should become a formal calibration corpus for the pipeline. Every detector should eventually declare:

- the concealment families it is expected to detect,
- known negative controls,
- known positive controls,
- sample-size requirements,
- sensitivity limitations,
- false-positive observations,
- and versioned evaluation receipts.

This allows Certainty and Miss-Risk to evolve from heuristic evidence weighting toward empirically calibrated detector reliability without ever collapsing the ledger into an opaque “AI says hidden data is 93% likely” output.

## Implementation phases

### Phase 1 — Foundation

Create the runtime-neutral pipeline engine, deterministic routing graph, evidence schema, four top-line indices, browser panel, local Node runner, and validation contract.

### Phase 2 — Dashboard integration

Add the Diagnostic Evaluation Pipeline to the Scientific Tools / Decryption Dashboard surface and load its dependencies through the centralized Scientific Tools loader. Also expose the newly added Advanced Steganalysis Laboratory through the same authoritative loader rather than a separate launch path.

### Phase 3 — Detector calibration registry

Create a versioned registry describing method applicability, expected sensitivity, minimum sample size, known limitations, and calibration corpus results. Replace hard-coded reliability constants with measured calibration data where possible.

### Phase 4 — Demonstration-corpus automation

Run clean controls and positive-control files through the routed pipeline automatically, retain confusion matrices / ROC / regression receipts where applicable, and report detector-family performance separately rather than averaging incompatible measurements.

### Phase 5 — Local desktop packaging

Wrap the local runtime in a thin desktop shell or packaged local launcher. The shell owns file access and process lifecycle only; the canonical Scientific Tools modules remain the analysis implementation.

### Phase 6 — Resumable long-run jobs

Add persisted job manifests, stage checkpoints, optional worker-thread pools for local execution, cancellation/restart, and report resumption so multi-hour exhaustive scans can survive UI closure or machine interruption.

## Scientific interpretation boundary

Encryption, compression, encoding, steganography, accidental structure, metadata, and ordinary file-format behavior can produce overlapping statistical symptoms. No single detector and no aggregate index is allowed to claim semantic content, intent, successful decryption, or universal absence. A report must always preserve which detector produced each piece of evidence, what that detector is sensitive to, and which applicable methods were not successfully exercised.
