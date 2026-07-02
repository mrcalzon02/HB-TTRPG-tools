(() => {
  'use strict';

  const ENTRY_URL = 'data/blacklight-continuum/wiki/basic-archetypes.json';
  const RULES_URL = 'data/blacklight-continuum/rules/basic-character-options.json';
  const STORAGE_KEY = 'hb-ttrpg-tools-blacklight-basic-character-v1';
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
      .blacklight-continuity-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .blacklight-continuity-facts article{border:1px solid var(--line);border-radius:13px;padding:12px;background:rgba(255,255,255,.025)}
      .blacklight-continuity-facts h4{margin:0 0 7px;color:var(--accent)}
      .blacklight-continuity-facts ul{margin:0;padding-left:18px}.blacklight-continuity-facts li{color:var(--muted);line-height:1.48}
      .blacklight-transition-table-wrap{overflow-x:auto}
      .blacklight-transition-table{width:100%;min-width:700px;border-collapse:collapse;color:var(--muted);font-size:.87rem}
      .blacklight-transition-table th,.blacklight-transition-table td{border:1px solid var(--line);padding:9px;text-align:left;vertical-align:top;line-height:1.45}
      .blacklight-transition-table th{color:var(--ink);background:rgba(200,138,53,.12)}
      .blacklight-transition-table tbody tr:nth-child(even){background:rgba(255,255,255,.025)}
      .blacklight-family-catalog{display:grid;gap:16px}
      .blacklight-family-record{border:1px solid rgba(200,138,53,.34);border-radius:16px;padding:15px;background:rgba(255,255,255,.025)}
      .blacklight-family-record h3{margin:0 0 7px;color:var(--accent)}
      .blacklight-family-record>p{color:var(--muted);line-height:1.56;margin:7px 0}
      .blacklight-family-roots{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:12px 0}
      .blacklight-family-roots div{border-left:3px solid var(--accent);padding:9px 11px;background:rgba(200,138,53,.07);color:var(--muted);line-height:1.48}
      .blacklight-ranked-powers{display:grid;gap:8px}
      .blacklight-ranked-power{display:grid;grid-template-columns:72px minmax(150px,.55fr) minmax(0,2fr);gap:10px;padding:10px;border-top:1px solid var(--line)}
      .blacklight-ranked-power:first-child{border-top:0}
      .blacklight-ranked-power strong{color:var(--ink)}
      .blacklight-rank-badge{color:var(--accent);font-weight:900;text-transform:uppercase;letter-spacing:.08em;font-size:.72rem}
      .blacklight-ranked-power span:last-child{color:var(--muted);line-height:1.52}
      @media(max-width:900px){.blacklight-continuity-facts,.blacklight-family-roots{grid-template-columns:1fr}.blacklight-ranked-power{grid-template-columns:1fr}}
      @media print{.blacklight-transition-hero,.blacklight-continuity-facts article,.blacklight-family-record,.blacklight-family-roots div{background:#fff!important;border-color:#555!important}.blacklight-transition-hero p,.blacklight-continuity-facts li,.blacklight-transition-table,.blacklight-family-record>p,.blacklight-family-roots div,.blacklight-ranked-power span:last-child{color:#222!important}.blacklight-continuity-facts h4,.blacklight-transition-table th,.blacklight-family-record h3,.blacklight-ranked-power strong,.blacklight-rank-badge{color:#000!important}.blacklight-transition-table th,.blacklight-transition-table td{border-color:#555!important}}
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
        <div><p class="eyebrow">The same archetype entry, continued</p><h2>Old-World Identity, Continuum Translation, and Power Families</h2></div>
        <span class="blacklight-panel-code">CONTINUITY</span>
      </div>
      <div id="blacklight-transition-profile" class="blacklight-transition-profile">
        <p class="helper-note">Select an archetype to load its complete existing record and all six detailed power families.</p>
      </div>
      <div class="blacklight-field-grid blacklight-grid-2">
        <label>Old-World Identity<textarea name="oldWorldIdentity" rows="4" placeholder="Who were you, and what did this Archetype mean before Q-MAP?"></textarea></label>
        <label>Old Rule That No Longer Holds<textarea name="brokenOldRule" rows="4" placeholder="Which certainty about your condition has already failed here?"></textarea></label>
        <label>First Translation Scar<textarea name="firstTranslationScar" rows="4" placeholder="What did the body do wrong the first time an old power returned?"></textarea></label>
        <label>Current Continuum Derivative<textarea name="currentDerivative" rows="4" placeholder="How has one power changed into something native to this body and universe?"></textarea></label>
        <label>Fragmented Legacy Memory<textarea name="legacyMemoryFragment" rows="4" placeholder="What old-world memory guides a power even though its context is missing?"></textarea></label>
        <label>Adaptation Marks and Discoveries<textarea name="adaptationMarks" rows="4" placeholder="Record new couplings, altered tells, replaced limitations, and derivative traits."></textarea></label>
      </div>`;

    archetypePanel.insertAdjacentElement('afterend', panel);
    restoreInjectedFields(panel);
    return panel;
  }

  function restoreInjectedFields(panel) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      const fields = data?.fields || {};
      panel.querySelectorAll('[name]').forEach(field => {
        if (Object.prototype.hasOwnProperty.call(fields, field.name)) field.value = fields[field.name] ?? '';
      });
    } catch (_) {
      // The main sheet owns persistence; this only restores fields injected after its first load.
    }
  }

  function renderTable(table) {
    return `
      <section>
        <h3>${escapeHtml(table.title || 'Archetype Record')}</h3>
        <div class="blacklight-transition-table-wrap"><table class="blacklight-transition-table">
          <thead><tr>${(table.columns || []).map(column => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead>
          <tbody>${(table.rows || []).map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>
      </section>`;
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
            <div class="blacklight-family-roots">
              <div><strong>Old-world root:</strong> ${escapeHtml(family.oldWorldRoot)}</div>
              <div><strong>Continuum translation:</strong> ${escapeHtml(family.continuumTranslation)}</div>
            </div>
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
          <h3>Power Did Not Cross Intact</h3>
          <p>Q-MAP carried memory, instinct, procedure, and supernatural self-pattern. Select an archetype to see its integrated history and six complete power families.</p>
        </div>`;
      return;
    }

    const nonPowerTables = (entry.tables || []).filter(table => table.title !== 'Power Families');
    target.innerHTML = `
      <div class="blacklight-transition-hero">
        <p class="eyebrow">Integrated ${escapeHtml(entry.title)} entry</p>
        <h3>${escapeHtml(entry.summary)}</h3>
        ${(entry.body || []).map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}
      </div>
      ${(entry.keyFacts?.length || entry.playerFacing?.length) ? `
        <div class="blacklight-continuity-facts">
          ${entry.keyFacts?.length ? `<article><h4>Continuity Facts</h4><ul>${entry.keyFacts.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></article>` : ''}
          ${entry.playerFacing?.length ? `<article><h4>Character Questions</h4><ul>${entry.playerFacing.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></article>` : ''}
        </div>` : ''}
      ${nonPowerTables.map(renderTable).join('')}
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
      if (target) target.innerHTML = `<p class="helper-note">The integrated archetype record could not be loaded: ${escapeHtml(error.message)}</p>`;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else void initialize();
})();