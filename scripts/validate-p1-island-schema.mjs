import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root = process.cwd();
const read = file => fs.readFile(path.join(root, file), 'utf8');
const readJson = async file => JSON.parse(await read(file));
const clone = value => JSON.parse(JSON.stringify(value));

const [schemaSource, domainSource, primitiveSource, genericSource, factorySource, bridgeSource, index, officialSchema, valid] = await Promise.all([
  read('kaysender-island-v3-schema-validator.js'),
  read('kaysender-island-v3-domain.js'),
  read('kaysender-island-v3-transformers.js'),
  read('kaysender-island-v3-consumer-builders.js'),
  read('kaysender-island-v3-adapter-factory.js'),
  read('kaysender-island-v3-adapter-schema-bridge.js'),
  read('index.html'),
  readJson('data/kaysender/schemas/floating-island-production-profile.schema.json'),
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
vm.runInContext(schemaSource, context);
vm.runInContext(domainSource, context);
vm.runInContext(primitiveSource, context);
vm.runInContext(genericSource, context);
vm.runInContext(factorySource, context);
vm.runInContext(bridgeSource, context);

const schema = context.window.KaysenderIslandV3Schema;
const factory = context.window.KaysenderIslandV3AdapterFactory;
assert.ok(schema);
assert.ok(factory);
assert.equal(typeof schema.validate, 'function');
assert.equal(typeof schema.isValid, 'function');
assert.equal(typeof factory.validateCanonical, 'function');
assert.equal(typeof factory.schemaDiagnostics, 'function');
assert.deepEqual(clone(schema.PROFILE_SCHEMA.required), officialSchema.required);
assert.equal(schema.PROFILE_SCHEMA.properties.schemaVersion.const, '3.0.0');
assert.equal(schema.PROFILE_SCHEMA.properties.profileType.const, 'floating-island-foundation-profile');

const validBefore = clone(valid);
assert.deepEqual(clone(schema.validate(valid)), []);
assert.equal(schema.isValid(valid), true);
assert.deepEqual(valid, validBefore, 'Schema validation mutated the valid fixture.');
assert.equal(factory.validateCanonical(valid).ok, true);

const cases = [
  {
    id: 'top-level-additional-property',
    mutate: profile => { profile.unexpected = true; },
    code: 'schema-additional-property',
    path: '$.unexpected'
  },
  {
    id: 'required-field-missing',
    mutate: profile => { delete profile.geometry.lengthKm; },
    code: 'schema-required',
    path: '$.geometry.lengthKm'
  },
  {
    id: 'schema-version-const',
    mutate: profile => { profile.schemaVersion = '2.0.0'; },
    code: 'schema-const',
    path: '$.schemaVersion'
  },
  {
    id: 'invalid-cell-id-pattern',
    mutate: profile => { profile.map.cells[0].id = 'CELL BAD'; },
    code: 'schema-pattern',
    path: '$.map.cells[0].id'
  },
  {
    id: 'duplicate-active-cell-id',
    mutate: profile => { profile.map.activeCellIds.push(profile.map.activeCellIds[0]); },
    code: 'schema-unique-items',
    path: '$.map.activeCellIds[4]'
  },
  {
    id: 'negative-cell-area',
    mutate: profile => { profile.map.cells[0].areaKm2 = -1; },
    code: 'schema-minimum',
    path: '$.map.cells[0].areaKm2'
  },
  {
    id: 'invalid-survey-status',
    mutate: profile => { profile.classification.surveyStatus = 'perfect'; },
    code: 'schema-enum',
    path: '$.classification.surveyStatus'
  },
  {
    id: 'drift-bearing-exclusive-maximum',
    mutate: profile => { profile.motion.driftTimeline[0].bearingDegrees = 360; },
    code: 'schema-exclusive-maximum',
    path: '$.motion.driftTimeline[0].bearingDegrees'
  },
  {
    id: 'route-node-needs-landing-zone',
    mutate: profile => { profile.routeNodeExport.nodes[0].landingZoneIds = []; },
    code: 'schema-min-items',
    path: '$.routeNodeExport.nodes[0].landingZoneIds'
  },
  {
    id: 'boolean-type-enforced',
    mutate: profile => { profile.routeNodeExport.routeCapability.resupplyWater = 'yes'; },
    code: 'schema-type',
    path: '$.routeNodeExport.routeCapability.resupplyWater'
  },
  {
    id: 'nested-additional-property',
    mutate: profile => { profile.sites[0].secretExtra = 'no'; },
    code: 'schema-additional-property',
    path: '$.sites[0].secretExtra'
  },
  {
    id: 'landing-status-enum',
    mutate: profile => { profile.approaches.landingZones[0].status = 'excellent'; },
    code: 'schema-enum',
    path: '$.approaches.landingZones[0].status'
  },
  {
    id: 'integer-enforced',
    mutate: profile => { profile.settlementCapacity.sustainablePopulation = 8100.5; },
    code: 'schema-type',
    path: '$.settlementCapacity.sustainablePopulation'
  },
  {
    id: 'positive-geometry-enforced',
    mutate: profile => { profile.geometry.lengthKm = 0; },
    code: 'schema-exclusive-minimum',
    path: '$.geometry.lengthKm'
  }
];

for (const testCase of cases) {
  const profile = clone(valid);
  testCase.mutate(profile);
  const diagnostics = clone(schema.validate(profile));
  assert.ok(
    diagnostics.some(item => item.code === testCase.code && item.path === testCase.path),
    `${testCase.id} did not produce ${testCase.code} at ${testCase.path}: ${JSON.stringify(diagnostics)}`
  );
  assert.equal(schema.isValid(profile), false);
  assert.equal(factory.validateCanonical(profile).ok, false);
}

for (const marker of [
  'schema-additional-property',
  'schema-required',
  'schema-type',
  'schema-enum',
  'schema-pattern',
  'schema-unique-items',
  'schema-min-items',
  'schema-exclusive-minimum',
  'schema-exclusive-maximum',
  'root.KaysenderIslandV3Schema'
]) assert.ok(schemaSource.includes(marker), `Schema validator source is missing ${marker}.`);
for (const marker of [
  'function readProfile(panel)',
  'const profile = base.readProfile(panel)',
  'const result = validateCanonical(profile)',
  'renderSchemaDiagnostics(panel, result.diagnostics)',
  'root.KaysenderIslandV3AdapterFactory = Object.freeze'
]) assert.ok(bridgeSource.includes(marker), `Schema bridge source is missing ${marker}.`);

assert.equal(schemaSource.includes('.innerHTML'), false);
assert.equal(bridgeSource.includes('.innerHTML'), false);
assert.equal(schemaSource.includes('KaysenderEditorAdapters.register'), false);
assert.equal(bridgeSource.includes('KaysenderEditorAdapters.register'), false);
assert.equal(index.includes('kaysender-island-v3-schema-validator.js'), false);
assert.equal(index.includes('kaysender-island-v3-adapter-schema-bridge.js'), false);

console.log('P1 Island synchronous schema validation passed.');
console.log(`Verified the valid production fixture and ${cases.length} malformed schema cases, plus final adapter rejection, source immutability, closed-object enforcement, and inactive runtime boundaries.`);
