(() => {
  'use strict';

  const base = window.HBTTRPGApp;
  if (!base) return;
  let sheetPromise = null;

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

  async function prepareView(viewId) {
    if (viewId === 'utilities') {
      sheetPromise ||= loadScript('character-sheet-view.js');
      await sheetPromise;
      base.initializeSheet();
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
    .then(() => loadScript('binary-cube-large-grid-ui.js'))
    .catch(error => {
      console.error('Binary Cube large-grid support could not be loaded.', error);
    });

  void loadScript('binary-cube-desktop-link.js').catch(error => {
    console.error('Binary Cube desktop download links could not be loaded.', error);
  });

  void loadScript('shadowrun-binary-cube-secure-export.js').catch(error => {
    console.error('Binary Cube secure export controls could not be loaded.', error);
  });
})();
