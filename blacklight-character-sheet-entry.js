(() => {
  'use strict';

  const RULES_URL = 'data/blacklight-continuum/rules/basic-character-options.json';
  let rulesData = null;
  let rulesPromise = null;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function installStyles() {
    if (document.getElementById('blacklight-wiki-power-style')) return;
    const style = document.createElement('style');
    style.id = 'blacklight-wiki-power-style';
    style.textContent = `
      .blacklight-wiki-power-catalog{display:grid;gap:15px;margin-top:20px}
      .blacklight-wiki-family{border:1px solid rgba(200,138,53,.35);border-radius:15px;padding:14px;background:rgba(255,255,255,.025)}
      .blacklight-wiki-family h4{margin:0 0 7px!important}
      .blacklight-wiki-family>p{color:var(--muted);line-height:1.55}
      .blacklight-wiki-family-context{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0 12px}
      .blacklight-wiki-family-context div{border-left:3px solid var(--accent);padding:8px 10px;background:rgba(200,138,53,.07);color:var(--muted);line-height:1.46}
      .blacklight-wiki-rank{display:grid;grid-template-columns:70px minmax(140px,.5fr) minmax(0,2fr);gap:9px;padding:9px 0;border-top:1px solid var(--line)}
      .blacklight-wiki-rank:first-child{border-top:0}
      .blacklight-wiki-rank-badge{color:var(--accent);font-size:.72rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em}
      .blacklight-wiki-rank strong{color:var(--ink)}
      .blacklight-wiki-rank span:last-child{color:var(--muted);line-height:1.5}
      @media(max-width:900px){.blacklight-wiki-family-context,.blacklight-wiki-rank{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function installCharacterCard() {
    const grid = document.querySelector('#blacklight-continuum .module-grid');
    if (!grid) return false;
    if (grid.querySelector('[data-blacklight-basic-sheet-card]')) return true;

    const card = document.createElement('article');
    card.className = 'module-card';
    card.dataset.blacklightBasicSheetCard = 'true';
    card.innerHTML = `
      <div class="module-meta">
        <span class="badge status-active">basic character sheet</span>
        <span class="badge">6 integrated archetypes</span>
        <span class="badge">36 power families</span>
        <span class="badge">180 ranked powers</span>
      </div>
      <h3>Blacklight Basic Operative Record</h3>
      <p>Create Human Investigators, Vampires, Shapechangers, Eldritch Binders, Harmonic Mutants, and Technomancers. Every existing archetype now contains six distinct five-rank power families integrated with its old-world history, Q-MAP damage, Ar'nock body reconstruction, and Continuum adaptation.</p>
      <div class="blacklight-actions">
        <a class="primary-action" href="blacklight-character-sheet.html">Open Basic Character Sheet</a>
        <a class="secondary-action" href="data/blacklight-continuum/rules/basic-character-options.json" target="_blank" rel="noopener">Open Canonical Power Data</a>
      </div>`;

    grid.insertBefore(card, grid.children[1] || null);
    return true;
  }

  function installCampaignReaderLink() {
    const workspace = document.getElementById('blacklight-continuum');
    if (!workspace) return false;
    const currentLink = [...workspace.querySelectorAll('a')].find(anchor => anchor.getAttribute('href') === 'blacklight-campaign-reader.html');
    if (currentLink) return true;
    const sourceLink = [...workspace.querySelectorAll('a')].find(anchor =>
      anchor.getAttribute('href') === 'docs/blacklight-continuum/campaign-introduction.md'
      || anchor.textContent.trim() === 'Open Campaign Document'
    );
    if (!sourceLink) return false;
    sourceLink.href = 'blacklight-campaign-reader.html';
    sourceLink.target = '_blank';
    sourceLink.rel = 'noopener';
    sourceLink.textContent = 'Open Formatted Campaign Document';
    return true;
  }

  function loadRules() {
    if (rulesData) return Promise.resolve(rulesData);
    if (!rulesPromise) {
      rulesPromise = fetch(RULES_URL, { cache: 'no-store' })
        .then(response => {
          if (!response.ok) throw new Error(`Power catalog request failed with status ${response.status}.`);
          return response.json();
        })
        .then(data => {
          rulesData = data;
          return data;
        });
    }
    return rulesPromise;
  }

  function removeLegacyPowerTable(entryTarget) {
    [...entryTarget.querySelectorAll('h4')].forEach(heading => {
      if (heading.textContent.trim() !== 'Power Families') return;
      const next = heading.nextElementSibling;
      heading.remove();
      if (next?.classList.contains('blacklight-table-wrap')) next.remove();
    });
  }

  function renderFamily(family) {
    return `
      <article class="blacklight-wiki-family">
        <h4>${escapeHtml(family.name)}</h4>
        <p>${escapeHtml(family.description)}</p>
        <div class="blacklight-wiki-family-context">
          <div><strong>Old-world root:</strong> ${escapeHtml(family.oldWorldRoot)}</div>
          <div><strong>Continuum translation:</strong> ${escapeHtml(family.continuumTranslation)}</div>
        </div>
        <div>${(family.abilities || []).map(ability => `
          <div class="blacklight-wiki-rank">
            <span class="blacklight-wiki-rank-badge">Rank ${escapeHtml(ability.rank)}</span>
            <strong>${escapeHtml(ability.name)}</strong>
            <span>${escapeHtml(ability.effect)}</span>
          </div>`).join('')}</div>
      </article>`;
  }

  async function enrichActiveWikiEntry() {
    const entryTarget = document.querySelector('#blacklight-browser #blacklight-entry');
    if (!entryTarget || entryTarget.querySelector('[data-blacklight-wiki-power-catalog]')) return;
    const entryId = entryTarget.dataset.entryId || '';
    if (!entryId.endsWith('-archetype')) return;

    try {
      const data = await loadRules();
      const archetypeId = entryId.replace(/-archetype$/, '');
      const archetype = (data.archetypes || []).find(item => item.id === archetypeId);
      if (!archetype) return;
      removeLegacyPowerTable(entryTarget);

      const catalog = document.createElement('section');
      catalog.dataset.blacklightWikiPowerCatalog = 'true';
      catalog.innerHTML = `
        <h4>Complete Power Families</h4>
        <p class="blacklight-callout"><strong>${archetype.powerFamilies.length} distinct families · ${archetype.powerFamilies.reduce((total, family) => total + (family.abilities?.length || 0), 0)} ranked powers.</strong> These paths are part of this same ${escapeHtml(archetype.name)} entry, not separate Wiki records.</p>
        <div class="blacklight-wiki-power-catalog">${archetype.powerFamilies.map(renderFamily).join('')}</div>`;
      entryTarget.appendChild(catalog);
    } catch (error) {
      console.error('Blacklight power catalog enrichment failed.', error);
    }
  }

  function install() {
    installStyles();
    const cardReady = installCharacterCard();
    const readerReady = installCampaignReaderLink();
    void enrichActiveWikiEntry();
    return cardReady && readerReady;
  }

  if (!install()) {
    const observer = new MutationObserver(() => {
      install();
      void enrichActiveWikiEntry();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } else {
    const observer = new MutationObserver(() => void enrichActiveWikiEntry());
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();