(() => {
  'use strict';

  function installCharacterCard() {
    const grid = document.querySelector('#blacklight-continuum .module-grid');
    if (!grid || grid.querySelector('[data-blacklight-basic-sheet-card]')) return false;

    const card = document.createElement('article');
    card.className = 'module-card';
    card.dataset.blacklightBasicSheetCard = 'true';
    card.innerHTML = `
      <div class="module-meta">
        <span class="badge status-active">basic character sheet</span>
        <span class="badge">6 integrated archetypes</span>
        <span class="badge">65 ranked abilities</span>
      </div>
      <h3>Blacklight Basic Operative Record</h3>
      <p>Create Human Investigators, Vampires, Shapechangers, Eldritch Binders, Harmonic Mutants, and Technomancers. Each original archetype entry now continues directly into its old-world history, Q-MAP damage, Ar'nock body reconstruction, altered powers, memory fractures, and distinct Continuum development.</p>
      <div class="blacklight-actions">
        <a class="primary-action" href="blacklight-character-sheet.html">Open Basic Character Sheet</a>
        <a class="secondary-action" href="data/blacklight-continuum/wiki/basic-archetypes.json" target="_blank" rel="noopener">Open Integrated Archetype Data</a>
      </div>`;

    grid.insertBefore(card, grid.children[1] || null);
    return true;
  }

  function installCampaignReaderLink() {
    const workspace = document.getElementById('blacklight-continuum');
    if (!workspace) return false;
    const link = [...workspace.querySelectorAll('a')].find(anchor =>
      anchor.getAttribute('href') === 'docs/blacklight-continuum/campaign-introduction.md'
      || anchor.textContent.trim() === 'Open Campaign Document'
    );
    if (!link) return false;
    link.href = 'blacklight-campaign-reader.html';
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Open Formatted Campaign Document';
    return true;
  }

  function install() {
    const cardReady = installCharacterCard();
    const readerReady = installCampaignReaderLink();
    return cardReady && readerReady;
  }

  if (!install()) {
    const observer = new MutationObserver(() => {
      if (install()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();