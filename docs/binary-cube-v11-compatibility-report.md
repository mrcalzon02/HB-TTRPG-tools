# Binary Cube V11 Compatibility Report

## Scope

V11 integrates the accepted Binary Cube Encoder Visualizer with the existing Binary Cube laboratory, custom key editor, authenticated-envelope transport, metadata-minimized secure export, browser persistence, and offline desktop package.

## Authoritative boundaries

- The canonical Binary Cube engine remains the only key, package, encryption, decryption, trace, and validation authority.
- The custom editor may return a key only after range, permutation, mask, fingerprint, and all-six-face projection validation.
- Secure export remains the only authority that removes and reconstructs external package metadata.
- The authenticated-envelope module remains the only authority that handles PBKDF2, AES-GCM, and passphrases.
- The visualizer records transport provenance but does not reconstruct either secure format independently.
- Passphrases are never included in handoff artifacts or local browser storage.

## Transport provenance

The shared artifact contract recognizes three states:

1. `internal-package` — validated canonical package JSON may be edited and exchanged directly.
2. `secure-export` — the displayed and exchanged document remains metadata-minimized; the internal package exists only in memory after reconstruction with the matching key.
3. `authenticated-envelope` — the displayed and exchanged document remains encrypted; opening requires a passphrase handled in memory by the authenticated-envelope module.

When either protected transport is active, visualizer and laboratory handoff objects omit the reconstructed internal package.

## Storage

- Laboratory state format: `hb-ttrpg-shadowrun-binary-cube-laboratory-state`, schema `0.3.0`.
- Visualizer state format: `hb-ttrpg-shadowrun-binary-cube-visualizer-state`, schema `0.1.0`.
- Both keys are scoped using `data-binary-cube-storage-scope`, separating web and desktop records.
- The previous laboratory key `hb-ttrpg-shadowrun-binary-cube-v2` is migrated explicitly.
- A legacy unversioned visualizer record is migrated explicitly.
- Invalid or unavailable storage is recoverable and remains optional.
- Passphrases are not persisted.

## Desktop

The offline desktop preparation now includes the visualizer stylesheet, renderer, and controller. The desktop runtime binds the same bidirectional laboratory/visualizer artifact events used by the web workspace while preserving local-only execution.

## V11 exit evidence

V11 is accepted only when permanent static and Chromium tests prove:

- laboratory-to-visualizer and visualizer-to-laboratory internal package handoff;
- validated custom-editor key handoff and invalid-draft rejection;
- secure-export metadata remains absent from the visualizer and returned handoff;
- authenticated envelopes remain encrypted until opened with the correct passphrase;
- wrong passphrases fail authentication;
- passphrases never enter storage or handoff artifacts;
- scoped laboratory and visualizer storage keys remain distinct;
- legacy storage records migrate to current schemas;
- desktop packaging includes and binds both tools;
- all prior V0–V10 and desktop contracts remain green.
