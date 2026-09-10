import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root = process.cwd();
const read = relativePath => fs.readFile(path.join(root, relativePath), 'utf8');
const fail = message => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };

class FakeElement {
  constructor(id = '', tagName = 'div') {
    this.id = id;
    this.tagName = tagName.toUpperCase();
    this.value = '';
    this.textContent = '';
    this.title = '';
    this.disabled = false;
    this.dataset = {};
    this.children = [];
  }
  replaceChildren(...children) { this.children = [...children]; }
  appendChild(child) { this.children.push(child); return child; }
  addEventListener() {}
}

class FakeDocument {
  constructor() {
    this.readyState = 'loading';
    this.elements = new Map();
  }
  add(id, tagName = 'div') {
    const element = new FakeElement(id, tagName);
    this.elements.set(id, element);
    return element;
  }
  getElementById(id) { return this.elements.get(id) || null; }
  createElement(tagName) { return new FakeElement('', tagName); }
  addEventListener() {}
}

const storageValues = new Map();
const localStorage = {
  get length() { return storageValues.size; },
  getItem: key => storageValues.has(String(key)) ? storageValues.get(String(key)) : null,
  setItem: (key, value) => storageValues.set(String(key), String(value)),
  removeItem: key => storageValues.delete(String(key)),
  key: index => Array.from(storageValues.keys())[index] ?? null,
  clear: () => storageValues.clear()
};

const document = new FakeDocument();
for (const [id, tag] of [
  ['mainline-editor-record-library', 'select'],
  ['mainline-editor-record-search', 'input'],
  ['mainline-editor-lineage-filter', 'select'],
  ['mainline-editor-record-results', 'span'],
  ['mainline-editor-identity-id', 'dd'],
  ['mainline-editor-identity-type', 'dd'],
  ['mainline-editor-identity-schema', 'dd'],
  ['mainline-editor-identity-revision', 'dd'],
  ['mainline-editor-identity-generation', 'dd'],
  ['mainline-editor-identity-root', 'dd'],
  ['mainline-editor-identity-parent', 'dd'],
  ['mainline-editor-identity-lineage', 'dd'],
  ['mainline-editor-identity-storage', 'dd'],
  ['mainline-editor-record-save', 'button'],
  ['mainline-editor-record-clone-save', 'button'],
  ['mainline-editor-record-open', 'button'],
  ['mainline-editor-record-delete', 'button']
]) document.add(id, tag);
document.getElementById('mainline-editor-lineage-filter').value = 'all';

const crypto = {
  randomUUID: (() => {
    let counter = 1;
    return () => `00000000-0000-4000-8000-${String(counter++).padStart(12, '0')}`;
  })()
};

const context = {
  console,
  localStorage,
  crypto,
  document,
  setTimeout,
  clearTimeout,
  setInterval: () => 0,
  clearInterval: () => {},
  addEventListener: () => {}
};
context.window = context;
context.globalThis = context;
vm.createContext(context);

const kernelSource = await read('kaysender-editor-kernel.js');
const repositorySource = await read('kaysender-editor-repository.js');
const librarySource = await read('kaysender-editor-record-library.js');
new vm.Script(kernelSource, { filename: 'kaysender-editor-kernel.js' }).runInContext(context);
new vm.Script(repositorySource, { filename: 'kaysender-editor-repository.js' }).runInContext(context);

const Kernel = context.KaysenderEditorKernel;
const Repository = context.KaysenderEditorRepository;
assert(Kernel && Repository, 'Kernel or repository failed to initialize.');

const base = {
  profileType: 'settlement-profile',
  schemaVersion: '1.0.0',
  name: 'Harbor Root',
  settlementType: 'port',
  populationScale: 'small',
  governmentType: 'council',
  derivedScores: { stability: 12 }
};
const g0 = Kernel.createEnvelope(base, { editorId: 'settlement-editor', moduleId: 'settlement-generator' });
const g1 = Kernel.cloneEnvelope(g0, { editorId: 'settlement-editor', moduleId: 'settlement-generator', name: 'Harbor Child' });
const g2 = Kernel.cloneEnvelope(g1, { editorId: 'settlement-editor', moduleId: 'settlement-generator', name: 'Harbor Grandchild' });
const legacy = Kernel.createEnvelope({ ...base, name: 'Legacy Harbor' }, { editorId: 'settlement-editor', moduleId: 'settlement-generator' });
legacy.provenance.generation = null;
legacy.provenance.lineage = [];
legacy.provenance.parent = null;
legacy.provenance.lineageComplete = false;
legacy.provenance.clonedFromProfileId = 'legacy-parent-unknown';

for (const envelope of [g0, g1, g2, legacy]) {
  const saved = Repository.save(envelope);
  assert(saved.ok, `Repository failed to save ${envelope.name}: ${saved.message}`);
}

let activeEnvelope = g2;
context.KaysenderEditorLifecycle = {
  checkpoint: () => 0,
  markCleanIfUnchanged: () => ({ ok: true }),
  confirmLeave: () => true
};
context.KaysenderMainlineEditorProduction = {
  getActiveEditorId: () => 'settlement-editor',
  getAdapter: () => ({ id: 'settlement-editor', profileType: 'settlement-profile', moduleId: 'settlement-generator' }),
  getActiveEnvelope: () => JSON.parse(JSON.stringify(activeEnvelope))
};

new vm.Script(librarySource, { filename: 'kaysender-editor-record-library.js' }).runInContext(context);
const Library = context.KaysenderEditorRecordLibrary;
assert(Library, 'Saved Record Library failed to initialize in the isolated UI runtime.');

const select = document.getElementById('mainline-editor-record-library');
const search = document.getElementById('mainline-editor-record-search');
const lineageFilter = document.getElementById('mainline-editor-lineage-filter');
const results = document.getElementById('mainline-editor-record-results');

Library.refresh();
assert(select.children.length === 5, 'Unfiltered library should render placeholder plus four records.');
assert(select.value === g2.profileId, 'Active saved record was not selected after refresh.');
assert(select.children.some(option => option.textContent.includes('Harbor Grandchild · G2 · r1')), 'Generation and revision are not visible together in the saved-record label.');
assert(document.getElementById('mainline-editor-identity-generation').textContent === 'G2', 'Active identity panel did not expose generation 2.');
assert(document.getElementById('mainline-editor-identity-root').textContent.includes('Harbor Root'), 'Active identity panel did not expose the root ancestor.');
assert(document.getElementById('mainline-editor-identity-parent').textContent.includes('Harbor Child'), 'Active identity panel did not expose the immediate parent.');
assert(document.getElementById('mainline-editor-identity-lineage').textContent === 'Complete', 'Active identity panel did not expose complete lineage state.');

search.value = 'G2';
Library.refresh();
assert(select.children.length === 2, 'Generation search should render placeholder plus one G2 record.');
assert(select.children[1].value === g2.profileId, 'Generation search did not find the G2 record.');
assert(results.textContent.startsWith('1 of 4 saved records shown.'), 'Filtered result summary is incorrect.');

search.value = g1.profileId;
Library.refresh();
assert(select.children.some(option => option.value === g2.profileId), 'Parent-ID search did not find the descendant record.');

search.value = g0.profileId;
Library.refresh();
assert(select.children.some(option => option.value === g2.profileId), 'Root-ID search did not find the descendant record.');

search.value = '';
lineageFilter.value = 'incomplete';
Library.refresh();
assert(select.children.length === 2, 'Incomplete-lineage filter should render exactly one matching record plus placeholder.');
assert(select.children[1].value === legacy.profileId && select.children[1].textContent.includes('lineage incomplete'), 'Incomplete legacy lineage is not visible in filtered results.');

lineageFilter.value = 'complete';
Library.refresh();
assert(select.children.length === 4, 'Complete-lineage filter should exclude the legacy-incomplete record.');
assert(!select.children.some(option => option.value === legacy.profileId), 'Complete-lineage filter leaked an incomplete record.');

search.value = 'no-such-record';
Library.refresh();
assert(select.children.length === 1, 'Empty search result should retain only the placeholder option.');
assert(select.children[0].textContent === 'No saved records match the current search or filter', 'Empty-result state does not explain that filters excluded existing records.');
assert(select.disabled === true, 'Record selector should be disabled when no records match.');

search.value = '';
lineageFilter.value = 'all';
Library.refresh();
assert(select.disabled === false, 'Clearing filters did not restore record selection availability.');
assert(select.value === g2.profileId, 'Clearing filters did not restore the active saved record selection.');

activeEnvelope = legacy;
Library.refresh();
assert(document.getElementById('mainline-editor-identity-generation').textContent === 'Unknown', 'Legacy-incomplete active record should not fabricate a generation.');
assert(document.getElementById('mainline-editor-identity-lineage').textContent === 'Incomplete legacy lineage', 'Legacy-incomplete active record should expose lineage incompleteness.');

console.log('Saved Record Library UI runtime validation passed.');
console.log('Verified rendered generation/revision labels, active root and parent identity, generation/parent/root search, lineage filtering, empty-result messaging, filter recovery, and legacy-incomplete provenance visibility.');
