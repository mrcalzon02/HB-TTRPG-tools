import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root = process.cwd();
const readJson = async relativePath => JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));
const normalize = value => JSON.parse(JSON.stringify(value));
const context = {
  window: { crypto: webcrypto },
  console,
  crypto: webcrypto,
  Uint8Array,
  Date,
  Math,
  JSON,
  setTimeout,
  clearTimeout
};
vm.createContext(context);

for (const relativePath of [
  'kaysender-editor-kernel.js',
  'kaysender-editor-field-mapping.js',
  'kaysender-editor-adapter-registry.js',
  'kaysender-editor-builtins.js',
  'kaysender-editor-migrations.js',
  'kaysender-editor-kernel-adapters.js'
]) {
  const source = await fs.readFile(path.join(root, relativePath), 'utf8');
  vm.runInContext(source, context, { filename: relativePath });
}

const kernel = context.window.KaysenderEditorKernel;
const registry = context.window.KaysenderEditorAdapters;
assert.ok(kernel, 'Adapted editor kernel was not exposed.');
assert.ok(registry, 'Editor adapter registry was not exposed.');

const adapters = normalize(registry.list().map(adapter => ({
  id: adapter.id,
  profileType: adapter.profileType,
  currentSchemaVersion: adapter.currentSchemaVersion
})));
assert.deepEqual(adapters, [
  {
    id: 'floating-island-editor',
    profileType: 'floating-island-foundation-profile',
    currentSchemaVersion: '2.0.0'
  },
  {
    id: 'settlement-editor',
    profileType: 'settlement-profile',
    currentSchemaVersion: '1.0.0'
  },
  {
    id: 'airship-editor',
    profileType: 'airship-profile',
    currentSchemaVersion: '1.0.0'
  }
]);

const legacyIsland = await readJson('data/kaysender/editors/fixtures/island-legacy-flat.json');
const currentIsland = await readJson('data/kaysender/editors/fixtures/island-current-nested.json');

const migratedLegacy = normalize(kernel.normalizeImportedRecord(legacyIsland, {
  expectedTypes: ['floating-island-foundation-profile'],
  editorId: 'floating-island-editor',
  moduleId: 'floating-island-generator'
}));
assert.equal(migratedLegacy.ok, true, 'Legacy Island did not migrate through the shared import path.');
assert.equal(migratedLegacy.envelope.profileSchemaVersion, '2.0.0');
assert.deepEqual(migratedLegacy.migrations, ['island-legacy-flat-to-2.0.0']);
assert.ok(migratedLegacy.diagnostics.some(item => item.code === 'profile-schema-migrated' && item.severity === 'info'));
assert.equal(migratedLegacy.envelope.data.geometry.lengthKm, legacyIsland.lengthKm);
assert.equal(migratedLegacy.envelope.data.hydrology.profile, legacyIsland.waterProfile);

const acceptedCurrent = normalize(kernel.normalizeImportedRecord(currentIsland, {
  expectedTypes: ['floating-island-foundation-profile']
}));
assert.equal(acceptedCurrent.ok, true, 'Current Island 2.0.0 fixture was rejected.');
assert.equal(acceptedCurrent.envelope.profileSchemaVersion, '2.0.0');
assert.deepEqual(acceptedCurrent.migrations, []);

const outdatedNested = {
  ...currentIsland,
  schemaVersion: '1.0.0',
  name: 'Outdated Nested Island'
};
const rejectedOutdated = normalize(kernel.normalizeImportedRecord(outdatedNested, {
  expectedTypes: ['floating-island-foundation-profile']
}));
assert.equal(rejectedOutdated.ok, false, 'Outdated nested Island schema was silently accepted.');
assert.ok(rejectedOutdated.diagnostics.some(item => item.code === 'profile-schema-outdated' && item.severity === 'error'));

const futureIsland = {
  ...currentIsland,
  schemaVersion: '9.0.0',
  name: 'Future Island'
};
const rejectedFuture = normalize(kernel.normalizeImportedRecord(futureIsland, {
  expectedTypes: ['floating-island-foundation-profile']
}));
assert.equal(rejectedFuture.ok, false, 'Future Island schema was silently accepted.');
assert.ok(rejectedFuture.diagnostics.some(item => item.code === 'profile-schema-future' && item.severity === 'error'));

const locallyCreatedFutureEnvelope = normalize(kernel.createEnvelope(futureIsland, {
  profileType: 'floating-island-foundation-profile',
  editorId: 'floating-island-editor',
  moduleId: 'floating-island-generator'
}));
const localFutureDiagnostics = normalize(kernel.validateEnvelope(
  locallyCreatedFutureEnvelope,
  ['floating-island-foundation-profile']
));
assert.ok(
  localFutureDiagnostics.some(item => item.code === 'profile-schema-future' && item.severity === 'error'),
  'Locally created future-schema envelope bypassed shared compatibility validation.'
);

const settlement = {
  name: 'Test Skyport',
  profileType: 'settlement-profile',
  settlementType: 'minor skyport',
  populationScale: 'village',
  governmentType: 'council',
  derivedScores: {}
};
const acceptedSettlement = normalize(kernel.normalizeImportedRecord(settlement, {
  expectedTypes: ['settlement-profile']
}));
assert.equal(acceptedSettlement.ok, true, 'Unversioned Settlement profile did not normalize to adapter schema 1.0.0.');
assert.equal(acceptedSettlement.envelope.profileSchemaVersion, '1.0.0');

const wrongEditor = normalize(kernel.normalizeImportedRecord(currentIsland, {
  expectedTypes: ['airship-profile']
}));
assert.equal(wrongEditor.ok, false, 'Wrong-profile import was silently accepted.');
assert.ok(wrongEditor.diagnostics.some(item => item.code === 'profile-type-mismatch'));

console.log('Editor adapter integration validation passed.');
console.log('Verified adapter schemas, migrations, current/outdated/future imports, local-envelope schema validation, default 1.0.0 wrapping, and wrong-profile diagnostics.');
