# Shadowrun Binary Cube Development System

## Purpose

This document establishes the method used to develop the Binary Cube Encryption Laboratory as a traceable, testable, and recoverable subsystem inside the Shadowrun workspace of `HB-TTRPG-tools`.

The project remains an experimental TTRPG obfuscation and research prototype. Its reversible cube permutation, masks, and deterministic filler must never be represented as production cryptography. Any future security feature must be described according to what it actually guarantees.

## Mainline rule

Development uses exactly one active branch: `main`.

Every repository change must preserve a working mainline. Large improvements are therefore divided into small, sequential commits with a recoverable checkpoint after each major layer:

1. pure algorithm engine;
2. browser interface;
3. automated static validation;
4. browser verification;
5. continuous-integration enforcement;
6. phase and source receipts.

No parallel feature branch is required or permitted for this project workflow.

## Source authority

The uploaded source material remains the conceptual authority for:

- cube and face sizing;
- start position and orientation;
- keyed row, column, and depth selection;
- binary data placement;
- rotation or face projection;
- removal and reconstruction of data;
- filler for incomplete blocks;
- multiple cube blocks;
- data-entry masks;
- Nested Cubes;
- Crossword or withheld-data modes.

The normalized implementation model and source hashes are stored in:

`source-page-references/shadowrun-binary-cube-encryption.source.json`

The spreadsheet example remains a preserved visual reference rather than a normative vector until its original coordinate key is reconstructed or supplied.

## Architecture boundary

### Pure engine

`shadowrun-binary-cube-engine.js` owns all algorithmic behavior:

- input normalization;
- deterministic key generation;
- row, column, and depth permutations;
- Latin-square point-field construction;
- face coordinate mapping;
- orientation handling;
- reversible block transformation;
- data-entry masks;
- deterministic filler;
- multiblock framing;
- package validation;
- key fingerprint validation;
- corruption checksums;
- projection and package diagnostics.

The engine must not depend on the browser DOM, local storage, download APIs, or interface state. It must remain loadable by Node for direct automated testing.

### Browser adapter

`shadowrun-binary-cube-encryption.js` owns presentation and browser interaction:

- field controls;
- key and package text areas;
- copy, import, and download controls;
- local browser persistence;
- status and error reporting;
- face previews;
- diagnostic summaries;
- calls into the pure engine.

The browser adapter must not duplicate the engine’s algorithms.

### Workspace loader

`shadowrun-entry.js` owns placement inside the Shadowrun workspace and lazy loading. The engine loads only when the laboratory is opened, followed by the browser adapter. Repeated launches must not add duplicate script elements or duplicate event bindings.

## Schema policy

The current key and package schema is `0.2.0`.

Every serialized key or encrypted package must contain:

- a format identifier;
- a schema version;
- an algorithm identifier;
- an explicit security classification;
- a key identifier;
- enough framing information to reject incompatible or malformed data.

Breaking schema changes require:

1. a version increment;
2. a migration or explicit rejection rule;
3. new positive and negative test cases;
4. updated documentation and phase receipts;
5. passing static and browser CI evidence.

Silent reinterpretation of older key or package documents is prohibited.

## Validation system

### Static engine validation

`scripts/validate-shadowrun-binary-cube.mjs` runs the algorithm outside the browser.

The required baseline is recorded in:

`data/shadowrun/binary-cube/validation-contract.json`

The current baseline includes:

- 14,258 assertions;
- 3,840 encrypt/decrypt round trips;
- all eight recommended grid sizes;
- all 24 directed legal face pairs;
- all input and output quarter-turn combinations at grid size four;
- 100%, 75%, and 50% mask densities;
- single-cell, capacity-boundary, and multiblock payloads;
- wrong-key, malformed-input, damaged-key, damaged-package, unsupported-schema, and truncated-block failures;
- preservation of the legacy spreadsheet fixture;
- verification that the browser layer consumes rather than duplicates the engine.

A change that reduces this coverage must explain why and update the validation contract deliberately. Accidental reductions are failures.

### Browser verification

`scripts/run-shadowrun-binary-cube-browser-verification.mjs` operates the actual application in Chromium.

It verifies:

- lazy loading before laboratory use;
- Shadowrun workspace registration;
- single engine and interface script instances;
- deterministic key generation;
- data-entry mask capacity;
- multiblock encryption;
- all-six-face diagnostics;
- exact browser round-trip recovery;
- package and key pair validation;
- corruption detection;
- invalid opposite-face rejection;
- copy, import, and download controls;
- local-storage restoration;
- absence of page and console errors.

Browser verification produces JSON evidence and a failure screenshot when possible.

### Continuous integration

`.github/workflows/shadowrun-binary-cube.yml` runs whenever relevant files change on `main`, and may also be launched manually.

The workflow:

1. checks syntax;
2. runs the exhaustive engine validator;
3. installs a pinned Playwright browser runtime;
4. runs the browser verification;
5. uploads the static and browser evidence for 30 days.

A relevant mainline change is not complete until both validation layers pass.

## Error-handling requirements

Every user-visible failure should explain the violated contract rather than exposing a raw exception where practical.

Mandatory rejection cases include:

- empty or non-binary input;
- invalid grid size;
- unknown face;
- identical input and output face;
- opposite input and output face;
- malformed permutation;
- empty mask;
- mismatched key identifier;
- mismatched face or orientation metadata;
- unsupported schema;
- invalid block alignment;
- impossible original length;
- checksum failure.

The system must fail closed. It must not attempt to “repair” malformed key or package documents silently.

## Integrity and security boundary

The current FNV-1a value is a deterministic corruption check only. It helps identify accidental changes to ciphertext or framing metadata. It does not establish authorship, secrecy, or resistance to intentional modification.

The next security-development phase must decide whether to add an optional authenticity envelope. That design must keep three concepts separate:

- reversible cube permutation;
- accidental-corruption detection;
- cryptographic authenticity.

Adding authenticity must not lead to claims that the cube permutation itself is cryptographically secure.

## Performance expectations

The engine supports recommended face sizes through 60 × 60.

Development changes should preserve these practical limits:

- key generation and validation should remain responsive at size 60;
- previews above size 12 should use summaries rather than thousands of DOM nodes;
- diagnostics should avoid unnecessary duplicate point-field construction;
- browser tests should use a small representative grid while static tests cover all recommended sizes;
- CI should remain bounded and deterministic.

Any future Nested Cube implementation must include explicit depth, memory, and block-count limits.

## Accessibility and usability expectations

The laboratory must retain:

- explicit labels;
- keyboard-operable controls;
- live status announcements;
- readable validation errors;
- clear separation between key and package documents;
- visible warnings against real-secret use;
- confirmation before destructive reset;
- nonvisual summaries for diagnostics.

Custom mask and coordinate editors must add keyboard navigation and textual summaries, not rely only on colored cells.

## Phase governance

The current implementation state is recorded in:

`data/shadowrun/binary-cube/phase-status.json`

A phase may use these states:

- `queued` — no implementation has begun;
- `active` — current development focus;
- `implemented-awaiting-main-ci-evidence` — code and validators exist but mainline evidence is not yet confirmed;
- `gate-passed` — implementation, documentation, and required validation have passed;
- `blocked` — progress requires missing source information or a resolved design decision.

Phase advancement requires:

1. implementation evidence;
2. explicit acceptance criteria;
3. automated coverage where possible;
4. documentation updates;
5. a passing mainline gate.

## Current implementation checkpoint

The system now has a separated pure engine and browser adapter, deterministic key and package schemas, masks, padding, multiblock handling, import and export controls, diagnostics, corruption detection, exhaustive engine validation, browser verification, CI enforcement, and durable development records.

This checkpoint moves the work forward by making future changes measurable and reversible instead of depending on informal manual testing.

## Next implementation checkpoint

The next work must first confirm passing mainline CI evidence. Development should then finish the integrity and authenticity phase, define migration rules for any authenticated package schema, and only afterward proceed into a custom coordinate and mask editor.

Nested Cubes and Crossword split-key mode remain later phases because both depend on stable schemas, performance limits, and a mature validation framework.
