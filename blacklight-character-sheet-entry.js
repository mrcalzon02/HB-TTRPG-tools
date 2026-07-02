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
        <span class="badge">6 transition profiles</span>
      </div>
      <h3>Blacklight Basic Operative Record</h3>
      <p>Create Human Investigators, Vampires, Shapechangers, Eldritch Binders, Harmonic Mutants, and Technomancers whose old-world powers must be translated through imperfect Ar'nock-derived bodies, fragmented memories, and the altered laws of the far-future Continuum.</p>
      <div class="blacklight-actions">
        <a class="primary-action" href="blacklight-character-sheet.html">Open Basic Character Sheet</a>
        <a class="secondary-action" href="docs/blacklight-continuum/archetype-transition-guide.md" target="_blank" rel="noopener">Open Transition Guide</a>
        <a class="secondary-action" href="data/blacklight-continuum/rules/archetype-transition-profiles.json" target="_blank" rel="noopener">Open Transition Data</a>
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