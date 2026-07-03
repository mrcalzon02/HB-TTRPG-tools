(() => {
  'use strict';

  const TRACK_URL = 'data/blacklight-continuum/rules/archetype-resource-pressure-rules.json';
  const ARCHETYPE_NAMES = {
    'human-investigator': 'Human Investigator',
    vampire: 'Vampire',
    shapechanger: 'Shapechanger',
    'eldritch-binder': 'Eldritch Binder',
    'harmonic-mutant': 'Harmonic Mutant',
    technomancer: 'Technomancer'
  };

  let trackData = null;
  let trackPromise = null;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function installCombatErrata() {
    if (document.querySelector('script[data-blacklight-shapechanger-errata]')) return;
    const script = document.createElement('script');
    script.src = 'blacklight-shapechanger-combat-errata.js';
    script.dataset.blacklightShapechangerErrata = 'true';
    document.head.appendChild(script);
  }

  function loadTracks() {
    if (trackData) return Promise.resolve(trackData);
    if (!trackPromise) {
      trackPromise = fetch(TRACK_URL, { cache: 'no-store' })
        .then(response => {
          if (!response.ok) throw new Error(`Resource and Pressure request failed with status ${response.status}.`);
          return response.json();
        })
        .then(data => {
          trackData = data;
          return data;
        });
    }
    return trackPromise;
  }

  function installStyles() {
    if (document.getElementById('blacklight-resource-pressure-style')) return;
    const style = document.createElement('style');
    style.id = 'blacklight-resource-pressure-style';
    style.textContent = `
      .blacklight-track-status-grid,.blacklight-track-rule-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px}
      .blacklight-track-status,.blacklight-track-rule-card{border:1px solid rgba(200,138,53,.32);border-radius:14px;padding:12px;background:rgba(255,255,255,.025);color:var(--muted);line-height:1.5}
      .blacklight-track-status strong,.blacklight-track-rule-card strong{color:var(--ink)}
      .blacklight-track-rule-card h3,.blacklight-track-rule-card h4{margin:0 0 8px;color:var(--accent)}
      .blacklight-track-rule-card h4{margin-top:14px}
      .blacklight-track-rule-card p{color:var(--muted);line-height:1.52}
      .blacklight-track-rule-card ul{margin:8px 0 0 20px;padding:0}
      .blacklight-track-rule-card li{margin:7px 0;color:var(--muted);line-height:1.5}
      .blacklight-track-universal{border-left:3px solid var(--accent);padding:10px 12px;margin:0 0 14px;background:rgba(200,138,53,.08);color:var(--muted);line-height:1.52}
      .blacklight-track-band-stable{border-color:rgba(109,185,125,.45)}
      .blacklight-track-band-warning{border-color:rgba(220,173,74,.55)}
      .blacklight-track-band-critical,.blacklight-track-band-crisis{border-color:rgba(211,107,107,.62)}
      .blacklight-wiki-track-procedure{margin-top:20px}
      @media(max-width:900px){.blacklight-track-status-grid,.blacklight-track-rule-grid{grid-template-columns:1fr}}
      @media print{.blacklight-track-status,.blacklight-track-rule-card,.blacklight-track-universal{background:#fff!important;border-color:#555!important;color:#222!important}.blacklight-track-rule-card p,.blacklight-track-rule-card li{color:#222!important}.blacklight-track-rule-card h3,.blacklight-track-rule-card h4,.blacklight-track-status strong,.blacklight-track-rule-card strong{color:#000!important}}
    `;
    document.head.appendChild(style);
  }

  function renderRecovery(items) {
    return (items || []).map(item => `
      <li><strong>${escapeHtml(item.name)} · ${escapeHtml(item.frequency)}:</strong> ${escapeHtml(item.effect)}</li>`).join('');
  }

  function renderTrackCards(archetypeId) {
    const tracks = trackData?.archetypes?.[archetypeId];
    if (!tracks) return '<p class="helper-note">No Resource and Pressure procedure is registered for this Archetype.</p>';
    return `
      <div class="blacklight-track-rule-grid">
        <article class="blacklight-track-rule-card">
          <h3>${escapeHtml(tracks.resource.name)}</h3>
          <p><strong>What it is:</strong> ${escapeHtml(tracks.resource.meaning)}</p>
          <p><strong>What spending means:</strong> ${escapeHtml(tracks.resource.spending)}</p>
          <p><strong>At 0:</strong> ${escapeHtml(tracks.resource.depletedState)}</p>
          <h4>Resource Recovery</h4>
          <ul>${renderRecovery(tracks.resource.recovery)}</ul>
        </article>
        <article class="blacklight-track-rule-card">
          <h3>${escapeHtml(tracks.pressure.name)}</h3>
          <p><strong>What it is:</strong> ${escapeHtml(tracks.pressure.meaning)}</p>
          <p><strong>Warning — ${escapeHtml(tracks.pressure.warning.name)}:</strong> ${escapeHtml(tracks.pressure.warning.effect)}</p>
          <p><strong>Critical — ${escapeHtml(tracks.pressure.critical.name)}:</strong> ${escapeHtml(tracks.pressure.critical.effect)}</p>
          <p><strong>Crisis — ${escapeHtml(tracks.pressure.crisis.name)}:</strong> ${escapeHtml(tracks.pressure.crisis.effect)}</p>
          <h4>Pressure Recovery</h4>
          <ul>${renderRecovery(tracks.pressure.recovery)}</ul>
        </article>
      </div>`;
  }

  function currentTrackStatus(archetypeId) {
    const tracks = trackData?.archetypes?.[archetypeId];
    const form = document.getElementById('blacklight-character-form');
    if (!tracks || !form) return '';

    const resourceMax = Math.max(0, Number(document.getElementById('blacklight-resource-max')?.value || 0));
    const resourceCurrent = Math.max(0, Number(form.elements.resourceCurrent?.value || 0));
    const pressureLimit = Math.max(1, Number(document.getElementById('blacklight-pressure-limit')?.value || 1));
    const pressureCurrent = Math.max(0, Number(form.elements.pressureCurrent?.value || 0));
    const warning = Math.ceil(pressureLimit / 3);
    const critical = Math.ceil((pressureLimit * 2) / 3);
    const band = pressureCurrent >= pressureLimit ? 'Crisis'
      : pressureCurrent >= critical ? 'Critical'
        : pressureCurrent >= warning ? 'Warning'
          : 'Stable';

    if (form.elements.resourceCurrent) form.elements.resourceCurrent.max = String(resourceMax);
    if (form.elements.pressureCurrent) form.elements.pressureCurrent.max = String(pressureLimit);

    return `
      <div class="blacklight-track-status-grid">
        <div class="blacklight-track-status ${resourceCurrent <= 0 ? 'blacklight-track-band-critical' : 'blacklight-track-band-stable'}">
          <strong>${escapeHtml(tracks.resource.name)}:</strong> ${resourceCurrent}/${resourceMax} · ${resourceCurrent <= 0 ? 'Depleted state active' : 'Available'}
        </div>
        <div class="blacklight-track-status blacklight-track-band-${band.toLowerCase()}">
          <strong>${escapeHtml(tracks.pressure.name)}:</strong> ${pressureCurrent}/${pressureLimit} · ${band} · Warning ${warning} · Critical ${critical} · Crisis ${pressureLimit}
        </div>
      </div>`;
  }

  function universalProcedure() {
    const procedure = trackData?.procedure;
    if (!procedure) return '';
    return `
      <p class="blacklight-track-universal"><strong>Universal procedure:</strong> ${escapeHtml(procedure.spendingOrder)} ${escapeHtml(procedure.overflow)}</p>`;
  }

  function ensureSheetPanel() {
    const form = document.getElementById('blacklight-character-form');
    const archetypePanel = document.querySelector('.blacklight-archetype-panel');
    if (!form || !archetypePanel) return null;
    let panel = document.getElementById('blacklight-resource-pressure-panel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'blacklight-resource-pressure-panel';
      panel.className = 'blacklight-sheet-panel';
      panel.innerHTML = `
        <div class="blacklight-section-heading">
          <div><p class="eyebrow">Spend, recover, escalate, and break</p><h2>Resource and Pressure Procedure</h2></div>
          <span class="blacklight-panel-code">TRACKS</span>
        </div>
        <div id="blacklight-resource-pressure-content"><p class="helper-note">Select an Archetype to load its track procedures.</p></div>`;
      archetypePanel.insertAdjacentElement('afterend', panel);
    }
    return panel;
  }

  function renderSheetPanel() {
    const panel = ensureSheetPanel();
    const target = document.getElementById('blacklight-resource-pressure-content');
    const archetypeId = document.getElementById('blacklight-archetype')?.value || '';
    if (!panel || !target || !trackData) return;
    if (!archetypeId) {
      target.innerHTML = `${universalProcedure()}<p class="helper-note">Select an Archetype to load its Resource, Pressure bands, recovery procedures, and Crisis.</p>`;
      return;
    }
    target.innerHTML = `${universalProcedure()}${currentTrackStatus(archetypeId)}${renderTrackCards(archetypeId)}`;
  }

  function installSheetMode() {
    const form = document.getElementById('blacklight-character-form');
    if (!form) return false;
    ensureSheetPanel();
    renderSheetPanel();
    const rerender = () => queueMicrotask(renderSheetPanel);
    form.addEventListener('input', rerender);
    form.addEventListener('change', rerender);
    const select = document.getElementById('blacklight-archetype');
    if (select) new MutationObserver(rerender).observe(select, { childList: true, subtree: true });
    window.setTimeout(renderSheetPanel, 100);
    window.setTimeout(renderSheetPanel, 500);
    return true;
  }

  function renderWikiEntry() {
    const entry = document.querySelector('#blacklight-browser #blacklight-entry');
    if (!entry || !trackData || entry.querySelector('[data-blacklight-resource-pressure]')) return;
    const entryId = entry.dataset.entryId || '';
    if (!entryId.endsWith('-archetype')) return;
    const archetypeId = entryId.replace(/-archetype$/, '');
    if (!trackData.archetypes?.[archetypeId]) return;

    const section = document.createElement('section');
    section.className = 'blacklight-wiki-track-procedure';
    section.dataset.blacklightResourcePressure = 'true';
    section.innerHTML = `
      <h4>${escapeHtml(ARCHETYPE_NAMES[archetypeId] || archetypeId)} Resource and Pressure</h4>
      ${universalProcedure()}
      ${renderTrackCards(archetypeId)}`;
    const insertion = entry.querySelector('[data-blacklight-wiki-lineage-catalog], [data-blacklight-wiki-power-catalog]');
    if (insertion) entry.insertBefore(section, insertion);
    else entry.appendChild(section);
  }

  function installWikiMode() {
    renderWikiEntry();
    new MutationObserver(renderWikiEntry).observe(document.documentElement, { childList: true, subtree: true });
    return true;
  }

  async function initialize() {
    installCombatErrata();
    installStyles();
    try {
      await loadTracks();
      installSheetMode();
      installWikiMode();
    } catch (error) {
      console.error('Blacklight Resource and Pressure procedures could not be loaded.', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else void initialize();
})();
