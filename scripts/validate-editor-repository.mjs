import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

class MemoryStorage {
  constructor() {
    this.values = new Map();
    this.failNextIndexWrite = false;
  }

  get length() {
    return this.values.size;
  }

  key(index) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    if (this.failNextIndexWrite && key === 'hb-ttrpg-tools:kaysender-editor-record-index') {
      this.failNextIndexWrite = false;
      throw new Error('synthetic index write failure');
    }
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

const root = process.cwd();
const normalize = value => JSON.parse(JSON.stringify(value));
const readJson = async relativePath => JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));
const localStorage = new MemoryStorage();
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
  'kaysender-editor-kernel-adapters.js',
  'kaysender-editor-repository.js'
]) {
  const source = await fs.readFile(path.join(root, relativePath), 'utf8');
  vm.runInContext(source, context, { filename: relativePath });
}

const kernel = context.window.KaysenderEditorKernel;
const repository = context.window.KaysenderEditorRepository;
assert.ok(kernel, 'Adapted editor kernel was not exposed.');
assert.ok(repository, 'Persistent editor repository was not exposed.');

const island = await readJson('data/kaysender/editors/fixtures/island-current-nested.json');
const revisionOne = normalize(kernel.createEnvelope(island, {
  profileType: 'floating-island-foundation-profile',
  editorId: 'floating-island-editor',
  moduleId: 'floating-island-generator'
}));

const firstSave = normalize(repository.save(revisionOne));
assert.equal(firstSave.ok, true, 'Initial record save failed.');
assert.equal(firstSave.record.revision, 1);

const idempotentSave = normalize(repository.save(revisionOne));
assert.equal(idempotentSave.ok, true, 'Idempotent save of the current revision failed.');
assert.equal(idempotentSave.unchanged, true);

const revisionTwo = normalize(kernel.createEnvelope({ ...island, name: 'Aster Reach Revision Two' }, {
  existingEnvelope: revisionOne,
  profileType: 'floating-island-foundation-profile',
  editorId: 'floating-island-editor',
  moduleId: 'floating-island-generator'
}));
assert.equal(revisionTwo.revision, 2);
assert.equal(normalize(repository.save(revisionTwo)).ok, true, 'Revision two save failed.');

const staleSave = normalize(repository.save(revisionOne));
assert.equal(staleSave.ok, false, 'Stale revision one overwrote revision two.');
assert.equal(staleSave.conflict, true);
assert.equal(staleSave.savedRevision, 2);
assert.equal(staleSave.incomingRevision, 1);

const sameRevisionFork = normalize(revisionTwo);
sameRevisionFork.data.name = 'Conflicting Revision Two';
sameRevisionFork.name = 'Conflicting Revision Two';
const forkSave = normalize(repository.save(sameRevisionFork));
assert.equal(forkSave.ok, false, 'Different content at the same revision was silently accepted.');
assert.equal(forkSave.conflict, true);

const loadedAfterConflicts = normalize(repository.load(revisionTwo.profileId));
assert.equal(loadedAfterConflicts.ok, true);
assert.equal(loadedAfterConflicts.envelope.revision, 2);
assert.equal(loadedAfterConflicts.envelope.data.name, revisionTwo.data.name);

const clone = normalize(kernel.cloneEnvelope(revisionTwo, {
  editorId: 'floating-island-editor',
  moduleId: 'floating-island-generator'
}));
localStorage.failNextIndexWrite = true;
const failedCloneSave = normalize(repository.save(clone));
assert.equal(failedCloneSave.ok, false, 'Synthetic index failure did not fail the save.');
assert.equal(
  localStorage.getItem(`${repository.recordPrefix}${clone.profileId}`),
  null,
  'Failed new-record save left an orphaned record after rollback.'
);
assert.equal(repository.list().some(item => item.profileId === clone.profileId), false);

localStorage.removeItem(`${repository.recordPrefix}${revisionTwo.profileId}`);
assert.equal(repository.list().some(item => item.profileId === revisionTwo.profileId), false, 'Listing retained a missing underlying record.');

assert.equal(normalize(repository.save(revisionTwo)).ok, true, 'Record could not be restored after simulated external deletion.');
localStorage.setItem(`${repository.recordPrefix}malformed-deadbeef`, '{not valid json');
const repaired = normalize(repository.repairIndex());
assert.equal(repaired.ok, true, 'Record index repair failed.');
assert.equal(repaired.records.some(item => item.profileId === revisionTwo.profileId), true);
assert.equal(repaired.rejected.includes('malformed-deadbeef'), true, 'Malformed record was not reported as rejected.');

const protectedDelete = normalize(repository.remove(revisionTwo.profileId));
assert.equal(protectedDelete.ok, false, 'Record deletion succeeded without explicit confirmation.');
const confirmedDelete = normalize(repository.remove(revisionTwo.profileId, true));
assert.equal(confirmedDelete.ok, true, 'Explicit record deletion failed.');
assert.equal(repository.list().some(item => item.profileId === revisionTwo.profileId), false);

console.log('Editor repository validation passed.');
console.log('Verified idempotent saves, stale revision rejection, same-revision conflict rejection, transactional rollback, live listings, malformed-record repair, and explicit deletion.');
