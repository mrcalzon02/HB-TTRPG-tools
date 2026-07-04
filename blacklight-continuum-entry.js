(() => {
  'use strict';

  const VIEW_ID = 'blacklight-continuum';
  const INDEX_URL = 'data/blacklight-continuum/wiki/wiki-index.json';
  let wikiData = null;
  let activeCategory = 'all';

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function humanize(value) {
    return String(value ?? '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]/g, ' ')
      .replace(/^./, character => character.toUpperCase());
  }

  function injectStyles() {
    if (document.getElementById('blacklight-continuum-style')) return;
    const style = document.createElement('style');
    style.id = 'blacklight-continuum-style';
    style.textContent = `
      .blacklight-browser{border:1px solid var(--line);border-radius:22px;padding:20px;background:rgba(0,0,0,.22)}
      .blacklight-controls{display:grid;grid-template-columns:minmax(240px,1fr) auto;gap:10px;margin-bottom:14px}
      .blacklight-controls input{background:#10131a;border:1px solid var(--line);color:var(--ink);border-radius:12px;padding:10px 12px}
      .blacklight-categories,.blacklight-related{display:flex;flex-wrap:wrap;gap:7px;grid-column:1/-1}
      .blacklight-chip{border:1px solid var(--line);border-radius:999px;padding:5px 9px;background:rgba(255,255,255,.04);color:var(--muted);cursor:pointer}
      .blacklight-chip.active,.blacklight-chip:hover{color:var(--ink);border-color:var(--accent)}
      .blacklight-layout{display:grid;grid-template-columns:320px minmax(0,1fr);gap:14px}
      .blacklight-list{display:grid;gap:8px;max-height:72vh;overflow:auto;align-content:start}
      .blacklight-list button{text-align:left;border:1px solid var(--line);border-radius:13px;padding:10px;background:rgba(255,255,255,.025);color:var(--ink);cursor:pointer}
      .blacklight-list button.active,.blacklight-list button:hover{border-color:var(--accent);background:rgba(200,138,53,.1)}
      .blacklight-list small{display:block;color:var(--muted);margin-top:4px}
      .blacklight-entry{border:1px solid rgba(200,138,53,.35);border-radius:16px;padding:18px;background:rgba(0,0,0,.16);min-width:0}
      .blacklight-entry h3{margin:3px 0 6px}.blacklight-entry h4{color:var(--accent);margin:20px 0 8px}
      .blacklight-entry p,.blacklight-entry li{color:var(--muted);line-height:1.58}
      .blacklight-meta{color:var(--accent);font-weight:800;text-transform:uppercase;letter-spacing:.08em;font-size:.75rem}
      .blacklight-callout{border-left:3px solid var(--accent);padding:10px 12px;margin:12px 0;background:rgba(200,138,53,.07);color:var(--muted)}
      .blacklight-table-wrap{overflow-x:auto;margin:12px 0 18px}
      .blacklight-table{width:100%;min-width:620px;border-collapse:collapse;font-size:.88rem;color:var(--muted)}
      .blacklight-table th,.blacklight-table td{border:1px solid var(--line);padding:9px;text-align:left;vertical-align:top}
      .blacklight-table th{color:var(--ink);background:rgba(200,138,53,.12)}
      .blacklight-table tbody tr:nth-child(even){background:rgba(255,255,255,.025)}
      .blacklight-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:12px}
      .blacklight-actions a{text-decoration:none}
      @media(max-width:900px){.blacklight-layout,.blacklight-controls{grid-template-columns:1fr}.blacklight-list{max-height:none}}
    `;
    document.head.appendChild(style);
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Blacklight Continuum request failed: ${url} ${response.status}`);
    return response.json();
  }

  async function loadWiki() {
    if (wikiData) return wikiData;
    const index = await fetchJson(INDEX_URL);
    const packs = await Promise.all((index.packs || []).map(fetchJson));
    const byId = new Map();
    packs.forEach(pack => (pack.entries || []).forEach(entry => {
      byId.set(entry.id, { ...(byId.get(entry.id) || {}), ...entry });
    }));
    wikiData = {
      index,
      entries: Array.from(byId.values()).sort((left, right) =>
        (left.category || '').localeCompare(right.category || '') ||
        (left.title || '').localeCompare(right.title || '')
      )
    };
    return wikiData;
  }

  function buildWorkspace() {
    const main = document.querySelector('main');
    if (!main || document.getElementById(VIEW_ID)) return;

    const section = document.createElement('section');
    section.id = VIEW_ID;
    section.className = 'view';
    section.setAttribute('aria-labelledby', 'blacklight-continuum-title');
    section.innerHTML = `
      <div class="hero-card no-print">
        <p class="eyebrow">Blacklight Continuum campaign workspace</p>
        <h2 id="blacklight-continuum-title">No Return Signal</h2>
        <p>Far-future mirror-universe science-fiction espionage, identity horror, supernatural capability development, advanced technology, the BlackLight Era operating environment, and an original d10 dice-pool system.</p>
      </div>
      <div class="module-grid no-print">
        <article class="module-card">
          <div class="module-meta"><span class="badge status-active">campaign introduction</span><span class="badge">BlackLight Era</span></div>
          <h3>The BlackLight Era</h3>
          <p>Open the post-reorientation campaign primer: Blacklight Intelligence as public corporation, Faux Charles as secure voice product, the O-shaped headquarters, and the new operating environment after Charles's absence and return.</p>
          <button id="blacklight-open-era" class="primary-action" type="button">Open BlackLight Era Primer</button>
        </article>
        <article class="module-card">
          <div class="module-meta"><span class="badge status-active">campaign introduction</span><span class="badge">player and GM sections</span></div>
          <h3>The Ar'nock Derelict</h3>
          <p>Read the campaign foundation: Q-MAP awakening, pseudo-Charles, the Ar'nock vessel, biological Charles, identity questions, jobs, skills, powers, equipment, and opening-session guidance.</p>
          <div class="blacklight-actions"><a class="primary-action" href="blacklight-campaign-reader.html" target="_blank" rel="noopener">Open Formatted Campaign Document</a></div>
        </article>
        <article class="module-card">
          <div class="module-meta"><span id="blacklight-pack-count" class="badge status-active">loading packs</span><span id="blacklight-entry-count" class="badge status-active">loading entries</span></div>
          <h3>Blacklight Continuum Wiki</h3>
          <p id="blacklight-scope-summary">Loading the current campaign and rules index…</p>
          <button id="blacklight-open-wiki" class="primary-action" type="button">Open Blacklight Continuum Wiki</button>
        </article>
        <article class="module-card">
          <div class="module-meta"><span class="badge status-active">d10 alpha</span><span class="badge">capability first</span></div>
          <h3>System Foundation</h3>
          <p>Nine Attributes, twenty-four Skills, twelve Operational Frames, Exposure and Cohesion, explicit capability families, equipment, and dangerous opposed resolution. Form and origin grant no unlisted mechanics.</p>
          <button id="blacklight-open-rules" class="secondary-action" type="button">Open Rules Entries</button>
        </article>
        <article class="module-card">
          <div class="module-meta"><span class="badge status-planned">next development</span></div>
          <h3>Expansion Roadmap</h3>
          <p id="blacklight-next-development">Loading the current development areas…</p>
        </article>
      </div>
      <section id="blacklight-browser" class="blacklight-browser no-print" hidden></section>`;
    main.appendChild(section);

    section.querySelector('#blacklight-open-era')?.addEventListener('click', () => openBrowser('blacklight-era-formation'));
    section.querySelector('#blacklight-open-wiki')?.addEventListener('click', () => openBrowser());
    section.querySelector('#blacklight-open-rules')?.addEventListener('click', () => openBrowser('blacklight-d10-foundation'));
  }

  async function refreshWorkspaceSummary() {
    try {
      const data = await loadWiki();
      const packCount = data.index.packs?.length || 0;
      const entryCount = data.entries.length;
      const packBadge = document.getElementById('blacklight-pack-count');
      const entryBadge = document.getElementById('blacklight-entry-count');
      const scope = document.getElementById('blacklight-scope-summary');
      const next = document.getElementById('blacklight-next-development');
      if (packBadge) packBadge.textContent = `${packCount} pack${packCount === 1 ? '' : 's'}`;
      if (entryBadge) entryBadge.textContent = `${entryCount} entr${entryCount === 1 ? 'y' : 'ies'}`;
      if (scope) scope.textContent = data.index.description || 'Blacklight Continuum campaign wiki active.';
      if (next) next.textContent = (data.index.nextDevelopmentAreas || []).map(humanize).join(', ') || 'Additional campaign and system development remains planned.';
    } catch (_) {
      const scope = document.getElementById('blacklight-scope-summary');
      if (scope) scope.textContent = 'The Blacklight Continuum wiki will load when the project is served through GitHub Pages or a local web server.';
    }
  }

  async function openBrowser(preferredEntryId = '') {
    const browser = document.getElementById('blacklight-browser');
    if (!browser) return;
    browser.hidden = false;
    browser.innerHTML = '<p class="helper-note">Loading Blacklight Continuum records…</p>';
    try {
      const data = await loadWiki();
      renderBrowser(browser, data, preferredEntryId);
      browser.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (_) {
      browser.innerHTML = '<p class="helper-note">The Blacklight Continuum wiki could not be loaded. Serve the project through GitHub Pages or a local web server.</p>';
    }
  }

  function renderBrowser(browser, data, preferredEntryId = '') {
    const entries = data.entries || [];
    const categories = ['all', ...Array.from(new Set(entries.map(entry => entry.category).filter(Boolean))).sort()];
    browser.innerHTML = `
      <div class="section-heading">
        <p class="eyebrow">Campaign and system browser</p>
        <h2>Blacklight Continuum Wiki</h2>
        <p>${escapeHtml(data.index?.description || 'No Return Signal foundation entries.')}</p>
      </div>
      <div class="blacklight-controls">
        <input type="search" id="blacklight-search" placeholder="Search Q-MAP, Ar'nock, Charles, Archetypes, capabilities, jobs, equipment, or rules…">
        <button type="button" id="blacklight-reset" class="secondary-action">Reset</button>
        <div id="blacklight-categories" class="blacklight-categories"></div>
      </div>
      <div class="blacklight-layout">
        <div id="blacklight-list" class="blacklight-list"></div>
        <article id="blacklight-entry" class="blacklight-entry"></article>
      </div>`;

    const categoryTarget = browser.querySelector('#blacklight-categories');
    categories.forEach(category => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `blacklight-chip ${category === activeCategory ? 'active' : ''}`;
      button.textContent = category === 'all' ? 'All Categories' : category;
      button.addEventListener('click', () => {
        activeCategory = category;
        categoryTarget.querySelectorAll('button').forEach(item => item.classList.toggle('active', item === button));
        renderList(browser, entries, browser.querySelector('#blacklight-entry')?.dataset.entryId || entries[0]?.id);
      });
      categoryTarget.appendChild(button);
    });

    browser.querySelector('#blacklight-search')?.addEventListener('input', () => {
      renderList(browser, entries, browser.querySelector('#blacklight-entry')?.dataset.entryId || entries[0]?.id);
    });
    browser.querySelector('#blacklight-reset')?.addEventListener('click', () => {
      activeCategory = 'all';
      renderBrowser(browser, data);
    });

    const first = entries.find(entry => entry.id === preferredEntryId)
      || entries.find(entry => entry.id === 'blacklight-continuum-overview')
      || entries[0];
    renderList(browser, entries, first?.id);
    renderEntry(browser, entries, first?.id);
  }

  function entrySearchText(entry) {
    return [
      entry.title,
      entry.category,
      entry.summary,
      ...(entry.body || []),
      ...(entry.tags || []),
      ...(entry.keyFacts || []),
      ...(entry.playerFacing || []),
      ...(entry.gmNotes || [])
    ].join(' ').toLowerCase();
  }

  function renderList(browser, entries, activeId) {
    const list = browser.querySelector('#blacklight-list');
    if (!list) return;
    const query = (browser.querySelector('#blacklight-search')?.value || '').trim().toLowerCase();
    const filtered = entries.filter(entry => {
      if (activeCategory !== 'all' && entry.category !== activeCategory) return false;
      return !query || entrySearchText(entry).includes(query);
    });

    list.innerHTML = '';
    if (!filtered.length) {
      list.innerHTML = '<p class="helper-note">No entries match the current search and category.</p>';
      return;
    }

    filtered.forEach(entry => {
      const button = document.createElement('button');
      button.type = 'button';
      button.classList.toggle('active', entry.id === activeId);
      button.innerHTML = `<strong>${escapeHtml(entry.title)}</strong><small>${escapeHtml(entry.category || 'Reference')}</small>`;
      button.addEventListener('click', () => {
        renderEntry(browser, entries, entry.id);
        renderList(browser, entries, entry.id);
      });
      list.appendChild(button);
    });

    if (!filtered.some(entry => entry.id === activeId)) renderEntry(browser, entries, filtered[0].id);
  }

  function renderListSection(title, items, className = '') {
    if (!Array.isArray(items) || !items.length) return '';
    return `<h4>${escapeHtml(title)}</h4><ul class="${escapeHtml(className)}">${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
  }

  function renderTables(tables) {
    if (!Array.isArray(tables)) return '';
    return tables.map(table => `
      <h4>${escapeHtml(table.title || 'Table')}</h4>
      <div class="blacklight-table-wrap"><table class="blacklight-table">
        <thead><tr>${(table.columns || []).map(column => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead>
        <tbody>${(table.rows || []).map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>`).join('');
  }

  function renderEntry(browser, entries, entryId) {
    const target = browser.querySelector('#blacklight-entry');
    const entry = entries.find(item => item.id === entryId) || entries[0];
    if (!target || !entry) return;
    target.dataset.entryId = entry.id;

    const related = (entry.relatedEntries || [])
      .map(id => entries.find(item => item.id === id))
      .filter(Boolean);

    target.innerHTML = `
      <div class="blacklight-meta">${escapeHtml(entry.category || 'Reference')}</div>
      <h3>${escapeHtml(entry.title)}</h3>
      <p><strong>${escapeHtml(entry.summary || '')}</strong></p>
      ${(entry.body || []).map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}
      ${renderListSection('Key Facts', entry.keyFacts)}
      ${renderListSection('Player-Facing Information', entry.playerFacing)}
      ${renderListSection('Game Moderator Notes', entry.gmNotes)}
      ${renderTables(entry.tables)}
      ${entry.tags?.length ? `<div class="blacklight-callout"><strong>Tags:</strong> ${entry.tags.map(escapeHtml).join(' · ')}</div>` : ''}
      ${related.length ? `<h4>Related Entries</h4><div class="blacklight-related">${related.map(item => `<button class="blacklight-chip" type="button" data-related-entry="${escapeHtml(item.id)}">${escapeHtml(item.title)}</button>`).join('')}</div>` : ''}`;

    target.querySelectorAll('[data-related-entry]').forEach(button => {
      button.addEventListener('click', () => {
        const id = button.dataset.relatedEntry;
        renderEntry(browser, entries, id);
        renderList(browser, entries, id);
      });
    });
  }

  function initialize() {
    injectStyles();
    buildWorkspace();
    void refreshWorkspaceSummary();
  }

  initialize();
  window.BlacklightContinuumWorkspace = Object.freeze({ loadWiki, openBrowser });
})();
