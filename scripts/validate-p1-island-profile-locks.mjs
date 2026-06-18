import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root = process.cwd();
const modelSource = await fs.readFile(path.join(root, 'kaysender-island-v3-profile-model.js'), 'utf8');
const indexSource = await fs.readFile(path.join(root, 'index.html'), 'utf8');
const fixture = JSON.parse(await fs.readFile(path.join(root, 'data/kaysender/editors/fixtures/p1-floating-island-production-valid.json'), 'utf8'));
const normalize = value => JSON.parse(JSON.stringify(value));

const context = {
  window: {}, globalThis: {}, console, JSON, Math, Number, String, Boolean,
  Set, Map, Object, Array, Error
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(modelSource, context, { filename: 'kaysender-island-v3-profile-model.js' });
const api = context.window.KaysenderIslandV3ProfileModel;
assert.ok(api, 'Island profile model did not load.');
assert.equal(typeof api.createLockMatcher, 'function');
assert.equal(typeof api.hasOverlappingLock, 'function');

const childLock = 'sites.site-western-skyport.status';
const childLocked = new api.IslandProfileModel(fixture, { locks: [childLock] });
assert.equal(childLocked.isLocked(childLock), true);
assert.equal(childLocked.isLocked('sites.site-western-skyport.name'), false, 'A status lock blocked an unrelated name field.');
assert.equal(childLocked.isLocked('sites'), false, 'A child field lock blocked the whole collection.');
assert.equal(childLocked.isRecordLocked('sites.site-western-skyport'), true, 'Record deletion did not detect a locked descendant.');
assert.equal(childLocked.isRecordLocked('sites.site-central-cistern'), false, 'A child lock affected a sibling record.');

const added = normalize(childLocked.addRecord('sites', {
  name: 'Lock Precision Test',
  type: 'test',
  mapCellId: 'cell-western-port',
  status: 'planned',
  visibility: 'gm-only',
  maximumFootprintKm2: 0,
  tags: []
}, { preferredId: 'lock-precision-test' }));
assert.equal(added.id, 'site-lock-precision-test', 'A child field lock prevented unrelated collection insertion.');
const renamed = normalize(childLocked.updateRecord('sites', 'site-western-skyport', {
  name: 'Western Skyport Revised'
}, { name: { type: 'text' } }));
assert.equal(renamed.record.name, 'Western Skyport Revised');
assert.throws(() => childLocked.updateRecord('sites', 'site-western-skyport', {
  status: 'closed'
}, { status: { type: 'enum', options: ['planned', 'active', 'abandoned', 'ruined', 'sealed', 'unknown'] } }), /locked/);
assert.throws(() => childLocked.removeRecord('sites', 'site-western-skyport', { force: true }), /locked/);
assert.equal(childLocked.removeRecord('sites', added.id).removed, true, 'Child lock prevented removal of an unrelated record.');

const sectionLocked = new api.IslandProfileModel(fixture, { locks: ['sites'] });
assert.equal(sectionLocked.isLocked('sites.site-western-skyport.name'), true);
assert.throws(() => sectionLocked.addRecord('sites', { name: 'Blocked' }), /locked/);
assert.throws(() => sectionLocked.updateRecord('sites', 'site-western-skyport', { name: 'Blocked' }, { name: { type: 'text' } }), /locked/);
assert.throws(() => sectionLocked.removeRecord('sites', 'site-western-skyport', { force: true }), /locked/);

const recordLocked = new api.IslandProfileModel(fixture, { locks: ['sites.site-central-cistern'] });
assert.equal(recordLocked.isLocked('sites.site-central-cistern.name'), true);
assert.equal(recordLocked.isLocked('sites.site-western-skyport.name'), false);
assert.throws(() => recordLocked.removeRecord('sites', 'site-central-cistern', { force: true }), /locked/);

const ancestorMatcher = api.createLockMatcher(['hydrology']);
assert.equal(ancestorMatcher('hydrology.dailySustainableLiters'), true);
assert.equal(ancestorMatcher('resources.currentAnnualExtractionTons'), false);
assert.equal(ancestorMatcher(''), false);
assert.equal(api.hasOverlappingLock(['hydrology.sources.water-western-springs.status'], 'hydrology.sources.water-western-springs'), true);
assert.equal(api.hasOverlappingLock(['hydrology.sources.water-western-springs.status'], 'hydrology.sources.water-central-catchment'), false);

for (const marker of [
  'function createLockMatcher',
  'target === lock || target.startsWith(`${lock}.`)',
  'function hasOverlappingLock',
  '#assertRecordUnlocked(path)',
  'this.#assertRecordUnlocked(`${definition.path}.${recordId}`)'
]) assert.ok(modelSource.includes(marker), `Island profile model is missing lock marker '${marker}'.`);
assert.equal(indexSource.includes('kaysender-island-v3-profile-model.js'), false, 'Island profile model was loaded before P1 activation.');

console.log('P1 Island profile lock validation passed.');
console.log('Verified parent-only field matching, unrelated collection insertion under child locks, sibling isolation, locked-field rejection, record-removal overlap protection, whole-record locks, whole-section locks, and inactive runtime state.');
