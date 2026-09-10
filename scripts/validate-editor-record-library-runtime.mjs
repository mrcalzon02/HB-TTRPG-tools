import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root = process.cwd();
const kernelSource = await fs.readFile(path.join(root, 'kaysender-editor-kernel.js'), 'utf8');
const repositorySource = await fs.readFile(path.join(root, 'kaysender-editor-repository.js'), 'utf8');
const recordLibrarySource = await fs.readFile(path.join(root, 'kaysender-editor-record-library.js'), 'utf8');
const fail = message => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };

class FakeElement {
  constructor(tagName = 'div', id = '') {
    this.tagName = String(tagName).toUpperCase();
    this.id = id;
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.listeners = new Map();
    this.value = '';
    this.textContent = '';
    this.className = '';
    this.disabled = false;
    this.replaceCount = 0;
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  replaceChildren(...children) {
    this.children = children;
    this.replaceCount += 1;
  }

  setAttribute(name, value) {
    this.attributes[String(name)] = String(value);
  }

  addEventListener(type, listener) {
    this.listeners.set(String(type), listener);
  }

  querySelector(selector) {
    return selector.startsWith('#') ? document.getElementById(selector.slice(1)) : null;
  }

  insertAdjacentElement(_position, element) {
    return element;
  }
}

const elements = new Map();
const register = (id, tagName = 'div') => {
  const element = new FakeElement(tagName, id);
  elements.set(id, element);
  return element;
};

const document = {
  readyState: 'complete',
  head: new FakeElement('head', 'head'),
  body: new FakeElement('body', 'body'),
  createElement: tagName => new FakeElement(tagName),
  getElementById: id => elements.get(String(id)) || null,
  querySelector: () => null,
  addEventListener: () => {}
};

register('mainline-editor-record-library-controls', 'section');
const librarySelect = register('mainline-editor-record-library', 'select');
const searchInput = register('mainline-editor-record-search', 'input');
const lineageFilter = register('mainline-editor-lineage-filter', 'select');
lineageFilter.value = 'all';
const results = register('mainline-editor-record-results', 'span');
register('mainline-editor-library-status', 'p');
register('mainline-editor-identity-id', 'dd');
register('mainline-editor-identity-type', 'dd');
register('mainline-editor-identity-schema', 'dd');
register('mainline-editor-identity-revision', 'dd');
register('mainline-editor-identity-generation', 'dd');
register('mainline-editor-identity-root', 'dd');
register('mainline-editor-identity-parent', 'dd');
register('mainline-editor-identity-lineage', 'dd');
register('mainline-editor-identity-storage', 'dd');
const saveButton = register('mainline-editor-record-save', 'button');
register('mainline-editor-record-clone-save', 'button');
const openButton = register('mainline-editor-record-open', 'button');
const deleteButton = register('mainline-editor-record-delete', 'button');
register('mainline-editor-record-repair', 'button');

const storageValues = new Map();
const localStorage = {
  get length() { return storageValues.size; },
  getItem: key => storageValues.has(String(key)) ? storageValues.get(String(key)) : null,
  setItem: (key, value) => storageValues.set(String(key), String(value)),
  removeItem: key => storageValues.delete(String(key)),
  key: index => Array.from(storageValues.keys())[index] ?? null,
  clear: () => storageValues.clear()
};

const crypto = {
  randomUUID: (() => {
    let counter = 1;
    return () => `00000000-0000-4000-8000-${String(counter++).padStart(12, '0')}`;
  })()
};

const intervalCallbacks = [];
const windowListeners = new Map();
let activeEnvelope = null;
const adapter = { id: 'roundtrip-test', moduleId: 'roundtrip-test', profileType: 'settlement-profile' };
const production = {
  getActiveEditorId: () => 'roundtrip-test',
  getAdapter: editorId => editorId === 'roundtrip-test' ? adapter : null,
  getActiveEnvelope: () => activeEnvelope
};

const context = {
  console,
  document,
  localStorage,
  crypto,
  setTimeout,
  clearTimeout,
  confirm: () => true,
  MutationObserver: class { observe() {} },
  addEventListener: (type, listener) => windowListeners.set(String(type), listener),
  setInterval: listener => {
    intervalCallbacks.push(listener);
    return intervalCallbacks.length;
  },
  KaysenderEditorLifecycle: {
    checkpoint: () => 0,
    markCleanIfUnchanged: () => ({ ok: true }),
    confirmLeave: () => true
  },
  KaysenderMainlineEditorProduction: production,
  KaysenderEditorParentLibrary: {}
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
new vm.Script(kernelSource, { filename: 'kaysender-editor-kernel.js' }).runInContext(context);
new vm.Script(repositorySource, { filename: 'kaysender-editor-repository.js' }).runInContext(context);

const Kernel = context.KaysenderEditorKernel;
const Repository = context.KaysenderEditorRepository;
assert(Kernel, 'Shared editor kernel did not initialize in the library runtime harness.');
assert(Repository, 'Saved record repository did not initialize in the library runtime harness.');

const rootData = {
  profileType: 'settlement-profile',
  schemaVersion: '1.0.0',
  name: 'Library Runtime Root',
  settlementType: 'village',
  populationScale: 'small',
  governmentType: 'council',
  derivedScores: { stability: 10 }
};
const g0 = Kernel.createEnvelope(rootData, { editorId: adapter.id, moduleId: adapter.moduleId });
const revisedData = JSON.parse(JSON.stringify(g0.data));
revisedData.populationScale = 'medium';
const g0r2 = Kernel.createEnvelope(revisedData, { existingEnvelope: g0, editorId: adapter.id, moduleId: adapter.moduleId });
const g1 = Kernel.cloneEnvelope(g0r2, { editorId: adapter.id, moduleId: adapter.moduleId, name: 'Library Runtime Child' });
const g2 = Kernel.cloneEnvelope(g1, { editorId: adapter.id, moduleId: adapter.moduleId, name: 'Library Runtime Grandchild' });
assert(Repository.save(g0).ok, 'Could not save the root fixture.');
assert(Repository.save(g0r2).ok, 'Could not save the revised root fixture.');
assert(Repository.save(g1).ok, 'Could not save the generation 1 fixture.');
assert(Repository.save(g2).ok, 'Could not save the generation 2 fixture.');
activeEnvelope = g2;

new vm.Script(recordLibrarySource, { filename: 'kaysender-editor-record-library.js' }).runInContext(context);
const Library = context.KaysenderEditorRecordLibrary;
assert(Library, 'Saved Record Library did not initialize in the UI runtime harness.');
assert(intervalCallbacks.length === 1, 'Saved Record Library did not install exactly one lightweight context poller.');

Library.refresh();
assert(librarySelect.children.length === 4, 'Unfiltered library did not render one placeholder plus three stable saved records.');
assert(librarySelect.value === g2.profileId, 'Library refresh did not preserve/select the active saved record.');
assert(librarySelect.children.some(option => option.value === g2.profileId && option.textContent.includes('G2') && option.textContent.includes('r1')), 'Generation 2 option does not present generation and revision together.');
assert(results.textContent === '3 saved records available.', 'Unfiltered result summary does not report the complete saved-record count.');
assert(document.getElementById('mainline-editor-identity-generation').textContent === 'G2', 'Active identity panel did not render generation 2.');
assert(document.getElementById('mainline-editor-identity-root').textContent.includes('Library Runtime Root'), 'Active identity panel did not render the lineage root.');
assert(document.getElementById('mainline-editor-identity-parent').textContent.includes('Library Runtime Child'), 'Active identity panel did not render the immediate parent.');
assert(document.getElementById('mainline-editor-identity-storage').dataset.saved === 'true', 'Active saved record was not identified as saved.');
assert(saveButton.textContent === 'Update Existing Record', 'Saved active record did not expose the update action.');
assert(openButton.disabled === false && deleteButton.disabled === false, 'Open/delete actions were not enabled for the active selected record.');

searchInput.value = 'G2';
Library.refresh();
assert(librarySelect.children.length === 2 && librarySelect.children[1].value === g2.profileId, 'Generation search did not narrow the library to the generation 2 record.');
assert(librarySelect.value === g2.profileId, 'Generation search lost the active matching selection.');
assert(results.textContent.startsWith('1 of 3 saved records shown.'), 'Filtered result summary did not report visible and total counts.');

searchInput.value = 'no-such-record';
Library.refresh();
assert(librarySelect.children.length === 1, 'Empty search result rendered unexpected record options.');
assert(librarySelect.children[0].textContent === 'No saved records match the current search or filter', 'Empty search state is not explicit and findable.');
assert(librarySelect.disabled === true, 'Library selector remained enabled with no matching records.');

searchInput.value = '';
lineageFilter.value = 'complete';
Library.refresh();
assert(librarySelect.children.length === 4, 'Complete-lineage filter did not retain the complete G0/G1/G2 chain.');
lineageFilter.value = 'incomplete';
Library.refresh();
assert(librarySelect.children.length === 1 && librarySelect.disabled === true, 'Incomplete-lineage filter did not produce a clean empty state when no incomplete records exist.');

lineageFilter.value = 'all';
const index = JSON.parse(localStorage.getItem(Repository.indexKey));
const staleG2 = index.find(item => item.profileId === g2.profileId);
assert(staleG2, 'Could not locate generation 2 metadata for stale-index UI fixture.');
delete staleG2.generation;
localStorage.setItem(Repository.indexKey, JSON.stringify(index));
searchInput.value = 'G2';
Library.refresh();
assert(results.dataset.health === 'repaired', 'Library did not expose successful automatic index repair in its result state.');
assert(results.textContent.includes('Index rebuilt from canonical records.'), 'Library did not explain automatic index repair to the user.');
assert(librarySelect.children.length === 2 && librarySelect.children[1].value === g2.profileId, 'Automatic index repair did not restore generation-based findability in the same refresh.');

searchInput.value = '';
Library.refresh();
const stableReplaceCount = librarySelect.replaceCount;
intervalCallbacks[0]();
assert(librarySelect.replaceCount === stableReplaceCount, 'Lightweight context poller rebuilt the library DOM even though active context was unchanged.');
const changedData = JSON.parse(JSON.stringify(g2.data));
changedData.populationScale = 'large';
activeEnvelope = Kernel.createEnvelope(changedData, { existingEnvelope: g2, editorId: adapter.id, moduleId: adapter.moduleId });
intervalCallbacks[0]();
assert(librarySelect.replaceCount === stableReplaceCount + 1, 'Lightweight context poller failed to refresh after active record revision changed.');
assert(document.getElementById('mainline-editor-identity-revision').textContent === String(activeEnvelope.revision), 'Context-change refresh did not update the visible revision.');

console.log('Saved Record Library UI runtime validation passed.');
console.log('Verified rendered G0/G1/G2 findability, active selection, empty/filter states, automatic stale-index repair visibility, and no-op polling until active context changes.');
