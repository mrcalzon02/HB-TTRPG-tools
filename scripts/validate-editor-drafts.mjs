import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

class FaultStorage {
  constructor() {
    this.values = new Map();
    this.failSet = false;
    this.failGet = false;
    this.failRemove = false;
  }

  getItem(key) {
    if (this.failGet) throw new Error('synthetic draft read failure');
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    if (this.failSet) throw new Error('synthetic draft quota failure');
    this.values.set(key, String(value));
  }

  removeItem(key) {
    if (this.failRemove) throw new Error('synthetic draft clear failure');
    this.values.delete(key);
  }
}

const root = process.cwd();
const normalize = value => JSON.parse(JSON.stringify(value));
const readJson = async relativePath => JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));
const localStorage = new FaultStorage();
const context = {
  window: { crypto: webcrypto, localStorage },
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
const envelope = normalize(kernel.createEnvelope(island, {
  profileType: 'floating-island-foundation-profile',
  editorId: 'floating-island-editor',
  moduleId: 'floating-island-generator'
}));

const successfulSave = normalize(kernel.saveDraft('floating-island-editor', envelope));
assert.equal(successfulSave.ok, true, 'Valid recovery draft did not save.');
const loaded = normalize(kernel.loadDraft('floating-island-editor'));
assert.equal(loaded.profileId, envelope.profileId);
assert.equal(loaded.revision, envelope.revision);

const protectedClear = normalize(kernel.clearDraft('floating-island-editor'));
assert.equal(protectedClear.ok, false, 'Recovery draft cleared without explicit confirmation.');
assert.ok(kernel.loadDraft('floating-island-editor'), 'Protected clear removed the recovery draft.');

const invalidEnvelope = normalize(envelope);
invalidEnvelope.profileSchemaVersion = '9.0.0';
const invalidSave = normalize(kernel.saveDraft('floating-island-editor', invalidEnvelope));
assert.equal(invalidSave.ok, false, 'Invalid future-schema envelope was saved as a recovery draft.');
assert.ok(invalidSave.diagnostics.some(item => item.code === 'profile-schema-future'));

localStorage.failSet = true;
const failedSave = normalize(kernel.saveDraft('floating-island-editor', envelope));
assert.equal(failedSave.ok, false, 'Storage quota failure escaped as a successful draft save.');
assert.match(failedSave.message, /synthetic draft quota failure/);
localStorage.failSet = false;

localStorage.failGet = true;
assert.equal(kernel.loadDraft('floating-island-editor'), null, 'Draft read failure did not return a safe null result.');
localStorage.failGet = false;

localStorage.failRemove = true;
const failedClear = normalize(kernel.clearDraft('floating-island-editor', true));
assert.equal(failedClear.ok, false, 'Draft clear failure escaped as a successful clear.');
assert.match(failedClear.message, /synthetic draft clear failure/);
assert.ok(kernel.loadDraft('floating-island-editor'), 'Failed clear removed the existing recovery draft.');
localStorage.failRemove = false;

const successfulClear = normalize(kernel.clearDraft('floating-island-editor', true));
assert.equal(successfulClear.ok, true, 'Explicit recovery draft clear failed after storage recovered.');
assert.equal(kernel.loadDraft('floating-island-editor'), null);

console.log('Editor recovery draft validation passed.');
console.log('Verified valid save/load, explicit-only clearing, invalid-envelope rejection, quota failure handling, read failure handling, clear failure handling, and successful recovery after storage errors.');
