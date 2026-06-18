# P1 Island 3.0.0 Activation Runbook

## State

This runbook is preparatory. Do not apply it while P0 remains pending.

The active runtime must continue using `kaysender-editor-builtins.js` and Island schema `2.0.0` until the integrated P0 Chromium gate passes and P1 becomes `required-next`.

The machine-readable source is `data/kaysender/editors/p1-island-activation-manifest.json`.

## Activation

1. Add `kaysender-surface-grid-editor.css`, `kaysender-surface-grid-resize.css`, `kaysender-island-v3-adapter.css`, and `kaysender-island-v3-panels.css`.
2. Replace the Kaysender script segment with the manifest's `kaysenderScriptOrder`.
3. Remove `kaysender-editor-builtins.js` from the page.
4. Load `kaysender-editor-builtins-v3-prepared.js` instead. Never load both built-ins files.
5. Add every manifest-listed P1 validator to the blocking workflow.

Critical order:

```text
adapter registry
→ migration registry
→ lifecycle and repository
→ surface grid and resize
→ Island schema validator
→ Island semantic engine
→ primitive transformers
→ generic consumer wrapper
→ surface controller
→ base adapter factory
→ schema bridge
→ legacy seed projection
→ production profile model
→ structured production panels
→ panel lifecycle wrapper
→ atomic scalar-submit wrapper
→ structured-panel adapter bridge
→ legacy editor modules
→ prepared built-ins
→ production runtime
```

The schema bridge must wrap the base factory before legacy projection. Legacy projection must then establish the final compatibility mapping for the old scalar seed form. The structured-panel layers load after projection, and `kaysender-island-v3-adapter-panels-bridge.js` must be the final factory wrapper before prepared built-ins register the Island adapter.

The structured production model owns the complete working profile. The surface controller owns live map interaction. Before canonical read, the panel bridge merges only the latest surface map into the production model, mirrors structured values into the read-only advanced JSON view, and then runs the existing semantic and synchronous schema gates.

The prepared built-ins file must register exactly three adapters and one Island migration. Island becomes `3.0.0`; Settlement and Airship remain `1.0.0`.

## Browser checks

Verify all of the following:

- The shared launcher opens one Island 3.0.0 workspace with structured production panels and one surface-grid workspace.
- Scalar panel submission changes multiple fields through one atomic model batch and one shared dirty transition.
- Stable collection records can be added and edited without changing their IDs.
- Removing a referenced water source, resource, landing zone, site, hazard, habitat, fault zone, or route node is blocked and displays every referencing path.
- Whole-section and precise field locks disable only affected structured controls.
- The advanced JSON ledger section is read-only and mirrors structured edits.
- Surface edits use the shared dirty and recovery lifecycle once, then synchronize into the production model without a second dirty transition.
- Importing Island 2.0.0 runs one deterministic migration and retains envelope identity, revision, locks, provenance, and migration log.
- The immediate legacy-form rebuild does not overwrite imported v3 records.
- Valid, fractured, migrated, and blank v3 profiles project every legacy seed select to a supported option.
- Missing fields, unknown properties, wrong types, invalid enums, malformed IDs, duplicate unique entries, invalid ranges, broken references, and semantic conflicts block canonical envelope creation.
- Resize expansion previews without dirtying; destructive resize reports affected records, requires confirmation, and retains recovery data.
- Draft recovery and clone preserve nested domain IDs while clone changes envelope identity.
- Canonical exports exclude transient panel, selection, resize-preview, and resize-recovery state.
- Island loads into Settlement, then Island and Settlement load into Airship as pinned revisions.
- Standard consumer payloads exclude non-public parent records.

Exercise valid, structured-edit, referenced-removal, locked-field, renamed, migrated, fractured, blank-working, malformed, projection, and destructive-resize cases.

## Completion

P1 is complete only after all P1 validators and integrated Chromium scenarios have observed passing receipts.

## Runtime rollback

Restore `kaysender-editor-builtins.js`, remove the prepared P1 assets from `index.html`, and restore the prior script order. Preserve all Island 3.0.0 exports. Runtime rollback must not rewrite 3.0.0 data as 2.0.0.
