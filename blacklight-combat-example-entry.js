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
        <span class="badge status-active">combat and soak module</span>
        <span class="badge">damage rolls</span>
        <span class="badge">firearm criticals</span>
        <span class="badge">Vampire Fortitude</span>
        <span class="badge">Shapechanger Living Soak</span>
      </div>
      <h3>Three People in the Cargo Gallery</h3>
      <p>Follow one continuous encounter using attack rolls, firearm critical damage dice, rolled damage, damage-type soak permissions, Armor dice, Living Soak, Pressure, Cohesion, stabilization, and death.</p>
      <div class="blacklight-actions">
        <a class="primary-action" href="blacklight-combat-example.html" target="_blank" rel="noopener">Open Combat and Soak Module</a>
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
