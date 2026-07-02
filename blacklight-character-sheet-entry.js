(() => {
  'use strict';

  function installCard() {
    const grid = document.querySelector('#blacklight-continuum .module-grid');
    if (!grid || grid.querySelector('[data-blacklight-basic-sheet-card]')) return false;

    const card = document.createElement('article');
    card.className = 'module-card';
    card.dataset.blacklightBasicSheetCard = 'true';
    card.innerHTML = `
      <div class="module-meta">
        <span class="badge status-active">basic character sheet</span>
        <span class="badge">6 archetypes</span>
        <span class="badge">65 ranked abilities</span>
      </div>
      <h3>Blacklight Basic Operative Record</h3>
      <p>Create normal Human Investigators, Vampires, Shapechangers, Eldritch Binders, Harmonic Mutants, and Technomancers. The sheet calculates derived traits, loads class resources and pressure tracks, enforces power-rank access, autosaves locally, imports and exports JSON, and prints cleanly.</p>
      <div class="blacklight-actions">
        <a class="primary-action" href="blacklight-character-sheet.html">Open Basic Character Sheet</a>
        <a class="secondary-action" href="data/blacklight-continuum/rules/basic-character-options.json" target="_blank" rel="noopener">Open Archetype Data</a>
      </div>`;

    grid.insertBefore(card, grid.children[1] || null);
    return true;
  }

  if (!installCard()) {
    const observer = new MutationObserver(() => {
      if (installCard()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();