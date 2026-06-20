(() => {
  const registryUrl = 'data/barotrauma-tools-registry.json';
  const indexUrl = 'data/barotrauma/wiki/crewmans-primer-index.json';
  const sourceUrl = 'data/barotrauma/wiki/crewmans-primer-source.json';

  const search = document.getElementById('barotrauma-search');
  const status = document.getElementById('barotrauma-status');
  const grid = document.getElementById('barotrauma-overview-grid');
  const filters = [...document.querySelectorAll('[data-barotrauma-filter]')];

  let registry;
  let activeFilter = 'all';
  let primer;
  let activeEntryId;
  let activeCategory = 'all';
  let primerMode = 'wiki';

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));

  const humanize = value => String(value ?? '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, character => character.toUpperCase());

  async function fetchText(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    return response.text();
  }

  async function fetchJson(url) {
    return JSON.parse(await fetchText(url));
  }

  function injectStyles() {
    if (document.getElementById('barotrauma-primer-styles')) return;
    const style = document.createElement('style');
    style.id = 'barotrauma-primer-styles';
    style.textContent = `
      .primer-browser{margin:24px 0 34px;border:1px solid var(--line);border-radius:24px;padding:20px;background:rgba(0,0,0,.22);box-shadow:var(--shadow)}
      .primer-browser[hidden]{display:none}
      .primer-header{display:flex;justify-content:space-between;gap:18px;align-items:start}
      .primer-header-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px}
      .primer-edition,.primer-entry-meta,.primer-document-meta{color:var(--accent);font-weight:800;text-transform:uppercase;letter-spacing:.08em;font-size:.76rem}
      .primer-disclaimer,.primer-source-meta,.primer-entry p,.primer-entry li,.primer-list small,.primer-source-document p,.primer-source-document li,.primer-source-toc small{color:var(--muted)}
      .primer-mode-tabs{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0 14px;padding-bottom:14px;border-bottom:1px solid var(--line)}
      .primer-mode-tab{border:1px solid var(--line);border-radius:999px;padding:8px 14px;background:rgba(255,255,255,.04);color:var(--muted);font-weight:700}
      .primer-mode-tab.active,.primer-mode-tab:hover{border-color:var(--accent);color:var(--ink);background:rgba(200,138,53,.11)}
      .primer-controls,.primer-source-controls{display:grid;grid-template-columns:minmax(220px,1fr) auto auto;gap:10px 14px;margin:16px 0}
      .primer-controls input,.primer-source-controls input{background:#10131a;border:1px solid var(--line);color:var(--ink);border-radius:12px;padding:10px 12px}
      .primer-categories{display:flex;flex-wrap:wrap;gap:7px;grid-column:1/-1}
      .primer-chip{border:1px solid var(--line);border-radius:999px;padding:6px 10px;background:rgba(255,255,255,.04);color:var(--muted)}
      .primer-chip.active,.primer-chip:hover{color:var(--ink);border-color:var(--accent)}
      .primer-layout,.primer-source-layout{display:grid;grid-template-columns:minmax(280px,380px) minmax(0,1fr);gap:16px}
      .primer-list,.primer-source-toc{display:grid;gap:7px;align-content:start;max-height:78vh;overflow:auto;padding-right:4px}
      .primer-list button,.primer-source-toc button{text-align:left;border:1px solid var(--line);border-radius:12px;padding:10px 10px 10px calc(10px + var(--level-offset, 0px));background:rgba(255,255,255,.025);color:var(--ink)}
      .primer-list button.active,.primer-list button:hover,.primer-source-toc button:hover{border-color:var(--accent);background:rgba(200,138,53,.1)}
      .primer-entry,.primer-source-document{border:1px solid rgba(200,138,53,.36);border-radius:18px;padding:22px;background:rgba(0,0,0,.18);min-width:0}
      .primer-entry h3{font-size:clamp(1.45rem,3vw,2.45rem);margin:4px 0 14px}
      .primer-entry p,.primer-entry li,.primer-source-document p,.primer-source-document li{line-height:1.66}
      .primer-entry p,.primer-source-document p{margin:0 0 1em}
      .primer-entry ul,.primer-entry ol,.primer-source-document ul,.primer-source-document ol{padding-left:1.6em}
      .primer-navigation{display:flex;justify-content:space-between;gap:12px;border-top:1px solid var(--line);margin-top:24px;padding-top:16px}
      .primer-navigation button:last-child{margin-left:auto}
      .primer-source-status{color:var(--muted);font-size:.9rem;align-self:center}
      .primer-source-document{max-height:82vh;overflow:auto;scroll-behavior:smooth}
      .primer-source-title-page{text-align:center;padding:30px 12px 44px;border-bottom:2px solid rgba(200,138,53,.38);margin-bottom:36px}
      .primer-source-title-page h2{font-size:clamp(2rem,5vw,4rem);margin:10px 0}
      .primer-source-title-page p{max-width:760px;margin:10px auto;color:var(--muted)}
      .primer-source-section{scroll-margin-top:18px;padding:0 0 30px;margin:0 0 34px;border-bottom:1px solid var(--line)}
      .primer-source-section:last-child{border-bottom:0}
      .primer-source-section h2,.primer-source-section h3,.primer-source-section h4{overflow-wrap:anywhere;margin:0 0 10px;color:var(--ink)}
      .primer-source-section h2{font-size:clamp(1.75rem,3.5vw,2.8rem)}
      .primer-source-section h3{font-size:clamp(1.4rem,2.8vw,2.15rem)}
      .primer-source-section h4{font-size:clamp(1.15rem,2.2vw,1.65rem)}
      .primer-source-section-actions{display:flex;justify-content:flex-end;margin:0 0 14px}
      .primer-empty{padding:18px;color:var(--muted);border:1px dashed var(--line);border-radius:14px}
      body.printing-primer-source *{visibility:hidden!important}
      body.printing-primer-source .primer-source-document,body.printing-primer-source .primer-source-document *{visibility:visible!important}
      body.printing-primer-source .primer-source-document{position:absolute;left:0;top:0;width:100%;max-height:none;overflow:visible;border:0;background:white;color:black;box-shadow:none}
      body.printing-primer-source .primer-source-document *{color:black!important}
      body.printing-primer-source .primer-source-section-actions{display:none!important}
      @media(max-width:900px){.primer-header,.primer-layout,.primer-source-layout,.primer-controls,.primer-source-controls{grid-template-columns:1fr;display:grid}.primer-header-actions{justify-content:flex-start}.primer-list,.primer-source-toc{max-height:45vh}.primer-categories{grid-column:auto}}
    `;
    document.head.appendChild(style);
  }

  function moduleSearchText(module) {
    return [
      module.title,
      module.section,
      module.status,
      module.description,
      ...(module.tags || []),
      ...(module.dataFamilies || [])
    ].join(' ').toLowerCase();
  }

  function createModuleCard(module) {
    const article = document.createElement('article');
    article.className = 'module-card';
    article.dataset.moduleId = module.id;
    article.innerHTML = `
      <div class="module-meta">
        <span class="badge ${module.status === 'planned' ? 'status-planned' : ''}">${escapeHtml(humanize(module.status))}</span>
        <span class="badge section-${escapeHtml(module.section)}">${escapeHtml(humanize(module.section))}</span>
      </div>
      <h3>${escapeHtml(module.title)}</h3>
      <p>${escapeHtml(module.description)}</p>
      <div class="chip-list">${(module.dataFamilies || []).map(family => `<span class="chip">${escapeHtml(humanize(family))}</span>`).join('')}</div>
    `;

    if (module.launchTarget === 'crewmans-primer') {
      const actions = document.createElement('div');
      actions.className = 'module-actions';

      const wikiButton = document.createElement('button');
      wikiButton.type = 'button';
      wikiButton.className = 'primary-action';
      wikiButton.textContent = module.actionLabel || 'Open Crewman’s Primer Wiki';
      wikiButton.addEventListener('click', () => void openPrimer('wiki'));

      const sourceButton = document.createElement('button');
      sourceButton.type = 'button';
      sourceButton.className = 'secondary-action';
      sourceButton.textContent = module.sourceActionLabel || 'Open Source Document Viewer';
      sourceButton.addEventListener('click', () => void openPrimer('source'));

      actions.append(wikiButton, sourceButton);
      article.appendChild(actions);
    }

    return article;
  }

  function renderRegistry() {
    if (!registry || !grid || !status) return;
    const query = (search?.value || '').trim().toLowerCase();
    const modules = [...(registry.modules || [])].sort((left, right) =>
      (left.priority || 999) - (right.priority || 999) || left.title.localeCompare(right.title)
    );
    const shown = modules.filter(module =>
      (activeFilter === 'all' || module.section === activeFilter) &&
      (!query || moduleSearchText(module).includes(query))
    );

    grid.innerHTML = '';
    shown.forEach(module => grid.appendChild(createModuleCard(module)));
    if (!shown.length) grid.innerHTML = '<div class="module-empty">No Barotrauma modules match the current search and filter.</div>';
    status.textContent = `${shown.length} of ${modules.length} modules shown · ${registry.status}`;
  }

  async function loadPrimer() {
    if (primer) return primer;
    const [index, source] = await Promise.all([
      fetchJson(indexUrl),
      fetchJson(sourceUrl)
    ]);
    const entries = source.entries || [];
    if (entries.length !== 198) throw new Error(`Expected 198 source-titled entries; loaded ${entries.length}.`);
    primer = { index, entries };
    activeEntryId = entries[0]?.id || null;
    return primer;
  }

  function ensureShell() {
    let browser = document.getElementById('barotrauma-primer-browser');
    if (browser) return browser;
    browser = document.createElement('section');
    browser.id = 'barotrauma-primer-browser';
    browser.className = 'primer-browser';
    browser.hidden = true;
    document.getElementById('barotrauma')?.appendChild(browser);
    return browser;
  }

  async function openPrimer(mode = 'wiki') {
    const browser = ensureShell();
    if (!browser) return;
    primerMode = mode;
    browser.hidden = false;
    browser.innerHTML = '<p class="helper-note">Loading all 198 source sections…</p>';
    try {
      renderPrimer(browser, await loadPrimer());
      browser.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      browser.innerHTML = `<div class="primer-empty">The Crewman’s Primer could not be loaded: ${escapeHtml(error.message)}</div>`;
      console.error(error);
    }
  }

  function entrySearchText(entry) {
    return [
      entry.title,
      entry.category,
      entry.chapter,
      ...(entry.blocks || []).flatMap(block => block.type === 'list' ? block.items || [] : [block.text || ''])
    ].join(' ').toLowerCase();
  }

  function renderPrimer(browser, data) {
    const { index, entries } = data;
    browser.innerHTML = `
      <div class="primer-header">
        <div>
          <p class="eyebrow">Complete source-document reference</p>
          <h2>${escapeHtml(index.displayTitle || index.title)}</h2>
          <p class="primer-edition">198 source-titled entries · ${Number(index.wordCount || 0).toLocaleString()} words · ${Number(index.sourceNonEmptyParagraphCount || 0).toLocaleString()} preserved text units</p>
          <p>${escapeHtml(index.subtitle)}</p>
          <p>${escapeHtml(index.description)}</p>
        </div>
        <div class="primer-header-actions">
          <button id="primer-close" class="secondary-action" type="button">Close Primer</button>
        </div>
      </div>
      <div class="primer-mode-tabs" role="tablist" aria-label="Crewman's Primer viewing mode">
        <button class="primer-mode-tab" data-primer-mode="wiki" type="button" role="tab">Wiki Entries</button>
        <button class="primer-mode-tab" data-primer-mode="source" type="button" role="tab">Source Document Viewer</button>
      </div>
      <div id="primer-workspace"></div>
      <p class="primer-disclaimer">${escapeHtml(index.disclaimer)}</p>
    `;

    browser.querySelector('#primer-close').addEventListener('click', () => { browser.hidden = true; });
    browser.querySelectorAll('[data-primer-mode]').forEach(button => {
      button.addEventListener('click', () => {
        primerMode = button.dataset.primerMode;
        renderPrimerWorkspace(browser, entries, index);
      });
    });
    renderPrimerWorkspace(browser, entries, index);
  }

  function renderPrimerWorkspace(browser, entries, index) {
    browser.querySelectorAll('[data-primer-mode]').forEach(button => {
      const active = button.dataset.primerMode === primerMode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    if (primerMode === 'source') renderSourceViewer(browser, entries, index);
    else renderWikiViewer(browser, entries, index);
  }

  function renderWikiViewer(browser, entries, index) {
    const workspace = browser.querySelector('#primer-workspace');
    workspace.innerHTML = `
      <div class="primer-controls">
        <input id="primer-search" type="search" placeholder="Search every title, paragraph, and list item..." aria-label="Search wiki entries">
        <button id="primer-open-source" class="secondary-action" type="button">View Full Source</button>
        <span></span>
        <div id="primer-categories" class="primer-categories"></div>
      </div>
      <div class="primer-layout">
        <nav id="primer-list" class="primer-list" aria-label="Primer wiki entries"></nav>
        <article id="primer-entry" class="primer-entry"></article>
      </div>
    `;

    workspace.querySelector('#primer-search').addEventListener('input', () => renderWikiList(browser, entries));
    workspace.querySelector('#primer-open-source').addEventListener('click', () => {
      primerMode = 'source';
      renderPrimerWorkspace(browser, entries, index);
    });

    const categories = workspace.querySelector('#primer-categories');
    ['all', ...(index.categories || [])].forEach(value => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `primer-chip ${value === activeCategory ? 'active' : ''}`;
      button.textContent = value === 'all' ? 'All Source Sections' : value;
      button.addEventListener('click', () => {
        activeCategory = value;
        [...categories.children].forEach(item => item.classList.toggle('active', item === button));
        renderWikiList(browser, entries);
      });
      categories.appendChild(button);
    });

    renderWikiList(browser, entries);
    renderWikiEntry(browser, entries, activeEntryId || entries[0]?.id);
  }

  function visibleWikiEntries(browser, entries) {
    const query = (browser.querySelector('#primer-search')?.value || '').trim().toLowerCase();
    return entries.filter(entry =>
      (activeCategory === 'all' || entry.category === activeCategory) &&
      (!query || entrySearchText(entry).includes(query))
    );
  }

  function renderWikiList(browser, entries) {
    const list = browser.querySelector('#primer-list');
    if (!list) return;
    const matches = visibleWikiEntries(browser, entries);
    list.innerHTML = '';
    if (!matches.length) {
      list.innerHTML = '<div class="primer-empty">No source sections match the current search.</div>';
      return;
    }
    if (!matches.some(entry => entry.id === activeEntryId)) {
      activeEntryId = matches[0].id;
      renderWikiEntry(browser, entries, activeEntryId);
    }
    matches.forEach(entry => {
      const button = document.createElement('button');
      const position = entries.indexOf(entry) + 1;
      button.type = 'button';
      button.dataset.entryId = entry.id;
      button.className = entry.id === activeEntryId ? 'active' : '';
      button.style.setProperty('--level-offset', `${Math.max(0, (entry.headingLevel || 1) - 1) * 14}px`);
      button.innerHTML = `<strong>${String(position).padStart(3, '0')}. ${escapeHtml(entry.title)}</strong><br><small>${escapeHtml(entry.category)} · heading level ${entry.headingLevel}</small>`;
      button.addEventListener('click', () => renderWikiEntry(browser, entries, entry.id));
      list.appendChild(button);
    });
  }

  function renderBlocks(target, blocks) {
    (blocks || []).forEach(block => {
      if (block.type === 'list') {
        const list = document.createElement(block.ordered ? 'ol' : 'ul');
        (block.items || []).forEach(text => {
          const item = document.createElement('li');
          item.textContent = text;
          list.appendChild(item);
        });
        target.appendChild(list);
      } else {
        const paragraph = document.createElement('p');
        paragraph.textContent = block.text || '';
        target.appendChild(paragraph);
      }
    });
  }

  function renderWikiEntry(browser, entries, id) {
    const entry = entries.find(item => item.id === id) || entries[0];
    const target = browser.querySelector('#primer-entry');
    if (!entry || !target) return;
    activeEntryId = entry.id;
    browser.querySelectorAll('#primer-list button').forEach(button => {
      button.classList.toggle('active', button.dataset.entryId === entry.id);
    });
    const position = entries.indexOf(entry);
    target.innerHTML = `
      <div class="primer-entry-meta">Source entry ${position + 1} of 198 · ${escapeHtml(entry.category)}</div>
      <h3>${escapeHtml(entry.title)}</h3>
      <div class="primer-source-meta">${escapeHtml(entry.chapter)} · source paragraphs ${entry.sourceStartParagraph}–${entry.sourceEndParagraph} · ${entry.wordCount} words</div>
      <div class="primer-source-section-actions"><button id="primer-locate-source" class="secondary-action" type="button">Locate in Source Document</button></div>
    `;
    renderBlocks(target, entry.blocks);
    target.querySelector('#primer-locate-source').addEventListener('click', () => {
      primerMode = 'source';
      renderPrimerWorkspace(browser, entries, primer.index);
      requestAnimationFrame(() => document.getElementById(`primer-source-${entry.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    });

    const navigation = document.createElement('div');
    navigation.className = 'primer-navigation';
    if (position > 0) {
      const previous = document.createElement('button');
      previous.className = 'secondary-action';
      previous.type = 'button';
      previous.textContent = `← ${entries[position - 1].title}`;
      previous.addEventListener('click', () => renderWikiEntry(browser, entries, entries[position - 1].id));
      navigation.appendChild(previous);
    }
    if (position < entries.length - 1) {
      const next = document.createElement('button');
      next.className = 'secondary-action';
      next.type = 'button';
      next.textContent = `${entries[position + 1].title} →`;
      next.addEventListener('click', () => renderWikiEntry(browser, entries, entries[position + 1].id));
      navigation.appendChild(next);
    }
    target.appendChild(navigation);
  }

  function renderSourceViewer(browser, entries, index) {
    const workspace = browser.querySelector('#primer-workspace');
    workspace.innerHTML = `
      <section class="primer-source-viewer" aria-labelledby="primer-source-viewer-title">
        <div class="primer-source-controls">
          <input id="primer-source-search" type="search" placeholder="Search inside the full source document..." aria-label="Search source document">
          <button id="primer-source-clear" class="secondary-action" type="button">Clear Search</button>
          <button id="primer-source-print" class="secondary-action" type="button">Print Source</button>
          <div id="primer-source-status" class="primer-source-status"></div>
        </div>
        <div class="primer-source-layout">
          <nav id="primer-source-toc" class="primer-source-toc" aria-label="Source document table of contents"></nav>
          <article id="primer-source-document" class="primer-source-document"></article>
        </div>
      </section>
    `;

    const sourceSearch = workspace.querySelector('#primer-source-search');
    sourceSearch.addEventListener('input', () => renderSourceDocument(browser, entries, index));
    workspace.querySelector('#primer-source-clear').addEventListener('click', () => {
      sourceSearch.value = '';
      renderSourceDocument(browser, entries, index);
      sourceSearch.focus();
    });
    workspace.querySelector('#primer-source-print').addEventListener('click', printSourceDocument);
    renderSourceDocument(browser, entries, index);
  }

  function renderSourceDocument(browser, entries, index) {
    const query = (browser.querySelector('#primer-source-search')?.value || '').trim().toLowerCase();
    const matches = query ? entries.filter(entry => entrySearchText(entry).includes(query)) : entries;
    const toc = browser.querySelector('#primer-source-toc');
    const documentTarget = browser.querySelector('#primer-source-document');
    const sourceStatus = browser.querySelector('#primer-source-status');
    if (!toc || !documentTarget || !sourceStatus) return;

    sourceStatus.textContent = query
      ? `${matches.length} of 198 source sections match “${browser.querySelector('#primer-source-search').value.trim()}”.`
      : 'Showing the complete source document in original title order.';
    toc.innerHTML = '';
    documentTarget.innerHTML = '';

    const titlePage = document.createElement('header');
    titlePage.className = 'primer-source-title-page';
    titlePage.innerHTML = `
      <div class="primer-document-meta">Source document viewer · ${matches.length} visible sections</div>
      <h2 id="primer-source-viewer-title">${escapeHtml(index.displayTitle || index.title)}</h2>
      <p>${escapeHtml(index.subtitle)}</p>
      <p>${escapeHtml(index.issueStatement || '')}</p>
      <p>${escapeHtml(index.edition)} · ${Number(index.wordCount || 0).toLocaleString()} words</p>
    `;
    documentTarget.appendChild(titlePage);

    if (!matches.length) {
      toc.innerHTML = '<div class="primer-empty">No source sections match this search.</div>';
      documentTarget.innerHTML += '<div class="primer-empty">No source sections match this search.</div>';
      return;
    }

    matches.forEach(entry => {
      const position = entries.indexOf(entry) + 1;
      const tocButton = document.createElement('button');
      tocButton.type = 'button';
      tocButton.style.setProperty('--level-offset', `${Math.max(0, (entry.headingLevel || 1) - 1) * 14}px`);
      tocButton.innerHTML = `<strong>${String(position).padStart(3, '0')}. ${escapeHtml(entry.title)}</strong><br><small>${escapeHtml(entry.category)}</small>`;
      tocButton.addEventListener('click', () => {
        document.getElementById(`primer-source-${entry.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      toc.appendChild(tocButton);

      const section = document.createElement('section');
      section.className = 'primer-source-section';
      section.id = `primer-source-${entry.id}`;
      section.dataset.entryId = entry.id;

      const heading = document.createElement(entry.headingLevel === 1 ? 'h2' : entry.headingLevel === 2 ? 'h3' : 'h4');
      heading.textContent = entry.title;
      section.appendChild(heading);

      const metadata = document.createElement('div');
      metadata.className = 'primer-source-meta';
      metadata.textContent = `Source entry ${position} of 198 · ${entry.category} · source paragraphs ${entry.sourceStartParagraph}–${entry.sourceEndParagraph}`;
      section.appendChild(metadata);

      const actions = document.createElement('div');
      actions.className = 'primer-source-section-actions';
      const openWiki = document.createElement('button');
      openWiki.type = 'button';
      openWiki.className = 'secondary-action';
      openWiki.textContent = 'Open as Wiki Entry';
      openWiki.addEventListener('click', () => {
        activeEntryId = entry.id;
        primerMode = 'wiki';
        renderPrimerWorkspace(browser, entries, index);
      });
      actions.appendChild(openWiki);
      section.appendChild(actions);

      renderBlocks(section, entry.blocks);
      documentTarget.appendChild(section);
    });
  }

  function printSourceDocument() {
    const cleanup = () => document.body.classList.remove('printing-primer-source');
    document.body.classList.add('printing-primer-source');
    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 1000);
  }

  search?.addEventListener('input', renderRegistry);
  filters.forEach(button => button.addEventListener('click', () => {
    activeFilter = button.dataset.barotraumaFilter || 'all';
    filters.forEach(item => item.classList.toggle('active', item === button));
    renderRegistry();
  }));

  injectStyles();
  ensureShell();
  fetchJson(registryUrl)
    .then(data => { registry = data; renderRegistry(); })
    .catch(error => {
      if (status) status.textContent = 'The Barotrauma registry could not be loaded.';
      console.error(error);
    });
})();
