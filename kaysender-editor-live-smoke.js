(() => {
  'use strict';

  const P0_SMOKE_CONTRACT=Object.freeze({
    action:'Run P0 Live Smoke Test',
    launchMethods:Object.freeze(['launchIsland','launchSettlement','launchAirship']),
    panels:Object.freeze(['kaysender-editor-panel','kaysender-settlement-editor-panel','kaysender-airship-editor-panel']),
    parentImports:Object.freeze(['settlement-island-import','airship-island-import','airship-settlement-import']),
    inheritanceMethod:'inheritanceReference',
    receiptStorageKey:'hb-ttrpg-tools:p0-live-smoke:last-pass',
    runtime:'kaysender-editor-smoke-runtime.js'
  });

  const removeLegacyPrimerSourceButton = () => {
    const card = document.querySelector('[data-module-id="barotrauma-crewmans-primer"]');
    const actions = card?.querySelector('.module-actions');
    const buttons = actions ? [...actions.querySelectorAll('button')] : [];
    buttons.slice(1).forEach(button => button.remove());
  };

  const loadRpgWikiAction = () => {
    if (document.querySelector('script[data-barotrauma-rpg-entry]')) return;
    const script = document.createElement('script');
    script.src = 'barotrauma-rpg-entry.js?v=exact-19';
    script.dataset.barotraumaRpgEntry = 'true';
    document.body.appendChild(script);
  };

  const loadP0SmokeRuntime = () => {
    const internalMode = new URLSearchParams(window.location.search).get('p0-smoke') === '1' || navigator.webdriver === true;
    if (!internalMode) return;
    if (window.runKaysenderEditorSmokeTest || document.querySelector('script[data-p0-smoke-runtime]')) return;
    const script = document.createElement('script');
    script.src = P0_SMOKE_CONTRACT.runtime;
    script.defer = true;
    script.dataset.p0SmokeRuntime = 'true';
    document.body.appendChild(script);
  };

  const grid = document.getElementById('barotrauma-overview-grid');
  if (grid) {
    new MutationObserver(removeLegacyPrimerSourceButton).observe(grid, {
      childList: true,
      subtree: true
    });
    removeLegacyPrimerSourceButton();
    loadRpgWikiAction();
  }

  loadP0SmokeRuntime();
  window.KaysenderP0SmokeLoader = Object.freeze({ contract:P0_SMOKE_CONTRACT,loadP0SmokeRuntime });
})();
