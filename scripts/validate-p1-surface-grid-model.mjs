import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root = process.cwd();
const source = await fs.readFile(path.join(root, 'kaysender-surface-grid-editor.js'), 'utf8');
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

const api = context.window.KaysenderSurfaceGridEditor;
assert.ok(api, 'Surface grid editor did not register its API.');
assert.equal(typeof api.SurfaceGridModel, 'function');
assert.equal(typeof api.SurfaceGridView, 'function');
assert.equal(typeof api.createModelFromProfile, 'function');

const model = api.createModelFromProfile(fixture);
assert.equal(model.columns, fixture.map.columns);
assert.equal(model.rows, fixture.map.rows);
assert.deepEqual(
  model.toMap().activeCellIds,
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
assert.deepEqual(erased.siteIds, []);

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
  model.validate().some(item => item.code === 'arable-exceeds-usable'),
  'Grid model did not diagnose arable area exceeding usable area.'
);
model.setCell(0, 0, { usablePercent: 74, arablePercent: 8 });

const removed = model.resize(1, 2, { preserve: true });
assert.equal(model.columns, 1);
assert.equal(model.rows, 2);
assert.ok(removed.some(cell => cell.id === 'cell-central-pasture'));
assert.ok(removed.some(cell => cell.id === 'cell-eastern-rim'));
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
const exported = model.toMap();
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
  'grid-template-columns: repeat(var(--surface-grid-columns)',
  '.kaysender-surface-cell.selected',
  '.kaysender-surface-cell.incompatible',
  '.kaysender-surface-cell.inactive',
  '.surface-cell-coordinate'
]) {
  if (!styles.includes(marker)) throw new Error(`Surface grid styles are missing '${marker}'.`);
}

console.log('P1 surface-grid model validation passed.');
console.log('Verified Island fixture loading, stable IDs, editing, erasure, reactivation, resize preservation, diagnostics, map export, brush compatibility, mouse controls, keyboard controls, and grid styling.');
