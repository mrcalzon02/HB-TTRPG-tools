(() => {
  'use strict';

  const P0_SMOKE_CONTRACT = Object.freeze({
    action: 'Run P0 Live Smoke Test',
    launchMethods: Object.freeze(['launchIsland', 'launchSettlement', 'launchAirship']),
    panels: Object.freeze(['kaysender-editor-panel', 'kaysender-settlement-editor-panel', 'kaysender-airship-editor-panel']),
    parentImports: Object.freeze(['settlement-island-import', 'airship-island-import', 'airship-settlement-import']),
    inheritanceMethod: 'inheritanceReference',
    receiptStorageKey: 'hb-ttrpg-tools:p0-live-smoke:last-pass',
    runtime: 'kaysender-editor-smoke-runtime.js'
  });

  function loadP0SmokeRuntime() {
    const internalMode = new URLSearchParams(window.location.search).get('p0-smoke') === '1'
      || navigator.webdriver === true;
    if (!internalMode) return;
    if (window.runKaysenderEditorSmokeTest || document.querySelector('script[data-p0-smoke-runtime]')) return;

    const script = document.createElement('script');
    script.src = P0_SMOKE_CONTRACT.runtime;
    script.defer = true;
    script.dataset.p0SmokeRuntime = 'true';
    document.body.appendChild(script);
  }

  loadP0SmokeRuntime();
  window.KaysenderP0SmokeLoader = Object.freeze({
    contract: P0_SMOKE_CONTRACT,
    loadP0SmokeRuntime
  });
})();