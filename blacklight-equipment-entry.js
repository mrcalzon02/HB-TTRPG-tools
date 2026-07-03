(() => {
  'use strict';

  function installEquipmentCard() {
    const grid = document.querySelector('#blacklight-continuum .module-grid');
    if (!grid) return false;
    if (grid.querySelector('[data-blacklight-equipment-card]')) return true;

    const card = document.createElement('article');
    card.className = 'module-card';
    card.dataset.blacklightEquipmentCard = 'true';
    card.innerHTML = `
      <div class="module-meta">
        <span class="badge status-active">equipment catalog</span>
        <span class="badge">213 equipment records</span>
        <span class="badge">modern to alien</span>
        <span class="badge">searchable</span>
      </div>
      <h3>Arms, Armor, Relics, and Field Technology</h3>
      <p>Browse modern and historical weapons, armor, supernatural artifacts, future systems, scavenged gear, survival equipment, and alien technology templates using the Blacklight combat and capability rules.</p>
      <div class="blacklight-actions">
        <a class="primary-action" href="blacklight-equipment-catalog.html" target="_blank" rel="noopener">Open Equipment Catalog</a>
        <button class="secondary-action" type="button" data-open-equipment-wiki>Open Equipment Rules</button>
      </div>`;

    const creationCard = grid.querySelector('[data-blacklight-character-creation-card]');
    if (creationCard) creationCard.insertAdjacentElement('afterend', card);
    else grid.appendChild(card);

    card.querySelector('[data-open-equipment-wiki]')?.addEventListener('click', () => {
      document.getElementById('blacklight-open-wiki')?.click();
      window.setTimeout(() => {
        const search = document.getElementById('blacklight-search');
        if (!search) return;
        search.value = 'equipment';
        search.dispatchEvent(new Event('input', { bubbles: true }));
      }, 100);
    });
    return true;
  }

  if (!installEquipmentCard()) {
    const observer = new MutationObserver(() => {
      if (installEquipmentCard()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
