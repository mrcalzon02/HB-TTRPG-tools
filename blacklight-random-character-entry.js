(() => {
  'use strict';

  function installRandomCharacterCard() {
    const grid = document.querySelector('#blacklight-continuum .module-grid');
    if (!grid) return false;
    if (grid.querySelector('[data-blacklight-random-character-card]')) return true;

    const card = document.createElement('article');
    card.className = 'module-card';
    card.dataset.blacklightRandomCharacterCard = 'true';
    card.innerHTML = `
      <div class="module-meta">
        <span class="badge status-active">random character generator</span>
        <span class="badge">legal standard package</span>
        <span class="badge">seeded rerolls</span>
        <span class="badge">sheet transfer</span>
        <span class="badge">allocation audited</span>
      </div>
      <h3>Generate the Person We Are Sending</h3>
      <p>Create a complete Rating 1 operative with legal Attributes, Skills, specializations, Archetype variants, starting abilities, equipment, relationships, derived tracks, and one-click transfer into the Basic Character Sheet.</p>
      <div class="blacklight-actions">
        <a class="primary-action" href="blacklight-random-character.html" target="_blank" rel="noopener">Open Random Character Generator</a>
        <a class="secondary-action" href="blacklight-character-creation.html">Use Guided Creation</a>
      </div>`;

    const creationCard = grid.querySelector('[data-blacklight-character-creation-card]');
    if (creationCard) creationCard.insertAdjacentElement('afterend', card);
    else grid.appendChild(card);
    return true;
  }

  if (!installRandomCharacterCard()) {
    const observer = new MutationObserver(() => {
      if (installRandomCharacterCard()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
