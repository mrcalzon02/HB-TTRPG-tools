import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root = process.cwd();
const bridgeSource = await fs.readFile(path.join(root, 'kaysender-island-v3-adapter-panels-bridge.js'), 'utf8');
const indexSource = await fs.readFile(path.join(root, 'index.html'), 'utf8');
const clone = value => JSON.parse(JSON.stringify(value));

class FakeElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.className = '';
    this.id = '';
    this.dataset = {};
    this.attributes = {};
    this.value = '';
    this.readOnly = false;
  }
  append(...nodes) { nodes.forEach(node => this.appendChild(node)); }
  appendChild(node) {
    if (node.parentNode) node.parentNode.children = node.parentNode.children.filter(item => item !== node);
    node.parentNode = this;
    this.children.push(node);
    return node;
  }
  insertBefore(node, reference) {
    if (node.parentNode) node.parentNode.children = node.parentNode.children.filter(item => item !== node);
    node.parentNode = this;
    const index = this.children.indexOf(reference);
    if (index < 0) this.children.push(node);
    else this.children.splice(index, 0, node);
    return node;
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  querySelector(selector) {
    const match = element => selector.startsWith('.')
      ? String(element.className || '').split(/\s+/).includes(selector.slice(1))
      : selector.startsWith('#') ? element.id === selector.slice(1) : false;
    const stack = [...this.children];
    while (stack.length) {
      const next = stack.shift();
      if (match(next)) return next;
      stack.unshift(...(next.children || []));
    }
    return null;
  }
  querySelectorAll() { return []; }
  contains(node) {
    let current = node;
    while (current) {
      if (current === this) return true;
      current = current.parentNode;
    }
    return false;
  }
  closest() { return null; }
  get previousElementSibling() {
    if (!this.parentNode) return null;
    const index = this.parentNode.children.indexOf(this);
    return index > 0 ? this.parentNode.children[index - 1] : null;
  }
}

class FakeProductionController {
  constructor(options = {}) {
    this.profile = clone(options.profile || {});
    this.root = options.root;
    this.replaceCount = 0;
  }
  getProfile() { return clone(this.profile); }
  replaceProfile(profile) { this.profile = clone(profile); this.replaceCount += 1; return this.getProfile(); }
}

function createSession(profile) {
  const workspace = new FakeElement('section');
  const ledgerHeading = new FakeElement('div');
  ledgerHeading.className = 'section-heading';
  const blockRoot = new FakeElement('div');
  blockRoot.className = 'island-v3-block-grid';
  const diagnosticCard = new FakeElement('article');
  diagnosticCard.className = 'island-v3-diagnostics';
  const diagnosticList = new FakeElement('ul');
  diagnosticCard.appendChild(diagnosticList);
  workspace.append(ledgerHeading, blockRoot, diagnosticCard);
  const classification = new FakeElement('textarea');
  const geometry = new FakeElement('textarea');
  return {
    panel: new FakeElement('section'),
    workspace,
    profile: clone(profile),
    blockEditors: new Map([['classification', classification], ['geometry', geometry]]),
    diagnosticList,
    controller: { getMap: () => ({ columns: 3, rows: 1, activeCellIds: ['cell-live'], cells: [{ id: 'cell-live', x: 0, y: 0 }] }) }
  };
}

const initialProfile = {
  schemaVersion: '3.0.0',
  profileType: 'floating-island-foundation-profile',
  name: 'Bridge Test',
  classification: { sizeClass: 'small isle' },
  geometry: { planAreaKm2: 1 },
  map: { columns: 1, rows: 1, activeCellIds: [], cells: [] },
  outputs: { wikiDraft: {}, downstreamExports: {} }
};
const sessionByPanel = new WeakMap();
const baseFactory = {
  LEGACY_FIELD_MAP: {},
  EDITOR_ID: 'floating-island-editor',
  toV3: profile => clone(profile),
  ensureSession(panel, profileInput = null) {
    let session = sessionByPanel.get(panel);
    if (!session) {
      session = createSession(profileInput || initialProfile);
      session.panel = panel;
      sessionByPanel.set(panel, session);
    } else if (profileInput) session.profile = clone(profileInput);
    return session;
  },
  replaceSessionProfile(session, profile) { session.profile = clone(profile); return session; },
  readProfile(panel) { return clone(sessionByPanel.get(panel).profile); },
  applyProfileToForm() { return ['applied']; },
  createDefinition() { return { id: 'floating-island-editor', readProfile: this.readProfile, applyProfileToForm: this.applyProfileToForm }; },
  activationBundle() { return { adapter: {}, migration: { id: 'migration' }, loadOrder: ['kaysender-island-v3-legacy-projection.js'] }; }
};

const document = {
  createElement: tag => new FakeElement(tag),
  createTextNode: text => ({ textContent: String(text), parentNode: null }),
  getElementById: () => null
};
const context = {
  window: {
    KaysenderIslandV3AdapterFactory: baseFactory,
    KaysenderIslandV3Panels: { IslandProductionController: FakeProductionController },
    KaysenderMainlineEditorProduction: { getActiveEnvelope: () => ({ locks: [] }) }
  },
  globalThis: {},
  console,
  JSON,
  Object,
  Array,
  Set,
  Map,
  Error,
  document
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(bridgeSource, context, { filename: 'kaysender-island-v3-adapter-panels-bridge.js' });
const bridge = context.window.KaysenderIslandV3AdapterFactory;
assert.notEqual(bridge, baseFactory);
assert.equal(typeof bridge.createStructuredWorkspace, 'function');
assert.equal(typeof bridge.mergeSurfaceMapIntoProduction, 'function');
assert.equal(typeof bridge.readProfile, 'function');

const panel = new FakeElement('section');
const session = bridge.ensureSession(panel, initialProfile);
assert.ok(session.productionController instanceof FakeProductionController);
assert.equal(session.productionRoot.id, 'floating-island-production-panels');
assert.equal(session.advancedJson.className, 'island-v3-advanced-json');
assert.equal(session.blockEditors.get('classification').readOnly, true);
assert.equal(session.blockEditors.get('geometry').attributes['aria-readonly'], 'true');
assert.ok(session.workspace.children.includes(session.productionRoot));
assert.ok(session.advancedJson.children.some(child => child.className === 'island-v3-block-grid'));

const merged = bridge.mergeSurfaceMapIntoProduction(session);
assert.equal(merged.map.columns, 3);
assert.deepEqual(merged.map.activeCellIds, ['cell-live']);
assert.equal(session.productionController.getProfile().map.cells[0].id, 'cell-live');
assert.ok(session.blockEditors.get('classification').value.includes('sizeClass'));

session.productionController.profile.name = 'Structured Edit';
const read = bridge.readProfile(panel);
assert.equal(read.name, 'Structured Edit');
assert.equal(read.map.cells[0].id, 'cell-live');
assert.ok(session.productionController.replaceCount >= 2);

const definition = bridge.createDefinition();
assert.equal(definition.id, 'floating-island-editor');
assert.equal(definition.readProfile, bridge.readProfile);
assert.equal(definition.applyProfileToForm, bridge.applyProfileToForm);
const bundle = bridge.activationBundle();
assert.equal(bundle.migration.id, 'migration');
for (const required of [
  'kaysender-island-v3-profile-model.js',
  'kaysender-island-v3-panels.js',
  'kaysender-island-v3-panels-lifecycle.js',
  'kaysender-island-v3-panels-atomic.js',
  'kaysender-island-v3-adapter-panels-bridge.js'
]) assert.ok(bundle.loadOrder.includes(required), `Bridge activation bundle omits ${required}.`);
assert.equal(bundle.loadOrder.at(-1), 'kaysender-island-v3-adapter-panels-bridge.js');

for (const marker of [
  'Advanced Read-Only JSON Ledger View',
  'textarea.readOnly = true',
  'profile.map = clone(session.controller?.getMap?.()',
  'session.productionController.replaceProfile(profile)',
  'readProfile(panel)',
  'kaysender-island-v3-panels-atomic.js'
]) assert.ok(bridgeSource.includes(marker), `Panel bridge source is missing '${marker}'.`);
assert.equal(bridgeSource.includes('.innerHTML'), false, 'Panel bridge renders imported values through innerHTML.');
assert.equal(indexSource.includes('kaysender-island-v3-adapter-panels-bridge.js'), false, 'Panel bridge was loaded before P1 activation.');

console.log('P1 Island structured panel bridge validation passed.');
console.log('Verified final-factory wrapping, structured workspace mounting, read-only JSON fallback, live surface-map merge, production-profile synchronization, adapter hook replacement, activation ordering, safe text rendering, and inactive runtime state.');
