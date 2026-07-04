(() => {
  'use strict';

  function installNpcGeneratorCard() {
    const grid = document.querySelector('#blacklight-continuum .module-grid');
    if (!grid) return false;
    if (grid.querySelector('[data-blacklight-npc-generator-card]')) return true;

    const card = document.createElement('article');
    card.className = 'module-card';
    card.dataset.blacklightNpcGeneratorCard = 'true';
    card.innerHTML = `
      <div class="module-meta">
        <span class="badge status-active">NPC generator</span>
        <span class="badge">Power Class 1-10</span>
        <span class="badge">creatures and entities</span>
        <span class="badge">seeded output</span>
      </div>
      <h3>Generate the Thing in the Room</h3>
      <p>Create BlackLight non-player characters, mundane animals, civilian witnesses, operatives, supernatural archetype actors, cryptids, machine intelligences, alien remnants, otherworldly entities, and Charles-tier reality powers with capabilities, limits, motives, complications, and encounter guidance.</p>
      <div class="blacklight-actions">
        <a class="primary-action" href="blacklight-npc-generator.html" target="_blank" rel="noopener">Open NPC and Entity Generator</a>
        <a class="secondary-action" href="blacklight-mission-generator.html">Generate a Mission</a>
      </div>`;

    const missionCard = grid.querySelector('[data-blacklight-mission-generator-card]');
    const randomCard = grid.querySelector('[data-blacklight-random-character-card]');
    if (missionCard) missionCard.insertAdjacentElement('afterend', card);
    else if (randomCard) randomCard.insertAdjacentElement('afterend', card);
    else grid.appendChild(card);
    return true;
  }

  if (!installNpcGeneratorCard()) {
    const observer = new MutationObserver(() => {
      if (installNpcGeneratorCard()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
