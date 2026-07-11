# Binary Cube Laboratory Desktop

This directory packages the shared Binary Cube Encryption Laboratory as a locally executable desktop application.

The desktop application does not maintain a second implementation of the Binary Cube algorithm. `scripts/prepare-app.mjs` copies the current shared browser engine and interface files from the repository root into `app/vendor` immediately before local startup or packaging. Changes to the shared Shadowrun and Blacklight tool therefore flow into the desktop build after its tests pass.

## Current prototype targets

- Windows x64 portable executable
- Linux x64 AppImage

The desktop shell runs without a network connection and does not enable Node.js access inside the renderer. Existing file import, file export, local storage, key handling, secure-export reconstruction, authenticated-envelope controls, diagnostics, and binary recovery remain available through the shared laboratory interface.

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

- encryption and decryption recover the original binary input;
- secure exports omit exposed key and plaintext-length metadata;
- secure exports reconstruct and decrypt with the correct key;
- mismatched keys are rejected.

## Package an executable

```bash
npm run dist
```

Build output is written to `desktop/binary-cube/dist/`. The GitHub Actions workflow builds the Windows and Linux targets independently on their native runners and uploads the resulting files as workflow artifacts. Tags matching `binary-cube-v*` publish those artifacts as a GitHub release.

## Security boundary

The Binary Cube permutation is experimental tabletop obfuscation and is not production cryptography. The authenticated-envelope layer uses standard Web Crypto primitives, but that does not change the classification of the underlying Binary Cube algorithm.
