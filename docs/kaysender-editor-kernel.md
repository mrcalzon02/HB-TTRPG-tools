# Kaysender Main-Line Editor Production Model — P0 Shared Kernel

## Status

P0 — **Shared Editor Kernel and Profile Contract** is implemented on the single active branch, `main`, and remains the sole `required-next` stage.

It is not promoted to complete yet. Promotion requires:

1. The editor roadmap validator to pass.
2. The shared kernel smoke validator to pass.
3. JavaScript syntax checks to pass.
4. A live browser smoke test of Island, Settlement, and Airship through the production shell.

P1 remains blocked until those gates succeed.

The machine-readable implementation state is stored in:

`data/kaysender/editors/p0-implementation-status.json`

## Architecture

P0 is additive. It does not discard the working domain calculations inside the existing alpha editors.

The production stack is:

1. `kaysender-editor-kernel.js`
2. `kaysender-editors.js` — Floating Island calculation engine
3. `kaysender-settlement-editor.js` — Settlement calculation engine
4. `kaysender-airship-editor.js` — Airship calculation engine
5. `kaysender-editor-production.js` — Shared production shell and lifecycle integration

The kernel loads before the domain engines. The production shell loads after them and adopts their existing panels.

## Shared kernel responsibilities

The kernel owns editor behavior that must remain consistent across all main-line editors:

- Canonical profile envelope
- Stable profile IDs
- Profile schema versions
- Revision and timestamp behavior
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

The kernel does **not** calculate island geology, settlement pressures, or vessel capabilities. Those remain inside the relevant domain engine until each editor reaches its own production-promotion stage.

## Canonical profile envelope

The schema is:

`data/kaysender/schemas/editor-profile-envelope.schema.json`

Every canonical editor record contains:

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

Domain-specific fields remain inside `data`.

### Stable identity

A record receives one stable profile ID. Rebuilding, validating, copying, or exporting an unchanged record does not create a new ID or revision.

A substantive change to domain data, field locks, or inheritance advances the revision by exactly one.

A clone receives a new profile ID, begins at revision 1, and records the source profile ID in provenance.

### Volatile fields

Render and export timestamps such as `generatedAt` do not count as substantive changes. When only a volatile timestamp changes, the existing canonical data and revision are preserved.

## Compatibility adapters

P0 addresses the prototype mismatch between the current nested island profile and the older flat fields expected by Settlement and Airship.

### Current nested island shape

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

### Legacy flat island shape

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

The island context adapter exposes the compatibility fields while retaining the complete nested source profile inside the canonical envelope.

Fixtures:

- `data/kaysender/editors/fixtures/island-current-nested.json`
- `data/kaysender/editors/fixtures/island-legacy-flat.json`

## Shared production shell

The production shell replaces the three prototype launch buttons with one production launcher per editor.

Each editor receives the same actions:

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

A saved local draft is a recovery object.

Creating a new blank record does not delete it. The kernel requires an explicit clear operation before removing a saved draft. This prevents accidental loss during experimentation or import recovery.

## Import behavior

The shared importer accepts:

- Canonical P0 envelopes
- Current nested island profiles
- Legacy flat island profiles
- Existing settlement profiles
- Existing airship profiles

Malformed JSON returns a `json-parse-failed` diagnostic.

A valid but wrong profile type returns a `profile-type-mismatch` diagnostic rather than silently loading incompatible data.

Imported parent records are converted to compatibility context before the original Settlement or Airship inheritance handler reads them. Their canonical profile IDs and revisions are retained in the inheritance ledger.

## Validation

The executable validator is:

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
- Presence of every shared action
- Availability of all three alpha editor panels
- Parent import interception points
- Main-page script order

GitHub Pages runs both the roadmap validator and the kernel validator before deployment.

## Production boundary

P0 standardizes editor lifecycle and profile transport. It does not declare the Island, Settlement, or Airship domain model production-complete.

After P0 clears its exit gate, P1 promotes Floating Island / Skyland into the first full production domain editor. That work will add deliberate map-cell editing, stable site/resource/hazard IDs, quantitative derived validation, and downstream fixtures for population, settlement, ecology, and routes.
