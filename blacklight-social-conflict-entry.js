(() => {
  'use strict';

  function installSocialConflictCard() {
    const grid = document.querySelector('#blacklight-continuum .module-grid');
    if (!grid) return false;
    if (grid.querySelector('[data-blacklight-social-conflict-card]')) return true;

    const card = document.createElement('article');
    card.className = 'module-card';
    card.dataset.blacklightSocialConflictCard = 'true';
    card.innerHTML = `
      <div class="module-meta">
        <span class="badge status-active">social conflict module</span>
        <span class="badge">objectives + objections</span>
        <span class="badge">leverage + exposure</span>
        <span class="badge">six exchanges</span>
        <span class="badge">Richard's fee clock</span>
      </div>
      <h3>The Administrator's Clock</h3>
      <p>Follow Mara, Ilyan, and Kest through a bureaucratic social conflict against Richard, a planetary administrator hiding docking rules so another fee can post.</p>
      <div class="blacklight-actions">
        <a class="primary-action" href="blacklight-social-conflict.html" target="_blank" rel="noopener">Open Social Conflict Guide</a>
      </div>`;

    const combatCard = grid.querySelector('[data-blacklight-combat-example-card]');
    if (combatCard) combatCard.insertAdjacentElement('afterend', card);
    else {
      const wikiCard = grid.querySelector('#blacklight-open-wiki')?.closest('.module-card');
      if (wikiCard) wikiCard.insertAdjacentElement('afterend', card);
      else grid.appendChild(card);
    }
    return true;
  }

  if (!installSocialConflictCard()) {
    const observer = new MutationObserver(() => {
      if (installSocialConflictCard()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
