(() => {
  'use strict';

  function installCourtCatalogCard() {
    const grid = document.querySelector('#blacklight-continuum .module-grid');
    if (!grid) return false;
    if (grid.querySelector('[data-blacklight-court-catalog-card]')) return true;

    const card = document.createElement('article');
    card.className = 'module-card';
    card.dataset.blacklightCourtCatalogCard = 'true';
    card.innerHTML = `
      <div class="module-meta">
        <span class="badge status-active">court catalog</span>
        <span class="badge">vampiric courts</span>
        <span class="badge">fae courts</span>
        <span class="badge">organizations</span>
      </div>
      <h3>Vampiric and Fae Court Catalogs</h3>
      <p>Open the reference catalog for vampiric blood courts, fae jurisdictions, court offices, feeding systems, oath structures, market organizations, envoys, heralds, and the institutional machinery behind supernatural power.</p>
      <div class="blacklight-actions">
        <button class="primary-action" type="button" data-open-court-catalog>Open Court Catalogs</button>
        <button class="secondary-action" type="button" data-open-fae-catalog>Open Fae Courts</button>
      </div>`;

    card.querySelector('[data-open-court-catalog]')?.addEventListener('click', () => {
      window.BlacklightContinuumWorkspace?.openBrowser?.('court-catalogs-overview');
    });
    card.querySelector('[data-open-fae-catalog]')?.addEventListener('click', () => {
      window.BlacklightContinuumWorkspace?.openBrowser?.('fae-courts-overview');
    });

    const entityCard = grid.querySelector('[data-blacklight-entity-catalog-card]');
    const npcCard = grid.querySelector('[data-blacklight-npc-generator-card]');
    if (entityCard) entityCard.insertAdjacentElement('afterend', card);
    else if (npcCard) npcCard.insertAdjacentElement('afterend', card);
    else grid.appendChild(card);
    return true;
  }

  if (!installCourtCatalogCard()) {
    const observer = new MutationObserver(() => {
      if (installCourtCatalogCard()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
