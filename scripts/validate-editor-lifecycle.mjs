import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

class TestCustomEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
}

function createWindow() {
  const listeners = new Map();
  return {
    CustomEvent: TestCustomEvent,
    confirm: () => true,
    setTimeout,
    clearTimeout,
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
    dispatchEvent(event) {
      for (const listener of listeners.get(event.type) || []) listener(event);
      return true;
    }
  };
}

function createPanel() {
  const listeners = new Map();
  return {
    dataset: {},
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
    dispatch(type, event = {}) {
      for (const listener of listeners.get(type) || []) listener(event);
    }
  };
}

const root = process.cwd();
const window = createWindow();
const context = {
  window,
  CustomEvent: TestCustomEvent,
  console,
  Date,
  Promise,
  setTimeout,
  clearTimeout
};
vm.createContext(context);
const source = await fs.readFile(path.join(root, 'kaysender-editor-lifecycle.js'), 'utf8');
vm.runInContext(source, context, { filename: 'kaysender-editor-lifecycle.js' });

const lifecycle = window.KaysenderEditorLifecycle;
assert.ok(lifecycle, 'Editor lifecycle was not exposed.');
assert.equal(typeof lifecycle.checkpoint, 'function');
assert.equal(typeof lifecycle.markCleanIfUnchanged, 'function');

const panel = createPanel();
let resolveFirstAutosave;
let notifyFirstAutosaveStarted;
const firstAutosaveStarted = new Promise(resolve => { notifyFirstAutosaveStarted = resolve; });
const firstAutosaveFinished = new Promise(resolve => { resolveFirstAutosave = resolve; });
let autosaveMode = 'controlled';

lifecycle.bind(
  { id: 'settlement-editor', label: 'Open Production Settlement Editor' },
  panel,
  {
    autosave: async () => {
      if (autosaveMode === 'controlled') {
        notifyFirstAutosaveStarted();
        await firstAutosaveFinished;
      }
      if (autosaveMode === 'failure') return { ok: false, message: 'synthetic autosave failure' };
      return { ok: true, message: 'saved' };
    }
  }
);

const initial = lifecycle.getState('settlement-editor');
assert.equal(initial.dirty, false);
assert.equal(initial.changeVersion, 0);
assert.equal(initial.savedVersion, 0);

lifecycle.markDirty('settlement-editor', 'First edit.', { delay: 1 });
await firstAutosaveStarted;
const firstCheckpoint = lifecycle.checkpoint('settlement-editor');
assert.equal(firstCheckpoint, 1);

lifecycle.markDirty('settlement-editor', 'Newer edit while autosave is running.', { autosave: false });
assert.equal(lifecycle.checkpoint('settlement-editor'), 2);
resolveFirstAutosave();
await new Promise(resolve => setTimeout(resolve, 10));

const afterStaleAutosave = lifecycle.getState('settlement-editor');
assert.equal(afterStaleAutosave.dirty, true, 'A stale autosave completion cleared a newer edit.');
assert.equal(afterStaleAutosave.changeVersion, 2);
assert.equal(afterStaleAutosave.savedVersion, 0);
assert.equal(afterStaleAutosave.status, 'autosave-pending');

const rejectedManualClean = lifecycle.markCleanIfUnchanged(
  'settlement-editor',
  firstCheckpoint,
  'Incorrectly marked clean.'
);
assert.equal(rejectedManualClean.ok, false, 'A stale manual save checkpoint cleared newer changes.');
assert.equal(lifecycle.getState('settlement-editor').dirty, true);

// A new edit cancels the pending retry and schedules a fast successful save.
autosaveMode = 'success';
lifecycle.markDirty('settlement-editor', 'Third edit.', { delay: 1 });
await new Promise(resolve => setTimeout(resolve, 15));
const afterCurrentAutosave = lifecycle.getState('settlement-editor');
assert.equal(afterCurrentAutosave.dirty, false, 'A current autosave did not clear the saved edit generation.');
assert.equal(afterCurrentAutosave.changeVersion, 3);
assert.equal(afterCurrentAutosave.savedVersion, 3);
assert.equal(afterCurrentAutosave.status, 'saved');

// A failed autosave must leave the record dirty.
autosaveMode = 'failure';
lifecycle.markDirty('settlement-editor', 'Fourth edit.', { delay: 1 });
await new Promise(resolve => setTimeout(resolve, 15));
const afterFailedAutosave = lifecycle.getState('settlement-editor');
assert.equal(afterFailedAutosave.dirty, true, 'A failed autosave cleared the dirty state.');
assert.equal(afterFailedAutosave.status, 'autosave-failed');
assert.equal(afterFailedAutosave.changeVersion, 4);
assert.equal(afterFailedAutosave.savedVersion, 3);

const currentCheckpoint = lifecycle.checkpoint('settlement-editor');
const acceptedManualClean = lifecycle.markCleanIfUnchanged(
  'settlement-editor',
  currentCheckpoint,
  'Manual save completed.'
);
assert.equal(acceptedManualClean.ok, true);
const afterManualSave = lifecycle.getState('settlement-editor');
assert.equal(afterManualSave.dirty, false);
assert.equal(afterManualSave.savedVersion, afterManualSave.changeVersion);

console.log('Editor lifecycle validation passed.');
console.log('Verified edit generations, stale autosave rejection, stale manual checkpoint rejection, current autosave completion, failed autosave retention, and current manual save completion.');
