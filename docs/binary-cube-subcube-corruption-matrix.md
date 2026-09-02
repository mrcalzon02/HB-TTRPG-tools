# Binary Cube Subcube Share-Corruption Matrix

**Status:** Experimental validation authority; not ordinary encryption.  
**Module:** `binary-cube-subcube-corruption-matrix.js`  
**Security classification:** Experimental TTRPG obfuscation research, not production cryptography.

## Purpose

This matrix extends localized region-damage analysis into explicit share-level boundary testing. It is intended to discover the exact point where bounded tolerant decoding stops correcting damage, begins rejecting damage, or—most importantly—accepts incorrect plaintext.

## Mutation families

For sampled logical codewords the matrix flips increasing numbers of shares from 1 through the configured depth. It includes first/contiguous share selections and dispersed selections. It also flips every share belonging to each indexed region and constructs an adversarial majority flip for the first logical codeword when fan-out is greater than one.

Every mutation is independently evaluated by the strict decoder and the bounded tolerant decoder. Results classify exact recovery, explicit rejection, and wrong accepted plaintext. Wrong accepted plaintext is recorded as `tolerantSilentCorruption` and causes the matrix acceptance result to fail.

## Surfaces

Humans use `binary-cube-subcube-corruption-laboratory.html`. Conventional callers use `run(request)` or `compare(request)` from `binary-cube-subcube-corruption-matrix.js`. Structured AI hosts use `skills/binary-cube-laboratory/subcube-corruption-tool-projection.json`.

All surfaces delegate to `binary-cube-subcube-indexing.js` for planning, encoding, strict decoding, and tolerant decoding. They do not recreate those algorithms.

## Acceptance and promotion rule

This matrix is evidence gathering. Tolerant decoding must not enter ordinary encryption merely because some damaged cases recover. Promotion requires observed runtime evidence across low-entropy, alternating, repeated, and mixed payloads and fan-outs 1/3/5/7, with no silent corruption inside the claimed correction envelope. Cases outside the envelope must be documented as rejection or known unsafe behavior rather than hidden.

## Next target

Execute the matrix in a compatible runtime, preserve any silent-corruption counterexamples, then add integrity/authentication experiments around subcube recovery so wrong-but-plausible tolerant outputs can be detected independently of codeword distance.