# Binary Cube Authenticated Package Envelope

## Purpose

The Binary Cube core is an experimental reversible permutation and obfuscation system derived from the supplied three-dimensional data-field concept. It is not production cryptography.

The authenticated package envelope is a separate, optional transport layer. It wraps a validated Binary Cube package in passphrase-derived AES-GCM so the serialized package can be concealed and authenticated during storage or transport without changing the Binary Cube algorithm itself.

This separation is mandatory. The project must never imply that adding an authenticated envelope proves the cube permutation is cryptographically secure.

## What the envelope protects

When a sufficiently strong passphrase remains secret and the browser environment is not compromised, the envelope is designed to provide:

- confidentiality for the serialized Binary Cube package;
- detection of ciphertext modification;
- detection of changes to authenticated envelope metadata;
- rejection of an incorrect passphrase;
- binding between the envelope and the Binary Cube package key identifier;
- a self-describing KDF and cipher profile.

## What the envelope does not protect

The envelope does not protect against:

- a weak or reused passphrase being guessed;
- malware, browser extensions, or injected scripts reading the passphrase while it is in memory;
- loss of the passphrase;
- disclosure of the separate Binary Cube key document;
- mistakes made before the package is sealed or after it is opened;
- traffic analysis based on envelope size or visible metadata;
- future cryptanalytic changes to the selected standard algorithms;
- claims that the Binary Cube permutation itself is secure encryption.

## Cryptographic profile

The current authenticated-envelope schema is `0.1.0`.

The implementation uses:

- PBKDF2;
- SHA-256 as the PBKDF2 hash;
- 310,000 iterations by default;
- a fresh random 16-byte salt for every normal seal operation;
- AES-GCM with a 256-bit key;
- a fresh random 12-byte initialization vector for every normal seal operation;
- a 128-bit authentication tag;
- UTF-8 JSON serialization of the validated Binary Cube package.

The accepted PBKDF2 iteration range is 100,000 through 1,000,000. The lower value exists for deterministic automated validation and compatibility testing; the browser interface uses the current default.

## Authenticated associated data

The following envelope metadata is authenticated but not encrypted:

- envelope format;
- envelope schema version;
- security classification;
- enclosed Binary Cube package format;
- enclosed Binary Cube package schema version;
- Binary Cube key identifier;
- KDF profile, iteration count, and salt;
- cipher profile and initialization vector.

Changing any authenticated field causes AES-GCM verification to fail.

## Serialized envelope structure

An envelope contains:

- `format`;
- `schemaVersion`;
- `securityClassification`;
- `cubePackageFormat`;
- `cubePackageSchemaVersion`;
- `cubeKeyId`;
- `kdf`;
- `cipher`;
- `ciphertext`.

It does not contain:

- the passphrase;
- the Binary Cube key seed;
- row, column, or depth permutations;
- the data-entry mask;
- the unwrapped Binary Cube package JSON;
- the unwrapped Binary Cube ciphertext string.

## Seal operation

The seal operation follows this sequence:

1. Parse and validate the Binary Cube key.
2. Parse and validate the Binary Cube package against that key.
3. Reject a mismatched key, damaged checksum, unsupported schema, invalid face selection, invalid orientation, or malformed block structure.
4. Require a passphrase of at least 12 characters.
5. Generate a fresh random salt and initialization vector.
6. Derive an AES-256 key with PBKDF2-SHA-256.
7. Serialize the validated Binary Cube package as UTF-8 JSON.
8. Build the authenticated associated-data record.
9. Encrypt and authenticate the package with AES-GCM.
10. Return the self-describing envelope JSON.

The browser does not store the passphrase in local storage. Only the envelope text may be preserved between sessions.

## Open operation

The open operation follows this sequence:

1. Parse the envelope JSON.
2. Validate its format, schema, security classification, KDF profile, cipher profile, salt length, IV length, and ciphertext length.
3. Require a passphrase of at least 12 characters.
4. Re-derive the AES key from the stored salt and iteration count.
5. Reconstruct the associated-data record.
6. Attempt AES-GCM authenticated decryption.
7. Reject a wrong passphrase or any modified ciphertext or authenticated metadata with one generic verification failure.
8. Parse the decrypted JSON.
9. Confirm it is a Binary Cube package.
10. Confirm its key identifier and package schema match the envelope metadata.
11. Return the package to the Binary Cube laboratory.
12. When a Binary Cube key is present, validate the opened package against that key before allowing decryption.

## Secret-handling boundary

The passphrase exists only in the password field and the immediate cryptographic operation.

The implementation must not:

- save it to local storage;
- place it in exported JSON;
- include it in filenames;
- log it to the console;
- include it in diagnostics;
- include it in CI artifacts;
- include it in error messages;
- copy it automatically to the clipboard.

Reloading the page must clear the passphrase field even when the envelope is restored.

## Error behavior

The interface deliberately reports the same authenticated-verification failure for a wrong passphrase and modified authenticated content. It does not attempt to reveal which condition occurred.

Structural errors are reported before key derivation where possible, including:

- unsupported envelope schema;
- unsupported KDF or cipher profile;
- malformed Base64;
- incorrect salt or IV length;
- missing key identifier;
- invalid iteration count;
- ciphertext too short to contain an authentication tag.

## Migration policy

The current migration policy is stored in:

`data/shadowrun/binary-cube/schema-policy.json`

An authenticated envelope cannot be safely rewritten as a new schema without opening it using the correct passphrase, validating the enclosed package, and creating a new envelope with a fresh salt and IV.

Silent reinterpretation is prohibited. Unsupported envelope versions must be rejected until an explicit, tested migration exists.

## Automated verification

The standalone validator is:

`scripts/validate-shadowrun-binary-cube-auth.mjs`

It verifies successful recovery, random salt and IV generation, deterministic test fixtures, secret exclusion, wrong-passphrase rejection, ciphertext tamper rejection, authenticated-metadata tamper rejection, schema rejection, profile rejection, malformed input rejection, and integration with the Shadowrun loader and browser controls.

The browser validator is:

`scripts/run-shadowrun-binary-cube-browser-verification.mjs`

It verifies sealing, opening, wrong-passphrase rejection, metadata tamper rejection, transfer controls, persistence of the envelope, non-persistence of the passphrase, and absence of browser errors.

Both validators are enforced by:

`.github/workflows/shadowrun-binary-cube.yml`

## Current checkpoint

The optional authenticated envelope, browser controls, static validator, browser verification, migration policy, and CI gate are implemented on `main`.

This moves the project forward by separating experimental data permutation from standard authenticated transport, while preserving a clear and testable boundary between the two.

## Next checkpoint

The next checkpoint is passing main-branch CI evidence for the core engine, authentication layer, and browser workflow. Once that evidence is recorded, Phase 10 can close and development can move into the custom coordinate and data-entry mask editor.
