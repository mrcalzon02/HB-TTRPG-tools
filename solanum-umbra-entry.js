(() => {
  const VIEW_ID = 'solanum-umbra';
  const INDEX_URL = 'data/solanum-umbra/wiki/wiki-index.json';
  let wikiData = null;
  let activeCategory = 'all';

  function switchToSolanum(button) {
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active',view.id === VIEW_ID));
    document.querySelectorAll('.nav-button').forEach(nav => nav.classList.toggle('active',nav === button));
  }

  function injectStyles() {
    if (document.getElementById('solanum-umbra-wiki-style')) return;
    const style = document.createElement('style');
    style.id = 'solanum-umbra-wiki-style';
    style.textContent = `
      .solanum-browser { border: 1px solid var(--line); border-radius: 22px; padding: 20px; background: rgba(0,0,0,0.2); }
      .solanum-controls { display: grid; grid-template-columns: minmax(240px,1fr) auto; gap: 10px; margin-bottom: 14px; }
      .solanum-controls input { background: #10131a; border: 1px solid var(--line); color: var(--ink); border-radius: 12px; padding: 10px 12px; }
      .solanum-categories { display: flex; flex-wrap: wrap; gap: 7px; grid-column: 1/-1; }
      .solanum-chip { border: 1px solid var(--line); border-radius: 999px; padding: 5px 9px; background: rgba(255,255,255,0.04); color: var(--muted); }
      .solanum-chip.active, .solanum-chip:hover { color: var(--ink); border-color: var(--accent); }
      .solanum-layout { display: grid; grid-template-columns: 320px 1fr; gap: 14px; }
      .solanum-list { display: grid; gap: 8px; max-height: 70vh; overflow: auto; }
      .solanum-list button { text-align: left; border: 1px solid var(--line); border-radius: 13px; padding: 10px; background: rgba(255,255,255,0.025); color: var(--ink); }
      .solanum-list button.active, .solanum-list button:hover { border-color: var(--accent); background: rgba(200,138,53,0.1); }
      .solanum-entry { border: 1px solid rgba(200,138,53,0.35); border-radius: 16px; padding: 18px; background: rgba(0,0,0,0.16); }
      .solanum-entry h3 { margin: 3px 0 6px; }
      .solanum-entry h4 { color: var(--accent); margin: 20px 0 8px; }
      .solanum-meta { color: var(--accent); font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.75rem; }
      .solanum-entry p, .solanum-entry li { color: var(--muted); line-height: 1.58; }
      .solanum-step-list, .solanum-field-list { margin-left: 20px; }
      .solanum-table-wrap { overflow-x: auto; margin: 12px 0 18px; }
      .solanum-table { width: 100%; min-width: 620px; border-collapse: collapse; font-size: 0.88rem; color: var(--muted); }
      .solanum-table th, .solanum-table td { border: 1px solid var(--line); padding: 9px; text-align: left; vertical-align: top; }
      .solanum-table th { color: var(--ink); background: rgba(200,138,53,0.12); }
      .solanum-formula { border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; margin: 7px 0; color: var(--ink); background: rgba(255,255,255,0.035); }
      .solanum-source-note { border-left: 3px solid var(--accent); padding-left: 12px; margin-top: 14px; color: var(--muted); }
      @media (max-width: 900px) { .solanum-layout, .solanum-controls { grid-template-columns: 1fr; } .solanum-list { max-height: none; } }
    `;
    document.head.appendChild(style);
  }

  async function fetchJson(url) {
    const response = await fetch(url,{cache:'no-store'});
    if (!response.ok) throw new Error(`Solanum Umbra request failed: ${url} ${response.status}`);
    return response.json();
  }

  async function loadWiki() {
    if (wikiData) return wikiData;
    const index = await fetchJson(INDEX_URL);
    const packs = await Promise.all((index.packs || []).map(fetchJson));
    const byId = new Map();
    packs.forEach(pack => (pack.entries || []).forEach(entry => {
      const previous = byId.get(entry.id) || {};
      byId.set(entry.id,{...previous,...entry});
    }));
    wikiData = {
      index,
      entries:Array.from(byId.values()).sort((a,b) => (a.category || '').localeCompare(b.category || '') || (a.title || '').localeCompare(b.title || ''))
    };
    return wikiData;
  }

  function buildTab() {
    const nav = document.querySelector('.top-nav');
    if (!nav) return null;
    let button = nav.querySelector(`[data-view="${VIEW_ID}"]`);
    if (!button) {
      button = document.createElement('button');
      button.className = 'nav-button';
      button.dataset.view = VIEW_ID;
      button.textContent = 'Solanum Umbra';
      nav.appendChild(button);
      button.addEventListener('click',() => switchToSolanum(button));
    }
    return button;
  }

  function buildWorkspace(button) {
    const main = document.querySelector('main');
    if (!main || document.getElementById(VIEW_ID)) return;
    injectStyles();
    const section = document.createElement('section');
    section.id = VIEW_ID;
    section.className = 'view';
    section.setAttribute('aria-labelledby','solanum-umbra-title');
    section.innerHTML = `
      <div class="hero-card no-print">
        <p class="eyebrow">Solanum Umbra native-system workspace</p>
        <h2 id="solanum-umbra-title">Native Rules Wiki Import</h2>
        <p>The verified 248-page source is present in <code>SRC/</code>. Solanum Umbra remains an independent post-apocalyptic science-fantasy rules system: mechanics are indexed and cross-linked as written, not converted to Hypertext d20, 3.5, or another game.</p>
      </div>
      <div class="module-grid no-print">
        <article class="module-card">
          <div class="module-meta"><span class="badge status-active">source verified</span><span class="badge">248 pages</span><span class="badge status-active">binary present</span></div>
          <h3>Solanum Umbra TTRPG Manuscript</h3>
          <p>The PDF in <code>SRC/</code> matches the registered byte count and SHA-256 digest.</p>
          <a class="primary-action" href="SRC/Solanum-Umbra-TTRPG.pdf" target="_blank" rel="noopener">Open Source PDF</a>
          <a class="secondary-action" href="source-page-references/Solanum-Umbra-TTRPG.source.json" target="_blank" rel="noopener">Open Source Receipt</a>
        </article>
        <article class="module-card">
          <div class="module-meta"><span class="badge status-active">pass 1 complete</span><span class="badge">native mechanics</span></div>
          <h3>Character Creation and Sheet Foundation</h3>
          <p>Six attributes, four derived statistics, origins, careers, skills, motivations, ancestry guidance, cyberization, data seizures, and a native character-sheet field map are now indexed.</p>
          <button id="solanum-open-browser" class="primary-action" type="button">Open Native Wiki</button>
        </article>
        <article class="module-card">
          <div class="module-meta"><span class="badge status-planned">next passes</span></div>
          <h3>Systems Still to Import</h3>
          <p>Character advancement, core resolution, combat and cover, crafting, roles and specializations, classes, cybernetics, equipment, enemies, factions, paranormal entities, and soul hazards remain in the staged native-system sequence.</p>
        </article>
      </div>
      <section id="solanum-browser" class="solanum-browser no-print" hidden></section>`;
    main.appendChild(section);

    section.querySelector('#solanum-open-browser')?.addEventListener('click',async () => {
      const browser = section.querySelector('#solanum-browser');
      browser.hidden = false;
      browser.innerHTML = '<p class="helper-note">Loading Solanum Umbra native rules…</p>';
      try {
        const data = await loadWiki();
        renderBrowser(browser,data);
        browser.scrollIntoView({behavior:'smooth',block:'start'});
      } catch (error) {
        browser.innerHTML = '<p class="helper-note">The Solanum Umbra wiki could not be loaded. Serve the project through GitHub Pages or a local web server.</p>';
      }
    });

    const toolMenu = document.querySelector('#tools .menu-grid');
    if (toolMenu && !document.getElementById('open-solanum-umbra-card')) {
      const card = document.createElement('article');
      card.className = 'menu-card';
      card.id = 'open-solanum-umbra-card';
      card.innerHTML = '<h3>Solanum Umbra Workspace</h3><p>Dedicated native-system wiki and future character, crafting, combat, enemy, and entity tools.</p><button class="link-button" type="button">Open Solanum Umbra</button>';
      card.querySelector('button').addEventListener('click',() => switchToSolanum(button));
      toolMenu.appendChild(card);
    }
  }

  function renderBrowser(browser,data) {
    const entries = data.entries || [];
    const categories = ['all',...Array.from(new Set(entries.map(entry => entry.category))).sort()];
    browser.innerHTML = `
      <div class="section-heading">
        <p class="eyebrow">Native rules browser</p>
        <h2>Solanum Umbra Wiki</h2>
        <p>Source mechanics are presented as written. Unresolved source ambiguities remain visible for later native-system adjudication.</p>
      </div>
      <div class="solanum-controls">
        <input type="search" id="solanum-search" placeholder="Search character creation and native rules..." />
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
      button.addEventListener('click',() => {
        activeCategory = category;
        categoryTarget.querySelectorAll('button').forEach(item => item.classList.toggle('active',item === button));
        renderList(browser,entries,browser.querySelector('#solanum-entry')?.dataset.entryId || entries[0]?.id);
      });
      categoryTarget.appendChild(button);
    });
    browser.querySelector('#solanum-search')?.addEventListener('input',() => renderList(browser,entries,browser.querySelector('#solanum-entry')?.dataset.entryId || entries[0]?.id));
    browser.querySelector('#solanum-reset')?.addEventListener('click',() => {
      activeCategory = 'all';
      browser.querySelector('#solanum-search').value = '';
      renderBrowser(browser,data);
    });
    const first = entries.find(entry => entry.id === 'solanum-character-creation-system') || entries[0];
    renderList(browser,entries,first?.id);
    renderEntry(browser,entries,first?.id);
  }

  function renderList(browser,entries,activeId) {
    const list = browser.querySelector('#solanum-list');
    const query = (browser.querySelector('#solanum-search')?.value || '').trim().toLowerCase();
    const filtered = entries.filter(entry => {
      if (activeCategory !== 'all' && entry.category !== activeCategory) return false;
      const corpus = [entry.title,entry.category,entry.summary,...(entry.body || []),...(entry.tags || []),...(entry.creationSequence || []),...tableText(entry.tables),...sheetText(entry.characterSheetFields),...(entry.formulaFields || []).flatMap(item => [item.field,item.formula])].join(' ').toLowerCase();
      return !query || corpus.includes(query);
    });
    list.innerHTML = '';
    if (!filtered.length) {
      list.innerHTML = '<p class="helper-note">No native wiki entries match the current search.</p>';
      return;
    }
    filtered.forEach(entry => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.entryId = entry.id;
      button.className = entry.id === activeId ? 'active' : '';
      button.innerHTML = `<strong>${escapeHtml(entry.title)}</strong><br><small>${escapeHtml(entry.category)}</small>`;
      button.addEventListener('click',() => renderEntry(browser,entries,entry.id));
      list.appendChild(button);
    });
  }

  function renderEntry(browser,entries,entryId) {
    const entry = entries.find(item => item.id === entryId) || entries[0];
    const view = browser.querySelector('#solanum-entry');
    if (!entry || !view) return;
    view.dataset.entryId = entry.id;
    browser.querySelectorAll('#solanum-list button').forEach(button => button.classList.toggle('active',button.dataset.entryId === entry.id));
    view.innerHTML = `<div class="solanum-meta">${escapeHtml(entry.category)}</div><h3>${escapeHtml(entry.title)}</h3><p><strong>${escapeHtml(entry.summary)}</strong></p>`;
    (entry.body || []).forEach(text => appendParagraph(view,text));
    if ((entry.creationSequence || []).length) {
      appendHeading(view,'Creation sequence');
      const list = document.createElement('ol');
      list.className = 'solanum-step-list';
      entry.creationSequence.forEach(step => {
        const item = document.createElement('li');
        item.textContent = step;
        list.appendChild(item);
      });
      view.appendChild(list);
    }
    renderTables(view,entry.tables || []);
    if ((entry.characterSheetFields || []).length) {
      appendHeading(view,'Character sheet field groups');
      entry.characterSheetFields.forEach(group => {
        const subheading = document.createElement('h4');
        subheading.textContent = group.group;
        const list = document.createElement('ul');
        list.className = 'solanum-field-list';
        group.fields.forEach(field => {
          const item = document.createElement('li');
          item.textContent = field;
          list.appendChild(item);
        });
        view.append(subheading,list);
      });
    }
    if ((entry.formulaFields || []).length) {
      appendHeading(view,'Calculated sheet fields');
      entry.formulaFields.forEach(record => {
        const formula = document.createElement('div');
        formula.className = 'solanum-formula';
        formula.textContent = `${record.field} = ${record.formula}`;
        view.appendChild(formula);
      });
    }
    if ((entry.sourceRefs || []).length) {
      const note = document.createElement('div');
      note.className = 'solanum-source-note';
      note.textContent = `Source: ${entry.sourceRefs.map(ref => `${ref.fileName}, pages ${ref.pageStart}–${ref.pageEnd}`).join('; ')}`;
      view.appendChild(note);
    }
  }

  function renderTables(parent,tables) {
    tables.forEach(tableData => {
      appendHeading(parent,tableData.title || 'Reference table');
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
      table.append(thead,tbody);
      wrap.appendChild(table);
      parent.appendChild(wrap);
    });
  }

  function appendParagraph(parent,text) {
    const p = document.createElement('p');
    p.textContent = text;
    parent.appendChild(p);
  }

  function appendHeading(parent,text) {
    const h4 = document.createElement('h4');
    h4.textContent = text;
    parent.appendChild(h4);
  }

  function tableText(tables) {
    return (tables || []).flatMap(table => [table.title || '',...(table.columns || []),...(table.rows || []).flat()]);
  }

  function sheetText(groups) {
    return (groups || []).flatMap(group => [group.group || '',...(group.fields || [])]);
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g,char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function install() {
    const button = buildTab();
    if (button) buildWorkspace(button);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install);
  else install();
})();
