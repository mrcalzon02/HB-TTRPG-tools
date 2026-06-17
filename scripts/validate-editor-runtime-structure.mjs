import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = relativePath => fs.readFile(path.join(root, relativePath), 'utf8');
const fail = message => { throw new Error(message); };

const html = await read('index.html');
const registry = await read('kaysender-editor-adapter-registry.js');
const builtins = await read('kaysender-editor-builtins.js');
const mapping = await read('kaysender-editor-field-mapping.js');
const migrations = await read('kaysender-editor-migrations.js');
const kernelAdapters = await read('kaysender-editor-kernel-adapters.js');
const lifecycle = await read('kaysender-editor-lifecycle.js');
const repository = await read('kaysender-editor-repository.js');
const production = await read('kaysender-editor-production.js');
const recordLibrary = await read('kaysender-editor-record-library.js');
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
  "'id', 'moduleId', 'label', 'profileType', 'panelId', 'formId'",
  'optionalHooks',
  'normalizeParentImport',
  'normalizeHooks',
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
  'island-legacy-flat-to-1.0.0',
  'removeLegacyIslandFields',
  'legacy-flat',
  'window.KaysenderEditorMigrations'
]) {
  if (!migrations.includes(phrase)) fail(`Shared editor migration registry is missing '${phrase}'.`);
}

for (const phrase of [
  'adapterForProfileType',
  'mapping.apply(form, profileInput, adapter.fieldMap)',
  'mapping.applyFlat(form, profileInput, adapter.flatFieldExclusions',
  'typeof adapter.applyProfileToForm',
  'fallbackNormalizeImportedRecord',
  'migrations.migrate(result.envelope.data',
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
  'openSelectedRecord',
  'deleteSelectedRecord',
  'repairLibrary',
  'Repository.save(envelope)',
  'Repository.load(profileId)',
  'Repository.remove(profileId, true)',
  'Production()',
  'window.KaysenderEditorRecordLibrary'
]) {
  if (!recordLibrary.includes(phrase)) fail(`Shared editor record library is missing '${phrase}'.`);
}

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

console.log('Shared editor runtime structure validation passed.');
console.log('Verified adapter registry and hooks, field mapping, migrations, lifecycle, persistent record repository, generic production shell, record-library controls, error boundary, and browser chain.');
