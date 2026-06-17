import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root = process.cwd();
const normalize = value => JSON.parse(JSON.stringify(value));
const readJson = async relativePath => JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));
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
assert.ok(kernel, 'Adapted editor kernel was not exposed.');

const island = await readJson('data/kaysender/editors/fixtures/island-current-nested.json');
const parentResult = normalize(kernel.normalizeImportedRecord(island, {
  expectedTypes: ['floating-island-foundation-profile']
}));
assert.equal(parentResult.ok, true, 'Current Island fixture was rejected.');

const reference = normalize(kernel.inheritanceReference(parentResult.envelope, 'parent-island'));
assert.equal(reference.policy, 'pinned-revision');
assert.equal(reference.profileId, parentResult.envelope.profileId);
assert.equal(reference.profileType, 'floating-island-foundation-profile');
assert.equal(reference.revision, parentResult.envelope.revision);
assert.equal(reference.sourceUpdatedAt, parentResult.envelope.updatedAt);

const settlement = {
  name: 'Inheritance Test Skyport',
  profileType: 'settlement-profile',
  settlementType: 'minor skyport',
  populationScale: 'village',
  governmentType: 'council',
  derivedScores: {}
};
const child = normalize(kernel.createEnvelope(settlement, {
  profileType: 'settlement-profile',
  editorId: 'settlement-editor',
  moduleId: 'settlement-generator',
  inheritance: [reference]
}));
assert.equal(child.inheritance[0].policy, 'pinned-revision');
assert.equal(child.inheritance[0].revision, reference.revision);

const validDiagnostics = normalize(kernel.validateEnvelope(child, ['settlement-profile']));
assert.equal(
  validDiagnostics.some(item => item.severity === 'error' && item.code.startsWith('inheritance-')),
  false,
  'A valid pinned inheritance reference produced an error.'
);

const invalidPolicy = normalize(child);
invalidPolicy.inheritance[0].policy = 'follow-latest';
const invalidPolicyDiagnostics = normalize(kernel.validateEnvelope(invalidPolicy, ['settlement-profile']));
assert.ok(invalidPolicyDiagnostics.some(item => item.code === 'inheritance-policy-invalid' && item.severity === 'error'));

const invalidRevision = normalize(child);
invalidRevision.inheritance[0].revision = 0;
const invalidRevisionDiagnostics = normalize(kernel.validateEnvelope(invalidRevision, ['settlement-profile']));
assert.ok(invalidRevisionDiagnostics.some(item => item.code === 'inheritance-revision-invalid' && item.severity === 'error'));

const legacyReferenceEnvelope = normalize(child);
delete legacyReferenceEnvelope.inheritance[0].policy;
const normalizedLegacy = normalize(kernel.normalizeImportedRecord(legacyReferenceEnvelope, {
  expectedTypes: ['settlement-profile']
}));
assert.equal(normalizedLegacy.ok, true, 'A legacy inheritance reference was not normalized.');
assert.equal(normalizedLegacy.envelope.inheritance[0].policy, 'pinned-revision');
assert.ok(normalizedLegacy.envelope.provenance.migrationLog.some(item => item.code === 'inheritance-policy-normalized'));

console.log('Editor inheritance validation passed.');
console.log('Verified pinned references, source revisions, invalid policy rejection, invalid revision rejection, and legacy reference normalization.');
