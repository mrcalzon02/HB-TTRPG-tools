(() => {
  'use strict';

  const states = new Map();
  const DEFAULT_AUTOSAVE_DELAY = 1200;

  function stateFor(editorId) {
    if (!states.has(editorId)) {
      states.set(editorId, {
        editorId,
        dirty: false,
        status: 'ready',
        message: 'Ready.',
        changedAt: null,
        savedAt: null,
        changeVersion: 0,
        savedVersion: 0,
        autosaveTimer: null,
        autosave: null
      });
    }
    return states.get(editorId);
  }

  function publicState(state) {
    return {
      editorId: state.editorId,
      dirty: state.dirty,
      status: state.status,
      message: state.message,
      changedAt: state.changedAt,
      savedAt: state.savedAt,
      changeVersion: state.changeVersion,
      savedVersion: state.savedVersion
    };
  }

  function emit(state) {
    window.dispatchEvent(new CustomEvent('kaysender-editor-lifecycle-change', {
      detail: publicState(state)
    }));
  }

  function cancelAutosave(state) {
    if (state.autosaveTimer) window.clearTimeout(state.autosaveTimer);
    state.autosaveTimer = null;
  }

  function checkpoint(editorId) {
    return stateFor(editorId).changeVersion;
  }

  function markClean(editorId, message = 'All changes saved to the local recovery draft.') {
    const state = stateFor(editorId);
    cancelAutosave(state);
    state.dirty = false;
    state.status = 'saved';
    state.message = message;
    state.savedAt = new Date().toISOString();
    state.savedVersion = state.changeVersion;
    emit(state);
    return publicState(state);
  }

  function markCleanIfUnchanged(editorId, savedVersion, message = 'All changes saved to the local recovery draft.') {
    const state = stateFor(editorId);
    if (state.changeVersion !== savedVersion) {
      state.dirty = true;
      state.status = 'dirty';
      state.message = 'Newer changes were made while saving. Recovery autosave remains pending.';
      emit(state);
      scheduleAutosave(editorId);
      return { ok: false, state: publicState(state) };
    }
    return { ok: true, state: markClean(editorId, message) };
  }

  function scheduleAutosave(editorId, delay = DEFAULT_AUTOSAVE_DELAY) {
    const state = stateFor(editorId);
    cancelAutosave(state);
    if (typeof state.autosave !== 'function') return;
    state.status = 'autosave-pending';
    state.message = 'Unsaved changes. Recovery draft autosave pending.';
    emit(state);
    state.autosaveTimer = window.setTimeout(async () => {
      state.autosaveTimer = null;
      const savingVersion = state.changeVersion;
      state.status = 'autosaving';
      state.message = 'Saving recovery draft…';
      emit(state);
      try {
        const result = await state.autosave();
        if (result?.ok === false) throw new Error(result.message || 'Autosave failed.');
        markCleanIfUnchanged(editorId, savingVersion, 'Recovery draft autosaved.');
      } catch (error) {
        state.dirty = true;
        state.status = 'autosave-failed';
        state.message = `Recovery draft autosave failed: ${error.message}`;
        emit(state);
      }
    }, delay);
  }

  function markDirty(editorId, message = 'Unsaved changes.', options = {}) {
    const state = stateFor(editorId);
    state.changeVersion += 1;
    state.dirty = true;
    state.status = 'dirty';
    state.message = message;
    state.changedAt = new Date().toISOString();
    emit(state);
    if (options.autosave !== false) scheduleAutosave(editorId, options.delay);
    return publicState(state);
  }

  function bind(adapter, panel, hooks = {}) {
    const state = stateFor(adapter.id);
    state.autosave = hooks.autosave || state.autosave;
    if (panel.dataset.sharedLifecycleBound === adapter.id) return publicState(state);
    panel.dataset.sharedLifecycleBound = adapter.id;
    const onEdit = event => {
      if (!event.isTrusted) return;
      markDirty(adapter.id, `Unsaved changes in ${adapter.label.replace(/^Open /, '')}.`);
    };
    panel.addEventListener('input', onEdit);
    panel.addEventListener('change', onEdit);
    emit(state);
    return publicState(state);
  }

  function reset(editorId, message = 'Ready.') {
    const state = stateFor(editorId);
    cancelAutosave(state);
    state.dirty = false;
    state.status = 'ready';
    state.message = message;
    state.changedAt = null;
    state.savedAt = null;
    state.changeVersion = 0;
    state.savedVersion = 0;
    emit(state);
    return publicState(state);
  }

  function confirmLeave(editorId, message = 'This editor has unsaved changes. Leave it anyway?') {
    const state = stateFor(editorId);
    return !state.dirty || window.confirm(message);
  }

  function getState(editorId) {
    return publicState(stateFor(editorId));
  }

  function hasDirtyRecords() {
    return Array.from(states.values()).some(state => state.dirty);
  }

  window.addEventListener('beforeunload', event => {
    if (!hasDirtyRecords()) return;
    event.preventDefault();
    event.returnValue = '';
  });

  window.KaysenderEditorLifecycle = Object.freeze({
    bind,
    markDirty,
    markClean,
    markCleanIfUnchanged,
    reset,
    confirmLeave,
    getState,
    checkpoint,
    hasDirtyRecords,
    scheduleAutosave,
    autosaveDelay: DEFAULT_AUTOSAVE_DELAY
  });
})();
