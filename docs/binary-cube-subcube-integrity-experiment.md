# Binary Cube Subcube Recovery Integrity Experiment

**Status:** implemented experimental layer; not promoted to ordinary encryption.  
**Authority:** `binary-cube-subcube-integrity.js`  
**Security classification:** experimental TTRPG obfuscation/integrity research, not production cryptography.

## Purpose

Tolerant subcube decoding can produce a plausible logical bitstream after damaged shares. Error correction and trust are separate questions. This layer therefore authenticates the source bitstream and recovery context independently of the subcube decoder. A tolerant decode is accepted only when the recovered source reproduces the previously captured integrity tag.

## Current experiment

`computeIntegrityTag()` produces a 128-bit deterministic keyed research tag over the normalized source and canonical recovery context. `verifyIntegrityTag()` compares a recovered source against that artifact. `protectedEncode()` composes canonical subcube indexing with integrity capture. `protectedDecode()` performs strict or tolerant canonical decoding and then requires independent integrity verification.

The tag algorithm is intentionally labeled `experimental-keyed-hash128-v1`. It is dependency-free and browser/Node portable, but it is not a standardized MAC and must not be represented as cryptographic authentication suitable for real secrets.

## Context binding

The tag binds source length, fan-out, indexing mode, region count, indexing seed, optional cube-key identity, and optional pre-entry-mask identity. This prevents an integrity artifact from silently describing a different experimental recovery configuration.

## Acceptance gates

Before this mechanism can influence ordinary encryption defaults, runtime tests must establish: exact uncorrupted verification; corrected tolerant recovery verification; wrong-key rejection; wrong-plaintext rejection; context-mismatch rejection; integrity-artifact mutation rejection; corruption-matrix integration with zero accepted silent corruption; and cross-interface parity between browser, CommonJS/API, and projected AI tools.

A later production-oriented design, if ever required, must replace the experimental keyed hash with a standardized authenticated construction available through an appropriate cryptographic runtime. Do not rename the current experiment as a MAC, signature, or proof of security.

## Human/API/AI surfaces

Humans use `binary-cube-subcube-integrity-laboratory.html`. Conventional integrations import `binary-cube-subcube-integrity.js`. AI hosts project `skills/binary-cube-laboratory/subcube-integrity-tool-projection.json`. All three converge on the same module.

## Next target

Integrate integrity verification into the share-corruption matrix as an additional independent outcome. The matrix should report whether strict decoding, tolerant decoding, and integrity verification agree for each mutation, and specifically search for cases where tolerant decoding returns wrong plaintext that the integrity layer successfully rejects.