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

  void loadScript('blacklight-wiki-login-gate.js').catch(() => {});
  void loadScript('blacklight-archive-classification-display.js').catch(() => {});

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
})();
