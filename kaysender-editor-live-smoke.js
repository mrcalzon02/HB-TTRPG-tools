(() => {
  'use strict';

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
    script.src = 'kaysender-editor-smoke-runtime.js';
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
  window.KaysenderP0SmokeLoader = Object.freeze({ loadP0SmokeRuntime });
})();
