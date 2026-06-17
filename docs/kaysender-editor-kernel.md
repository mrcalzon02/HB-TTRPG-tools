# Kaysender Main-Line Editor Production Model — P0 Shared Kernel

## Status

P0 — **Shared Editor Kernel and Profile Contract** is implemented on the single active branch, `main`, and remains the sole `required-next` stage.

It is not promoted to complete yet. Promotion requires:

1. The editor roadmap validator to pass.
2. The shared kernel validator to pass.
3. JavaScript syntax checks to pass.
4. The in-site browser verification to pass through Island, Settlement, and Airship.

P1 remains blocked until those gates succeed.

Machine-readable state:

`data/kaysender/editors/p0-implementation-status.json`

## Runtime architecture

P0 is additive. The existing alpha editors remain the domain calculation engines while the shared layer owns production lifecycle and profile transport.

Load order:

1. `kaysender-editor-kernel.js`
2. `kaysender-editors.js` — Floating Island calculations
3. `kaysender-settlement-editor.js` — Settlement calculations
4. `kaysender-airship-editor.js` — Airship calculations
5. `kaysender-editor-production.js` — shared production shell
6. `kaysender-editor-live-smoke.js` — in-site browser verification harness

The kernel loads before every domain editor. The production shell and browser harness load after all three.

## Shared kernel responsibilities

The kernel owns behavior that must remain consistent across all main-line editors:

- Canonical profile envelope
- Stable profile IDs
- Profile schema versions
- Change-sensitive revisions and timestamps
- Legacy and current profile adapters
- Migration history
- Provenance and inheritance references
- Field locks
- Selective randomization support
- Local recovery drafts
- Canonical import and export
- Clone identity and provenance
- Shared validation and diagnostics
- Mapping canonical records back into existing forms

The kernel does **not** calculate island geology, settlement pressure, or vessel performance. Those rules remain inside the relevant domain engine until that editor reaches its own production stage.

## Canonical profile envelope

Schema:

`data/kaysender/schemas/editor-profile-envelope.schema.json`

Required fields:

- `editorEnvelopeVersion`
- `profileId`
- `profileType`
- `profileSchemaVersion`
- `revision`
- `createdAt`
- `updatedAt`
- `name`
- `provenance`
- `inheritance`
- `locks`
- `diagnostics`
- `data`

Domain fields remain inside `data`.

### Stable identity and revision behavior

A record receives one stable profile ID. Rebuilding, validating, copying, or exporting an unchanged record does not create a new ID or revision.

A substantive change to domain data, field locks, or inheritance advances the revision by exactly one.

A clone receives a new profile ID, begins at revision 1, and records the source profile ID in provenance.

Render/export timestamps such as `generatedAt` are ignored by the change fingerprint. When only a volatile timestamp changes, the previous canonical data, revision, and `updatedAt` are preserved.

## Compatibility adapters

P0 addresses the prototype mismatch between the current nested island profile and the older flat fields expected by Settlement and Airship.

Current island exports use structures such as:

- `classification`
- `geometry`
- `motion`
- `access`
- `hydrology.profile`
- `resources`
- `derivedScores.settlementViability`
- `derivedScores.routeReliability`
- `derivedScores.hazardPressure`

Older downstream importers expect fields such as:

- `settlementFootprint`
- `waterProfile`
- `foodProfile`
- `routeAccess`
- `factionPressure`
- `threatClock`
- `primaryResource`
- `altitudeBand`
- `derivedScores.habitability`
- `derivedScores.routeValue`
- `derivedScores.collapseRisk`

The island adapter exposes compatibility fields while retaining the complete nested source profile inside the canonical envelope.

Fixtures:

- `data/kaysender/editors/fixtures/island-current-nested.json`
- `data/kaysender/editors/fixtures/island-legacy-flat.json`

## Shared production shell

The production shell replaces the prototype launch buttons with one production launcher per editor.

Shared actions:

- Rebuild Record
- New Blank Record
- Load / Import Record
- Recover Local Draft
- Validate Record
- Save Local Draft
- Clone Record
- Randomize Unlocked Fields
- Copy Canonical JSON
- Export Canonical JSON
- Export Wiki Draft

The shell also displays:

- Actionable diagnostics
- Current profile ID and revision
- Migration records
- Parent-profile inheritance references
- Per-field randomization locks

## Draft behavior

A saved local draft is a recovery object. Creating a new blank record does not delete it.

The kernel requires an explicit clear operation before removing a saved draft, preventing accidental loss during experimentation or failed imports.

## Import behavior

Accepted input:

- Canonical P0 envelopes
- Current nested island profiles
- Legacy flat island profiles
- Existing settlement profiles
- Existing airship profiles

Malformed JSON returns `json-parse-failed`.

A valid but wrong profile type returns `profile-type-mismatch` instead of silently loading incompatible data.

Parent records are converted to compatibility context before the original Settlement or Airship inheritance handler reads them. Canonical parent profile IDs and revisions remain in the inheritance ledger.

## Automated validation

Validator:

`scripts/validate-editor-kernel.mjs`

It checks:

- Envelope schema requirements
- Stable ID format
- Change-sensitive revisions
- Volatile timestamp handling
- Clone provenance
- Canonical round-trip import
- Nested island adaptation
- Legacy island preservation
- Unique migration history
- Wrong-profile diagnostics
- Malformed JSON diagnostics
- Draft save, protection, recovery, and explicit clearing
- Every shared production action
- All three alpha editor panels
- Parent import interception points
- Browser verification harness structure
- Main-page script order

GitHub Pages runs the roadmap validator, kernel validator, and syntax checks before deployment.

## In-site browser verification

`kaysender-editor-live-smoke.js` adds **Run P0 Live Smoke Test** to the Kaysender workspace.

The test warns before replacing unsaved form state, then:

1. Opens Floating Island through the production shell.
2. Builds and validates a canonical island envelope.
3. Opens Settlement through the same shell.
4. Imports the canonical island as its parent.
5. Builds and validates the settlement and its inheritance ID.
6. Opens Airship through the same shell.
7. Imports both island and settlement parents.
8. Builds and validates the airship and both inheritance references.
9. Stores a session-local pass report.

The harness does not modify the roadmap and cannot promote P1 automatically.

## Production boundary

P0 standardizes editor lifecycle and profile transport. It does not declare Island, Settlement, or Airship domain content production-complete.

After P0 clears its exit gate, P1 promotes Floating Island / Skyland into the first full production domain editor with deliberate map-cell editing, stable site/resource/hazard IDs, quantitative derived validation, and downstream fixtures for population, settlement, ecology, and routes.
