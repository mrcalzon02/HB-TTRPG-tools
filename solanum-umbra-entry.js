(() => {
  const VIEW_ID = 'solanum-umbra';
  const INDEX_URL = 'data/solanum-umbra/wiki/wiki-index.json';
  let wikiData = null;
  let activeCategory = 'all';

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function humanize(value) {
    return String(value ?? '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]/g, ' ')
      .replace(/^./, char => char.toUpperCase());
  }

  function injectStyles() {
    if (document.getElementById('solanum-umbra-wiki-style')) return;
    const style = document.createElement('style');
    style.id = 'solanum-umbra-wiki-style';
    style.textContent = `
      .solanum-browser{border:1px solid var(--line);border-radius:22px;padding:20px;background:rgba(0,0,0,.2)}
      .solanum-controls{display:grid;grid-template-columns:minmax(240px,1fr) auto;gap:10px;margin-bottom:14px}
      .solanum-controls input{background:#10131a;border:1px solid var(--line);color:var(--ink);border-radius:12px;padding:10px 12px}
      .solanum-categories,.solanum-related{display:flex;flex-wrap:wrap;gap:7px;grid-column:1/-1}
      .solanum-chip{border:1px solid var(--line);border-radius:999px;padding:5px 9px;background:rgba(255,255,255,.04);color:var(--muted)}
      .solanum-chip.active,.solanum-chip:hover{color:var(--ink);border-color:var(--accent)}
      .solanum-layout{display:grid;grid-template-columns:320px 1fr;gap:14px}
      .solanum-list{display:grid;gap:8px;max-height:70vh;overflow:auto}
      .solanum-list button{ text-align:left;border:1px solid var(--line);border-radius:13px;padding:10px;background:rgba(255,255,255,.025);color:var(--ink)}
      .solanum-list button.active,.solanum-list button:hover{border-color:var(--accent);background:rgba(200,138,53,.1)}
      .solanum-entry{border:1px solid rgba(200,138,53,.35);border-radius:16px;padding:18px;background:rgba(0,0,0,.16)}
      .solanum-entry h3{margin:3px 0 6px}.solanum-entry h4{color:var(--accent);margin:20px 0 8px}.solanum-entry h5{color:var(--ink);margin:14px 0 6px}
      .solanum-meta{color:var(--accent);font-weight:800;text-transform:uppercase;letter-spacing:.08em;font-size:.75rem}
      .solanum-entry p,.solanum-entry li{color:var(--muted);line-height:1.58}.solanum-step-list,.solanum-field-list{margin-left:20px}
      .solanum-table-wrap{overflow-x:auto;margin:12px 0 18px}.solanum-table{width:100%;min-width:620px;border-collapse:collapse;font-size:.88rem;color:var(--muted)}
      .solanum-table th,.solanum-table td{border:1px solid var(--line);padding:9px;text-align:left;vertical-align:top}.solanum-table th{color:var(--ink);background:rgba(200,138,53,.12)}
      .solanum-table tbody tr:nth-child(even){background:rgba(255,255,255,.025)}
      .solanum-formula,.solanum-example{border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:7px 0;color:var(--ink);background:rgba(255,255,255,.035)}
      .solanum-example{border-color:rgba(200,138,53,.4)}.solanum-example-grid{display:grid;grid-template-columns:minmax(140px,.4fr) 1fr;gap:6px 12px}.solanum-example-key{color:var(--accent);font-weight:800}
      .solanum-enemy-card{border:1px solid rgba(200,138,53,.35);border-radius:14px;padding:12px;margin:9px 0;background:rgba(0,0,0,.22)}
      .solanum-enemy-title{color:var(--ink);font-weight:800;margin-bottom:4px}.solanum-enemy-meta{color:var(--accent);font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em}.solanum-enemy-card p{margin:6px 0}
      .solanum-source-note{border-left:3px solid var(--accent);padding-left:12px;margin-top:14px;color:var(--muted)}
      @media(max-width:900px){.solanum-layout,.solanum-controls{grid-template-columns:1fr}.solanum-list{max-height:none}.solanum-example-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Solanum Umbra request failed: ${url} ${response.status}`);
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
      entries: Array.from(byId.values()).sort((a, b) =>
        (a.category || '').localeCompare(b.category || '') ||
        (a.title || '').localeCompare(b.title || '')
      )
    };
    return wikiData;
  }

  function switchToSolanum() {
    document.querySelectorAll('.view').forEach(view => {
      view.classList.toggle('active', view.id === VIEW_ID);
    });
    document.querySelectorAll('.nav-button').forEach(button => {
      button.classList.toggle('active', button.dataset.view === VIEW_ID);
    });
  }

  function bindLaunchButtons() {
    document.querySelectorAll(`[data-view="${VIEW_ID}"]`).forEach(button => {
      if (button.dataset.solanumBound === 'true') return;
      button.addEventListener('click', event => {
        event.preventDefault();
        switchToSolanum();
      });
      button.dataset.solanumBound = 'true';
    });
  }

  function buildTab() {
    const nav = document.querySelector('.top-nav');
    if (!nav) return;
    let button = nav.querySelector(`[data-view="${VIEW_ID}"]`);
    if (!button) {
      button = document.createElement('button');
      button.className = 'nav-button';
      button.dataset.view = VIEW_ID;
      button.textContent = 'Solanum Umbra';
      nav.appendChild(button);
    }
    bindLaunchButtons();
  }

  function buildWorkspace() {
    const main = document.querySelector('main');
    if (!main || document.getElementById(VIEW_ID)) return;
    const section = document.createElement('section');
    section.id = VIEW_ID;
    section.className = 'view';
    section.setAttribute('aria-labelledby', 'solanum-umbra-title');
    section.innerHTML = `
      <div class="hero-card no-print">
        <p class="eyebrow">Solanum Umbra native-system workspace</p>
        <h2 id="solanum-umbra-title">Native Rules Wiki Import</h2>
        <p>The verified 248-page source is present in <code>SRC/</code>. Mechanics are indexed as written rather than converted into another game.</p>
      </div>
      <div class="module-grid no-print">
        <article class="module-card">
          <div class="module-meta"><span class="badge status-active">source verified</span><span class="badge">248 pages</span><span class="badge status-active">binary present</span></div>
          <h3>Solanum Umbra TTRPG Manuscript</h3>
          <p>The PDF matches the registered byte count and SHA-256 digest.</p>
          <a class="primary-action" href="SRC/Solanum-Umbra-TTRPG.pdf" target="_blank" rel="noopener">Open Source PDF</a>
          <a class="secondary-action" href="source-page-references/Solanum-Umbra-TTRPG.source.json" target="_blank" rel="noopener">Open Source Receipt</a>
        </article>
        <article class="module-card">
          <div class="module-meta"><span id="solanum-pack-count" class="badge status-active">loading packs</span><span id="solanum-entry-count" class="badge status-active">loading entries</span><span class="badge">native mechanics</span></div>
          <h3>Native Foundation Import</h3>
          <p id="solanum-scope-summary">Loading the current native import scope…</p>
          <button id="solanum-open-browser" class="primary-action" type="button">Open Native Wiki</button>
        </article>
        <article class="module-card">
          <div class="module-meta"><span class="badge status-planned">next imports</span></div>
          <h3>Remaining Native Systems</h3>
          <p id="solanum-next-imports">Loading the current import roadmap…</p>
        </article>
      </div>
      <section id="solanum-browser" class="solanum-browser no-print" hidden></section>`;
    main.appendChild(section);

    section.querySelector('#solanum-open-browser')?.addEventListener('click', async () => {
      const browser = section.querySelector('#solanum-browser');
      browser.hidden = false;
      browser.innerHTML = '<p class="helper-note">Loading Solanum Umbra native rules…</p>';
      try {
        const data = await loadWiki();
        renderBrowser(browser, data);
        browser.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (error) {
        browser.innerHTML = '<p class="helper-note">The Solanum Umbra wiki could not be loaded. Serve the project through GitHub Pages or a local web server.</p>';
      }
    });

    bindLaunchButtons();
  }

  async function refreshWorkspaceSummary() {
    try {
      const data = await loadWiki();
      const packCount = data.index.packs?.length || 0;
      const entryCount = data.entries.length;
      const packBadge = document.getElementById('solanum-pack-count');
      const entryBadge = document.getElementById('solanum-entry-count');
      const scope = document.getElementById('solanum-scope-summary');
      const next = document.getElementById('solanum-next-imports');
      if (packBadge) packBadge.textContent = `${packCount} pack${packCount === 1 ? '' : 's'}`;
      if (entryBadge) entryBadge.textContent = `${entryCount} entr${entryCount === 1 ? 'y' : 'ies'}`;
      if (scope) scope.textContent = data.index.description || 'Native rules import active.';
      if (next) next.textContent = (data.index.nextImportAreas || []).map(humanize).join(', ') || 'Additional native source passes remain planned.';
    } catch (error) {
      const scope = document.getElementById('solanum-scope-summary');
      if (scope) scope.textContent = 'Native wiki data will load when the site is served through GitHub Pages or a local web server.';
    }
  }

  function renderBrowser(browser, data) {
    const entries = data.entries || [];
    const categories = ['all', ...Array.from(new Set(entries.map(entry => entry.category))).sort()];
    browser.innerHTML = `
      <div class="section-heading">
        <p class="eyebrow">Native rules browser</p>
        <h2>Solanum Umbra Wiki</h2>
        <p>${escapeHtml(data.index?.description || 'Source mechanics are presented as written.')} Unresolved source ambiguities remain visible.</p>
      </div>
      <div class="solanum-controls">
        <input type="search" id="solanum-search" placeholder="Search characters, advancement, cybernetics, crafting, equipment, combat, enemies, or entities..." />
        <button type="button" id="solanum-reset" class="secondary-action">Reset</button>
        <div id="solanum-categories" class="solanum-categories"></div>
      </div>
      <div class="solanum-layout">
        <div id="solanum-list" class="solanum-list"></div>
        <article id="solanum-entry" class="solanum-entry"></article>
      </div>`;

    const categoryTarget = browser.querySelector('#solanum-categories');
    categories.forEach(category => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `solanum-chip ${category === activeCategory ? 'active' : ''}`;
      button.textContent = category === 'all' ? 'All Categories' : category;
      button.addEventListener('click', () => {
        activeCategory = category;
        categoryTarget.querySelectorAll('button').forEach(item => item.classList.toggle('active', item === button));
        renderList(browser, entries, browser.querySelector('#solanum-entry')?.dataset.entryId || entries[0]?.id);
      });
      categoryTarget.appendChild(button);
    });

    browser.querySelector('#solanum-search')?.addEventListener('input', () => {
      renderList(browser, entries, browser.querySelector('#solanum-entry')?.dataset.entryId || entries[0]?.id);
    });
    browser.querySelector('#solanum-reset')?.addEventListener('click', () => {
      activeCategory = 'all';
      renderBrowser(browser, data);
    });

    const first = entries.find(entry => entry.id === 'solanum-character-creation-system') || entries[0];
    renderList(browser, entries, first?.id);
    renderEntry(browser, entries, first?.id);
  }

  function renderList(browser, entries, activeId) {
    const list = browser.querySelector('#solanum-list');
    const query = (browser.querySelector('#solanum-search')?.value || '').trim().toLowerCase();
    const filtered = entries.filter(entry => {
      if (activeCategory !== 'all' && entry.category !== activeCategory) return false;
      return !query || entrySearchText(entry).toLowerCase().includes(query);
    });
    list.innerHTML = '';
    if (!filtered.length) {
      list.innerHTML = '<p class="helper-note">No native wiki entries match the current search.</p>';
      return;
    }
    filtered.forEach(entry => {
      const details = [];
      if ((entry.tables || []).length) details.push(`${entry.tables.length} table${entry.tables.length === 1 ? '' : 's'}`);
      if ((entry.enemyProfiles || []).length) details.push(`${entry.enemyProfiles.length} profiles`);
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.entryId = entry.id;
      button.className = entry.id === activeId ? 'active' : '';
      button.innerHTML = `<strong>${escapeHtml(entry.title)}</strong><br><small>${escapeHtml(entry.category)}${details.length ? ` · ${details.map(escapeHtml).join(' · ')}` : ''}</small>`;
      button.addEventListener('click', () => renderEntry(browser, entries, entry.id));
      list.appendChild(button);
    });
  }

  function renderEntry(browser, entries, entryId) {
    const entry = entries.find(item => item.id === entryId) || entries[0];
    const view = browser.querySelector('#solanum-entry');
    if (!entry || !view) return;
    view.dataset.entryId = entry.id;
    browser.querySelectorAll('#solanum-list button').forEach(button => button.classList.toggle('active', button.dataset.entryId === entry.id));
    view.innerHTML = `<div class="solanum-meta">${escapeHtml(entry.category)}</div><h3>${escapeHtml(entry.title)}</h3><p><strong>${escapeHtml(entry.summary)}</strong></p>`;
    (entry.body || []).forEach(text => appendParagraph(view, text));
    renderOrderedList(view, 'Creation sequence', entry.creationSequence);
    renderOrderedList(view, 'Generation sequence', entry.generationSequence);
    renderOrderedList(view, 'Native procedure', entry.procedure);
    renderFormulaRecords(view, entry.formulas, 'Native formulas');
    renderTables(view, entry.tables || []);
    renderCharacterSheet(view, entry.characterSheetFields || []);
    renderFormulaRecords(view, entry.formulaFields, 'Calculated sheet fields');
    renderWorkedExample(view, entry.workedExample);
    renderEnemyProfiles(view, entry.enemyProfiles || []);
    renderRelatedEntries(view, entries, entry.relatedEntries || [], browser);
    renderSourceRefs(view, entry.sourceRefs || []);
  }

  function renderOrderedList(parent, title, values) {
    if (!Array.isArray(values) || !values.length) return;
    appendHeading(parent, title);
    const list = document.createElement('ol');
    list.className = 'solanum-step-list';
    values.forEach(value => {
      const item = document.createElement('li');
      item.textContent = value;
      list.appendChild(item);
    });
    parent.appendChild(list);
  }

  function renderFormulaRecords(parent, records, title) {
    if (!Array.isArray(records) || !records.length) return;
    appendHeading(parent, title);
    records.forEach(record => {
      const formula = document.createElement('div');
      formula.className = 'solanum-formula';
      const name = record.field || record.name || 'Formula';
      formula.textContent = `${name} = ${record.formula || ''}${record.crossReference ? ` · See ${humanize(record.crossReference)}` : ''}`;
      parent.appendChild(formula);
    });
  }

  function renderCharacterSheet(parent, groups) {
    if (!groups.length) return;
    appendHeading(parent, 'Character sheet field groups');
    groups.forEach(group => {
      const subheading = document.createElement('h5');
      subheading.textContent = group.group;
      const list = document.createElement('ul');
      list.className = 'solanum-field-list';
      (group.fields || []).forEach(field => {
        const item = document.createElement('li');
        item.textContent = field;
        list.appendChild(item);
      });
      parent.append(subheading, list);
    });
  }

  function renderWorkedExample(parent, example) {
    if (!example || typeof example !== 'object' || Array.isArray(example)) return;
    appendHeading(parent, 'Worked example');
    const card = document.createElement('section');
    card.className = 'solanum-example';
    const grid = document.createElement('div');
    grid.className = 'solanum-example-grid';
    Object.entries(example).forEach(([key, value]) => {
      const label = document.createElement('div');
      label.className = 'solanum-example-key';
      label.textContent = humanize(key);
      const content = document.createElement('div');
      content.textContent = value;
      grid.append(label, content);
    });
    card.appendChild(grid);
    parent.appendChild(card);
  }

  function renderEnemyProfiles(parent, profiles) {
    if (!profiles.length) return;
    appendHeading(parent, `Enemy role profiles (${profiles.length})`);
    profiles.forEach(profile => {
      const card = document.createElement('section');
      card.className = 'solanum-enemy-card';
      card.innerHTML = `
        <div class="solanum-enemy-meta">${escapeHtml(profile.faction)} · ${escapeHtml(profile.role)}</div>
        <div class="solanum-enemy-title">${escapeHtml(profile.name)}</div>
        <p>${escapeHtml(profile.design)}</p>
        <p><strong>Strength:</strong> ${escapeHtml(profile.strength)}</p>
        <p><strong>Weakness:</strong> ${escapeHtml(profile.weakness)}</p>`;
      parent.appendChild(card);
    });
  }

  function renderRelatedEntries(parent, entries, ids, browser) {
    const related = ids.map(id => entries.find(entry => entry.id === id)).filter(Boolean);
    if (!related.length) return;
    appendHeading(parent, 'Related native entries');
    const strip = document.createElement('div');
    strip.className = 'solanum-related';
    related.forEach(entry => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'solanum-chip';
      button.textContent = entry.title;
      button.addEventListener('click', () => renderEntry(browser, entries, entry.id));
      strip.appendChild(button);
    });
    parent.appendChild(strip);
  }

  function renderSourceRefs(parent, refs) {
    if (!refs.length) return;
    const note = document.createElement('div');
    note.className = 'solanum-source-note';
    note.textContent = `Source: ${refs.map(ref => `${ref.fileName}, pages ${ref.pageStart}–${ref.pageEnd}`).join('; ')}`;
    parent.appendChild(note);
  }

  function renderTables(parent, tables) {
    tables.forEach(tableData => {
      appendHeading(parent, tableData.title || 'Reference table');
      const wrap = document.createElement('div');
      wrap.className = 'solanum-table-wrap';
      const table = document.createElement('table');
      table.className = 'solanum-table';
      const thead = document.createElement('thead');
      const header = document.createElement('tr');
      (tableData.columns || []).forEach(column => {
        const th = document.createElement('th');
        th.textContent = column;
        header.appendChild(th);
      });
      thead.appendChild(header);
      const tbody = document.createElement('tbody');
      (tableData.rows || []).forEach(row => {
        const tr = document.createElement('tr');
        row.forEach(value => {
          const td = document.createElement('td');
          td.textContent = value;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.append(thead, tbody);
      wrap.appendChild(table);
      parent.appendChild(wrap);
    });
  }

  function entrySearchText(entry) {
    return [
      entry.title, entry.category, entry.summary, ...(entry.body || []), ...(entry.tags || []),
      ...(entry.creationSequence || []), ...(entry.generationSequence || []), ...(entry.procedure || []),
      ...tableText(entry.tables), ...sheetText(entry.characterSheetFields),
      ...formulaText(entry.formulaFields), ...formulaText(entry.formulas),
      ...objectText(entry.workedExample), ...enemyProfileText(entry.enemyProfiles), ...(entry.relatedEntries || [])
    ].join(' ');
  }

  function tableText(tables) {
    return (tables || []).flatMap(table => [table.title || '', ...(table.columns || []), ...(table.rows || []).flat()]);
  }

  function sheetText(groups) {
    return (groups || []).flatMap(group => [group.group || '', ...(group.fields || [])]);
  }

  function formulaText(records) {
    return (records || []).flatMap(record => [record.field || record.name || '', record.formula || '', record.crossReference || '']);
  }

  function objectText(value) {
    if (!value || typeof value !== 'object') return [];
    return Object.entries(value).flatMap(([key, item]) => [key, String(item)]);
  }

  function enemyProfileText(profiles) {
    return (profiles || []).flatMap(profile => [profile.faction, profile.role, profile.name, profile.design, profile.strength, profile.weakness]);
  }

  function appendParagraph(parent, text) {
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    parent.appendChild(paragraph);
  }

  function appendHeading(parent, text) {
    const heading = document.createElement('h4');
    heading.textContent = text;
    parent.appendChild(heading);
  }

  function install() {
    injectStyles();
    buildTab();
    buildWorkspace();
    bindLaunchButtons();
    void refreshWorkspaceSummary();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
