(() => {
  'use strict';

  function installVeteranCard() {
    const grid = document.querySelector('#blacklight-continuum .module-grid');
    if (!grid) return false;
    if (grid.querySelector('[data-blacklight-veteran-card]')) return true;

    const card = document.createElement('article');
    card.className = 'module-card';
    card.dataset.blacklightVeteranCard = 'true';
    card.innerHTML = `
      <div class="module-meta">
        <span class="badge status-active">returning operative module</span>
        <span class="badge">24 guided stages</span>
        <span class="badge">Charles-era continuity</span>
        <span class="badge">Company arrangement</span>
      </div>
      <h3>BlackLight Reorientation: The New Arrangement</h3>
      <p>Return to the accelerating Charles-era missions, warehouse convergence, lunar convocation, judgment, silent interim, and formation of the BlackLight Company. Build a persistent veteran continuity record and attach it to an existing character sheet.</p>
      <div class="blacklight-actions">
        <a class="primary-action" href="blacklight-veteran-reintroduction.html" target="_blank" rel="noopener">Open Veteran Reorientation</a>
        <a class="secondary-action" href="blacklight-character-creation.html">Use New Operative Induction</a>
      </div>`;

    const randomCard = grid.querySelector('[data-blacklight-random-character-card]');
    const creationCard = grid.querySelector('[data-blacklight-character-creation-card]');
    if (randomCard) randomCard.insertAdjacentElement('afterend', card);
    else if (creationCard) creationCard.insertAdjacentElement('afterend', card);
    else grid.appendChild(card);
    return true;
  }

  if (!installVeteranCard()) {
    const observer = new MutationObserver(() => {
      if (installVeteranCard()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
