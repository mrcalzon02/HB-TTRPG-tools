# Binary Cube Subcube Localized Damage Analysis

**Status:** Experimental diagnostic implemented on `main`.  
**Security classification:** TTRPG obfuscation research; not production cryptography.

## Purpose

This protocol tests a separate question from diffusion: what happens when one indexed subcube region is damaged after multi-input encoding? The test uses the authoritative `binary-cube-subcube-indexing.js` representation and does not modify the canonical cube transform.

For every region, the diagnostic flips every physical share assigned to that region, then attempts strict decoding with the original plan. Each case is classified as **exact recovery**, **explicit rejection**, or **unresolved/silent wrong recovery**. The acceptance rule is intentionally strict: every damaged-region case must either recover the exact source or be rejected. A wrong decoded source without rejection is a failure.

## Interfaces

Humans use `binary-cube-subcube-damage-laboratory.html`. Conventional software imports `binary-cube-subcube-damage-analysis.js` and calls `run(request)` or `compare(request)`. AI hosts project `skills/binary-cube-laboratory/subcube-damage-tool-projection.json` and receive the same configuration names and result semantics.

## Comparison protocol

Compare fan-outs 1, 3, 5, and 7 with the same source, mode, region-count policy, and seed family. Record regions tested, explicit detections, exact recoveries, unresolved cases, expansion ratio, and per-region affected physical-bit count. Run both `keyed-codeword` and `direct-replication` controls. Repeat later across low-entropy, repeated, alternating, and mixed payloads.

This diagnostic does not by itself prove secrecy or cryptographic strength. Its purpose is fault behavior: whether distributed representation makes localized damage detectable or recoverable rather than silently corrupting the logical payload.

## Promotion gate

Subcube indexing must not be promoted into the ordinary encryption workflow merely because fan-out is larger. Promotion requires runtime evidence from both the strength matrix and this damage protocol: exact normal round trips, collision-free plans, no silent corruption under the tested localized-damage model, and a measured benefit sufficient to justify expansion/runtime cost.

## Next target

Add optional tolerant decoding as a separately selectable experiment rather than weakening strict decoding. Candidate policies are majority recovery for direct replication and bounded nearest-codeword recovery for keyed codewords. Every tolerant result must report corrected-share count and ambiguity; ambiguity must reject rather than guess.