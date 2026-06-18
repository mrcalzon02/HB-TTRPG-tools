import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root = process.cwd();
const normalize = value => JSON.parse(JSON.stringify(value));
const readJson = async relativePath => JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));
const domainSource = await fs.readFile(path.join(root, 'kaysender-island-v3-domain.js'), 'utf8');
const indexSource = await fs.readFile(path.join(root, 'index.html'), 'utf8');
const baseFixture = await readJson('data/kaysender/editors/fixtures/p1-floating-island-production-valid.json');
const caseCatalog = await readJson('data/kaysender/editors/fixtures/p1-floating-island-reference-cases.json');

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
vm.runInContext(domainSource, context, { filename: 'kaysender-island-v3-domain.js' });
const domain = context.window.KaysenderIslandV3Domain;
assert.ok(domain, 'Island v3 domain engine did not register its inert API.');
assert.equal(typeof domain.validate, 'function');
assert.equal(typeof domain.recalculateDerived, 'function');
assert.equal(typeof domain.applyDerived, 'function');

function pointerParts(pointer) {
  if (!pointer || pointer === '/') return [];
  return pointer.split('/').slice(1).map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function applyMutation(document, mutation) {
  const parts = pointerParts(mutation.path);
  if (!parts.length) throw new Error(`Mutation ${mutation.operation} requires a non-root path.`);
  let target = document;
  for (const part of parts.slice(0, -1)) {
    const key = Array.isArray(target) ? Number(part) : part;
    if (target[key] === undefined) throw new Error(`Mutation path ${mutation.path} is missing segment ${part}.`);
    target = target[key];
  }
  const finalPart = parts.at(-1);
  if (Array.isArray(target)) {
    if (mutation.operation === 'add' && finalPart === '-') target.push(normalize(mutation.value));
    else target[Number(finalPart)] = normalize(mutation.value);
  } else {
    target[finalPart] = normalize(mutation.value);
  }
}

const validBefore = normalize(baseFixture);
const validDiagnostics = normalize(domain.validate(baseFixture));
assert.deepEqual(baseFixture, validBefore, 'Island domain validation mutated the source profile.');
assert.equal(validDiagnostics.some(item => item.severity === 'error'), false, `Valid Aster Reach fixture produced errors: ${JSON.stringify(validDiagnostics)}`);

const recalculated = normalize(domain.recalculateDerived(baseFixture));
for (const field of [
  'geometryReconciles',
  'compositionReconciles',
  'mapAreaReconciles',
  'waterCapacityReconciles',
  'foodCapacityReconciles',
  'settlementCapacityReconciles',
  'brokenReferenceIds'
]) {
  assert.deepEqual(recalculated[field], baseFixture.derived[field], `Recalculated derived field ${field} differs from the valid fixture.`);
}
const applied = normalize(domain.applyDerived(baseFixture));
assert.deepEqual(baseFixture, validBefore, 'Applying derived values mutated the source profile.');
assert.deepEqual(applied.derived, recalculated);

for (const testCase of caseCatalog.cases) {
  const profile = normalize(baseFixture);
  const mutations = testCase.mutations || [testCase.mutation];
  mutations.filter(Boolean).forEach(mutation => applyMutation(profile, mutation));
  const diagnostics = normalize(domain.validate(profile));
  for (const expected of testCase.expectedDiagnostics) {
    const match = diagnostics.find(item => (
      item.severity === expected.severity &&
      item.code === expected.code &&
      item.path === expected.path
    ));
    assert.ok(match, `${testCase.id} did not produce ${expected.severity} ${expected.code} at ${expected.path}. Actual diagnostics: ${JSON.stringify(diagnostics)}`);
  }

  const derived = normalize(domain.recalculateDerived(profile));
  const brokenExpected = diagnostics.filter(item => item.code.startsWith('broken-') && item.referenceId).map(item => item.referenceId);
  brokenExpected.forEach(id => assert.ok(derived.brokenReferenceIds.includes(id), `${testCase.id} omitted broken reference ${id} from recalculated derived data.`));
  if (diagnostics.some(item => item.code === 'composition-total-invalid')) assert.equal(derived.compositionReconciles, false);
  if (diagnostics.some(item => item.code === 'map-area-mismatch')) assert.equal(derived.mapAreaReconciles, false);
  if (diagnostics.some(item => item.code === 'reservoir-over-capacity')) assert.equal(derived.waterCapacityReconciles, false);
  if (diagnostics.some(item => item.code === 'settlement-capacity-mismatch')) assert.equal(derived.settlementCapacityReconciles, false);
}

for (const marker of [
  'duplicate-entity-id',
  'broken-cell-reference',
  'broken-site-reference',
  'broken-landing-zone-reference',
  'broken-route-node-reference',
  'composition-total-invalid',
  'map-area-mismatch',
  'reservoir-over-capacity',
  'settlement-capacity-mismatch',
  'resource-overextraction',
  'fracture-pressure-increased',
  'timeline-segment-overlap',
  'timeline-range-invalid',
  'visibility-classification-conflict',
  'gm-secret-leaked-to-player-output'
]) {
  assert.ok(domainSource.includes(marker), `Island v3 domain source is missing diagnostic marker ${marker}.`);
}
assert.equal(indexSource.includes('kaysender-island-v3-domain.js'), false, 'Island v3 domain engine was loaded before P1 activation.');
assert.equal(indexSource.includes('kaysender-island-v3-transformers.js'), false, 'Island v3 transformer was loaded before P1 activation.');
assert.equal(domainSource.includes('KaysenderEditorMigrations.register'), false, 'Island v3 domain engine registered a migration before activation.');

console.log('P1 Island v3 domain validation passed.');
console.log(`Verified the valid production fixture and ${caseCatalog.cases.length} semantic failure cases across stable identity, references, geometry, composition, water, settlement capacity, extraction pressure, timelines, visibility, derived reconciliation, and player-output secrecy.`);
