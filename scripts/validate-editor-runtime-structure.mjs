import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root = process.cwd();
const read = relativePath => fs.readFile(path.join(root, relativePath), 'utf8');
const fail = message => { throw new Error(message); };

const html = await read('index.html');
const envelopeSchema = await read('data/kaysender/schemas/editor-profile-envelope.schema.json');
const registry = await read('kaysender-editor-adapter-registry.js');
const builtins = await read('kaysender-editor-builtins.js');
const mapping = await read('kaysender-editor-field-mapping.js');
const migrations = await read('kaysender-editor-migrations.js');
const kernelAdapters = await read('kaysender-editor-kernel-adapters.js');
const lifecycle = await read('kaysender-editor-lifecycle.js');
const repository = await read('kaysender-editor-repository.js');
const production = await read('kaysender-editor-production.js');
const recordLibrary = await read('kaysender-editor-record-library.js');
const parentLibrary = await read('kaysender-editor-parent-library.js');
const boundary = await read('kaysender-editor-error-boundary.js');
const smoke = await read('kaysender-editor-live-smoke.js');

for (const marker of [
  'id="character-sheet"',
  'id="module-viewer-root"',
  'id="kaysender-status"',
  'id="kaysender-overview-grid"',
  'data-view="kaysender"',
  'data-view="solanum-umbra"',
  '<script src="solanum-umbra-entry.js"></script>'
]) {
  if (!html.includes(marker)) fail(`Main page lost required application anchor '${marker}'.`);
}

const orderedScripts = [
  'kaysender-editor-kernel.js',
  'kaysender-editor-field-mapping.js',
  'kaysender-editor-adapter-registry.js',
  'kaysender-editor-builtins.js',
  'kaysender-editor-migrations.js',
  'kaysender-editor-kernel-adapters.js',
  'kaysender-editor-lifecycle.js',
  'kaysender-editor-repository.js',
  'kaysender-editors.js',
  'kaysender-settlement-editor.js',
  'kaysender-airship-editor.js',
  'kaysender-editor-production.js',
  'kaysender-editor-record-library.js',
  'kaysender-editor-error-boundary.js',
  'kaysender-editor-live-smoke.js'
];
let previousPosition = -1;
for (const script of orderedScripts) {
  const position = html.indexOf(`<script src="${script}"></script>`);
  if (position < 0) fail(`Main page does not load '${script}'.`);
  if (position <= previousPosition) fail(`Editor runtime script '${script}' is loaded out of order.`);
  previousPosition = position;
}

for (const phrase of [
  '"required": ["relationship", "profileId", "profileType", "name", "revision", "policy"]',
  '"policy": { "type": "string", "const": "pinned-revision" }',
  '"sourceUpdatedAt": { "type": ["string", "null"], "format": "date-time" }'
]) {
  if (!envelopeSchema.includes(phrase)) fail(`Canonical envelope schema is missing pinned inheritance marker '${phrase}'.`);
}

for (const phrase of [
  "'id', 'moduleId', 'label', 'profileType', 'currentSchemaVersion'",
  'optionalHooks',
  'isVersion',
  'normalizeParentImport',
  'normalizeHooks',
  'currentSchemaVersion must use major.minor.patch format',
  'fieldMap: Object.freeze',
  'flatFieldExclusions: Object.freeze',
  'register',
  'resolve',
  'getParentImport'
]) {
  if (!registry.includes(phrase)) fail(`Shared editor adapter registry is missing '${phrase}'.`);
}

for (const phrase of [
  "id: 'floating-island-editor'",
  "id: 'settlement-editor'",
  "id: 'airship-editor'",
  "currentSchemaVersion: '2.0.0'",
  "currentSchemaVersion: '1.0.0'",
  "relationship: 'parent-island'",
  "relationship: 'parent-settlement'",
  "profileType: 'floating-island-foundation-profile'",
  "profileType: 'settlement-profile'",
  "profileType: 'airship-profile'",
  'fieldMap: {',
  'flatFieldExclusions:'
]) {
  if (!builtins.includes(phrase)) fail(`Built-in editor adapters are missing '${phrase}'.`);
}

for (const phrase of [
  'function readPath',
  'function writeField',
  'function apply(',
  'function applyFlat',
  'window.KaysenderEditorFieldMapping'
]) {
  if (!mapping.includes(phrase)) fail(`Shared editor field mapping service is missing '${phrase}'.`);
}

for (const phrase of [
  'function register(definition)',
  'function migrate(dataInput, profileType',
  'island-legacy-flat-to-2.0.0',
  "toVersion: '2.0.0'",
  'removeLegacyIslandFields',
  'legacy-flat',
  'window.KaysenderEditorMigrations'
]) {
  if (!migrations.includes(phrase)) fail(`Shared editor migration registry is missing '${phrase}'.`);
}

for (const phrase of [
  'adapterForProfileType',
  'parseVersion',
  'compareVersions',
  'schemaCompatibilityDiagnostics',
  'profile-schema-outdated',
  'profile-schema-future',
  'normalizeInheritanceReferences',
  "policy: 'pinned-revision'",
  'sourceUpdatedAt: envelope.updatedAt',
  'inheritanceDiagnostics',
  'inheritance-policy-invalid',
  'inheritance-revision-invalid',
  'inheritance-policy-normalized',
  'mapping.apply(form, profileInput, adapter.fieldMap)',
  'mapping.applyFlat(form, profileInput, adapter.flatFieldExclusions',
  'typeof adapter.applyProfileToForm',
  'fallbackNormalizeImportedRecord',
  'migrations.migrate(previous.data',
  'migrationLog: migration.log',
  'normalizeImportedRecord'
]) {
  if (!kernelAdapters.includes(phrase)) fail(`Kernel adapter activation is missing '${phrase}'.`);
}

for (const phrase of [
  'DEFAULT_AUTOSAVE_DELAY',
  'scheduleAutosave',
  'markDirty',
  'markClean',
  'confirmLeave',
  "window.addEventListener('beforeunload'",
  'window.KaysenderEditorLifecycle'
]) {
  if (!lifecycle.includes(phrase)) fail(`Shared editor lifecycle is missing '${phrase}'.`);
}

for (const phrase of [
  'INDEX_KEY',
  'RECORD_PREFIX',
  'function save(envelope)',
  'function load(profileId)',
  'function remove(profileId, explicit = false)',
  'function list(options = {})',
  'function repairIndex()',
  'window.KaysenderEditorRepository'
]) {
  if (!repository.includes(phrase)) fail(`Shared editor repository is missing '${phrase}'.`);
}

for (const phrase of [
  'const Registry = window.KaysenderEditorAdapters',
  'const Lifecycle = window.KaysenderEditorLifecycle',
  'async function launch(editorIdOrAlias)',
  'Registry.resolve(editorIdOrAlias)',
  'Lifecycle.bind(adapter, panel',
  'autosaveDraft(adapter, panel)',
  'Kernel.clearDraft(adapter.id, true)',
  'adapter.parentImports.forEach',
  'adapter.hiddenLegacyActionIds.forEach',
  'listEditors:',
  'getRecordState:'
]) {
  if (!production.includes(phrase)) fail(`Shared production runtime is missing '${phrase}'.`);
}
if (production.includes('const editorSpecs =')) fail('Shared production runtime still contains the removed hardcoded editorSpecs table.');

for (const phrase of [
  'Saved Record Library',
  'saveActiveRecord',
  'saveAsNewClone',
  'openSelectedRecord',
  'deleteSelectedRecord',
  'repairLibrary',
  'mainline-editor-identity-id',
  'mainline-editor-identity-schema',
  'mainline-editor-identity-revision',
  'Update Existing Record',
  'Save as New Clone',
  'Kernel.cloneEnvelope(source',
  'original ${source.profileId} was not overwritten',
  'Repository.save(envelope)',
  'Repository.save(clone)',
  'Repository.load(profileId)',
  'Repository.remove(profileId, true)',
  'loadParentLibraryScript',
  "script.src = 'kaysender-editor-parent-library.js'",
  'data-kaysender-parent-library',
  'Production()',
  'window.KaysenderEditorRecordLibrary'
]) {
  if (!recordLibrary.includes(phrase)) fail(`Shared editor record library is missing '${phrase}'.`);
}

for (const phrase of [
  'recordsFor(definition)',
  'definition.expectedTypes.flatMap',
  'currentParent(panel, definition)',
  'savedParentMetadata(parent)',
  'parentReferenceState(panel, definition)',
  "state: 'unavailable'",
  "state: 'stale'",
  "state: 'ahead'",
  'Refresh to Latest Parent',
  'Repository.load(profileId)',
  'existingLoadButton.click()',
  'Lifecycle.markDirty(adapter.id',
  'Load Saved Parent',
  'Clear Parent Link',
  'definition.envelopeDatasetKey',
  'window.KaysenderEditorParentLibrary'
]) {
  if (!parentLibrary.includes(phrase)) fail(`Shared parent record library is missing '${phrase}'.`);
}
new vm.Script(parentLibrary, { filename: 'kaysender-editor-parent-library.js' });

for (const phrase of [
  "window.addEventListener('error'",
  "window.addEventListener('unhandledrejection'",
  'mainline-editor-diagnostics',
  'uncaught-editor-error',
  'unhandled-editor-rejection',
  'reportKaysenderEditorError'
]) {
  if (!boundary.includes(phrase)) fail(`Shared editor error boundary is missing '${phrase}'.`);
}

for (const phrase of [
  'Run P0 Live Smoke Test',
  'launchIsland',
  'launchSettlement',
  'launchAirship',
  'sourceIslandEnvelope',
  'sourceSettlementEnvelope',
  'hb-ttrpg-tools:p0-live-smoke:last-pass',
  'Copy Verification Receipt',
  'Download Verification Receipt',
  'p0-live-smoke-receipt',
  'getKaysenderEditorSmokeReceipt'
]) {
  if (!smoke.includes(phrase)) fail(`P0 browser verification harness is missing '${phrase}'.`);
}

await import('./validate-editor-adapter-integration.mjs');
await import('./validate-editor-inheritance.mjs');

console.log('Shared editor runtime structure validation passed.');
console.log('Verified schema-aware adapters, pinned-revision inheritance, migrations, lifecycle, persistent records, identity-safe saving, inherited-reference health, generic production shell, error boundary, and browser chain.');
