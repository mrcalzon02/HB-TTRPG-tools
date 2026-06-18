import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root = process.cwd();
const read = file => fs.readFile(path.join(root, file), 'utf8');
const readJson = async file => JSON.parse(await read(file));
const clone = value => JSON.parse(JSON.stringify(value));

const [domainSource, primitiveSource, genericSource, factorySource, css, builtins, index, v2, valid] = await Promise.all([
  read('kaysender-island-v3-domain.js'),
  read('kaysender-island-v3-transformers.js'),
  read('kaysender-island-v3-consumer-builders.js'),
  read('kaysender-island-v3-adapter-factory.js'),
  read('kaysender-island-v3-adapter.css'),
  read('kaysender-editor-builtins.js'),
  read('index.html'),
  readJson('data/kaysender/editors/fixtures/p1-island-v2-migration-source.json'),
  readJson('data/kaysender/editors/fixtures/p1-floating-island-production-valid.json')
]);

const context = {
  window: {
    KaysenderIslandSurfaceGridController: { IslandSurfaceGridController: function IslandSurfaceGridController() {} },
    KaysenderEditorLifecycle: {}
  },
  globalThis: {}, console, JSON, Math, Number, String, Boolean,
  Set, Map, WeakMap, Object, Array, Error, RegExp
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(domainSource, context);
vm.runInContext(primitiveSource, context);
vm.runInContext(genericSource, context);
vm.runInContext(factorySource, context);

const factory = context.window.KaysenderIslandV3AdapterFactory;
assert.ok(factory);
assert.equal(factory.PROFILE_TYPE, 'floating-island-foundation-profile');
assert.equal(factory.SCHEMA_VERSION, '3.0.0');
assert.equal(factory.BLOCKS.length, 16);
assert.deepEqual(factory.BLOCKS.map(item => item.id), [
  'classification', 'geometry', 'composition', 'hydrology',
  'foodCapacity', 'resources', 'motion', 'stability', 'approaches',
  'sites', 'hazards', 'ecology', 'settlementCapacity',
  'routeNodeExport', 'visibility', 'outputs'
]);

const adapter = factory.createDefinition({ openLegacy: () => {} });
for (const field of [
  'id', 'moduleId', 'label', 'profileType', 'currentSchemaVersion',
  'panelId', 'formId', 'outputId', 'buildButtonId', 'randomizeButtonId', 'open'
]) assert.ok(adapter[field], `Missing adapter field ${field}.`);
assert.equal(adapter.id, 'floating-island-editor');
assert.deepEqual(adapter.aliases, ['island']);
assert.equal(adapter.currentSchemaVersion, '3.0.0');
assert.equal(typeof adapter.readProfile, 'function');
assert.equal(typeof adapter.applyProfileToForm, 'function');
assert.equal(typeof adapter.getWikiDraft, 'function');
assert.deepEqual(adapter.parentImports, []);
assert.ok(Object.keys(adapter.fieldMap).length >= 20);

const migration = factory.createMigrationDefinition();
assert.equal(migration.id, 'island-2.0.0-to-3.0.0');
assert.equal(migration.fromVersion, '2.0.0');
assert.equal(migration.toVersion, '3.0.0');
assert.equal(migration.applies(v2), true);
assert.equal(migration.applies(valid), false);
assert.deepEqual(
  clone(migration.migrate(v2)),
  clone(context.window.KaysenderIslandV3Transformers.migrateV2ToV3(v2).data)
);

const bundle = factory.activationBundle({ openLegacy: () => {} });
assert.equal(bundle.adapter.currentSchemaVersion, '3.0.0');
assert.equal(bundle.migration.id, migration.id);
assert.ok(bundle.loadOrder.indexOf('kaysender-island-v3-transformers.js') < bundle.loadOrder.indexOf('kaysender-island-v3-consumer-builders.js'));
assert.deepEqual(bundle.loadOrder.slice(-3), [
  'kaysender-island-v3-consumer-builders.js',
  'kaysender-island-surface-grid-controller.js',
  'kaysender-island-v3-adapter-factory.js'
]);

const sourceBefore = clone(v2);
const converted = clone(factory.toV3(v2));
assert.deepEqual(v2, sourceBefore);
assert.equal(converted.schemaVersion, '3.0.0');
assert.deepEqual(factory.toV3(valid), valid);

const blank = clone(factory.createBlankProfile());
assert.equal(blank.schemaVersion, '3.0.0');
assert.equal(blank.motion.forecastHorizonDays, 1);
assert.equal(blank.stability.overallRisk, 'critical');
assert.equal(blank.ecology.currentPressure, 'recovering');
assert.equal(blank.approaches.landingZones[0].id, 'landing-unassigned');
assert.equal(blank.routeNodeExport.defaultNodeId, 'route-node-unassigned');
assert.deepEqual(factory.structuralDiagnostics(blank), []);
const blankIssues = context.window.KaysenderIslandV3Domain.validate(blank);
assert.ok(blankIssues.some(item => item.code === 'map-area-mismatch'));
assert.equal(blankIssues.some(item => item.code.startsWith('broken-')), false);

const blocks = Object.fromEntries(factory.BLOCKS.map(item => [item.id, clone(valid[item.id])]));
const validBefore = clone(valid);
const canonical = clone(factory.buildCanonicalProfileData(valid, blocks, valid.map));
assert.deepEqual(valid, validBefore);
assert.equal(canonical.schemaVersion, '3.0.0');
assert.deepEqual(canonical.map, valid.map);
assert.equal(canonical.derived.mapAreaReconciles, true);
assert.equal(context.window.KaysenderIslandV3Domain.validate(canonical).some(item => item.severity === 'error'), false);
assert.deepEqual(Object.keys(canonical.outputs.downstreamExports).sort(), [
  'crisis', 'ecology', 'encounter', 'faction',
  'market', 'population', 'route', 'settlement'
]);

const migrated = clone(context.window.KaysenderIslandV3Transformers.migrateV2ToV3(v2).data);
const merged = clone(factory.mergeLegacySeed(valid, migrated));
assert.equal(merged.name, migrated.name);
assert.deepEqual(merged.geometry, migrated.geometry);
assert.deepEqual(merged.composition, migrated.composition);
assert.deepEqual(merged.map, valid.map);
assert.deepEqual(merged.resources.nodes, valid.resources.nodes);
assert.deepEqual(merged.sites, valid.sites);
assert.deepEqual(merged.visibility, valid.visibility);

const volatile = clone(v2);
const signature = factory.legacySeedSignature(volatile);
volatile.generatedAt = '2099-01-01T00:00:00.000Z';
volatile.outputs = { summary: 'changed rendering' };
volatile.mapFoundation = { columns: 99, rows: 99, cells: [], siteSlots: [] };
assert.equal(factory.legacySeedSignature(volatile), signature);
volatile.name = 'Changed Seed';
assert.notEqual(factory.legacySeedSignature(volatile), signature);

for (const marker of [
  'function synchronizeLegacySeed', 'synchronizeLegacySeed(session);',
  'function buildCanonicalProfileData', 'profile = deps.domain.applyDerived(profile)',
  'profile.outputs.downstreamExports = deps.transformers.buildDownstreamExports(profile)',
  'function createMigrationDefinition', 'function createDefinition',
  "workspace.dataset.preparedRuntime = 'inactive-until-p1-activation'"
]) assert.ok(factorySource.includes(marker), `Missing factory marker ${marker}.`);
assert.equal(factorySource.includes('.innerHTML'), false);
assert.equal(factorySource.includes('KaysenderEditorAdapters.register'), false);
assert.equal(factorySource.includes('KaysenderEditorMigrations.register'), false);

for (const marker of [
  '.island-v3-workspace', '.island-v3-surface-layout',
  '.island-v3-block-grid', '.island-v3-block-json',
  '.island-v3-diagnostics', '.island-v3-canonical-preview'
]) assert.ok(css.includes(marker), `Missing adapter style ${marker}.`);

assert.ok(builtins.includes("currentSchemaVersion: '2.0.0'"));
assert.equal(builtins.includes('KaysenderIslandV3AdapterFactory'), false);
assert.equal(index.includes('kaysender-island-v3-adapter-factory.js'), false);
assert.equal(index.includes('kaysender-island-v3-adapter.css'), false);

console.log('P1 Island v3 adapter factory validation passed.');
console.log('Verified registry hooks, activation order, wrapped migration, blank working state, canonical build, legacy seed preservation, safe rendering, and inactive registration and load boundaries.');
