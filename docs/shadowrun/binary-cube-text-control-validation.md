# Binary Cube Known-Text Control Validation

## Purpose

The known-text control suite verifies that Binary Cube encryption and decryption preserve exact UTF-8 document bytes, not merely readable-looking text.

The initial corpus uses low-risk filler and formatting controls:

- a short familiar Lorem ipsum paragraph;
- a fixed speech-to-text sentence about the recurring mangling of “Lorem ipsum”;
- punctuation, a real tab, a blank line, slashes, brackets, braces, and a terminal line feed;
- accented characters, symbols, non-Latin scripts, emoji, and a variation selector; and
- a longer Lorem ipsum document that forces many blocks under the smallest control key.

Every source file is stored under `data/shadowrun/binary-cube/text-controls/` and is pinned by UTF-8 byte length, bit length, SHA-256, LF-only line endings, and a required terminal line feed.

## Deterministic control keys

The control manifest defines eight deterministic keys, one for every recommended grid size:

`4, 12, 20, 28, 36, 44, 52, 60`

The profiles vary input face, output face, orientation, and mask density. Each profile pins:

- the generation seed;
- the expected key identifier; and
- the expected payload capacity.

A changed key-generation result therefore fails before text encryption begins.

## Batch matrix

The validator runs every document against every key:

- 5 documents;
- 8 known control keys; and
- 40 exact round trips.

For each matrix row it checks:

1. source byte and SHA-256 identity;
2. UTF-8 decode and re-encode identity;
3. deterministic key identity and capacity;
4. deterministic repeated encryption;
5. package JSON serialization identity;
6. package checksum validation;
7. exact recovered binary;
8. exact recovered bytes;
9. exact recovered text; and
10. exact recovered SHA-256.

The evidence file also records source bits, payload capacity, block count, ciphertext length, package checksum, and recovered hash for every document/key pair.

## Independent reference execution

An independent algorithm mirror produced the initial comparison baseline:

- 1,550 source bytes per complete corpus pass;
- 12,400 source bits per complete corpus pass;
- 164,976 aggregate ciphertext bits;
- 40 exact byte recoveries;
- 40 exact text recoveries; and
- matrix canonical SHA-256 `fbcb643e4ace66b00f167ab049a1d46b09aa5900995a9e6c9f60dd83c9a60bb1`.

This reference is deliberately classified as `independent-reference-execution-not-main-ci-evidence`. It is a pinned comparison target, not proof that the repository JavaScript workflow passed.

## Mandatory JavaScript gate

The repository validator is:

`node scripts/validate-shadowrun-binary-cube-text-controls.mjs`

Its initial required baseline is:

- at least 630 assertions;
- exactly 40 document/key round trips;
- all five control documents;
- all eight deterministic keys;
- exact source and recovery hashes;
- 164,976 aggregate ciphertext bits; and
- the pinned full-matrix digest.

The `main` workflow writes:

`artifacts/shadowrun-binary-cube-text-control-verification.json`

That artifact is retained with the core, editor, authenticated-envelope, and browser evidence.

## Adding future controls

New controls should be added deliberately rather than replacing the original corpus. A new document requires:

- a stable UTF-8 source file;
- a clear purpose;
- pinned byte and bit lengths;
- pinned SHA-256;
- a manifest version increase;
- an updated expected round-trip count;
- a new independent reference summary; and
- an updated validation contract.

The original controls should remain unchanged so historical results remain comparable.

## Security boundary

These tests validate lossless reversible behavior and deterministic framing. They do not establish cryptographic secrecy. The Binary Cube core remains experimental TTRPG obfuscation, while the optional AES-GCM envelope remains the separate authenticated transport layer.
