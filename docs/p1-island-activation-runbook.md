# P1 Island 3.0.0 Activation Runbook

## State

This runbook is preparatory. Do not apply it while P0 remains pending.

The active runtime must continue using `kaysender-editor-builtins.js` and Island schema `2.0.0` until the integrated P0 Chromium gate passes and P1 becomes `required-next`.

The machine-readable source is `data/kaysender/editors/p1-island-activation-manifest.json`.

## Activation

1. Add `kaysender-surface-grid-editor.css`, `kaysender-surface-grid-resize.css`, and `kaysender-island-v3-adapter.css`.
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
→ editor panels
→ prepared built-ins
→ production runtime
```

The legacy projection layer must load last among the adapter layers. It maps arbitrary v3 classifications, route state, terrain, ecology, and resource descriptions into valid options for the old scalar seed form without changing authoritative v3 records.

The prepared built-ins file must register exactly three adapters and one Island migration. Island becomes `3.0.0`; Settlement and Airship remain `1.0.0`.

## Browser checks

Verify all of the following:

- The shared launcher opens one Island 3.0.0 workspace.
- Grid and exact-ledger edits use the shared dirty and autosave lifecycle.
- Importing Island 2.0.0 runs one deterministic migration and retains envelope identity, revision, locks, provenance, and migration log.
- The immediate legacy-form rebuild does not overwrite imported v3 records.
- Valid, fractured, migrated, and blank v3 profiles project every legacy seed select to a supported option.
- Invalid JSON, missing fields, unknown properties, wrong types, invalid enums, malformed IDs, duplicate unique entries, and invalid ranges block canonical envelope creation.
- Resize expansion previews without dirtying; destructive resize reports affected records, requires confirmation, and retains recovery data.
- Draft recovery and clone preserve nested domain IDs while clone changes envelope identity.
- Canonical exports exclude transient editor state.
- Island loads into Settlement, then Island and Settlement load into Airship as pinned revisions.
- Standard consumer payloads exclude GM-only IDs and secret text.

Exercise valid, renamed, migrated, fractured, blank-working, malformed, projection, and destructive-resize cases.

## Completion

P1 is complete only after all P1 validators and integrated Chromium scenarios have observed passing receipts.

## Runtime rollback

Restore `kaysender-editor-builtins.js`, remove the prepared P1 assets from `index.html`, and restore the prior script order. Preserve all Island 3.0.0 exports. Runtime rollback must not rewrite 3.0.0 data as 2.0.0.
