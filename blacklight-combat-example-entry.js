(() => {
  'use strict';

  function installCombatCard() {
    const grid = document.querySelector('#blacklight-continuum .module-grid');
    if (!grid) return false;
    if (grid.querySelector('[data-blacklight-combat-example-card]')) return true;

    const card = document.createElement('article');
    card.className = 'module-card';
    card.dataset.blacklightCombatExampleCard = 'true';
    card.innerHTML = `
      <div class="module-meta">
        <span class="badge status-active">worked combat module</span>
        <span class="badge">two against one</span>
        <span class="badge">8 rounds</span>
        <span class="badge">death and rescue</span>
      </div>
      <h3>Three People in the Cargo Gallery</h3>
      <p>Follow one complete encounter from roleplayed confrontation through Initiative, attacks, Protection, Vitality, Exposure, Cohesion, Archetype Pressure, Incursion, stabilization, revival, Overexposure, and death.</p>
      <div class="blacklight-actions">
        <a class="primary-action" href="blacklight-combat-example.html" target="_blank" rel="noopener">Open Worked Combat Module</a>
      </div>`;

    const wikiCard = grid.querySelector('#blacklight-open-wiki')?.closest('.module-card');
    if (wikiCard) wikiCard.insertAdjacentElement('afterend', card);
    else grid.appendChild(card);
    return true;
  }

  if (!installCombatCard()) {
    const observer = new MutationObserver(() => {
      if (installCombatCard()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
