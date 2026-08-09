(() => {
  'use strict';

  const VIEW_ID = 'blacklight-continuum';
  const INDEX_URL = 'data/blacklight-continuum/wiki/wiki-index.json';
  const EXTRA_PACK_URLS = [
    'data/blacklight-continuum/wiki/blacklight-facility-scene-modes.json',
    'data/blacklight-continuum/wiki/blacklight-facility-layout-guide.json',
    'data/blacklight-continuum/wiki/blacklight-foyer-attunement-antenna.json',
    'data/blacklight-continuum/wiki/blacklight-corporate-low-clearance.json',
    'data/blacklight-continuum/wiki/blacklight-personnel-portfolios.json',
    'data/blacklight-continuum/wiki/blacklight-emergency-protocols.json'
  ];
  let wikiData = null;
  let activeCategory = 'all';
  let activeSystemsView = 'records';

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function setCorporateAccess() {
    try { sessionStorage.setItem('blacklightCorporateInterfaceSeen', 'true'); } catch (_) {}
  }

  function requestedEntryId() {
    try { return new URLSearchParams(window.location.search).get('blacklight_entry') || ''; } catch (_) { return ''; }
  }

  function requestedSearch() {
    try { return new URLSearchParams(window.location.search).get('blacklight_search') || ''; } catch (_) { return ''; }
  }

  function activateBlacklightViewFromLink() {
    if (window.location.hash !== '#blacklight-continuum') return;
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === VIEW_ID));
    document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === VIEW_ID));
    document.dispatchEvent(new CustomEvent('hb:view-activated', { detail: { viewId: VIEW_ID } }));
  }

  function injectStyles() {
    if (!document.querySelector('link[href="blacklight-corporate-assets.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'blacklight-corporate-assets.css';
      document.head.appendChild(link);
    }
    if (document.getElementById('blacklight-continuum-style')) return;
    const style = document.createElement('style');
    style.id = 'blacklight-continuum-style';
    style.textContent = `
      #blacklight-continuum.blacklight-corp-body{padding-bottom:18px}
      #blacklight-continuum .bli-topbar{position:relative;border-radius:22px;margin:0 0 18px;padding-inline:18px}
      #blacklight-continuum .bli-hero{width:100%;margin:0 0 18px}
      #blacklight-continuum .bli-shell{width:100%}
      #blacklight-continuum .bli-ticker{border-radius:18px;margin-bottom:28px}
      #blacklight-continuum .bli-action{cursor:pointer}
      #blacklight-continuum .module-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}
      #blacklight-continuum .module-card{border:1px solid rgba(217,168,79,.30);border-radius:22px;padding:18px;background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.014)),rgba(9,8,7,.86);box-shadow:0 18px 60px rgba(0,0,0,.34);overflow:hidden}
      #blacklight-continuum .module-card::before{content:"";display:block;height:2px;margin:-18px -18px 16px;background:linear-gradient(90deg,var(--bli-gold),transparent 70%)}
      #blacklight-continuum .module-card h3{margin:0 0 8px;color:var(--bli-ink)}
      #blacklight-continuum .module-card p{color:var(--bli-muted);line-height:1.56}
      #blacklight-continuum .module-meta{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:12px}
      #blacklight-continuum .badge{display:inline-flex;align-items:center;min-height:24px;border:1px solid rgba(217,168,79,.42);border-radius:999px;padding:4px 8px;background:rgba(217,168,79,.11);color:#f4d296;font-size:.72rem;font-weight:900;text-transform:uppercase;letter-spacing:.07em}
      #blacklight-continuum .blacklight-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
      #blacklight-continuum .blacklight-system-tabs{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}
      #blacklight-continuum .blacklight-system-tab{border:1px solid rgba(217,168,79,.35);border-radius:999px;padding:8px 12px;background:rgba(255,255,255,.035);color:var(--bli-muted);font-weight:850;cursor:pointer}
      #blacklight-continuum .blacklight-system-tab.active,#blacklight-continuum .blacklight-system-tab:hover{border-color:var(--bli-gold);color:var(--bli-ink);background:rgba(217,168,79,.10)}
      #blacklight-continuum [data-blacklight-systems-panel][hidden]{display:none}
      #blacklight-continuum .blacklight-science-boundary{margin-top:12px;padding:10px 12px;border-left:3px solid var(--bli-gold);background:rgba(217,168,79,.07);color:var(--bli-muted);font-size:.82rem;line-height:1.5}
      .blacklight-browser{border:1px solid rgba(217,168,79,.32);border-radius:22px;padding:20px;background:rgba(0,0,0,.22);margin-top:32px}
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
      @media(max-width:900px){#blacklight-continuum .bli-topbar,.blacklight-layout,.blacklight-controls{grid-template-columns:1fr}.blacklight-list{max-height:none}}
    `;
    document.head.appendChild(style);
  }

  function setSystemsView(view) {
    activeSystemsView = view === 'science' ? 'science' : 'records';
    document.querySelectorAll('#blacklight-continuum [data-blacklight-systems-tab]').forEach(button => {
      const active = button.dataset.blacklightSystemsTab === activeSystemsView;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('#blacklight-continuum [data-blacklight-systems-panel]').forEach(panel => {
      panel.hidden = panel.dataset.blacklightSystemsPanel !== activeSystemsView;
    });
  }

  function sharedScientificTools() {
    const api = window.ScientificToolsWorkspace;
    if (!api) throw new Error('The centralized Scientific Tools workspace is unavailable. Reload the page before opening a shared scientific tool.');
    return api;
  }

  async function openSharedScientificTool(method, button) {
    try {
      const api = sharedScientificTools();
      if (typeof api[method] !== 'function') throw new Error(`Scientific Tools does not expose ${method}.`);
      return await api[method](button);
    } catch (error) {
      alert(error.message);
      return null;
    }
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Blacklight Continuum request failed: ${url} ${response.status}`);
    return response.json();
  }

  async function loadWiki() {
    if (wikiData) return wikiData;
    const index = await fetchJson(INDEX_URL);
    const packUrls = Array.from(new Set([...(index.packs || []), ...EXTRA_PACK_URLS]));
    const packs = await Promise.all(packUrls.map(fetchJson));
    const byId = new Map();
    packs.forEach(pack => (pack.entries || []).forEach(entry => {
      byId.set(entry.id, { ...(byId.get(entry.id) || {}), ...entry });
    }));
    wikiData = {
      index: { ...index, packs: packUrls },
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
    section.className = 'view blacklight-corp-body';
    section.setAttribute('aria-labelledby', 'blacklight-continuum-title');
    section.innerHTML = `
      <header class="bli-topbar no-print">
        <a class="bli-brand" href="blacklight-corporate.html" aria-label="Blacklight Intelligence corporate homepage">
          <span class="bli-mark" aria-hidden="true"></span>
          <span class="bli-brand-text"><span>Blacklight</span><span>Intelligence</span></span>
        </a>
        <nav class="bli-nav" aria-label="Blacklight landing navigation">
          <a href="#blacklight-corporate-systems">Systems</a>
          <a href="#blacklight-corporate-product">Charles Interface</a>
          <a href="#blacklight-corporate-contracts">Contracts</a>
          <a href="#blacklight-corporate-departments">Departments</a>
          <a href="blacklight-personnel.html">Personnel</a>
          <a href="blacklight-brand-assets.html">Corporate Standards</a>
        </nav>
      </header>

      <section class="bli-hero no-print" aria-labelledby="blacklight-continuum-title">
        <div>
          <p class="bli-eyebrow">Blacklight Intelligence public interface</p>
          <h2 id="blacklight-continuum-title" class="bli-page-title">Confidential systems deserve local intelligence.</h2>
          <p class="bli-lede">Blacklight Intelligence deploys Charles-branded secure voice operations interfaces for government, emergency, legal, medical, industrial, and security-conscious organizations that require local processing, auditability, controlled workflows, and resilient facility support.</p>
          <div class="bli-actions">
            <button id="blacklight-open-wiki" class="bli-action primary" type="button">Open Internal Archive</button>
            <button id="blacklight-open-corporate" class="bli-action" type="button">Open Corporate Records</button>
            <button id="blacklight-open-facility" class="bli-action" type="button">Open Facility Systems</button>
            <a class="bli-action" href="blacklight-personnel.html">Open Personnel</a>
            <a class="bli-action" href="blacklight-corporate.html">Open Standalone Site</a>
          </div>
        </div>
        <aside class="bli-directory-panel" aria-label="Corporate lobby wayfinding">
          <div class="bli-directory-title">Welcome</div>
          <div class="bli-directory-list">
            <div class="bli-directory-item"><span class="bli-icon" data-icon="visitors"></span><strong>Visitors</strong><span class="bli-arrow">←</span></div>
            <div class="bli-directory-item"><span class="bli-icon" data-icon="parking"></span><strong>Employee parking</strong><span class="bli-arrow">→</span></div>
            <div class="bli-directory-item"><span class="bli-icon" data-icon="deliveries"></span><strong>Deliveries</strong><span class="bli-arrow">→</span></div>
          </div>
          <div>
            <div class="bli-badge-row"><span class="bli-badge">localized AI</span><span class="bli-badge">secure voice</span><span class="bli-badge">audit-ready</span></div>
            <div class="bli-metric-grid">
              <div class="bli-stat"><strong>100%</strong><span>localized processing deployments available</span></div>
              <div class="bli-stat"><strong>24/7</strong><span>client operations and support desk coverage</span></div>
              <div class="bli-stat"><strong>C-0</strong><span>standard corporate baseline access model</span></div>
              <div class="bli-stat"><strong>BLKI</strong><span>corporate communications index</span></div>
            </div>
          </div>
        </aside>
      </section>

      <div class="bli-ticker no-print" aria-label="Corporate communications ticker">
        <div class="bli-ticker-track">
          <span>BLKI <b>▲ 2.4%</b> Secure Local Interface Growth</span><span>CHARLES EDGE SUITE <b>99.98%</b> Supported Uptime Window</span><span>PUBLIC SECTOR DEPLOYMENTS <b>EXPANDING</b></span><span>CONFIDENTIAL SYSTEMS VENDOR <b>AUDIT READY</b></span><span>LOCAL VOICE OPERATIONS <b>NO DEFAULT CLOUD ROUTING</b></span>
          <span>BLKI <b>▲ 2.4%</b> Secure Local Interface Growth</span><span>CHARLES EDGE SUITE <b>99.98%</b> Supported Uptime Window</span><span>PUBLIC SECTOR DEPLOYMENTS <b>EXPANDING</b></span><span>CONFIDENTIAL SYSTEMS VENDOR <b>AUDIT READY</b></span><span>LOCAL VOICE OPERATIONS <b>NO DEFAULT CLOUD ROUTING</b></span>
        </div>
      </div>

      <div class="bli-shell no-print">
        <section id="blacklight-corporate-systems" class="bli-section">
          <div class="bli-section-head"><p class="bli-eyebrow">Authorized systems directory</p><h2>Operational records, support interfaces, and scientific tools.</h2><p>Cleared personnel can reach Blacklight archive records and the shared Scientific Tools runtimes without maintaining setting-specific copies of those systems.</p></div>
          <div class="blacklight-system-tabs" role="tablist" aria-label="Blacklight systems sections">
            <button type="button" class="blacklight-system-tab active" data-blacklight-systems-tab="records" role="tab" aria-selected="true">Operational Records</button>
            <button type="button" class="blacklight-system-tab" data-blacklight-systems-tab="science" role="tab" aria-selected="false">Scientific Tools</button>
          </div>
          <div data-blacklight-systems-panel="records">
            <div class="module-grid" data-blacklight-entry-card-grid>
              <article class="module-card" data-blacklight-internal-archive-card="true">
                <div class="module-meta"><span class="badge status-active">archive</span><span class="badge">records</span><span class="badge">searchable</span></div>
                <h3>Blacklight Continuum Internal Archive</h3>
                <p>Search corporate operations, personnel references, facility systems, continuity records, capabilities, entities, equipment, and restricted terminology.</p>
                <div class="blacklight-actions"><button id="blacklight-open-archive-card" class="primary-action" type="button">Open Internal Archive</button></div>
              </article>
            </div>
          </div>
          <div class="module-grid" data-blacklight-systems-panel="science" hidden>
            <article class="module-card">
              <div class="module-meta"><span class="badge status-active">scientific tools</span><span class="badge">binary cube</span><span class="badge">shared runtime</span></div>
              <h3>Binary Cube Encoder Visualizer</h3>
              <p>Open the same canonical authenticated Binary Cube visualizer used by Shadowrun and the top-level Scientific Tools workspace. Keys, masks, traces, ciphertext, package validation, and rendering all remain owned by that single implementation.</p>
              <div class="blacklight-actions"><button id="blacklight-open-binary-cube-visualizer" class="primary-action" type="button">Open Visualizer</button><button id="blacklight-open-binary-cube-laboratory" class="secondary-action" type="button">Open Laboratory</button></div>
              <div class="blacklight-science-boundary">Shared-runtime boundary: Black Light is a launcher and context surface only. It does not fork or reinterpret the Binary Cube encoding algorithm.</div>
            </article>
            <article class="module-card">
              <div class="module-meta"><span class="badge status-active">scientific tools</span><span class="badge">phase light</span><span class="badge">ISM</span></div>
              <h3>Interstellar Media Collisions Lab</h3>
              <p>Open the setting-neutral phase-light and interstellar-medium collision simulator maintained under Scientific Tools.</p>
              <div class="blacklight-actions"><button id="blacklight-open-ism" class="primary-action" type="button">Open Collisions Lab</button></div>
              <div class="blacklight-science-boundary">Physical particle coordinates and Λ scaling remain separate from the deliberate Shadow-key scattering operator.</div>
            </article>
          </div>
        </section>

        <section id="blacklight-corporate-product" class="bli-section">
          <div class="bli-section-head"><p class="bli-eyebrow">Charles secure voice operations</p><h2>Not a consumer assistant. A controlled local interface.</h2><p>Charles deployments are built for sensitive rooms, secure workflows, policy-bound documents, and local operations that cannot safely route speech and records through consumer infrastructure.</p></div>
          <div class="bli-card-grid">
            <article class="bli-card"><div class="bli-badge-row"><span class="bli-badge">local LLM</span></div><h3>Localized Intelligence Stack</h3><p>Client-specific language models, speech recognition, text-to-speech, and document indexes run inside approved deployment boundaries.</p></article>
            <article class="bli-card"><div class="bli-badge-row"><span class="bli-badge">workflow</span></div><h3>Operations Interface</h3><p>Hands-free checklists, procedural lookups, and facility announcements stay inside client-defined permissions.</p></article>
            <article class="bli-card"><div class="bli-badge-row"><span class="bli-badge">audit</span></div><h3>Compliance Visibility</h3><p>Usage, support actions, permissions, and changes are logged according to contract, legal, and privacy requirements.</p></article>
            <article class="bli-card"><div class="bli-badge-row"><span class="bli-badge">support</span></div><h3>Deployment Support</h3><p>Blacklight teams coordinate hardware images, local configuration, training, maintenance windows, and client success operations.</p></article>
          </div>
        </section>

        <section id="blacklight-corporate-contracts" class="bli-section">
          <div class="bli-section-head"><p class="bli-eyebrow">Contract categories</p><h2>Public-sector, secure-facility, and enterprise work.</h2><p>Blacklight supports sensitive institutions that need voice tools without uncontrolled cloud exposure.</p></div>
          <div class="bli-card-grid">
            <article class="bli-card"><h3>Government Administration</h3><p>Secure office assistance, records workflow, scheduling support, and local document retrieval.</p></article>
            <article class="bli-card"><h3>Emergency Operations</h3><p>Hands-free checklists, incident-room coordination, shift notes, and resilient local prompts.</p></article>
            <article class="bli-card"><h3>Medical and Legal Environments</h3><p>Privilege-aware, policy-bound, non-diagnostic administrative and procedural support.</p></article>
            <article class="bli-card"><h3>Security and Industrial Sites</h3><p>Local facility interface, safety procedures, manuals, shift logs, and controlled vocabulary support.</p></article>
          </div>
        </section>

        <section id="blacklight-corporate-departments" class="bli-section">
          <div class="bli-section-head"><p class="bli-eyebrow">Corporate organization</p><h2>Departments built for continuity.</h2><p>Employees route ordinary concerns through payroll, HR, engineering, compliance, finance, client operations, security, and facilities before escalating to executive offices.</p></div>
          <div class="bli-card-grid">
            <article class="bli-card"><span class="bli-icon" data-icon="voice"></span><h3>Product and Engineering</h3><p>Product Management, Voice and Language Engineering, Secure Deployment Engineering, and Research Evaluation maintain the public Charles stack.</p></article>
            <article class="bli-card"><span class="bli-icon" data-icon="ops"></span><h3>Client and Commercial</h3><p>Client Operations, Sales, Public Relations, Communications, and Executive Office teams support customer trust and growth.</p></article>
            <article class="bli-card"><span class="bli-icon" data-icon="hr"></span><h3>People and Administration</h3><p>Human Resources, Finance, Payroll, Legal, Compliance, and employee programs keep the company functional.</p></article>
            <article class="bli-card"><span class="bli-icon" data-icon="security"></span><h3>Security and Facilities</h3><p>Security Operations and Facilities keep employees, visitors, systems, and the O-shaped headquarters operating safely.</p></article>
          </div>
        </section>
      </div>
      <section id="blacklight-browser" class="blacklight-browser no-print" hidden></section>`;
    main.appendChild(section);

    section.querySelector('#blacklight-open-corporate')?.addEventListener('click', () => openBrowser('blacklight-public-corporate-overview'));
    section.querySelector('#blacklight-open-wiki')?.addEventListener('click', () => openBrowser());
    section.querySelector('#blacklight-open-archive-card')?.addEventListener('click', () => openBrowser());
    section.querySelector('#blacklight-open-facility')?.addEventListener('click', () => openBrowser('foyer-art-subspace-attunement-fork'));
    section.querySelector('#blacklight-open-binary-cube-visualizer')?.addEventListener('click', event => void openSharedScientificTool('openBinaryCubeVisualizer', event.currentTarget));
    section.querySelector('#blacklight-open-binary-cube-laboratory')?.addEventListener('click', event => void openSharedScientificTool('openBinaryCubeLaboratory', event.currentTarget));
    section.querySelector('#blacklight-open-ism')?.addEventListener('click', event => void openSharedScientificTool('openIsmSimulation', event.currentTarget));
    section.querySelectorAll('[data-blacklight-systems-tab]').forEach(button => {
      button.addEventListener('click', () => setSystemsView(button.dataset.blacklightSystemsTab));
    });
    setSystemsView(activeSystemsView);
  }

  async function openBrowser(preferredEntryId = '', initialSearch = '') {
    setCorporateAccess();
    const browser = document.getElementById('blacklight-browser');
    if (!browser) return;
    browser.hidden = false;
    browser.innerHTML = '<p class="helper-note">Loading Blacklight Continuum records…</p>';
    try {
      const data = await loadWiki();
      renderBrowser(browser, data, preferredEntryId, initialSearch);
      browser.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (_) {
      browser.innerHTML = '<p class="helper-note">The Blacklight Continuum archive could not be loaded. Serve the project through GitHub Pages or a local web server.</p>';
    }
  }

  function renderBrowser(browser, data, preferredEntryId = '', initialSearch = '') {
    const entries = data.entries || [];
    const categories = ['all', ...Array.from(new Set(entries.map(entry => entry.category).filter(Boolean))).sort()];
    browser.innerHTML = `
      <div class="section-heading">
        <p class="eyebrow">Archive and system browser</p>
        <h2>Blacklight Continuum Internal Archive</h2>
        <p>${escapeHtml(data.index?.description || 'Blacklight foundation entries.')}</p>
      </div>
      <div class="blacklight-controls">
        <input type="search" id="blacklight-search" placeholder="Search Q-MAP, Ar'nock, Charles, corporate operations, personnel, leadership, facility systems, Archetypes, capabilities, equipment, or rules…">
        <button type="button" id="blacklight-reset" class="secondary-action">Reset</button>
        <div id="blacklight-categories" class="blacklight-categories"></div>
      </div>
      <div class="blacklight-layout">
        <div id="blacklight-list" class="blacklight-list"></div>
        <article id="blacklight-entry" class="blacklight-entry"></article>
      </div>`;

    const searchInput = browser.querySelector('#blacklight-search');
    if (searchInput && initialSearch) searchInput.value = initialSearch;

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
    activateBlacklightViewFromLink();
    const entry = requestedEntryId();
    const search = requestedSearch();
    if (window.location.hash === '#blacklight-continuum' && (entry || search)) {
      window.setTimeout(() => openBrowser(entry, search), 150);
    }
  }

  initialize();
  window.BlacklightContinuumWorkspace = Object.freeze({ loadWiki, openBrowser, setSystemsView, openSharedScientificTool });
})();