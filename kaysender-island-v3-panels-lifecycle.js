(() => {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;
  const base = root.KaysenderIslandV3Panels;
  const modelApi = root.KaysenderIslandV3ProfileModel;
  if (!base || !modelApi) throw new Error('Island v3 panels and profile model must load before the lifecycle wrapper.');

  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const enqueue = typeof queueMicrotask === 'function'
    ? queueMicrotask
    : callback => Promise.resolve().then(callback);
  const DIRTY_EVENTS = new Set(['fields-changed', 'record-added', 'record-updated', 'record-removed']);

  class IslandProductionController {
    constructor(options = {}) {
      if (!options.editorId) throw new Error('Island production controller requires an editorId.');
      if (!root.KaysenderEditorLifecycle) throw new Error('KaysenderEditorLifecycle is unavailable.');
      this.editorId = options.editorId;
      this.lifecycle = root.KaysenderEditorLifecycle;
      this.onProfileChange = typeof options.onProfileChange === 'function' ? options.onProfileChange : null;
      this.onDiagnostics = typeof options.onDiagnostics === 'function' ? options.onDiagnostics : null;
      this.suppressDirty = false;
      this.pendingEvents = [];
      this.flushScheduled = false;
      this.model = new modelApi.IslandProfileModel(options.profile || {}, {
        getLocks: typeof options.getLocks === 'function' ? options.getLocks : () => options.locks || []
      });
      this.unsubscribe = this.model.subscribe(event => this.#queueEvent(event));
      if (options.root) {
        this.panels = new base.IslandProductionPanels({
          root: options.root,
          model: this.model,
          onDiagnostic: diagnostic => this.onDiagnostics?.([clone(diagnostic)])
        });
      }
    }

    #queueEvent(event) {
      this.pendingEvents.push(clone(event));
      if (this.flushScheduled) return;
      this.flushScheduled = true;
      enqueue(() => this.flush());
    }

    flush() {
      if (!this.pendingEvents.length) {
        this.flushScheduled = false;
        return null;
      }
      const events = this.pendingEvents.splice(0);
      this.flushScheduled = false;
      const dirty = !this.suppressDirty && events.some(event => DIRTY_EVENTS.has(event.type));
      if (dirty) this.lifecycle.markDirty(this.editorId, 'Island production profile changed.');
      const payload = {
        type: events.length === 1 ? events[0].type : 'production-change-batch',
        events,
        profile: this.model.getProfile(),
        dirty
      };
      this.onProfileChange?.(clone(payload));
      return clone(payload);
    }

    replaceProfile(profile) {
      this.flush();
      this.suppressDirty = true;
      try {
        const result = this.model.replaceProfile(profile);
        this.flush();
        return result;
      } finally {
        this.suppressDirty = false;
      }
    }

    getProfile() {
      return this.model.getProfile();
    }

    buildCanonical(options = {}) {
      return this.model.buildCanonical(options);
    }

    commitCanonical(options = {}) {
      this.flush();
      this.suppressDirty = true;
      try {
        const result = this.model.commitCanonical(options);
        this.flush();
        return result;
      } finally {
        this.suppressDirty = false;
      }
    }

    destroy() {
      this.flush();
      this.panels?.destroy();
      this.unsubscribe?.();
      this.panels = null;
      this.unsubscribe = null;
      this.pendingEvents = [];
    }
  }

  root.KaysenderIslandV3Panels = Object.freeze({
    ...base,
    IslandProductionController,
    DIRTY_EVENTS
  });
})();
