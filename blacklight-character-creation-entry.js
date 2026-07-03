(() => {
  'use strict';

  function installCharacterCreationCard() {
    const grid = document.querySelector('#blacklight-continuum .module-grid');
    if (!grid) return false;
    if (grid.querySelector('[data-blacklight-character-creation-card]')) return true;

    const card = document.createElement('article');
    card.className = 'module-card';
    card.dataset.blacklightCharacterCreationCard = 'true';
    card.innerHTML = `
      <div class="module-meta">
        <span class="badge status-active">interactive character creation</span>
        <span class="badge">14 induction stages</span>
        <span class="badge">1,600+ recognized names</span>
        <span class="badge">contextual Charles responses</span>
        <span class="badge">printable sheet handoff</span>
      </div>
      <h3>The Person We Are Sending</h3>
      <p>Build a complete Blacklight operative through a recorded onboarding interview with the full operational Charles. He recognizes extensive public and popular-media name references, analyzes mechanical choices, preserves the exchange, and transfers the completed character to the printable sheet.</p>
      <div class="blacklight-actions">
        <a class="primary-action" href="blacklight-character-creation.html" target="_blank" rel="noopener">Begin Interactive Induction</a>
        <a class="secondary-action" href="blacklight-character-sheet.html">Open Character Sheet</a>
      </div>`;

    const sheetCard = grid.querySelector('[data-blacklight-basic-sheet-card]');
    if (sheetCard) sheetCard.insertAdjacentElement('afterend', card);
    else grid.insertBefore(card, grid.children[1] || null);
    return true;
  }

  if (!installCharacterCreationCard()) {
    const observer = new MutationObserver(() => {
      if (installCharacterCreationCard()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
