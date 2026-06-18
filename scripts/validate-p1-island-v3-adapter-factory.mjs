import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root = process.cwd();
const read = file => fs.readFile(path.join(root, file), 'utf8');
const readJson = async file => JSON.parse(await read(file));
const normalize = value => JSON.parse(JSON.stringify(value));

const [
  schemaSource,
  domainSource,
  primitiveSource,
  genericSource,
  factorySource,
  schemaBridgeSource,
  projectionSource,
  modelSource,
  panelsSource,
  lifecycleSource,
  atomicSource,
  panelBridgeSource,
  adapterCss,
  panelCss,
  builtins,
  index,
  v2,
  valid
] = await Promise.all([
  read('kaysender-island-v3-schema-validator.js'),
  read('kaysender-island-v3-domain.js'),
  read('kaysender-island-v3-transformers.js'),
  read('kaysender-island-v3-consumer-builders.js'),
  read('kaysender-island-v3-adapter-factory.js'),
  read('kaysender-island-v3-adapter-schema-bridge.js'),
  read('kaysender-island-v3-legacy-projection.js'),
  read('kaysender-island-v3-profile-model.js'),
  read('kaysender-island-v3-panels.js'),
  read('kaysender-island-v3-panels-lifecycle.js'),
  read('kaysender-island-v3-panels-atomic.js'),
  read('kaysender-island-v3-adapter-panels-bridge.js'),
  read('kaysender-island-v3-adapter.css'),
  read('kaysender-island-v3-panels.css'),
  read('kaysender-editor-builtins.js'),
  read('index.html'),
  readJson('data/kaysender/editors/fixtures/p1-island-v2-migration-source.json'),
  readJson('data/kaysender/editors/fixtures/p1-floating-island-production-valid.json')
]);

const context = {
  window: {
    KaysenderIslandSurfaceGridController: { IslandSurfaceGridController: function IslandSurfaceGridController() {} },
    KaysenderEditorLifecycle: { markDirty() {} }
  },
  globalThis: {},
  console,
  JSON,
  Math,
  Number,
  String,
  Boolean,
  Set,
  Map,
  WeakMap,
  Object,
  Array,
  Error,
  RegExp,
  Promise,
  queueMicrotask
};
context.globalThis = context;
vm.createContext(context);
for (const [file, source] of [
  ['kaysender-island-v3-schema-validator.js', schemaSource],
  ['kaysender-island-v3-domain.js', domainSource],
  ['kaysender-island-v3-transformers.js', primitiveSource],
  ['kaysender-island-v3-consumer-builders.js', genericSource],
  ['kaysender-island-v3-adapter-factory.js', factorySource],
  ['kaysender-island-v3-adapter-schema-bridge.js', schemaBridgeSource],
  ['kaysender-island-v3-legacy-projection.js', projectionSource],
  ['kaysender-island-v3-profile-model.js', modelSource],
  ['kaysender-island-v3-panels.js', panelsSource],
  ['kaysender-island-v3-panels-lifecycle.js', lifecycleSource],
  ['kaysender-island-v3-panels-atomic.js', atomicSource],
  ['kaysender-island-v3-adapter-panels-bridge.js', panelBridgeSource]
]) vm.runInContext(source, context, { filename: file });

const factory = context.window.KaysenderIslandV3AdapterFactory;
const schema = context.window.KaysenderIslandV3Schema;
const profileModel = context.window.KaysenderIslandV3ProfileModel;
const panelApi = context.window.KaysenderIslandV3Panels;
assert.ok(factory, 'Final Island adapter factory did not load.');
assert.ok(schema, 'Island schema validator did not load.');
assert.ok(profileModel, 'Island profile model did not load.');
assert.ok(panelApi, 'Island structured panels did not load.');
assert.equal(factory.PROFILE_TYPE, 'floating-island-foundation-profile');
assert.equal(factory.SCHEMA_VERSION, '3.0.0');
assert.equal(factory.BLOCKS.length, 16, 'Read-only advanced JSON mirror count changed unexpectedly.');
assert.deepEqual(normalize(factory.BLOCKS.map(item => item.id)), [
  'classification', 'geometry', 'composition', 'hydrology',
  'foodCapacity', 'resources', 'motion', 'stability', 'approaches',
  'sites', 'hazards', 'ecology', 'settlementCapacity',
  'routeNodeExport', 'visibility', 'outputs'
]);
assert.equal(panelApi.SCALAR_PANELS.length, 14);
assert.equal(panelApi.COLLECTION_PANELS.length, 15);
assert.equal(typeof profileModel.IslandProfileModel, 'function');
assert.equal(panelApi.IslandProductionController.name, 'AtomicIslandProductionController');

const adapter = factory.createDefinition({ openLegacy: () => {} });
for (const field of [
  'id', 'moduleId', 'label', 'profileType', 'currentSchemaVersion',
  'panelId', 'formId', 'outputId', 'buildButtonId', 'randomizeButtonId', 'open'
]) assert.ok(adapter[field], `Missing adapter field ${field}.`);
assert.equal(adapter.id, 'floating-island-editor');
assert.deepEqual(normalize(adapter.aliases), ['island']);
assert.equal(adapter.currentSchemaVersion, '3.0.0');
assert.equal(adapter.readProfile, factory.readProfile, 'Prepared built-ins would not register the final structured readProfile hook.');
assert.equal(adapter.applyProfileToForm, factory.applyProfileToForm, 'Prepared built-ins would not register the final structured apply hook.');
assert.equal(typeof adapter.getWikiDraft, 'function');
assert.deepEqual(normalize(adapter.parentImports), []);
assert.ok(Object.keys(adapter.fieldMap).length >= 20);
assert.equal(typeof factory.createStructuredWorkspace, 'function');
assert.equal(typeof factory.mergeSurfaceMapIntoProduction, 'function');
assert.equal(typeof factory.validateCanonical, 'function');
assert.equal(typeof factory.projectSize, 'function');
assert.equal(typeof factory.projectShape, 'function');

const migration = factory.createMigrationDefinition();
assert.equal(migration.id, 'island-2.0.0-to-3.0.0');
assert.equal(migration.fromVersion, '2.0.0');
assert.equal(migration.toVersion, '3.0.0');
assert.equal(migration.applies(v2), true);
assert.equal(migration.applies(valid), false);
assert.deepEqual(
  normalize(migration.migrate(v2)),
  normalize(context.window.KaysenderIslandV3Transformers.migrateV2ToV3(v2).data)
);

const bundle = factory.activationBundle({ openLegacy: () => {} });
assert.equal(bundle.adapter.currentSchemaVersion, '3.0.0');
assert.equal(bundle.adapter.readProfile, factory.readProfile);
assert.equal(bundle.migration.id, migration.id);
const order = bundle.loadOrder;
const position = file => {
  const value = order.indexOf(file);
  assert.notEqual(value, -1, `Final activation bundle omits ${file}.`);
  return value;
};
assert.ok(position('kaysender-island-v3-transformers.js') < position('kaysender-island-v3-consumer-builders.js'));
assert.ok(position('kaysender-island-v3-adapter-factory.js') < position('kaysender-island-v3-adapter-schema-bridge.js'));
assert.ok(position('kaysender-island-v3-adapter-schema-bridge.js') < position('kaysender-island-v3-legacy-projection.js'));
assert.ok(position('kaysender-island-v3-legacy-projection.js') < position('kaysender-island-v3-profile-model.js'));
assert.ok(position('kaysender-island-v3-profile-model.js') < position('kaysender-island-v3-panels.js'));
assert.ok(position('kaysender-island-v3-panels.js') < position('kaysender-island-v3-panels-lifecycle.js'));
assert.ok(position('kaysender-island-v3-panels-lifecycle.js') < position('kaysender-island-v3-panels-atomic.js'));
assert.ok(position('kaysender-island-v3-panels-atomic.js') < position('kaysender-island-v3-adapter-panels-bridge.js'));
assert.equal(order.at(-1), 'kaysender-island-v3-adapter-panels-bridge.js');

const sourceBefore = normalize(v2);
const converted = normalize(factory.toV3(v2));
assert.deepEqual(v2, sourceBefore);
assert.equal(converted.schemaVersion, '3.0.0');
assert.deepEqual(normalize(factory.toV3(valid)), valid);

const blank = normalize(factory.createBlankProfile());
assert.equal(blank.schemaVersion, '3.0.0');
assert.equal(blank.motion.forecastHorizonDays, 1);
assert.equal(blank.stability.overallRisk, 'critical');
assert.equal(blank.ecology.currentPressure, 'recovering');
assert.equal(blank.approaches.landingZones[0].id, 'landing-unassigned');
assert.equal(blank.routeNodeExport.defaultNodeId, 'route-node-unassigned');
assert.deepEqual(normalize(factory.structuralDiagnostics(blank)), []);
const blankIssues = normalize(context.window.KaysenderIslandV3Domain.validate(blank));
assert.ok(blankIssues.some(item => item.code === 'map-area-mismatch'));
assert.equal(blankIssues.some(item => item.code.startsWith('broken-')), false);
assert.equal(schema.validate(blank).some(item => item.severity === 'error'), false, 'Blank working profile violates the structural schema.');

const blocks = Object.fromEntries(factory.BLOCKS.map(item => [item.id, normalize(valid[item.id])]));
const validBefore = normalize(valid);
const canonical = normalize(factory.buildCanonicalProfileData(valid, blocks, valid.map));
assert.deepEqual(valid, validBefore);
assert.equal(canonical.schemaVersion, '3.0.0');
assert.deepEqual(canonical.map, valid.map);
assert.equal(canonical.derived.mapAreaReconciles, true);
assert.equal(context.window.KaysenderIslandV3Domain.validate(canonical).some(item => item.severity === 'error'), false);
assert.equal(schema.validate(canonical).length, 0);
assert.deepEqual(Object.keys(canonical.outputs.downstreamExports).sort(), [
  'crisis', 'ecology', 'encounter', 'faction',
  'market', 'population', 'route', 'settlement'
]);

const structured = new profileModel.IslandProfileModel(valid);
structured.setFields([
  { path: 'classification.currentUse', value: 'structured adapter test', definition: { type: 'text' } },
  { path: 'geometry.usableAreaKm2', value: 107.5, definition: { type: 'number', minimum: 0 } }
]);
const structuredCanonical = normalize(structured.buildCanonical({
  domain: context.window.KaysenderIslandV3Domain,
  transformers: context.window.KaysenderIslandV3Transformers
}));
assert.equal(structuredCanonical.classification.currentUse, 'structured adapter test');
assert.equal(structuredCanonical.geometry.usableAreaKm2, 107.5);
assert.equal(schema.validate(structuredCanonical).length, 0);

const migrated = normalize(context.window.KaysenderIslandV3Transformers.migrateV2ToV3(v2).data);
const merged = normalize(factory.mergeLegacySeed(valid, migrated));
assert.equal(merged.name, migrated.name);
assert.deepEqual(merged.geometry, migrated.geometry);
assert.deepEqual(merged.composition, migrated.composition);
assert.deepEqual(merged.map, valid.map);
assert.deepEqual(merged.resources.nodes, valid.resources.nodes);
assert.deepEqual(merged.sites, valid.sites);
assert.deepEqual(merged.visibility, valid.visibility);

const volatile = normalize(v2);
const signature = factory.legacySeedSignature(volatile);
volatile.generatedAt = '2099-01-01T00:00:00.000Z';
volatile.outputs = { summary: 'changed rendering' };
volatile.mapFoundation = { columns: 99, rows: 99, cells: [], siteSlots: [] };
assert.equal(factory.legacySeedSignature(volatile), signature);
volatile.name = 'Changed Seed';
assert.notEqual(factory.legacySeedSignature(volatile), signature);

for (const [label, source, markers] of [
  ['base factory', factorySource, [
    'function synchronizeLegacySeed', 'function buildCanonicalProfileData',
    'profile = deps.domain.applyDerived(profile)',
    'profile.outputs.downstreamExports = deps.transformers.buildDownstreamExports(profile)',
    'function createMigrationDefinition', 'function createDefinition',
    "workspace.dataset.preparedRuntime = 'inactive-until-p1-activation'"
  ]],
  ['schema bridge', schemaBridgeSource, ['const schema = root.KaysenderIslandV3Schema', 'const result = validateCanonical(profile)']],
  ['legacy projection', projectionSource, ['const LEGACY_FIELD_MAP = Object.freeze', 'sizeClass: projectSize', 'shapeProfile: projectShape']],
  ['profile model', modelSource, ['class IslandProfileModel', 'setFields(changes = [])', 'removeRecord(collectionId, recordId']],
  ['panels', panelsSource, ['class IslandProductionPanels', 'Apply Record', 'Remove Record']],
  ['lifecycle wrapper', lifecycleSource, ['production-change-batch', 'this.lifecycle.markDirty']],
  ['atomic wrapper', atomicSource, ['AtomicIslandProductionController', 'this.model.setFields(changes)']],
  ['panel bridge', panelBridgeSource, ['Advanced Read-Only JSON Ledger View', 'profile.map = clone(session.controller?.getMap?.()', 'createStructuredWorkspace']]
]) {
  markers.forEach(marker => assert.ok(source.includes(marker), `${label} is missing '${marker}'.`));
  assert.equal(source.includes('KaysenderEditorAdapters.register'), false, `${label} self-registers the adapter.`);
}
for (const source of [factorySource, schemaBridgeSource, projectionSource, modelSource, panelsSource, lifecycleSource, atomicSource, panelBridgeSource]) {
  assert.equal(source.includes('.innerHTML'), false, 'Prepared Island adapter chain contains innerHTML rendering.');
}
assert.equal(factorySource.includes('KaysenderEditorMigrations.register'), false);

for (const marker of [
  '.island-v3-workspace', '.island-v3-surface-layout',
  '.island-v3-block-grid', '.island-v3-block-json',
  '.island-v3-diagnostics', '.island-v3-canonical-preview'
]) assert.ok(adapterCss.includes(marker), `Missing adapter style ${marker}.`);
for (const marker of [
  '.kaysender-island-production-panels', '.island-production-panel',
  '.island-production-record', '.island-v3-advanced-json',
  '.island-v3-advanced-json textarea[readonly]'
]) assert.ok(panelCss.includes(marker), `Missing structured panel style ${marker}.`);

assert.ok(builtins.includes("currentSchemaVersion: '2.0.0'"));
assert.equal(builtins.includes('KaysenderIslandV3AdapterFactory'), false);
for (const asset of [
  'kaysender-island-v3-adapter-factory.js',
  'kaysender-island-v3-adapter-schema-bridge.js',
  'kaysender-island-v3-legacy-projection.js',
  'kaysender-island-v3-profile-model.js',
  'kaysender-island-v3-panels.js',
  'kaysender-island-v3-panels-lifecycle.js',
  'kaysender-island-v3-panels-atomic.js',
  'kaysender-island-v3-adapter-panels-bridge.js',
  'kaysender-island-v3-panels.css'
]) assert.equal(index.includes(asset), false, `Current runtime loads ${asset}.`);

console.log('P1 Island final adapter factory validation passed.');
console.log('Verified final schema, projection, structured-panel, lifecycle, atomic-submit, and panel-bridge layering; wrapped migration; blank working state; canonical structured build; advanced JSON mirror styles; and inactive registration and load boundaries.');
