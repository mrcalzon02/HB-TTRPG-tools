(() => {
  'use strict';

  function installGaianSpiritCard() {
    const grid = document.querySelector('#blacklight-continuum .module-grid');
    if (!grid) return false;
    if (grid.querySelector('[data-blacklight-gaian-spirit-card]')) return true;

    const card = document.createElement('article');
    card.className = 'module-card';
    card.dataset.blacklightGaianSpiritCard = 'true';
    card.innerHTML = `
      <div class="module-meta">
        <span class="badge status-active">Gaian society</span>
        <span class="badge">shapechanger packs</span>
        <span class="badge">spirits index</span>
        <span class="badge">fae contracts</span>
      </div>
      <h3>Gaian Shapechangers and Spirits Index</h3>
      <p>Open the reference pack for Gaia-worshipping shapechanger society, tribal pack leaders, prominent members, pack offices, spirit ecology, named spirits, and fae-spirit contract relationships.</p>
      <div class="blacklight-actions">
        <button class="primary-action" type="button" data-open-gaian-society>Open Gaian Society</button>
        <button class="secondary-action" type="button" data-open-spirit-index>Open Spirits Index</button>
      </div>`;

    card.querySelector('[data-open-gaian-society]')?.addEventListener('click', () => {
      window.BlacklightContinuumWorkspace?.openBrowser?.('gaian-shapechanger-society-overview');
    });
    card.querySelector('[data-open-spirit-index]')?.addEventListener('click', () => {
      window.BlacklightContinuumWorkspace?.openBrowser?.('spirits-index-overview');
    });

    const courtCard = grid.querySelector('[data-blacklight-court-catalog-card]');
    const entityCard = grid.querySelector('[data-blacklight-entity-catalog-card]');
    if (courtCard) courtCard.insertAdjacentElement('afterend', card);
    else if (entityCard) entityCard.insertAdjacentElement('afterend', card);
    else grid.appendChild(card);
    return true;
  }

  if (!installGaianSpiritCard()) {
    const observer = new MutationObserver(() => {
      if (installGaianSpiritCard()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
