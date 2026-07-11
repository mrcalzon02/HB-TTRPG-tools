# Binary Cube Laboratory Desktop

This directory packages the shared Binary Cube Encryption Laboratory as a locally executable desktop application.

The desktop application does not maintain a second implementation of the Binary Cube algorithm. `scripts/prepare-app.mjs` copies the current shared browser engine, omnidirectional invariant layer, and interface files from the repository root into `app/vendor` immediately before local startup or packaging. Changes to the shared Shadowrun and Blacklight tool therefore flow into the desktop build after its tests pass.

## Current prototype targets

- Windows x64 portable executable
- Linux x64 AppImage

The desktop shell runs without a network connection and does not enable Node.js access inside the renderer. Existing file import, file export, local storage, canonical JSON key handling, secure-export reconstruction, authenticated-envelope controls, diagnostics, and binary recovery remain available through the shared laboratory interface.

The expanded engine currently supports recommended grid sizes from 4 through 1024 and mask presets from 0% through 99% blocked. Large grids consume substantially more memory and processing time.

## Mandatory key invariants

Every accepted `N`-sized key must preserve all of the following:

- `rowPermutation`, `columnPermutation`, and `depthPermutation` are complete permutations of every integer from `0` through `N - 1`.
- The complete depth domain remains available; depth is never quantized, bucketed, rounded, or encoded through a limited image color range.
- The Latin-cube relation remains bijective on the XY, XZ, and YZ planes.
- Top, bottom, front, back, left, and right projections each contain all `N × N` points exactly once.
- Face rotations and mirrored opposite faces only reorder a valid projection and may not introduce collisions.

If any one of these conditions fails, the key is invalid because reversible face-projection transformation can no longer be guaranteed.

## Local development

Install Node.js 22 or newer, then run:

```bash
cd desktop/binary-cube
npm install
npm start
```

## Verification

Run the dependency-free engine smoke test:

```bash
npm test
```

The test verifies:

- every recommended key size through 1024 retains the complete depth domain;
- every recommended size passes the algebraic omnidirectional non-confliction invariant;
- a 256 × 256 key passes exhaustive top, bottom, front, back, left, and right projection validation;
- encryption and decryption recover the original binary input;
- secure exports omit exposed key and plaintext-length metadata;
- secure exports reconstruct and decrypt with the correct key;
- duplicated or missing depth values are rejected;
- mismatched keys are rejected.

## Package an executable

```bash
npm run dist
```

Build output is written to `desktop/binary-cube/dist/`. The GitHub Actions workflow builds the Windows and Linux targets independently on their native runners and uploads the resulting files as workflow artifacts. Tags matching `binary-cube-v*` publish those artifacts as a GitHub release.

## Security boundary

The Binary Cube permutation is experimental tabletop obfuscation and is not production cryptography. The authenticated-envelope layer uses standard Web Crypto primitives, but that does not change the classification of the underlying Binary Cube algorithm.
