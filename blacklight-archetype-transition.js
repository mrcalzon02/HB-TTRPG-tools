(() => {
  'use strict';

  const ENTRY_URL = 'data/blacklight-continuum/wiki/basic-archetypes.json';
  const RULES_URL = 'data/blacklight-continuum/rules/basic-character-options.json';
  let archetypeWiki = null;
  let rulesData = null;

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
      .blacklight-family-catalog{display:grid;gap:16px}
      .blacklight-family-record{border:1px solid rgba(200,138,53,.34);border-radius:16px;padding:15px;background:rgba(255,255,255,.025)}
      .blacklight-family-record h3{margin:0 0 7px;color:var(--accent)}
      .blacklight-family-record>p{color:var(--muted);line-height:1.56;margin:7px 0 12px}
      .blacklight-ranked-powers{display:grid;gap:8px}
      .blacklight-ranked-power{display:grid;grid-template-columns:72px minmax(150px,.55fr) minmax(0,2fr);gap:10px;padding:10px;border-top:1px solid var(--line)}
      .blacklight-ranked-power:first-child{border-top:0}
      .blacklight-ranked-power strong{color:var(--ink)}
      .blacklight-rank-badge{color:var(--accent);font-weight:900;text-transform:uppercase;letter-spacing:.08em;font-size:.72rem}
      .blacklight-ranked-power span:last-child{color:var(--muted);line-height:1.52}
      @media(max-width:900px){.blacklight-ranked-power{grid-template-columns:1fr}}
      @media print{.blacklight-transition-hero,.blacklight-family-record{background:#fff!important;border-color:#555!important}.blacklight-transition-hero p,.blacklight-family-record>p,.blacklight-ranked-power span:last-child{color:#222!important}.blacklight-family-record h3,.blacklight-ranked-power strong,.blacklight-rank-badge{color:#000!important}}
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
        <div><p class="eyebrow">Complete capability catalog</p><h2>Archetype Power Families</h2></div>
        <span class="blacklight-panel-code">CAPABILITY</span>
      </div>
      <div id="blacklight-transition-profile" class="blacklight-transition-profile">
        <p class="helper-note">Select an Archetype to load its capability summary and all six detailed power families.</p>
      </div>`;

    archetypePanel.insertAdjacentElement('afterend', panel);
    return panel;
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

  function entryIdForArchetype(archetypeId) {
    return archetypeId ? `${archetypeId}-archetype` : '';
  }

  function renderEntry() {
    const target = document.getElementById('blacklight-transition-profile');
    const archetypeId = document.getElementById('blacklight-archetype')?.value;
    if (!target || !archetypeWiki || !rulesData) return;

    const entry = (archetypeWiki.entries || []).find(item => item.id === entryIdForArchetype(archetypeId));
    const archetype = (rulesData.archetypes || []).find(item => item.id === archetypeId);
    if (!entry || !archetype) {
      target.innerHTML = `
        <div class="blacklight-transition-hero">
          <h3>Capabilities Define the Archetype</h3>
          <p>Select an Archetype to review its Resource, Pressure, weakness, innate abilities, and six complete power families. Crossing history and body reconstruction are not part of this rules record.</p>
        </div>`;
      return;
    }

    target.innerHTML = `
      <div class="blacklight-transition-hero">
        <p class="eyebrow">${escapeHtml(entry.title)} capability entry</p>
        <h3>${escapeHtml(entry.summary)}</h3>
        ${(entry.body || []).map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}
      </div>
      ${renderPowerFamilies(archetype)}`;
  }

  async function initialize() {
    injectStyles();
    const panel = ensurePanel();
    if (!panel) return;

    try {
      const [entryResponse, rulesResponse] = await Promise.all([
        fetch(ENTRY_URL, { cache: 'no-store' }),
        fetch(RULES_URL, { cache: 'no-store' })
      ]);
      if (!entryResponse.ok) throw new Error(`Archetype entry request failed with status ${entryResponse.status}.`);
      if (!rulesResponse.ok) throw new Error(`Power catalog request failed with status ${rulesResponse.status}.`);
      archetypeWiki = await entryResponse.json();
      rulesData = await rulesResponse.json();
      renderEntry();

      const select = document.getElementById('blacklight-archetype');
      select?.addEventListener('change', renderEntry);
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