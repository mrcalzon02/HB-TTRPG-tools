(() => {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;
  const base = root.KaysenderIslandV3Panels;
  if (!base?.IslandProductionController) throw new Error('Island production lifecycle wrapper must load before atomic panel submission support.');

  class AtomicIslandProductionController extends base.IslandProductionController {
    constructor(options = {}) {
      super(options);
      this.atomicRoot = options.root || null;
      if (this.atomicRoot) {
        this.atomicHandler = event => this.#handleAtomicSubmit(event);
        this.atomicRoot.addEventListener('submit', this.atomicHandler, true);
      }
    }

    #handleAtomicSubmit(event) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      const panelElement = form.closest('.island-production-panel.scalar-panel');
      if (!panelElement || !this.atomicRoot.contains(panelElement)) return;
      const panel = base.SCALAR_PANELS.find(item => item.id === panelElement.dataset.panelId);
      if (!panel || panel.readOnly) return;
      event.preventDefault();
      event.stopPropagation();
      try {
        const changes = panel.fields.filter(definition => !definition.readOnly).map(definition => {
          const input = form.elements.namedItem(definition.path);
          if (!input || input.disabled) return null;
          return {
            path: definition.path,
            value: base.inputValue(input, definition),
            definition
          };
        }).filter(Boolean);
        this.model.setFields(changes);
      } catch (error) {
        this.onDiagnostics?.([{
          severity: 'error',
          code: 'island-panel-batch-apply-failed',
          path: panel.id,
          message: error.message
        }]);
      }
    }

    destroy() {
      if (this.atomicRoot && this.atomicHandler) this.atomicRoot.removeEventListener('submit', this.atomicHandler, true);
      this.atomicHandler = null;
      this.atomicRoot = null;
      super.destroy();
    }
  }

  root.KaysenderIslandV3Panels = Object.freeze({
    ...base,
    IslandProductionController: AtomicIslandProductionController
  });
})();
