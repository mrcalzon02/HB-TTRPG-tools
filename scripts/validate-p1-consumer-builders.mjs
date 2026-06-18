import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root = process.cwd();
const clone = value => JSON.parse(JSON.stringify(value));
const readJson = async relativePath => JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));
const baseSource = await fs.readFile(path.join(root, 'kaysender-island-v3-transformers.js'), 'utf8');
const consumerSource = await fs.readFile(path.join(root, 'kaysender-island-v3-consumer-builders.js'), 'utf8');
const indexSource = await fs.readFile(path.join(root, 'index.html'), 'utf8');
const aster = await readJson('data/kaysender/editors/fixtures/p1-floating-island-production-valid.json');
const v2Source = await readJson('data/kaysender/editors/fixtures/p1-island-v2-migration-source.json');

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
  Error
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(baseSource, context, { filename: 'kaysender-island-v3-transformers.js' });
const primitiveApi = context.window.KaysenderIslandV3Transformers;
assert.ok(primitiveApi, 'Base Island v3 transformer API did not load.');
vm.runInContext(consumerSource, context, { filename: 'kaysender-island-v3-consumer-builders.js' });
const api = context.window.KaysenderIslandV3Transformers;
assert.ok(api, 'Generic Island consumer builder API did not replace the primitive API.');
assert.notEqual(api.buildPopulationPayload, primitiveApi.buildPopulationPayload);
assert.equal(typeof api.populationConstraints, 'function');
assert.equal(typeof api.settlementConstraints, 'function');
assert.equal(typeof api.ecologyConstraints, 'function');
assert.equal(typeof api.routeConstraints, 'function');

const asterPayloads = clone(api.buildDownstreamPayloads(aster));
assert.equal(asterPayloads.population.payload.constraints[0], 'Food capacity is the binding population limit at 8100 people.');
assert.ok(asterPayloads.population.payload.constraints.some(item => item.includes('settlement-slot-western-port — 7600 people')));
assert.ok(asterPayloads.population.payload.constraints.some(item => item.includes('cell-eastern-rim')));
assert.ok(asterPayloads.settlement.payload.designConstraints.some(item => item.includes('8.4 km²')));
assert.ok(asterPayloads.settlement.payload.designConstraints.some(item => item.includes('water-western-springs')));
assert.ok(asterPayloads.settlement.payload.designConstraints.some(item => item.includes('Western Skyport — closed during crosswinds above 70 km/h')));
assert.ok(asterPayloads.ecology.payload.ecologicalConstraints.some(item => item.includes('habitat-central-pasture')));
assert.ok(asterPayloads.ecology.payload.ecologicalConstraints.some(item => item.includes('6100 of 8400 safe annual tons')));
assert.ok(asterPayloads.route.payload.routingConstraints.some(item => item.includes('Aster Reach Western Skyport')));
assert.ok(asterPayloads.route.payload.routingConstraints.some(item => item.includes('Western Crosswind Shear (moderate, seasonal)')));

const renamed = clone(aster);
renamed.name = 'Zephyr Crown';
renamed.settlementCapacity.settlementSlots[0].id = 'settlement-slot-crown-harbor';
renamed.settlementCapacity.settlementSlots[0].maximumPopulation = 2300;
renamed.settlementCapacity.settlementSlots[0].maximumFootprintKm2 = 3.75;
renamed.routeNodeExport.nodes[0].name = 'Zephyr Crown High Dock';
renamed.approaches.landingZones[0].name = 'High Dock';
renamed.approaches.landingZones[0].weatherLimit = 'closed during electrical storms';
renamed.hazards[0].name = 'Crown Lightning Wall';
renamed.hazards[0].severity = 'major';
renamed.hazards[0].status = 'active';
const renamedPayloads = clone(api.buildDownstreamPayloads(renamed));
const renamedText = JSON.stringify(renamedPayloads);
assert.ok(renamedText.includes('settlement-slot-crown-harbor — 2300 people'));
assert.ok(renamedText.includes('3.75 km²'));
assert.ok(renamedText.includes('High Dock — closed during electrical storms'));
assert.ok(renamedText.includes('Zephyr Crown High Dock'));
assert.ok(renamedText.includes('Crown Lightning Wall (major, active)'));
assert.equal(renamedText.includes('The Western Skyport is the only active route node'), false);
assert.equal(renamedText.includes('The pasture and basin cells form one connected managed habitat'), false);
assert.equal(renamedText.includes('occupied western settlement slot'), false);
assert.equal(renamedText.includes('The eastern rim should not be treated'), false);

const migrated = clone(api.migrateV2ToV3(v2Source));
const migratedText = JSON.stringify(migrated.data.outputs.downstreamExports);
assert.ok(migratedText.includes('settlement-slot-migrated-primary'));
assert.ok(migratedText.includes('Morrow Shelf Legacy Foundation Migrated Route Node'));
assert.equal(migratedText.includes('The Western Skyport is the only active route node'), false);
assert.equal(migratedText.includes('The pasture and basin cells form one connected managed habitat'), false);
assert.equal(migratedText.includes('occupied western settlement slot'), false);
assert.equal(migratedText.includes('The eastern rim should not be treated'), false);

for (const secret of aster.visibility.gmSecrets) {
  assert.equal(JSON.stringify(asterPayloads).includes(secret), false, 'Generic consumer payload leaked GM-secret text.');
}
for (const id of aster.visibility.gmOnlySiteIds) {
  assert.equal(JSON.stringify(asterPayloads).includes(id), false, `Generic standard consumer payload leaked GM-only site ID ${id}.`);
}

for (const forbidden of ['Aster Reach', 'Western Skyport', 'western lane', 'eastern rim', 'pasture and basin']) {
  assert.equal(consumerSource.includes(forbidden), false, `Generic consumer builder source contains fixture-specific phrase '${forbidden}'.`);
}
for (const marker of [
  'function populationConstraints',
  'function settlementConstraints',
  'function ecologyConstraints',
  'function routeConstraints',
  'result.data.outputs.downstreamExports = buildDownstreamExports',
  'root.KaysenderIslandV3Transformers = Object.freeze'
]) {
  assert.ok(consumerSource.includes(marker), `Generic consumer builder source is missing '${marker}'.`);
}
assert.equal(indexSource.includes('kaysender-island-v3-consumer-builders.js'), false, 'Generic consumer builders were loaded before P1 activation.');

console.log('P1 Island generic consumer builder validation passed.');
console.log('Verified profile-derived population, settlement, ecology, and route constraints for the Aster Reach fixture, a renamed Island, and migrated v2 data, including migration wrapping and GM-only content exclusion.');
