# Kaysender Generational Provenance Contract

Status: authoritative design and acceptance contract for P0+ editor records

## Purpose

Kaysender already preserves record identity, revision, inheritance, locks, migration history, and immediate clone source in the canonical editor envelope. That is necessary but not sufficient for generational provenance.

A record derived through repeated cloning, transformation, import, migration, or later generator/editor composition must remain traceable through every material generation. The system must never reduce a multi-generation ancestry to only the most recent parent, nor rely on human-readable migration messages as the only evidence of ancestry.

This contract defines the provenance invariant that future runtime changes must preserve.

## Core invariant

For every canonical editor envelope, provenance must answer all of the following without reconstructing history from prose:

1. Is this record an original root or a descendant?
2. What generation is it relative to its root?
3. What was its immediate material parent?
4. Which exact profile revision produced each generation?
5. What is the ordered ancestry from the root generation to the immediate parent?
6. Which editor/module operation created the current generation?
7. Has the ancestry survived save, reload, export, import, migration, and further cloning unchanged?

Revision history and generational history are separate concepts. Editing the same stable `profileId` advances `revision`; it does not create a new generation. A derivation that creates a new stable `profileId` creates a new generation.

## Canonical model

The existing `provenance` object remains the single authority. Generational data must be added there rather than introduced as a parallel metadata system.

New canonical envelopes should expose:

```json
{
  "provenance": {
    "editorId": "floating-island-editor",
    "moduleId": "floating-island-generator",
    "origin": "cloned-record",
    "generation": 2,
    "parent": {
      "profileId": "island-child-...",
      "profileType": "floating-island-foundation-profile",
      "revision": 3,
      "name": "Child Record"
    },
    "lineage": [
      {
        "profileId": "island-root-...",
        "profileType": "floating-island-foundation-profile",
        "revision": 5,
        "name": "Root Record"
      },
      {
        "profileId": "island-child-...",
        "profileType": "floating-island-foundation-profile",
        "revision": 3,
        "name": "Child Record"
      }
    ],
    "migrationLog": []
  }
}
```

The names above are descriptive snapshots only. Identity is established by `profileId` plus the recorded source `revision`.

## Generation rules

A root record has `generation: 0`, `parent: null`, and `lineage: []`.

A derivation that creates a fresh stable profile identity has `generation = source.provenance.generation + 1`. Its `parent` is a snapshot of the exact source envelope used to create it. Its `lineage` is the source lineage followed by that same source snapshot.

A normal edit or save of an existing profile preserves `generation`, `parent`, and `lineage` byte-for-byte in semantic content. Advancing `revision` must not rewrite ancestry.

A clone of a clone must therefore preserve the complete chain. If A is G0, B is cloned from A, and C is cloned from B, C must report generation 2 and an ordered lineage of `[A, B]`. It is not sufficient for C to report only `clonedFromProfileId: B`.

`clonedFromProfileId` may remain during compatibility migration, but it is not the authoritative generational model once structured `parent` and `lineage` are present.

## Inheritance is not ancestry

The existing `inheritance` ledger represents pinned external dependencies such as a Settlement referring to an Island or an Airship referring to a Settlement. Those relationships must remain separate from provenance lineage.

A parent selected through editor inheritance does not automatically become a generational ancestor. Generational ancestry changes only when a new record identity is materially derived from a source record.

This distinction prevents dependency graphs from being mistaken for creation history.

## Import and migration rules

Canonical records that predate this contract must remain loadable. Missing structured generational fields are a compatibility condition, not grounds for destructive rejection.

When an older canonical record has no structured lineage:

- if there is no clone evidence, normalize it as generation 0 with no parent and an empty lineage;
- if `clonedFromProfileId` exists but the actual parent envelope is unavailable, preserve that legacy evidence and emit a diagnostic that ancestry is incomplete rather than inventing missing generations;
- never fabricate a parent revision, name, profile type, or earlier ancestry;
- once structured lineage is present, subsequent saves and derivations must preserve it exactly.

Legacy pre-P0 domain records wrapped for the first time are generation 0 unless an authoritative source record accompanies the import and explicitly establishes derivation.

## Error prevention and detection

The kernel validator must detect structurally impossible provenance. At minimum it must diagnose:

- negative or non-integer generation values;
- a generation of 0 with a non-empty lineage or non-null parent;
- a generation greater than 0 without a parent;
- lineage length that disagrees with generation;
- a parent that does not equal the final lineage entry;
- malformed lineage identity or revision fields;
- duplicate adjacent generations caused by accidental repeated wrapping;
- ancestry mutation during a same-profile revision;
- loss of structured ancestry after canonical import/export or draft persistence.

Diagnostics must be actionable. Validation must not silently repair ambiguous ancestry by guessing.

## Usability requirements

The existing "Provenance and Inheritance" presentation should eventually show generational provenance in human-readable form without forcing the GM to inspect JSON. At minimum it should expose generation number, immediate parent identity/revision, root identity/revision, and whether the lineage is complete or legacy-incomplete.

The record library should distinguish "revision" from "generation" so that users do not mistake Save/Update for Clone/Derive.

## Modularity requirements

Generational provenance belongs in the shared editor kernel and canonical envelope schema. Domain editors may request a derivation but must not each implement their own lineage algorithm.

The kernel owns creation and normalization of lineage snapshots. The schema owns their portable shape. Repository, lifecycle, import/export, and editor adapters preserve the envelope without rewriting that history.

This keeps one provenance authority and prevents Island, Settlement, Airship, or later editors from drifting into incompatible lineage formats.

## Acceptance chain

The minimum functional test is an observed G0 → G1 → G2 chain:

1. Create A as a root canonical envelope. Assert generation 0, null parent, empty lineage.
2. Revise A without changing its profile ID. Assert ancestry is unchanged while revision advances.
3. Clone A to B. Assert B has a fresh profile ID, generation 1, parent A at the exact source revision, and lineage `[A]`.
4. Revise B. Assert B's ancestry is unchanged.
5. Clone B to C. Assert C has generation 2, parent B at its exact source revision, and lineage `[A, B]`.
6. Save, reload, export, and canonical-import C. Assert the structured provenance remains semantically identical.
7. Attempt malformed ancestry and assert validation reports the specific invariant violation rather than silently rewriting it.

The P0 browser smoke chain should eventually include at least one visible check that lineage survives the production shell and local repository path, not merely the isolated kernel unit validation.

## Compatibility boundary

This contract does not authorize deletion or reinterpretation of existing `provenance`, `migrationLog`, `inheritance`, revision, or stable identity behavior. Runtime implementation must extend the authoritative envelope directly and preserve old canonical records.

Until the kernel, schema, validators, and browser path implement and verify this contract, generational provenance is specified but not yet fully enforced. Documentation alone must not be reported as runtime completion.
