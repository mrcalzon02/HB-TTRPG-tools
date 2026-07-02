(() => {
  'use strict';

  const ENTRY_URL = 'data/blacklight-continuum/wiki/basic-archetypes.json';
  const RULES_URL = 'data/blacklight-continuum/rules/basic-character-options.json';
  const VAMPIRE_LINEAGE_URL = 'data/blacklight-continuum/rules/vampire-remainder-bloodlines.json';
  let archetypeWiki = null;
  let rulesData = null;
  let vampireLineageData = null;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function injectStyles() {
    if (document.getElementById('blacklight-transition-style')) return;
    const style = document.createElement('style');
    style.id = 'blacklight-transition-style';
    style.textContent = `
      .blacklight-transition-profile{display:grid;gap:14px}
      .blacklight-transition-hero{border:1px solid rgba(200,138,53,.34);border-radius:16px;padding:15px;background:linear-gradient(120deg,rgba(89,42,122,.16),rgba(200,138,53,.08))}
      .blacklight-transition-hero h3{margin:0 0 6px}.blacklight-transition-hero p{color:var(--muted);line-height:1.58}
      .blacklight-family-catalog,.blacklight-lineage-catalog{display:grid;gap:16px}
      .blacklight-family-record,.blacklight-lineage-record{border:1px solid rgba(200,138,53,.34);border-radius:16px;padding:15px;background:rgba(255,255,255,.025)}
      .blacklight-family-record h3,.blacklight-lineage-record h3{margin:0 0 7px;color:var(--accent)}
      .blacklight-family-record>p,.blacklight-lineage-record p{color:var(--muted);line-height:1.56;margin:7px 0 12px}
      .blacklight-lineage-record summary{cursor:pointer;color:var(--accent);font-weight:900;font-size:1.02rem}
      .blacklight-lineage-record[open] summary{margin-bottom:12px}
      .blacklight-lineage-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0}
      .blacklight-lineage-grid div{border-left:3px solid var(--accent);padding:9px 11px;background:rgba(200,138,53,.07);color:var(--muted);line-height:1.48}
      .blacklight-lineage-gift,.blacklight-lineage-bane{border:1px solid var(--line);border-radius:12px;padding:11px;margin-top:9px;color:var(--muted);line-height:1.5}
      .blacklight-lineage-gift strong,.blacklight-lineage-bane strong{color:var(--ink)}
      .blacklight-ranked-powers{display:grid;gap:8px}
      .blacklight-ranked-power{display:grid;grid-template-columns:72px minmax(150px,.55fr) minmax(0,2fr);gap:10px;padding:10px;border-top:1px solid var(--line)}
      .blacklight-ranked-power:first-child{border-top:0}
      .blacklight-ranked-power strong{color:var(--ink)}
      .blacklight-rank-badge{color:var(--accent);font-weight:900;text-transform:uppercase;letter-spacing:.08em;font-size:.72rem}
      .blacklight-ranked-power span:last-child{color:var(--muted);line-height:1.52}
      @media(max-width:900px){.blacklight-ranked-power,.blacklight-lineage-grid{grid-template-columns:1fr}}
      @media print{.blacklight-transition-hero,.blacklight-family-record,.blacklight-lineage-record{background:#fff!important;border-color:#555!important}.blacklight-transition-hero p,.blacklight-family-record>p,.blacklight-lineage-record p,.blacklight-ranked-power span:last-child{color:#222!important}.blacklight-family-record h3,.blacklight-lineage-record h3,.blacklight-ranked-power strong,.blacklight-rank-badge{color:#000!important}}
    `;
    document.head.appendChild(style);
  }

  function ensurePanel() {
    let panel = document.getElementById('blacklight-transition-panel');
    if (panel) return panel;
    const archetypePanel = document.querySelector('.blacklight-archetype-panel');
    if (!archetypePanel) return null;

    panel = document.createElement('section');
    panel.id = 'blacklight-transition-panel';
    panel.className = 'blacklight-sheet-panel';
    panel.innerHTML = `
      <div class="blacklight-section-heading">
        <div><p class="eyebrow">Complete capability catalog</p><h2>Archetype Power Families and Variants</h2></div>
        <span class="blacklight-panel-code">CAPABILITY</span>
      </div>
      <div id="blacklight-transition-profile" class="blacklight-transition-profile">
        <p class="helper-note">Select an Archetype to load its capability summary, variants, and six detailed power families.</p>
      </div>`;

    archetypePanel.insertAdjacentElement('afterend', panel);
    return panel;
  }

  function ensureLineageInput() {
    const input = document.querySelector('[name="lineageVariant"]');
    if (!input) return null;
    input.id = input.id || 'blacklight-lineage';
    input.setAttribute('list', 'blacklight-lineage-options');
    let datalist = document.getElementById('blacklight-lineage-options');
    if (!datalist) {
      datalist = document.createElement('datalist');
      datalist.id = 'blacklight-lineage-options';
      input.insertAdjacentElement('afterend', datalist);
    }
    return input;
  }

  function populateLineageInput(archetypeId) {
    const input = ensureLineageInput();
    const datalist = document.getElementById('blacklight-lineage-options');
    if (!input || !datalist) return;
    datalist.innerHTML = '';
    if (archetypeId !== 'vampire') {
      input.placeholder = 'Bloodline, shifting tradition, patron, resonance school…';
      return;
    }
    (vampireLineageData?.lineages || []).forEach(lineage => {
      const option = document.createElement('option');
      option.value = lineage.name;
      option.label = `${lineage.gift.name} / ${lineage.bane.name}`;
      datalist.appendChild(option);
    });
    input.placeholder = 'Choose a Remainder Bloodline or enter Unaligned…';
  }

  function selectedLineageId() {
    const value = document.querySelector('[name="lineageVariant"]')?.value?.trim().toLowerCase();
    if (!value) return '';
    const match = (vampireLineageData?.lineages || []).find(lineage =>
      lineage.id.toLowerCase() === value || lineage.name.toLowerCase() === value
    );
    return match?.id || '';
  }

  function renderPowerFamilies(archetype) {
    if (!archetype?.powerFamilies?.length) return '';
    return `
      <section>
        <div class="blacklight-section-heading"><div><p class="eyebrow">Six distinct advancement paths</p><h2>Complete Power Families</h2></div><span class="blacklight-panel-code">${archetype.powerFamilies.length} × 5</span></div>
        <div class="blacklight-family-catalog">${archetype.powerFamilies.map(family => `
          <article class="blacklight-family-record">
            <h3>${escapeHtml(family.name)}</h3>
            <p>${escapeHtml(family.description)}</p>
            <div class="blacklight-ranked-powers">${(family.abilities || []).map(ability => `
              <div class="blacklight-ranked-power">
                <span class="blacklight-rank-badge">Rank ${escapeHtml(ability.rank)}</span>
                <strong>${escapeHtml(ability.name)}</strong>
                <span>${escapeHtml(ability.effect)}</span>
              </div>`).join('')}</div>
          </article>`).join('')}</div>
      </section>`;
  }

  function renderVampireLineages(archetypeId) {
    if (archetypeId !== 'vampire' || !vampireLineageData?.lineages?.length) return '';
    const chosen = selectedLineageId();
    return `
      <section>
        <div class="blacklight-section-heading"><div><p class="eyebrow">Inherited undead society</p><h2>Thirteen Remainder Bloodlines</h2></div><span class="blacklight-panel-code">13 LINEAGES</span></div>
        <p class="blacklight-callout">${escapeHtml(vampireLineageData.framework)}</p>
        <div class="blacklight-lineage-catalog">${vampireLineageData.lineages.map(lineage => `
          <details class="blacklight-lineage-record" ${lineage.id === chosen ? 'open' : ''}>
            <summary>${escapeHtml(lineage.name)}</summary>
            <div class="blacklight-lineage-grid">
              <div><strong>Society of Shadows legacy:</strong> ${escapeHtml(lineage.legacy)}</div>
              <div><strong>Continuum translation:</strong> ${escapeHtml(lineage.continuum)}</div>
            </div>
            <p><strong>Favored power families:</strong> ${(lineage.favoredFamilies || []).map(escapeHtml).join(' · ')}</p>
            <div class="blacklight-lineage-gift"><strong>${escapeHtml(lineage.gift.name)}:</strong> ${escapeHtml(lineage.gift.effect)}</div>
            <div class="blacklight-lineage-bane"><strong>${escapeHtml(lineage.bane.name)}:</strong> ${escapeHtml(lineage.bane.effect)}</div>
          </details>`).join('')}</div>
      </section>`;
  }

  function entryIdForArchetype(archetypeId) {
    return archetypeId ? `${archetypeId}-archetype` : '';
  }

  function renderEntry() {
    const target = document.getElementById('blacklight-transition-profile');
    const archetypeId = document.getElementById('blacklight-archetype')?.value;
    if (!target || !archetypeWiki || !rulesData) return;
    populateLineageInput(archetypeId);

    const entry = (archetypeWiki.entries || []).find(item => item.id === entryIdForArchetype(archetypeId));
    const archetype = (rulesData.archetypes || []).find(item => item.id === archetypeId);
    if (!entry || !archetype) {
      target.innerHTML = `
        <div class="blacklight-transition-hero">
          <h3>Capabilities Define the Archetype</h3>
          <p>Select an Archetype to review its Resource, Pressure, weakness, innate abilities, variants, and six complete power families.</p>
        </div>`;
      return;
    }

    target.innerHTML = `
      <div class="blacklight-transition-hero">
        <p class="eyebrow">${escapeHtml(entry.title)} capability entry</p>
        <h3>${escapeHtml(entry.summary)}</h3>
        ${(entry.body || []).map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}
      </div>
      ${renderVampireLineages(archetypeId)}
      ${renderPowerFamilies(archetype)}`;
  }

  async function initialize() {
    injectStyles();
    const panel = ensurePanel();
    if (!panel) return;

    try {
      const [entryResponse, rulesResponse, lineageResponse] = await Promise.all([
        fetch(ENTRY_URL, { cache: 'no-store' }),
        fetch(RULES_URL, { cache: 'no-store' }),
        fetch(VAMPIRE_LINEAGE_URL, { cache: 'no-store' })
      ]);
      if (!entryResponse.ok) throw new Error(`Archetype entry request failed with status ${entryResponse.status}.`);
      if (!rulesResponse.ok) throw new Error(`Power catalog request failed with status ${rulesResponse.status}.`);
      if (!lineageResponse.ok) throw new Error(`Vampire lineage request failed with status ${lineageResponse.status}.`);
      archetypeWiki = await entryResponse.json();
      rulesData = await rulesResponse.json();
      vampireLineageData = await lineageResponse.json();
      renderEntry();

      const select = document.getElementById('blacklight-archetype');
      const lineageInput = ensureLineageInput();
      select?.addEventListener('change', renderEntry);
      lineageInput?.addEventListener('input', renderEntry);
      lineageInput?.addEventListener('change', renderEntry);
      if (select) new MutationObserver(() => queueMicrotask(renderEntry)).observe(select, { childList: true, subtree: true });
      window.setTimeout(renderEntry, 100);
      window.setTimeout(renderEntry, 500);
    } catch (error) {
      const target = document.getElementById('blacklight-transition-profile');
      if (target) target.innerHTML = `<p class="helper-note">The Archetype capability catalog could not be loaded: ${escapeHtml(error.message)}</p>`;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else void initialize();
})();