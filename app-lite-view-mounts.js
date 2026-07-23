(() => {
  'use strict';

  const base = window.HBTTRPGApp;
  if (!base) return;
  let sheetPromise = null;
  let barotraumaPromise = null;

  function loadScript(src) {
    if (document.querySelector(`script[data-hb-core-view="${src}"]`)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.dataset.hbCoreView = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`${src} could not be loaded.`));
      document.body.appendChild(script);
    });
  }

  function loadBarotraumaWorkspace() {
    barotraumaPromise ||= loadScript('barotrauma-entry.js?v=4');
    return barotraumaPromise;
  }

  async function prepareView(viewId) {
    if (viewId === 'utilities') {
      sheetPromise ||= loadScript('character-sheet-view.js');
      await sheetPromise;
      base.initializeSheet();
      return;
    }
    if (viewId === 'barotrauma') {
      await Promise.all([loadBarotraumaWorkspace(), base.prepareView(viewId)]);
      window.BarotraumaWorkspace?.initialize();
      return;
    }
    return base.prepareView(viewId);
  }

  document.addEventListener('hb:view-activated', event => {
    if (event.detail?.viewId === 'modules') window.initModuleViewer?.();
  });

  window.HBTTRPGApp = Object.freeze({
    ...base,
    prepareView
  });

  void loadScript('binary-cube-large-grid-engine.js')
    .then(() => loadScript('binary-cube-omnidirectional-engine.js'))
    .then(() => loadScript('binary-cube-large-grid-ui.js'))
    .catch(error => {
      console.error('Binary Cube large-grid or omnidirectional invariant support could not be loaded.', error);
    });

  void loadScript('binary-cube-desktop-link.js').catch(error => {
    console.error('Binary Cube desktop download links could not be loaded.', error);
  });

  void loadScript('shadowrun-binary-cube-secure-export.js').catch(error => {
    console.error('Binary Cube secure export controls could not be loaded.', error);
  });
})();
