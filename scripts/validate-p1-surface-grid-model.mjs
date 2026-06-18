import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root = process.cwd();
const normalize = value => JSON.parse(JSON.stringify(value));
const source = await fs.readFile(path.join(root, 'kaysender-surface-grid-editor.js'), 'utf8');
const brushSource = await fs.readFile(path.join(root, 'kaysender-surface-grid-brushes.js'), 'utf8');
const inspectorSource = await fs.readFile(path.join(root, 'kaysender-surface-cell-inspector.js'), 'utf8');
const toolbarSource = await fs.readFile(path.join(root, 'kaysender-surface-grid-toolbar.js'), 'utf8');
const styles = await fs.readFile(path.join(root, 'kaysender-surface-grid-editor.css'), 'utf8');
const fixture = JSON.parse(await fs.readFile(path.join(root, 'data/kaysender/editors/fixtures/p1-floating-island-production-valid.json'), 'utf8'));
const context = {
  window: {},
  console,
  JSON,
  Math,
  Number,
  String,
  Set,
  Map,
  Object,
  Array,
  Error
};
vm.createContext(context);
vm.runInContext(source, context, { filename: 'kaysender-surface-grid-editor.js' });
vm.runInContext(brushSource, context, { filename: 'kaysender-surface-grid-brushes.js' });
vm.runInContext(inspectorSource, context, { filename: 'kaysender-surface-cell-inspector.js' });
vm.runInContext(toolbarSource, context, { filename: 'kaysender-surface-grid-toolbar.js' });

const api = context.window.KaysenderSurfaceGridEditor;
const brushApi = context.window.KaysenderSurfaceGridBrushes;
const inspectorApi = context.window.KaysenderSurfaceCellInspector;
const toolbarApi = context.window.KaysenderSurfaceGridToolbar;
assert.ok(api, 'Surface grid editor did not register its API.');
assert.ok(brushApi, 'Surface grid brush catalog did not register its API.');
assert.ok(inspectorApi, 'Surface cell inspector did not register its API.');
assert.ok(toolbarApi, 'Surface grid toolbar did not register its API.');
assert.equal(typeof api.SurfaceGridModel, 'function');
assert.equal(typeof api.SurfaceGridView, 'function');
assert.equal(typeof api.createModelFromProfile, 'function');
assert.equal(typeof toolbarApi.SurfaceGridToolbar, 'function');

const model = api.createModelFromProfile(fixture);
assert.equal(model.columns, fixture.map.columns);
assert.equal(model.rows, fixture.map.rows);
assert.deepEqual(
  normalize(model.toMap().activeCellIds),
  fixture.map.activeCellIds,
  'Active Island surface cells were not preserved.'
);
assert.equal(model.getCell(0, 0).id, 'cell-western-port');
assert.equal(model.getCell(1, 1).id, 'cell-eastern-rim');
assert.equal(model.getCell(1, 0).terrainType, 'pasture plateau');

const events = [];
const unsubscribe = model.subscribe(event => events.push(event.type));
const originalId = model.getCell(1, 0).id;
const edited = model.setCell(1, 0, {
  terrainType: 'terraced orchard',
  usablePercent: 91,
  arablePercent: 72
});
assert.equal(edited.id, originalId, 'Editing a surface cell changed its stable ID.');
assert.equal(edited.active, true);
assert.equal(edited.terrainType, 'terraced orchard');

const erased = model.eraseCell(1, 0);
assert.equal(erased.id, originalId, 'Erasing a surface cell did not preserve its stable ID.');
assert.equal(erased.active, false);
assert.equal(erased.terrainType, 'unassigned');
assert.deepEqual(normalize(erased.siteIds), []);

const restored = model.setCell(1, 0, {
  terrainType: 'pasture plateau',
  areaKm2: 41,
  usablePercent: 88,
  arablePercent: 64,
  waterCatchmentId: 'water-central-catchment',
  siteIds: ['site-central-cistern'],
  resourceNodeIds: ['resource-central-iron'],
  hazardIds: []
});
assert.equal(restored.id, originalId, 'Reactivating an erased cell changed its stable ID.');
assert.equal(restored.active, true);

assert.ok(events.includes('cell-changed'), 'Cell editing did not emit a change event.');
assert.ok(events.includes('cell-erased'), 'Cell erasure did not emit an erasure event.');
unsubscribe();

const invalid = model.setCell(0, 0, { usablePercent: 20, arablePercent: 60 });
assert.equal(invalid.id, 'cell-western-port');
assert.ok(
  normalize(model.validate()).some(item => item.code === 'arable-exceeds-usable'),
  'Grid model did not diagnose arable area exceeding usable area.'
);
model.setCell(0, 0, { usablePercent: 74, arablePercent: 8 });

const palette = brushApi.createDefaultPalette({ meanAltitudeM: fixture.motion.meanAltitudeM });
const groups = normalize(brushApi.groupPalette(palette));
assert.ok(groups.outline.length >= 2, 'Default palette is missing outline brushes.');
assert.ok(groups.terrain.length >= 10, 'Default palette is missing Island terrain brushes.');
assert.ok(groups.elevation.length >= 4, 'Default palette is missing elevation brushes.');
assert.ok(groups.slope.length >= 5, 'Default palette is missing slope brushes.');

const blank = model.eraseCell(1, 1);
const pastureBrush = palette.find(brush => brush.id === 'terrain-pasture');
assert.ok(pastureBrush, 'Pasture brush is missing.');
const pastureCell = model.setCell(1, 1, pastureBrush.patch, { activate: pastureBrush.activate });
assert.equal(pastureCell.id, blank.id, 'Terrain brush replaced the stable cell ID.');
assert.equal(pastureCell.terrainType, 'pasture');
assert.equal(pastureCell.active, true);

const highBrush = palette.find(brush => brush.id === 'elevation-high-ridge');
assert.equal(highBrush.apply(pastureCell).elevationM, fixture.motion.meanAltitudeM + 320);

const waterBrush = brushApi.createReferenceBrush({ family: 'water', referenceId: 'water-test-catchment', label: 'Test Catchment' });
model.setCell(1, 1, { slopeClass: 'steep' });
const steepWater = normalize(brushApi.evaluateCompatibility(model.getCell(1, 1), waterBrush));
assert.equal(steepWater.compatible, false);
assert.ok(steepWater.reasons.some(reason => reason.includes('Water catchments')));
model.setCell(1, 1, { slopeClass: 'gentle' });
assert.equal(brushApi.isCompatible(model.getCell(1, 1), waterBrush), true);
const watered = model.setCell(1, 1, waterBrush.apply(model.getCell(1, 1)), { activate: true });
assert.equal(watered.waterCatchmentId, 'water-test-catchment');

const siteBrush = brushApi.createReferenceBrush({ family: 'site', referenceId: 'site-test-observatory', label: 'Test Observatory' });
let linked = model.setCell(1, 1, siteBrush.apply(model.getCell(1, 1)), { activate: true });
linked = model.setCell(1, 1, siteBrush.apply(linked), { activate: true });
assert.deepEqual(normalize(linked.siteIds), ['site-test-observatory'], 'Site brush created duplicate stable references.');
const unlinkSite = brushApi.createUnlinkBrush({ family: 'site', referenceId: 'site-test-observatory' });
linked = model.setCell(1, 1, unlinkSite.apply(linked), { activate: true });
assert.deepEqual(normalize(linked.siteIds), []);

const lockedCompatibility = normalize(brushApi.evaluateCompatibility(model.getCell(1, 1), pastureBrush, {
  lockedCellIds: [model.getCell(1, 1).id]
}));
assert.equal(lockedCompatibility.compatible, false);
assert.ok(lockedCompatibility.reasons.some(reason => reason.includes('locked')));

const normalizedPatch = normalize(inspectorApi.normalizePatch({
  active: false,
  areaKm2: '-8',
  terrainType: '  terrace  ',
  elevationM: '4300',
  usablePercent: '140',
  arablePercent: '-4',
  waterCatchmentId: ' water-west ',
  siteIds: 'site-a, site-a, site-b',
  resourceNodeIds: ['resource-a', 'resource-a'],
  hazardIds: 'hazard-a, hazard-b'
}));
assert.equal(normalizedPatch.areaKm2, 0);
assert.equal(normalizedPatch.terrainType, 'terrace');
assert.equal(normalizedPatch.elevationM, 4300);
assert.equal(normalizedPatch.usablePercent, 100);
assert.equal(normalizedPatch.arablePercent, 0);
assert.equal(normalizedPatch.waterCatchmentId, 'water-west');
assert.deepEqual(normalizedPatch.siteIds, ['site-a', 'site-b']);
assert.deepEqual(normalizedPatch.resourceNodeIds, ['resource-a']);

const inspectorSnapshot = normalize(inspectorApi.inspectorState(model.getCell(1, 1), {
  isFieldLocked: pathValue => pathValue.endsWith('.areaKm2'),
  diagnosticsProvider: () => [{ severity: 'warning', code: 'test-warning', message: 'Test diagnostic.' }]
}));
assert.equal(inspectorSnapshot.fields.find(field => field.id === 'areaKm2').locked, true);
assert.equal(inspectorSnapshot.diagnostics[0].code, 'test-warning');

const beforeInspectorId = model.getCell(1, 1).id;
const inspectorEdited = inspectorApi.applyInspectorPatch(model, model.getCell(1, 1), {
  active: false,
  areaKm2: 41.5,
  terrainType: 'terraced orchard',
  usablePercent: 81,
  arablePercent: 54,
  siteIds: 'site-a, site-a, site-b'
});
assert.equal(inspectorEdited.id, beforeInspectorId, 'Inspector editing replaced the stable cell ID.');
assert.equal(inspectorEdited.active, false, 'Inspector could not deactivate a surface cell.');
assert.equal(inspectorEdited.areaKm2, 41.5);
assert.deepEqual(normalize(inspectorEdited.siteIds), ['site-a', 'site-b']);
inspectorApi.applyInspectorPatch(model, inspectorEdited, { active: true });
assert.equal(model.getCell(1, 1).active, true, 'Inspector could not reactivate a surface cell.');

const removed = normalize(model.resize(1, 2, { preserve: true }));
assert.equal(model.columns, 1);
assert.equal(model.rows, 2);
assert.ok(removed.some(cell => cell.id === 'cell-central-pasture'));
assert.ok(removed.some(cell => cell.id === beforeInspectorId));
assert.equal(model.getCellById('cell-central-pasture'), null);
assert.equal(model.getCell(0, 0).id, 'cell-western-port');
assert.equal(model.getCell(0, 1).id, 'cell-northern-basin');

model.resize(2, 2, { preserve: true });
model.setCell(1, 0, {
  id: 'cell-central-pasture',
  terrainType: 'pasture plateau',
  areaKm2: 41,
  usablePercent: 88,
  arablePercent: 64
});
const exported = normalize(model.toMap());
assert.equal(exported.columns, 2);
assert.equal(exported.rows, 2);
assert.ok(exported.activeCellIds.includes('cell-central-pasture'));
assert.ok(exported.cells.some(cell => cell.id === 'cell-central-pasture' && cell.x === 1 && cell.y === 0));
assert.equal(exported.cells.some(cell => Object.hasOwn(cell, 'active')), false, 'Internal active flags leaked into the P1 map export.');

for (const marker of [
  "button.addEventListener('click', () => this.applyBrush(x, y))",
  "button.addEventListener('contextmenu'",
  "event.key === 'Delete' || event.key === 'Backspace'",
  'this.compatibility(cell, brush)',
  'this.onSelectionChange?.(this.model.getCell(x, y))'
]) {
  if (!source.includes(marker)) throw new Error(`Surface grid view is missing reuse marker '${marker}'.`);
}

for (const marker of [
  "family: 'terrain'",
  'createReferenceBrush',
  'evaluateCompatibility',
  'lockedCellIds',
  'Water catchments require'
]) {
  if (!brushSource.includes(marker)) throw new Error(`Surface brush catalog is missing '${marker}'.`);
}

for (const marker of [
  'Apply Cell Changes',
  'Erase Cell Content',
  'Locked by the active profile envelope',
  'applyInspectorPatch',
  'diagnosticsProvider'
]) {
  if (!inspectorSource.includes(marker)) throw new Error(`Surface cell inspector is missing '${marker}'.`);
}

for (const marker of [
  'surface-brush-family',
  'aria-pressed',
  'this.view.setBrush',
  'groupPalette'
]) {
  if (!toolbarSource.includes(marker)) throw new Error(`Surface grid toolbar is missing '${marker}'.`);
}

for (const marker of [
  'grid-template-columns: repeat(var(--surface-grid-columns)',
  '.kaysender-surface-cell.selected',
  '.kaysender-surface-cell.incompatible',
  '.kaysender-surface-toolbar',
  '.surface-brush-button.selected',
  '.kaysender-surface-inspector',
  '.surface-inspector-diagnostics'
]) {
  if (!styles.includes(marker)) throw new Error(`Surface grid styles are missing '${marker}'.`);
}

console.log('P1 surface-grid validation passed.');
console.log('Verified Island fixture loading, stable IDs, editing, erasure, reactivation, resize preservation, diagnostics, map export, terrain and reference brushes, compatibility rules, exact-value inspector patches, field locks, grouped toolbar controls, mouse controls, keyboard controls, and styling.');
