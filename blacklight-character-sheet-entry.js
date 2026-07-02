(() => {
  'use strict';

  const RULES_URL = 'data/blacklight-continuum/rules/basic-character-options.json';
  const HUMAN_VARIANT_URL = 'data/blacklight-continuum/rules/human-vigil-practices.json';
  const VAMPIRE_LINEAGE_URL = 'data/blacklight-continuum/rules/vampire-remainder-bloodlines.json';
  const SHAPECHANGER_VARIANT_URL = 'data/blacklight-continuum/rules/shapechanger-remainder-forms.json';
  const HARMONIC_VARIANT_URL = 'data/blacklight-continuum/rules/harmonic-compact-remainders.json';
  const TECHNOMANCER_VARIANT_URL = 'data/blacklight-continuum/rules/technomancer-awakening-practices.json';
  let rulesData = null;
  let rulesPromise = null;
  const variantCache = new Map();
  const variantPromises = new Map();

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
      .blacklight-wiki-power-catalog,.blacklight-wiki-lineage-catalog{display:grid;gap:15px;margin-top:20px}
      .blacklight-wiki-family,.blacklight-wiki-lineage{border:1px solid rgba(200,138,53,.35);border-radius:15px;padding:14px;background:rgba(255,255,255,.025)}
      .blacklight-wiki-family h4,.blacklight-wiki-lineage h4{margin:0 0 7px!important}
      .blacklight-wiki-family>p,.blacklight-wiki-lineage>p{color:var(--muted);line-height:1.55}
      .blacklight-wiki-lineage-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0}
      .blacklight-wiki-lineage-grid div{border-left:3px solid var(--accent);padding:8px 10px;background:rgba(200,138,53,.07);color:var(--muted);line-height:1.46}
      .blacklight-wiki-lineage-effect{border-top:1px solid var(--line);padding-top:9px;margin-top:9px;color:var(--muted);line-height:1.5}
      .blacklight-wiki-lineage-effect strong{color:var(--ink)}
      .blacklight-wiki-progression{display:grid;gap:8px;margin-top:10px}
      .blacklight-wiki-progression div{border-top:1px solid var(--line);padding-top:9px;color:var(--muted);line-height:1.5}
      .blacklight-wiki-progression strong{color:var(--ink)}
      .blacklight-wiki-rank{display:grid;grid-template-columns:70px minmax(140px,.5fr) minmax(0,2fr);gap:9px;padding:9px 0;border-top:1px solid var(--line)}
      .blacklight-wiki-rank:first-child{border-top:0}
      .blacklight-wiki-rank-badge{color:var(--accent);font-size:.72rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em}
      .blacklight-wiki-rank strong{color:var(--ink)}
      .blacklight-wiki-rank span:last-child{color:var(--muted);line-height:1.5}
      @media(max-width:900px){.blacklight-wiki-rank,.blacklight-wiki-lineage-grid{grid-template-columns:1fr}}
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
        <span class="badge">17 Human Vigil options</span>
        <span class="badge">13 Vampire bloodlines</span>
        <span class="badge">23 Shapechanger variants</span>
        <span class="badge">13 Harmonic remainders</span>
        <span class="badge">20 Technomancer practices</span>
        <span class="badge">36 power families</span>
        <span class="badge">180 ranked powers</span>
      </div>
      <h3>Blacklight Basic Operative Record</h3>
      <p>Create Human Investigators, Vampires, Shapechangers, Eldritch Binders, Harmonic Mutants, and Technomancers. Every Archetype contains six five-rank capability families with explicit costs, effects, limits, resistance, and failure consequences.</p>
      <div class="blacklight-actions">
        <a class="primary-action" href="blacklight-character-sheet.html">Open Basic Character Sheet</a>
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

  function variantUrlFor(archetypeId) {
    if (archetypeId === 'human-investigator') return HUMAN_VARIANT_URL;
    if (archetypeId === 'vampire') return VAMPIRE_LINEAGE_URL;
    if (archetypeId === 'shapechanger') return SHAPECHANGER_VARIANT_URL;
    if (archetypeId === 'harmonic-mutant') return HARMONIC_VARIANT_URL;
    if (archetypeId === 'technomancer') return TECHNOMANCER_VARIANT_URL;
    return '';
  }

  function loadVariantData(archetypeId) {
    const url = variantUrlFor(archetypeId);
    if (!url) return Promise.resolve(null);
    if (variantCache.has(archetypeId)) return Promise.resolve(variantCache.get(archetypeId));
    if (!variantPromises.has(archetypeId)) {
      variantPromises.set(archetypeId, fetch(url, { cache: 'no-store' })
        .then(response => {
          if (!response.ok) throw new Error(`${archetypeId} variant request failed with status ${response.status}.`);
          return response.json();
        })
        .then(data => {
          variantCache.set(archetypeId, data);
          return data;
        }));
    }
    return variantPromises.get(archetypeId);
  }

  function removeLegacyPowerTable(entryTarget) {
    [...entryTarget.querySelectorAll('h4')].forEach(heading => {
      const title = heading.textContent.trim();
      if (title !== 'Power Families' && title !== 'Six Power Families') return;
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
        <div>${(family.abilities || []).map(ability => `
          <div class="blacklight-wiki-rank">
            <span class="blacklight-wiki-rank-badge">Rank ${escapeHtml(ability.rank)}</span>
            <strong>${escapeHtml(ability.name)}</strong>
            <span>${escapeHtml(ability.effect)}</span>
          </div>`).join('')}</div>
      </article>`;
  }

  function renderMethod(label, method) {
    if (!method) return '';
    return `<div class="blacklight-wiki-lineage-effect"><strong>${escapeHtml(label)} — ${escapeHtml(method.name)}:</strong> ${escapeHtml(method.effect)}</div>`;
  }

  function renderVariant(variant, legacyLabel) {
    const skillList = variant.recommendedSkills || variant.trainedSkills || [];
    return `
      <article class="blacklight-wiki-lineage">
        <h4>${escapeHtml(variant.name)}</h4>
        <div class="blacklight-wiki-lineage-grid">
          <div><strong>${escapeHtml(legacyLabel)}:</strong> ${escapeHtml(variant.legacy)}</div>
          <div><strong>Continuum translation:</strong> ${escapeHtml(variant.continuum)}</div>
        </div>
        ${variant.favoredFamilies?.length ? `<p><strong>Favored power families:</strong> ${variant.favoredFamilies.map(escapeHtml).join(' · ')}</p>` : ''}
        ${skillList.length ? `<p><strong>${variant.trainedSkills ? 'Order-trained fields' : 'Recommended Skills'}:</strong> ${skillList.map(escapeHtml).join(' · ')}</p>` : ''}
        ${variant.entryRequirement ? `<p><strong>Entry requirement:</strong> ${escapeHtml(variant.entryRequirement)}</p>` : ''}
        ${renderMethod('Ruling Practice', variant.practice)}
        ${renderMethod(variant.trainedSkills ? 'Order Method' : 'Conviction Method', variant.method)}
        ${renderMethod('Lineage Gift', variant.gift)}
        ${renderMethod('Lineage Bane', variant.bane)}
        ${variant.progression?.length ? `<div class="blacklight-wiki-progression">${variant.progression.map(step => `<div><strong>${escapeHtml(step.stage)} — ${escapeHtml(step.name)}:</strong> ${escapeHtml(step.effect)}</div>`).join('')}</div>` : ''}
      </article>`;
  }

  function variantCatalogs(archetypeId, data) {
    if (archetypeId === 'vampire' && data?.lineages?.length) {
      return [{
        title: 'Thirteen Remainder Bloodlines',
        legacyLabel: 'Society of Shadows legacy',
        variants: data.lineages
      }];
    }
    if ((archetypeId === 'human-investigator' || archetypeId === 'shapechanger' || archetypeId === 'harmonic-mutant' || archetypeId === 'technomancer') && data?.catalogs?.length) {
      return data.catalogs;
    }
    return [];
  }

  async function enrichActiveWikiEntry() {
    const entryTarget = document.querySelector('#blacklight-browser #blacklight-entry');
    if (!entryTarget || entryTarget.querySelector('[data-blacklight-wiki-power-catalog]')) return;
    const entryId = entryTarget.dataset.entryId || '';
    if (!entryId.endsWith('-archetype')) return;

    try {
      const archetypeId = entryId.replace(/-archetype$/, '');
      const [data, variants] = await Promise.all([
        loadRules(),
        loadVariantData(archetypeId)
      ]);
      const archetype = (data.archetypes || []).find(item => item.id === archetypeId);
      if (!archetype) return;
      removeLegacyPowerTable(entryTarget);

      const catalogs = variantCatalogs(archetypeId, variants);
      if (catalogs.length) {
        const variantSection = document.createElement('section');
        variantSection.dataset.blacklightWikiLineageCatalog = 'true';
        variantSection.innerHTML = `
          <p class="blacklight-callout"><strong>These remain part of the ${escapeHtml(archetype.name)} Archetype.</strong> ${escapeHtml(variants.framework)}</p>
          ${catalogs.map(catalog => `
            <h4>${escapeHtml(catalog.title)}</h4>
            <div class="blacklight-wiki-lineage-catalog">${(catalog.variants || []).map(variant => renderVariant(variant, catalog.legacyLabel || 'Inherited legacy')).join('')}</div>`).join('')}`;
        entryTarget.appendChild(variantSection);
      }

      const catalog = document.createElement('section');
      catalog.dataset.blacklightWikiPowerCatalog = 'true';
      catalog.innerHTML = `
        <h4>Complete Power Families</h4>
        <p class="blacklight-callout"><strong>${archetype.powerFamilies.length} distinct families · ${archetype.powerFamilies.reduce((total, family) => total + (family.abilities?.length || 0), 0)} ranked powers.</strong> These capabilities are part of this same ${escapeHtml(archetype.name)} entry.</p>
        <div class="blacklight-wiki-power-catalog">${archetype.powerFamilies.map(renderFamily).join('')}</div>`;
      entryTarget.appendChild(catalog);
    } catch (error) {
      console.error('Blacklight Archetype enrichment failed.', error);
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