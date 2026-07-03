(() => {
  'use strict';

  function installMissionGeneratorCard() {
    const grid = document.querySelector('#blacklight-continuum .module-grid');
    if (!grid) return false;
    if (grid.querySelector('[data-blacklight-mission-generator-card]')) return true;

    const card = document.createElement('article');
    card.className = 'module-card';
    card.dataset.blacklightMissionGeneratorCard = 'true';
    card.innerHTML = `
      <div class="module-meta">
        <span class="badge status-active">mission generator</span>
        <span class="badge">12 legacy patterns</span>
        <span class="badge">seeded rerolls</span>
        <span class="badge">player and GM packets</span>
      </div>
      <h3>Generate the Mission Charles Should Have Explained</h3>
      <p>Create complete BlackLight operations with clients, objectives, targets, global sites, opposition, deadlines, compromised intelligence, clues, twists, consent disclosures, seven-scene frameworks, extraction plans, consequences, and Moderator-only truths.</p>
      <div class="blacklight-actions">
        <a class="primary-action" href="blacklight-mission-generator.html" target="_blank" rel="noopener">Open Mission Generator</a>
        <a class="secondary-action" href="blacklight-veteran-reintroduction.html">Review the New Arrangement</a>
      </div>`;

    const veteranCard = grid.querySelector('[data-blacklight-veteran-card]');
    const randomCard = grid.querySelector('[data-blacklight-random-character-card]');
    if (veteranCard) veteranCard.insertAdjacentElement('afterend', card);
    else if (randomCard) randomCard.insertAdjacentElement('afterend', card);
    else grid.appendChild(card);
    return true;
  }

  if (!installMissionGeneratorCard()) {
    const observer = new MutationObserver(() => {
      if (installMissionGeneratorCard()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
