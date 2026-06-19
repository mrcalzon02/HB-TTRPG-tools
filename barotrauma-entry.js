(() => {
  const REGISTRY_URL = 'data/barotrauma-tools-registry.json';
  const PRIMER_INDEX_URL = 'data/barotrauma/wiki/crewmans-primer-index.json';
  const searchInput = document.getElementById('barotrauma-search');
  const statusTarget = document.getElementById('barotrauma-status');
  const gridTarget = document.getElementById('barotrauma-overview-grid');
  const filterButtons = Array.from(document.querySelectorAll('[data-barotrauma-filter]'));
  let registry = null;
  let activeFilter = 'all';
  let primerData = null;
  let primerCategory = 'all';
  let activePrimerId = null;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function humanize(value) {
    return String(value ?? '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/^./, character => character.toUpperCase());
  }

  function injectPrimerStyles() {
    if (document.getElementById('barotrauma-primer-styles')) return;
    const style = document.createElement('style');
    style.id = 'barotrauma-primer-styles';
    style.textContent = `
      .primer-browser{margin:24px 0 34px;border:1px solid var(--line);border-radius:24px;padding:20px;background:rgba(0,0,0,.22);box-shadow:var(--shadow)}
      .primer-browser[hidden]{display:none}
      .primer-header{display:flex;justify-content:space-between;gap:18px;align-items:start;margin-bottom:18px}
      .primer-edition{color:var(--accent);font-weight:800;text-transform:uppercase;letter-spacing:.08em;font-size:.78rem}
      .primer-disclaimer{max-width:520px;color:var(--muted);font-size:.88rem;line-height:1.45}
      .primer-controls{display:grid;grid-template-columns:minmax(220px,1fr) auto;gap:10px 14px;margin-bottom:16px}
      .primer-controls input{background:#10131a;border:1px solid var(--line);color:var(--ink);border-radius:12px;padding:10px 12px}
      .primer-categories{display:flex;flex-wrap:wrap;gap:7px;grid-column:1/-1}
      .primer-chip{border:1px solid var(--line);border-radius:999px;padding:6px 10px;background:rgba(255,255,255,.04);color:var(--muted)}
      .primer-chip.active,.primer-chip:hover{color:var(--ink);border-color:var(--accent)}
      .primer-layout{display:grid;grid-template-columns:minmax(260px,340px) minmax(0,1fr);gap:16px}
      .primer-list{display:grid;gap:8px;align-content:start;max-height:76vh;overflow:auto;padding-right:4px}
      .primer-list button{text-align:left;border:1px solid var(--line);border-radius:14px;padding:11px;background:rgba(255,255,255,.025);color:var(--ink)}
      .primer-list button.active,.primer-list button:hover{border-color:var(--accent);background:rgba(200,138,53,.1)}
      .primer-list small{color:var(--muted)}
      .primer-entry{border:1px solid rgba(200,138,53,.36);border-radius:18px;padding:22px;background:rgba(0,0,0,.18);min-width:0}
      .primer-entry h3{font-size:clamp(1.5rem,3vw,2.5rem);margin:4px 0 6px}
      .primer-entry h4{color:var(--accent);margin:24px 0 9px}
      .primer-entry p,.primer-entry li{color:var(--muted);line-height:1.62}
      .primer-entry .primer-summary{color:var(--ink);font-size:1.05rem}
      .primer-entry-meta{color:var(--accent);font-weight:800;text-transform:uppercase;letter-spacing:.08em;font-size:.75rem}
      .primer-subtitle{color:#f4d296;font-style:italic}
      .primer-doctrine,.primer-procedure,.primer-warning,.primer-note,.primer-footnote{border:1px solid var(--line);border-radius:13px;padding:12px 14px;margin:10px 0;background:rgba(255,255,255,.03)}
      .primer-procedure h5,.primer-footnote h5{margin:0 0 8px;color:var(--ink);font-size:.98rem}
      .primer-warning{border-color:rgba(155,63,63,.65);background:rgba(155,63,63,.12);color:#ffdada}
      .primer-note{border-left:4px solid var(--accent);font-style:italic}
      .primer-footnote{font-size:.92rem;background:rgba(200,138,53,.07)}
      .primer-related{display:flex;flex-wrap:wrap;gap:7px}
      .primer-empty{padding:18px;color:var(--muted);border:1px dashed var(--line);border-radius:14px}
      @media(max-width:900px){.primer-header,.primer-layout,.primer-controls{grid-template-columns:1fr;display:grid}.primer-list{max-height:none}.primer-controls .secondary-action{width:100%}}
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

  function createCard(module) {
    const article = document.createElement('article');
    article.className = 'module-card';
    article.dataset.moduleId = module.id;

    const meta = document.createElement('div');
    meta.className = 'module-meta';
    meta.innerHTML = `
      <span class="badge ${module.status === 'planned' ? 'status-planned' : ''}">${escapeHtml(humanize(module.status))}</span>
      <span class="badge section-${escapeHtml(module.section)}">${escapeHtml(humanize(module.section))}</span>
    `;

    const title = document.createElement('h3');
    title.textContent = module.title;

    const description = document.createElement('p');
    description.textContent = module.description;

    const chips = document.createElement('div');
    chips.className = 'chip-list';
    (module.dataFamilies || []).forEach(family => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = humanize(family);
      chips.appendChild(chip);
    });

    article.append(meta, title, description, chips);

    if (module.launchTarget === 'crewmans-primer') {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'primary-action';
      button.textContent = module.actionLabel || 'Open Crewman’s Primer';
      button.addEventListener('click', () => void openPrimer());
      article.appendChild(button);
    }

    return article;
  }

  function renderRegistry() {
    if (!registry || !gridTarget || !statusTarget) return;
    const query = (searchInput?.value || '').trim().toLowerCase();
    const modules = [...(registry.modules || [])].sort((left, right) =>
      (left.priority || 999) - (right.priority || 999) || left.title.localeCompare(right.title)
    );
    const matches = modules.filter(module => {
      const matchesSection = activeFilter === 'all' || module.section === activeFilter;
      const matchesQuery = !query || moduleSearchText(module).includes(query);
      return matchesSection && matchesQuery;
    });

    gridTarget.innerHTML = '';
    if (!matches.length) {
      const empty = document.createElement('div');
      empty.className = 'module-empty';
      empty.textContent = 'No Barotrauma modules match the current search and filter.';
      gridTarget.appendChild(empty);
    } else {
      matches.forEach(module => gridTarget.appendChild(createCard(module)));
    }

    statusTarget.textContent = `${matches.length} of ${modules.length} modules shown · ${registry.status}`;
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Barotrauma request failed: ${url} ${response.status}`);
    return response.json();
  }

  async function loadRegistry() {
    if (!gridTarget || !statusTarget) return;
    try {
      registry = await fetchJson(REGISTRY_URL);
      renderRegistry();
    } catch (error) {
      statusTarget.textContent = 'The Barotrauma registry could not be loaded. Serve the project through GitHub Pages or a local web server.';
      gridTarget.innerHTML = '<div class="module-empty">Barotrauma module data is currently unavailable.</div>';
      console.error(error);
    }
  }

  function ensurePrimerShell() {
    let browser = document.getElementById('barotrauma-primer-browser');
    if (browser) return browser;
    const workspace = document.getElementById('barotrauma');
    if (!workspace) return null;
    browser = document.createElement('section');
    browser.id = 'barotrauma-primer-browser';
    browser.className = 'primer-browser no-print';
    browser.hidden = true;
    browser.setAttribute('aria-labelledby', 'primer-browser-title');
    workspace.appendChild(browser);
    return browser;
  }

  async function loadPrimer() {
    if (primerData) return primerData;
    const index = await fetchJson(PRIMER_INDEX_URL);
    const packPaths = index.packs || (index.entryFile ? [index.entryFile] : []);
    const base = PRIMER_INDEX_URL.slice(0, PRIMER_INDEX_URL.lastIndexOf('/') + 1);
    const packs = await Promise.all(packPaths.map(path => fetchJson(`${base}${path}`)));
    const byId = new Map();
    packs.forEach(pack => (pack.entries || []).forEach(entry => byId.set(entry.id, entry)));
    const ordered = (index.readingOrder || []).map(id => byId.get(id)).filter(Boolean);
    const remaining = Array.from(byId.values()).filter(entry => !ordered.includes(entry));
    primerData = { index, entries: [...ordered, ...remaining] };
    activePrimerId = primerData.entries[0]?.id || null;
    return primerData;
  }

  async function openPrimer() {
    const browser = ensurePrimerShell();
    if (!browser) return;
    browser.hidden = false;
    browser.innerHTML = '<p class="helper-note">Loading The Europan Crewman’s Primer…</p>';
    try {
      const data = await loadPrimer();
      renderPrimer(browser, data);
      browser.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      browser.innerHTML = '<div class="primer-empty">The Crewman’s Primer could not be loaded. Serve the project through GitHub Pages or a local web server.</div>';
      console.error(error);
    }
  }

  function primerSearchText(entry) {
    return [
      entry.sectionNumber, entry.category, entry.title, entry.subtitle, entry.summary,
      ...(entry.body || []), ...(entry.doctrine || []), ...(entry.warnings || []),
      ...(entry.fieldNotes || []), ...(entry.relatedEntries || []),
      ...(entry.procedures || []).flatMap(item => [item.title, ...(item.steps || [])]),
      ...(entry.footnotes || []).flatMap(item => [item.marker, item.title, item.text])
    ].join(' ').toLowerCase();
  }

  function renderPrimer(browser, data) {
    const { index, entries } = data;
    browser.innerHTML = `
      <div class="primer-header">
        <div>
          <p class="eyebrow">Sectional guide wiki reference</p>
          <h2 id="primer-browser-title">${escapeHtml(index.displayTitle || index.title)}</h2>
          <p class="primer-edition">${escapeHtml(index.edition)} · ${entries.length} sections</p>
          <p>${escapeHtml(index.description)}</p>
        </div>
        <p class="primer-disclaimer">${escapeHtml(index.disclaimer || '')}</p>
      </div>
      <div class="primer-controls">
        <input id="primer-search" type="search" placeholder="Search doctrine, engineering, weapons, medicine, cults, emergencies..." aria-label="Search Crewman's Primer" />
        <button id="primer-close" class="secondary-action" type="button">Close Primer</button>
        <div id="primer-categories" class="primer-categories" aria-label="Primer categories"></div>
      </div>
      <div class="primer-layout">
        <nav id="primer-list" class="primer-list" aria-label="Primer sections"></nav>
        <article id="primer-entry" class="primer-entry"></article>
      </div>`;

    browser.querySelector('#primer-search')?.addEventListener('input', () => renderPrimerList(browser, entries));
    browser.querySelector('#primer-close')?.addEventListener('click', () => { browser.hidden = true; });

    const categories = ['all', ...(index.categories || Array.from(new Set(entries.map(entry => entry.category))))];
    const categoryTarget = browser.querySelector('#primer-categories');
    categories.forEach(category => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `primer-chip ${category === primerCategory ? 'active' : ''}`;
      button.textContent = category === 'all' ? 'All Sections' : category;
      button.addEventListener('click', () => {
        primerCategory = category;
        categoryTarget.querySelectorAll('button').forEach(item => item.classList.toggle('active', item === button));
        renderPrimerList(browser, entries);
      });
      categoryTarget.appendChild(button);
    });

    renderPrimerList(browser, entries);
    renderPrimerEntry(browser, entries, activePrimerId || entries[0]?.id);
  }

  function filteredPrimerEntries(browser, entries) {
    const query = (browser.querySelector('#primer-search')?.value || '').trim().toLowerCase();
    return entries.filter(entry => {
      if (primerCategory !== 'all' && entry.category !== primerCategory) return false;
      return !query || primerSearchText(entry).includes(query);
    });
  }

  function renderPrimerList(browser, entries) {
    const list = browser.querySelector('#primer-list');
    if (!list) return;
    const filtered = filteredPrimerEntries(browser, entries);
    list.innerHTML = '';
    if (!filtered.length) {
      list.innerHTML = '<div class="primer-empty">No Primer sections match the current search.</div>';
      return;
    }
    if (!filtered.some(entry => entry.id === activePrimerId)) {
      activePrimerId = filtered[0].id;
      renderPrimerEntry(browser, entries, activePrimerId);
    }
    filtered.forEach(entry => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.entryId = entry.id;
      button.className = entry.id === activePrimerId ? 'active' : '';
      button.innerHTML = `<strong>${escapeHtml(entry.sectionNumber)}. ${escapeHtml(entry.title)}</strong><br><small>${escapeHtml(entry.category)}</small>`;
      button.addEventListener('click', () => renderPrimerEntry(browser, entries, entry.id));
      list.appendChild(button);
    });
  }

  function appendHeading(parent, text) {
    const heading = document.createElement('h4');
    heading.textContent = text;
    parent.appendChild(heading);
  }

  function renderPrimerEntry(browser, entries, entryId) {
    const entry = entries.find(item => item.id === entryId) || entries[0];
    const target = browser.querySelector('#primer-entry');
    if (!entry || !target) return;
    activePrimerId = entry.id;
    browser.querySelectorAll('#primer-list button').forEach(button => {
      button.classList.toggle('active', button.dataset.entryId === entry.id);
    });

    target.innerHTML = `
      <div class="primer-entry-meta">Section ${escapeHtml(entry.sectionNumber)} · ${escapeHtml(entry.category)}</div>
      <h3>${escapeHtml(entry.title)}</h3>
      <p class="primer-subtitle">${escapeHtml(entry.subtitle || '')}</p>
      <p class="primer-summary"><strong>${escapeHtml(entry.summary)}</strong></p>`;

    (entry.body || []).forEach(text => {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      target.appendChild(paragraph);
    });

    if ((entry.doctrine || []).length) {
      appendHeading(target, 'Core doctrine');
      const list = document.createElement('ul');
      list.className = 'primer-doctrine';
      entry.doctrine.forEach(text => {
        const item = document.createElement('li');
        item.textContent = text;
        list.appendChild(item);
      });
      target.appendChild(list);
    }

    if ((entry.procedures || []).length) {
      appendHeading(target, 'Field procedures');
      entry.procedures.forEach(procedure => {
        const block = document.createElement('section');
        block.className = 'primer-procedure';
        const title = document.createElement('h5');
        title.textContent = procedure.title;
        const list = document.createElement('ol');
        (procedure.steps || []).forEach(text => {
          const item = document.createElement('li');
          item.textContent = text;
          list.appendChild(item);
        });
        block.append(title, list);
        target.appendChild(block);
      });
    }

    if ((entry.warnings || []).length) {
      appendHeading(target, 'Warnings');
      entry.warnings.forEach(text => {
        const warning = document.createElement('div');
        warning.className = 'primer-warning';
        warning.textContent = text;
        target.appendChild(warning);
      });
    }

    if ((entry.fieldNotes || []).length) {
      appendHeading(target, 'Field notes');
      entry.fieldNotes.forEach(text => {
        const note = document.createElement('blockquote');
        note.className = 'primer-note';
        note.textContent = text;
        target.appendChild(note);
      });
    }

    if ((entry.footnotes || []).length) {
      appendHeading(target, 'Footnotes');
      entry.footnotes.forEach(footnote => {
        const block = document.createElement('aside');
        block.className = 'primer-footnote';
        const title = document.createElement('h5');
        title.textContent = `${footnote.marker || '*'} ${footnote.title || 'Editorial note'}`;
        const text = document.createElement('p');
        text.textContent = footnote.text;
        block.append(title, text);
        target.appendChild(block);
      });
    }

    const related = (entry.relatedEntries || []).map(id => entries.find(item => item.id === id)).filter(Boolean);
    if (related.length) {
      appendHeading(target, 'Related sections');
      const strip = document.createElement('div');
      strip.className = 'primer-related';
      related.forEach(item => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'primer-chip';
        button.textContent = `${item.sectionNumber}. ${item.title}`;
        button.addEventListener('click', () => {
          primerCategory = 'all';
          const search = browser.querySelector('#primer-search');
          if (search) search.value = '';
          browser.querySelectorAll('#primer-categories button').forEach(categoryButton => {
            categoryButton.classList.toggle('active', categoryButton.textContent === 'All Sections');
          });
          renderPrimerList(browser, entries);
          renderPrimerEntry(browser, entries, item.id);
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        strip.appendChild(button);
      });
      target.appendChild(strip);
    }
  }

  searchInput?.addEventListener('input', renderRegistry);
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.barotraumaFilter || 'all';
      filterButtons.forEach(item => item.classList.toggle('active', item === button));
      renderRegistry();
    });
  });

  injectPrimerStyles();
  ensurePrimerShell();
  void loadRegistry();
})();
