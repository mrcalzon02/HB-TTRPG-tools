import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root = process.cwd();
const readJson = async relativePath => JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));
const normalize = value => JSON.parse(JSON.stringify(value));
const sum = values => values.reduce((total, value) => total + Number(value || 0), 0);

const paths = {
  sourceV2: 'data/kaysender/editors/fixtures/p1-island-v2-migration-source.json',
  migration: 'data/kaysender/editors/p1-island-v2-to-v3-migration-contract.json',
  expected: 'data/kaysender/editors/fixtures/p1-island-v2-to-v3-expected-core.json',
  sourceV3: 'data/kaysender/editors/fixtures/p1-floating-island-production-valid.json',
  consumerContract: 'data/kaysender/editors/p1-downstream-consumer-contract.json',
  population: 'data/kaysender/editors/fixtures/p1-population-consumer-input.json',
  settlement: 'data/kaysender/editors/fixtures/p1-settlement-consumer-input.json',
  ecology: 'data/kaysender/editors/fixtures/p1-ecology-consumer-input.json',
  route: 'data/kaysender/editors/fixtures/p1-route-consumer-input.json'
};

const primitiveSource = await fs.readFile(path.join(root, 'kaysender-island-v3-transformers.js'), 'utf8');
const genericSource = await fs.readFile(path.join(root, 'kaysender-island-v3-consumer-builders.js'), 'utf8');
const indexSource = await fs.readFile(path.join(root, 'index.html'), 'utf8');
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
  RegExp
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(primitiveSource, context, { filename: 'kaysender-island-v3-transformers.js' });
const primitiveApi = context.window.KaysenderIslandV3Transformers;
assert.ok(primitiveApi, 'Primitive Island v3 transformer API did not register.');
vm.runInContext(genericSource, context, { filename: 'kaysender-island-v3-consumer-builders.js' });
const transformers = context.window.KaysenderIslandV3Transformers;
assert.ok(transformers, 'Final wrapped Island v3 transformer API did not register.');
assert.notEqual(transformers.buildPopulationPayload, primitiveApi.buildPopulationPayload);
assert.notEqual(transformers.migrateV2ToV3, primitiveApi.migrateV2ToV3);
for (const name of [
  'migrateV2ToV3',
  'buildPopulationPayload',
  'buildSettlementPayload',
  'buildEcologyPayload',
  'buildRoutePayload',
  'buildDownstreamPayloads',
  'buildDownstreamExports'
]) assert.equal(typeof transformers[name], 'function', `Final transformer API is missing ${name}.`);

const [sourceV2, migration, expected, sourceV3, consumerContract, population, settlement, ecology, route] = await Promise.all(
  Object.values(paths).map(readJson)
);

assert.equal(sourceV2.schemaVersion, '2.0.0');
assert.equal(sourceV2.profileType, 'floating-island-foundation-profile');
assert.equal(migration.fromVersion, '2.0.0');
assert.equal(migration.toVersion, '3.0.0');
assert.equal(migration.status, 'prepared-not-registered');
assert.equal(migration.sourceFixture, paths.sourceV2);
assert.equal(expected.sourceFixture, paths.sourceV2);
assert.equal(expected.targetSchemaVersion, '3.0.0');

const sourceBefore = normalize(sourceV2);
const first = normalize(transformers.migrateV2ToV3(sourceV2));
const second = normalize(transformers.migrateV2ToV3(sourceV2));
assert.deepEqual(sourceV2, sourceBefore, 'Final migration mutated its source profile.');
assert.deepEqual(first, second, 'Final wrapped migration is not deterministic.');
assert.equal(first.changed, true);
assert.deepEqual(first.applied, ['island-2.0.0-to-3.0.0']);
assert.equal(first.log[0].code, expected.requiredMigrationLogEntry.code);
assert.equal(first.log[0].fromVersion, expected.requiredMigrationLogEntry.fromVersion);
assert.equal(first.log[0].toVersion, expected.requiredMigrationLogEntry.toVersion);
assert.deepEqual(first.crosswalks, expected.expectedCrosswalks);

const migrated = first.data;
assert.equal(migrated.schemaVersion, '3.0.0');
assert.equal(migrated.profileType, 'floating-island-foundation-profile');
assert.deepEqual(migrated.classification, expected.expectedClassification);
assert.equal(migrated.geometry.coordinateSystem, expected.expectedGeometry.coordinateSystem);
assert.equal(migrated.geometry.mapScaleKmPerCell, expected.expectedGeometry.mapScaleKmPerCell);
assert.deepEqual(migrated.map, expected.expectedMap);
assert.equal(Object.hasOwn(migrated, 'mapFoundation'), false);
assert.equal(Object.hasOwn(migrated, 'insertionCapacity'), false);
assert.equal(Object.hasOwn(migrated, 'generatedAt'), false);
assert.equal(sum(migrated.map.cells.map(cell => cell.areaKm2)), sourceV2.geometry.planAreaKm2);

const siteSummary = migrated.sites.map(site => ({
  id: site.id,
  mapCellId: site.mapCellId,
  type: site.type,
  status: site.status,
  visibility: site.visibility,
  maximumFootprintKm2: site.maximumFootprintKm2,
  requiredTags: site.tags
}));
assert.deepEqual(siteSummary, expected.expectedSites);
assert.equal(migrated.hydrology.sources[0].mapCellId, expected.expectedAnchors.waterCellId);
assert.equal(migrated.resources.nodes[0].mapCellId, expected.expectedAnchors.resourceCellId);
assert.equal(migrated.settlementCapacity.settlementSlots[0].mapCellId, expected.expectedAnchors.primarySettlementCellId);
assert.equal(migrated.approaches.landingZones[0].mapCellId, expected.expectedAnchors.primaryApproachCellId);
assert.equal(migrated.hydrology.sources[0].id, expected.expectedProvisionalRecords.waterSourceId);
assert.equal(migrated.resources.nodes[0].id, expected.expectedProvisionalRecords.resourceNodeId);
assert.equal(migrated.motion.altitudeTimeline[0].id, expected.expectedProvisionalRecords.altitudeSegmentId);
assert.equal(migrated.motion.driftTimeline[0].id, expected.expectedProvisionalRecords.driftSegmentId);
assert.equal(migrated.approaches.landingZones[0].id, expected.expectedProvisionalRecords.landingZoneId);
assert.equal(migrated.approaches.approachCorridors[0].id, expected.expectedProvisionalRecords.approachCorridorId);
assert.equal(migrated.ecology.habitats[0].id, expected.expectedProvisionalRecords.habitatId);
assert.equal(migrated.ecology.speciesSlots[0].id, expected.expectedProvisionalRecords.speciesSlotId);
assert.equal(migrated.settlementCapacity.settlementSlots[0].id, expected.expectedProvisionalRecords.settlementSlotId);
assert.equal(migrated.routeNodeExport.nodes[0].id, expected.expectedProvisionalRecords.routeNodeId);
assert.deepEqual(migrated.foodCapacity, expected.expectedCapacity.foodCapacity);
assert.equal(migrated.settlementCapacity.waterLimitedPopulation, expected.expectedCapacity.settlementCapacity.waterLimitedPopulation);
assert.equal(migrated.settlementCapacity.foodLimitedPopulation, expected.expectedCapacity.settlementCapacity.foodLimitedPopulation);
assert.equal(migrated.settlementCapacity.landLimitedPopulation, expected.expectedCapacity.settlementCapacity.landLimitedPopulation);
assert.equal(migrated.settlementCapacity.sustainablePopulation, expected.expectedCapacity.settlementCapacity.sustainablePopulation);
assert.equal(migrated.settlementCapacity.emergencyPopulation, expected.expectedCapacity.settlementCapacity.emergencyPopulation);
assert.deepEqual(migrated.settlementCapacity.settlementSlots[0], expected.expectedCapacity.settlementCapacity.primarySlot);
assert.deepEqual(migrated.visibility, { ...expected.expectedVisibility, publicFacts: [sourceV2.outputs.summary] });
for (const [key, value] of Object.entries(expected.expectedDerived)) assert.deepEqual(migrated.derived[key], value);
const warningText = migrated.derived.warnings.join(' ').toLowerCase();
for (const fragment of expected.requiredWarningFragments) assert.ok(warningText.includes(fragment.toLowerCase()), `Migration omitted warning fragment '${fragment}'.`);

const migratedText = JSON.stringify(migrated.outputs.downstreamExports);
for (const phrase of [
  'The Western Skyport is the only active route node',
  'The pasture and basin cells form one connected managed habitat',
  'occupied western settlement slot',
  'The eastern rim should not be treated'
]) assert.equal(migratedText.includes(phrase), false, `Migrated final exports retained fixture-specific phrase '${phrase}'.`);
assert.ok(migratedText.includes('Morrow Shelf Legacy Foundation Migrated Route Node'));

assert.equal(consumerContract.sourceProfileType, sourceV3.profileType);
assert.equal(consumerContract.sourceSchemaVersion, sourceV3.schemaVersion);
const fixtureByConsumer = { population, settlement, ecology, route };
for (const [name, fixture] of Object.entries(fixtureByConsumer)) {
  assert.equal(fixture.contractVersion, consumerContract.schemaVersion, `${name} contract version mismatch.`);
  assert.equal(fixture.source.profileType, sourceV3.profileType);
  assert.equal(fixture.source.schemaVersion, sourceV3.schemaVersion);
  assert.equal(fixture.source.name, sourceV3.name);
  assert.equal(fixture.source.referencePolicy, 'pinned-revision-required-when-enveloped');
}

const generated = normalize(transformers.buildDownstreamPayloads(sourceV3));
assert.deepEqual(generated.population, population, 'Final population payload differs from its canonical fixture.');
assert.deepEqual(generated.settlement, settlement, 'Final settlement payload differs from its canonical fixture.');
assert.deepEqual(generated.ecology, ecology, 'Final ecology payload differs from its canonical fixture.');
assert.deepEqual(generated.route, route, 'Final route payload differs from its canonical fixture.');

const cells = new Set(sourceV3.map.cells.map(item => item.id));
const sites = new Set(sourceV3.sites.map(item => item.id));
const hazards = new Set(sourceV3.hazards.map(item => item.id));
const water = new Set(sourceV3.hydrology.sources.map(item => item.id));
const landing = new Set(sourceV3.approaches.landingZones.map(item => item.id));
const routes = new Set(sourceV3.routeNodeExport.nodes.map(item => item.id));
const habitats = new Set(sourceV3.ecology.habitats.map(item => item.id));
const settlementSlots = new Set(sourceV3.settlementCapacity.settlementSlots.map(item => item.id));

generated.population.payload.habitableCells.forEach(item => assert.ok(cells.has(item.id)));
generated.population.payload.settlementSlots.forEach(item => assert.ok(settlementSlots.has(item.id)));
generated.population.payload.knownHazards.forEach(item => assert.ok(hazards.has(item.id)));
assert.equal(generated.population.payload.capacityLimits.bindingConstraint, 'food');
assert.equal(generated.settlement.payload.hostCell.id, generated.settlement.payload.selectedSettlementSlot.mapCellId);
generated.settlement.payload.referencedWaterSources.forEach(item => assert.ok(water.has(item.id)));
generated.settlement.payload.referencedLandingZones.forEach(item => assert.ok(landing.has(item.id)));
generated.settlement.payload.availableRouteNodes.forEach(item => assert.ok(routes.has(item.id)));
generated.settlement.payload.publicSites.forEach(item => assert.ok(sites.has(item.id)));
generated.ecology.payload.habitats.forEach(item => {
  assert.ok(habitats.has(item.id));
  item.cellIds.forEach(id => assert.ok(cells.has(id)));
});
generated.route.payload.nodes.forEach(item => assert.ok(routes.has(item.id)));
generated.route.payload.landingZones.forEach(item => assert.ok(landing.has(item.id)));

const consumerText = JSON.stringify(generated).toLowerCase();
for (const secret of sourceV3.visibility.gmSecrets) assert.equal(consumerText.includes(secret.toLowerCase()), false, 'Final consumer output leaked GM-secret text.');
for (const id of sourceV3.visibility.gmOnlySiteIds) assert.equal(consumerText.includes(id.toLowerCase()), false, `Final consumer output leaked GM-only site ${id}.`);
for (const id of sourceV3.visibility.gmOnlyHazardIds) assert.equal(consumerText.includes(id.toLowerCase()), false, `Final consumer output leaked GM-only hazard ${id}.`);

for (const marker of [
  'function migrateV2ToV3',
  'function buildPopulationPayload',
  'function buildSettlementPayload',
  'function buildEcologyPayload',
  'function buildRoutePayload',
  'root.KaysenderIslandV3Transformers = api'
]) assert.ok(primitiveSource.includes(marker), `Primitive transformer source is missing '${marker}'.`);
for (const marker of [
  'function populationConstraints',
  'function settlementConstraints',
  'function ecologyConstraints',
  'function routeConstraints',
  'result.data.outputs.downstreamExports = buildDownstreamExports',
  'root.KaysenderIslandV3Transformers = Object.freeze'
]) assert.ok(genericSource.includes(marker), `Generic transformer wrapper is missing '${marker}'.`);
assert.equal(primitiveSource.includes('KaysenderEditorMigrations.register'), false);
assert.equal(genericSource.includes('KaysenderEditorMigrations.register'), false);
assert.equal(indexSource.includes('kaysender-island-v3-transformers.js'), false);
assert.equal(indexSource.includes('kaysender-island-v3-consumer-builders.js'), false);

console.log('P1 Island final migration and consumer validation passed.');
console.log('Executed the primitive and generic transformer layers in activation order, verified deterministic v2 migration against the expected core, matched all four canonical final consumer fixtures, checked source references, and confirmed GM-only and fixture-specific text exclusion without registering or loading P1.');
