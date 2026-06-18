import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root = process.cwd();
const clone = value => JSON.parse(JSON.stringify(value));
const read = relativePath => fs.readFile(path.join(root, relativePath), 'utf8');
const readJson = async relativePath => JSON.parse(await read(relativePath));

const [
  profile,
  domainSource,
  transformerSource,
  consumerSource,
  modelSource,
  panelsSource,
  lifecycleSource,
  styles,
  indexSource
] = await Promise.all([
  readJson('data/kaysender/editors/fixtures/p1-floating-island-production-valid.json'),
  read('kaysender-island-v3-domain.js'),
  read('kaysender-island-v3-transformers.js'),
  read('kaysender-island-v3-consumer-builders.js'),
  read('kaysender-island-v3-profile-model.js'),
  read('kaysender-island-v3-panels.js'),
  read('kaysender-island-v3-panels-lifecycle.js'),
  read('kaysender-island-v3-panels.css'),
  read('index.html')
]);

const dirtyCalls = [];
const context = {
  window: {},
  globalThis: {},
  console,
  JSON,
  Math,
  Number,
  String,
  Boolean,
  Set,
  Map,
  Object,
  Array,
  Error,
  Promise,
  queueMicrotask,
  KaysenderEditorLifecycle: null
};
context.globalThis = context;
context.window.KaysenderEditorLifecycle = {
  markDirty(editorId, message) {
    dirtyCalls.push({ editorId, message });
  }
};
vm.createContext(context);
vm.runInContext(domainSource, context, { filename: 'kaysender-island-v3-domain.js' });
vm.runInContext(transformerSource, context, { filename: 'kaysender-island-v3-transformers.js' });
vm.runInContext(consumerSource, context, { filename: 'kaysender-island-v3-consumer-builders.js' });
vm.runInContext(modelSource, context, { filename: 'kaysender-island-v3-profile-model.js' });
vm.runInContext(panelsSource, context, { filename: 'kaysender-island-v3-panels.js' });
vm.runInContext(lifecycleSource, context, { filename: 'kaysender-island-v3-panels-lifecycle.js' });

const modelApi = context.window.KaysenderIslandV3ProfileModel;
const panelApi = context.window.KaysenderIslandV3Panels;
const domain = context.window.KaysenderIslandV3Domain;
const transformers = context.window.KaysenderIslandV3Transformers;
assert.ok(modelApi, 'Island profile model API did not load.');
assert.ok(panelApi, 'Island production panel API did not load.');
assert.equal(typeof modelApi.IslandProfileModel, 'function');
assert.equal(typeof panelApi.IslandProductionController, 'function');
assert.equal(panelApi.SCALAR_PANELS.length, 14);
assert.equal(panelApi.COLLECTION_PANELS.length, 15);
assert.deepEqual(Object.keys(modelApi.COLLECTIONS).sort(), panelApi.COLLECTION_PANELS.map(panel => panel.id).sort());

const original = clone(profile);
const events = [];
const model = new modelApi.IslandProfileModel(profile);
model.subscribe(event => events.push(event));
const batch = model.setFields([
  { path: 'classification.currentUse', value: 'regional refuge', definition: { type: 'text' } },
  { path: 'geometry.usableAreaKm2', value: '109.4', definition: { type: 'number', minimum: 0 } },
  { path: 'visibility.publicFacts', value: ['Fact one', 'Fact two'], definition: { type: 'lines' } }
]);
assert.equal(batch.changed, true);
assert.equal(batch.changes.length, 3);
assert.equal(events.length, 1, 'Atomic scalar update emitted more than one model event.');
assert.equal(events[0].type, 'fields-changed');
assert.equal(model.get('classification.currentUse'), 'regional refuge');
assert.equal(model.get('geometry.usableAreaKm2'), 109.4);
assert.deepEqual(model.get('visibility.publicFacts'), ['Fact one', 'Fact two']);
assert.deepEqual(modelApi.normalizeValue('First\nSecond\n', { type: 'lines' }), ['First', 'Second']);
assert.deepEqual(modelApi.normalizeValue('a, a, b', { type: 'list' }), ['a', 'b']);
assert.equal(modelApi.normalizeValue('140', { type: 'percent' }), 100);

const lockedProfile = clone(profile);
const lockedModel = new modelApi.IslandProfileModel(lockedProfile, { locks: ['geometry.planAreaKm2'] });
assert.throws(() => lockedModel.setFields([
  { path: 'geometry.usableAreaKm2', value: 100, definition: { type: 'number' } },
  { path: 'geometry.planAreaKm2', value: 200, definition: { type: 'number' } }
]), /locked/);
assert.equal(lockedModel.get('geometry.usableAreaKm2'), profile.geometry.usableAreaKm2, 'Atomic lock failure partially changed an unlocked field.');
assert.equal(lockedModel.get('geometry.planAreaKm2'), profile.geometry.planAreaKm2);
assert.equal(lockedModel.isLocked('geometry.planAreaKm2'), true);
assert.equal(lockedModel.isLocked('geometry.widthKm'), false);

const idModel = new modelApi.IslandProfileModel(profile);
const spring1 = idModel.addRecord('waterSources', {
  mapCellId: 'cell-western-port', type: 'test spring', potable: true,
  averageDailyLiters: 10, seasonality: 'stable', status: 'active'
}, { preferredId: 'Spring' });
const spring2 = idModel.addRecord('waterSources', {
  mapCellId: 'cell-western-port', type: 'test spring', potable: true,
  averageDailyLiters: 10, seasonality: 'stable', status: 'active'
}, { preferredId: 'Spring' });
assert.equal(spring1.id, 'water-spring');
assert.equal(spring2.id, 'water-spring-2');
assert.throws(() => idModel.updateRecord('waterSources', spring1.id, { id: 'water-renamed' }, { id: { type: 'text' } }), /Stable ID/);
const update = idModel.updateRecord('waterSources', spring1.id, {
  averageDailyLiters: '25', potable: false
}, {
  averageDailyLiters: { type: 'number', minimum: 0 }, potable: { type: 'boolean' }
});
assert.equal(update.changed, true);
assert.equal(update.record.averageDailyLiters, 25);
assert.equal(update.record.potable, false);

const resourceReferences = idModel.findReferences('resource-central-iron');
assert.ok(resourceReferences.some(reference => reference.path === 'map.cells[1].resourceNodeIds'));
const blockedRemoval = idModel.removeRecord('resourceNodes', 'resource-central-iron');
assert.equal(blockedRemoval.removed, false);
assert.equal(blockedRemoval.reason, 'referenced');
assert.ok(blockedRemoval.references.some(reference => reference.path === 'map.cells[1].resourceNodeIds'));
const unreferencedSite = idModel.addRecord('sites', {
  name: 'Unlinked Test Site', type: 'test', mapCellId: 'cell-western-port',
  status: 'planned', visibility: 'gm-only', maximumFootprintKm2: 0, tags: []
}, { preferredId: 'unlinked-test' });
assert.equal(idModel.removeRecord('sites', unreferencedSite.id).removed, true);
assert.equal(idModel.removeRecord('sites', 'site-western-skyport').removed, false, 'Referenced public site was removed without force.');

const canonicalSource = clone(profile);
canonicalSource.geometry.usableAreaKm2 = 200;
canonicalSource.outputs.downstreamExports = {};
const canonicalModel = new modelApi.IslandProfileModel(canonicalSource);
const canonical = canonicalModel.buildCanonical({ domain, transformers });
assert.deepEqual(canonicalSource.map, profile.map, 'Canonical build changed the source map.');
assert.equal(canonical.derived.geometryReconciles, false);
assert.ok(canonical.outputs.downstreamExports.population.capacityLimits);
assert.ok(canonical.outputs.downstreamExports.route.routingConstraints.some(item => item.includes('Aster Reach Western Skyport')));
assert.deepEqual(canonicalModel.getProfile(), canonicalSource, 'Canonical build mutated the working profile.');
canonicalModel.commitCanonical({ domain, transformers });
assert.equal(canonicalModel.get('derived.geometryReconciles'), false);
assert.ok(canonicalModel.get('outputs.downstreamExports.population.capacityLimits'));

const callbacks = [];
const controller = new panelApi.IslandProductionController({
  editorId: 'floating-island-editor',
  profile,
  onProfileChange: payload => callbacks.push(payload)
});
controller.model.setField('name', 'Aster Reach Revised', { type: 'text' });
controller.model.setField('classification.currentUse', 'trade and agricultural hub', { type: 'text' });
assert.equal(dirtyCalls.length, 0, 'Lifecycle dirty mark occurred before the queued panel batch flushed.');
const flushed = controller.flush();
assert.equal(flushed.type, 'production-change-batch');
assert.equal(flushed.events.length, 2);
assert.equal(flushed.dirty, true);
assert.equal(dirtyCalls.length, 1, 'Two same-batch field edits caused more than one lifecycle dirty mark.');
assert.equal(callbacks.length, 1);
controller.replaceProfile(profile);
assert.equal(dirtyCalls.length, 1, 'Profile replacement dirtied the editor.');
controller.commitCanonical({ domain, transformers });
assert.equal(dirtyCalls.length, 1, 'Canonical rebuild dirtied the editor.');
controller.destroy();

const scalarPaths = new Set(panelApi.SCALAR_PANELS.flatMap(panel => panel.fields.map(field => field.path)));
for (const requiredPath of [
  'name',
  'classification.surveyStatus',
  'geometry.planAreaKm2',
  'composition.floatstonePercent',
  'hydrology.dailySustainableLiters',
  'foodCapacity.sustainablePopulation',
  'resources.currentAnnualExtractionTons',
  'motion.forecastHorizonDays',
  'stability.emergencyThreshold',
  'ecology.currentPressure',
  'settlementCapacity.sustainablePopulation',
  'routeNodeExport.routeCapability.maximumDailyArrivals',
  'visibility.gmSecrets',
  'outputs.playerSafeSummary',
  'derived.brokenReferenceIds'
]) assert.ok(scalarPaths.has(requiredPath), `Production panels omit scalar path ${requiredPath}.`);
assert.equal(scalarPaths.has('map.cells'), false, 'Production panels duplicated the surface-grid map editor.');
assert.equal(scalarPaths.has('outputs.downstreamExports'), false, 'Production panels exposed generated downstream exports for manual editing.');

for (const marker of [
  'Apply Record', 'Remove Record', 'island-record-still-referenced',
  'Add ${panel.title.replace', 'input.dataset.valueType',
  'caption.textContent = definition.label', 'summary.textContent = panel.title'
]) assert.ok(panelsSource.includes(marker), `Panel source is missing '${marker}'.`);
assert.equal(panelsSource.includes('.innerHTML'), false, 'Production panels render imported data through innerHTML.');
for (const marker of ['production-change-batch', 'DIRTY_EVENTS', 'this.lifecycle.markDirty', 'flush()']) {
  assert.ok(lifecycleSource.includes(marker), `Panel lifecycle wrapper is missing '${marker}'.`);
}
for (const marker of [
  '.kaysender-island-production-panels', '.island-production-panel',
  '.island-production-fields', '.island-production-record', '.island-production-field.locked'
]) assert.ok(styles.includes(marker), `Production panel styles are missing '${marker}'.`);

for (const file of [
  'kaysender-island-v3-profile-model.js',
  'kaysender-island-v3-panels.js',
  'kaysender-island-v3-panels-lifecycle.js',
  'kaysender-island-v3-panels.css'
]) assert.equal(indexSource.includes(file), false, `${file} was loaded before P1 activation.`);
assert.deepEqual(profile, original, 'Production model validation mutated the source fixture.');

console.log('P1 Island production panel validation passed.');
console.log('Verified structured scalar and collection coverage, atomic normalized edits, newline arrays, precise lock rollback, deterministic nested IDs, stable-ID protection, guarded deletion, canonical derived/export rebuilding, coalesced lifecycle dirty marking, safe text rendering, responsive styles, and inactive runtime state.');
