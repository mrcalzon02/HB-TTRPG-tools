import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const readJson = async relativePath => JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));
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

const sourceRegionIds = sourceV2.mapFoundation.cells.map(cell => cell.id);
const expectedRegionCrosswalk = expected.expectedCrosswalks.regions;
assert.deepEqual(Object.keys(expectedRegionCrosswalk), sourceRegionIds, 'Migration crosswalk does not cover every v2 map region in source order.');
assert.equal(new Set(Object.values(expectedRegionCrosswalk)).size, sourceRegionIds.length, 'Migration cell IDs are not unique.');
assert.ok(Object.values(expectedRegionCrosswalk).every(id => /^cell-[a-z0-9][a-z0-9-]*$/.test(id)), 'Migration cell IDs do not match the v3 pattern.');

const sourceSlotIds = sourceV2.mapFoundation.siteSlots.map(slot => slot.id);
const expectedSiteCrosswalk = expected.expectedCrosswalks.siteSlots;
assert.deepEqual(Object.keys(expectedSiteCrosswalk), sourceSlotIds, 'Migration crosswalk does not cover every v2 site slot.');
assert.ok(Object.values(expectedSiteCrosswalk).every(id => /^site-[a-z0-9][a-z0-9-]*$/.test(id)), 'Migration site IDs do not match the v3 pattern.');

const expectedCells = expected.expectedMap.cells;
const expectedCellIds = new Set(expectedCells.map(cell => cell.id));
assert.deepEqual(expected.expectedMap.activeCellIds, expectedCells.map(cell => cell.id), 'Expected active-cell order differs from expected cell order.');
assert.equal(sum(expectedCells.map(cell => cell.areaKm2)), sourceV2.geometry.planAreaKm2, 'Expected migrated map area does not reconcile with v2 plan area.');
for (const cell of expectedCells) {
  assert.ok(cell.x >= 0 && cell.x < expected.expectedMap.columns);
  assert.ok(cell.y >= 0 && cell.y < expected.expectedMap.rows);
  assert.ok(cell.arablePercent <= cell.usablePercent);
  cell.siteIds.forEach(id => assert.ok(Object.values(expectedSiteCrosswalk).includes(id), `Expected cell references unknown migrated site ${id}.`));
}
for (const id of Object.values(expected.expectedAnchors)) assert.ok(expectedCellIds.has(id), `Expected migration anchor ${id} is not a migrated cell.`);
assert.equal(expected.expectedCapacity.foodCapacity.sustainablePopulation, 0, 'Migration must not invent sustainable food capacity.');
assert.equal(expected.expectedCapacity.settlementCapacity.waterLimitedPopulation, 0, 'Migration must not invent water capacity.');
assert.equal(expected.expectedCapacity.settlementCapacity.foodLimitedPopulation, 0, 'Migration must not invent food capacity.');
assert.equal(expected.expectedCapacity.settlementCapacity.landLimitedPopulation, sourceV2.insertionCapacity.maximumSupportedPopulation);
assert.equal(expected.expectedCapacity.settlementCapacity.emergencyPopulation, sourceV2.population.permanentPopulation);
assert.equal(expected.expectedDerived.waterCapacityReconciles, false);
assert.equal(expected.expectedDerived.foodCapacityReconciles, false);
assert.equal(expected.expectedDerived.settlementCapacityReconciles, false);
assert.ok(expected.requiredWarningFragments.length >= 8, 'Expected migration fixture does not require all provisional warnings.');

assert.equal(consumerContract.sourceProfileType, sourceV3.profileType);
assert.equal(consumerContract.sourceSchemaVersion, sourceV3.schemaVersion);
const fixtureByConsumer = { population, settlement, ecology, route };
for (const [consumerName, fixture] of Object.entries(fixtureByConsumer)) {
  assert.equal(fixture.contractVersion, consumerContract.schemaVersion, `${consumerName} consumer contract version mismatch.`);
  assert.equal(fixture.source.profileType, sourceV3.profileType);
  assert.equal(fixture.source.schemaVersion, sourceV3.schemaVersion);
  assert.equal(fixture.source.name, sourceV3.name);
  assert.equal(fixture.source.referencePolicy, 'pinned-revision-required-when-enveloped');
  assert.ok(fixture.payload && typeof fixture.payload === 'object');
}

const sourceCellById = new Map(sourceV3.map.cells.map(cell => [cell.id, cell]));
const sourceSiteById = new Map(sourceV3.sites.map(site => [site.id, site]));
const sourceHazardById = new Map(sourceV3.hazards.map(hazard => [hazard.id, hazard]));
const sourceWaterById = new Map(sourceV3.hydrology.sources.map(item => [item.id, item]));
const sourceLandingById = new Map(sourceV3.approaches.landingZones.map(item => [item.id, item]));
const sourceRouteById = new Map(sourceV3.routeNodeExport.nodes.map(item => [item.id, item]));
const sourceHabitatById = new Map(sourceV3.ecology.habitats.map(item => [item.id, item]));
const sourceSettlementSlotById = new Map(sourceV3.settlementCapacity.settlementSlots.map(item => [item.id, item]));

assert.equal(population.payload.capacityLimits.sustainablePopulation, sourceV3.settlementCapacity.sustainablePopulation);
assert.equal(population.payload.capacityLimits.bindingConstraint, 'food');
population.payload.habitableCells.forEach(cell => assert.ok(sourceCellById.has(cell.id), `Population payload references unknown cell ${cell.id}.`));
population.payload.settlementSlots.forEach(slot => assert.ok(sourceSettlementSlotById.has(slot.id), `Population payload references unknown settlement slot ${slot.id}.`));
population.payload.knownHazards.forEach(hazard => assert.ok(sourceHazardById.has(hazard.id), `Population payload references unknown hazard ${hazard.id}.`));

const selectedSlot = settlement.payload.selectedSettlementSlot;
const sourceSelectedSlot = sourceSettlementSlotById.get(selectedSlot.id);
assert.ok(sourceSelectedSlot, 'Settlement payload selected slot does not exist in source Island.');
assert.equal(settlement.payload.hostCell.id, sourceSelectedSlot.mapCellId);
assert.deepEqual(selectedSlot.waterSourceIds, sourceSelectedSlot.waterSourceIds);
assert.deepEqual(selectedSlot.landingZoneIds, sourceSelectedSlot.landingZoneIds);
settlement.payload.referencedWaterSources.forEach(item => {
  assert.ok(sourceWaterById.has(item.id));
  assert.ok(selectedSlot.waterSourceIds.includes(item.id));
});
settlement.payload.referencedLandingZones.forEach(item => {
  assert.ok(sourceLandingById.has(item.id));
  assert.ok(selectedSlot.landingZoneIds.includes(item.id));
});
settlement.payload.availableRouteNodes.forEach(item => assert.ok(sourceRouteById.has(item.id)));
settlement.payload.publicSites.forEach(item => {
  assert.ok(sourceSiteById.has(item.id));
  assert.notEqual(sourceSiteById.get(item.id).visibility, 'gm-only');
});
settlement.payload.knownHazards.forEach(item => assert.notEqual(sourceHazardById.get(item.id)?.visibility, 'gm-only'));

for (const habitat of ecology.payload.habitats) {
  const sourceHabitat = sourceHabitatById.get(habitat.id);
  assert.ok(sourceHabitat, `Ecology payload references unknown habitat ${habitat.id}.`);
  habitat.cellIds.forEach(id => assert.ok(sourceCellById.has(id), `Ecology habitat references unknown cell ${id}.`));
}
ecology.payload.speciesSlots.forEach(slot => assert.ok(sourceHabitatById.has(slot.habitatId)));
ecology.payload.habitatCells.forEach(cell => {
  assert.ok(sourceCellById.has(cell.id));
  assert.ok(ecology.payload.habitats.some(habitat => habitat.cellIds.includes(cell.id)));
});
ecology.payload.waterContext.forEach(item => assert.ok(sourceWaterById.has(item.id)));

assert.equal(route.payload.defaultNodeId, sourceV3.routeNodeExport.defaultNodeId);
route.payload.nodes.forEach(node => {
  assert.ok(sourceRouteById.has(node.id));
  node.landingZoneIds.forEach(id => assert.ok(route.payload.landingZones.some(zone => zone.id === id), `Route node references unexported landing zone ${id}.`));
});
route.payload.landingZones.forEach(zone => assert.ok(sourceLandingById.has(zone.id)));
route.payload.approachCorridors.forEach(corridor => {
  assert.ok(route.payload.landingZones.some(zone => zone.id === corridor.landingZoneId));
  corridor.hazardIds.forEach(id => assert.ok(route.payload.knownApproachHazards.some(hazard => hazard.id === id), `Approach corridor references unexported hazard ${id}.`));
});
route.payload.knownApproachHazards.forEach(hazard => {
  assert.ok(sourceHazardById.has(hazard.id));
  assert.notEqual(sourceHazardById.get(hazard.id).visibility, 'gm-only');
});
assert.deepEqual(route.payload.routeCapability, sourceV3.routeNodeExport.routeCapability);

const consumerText = JSON.stringify(fixtureByConsumer).toLowerCase();
for (const secret of sourceV3.visibility.gmSecrets) {
  assert.equal(consumerText.includes(secret.toLowerCase()), false, 'A downstream consumer fixture leaked source GM-secret text.');
}
for (const gmOnlySiteId of sourceV3.visibility.gmOnlySiteIds) {
  assert.equal(consumerText.includes(gmOnlySiteId.toLowerCase()), false, `A standard downstream consumer fixture leaked GM-only site ID ${gmOnlySiteId}.`);
}
for (const gmOnlyHazardId of sourceV3.visibility.gmOnlyHazardIds) {
  assert.equal(consumerText.includes(gmOnlyHazardId.toLowerCase()), false, `A standard downstream consumer fixture leaked GM-only hazard ID ${gmOnlyHazardId}.`);
}

console.log('P1 Island migration and downstream consumer validation passed.');
console.log('Verified v2 source coverage, deterministic cell and site crosswalks, conservative capacity placeholders, migration anchors, source-linked downstream references, binding population limits, route linkage, and exclusion of GM-only source content.');
