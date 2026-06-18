import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root = process.cwd();
const normalize = value => JSON.parse(JSON.stringify(value));
const readJson = async relativePath => JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));

const resizeSource = await fs.readFile(path.join(root, 'kaysender-surface-grid-resize.js'), 'utf8');
const controllerSource = await fs.readFile(path.join(root, 'kaysender-island-surface-grid-controller.js'), 'utf8');
const resizeStyles = await fs.readFile(path.join(root, 'kaysender-surface-grid-resize.css'), 'utf8');
const indexSource = await fs.readFile(path.join(root, 'index.html'), 'utf8');
const fixture = await readJson('data/kaysender/editors/fixtures/p1-floating-island-production-valid.json');
const expectedCase = await readJson('data/kaysender/editors/fixtures/p1-island-surface-resize-case.json');

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
vm.runInContext(resizeSource, context, { filename: 'kaysender-surface-grid-resize.js' });
const api = context.window.KaysenderSurfaceGridResize;
assert.ok(api, 'Surface resize module did not register its inert API.');
assert.equal(typeof api.buildResizePlan, 'function');
assert.equal(typeof api.collectCellReferences, 'function');
assert.equal(typeof api.planMatchesMap, 'function');
assert.equal(typeof api.summarizeResizePlan, 'function');
assert.equal(typeof api.SurfaceGridResizePanel, 'function');

const sourceBefore = normalize(fixture);
const plan = normalize(api.buildResizePlan(
  fixture,
  expectedCase.operation.columns,
  expectedCase.operation.rows,
  { preserve: expectedCase.operation.preserve }
));
assert.deepEqual(fixture, sourceBefore, 'Resize preview mutated the source Island profile.');
assert.deepEqual(plan.sourceDimensions, expectedCase.expected.sourceDimensions);
assert.deepEqual(plan.targetDimensions, expectedCase.expected.targetDimensions);
assert.equal(plan.direction, expectedCase.expected.direction);
assert.equal(plan.changed, expectedCase.expected.changed);
assert.equal(plan.requiresConfirmation, expectedCase.expected.requiresConfirmation);
assert.deepEqual(plan.removedCellIds, expectedCase.expected.removedCellIds);
assert.deepEqual(plan.removedActiveCellIds, expectedCase.expected.removedActiveCellIds);
assert.equal(plan.removedAreaKm2, expectedCase.expected.removedAreaKm2);
assert.deepEqual(plan.removedOutgoingReferences, expectedCase.expected.removedOutgoingReferences);
assert.deepEqual(plan.affectedEntityIds, expectedCase.expected.affectedEntityIds);

const directProjection = plan.references.direct.map(item => ({
  kind: item.kind,
  entityId: item.entityId,
  path: item.path,
  affectedCellIds: item.affectedCellIds
}));
const dependentProjection = plan.references.dependent.map(item => ({
  kind: item.kind,
  entityId: item.entityId,
  path: item.path,
  dependencyIds: item.dependencyIds,
  affectedCellIds: item.affectedCellIds
}));
assert.deepEqual(directProjection, expectedCase.expected.directReferences);
assert.deepEqual(dependentProjection, expectedCase.expected.dependentReferences);
assert.deepEqual(normalize(api.summarizeResizePlan(plan)), {
  changed: true,
  ...expectedCase.expected.summary
});
assert.equal(api.planMatchesMap(plan, fixture.map), true);

const changedMap = normalize(fixture.map);
changedMap.cells[0].terrainType = 'changed after preview';
assert.equal(api.planMatchesMap(plan, changedMap), true, 'Non-identity cell edits should not invalidate a resize coordinate preview.');
changedMap.cells[0].x = 1;
assert.equal(api.planMatchesMap(plan, changedMap), false, 'Coordinate changes did not invalidate the stale resize preview.');

const expansion = normalize(api.buildResizePlan(fixture, 3, 3, { preserve: true }));
assert.equal(expansion.changed, true);
assert.equal(expansion.direction, 'expand-or-equal');
assert.equal(expansion.requiresConfirmation, false);
assert.deepEqual(expansion.removedCellIds, []);
assert.equal(expansion.references.all.length, 0);

const unchanged = normalize(api.buildResizePlan(fixture, 2, 2, { preserve: true }));
assert.equal(unchanged.changed, false);
assert.equal(unchanged.requiresConfirmation, false);
assert.deepEqual(unchanged.removedCells, []);

const replaceAll = normalize(api.buildResizePlan(fixture, 2, 2, { preserve: false }));
assert.equal(replaceAll.changed, true);
assert.equal(replaceAll.requiresConfirmation, true);
assert.equal(replaceAll.removedCellIds.length, fixture.map.cells.length);
assert.equal(replaceAll.removedAreaKm2, fixture.geometry.planAreaKm2);

for (const marker of [
  'function buildResizePlan',
  'function collectCellReferences',
  'depends-on-water-source-anchored-in-removed-cell',
  'depends-on-fault-zone-covering-removed-cell',
  'depends-on-habitat-covering-removed-cell',
  'this.plan.requiresConfirmation && !confirmed',
  'I understand that these cells will be removed',
  'root.KaysenderSurfaceGridResize'
]) {
  assert.ok(resizeSource.includes(marker), `Surface resize source is missing '${marker}'.`);
}
assert.equal(resizeSource.includes('.innerHTML'), false, 'Surface resize panel still renders imported data through innerHTML.');

for (const marker of [
  'this.onResizePreview',
  'this.onResizeCommitted',
  'previewResize(columns, rows, options = {})',
  'applyResizePlan(planInput)',
  'surface-resize-plan-stale',
  'plan.requiresConfirmation && plan.confirmed !== true',
  'this.lastResizeRecovery',
  'getResizeRecovery()',
  'clearResizeRecovery()',
  'onCellChange: event => this.#writeProfile(event)'
]) {
  assert.ok(controllerSource.includes(marker), `Island surface controller is missing resize marker '${marker}'.`);
}
assert.equal(controllerSource.includes('this.deps.lifecycle.markDirty(this.editorId, \'Island surface resize preview'), false, 'Resize preview would dirty the active profile.');

for (const marker of [
  '.kaysender-surface-resize',
  '.surface-resize-preview.destructive',
  '.surface-resize-confirmation',
  '.surface-resize-status'
]) {
  assert.ok(resizeStyles.includes(marker), `Surface resize styles are missing '${marker}'.`);
}

assert.equal(indexSource.includes('kaysender-surface-grid-resize.js'), false, 'Surface resize module was loaded before P1 activation.');
assert.equal(indexSource.includes('kaysender-surface-grid-resize.css'), false, 'Surface resize styles were loaded before P1 activation.');

console.log('P1 Island surface resize validation passed.');
console.log('Verified deterministic destructive-resize preview, direct and dependent ledger references, stale-plan detection, non-destructive expansion, full replacement recovery, confirmation requirements, recovery retention markers, safe text rendering, and inactive runtime state.');
