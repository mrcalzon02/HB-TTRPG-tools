import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root=process.cwd();
const read=relativePath=>fs.readFile(path.join(root,relativePath),'utf8');
const fail=message=>{throw new Error(message);};

function requireMarkers(source,label,markers){
  for(const marker of markers)if(!source.includes(marker))fail(`${label} is missing '${marker}'.`);
}

const files=Object.fromEntries(await Promise.all([
  'index.html',
  'data/kaysender/schemas/editor-profile-envelope.schema.json',
  'kaysender-editor-adapter-registry.js',
  'kaysender-editor-builtins.js',
  'kaysender-editor-field-mapping.js',
  'kaysender-editor-migrations.js',
  'kaysender-editor-kernel-adapters.js',
  'kaysender-editor-lifecycle.js',
  'kaysender-editor-repository.js',
  'kaysender-editor-production.js',
  'kaysender-editor-record-library.js',
  'kaysender-editor-parent-library.js',
  'kaysender-editor-error-boundary.js',
  'kaysender-editor-live-smoke.js',
  'kaysender-editor-smoke-runtime.js',
  'kaysender-island-v3-migration-normalizer.js'
].map(async name=>[name,await read(name)])));

const html=files['index.html'];
requireMarkers(html,'Main page',[
  'id="character-sheet"','id="module-viewer-root"','id="kaysender-status"','id="kaysender-overview-grid"',
  'data-view="kaysender"','data-view="solanum-umbra"','<script src="solanum-umbra-entry.js"></script>'
]);

const orderedScripts=[
  'kaysender-editor-kernel.js','kaysender-editor-field-mapping.js','kaysender-editor-adapter-registry.js',
  'kaysender-editor-builtins.js','kaysender-editor-migrations.js','kaysender-editor-kernel-adapters.js',
  'kaysender-editor-lifecycle.js','kaysender-editor-repository.js','kaysender-editors.js',
  'kaysender-settlement-editor.js','kaysender-airship-editor.js','kaysender-editor-production.js',
  'kaysender-editor-record-library.js','kaysender-editor-error-boundary.js','kaysender-editor-live-smoke.js'
];
let previous=-1;
for(const script of orderedScripts){
  const position=html.indexOf(`<script src="${script}"></script>`);
  if(position<0)fail(`Main page does not load '${script}'.`);
  if(position<=previous)fail(`Editor runtime script '${script}' is loaded out of order.`);
  previous=position;
}

requireMarkers(files['data/kaysender/schemas/editor-profile-envelope.schema.json'],'Canonical envelope schema',[
  '"required": ["relationship", "profileId", "profileType", "name", "revision", "policy"]',
  '"policy": { "type": "string", "const": "pinned-revision" }',
  '"sourceUpdatedAt": { "type": ["string", "null"], "format": "date-time" }'
]);

requireMarkers(files['kaysender-editor-adapter-registry.js'],'Shared editor adapter registry',[
  "'id', 'moduleId', 'label', 'profileType', 'currentSchemaVersion'",'optionalHooks','isVersion','normalizeParentImport',
  'normalizeHooks','currentSchemaVersion must use major.minor.patch format','fieldMap: Object.freeze','flatFieldExclusions: Object.freeze',
  'register','resolve','getParentImport'
]);

requireMarkers(files['kaysender-editor-builtins.js'],'Built-in editor adapters',[
  "id: 'floating-island-editor'","id: 'settlement-editor'","id: 'airship-editor'",
  "relationship: 'parent-island'","relationship: 'parent-settlement'",
  "profileType: 'floating-island-foundation-profile'","profileType: 'settlement-profile'","profileType: 'airship-profile'",
  'fieldMap: {','flatFieldExclusions:','kaysender-island-v3-migration-normalizer.js'
]);

const migrationNormalizer=files['kaysender-island-v3-migration-normalizer.js'];
requireMarkers(migrationNormalizer,'Island v3 migration normalizer',[
  'normalizeMigratedCellAreas','planArea / currentArea','finalCell.areaKm2',
  'domain.applyDerived(profile)','source.buildDownstreamExports','island-v3-migrated-cell-area-normalization'
]);
new vm.Script(migrationNormalizer,{filename:'kaysender-island-v3-migration-normalizer.js'});

requireMarkers(files['kaysender-editor-field-mapping.js'],'Shared editor field mapping service',[
  'function readPath','function writeField','function apply(','function applyFlat','window.KaysenderEditorFieldMapping'
]);

requireMarkers(files['kaysender-editor-migrations.js'],'Shared editor migration registry',[
  'function register(definition)','function migrate(dataInput, profileType','island-legacy-flat-to-2.0.0',
  "toVersion: '2.0.0'",'removeLegacyIslandFields','legacy-flat','window.KaysenderEditorMigrations'
]);

requireMarkers(files['kaysender-editor-kernel-adapters.js'],'Kernel adapter activation',[
  'adapterForProfileType','schemaCompatibilityDiagnostics','profile-schema-outdated','profile-schema-future',
  'normalizeInheritanceReferences',"policy: 'pinned-revision'",'inheritanceDiagnostics','inheritance-policy-invalid',
  'inheritance-revision-invalid','fallbackSaveDraft','fallbackLoadDraft','fallbackClearDraft','restoreInheritedEnvelope',
  "origin: 'inherited-snapshot'",'pinned-parent-identity-restored','mapping.apply(form, profileInput, adapter.fieldMap)',
  'mapping.applyFlat(form, profileInput, adapter.flatFieldExclusions','fallbackNormalizeImportedRecord','normalizeImportedRecord'
]);

requireMarkers(files['kaysender-editor-lifecycle.js'],'Shared editor lifecycle',[
  'DEFAULT_AUTOSAVE_DELAY','changeVersion','savedVersion','checkpoint(editorId)','markCleanIfUnchanged','scheduleAutosave',
  'markDirty','markClean','confirmLeave','Newer changes were made while saving',"window.addEventListener('beforeunload'",
  'window.KaysenderEditorLifecycle'
]);

requireMarkers(files['kaysender-editor-repository.js'],'Shared editor repository',[
  'INDEX_KEY','RECORD_PREFIX','recordFingerprint','revisionConflict','newer saved revision','different content at revision',
  'function save(envelope)','function load(profileId)','function remove(profileId, explicit = false)','function list(options = {})',
  'function repairIndex()','rejected','window.KaysenderEditorRepository'
]);

const production=files['kaysender-editor-production.js'];
requireMarkers(production,'Shared production runtime',[
  'const Registry = window.KaysenderEditorAdapters','const Lifecycle = window.KaysenderEditorLifecycle',
  'async function launch(editorIdOrAlias)','Registry.resolve(editorIdOrAlias)','Lifecycle.confirmLeave(activeEditorId',
  'Lifecycle.bind(adapter, panel','autosaveDraft(adapter, panel)','Kernel.clearDraft(adapter.id, true)',
  'synchronizeLoadedEnvelope','loaded-record-identity-changed','loaded-record-roundtrip-changed',
  'unresolvedParentEnvelope',"origin: 'unresolved-inheritance-reference'",'preserveUnresolvedParent',
  'Kernel.restoreInheritedEnvelope','adapter.parentImports.forEach','adapter.hiddenLegacyActionIds.forEach','listEditors:','getRecordState:'
]);
if(production.includes('const editorSpecs ='))fail('Shared production runtime still contains the removed hardcoded editorSpecs table.');

requireMarkers(files['kaysender-editor-record-library.js'],'Shared editor record library',[
  'Saved Record Library','saveActiveRecord','saveAsNewClone','openSelectedRecord','deleteSelectedRecord','repairLibrary',
  'Update Existing Record','Save as New Clone','Lifecycle.checkpoint(editorId)','Lifecycle.markCleanIfUnchanged',
  'Kernel.cloneEnvelope(source','Repository.save(envelope)','Repository.load(profileId)','Repository.remove(profileId, true)',
  "script.src = 'kaysender-editor-parent-library.js'",'window.KaysenderEditorRecordLibrary'
]);

const parentLibrary=files['kaysender-editor-parent-library.js'];
requireMarkers(parentLibrary,'Shared parent record library',[
  'recordsFor(definition)','currentParent(panel, definition)','savedParentMetadata(parent)','parentReferenceState(panel, definition)',
  "state: 'unavailable'","state: 'stale'","state: 'ahead'","state: 'unresolved'",'Restore Parent Context',
  'Refresh to Latest Parent','Repository.load(profileId)','existingLoadButton.click()','Load Saved Parent','Clear Parent Link',
  'definition.envelopeDatasetKey','window.KaysenderEditorParentLibrary'
]);
new vm.Script(parentLibrary,{filename:'kaysender-editor-parent-library.js'});

requireMarkers(files['kaysender-editor-error-boundary.js'],'Shared editor error boundary',[
  "window.addEventListener('error'","window.addEventListener('unhandledrejection'",'mainline-editor-diagnostics',
  'uncaught-editor-error','unhandled-editor-rejection','reportKaysenderEditorError'
]);

const smokeLoader=files['kaysender-editor-live-smoke.js'];
const smokeRuntime=files['kaysender-editor-smoke-runtime.js'];
requireMarkers(smokeLoader,'P0 internal smoke loader',[
  'kaysender-editor-smoke-runtime.js','navigator.webdriver === true','data-p0-smoke-runtime','loadP0SmokeRuntime'
]);
requireMarkers(smokeRuntime,'P0 browser verification runtime',[
  'Run P0 Live Smoke Test','launchIsland','launchSettlement','launchAirship','saveAndReload','reopenActiveRecord',
  'changed revision ${envelope.revision}','Inheritance clear','Inheritance restore','sourceIslandEnvelope','sourceSettlementEnvelope',
  'hb-ttrpg-tools:p0-live-smoke:last-pass','Copy Verification Receipt','Download Verification Receipt',
  'p0-live-smoke-receipt','getKaysenderEditorSmokeReceipt'
]);
new vm.Script(smokeLoader,{filename:'kaysender-editor-live-smoke.js'});
new vm.Script(smokeRuntime,{filename:'kaysender-editor-smoke-runtime.js'});

await import('./validate-editor-adapter-integration.mjs');
await import('./validate-editor-inheritance.mjs');
await import('./validate-editor-drafts.mjs');
await import('./validate-editor-lifecycle.mjs');
await import('./validate-editor-repository.mjs');
await import('./validate-island-v3-migration-normalization.mjs');

console.log('Shared editor runtime structure validation passed.');
console.log('Verified schema-aware adapters, lifecycle, persistence, pinned-parent repair, normalized Island migration geometry, split internal P0 smoke loading, and the expanded persistent browser chain.');
