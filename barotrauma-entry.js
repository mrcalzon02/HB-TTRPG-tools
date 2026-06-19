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

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

  const humanize = value => String(value ?? '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, character => character.toUpperCase());

  function injectPrimerStyles() {
    if (document.getElementById('barotrauma-primer-styles')) return;
    const style = document.createElement('style');
    style.id = 'barotrauma-primer-styles';
    style.textContent = `
      .primer-browser{margin:24px 0 34px;border:1px solid var(--line);border-radius:24px;padding:20px;background:rgba(0,0,0,.22);box-shadow:var(--shadow)}
      .primer-browser[hidden]{display:none}.primer-header{display:flex;justify-content:space-between;gap:18px;align-items:start;margin-bottom:18px}
      .primer-edition{color:var(--accent);font-weight:800;text-transform:uppercase;letter-spacing:.08em;font-size:.78rem}.primer-disclaimer{max-width:520px;color:var(--muted);font-size:.88rem;line-height:1.45}
      .primer-controls{display:grid;grid-template-columns:minmax(220px,1fr) auto;gap:10px 14px;margin-bottom:16px}.primer-controls input{background:#10131a;border:1px solid var(--line);color:var(--ink);border-radius:12px;padding:10px 12px}
      .primer-categories{display:flex;flex-wrap:wrap;gap:7px;grid-column:1/-1}.primer-chip{border:1px solid var(--line);border-radius:999px;padding:6px 10px;background:rgba(255,255,255,.04);color:var(--muted)}
      .primer-chip.active,.primer-chip:hover{color:var(--ink);border-color:var(--accent)}.primer-layout{display:grid;grid-template-columns:minmax(280px,380px) minmax(0,1fr);gap:16px}
      .primer-list{display:grid;gap:7px;align-content:start;max-height:78vh;overflow:auto;padding-right:4px}.primer-list button{text-align:left;border:1px solid var(--line);border-radius:12px;padding:10px 10px 10px calc(10px + (var(--primer-level,0) * 14px));background:rgba(255,255,255,.025);color:var(--ink)}
      .primer-list button.active,.primer-list button:hover{border-color:var(--accent);background:rgba(200,138,53,.1)}.primer-list small{color:var(--muted)}
      .primer-entry{border:1px solid rgba(200,138,53,.36);border-radius:18px;padding:22px;background:rgba(0,0,0,.18);min-width:0}.primer-entry h3{font-size:clamp(1.45rem,3vw,2.45rem);margin:4px 0 14px;overflow-wrap:anywhere}
      .primer-entry p,.primer-entry li{color:var(--muted);line-height:1.66}.primer-entry p{margin:0 0 1em}.primer-entry ul,.primer-entry ol{margin:0 0 1.1em;padding-left:1.6em}.primer-entry li{margin:.28em 0}
      .primer-entry-meta{color:var(--accent);font-weight:800;text-transform:uppercase;letter-spacing:.08em;font-size:.75rem}.primer-source-meta{color:var(--muted);font-size:.78rem;margin-bottom:18px}
      .primer-navigation{display:flex;justify-content:space-between;gap:12px;border-top:1px solid var(--line);margin-top:24px;padding-top:16px}.primer-navigation button{max-width:48%;text-align:left}.primer-navigation button:last-child{text-align:right;margin-left:auto}
      .primer-empty{padding:18px;color:var(--muted);border:1px dashed var(--line);border-radius:14px}@media(max-width:900px){.primer-header,.primer-layout,.primer-controls{grid-template-columns:1fr;display:grid}.primer-list{max-height:45vh}.primer-controls .secondary-action{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function moduleSearchText(module) {
    return [module.title, module.section, module.status, module.description, ...(module.tags || []), ...(module.dataFamilies || [])].join(' ').toLowerCase();
  }

  function createCard(module) {
    const article = document.createElement('article');
    article.className = 'module-card';
    article.dataset.moduleId = module.id;
    const meta = document.createElement('div');
    meta.className = 'module-meta';
    meta.innerHTML = `<span class="badge ${module.status === 'planned' ? 'status-planned' : ''}">${escapeHtml(humanize(module.status))}</span><span class="badge section-${escapeHtml(module.section)}">${escapeHtml(humanize(module.section))}</span>`;
    const title = document.createElement('h3'); title.textContent = module.title;
    const description = document.createElement('p'); description.textContent = module.description;
    const chips = document.createElement('div'); chips.className = 'chip-list';
    (module.dataFamilies || []).forEach(family => { const chip = document.createElement('span'); chip.className = 'chip'; chip.textContent = humanize(family); chips.appendChild(chip); });
    article.append(meta, title, description, chips);
    if (module.launchTarget === 'crewmans-primer') {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'primary-action'; button.textContent = module.actionLabel || 'Open Crewman’s Primer';
      button.addEventListener('click', () => void openPrimer()); article.appendChild(button);
    }
    return article;
  }

  function renderRegistry() {
    if (!registry || !gridTarget || !statusTarget) return;
    const query = (searchInput?.value || '').trim().toLowerCase();
    const modules = [...(registry.modules || [])].sort((a, b) => (a.priority || 999) - (b.priority || 999) || a.title.localeCompare(b.title));
    const matches = modules.filter(module => (activeFilter === 'all' || module.section === activeFilter) && (!query || moduleSearchText(module).includes(query)));
    gridTarget.innerHTML = '';
    if (!matches.length) gridTarget.innerHTML = '<div class="module-empty">No Barotrauma modules match the current search and filter.</div>';
    else matches.forEach(module => gridTarget.appendChild(createCard(module)));
    statusTarget.textContent = `${matches.length} of ${modules.length} modules shown · ${registry.status}`;
  }

  async function fetchText(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Barotrauma request failed: ${url} ${response.status}`);
    return response.text();
  }

  async function fetchJson(url) {
    return JSON.parse(await fetchText(url));
  }

  async function loadRegistry() {
    if (!gridTarget || !statusTarget) return;
    try { registry = await fetchJson(REGISTRY_URL); renderRegistry(); }
    catch (error) { statusTarget.textContent = 'The Barotrauma registry could not be loaded.'; gridTarget.innerHTML = '<div class="module-empty">Barotrauma module data is unavailable.</div>'; console.error(error); }
  }

  function ensurePrimerShell() {
    let browser = document.getElementById('barotrauma-primer-browser');
    if (browser) return browser;
    const workspace = document.getElementById('barotrauma');
    if (!workspace) return null;
    browser = document.createElement('section'); browser.id = 'barotrauma-primer-browser'; browser.className = 'primer-browser no-print'; browser.hidden = true; browser.setAttribute('aria-labelledby', 'primer-browser-title');
    workspace.appendChild(browser); return browser;
  }

  async function loadPrimer() {
    if (primerData) return primerData;
    const index = await fetchJson(PRIMER_INDEX_URL);
    const base = PRIMER_INDEX_URL.slice(0, PRIMER_INDEX_URL.lastIndexOf('/') + 1);
    const parts = index.sourceBundleParts || [];
    if (!parts.length) throw new Error('Primer source bundle is not registered.');
    const encoded = (await Promise.all(parts.map(file => fetchText(`${base}${file}`)))).join('').replace(/\s+/g, '');
    const binary = atob(encoded);
    const compressed = Uint8Array.from(binary, character => character.charCodeAt(0));
    const { default: BZip2 } = await import('https://cdn.jsdelivr.net/npm/bzip2-wasm@1.0.1/+esm');
    const decoder = new BZip2();
    await decoder.init();
    const decoded = decoder.decompress(compressed, index.sourceBundleDecodedBytes || 500000);
    const source = JSON.parse(new TextDecoder().decode(decoded));
    const byId = new Map((source.entries || []).map(entry => [entry.id, entry]));
    const entries = (index.readingOrder || []).map(id => byId.get(id)).filter(Boolean);
    if (entries.length !== index.entryCount || entries.length !== 198) throw new Error(`Expected 198 source-titled entries; loaded ${entries.length}.`);
    primerData = { index, entries };
    activePrimerId = entries[0]?.id || null;
    return primerData;
  }

  async function openPrimer() {
    const browser = ensurePrimerShell();
    if (!browser) return;
    browser.hidden = false; browser.innerHTML = '<p class="helper-note">Loading the complete Europan Crewman’s Primer…</p>';
    try { const data = await loadPrimer(); renderPrimer(browser, data); browser.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    catch (error) { browser.innerHTML = '<div class="primer-empty">The Crewman’s Primer could not be loaded.</div>'; console.error(error); }
  }

  function entryText(entry) {
    const body = (entry.blocks || []).flatMap(block => block.type === 'list' ? block.items || [] : [block.text || '']);
    return [entry.title, entry.category, entry.chapter, ...body].join(' ').toLowerCase();
  }

  function filteredEntries(browser, entries) {
    const query = (browser.querySelector('#primer-search')?.value || '').trim().toLowerCase();
    return entries.filter(entry => (primerCategory === 'all' || entry.category === primerCategory) && (!query || entryText(entry).includes(query)));
  }

  function renderPrimer(browser, { index, entries }) {
    browser.innerHTML = `
      <div class="primer-header"><div><p class="eyebrow">Complete source-document wiki conversion</p><h2 id="primer-browser-title">${escapeHtml(index.displayTitle || index.title)}</h2>
      <p class="primer-edition">${escapeHtml(index.edition)} · ${entries.length} source-titled entries · ${Number(index.wordCount || 0).toLocaleString()} words</p>
      <p>${escapeHtml(index.subtitle || '')}</p><p>${escapeHtml(index.description || '')}</p></div><p class="primer-disclaimer">${escapeHtml(index.disclaimer || '')}</p></div>
      <div class="primer-controls"><input id="primer-search" type="search" placeholder="Search every preserved title, paragraph, and list item..." aria-label="Search Crewman's Primer" />
      <button id="primer-close" class="secondary-action" type="button">Close Primer</button><div id="primer-categories" class="primer-categories" aria-label="Primer categories"></div></div>
      <div class="primer-layout"><nav id="primer-list" class="primer-list" aria-label="Primer source sections"></nav><article id="primer-entry" class="primer-entry"></article></div>`;
    browser.querySelector('#primer-search')?.addEventListener('input', () => renderPrimerList(browser, entries));
    browser.querySelector('#primer-close')?.addEventListener('click', () => { browser.hidden = true; });
    const target = browser.querySelector('#primer-categories');
    ['all', ...(index.categories || [])].forEach(category => {
      const button = document.createElement('button'); button.type = 'button'; button.className = `primer-chip ${category === primerCategory ? 'active' : ''}`;
      button.textContent = category === 'all' ? 'All Source Sections' : category;
      button.addEventListener('click', () => { primerCategory = category; target.querySelectorAll('button').forEach(item => item.classList.toggle('active', item === button)); renderPrimerList(browser, entries); });
      target.appendChild(button);
    });
    renderPrimerList(browser, entries); renderPrimerEntry(browser, entries, activePrimerId || entries[0]?.id);
  }

  function renderPrimerList(browser, entries) {
    const list = browser.querySelector('#primer-list'); if (!list) return;
    const filtered = filteredEntries(browser, entries); list.innerHTML = '';
    if (!filtered.length) { list.innerHTML = '<div class="primer-empty">No source sections match the current search.</div>'; return; }
    if (!filtered.some(entry => entry.id === activePrimerId)) { activePrimerId = filtered[0].id; renderPrimerEntry(browser, entries, activePrimerId); }
    filtered.forEach(entry => {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.entryId = entry.id; button.className = entry.id === activePrimerId ? 'active' : '';
      button.style.setProperty('--primer-level', String(Math.max(0, Number(entry.headingLevel || 0) - 1)));
      const position = entries.indexOf(entry) + 1;
      button.innerHTML = `<strong>${String(position).padStart(3, '0')}. ${escapeHtml(entry.title)}</strong><br><small>${escapeHtml(entry.category)} · heading level ${escapeHtml(entry.headingLevel)}</small>`;
      button.addEventListener('click', () => renderPrimerEntry(browser, entries, entry.id)); list.appendChild(button);
    });
  }

  function renderBlocks(target, blocks) {
    (blocks || []).forEach(block => {
      if (block.type === 'list') {
        const list = document.createElement(block.ordered ? 'ol' : 'ul');
        if (block.level) list.style.marginLeft = `${Number(block.level) * 1.1}em`;
        (block.items || []).forEach(text => { const item = document.createElement('li'); item.textContent = text; list.appendChild(item); });
        target.appendChild(list);
      } else {
        const paragraph = document.createElement('p'); paragraph.textContent = block.text || ''; target.appendChild(paragraph);
      }
    });
  }

  function renderPrimerEntry(browser, entries, entryId) {
    const entry = entries.find(item => item.id === entryId) || entries[0];
    const target = browser.querySelector('#primer-entry'); if (!entry || !target) return;
    activePrimerId = entry.id;
    browser.querySelectorAll('#primer-list button').forEach(button => button.classList.toggle('active', button.dataset.entryId === entry.id));
    const position = entries.indexOf(entry);
    target.innerHTML = `<div class="primer-entry-meta">Source entry ${position + 1} of ${entries.length} · ${escapeHtml(entry.category)}</div><h3>${escapeHtml(entry.title)}</h3>
      <div class="primer-source-meta">${escapeHtml(entry.chapter || '')} · source paragraphs ${escapeHtml(entry.sourceStartParagraph)}–${escapeHtml(entry.sourceEndParagraph)} · ${escapeHtml(entry.wordCount)} words</div>`;
    renderBlocks(target, entry.blocks);
    const nav = document.createElement('div'); nav.className = 'primer-navigation';
    if (position > 0) { const prev = document.createElement('button'); prev.type = 'button'; prev.className = 'secondary-action'; prev.textContent = `← ${entries[position - 1].title}`; prev.addEventListener('click', () => renderPrimerEntry(browser, entries, entries[position - 1].id)); nav.appendChild(prev); }
    if (position < entries.length - 1) { const next = document.createElement('button'); next.type = 'button'; next.className = 'secondary-action'; next.textContent = `${entries[position + 1].title} →`; next.addEventListener('click', () => renderPrimerEntry(browser, entries, entries[position + 1].id)); nav.appendChild(next); }
    target.appendChild(nav); target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  searchInput?.addEventListener('input', renderRegistry);
  filterButtons.forEach(button => button.addEventListener('click', () => { activeFilter = button.dataset.barotraumaFilter || 'all'; filterButtons.forEach(item => item.classList.toggle('active', item === button)); renderRegistry(); }));
  injectPrimerStyles(); ensurePrimerShell(); void loadRegistry();
})();
