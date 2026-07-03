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
        <span class="badge status-active">character creation guide</span>
        <span class="badge">14 induction chapters</span>
        <span class="badge">Charles onboarding</span>
        <span class="badge">standard creation package</span>
        <span class="badge">Q-MAP ending</span>
      </div>
      <h3>The Person We Are Sending</h3>
      <p>Build a complete Blacklight operative through an in-universe induction interview conducted by Charles, then meet Mara, Ilyan, and Kest immediately before Q-MAP deployment.</p>
      <div class="blacklight-actions">
        <a class="primary-action" href="blacklight-character-creation.html" target="_blank" rel="noopener">Open Character Creation Guide</a>
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
