(() => {
  const WIKI_URL = 'data/kaysender/wiki/entries.json';
  let wikiData = null;
  let activeCategory = 'all';

  const moduleEntryMap = {
    'kaysender-wiki': ['kaysender-overview', 'messara', 'floating-islands'],
    'kaysender-compatibility-scanner': ['kaysender-overview'],
    'floating-island-generator': ['floating-islands', 'scarcity-loop', 'sky-ecology'],
    'world-map-route-generator': ['messara', 'floating-islands', 'surveyors-guild'],
    'settlement-generator': ['floating-islands', 'scarcity-loop', 'dragon-lords', 'water-trade'],
    'city-district-generator': ['messara', 'valeria-valthorn', 'water-trade'],
    'population-generator': ['messara', 'scarcity-loop'],
    'shop-market-generator': ['water-trade', 'skyweaver-consortium', 'black-fleet'],
    'airship-vessel-generator': ['airships', 'black-fleet', 'surveyors-guild'],
    'airship-core-builder': ['airships', 'skyweaver-consortium'],
    'crafting-gadget-creator': ['skyweaver-consortium', 'airships'],
    'supply-water-planner': ['scarcity-loop', 'water-trade', 'airships'],
    'faction-guild-generator': ['dragon-lords', 'black-fleet', 'surveyors-guild', 'skyweaver-consortium'],
    'black-market-piracy-generator': ['black-fleet', 'water-trade', 'airships'],
    'encounter-generator': ['floating-islands', 'black-fleet', 'dragon-lords', 'sky-ecology'],
    'sky-ecology-generator': ['sky-ecology', 'floating-islands'],
    'npc-crew-generator': ['airships', 'surveyors-guild'],
    'job-board-generator': ['surveyors-guild', 'scarcity-loop', 'black-fleet'],
    'draconic-tithe-generator': ['dragon-lords', 'scarcity-loop', 'water-trade'],
    'organization-operations-tracker': ['skyweaver-consortium', 'surveyors-guild', 'black-fleet']
  };

  function injectStyles() {
    if (document.getElementById('kaysender-wiki-style')) return;
    const style = document.createElement('style');
    style.id = 'kaysender-wiki-style';
    style.textContent = `
      .wiki-link-strip {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }
      .wiki-chip-button {
        border: 1px solid var(--line);
        border-radius: 999px;
        background: rgba(255,255,255,0.04);
        color: var(--muted);
        padding: 5px 9px;
        font-size: 0.75rem;
      }
      .wiki-chip-button:hover {
        border-color: var(--accent);
        color: var(--ink);
      }
      .wiki-panel {
        border: 1px solid var(--line);
        border-radius: 24px;
        padding: 22px;
        margin: 18px 0 28px;
        background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.025));
        box-shadow: var(--shadow);
      }
      .wiki-controls {
        display: grid;
        grid-template-columns: minmax(220px, 1fr) auto;
        gap: 12px;
        align-items: end;
        margin-bottom: 16px;
      }
      .wiki-controls input {
        background: #10131a;
        border: 1px solid var(--line);
        color: var(--ink);
        border-radius: 12px;
        padding: 10px 12px;
      }
      .wiki-category-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        grid-column: 1 / -1;
      }
      .wiki-layout {
        display: grid;
        grid-template-columns: 320px 1fr;
        gap: 16px;
        align-items: start;
      }
      .wiki-list {
        display: grid;
        gap: 8px;
      }
      .wiki-list button {
        text-align: left;
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 10px 12px;
        background: rgba(0,0,0,0.18);
        color: var(--ink);
      }
      .wiki-list button.active,
      .wiki-list button:hover {
        border-color: var(--accent);
        background: rgba(200,138,53,0.12);
      }
      .wiki-entry-view {
        border: 1px solid rgba(200,138,53,0.35);
        border-radius: 18px;
        padding: 18px;
        background: rgba(0,0,0,0.18);
      }
      .wiki-entry-view h3 { margin-bottom: 6px; }
      .wiki-entry-meta { color: var(--accent); font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.78rem; }
      .wiki-entry-view p { color: var(--muted); line-height: 1.55; }
      .wiki-related { margin-top: 18px; }
      .wiki-related h4 { color: var(--accent); }
      @media (max-width: 900px) {
        .wiki-controls, .wiki-layout { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  async function loadWiki() {
    if (wikiData) return wikiData;
    const response = await fetch(WIKI_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Wiki request failed: ${response.status}`);
    wikiData = await response.json();
    return wikiData;
  }

  function switchKaysenderView() {
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === 'kaysender'));
    document.querySelectorAll('.nav-button').forEach(button => button.classList.toggle('active', button.dataset.view === 'kaysender'));
  }

  function getPanel() {
    let panel = document.getElementById('kaysender-wiki-panel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'kaysender-wiki-panel';
      panel.className = 'wiki-panel no-print';
      const status = document.getElementById('kaysender-status');
      if (status) status.insertAdjacentElement('afterend', panel);
      else document.getElementById('kaysender')?.prepend(panel);
    }
    return panel;
  }

  async function openWiki(preferredEntryId = 'kaysender-overview') {
    injectStyles();
    switchKaysenderView();
    const panel = getPanel();
    panel.innerHTML = '<p class="helper-note">Loading Kaysender wiki entries…</p>';

    try {
      const data = await loadWiki();
      renderWiki(panel, data, preferredEntryId);
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      panel.innerHTML = '<p class="helper-note">Kaysender wiki could not be loaded. Confirm GitHub Pages or a local web server is serving JSON files.</p>';
    }
  }

  function renderWiki(panel, data, preferredEntryId) {
    const entries = data.entries || [];
    const categories = ['all', ...Array.from(new Set(entries.map(entry => entry.category))).sort()];
    const startEntry = entries.find(entry => entry.id === preferredEntryId) || entries[0];

    panel.innerHTML = `
      <div class="section-heading">
        <p class="eyebrow">Kaysender hypertext wiki</p>
        <h2>Setting Wiki Browser</h2>
        <p>Search lore entries and jump from setting information to related campaign tools. This is the first cross-link layer between manuscript extraction, wiki pages, generators, and open d20 conversion utilities.</p>
      </div>
      <div class="wiki-controls">
        <input id="wiki-search" type="search" placeholder="Search Kaysender wiki entries..." />
        <button id="wiki-reset" class="secondary-action" type="button">Reset</button>
        <div id="wiki-categories" class="wiki-category-row"></div>
      </div>
      <div class="wiki-layout">
        <div id="wiki-list" class="wiki-list"></div>
        <article id="wiki-entry-view" class="wiki-entry-view"></article>
      </div>
    `;

    const categoryTarget = panel.querySelector('#wiki-categories');
    categories.forEach(category => {
      const button = document.createElement('button');
      button.className = `wiki-chip-button ${category === activeCategory ? 'active' : ''}`;
      button.type = 'button';
      button.textContent = category === 'all' ? 'All Categories' : category;
      button.addEventListener('click', () => {
        activeCategory = category;
        renderWikiList(panel, entries, startEntry.id);
      });
      categoryTarget.appendChild(button);
    });

    panel.querySelector('#wiki-search').addEventListener('input', () => renderWikiList(panel, entries, startEntry.id));
    panel.querySelector('#wiki-reset').addEventListener('click', () => {
      activeCategory = 'all';
      panel.querySelector('#wiki-search').value = '';
      renderWiki(panel, data, 'kaysender-overview');
    });

    renderWikiList(panel, entries, startEntry.id);
    renderEntry(panel, entries, startEntry.id);
  }

  function renderWikiList(panel, entries, activeId) {
    const query = (panel.querySelector('#wiki-search')?.value || '').toLowerCase().trim();
    const list = panel.querySelector('#wiki-list');
    if (!list) return;
    list.innerHTML = '';

    const filtered = entries.filter(entry => {
      const categoryOk = activeCategory === 'all' || entry.category === activeCategory;
      const searchOk = !query || [entry.title, entry.category, entry.summary, ...(entry.tags || [])].join(' ').toLowerCase().includes(query);
      return categoryOk && searchOk;
    });

    if (!filtered.length) {
      list.innerHTML = '<p class="helper-note">No wiki entries match the current search.</p>';
      return;
    }

    filtered.forEach(entry => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = entry.id === activeId ? 'active' : '';
      button.innerHTML = `<strong>${entry.title}</strong><br><small>${entry.category}</small>`;
      button.addEventListener('click', () => renderEntry(panel, entries, entry.id));
      list.appendChild(button);
    });
  }

  function renderEntry(panel, entries, entryId) {
    const entry = entries.find(item => item.id === entryId) || entries[0];
    const view = panel.querySelector('#wiki-entry-view');
    if (!entry || !view) return;

    panel.querySelectorAll('#wiki-list button').forEach(button => {
      button.classList.toggle('active', button.textContent.includes(entry.title));
    });

    view.innerHTML = '';
    const meta = document.createElement('div');
    meta.className = 'wiki-entry-meta';
    meta.textContent = entry.category;
    const title = document.createElement('h3');
    title.textContent = entry.title;
    const summary = document.createElement('p');
    summary.innerHTML = `<strong>${entry.summary}</strong>`;

    view.append(meta, title, summary);
    (entry.body || []).forEach(paragraph => {
      const p = document.createElement('p');
      p.textContent = paragraph;
      view.appendChild(p);
    });

    appendChips(view, 'Tags', entry.tags || [], tag => {
      const search = panel.querySelector('#wiki-search');
      if (search) search.value = tag;
      renderWikiList(panel, entries, entry.id);
    });

    appendEntryLinks(view, entries, entry.relatedEntries || []);
    appendModuleLinks(view, entry.relatedModules || []);
  }

  function appendChips(parent, title, values, onClick) {
    if (!values.length) return;
    const wrap = document.createElement('div');
    wrap.className = 'wiki-related';
    const h4 = document.createElement('h4');
    h4.textContent = title;
    const strip = document.createElement('div');
    strip.className = 'wiki-link-strip';
    values.forEach(value => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'wiki-chip-button';
      button.textContent = value;
      button.addEventListener('click', () => onClick(value));
      strip.appendChild(button);
    });
    wrap.append(h4, strip);
    parent.appendChild(wrap);
  }

  function appendEntryLinks(parent, entries, ids) {
    const linked = ids.map(id => entries.find(entry => entry.id === id)).filter(Boolean);
    if (!linked.length) return;
    appendChips(parent, 'Related wiki entries', linked.map(entry => entry.title), title => {
      const entry = entries.find(item => item.title === title);
      if (entry) renderEntry(getPanel(), entries, entry.id);
    });
  }

  function appendModuleLinks(parent, ids) {
    if (!ids.length) return;
    appendChips(parent, 'Related tools and generators', ids.map(id => id.replace(/-/g, ' ')), label => {
      const moduleId = label.replace(/ /g, '-');
      const search = document.getElementById('kaysender-search');
      if (search) search.value = moduleId;
      document.querySelectorAll('.registry-filter').forEach(filter => filter.classList.toggle('active', filter.dataset.kaysenderFilter === 'all'));
      if (typeof window.renderKaysenderOverview === 'function') window.renderKaysenderOverview();
      document.getElementById('kaysender-overview-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function decorateCards() {
    injectStyles();
    document.querySelectorAll('.module-card').forEach(card => {
      const moduleId = card.dataset.moduleId;
      if (!moduleId || card.dataset.wikiLinked === 'true') return;
      const entryIds = moduleEntryMap[moduleId] || [];

      if (moduleId === 'kaysender-wiki') {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'primary-action alpha-launch';
        button.textContent = 'Launch Alpha Wiki';
        button.addEventListener('click', () => openWiki('kaysender-overview'));
        card.appendChild(button);
      }

      if (entryIds.length) {
        const strip = document.createElement('div');
        strip.className = 'wiki-link-strip';
        entryIds.slice(0, 3).forEach(entryId => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'wiki-chip-button';
          button.textContent = entryId.replace(/-/g, ' ');
          button.addEventListener('click', () => openWiki(entryId));
          strip.appendChild(button);
        });
        card.appendChild(strip);
      }

      card.dataset.wikiLinked = 'true';
    });
  }

  window.openKaysenderWiki = openWiki;
  window.renderKaysenderOverview = window.renderKaysenderOverview || undefined;

  const observer = new MutationObserver(decorateCards);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', decorateCards);
  setInterval(decorateCards, 1000);
})();
