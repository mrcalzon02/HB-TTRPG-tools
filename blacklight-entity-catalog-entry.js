(() => {
  'use strict';

  function installEntityCatalogCard() {
    const grid = document.querySelector('#blacklight-continuum .module-grid');
    if (!grid) return false;
    if (grid.querySelector('[data-blacklight-entity-catalog-card]')) return true;

    const card = document.createElement('article');
    card.className = 'module-card';
    card.dataset.blacklightEntityCatalogCard = 'true';
    card.innerHTML = `
      <div class="module-meta">
        <span class="badge status-active">entity catalog</span>
        <span class="badge">Power Class 1-10</span>
        <span class="badge">NPC reference</span>
        <span class="badge">GM guidance</span>
      </div>
      <h3>Comprehensive Entity Catalog</h3>
      <p>Open the reference catalog for mundane creatures, civilians, operatives, supernatural archetype actors, monsters, alien remnants, machine intelligences, otherworldly courts, cosmic sovereigns, and Charles-tier beings.</p>
      <div class="blacklight-actions">
        <button class="primary-action" type="button" data-open-entity-catalog>Open Entity Catalog</button>
        <a class="secondary-action" href="blacklight-npc-generator.html" target="_blank" rel="noopener">Generate an Entity</a>
      </div>`;

    card.querySelector('[data-open-entity-catalog]')?.addEventListener('click', () => {
      window.BlacklightContinuumWorkspace?.openBrowser?.('blacklight-entity-catalog-overview');
    });

    const npcCard = grid.querySelector('[data-blacklight-npc-generator-card]');
    const missionCard = grid.querySelector('[data-blacklight-mission-generator-card]');
    if (npcCard) npcCard.insertAdjacentElement('afterend', card);
    else if (missionCard) missionCard.insertAdjacentElement('afterend', card);
    else grid.appendChild(card);
    return true;
  }

  if (!installEntityCatalogCard()) {
    const observer = new MutationObserver(() => {
      if (installEntityCatalogCard()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
