(() => {
  const indexUrl = 'data/barotrauma/wiki/crewmans-primer-index.json';
  const sourceUrl = 'data/barotrauma/wiki/crewmans-primer-source.json';
  const sourceParts = Array.from(
    { length: 8 },
    (_, index) => `data/barotrauma/wiki/source/crewmans-primer-compact-part-${String(index).padStart(2, '0')}.b64`
  );
  const root = document.getElementById('primer-root');
  const mode = new URLSearchParams(window.location.search).get('mode') === 'source' ? 'source' : 'wiki';
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

  async function fetchText(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.text();
  }

  async function fetchJson(url) {
    return JSON.parse(await fetchText(url));
  }

  async function rebuildSourceFromTrackedBundle() {
    if (!window.bzip2?.array || !window.bzip2?.simple) {
      throw new Error('The local Primer source decoder was not loaded.');
    }

    root.innerHTML = '<div class="primer-loading">The generated document file is unavailable. Rebuilding all 198 entries from the tracked source bundle…</div>';
    const encoded = (await Promise.all(sourceParts.map(fetchText))).join('').replace(/\s+/g, '');
    if (encoded.length !== 95872) {
      throw new Error(`The tracked Primer source bundle has ${encoded.length} encoded characters instead of 95872.`);
    }

    let compressed;
    try {
      const binary = atob(encoded);
      compressed = Uint8Array.from(binary, character => character.charCodeAt(0));
    } catch (error) {
      throw new Error(`The tracked Primer source bundle is not valid Base64: ${error.message}`);
    }

    let decoded;
    try {
      decoded = window.bzip2.simple(window.bzip2.array(compressed));
    } catch (error) {
      throw new Error(`The tracked Primer source bundle could not be decompressed: ${error.message || error}`);
    }

    let source;
    try {
      source = JSON.parse(new TextDecoder().decode(decoded));
    } catch (error) {
      throw new Error(`The reconstructed Primer document is not valid JSON: ${error.message}`);
    }
    source.loadedFrom = 'tracked-source-bundle';
    return source;
  }

  async function loadSource() {
    try {
      const source = await fetchJson(sourceUrl);
      source.loadedFrom = 'generated-source-json';
      return source;
    } catch (jsonError) {
      console.warn(`Generated Primer JSON unavailable; using tracked source bundle instead. ${jsonError.message}`);
      return rebuildSourceFromTrackedBundle();
    }
  }

  function entryText(entry) {
    return [entry.title, entry.category, entry.chapter, ...(entry.blocks || []).flatMap(block => block.type === 'list' ? block.items || [] : [block.text || ''])].join(' ').toLowerCase();
  }

  function appendBlocks(target, blocks) {
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

  function renderWiki(index, entries, loadedFrom) {
    let activeId = entries[0].id;
    root.innerHTML = `
      <div class="primer-controls"><input id="primer-search" type="search" placeholder="Search every title, paragraph, and list item…" aria-label="Search Primer wiki"><span id="primer-status" class="primer-status">198 entries · ${loadedFrom === 'tracked-source-bundle' ? 'rebuilt from tracked source' : 'source document loaded'}</span></div>
      <div class="primer-layout"><nav id="primer-nav" class="primer-nav" aria-label="Primer entries"></nav><article id="primer-article" class="primer-article"></article></div>`;
    const nav = document.getElementById('primer-nav');
    const article = document.getElementById('primer-article');
    const search = document.getElementById('primer-search');
    const status = document.getElementById('primer-status');

    function openEntry(id) {
      const entry = entries.find(item => item.id === id) || entries[0];
      activeId = entry.id;
      nav.querySelectorAll('button').forEach(button => button.classList.toggle('active', button.dataset.entryId === activeId));
      const position = entries.indexOf(entry) + 1;
      article.innerHTML = `<div class="primer-meta">Source entry ${position} of 198 · ${escapeHtml(entry.category)} · source paragraphs ${entry.sourceStartParagraph}–${entry.sourceEndParagraph}</div><h2>${escapeHtml(entry.title)}</h2>`;
      appendBlocks(article, entry.blocks);
      article.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function renderList() {
      const query = search.value.trim().toLowerCase();
      const matches = query ? entries.filter(entry => entryText(entry).includes(query)) : entries;
      status.textContent = `${matches.length} of 198 entries`;
      nav.innerHTML = '';
      matches.forEach(entry => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.entryId = entry.id;
        button.className = entry.id === activeId ? 'active' : '';
        button.innerHTML = `<strong>${String(entries.indexOf(entry) + 1).padStart(3, '0')}. ${escapeHtml(entry.title)}</strong><br><small>${escapeHtml(entry.category)}</small>`;
        button.addEventListener('click', () => openEntry(entry.id));
        nav.appendChild(button);
      });
      if (!matches.length) nav.innerHTML = '<div class="primer-error">No entries match this search.</div>';
      else if (!matches.some(entry => entry.id === activeId)) openEntry(matches[0].id);
    }

    search.addEventListener('input', renderList);
    renderList();
    openEntry(activeId);
  }

  function renderSource(index, entries, loadedFrom) {
    root.innerHTML = `
      <div class="primer-controls"><input id="primer-search" type="search" placeholder="Search inside the full source document…" aria-label="Search source document"><span id="primer-status" class="primer-status">Showing all 198 source sections · ${loadedFrom === 'tracked-source-bundle' ? 'rebuilt from tracked source' : 'source document loaded'}</span></div>
      <div class="primer-layout"><nav id="primer-nav" class="primer-nav" aria-label="Source table of contents"></nav><article id="primer-document" class="primer-article primer-document"></article></div>`;
    const nav = document.getElementById('primer-nav');
    const documentTarget = document.getElementById('primer-document');
    const search = document.getElementById('primer-search');
    const status = document.getElementById('primer-status');

    function renderDocument() {
      const query = search.value.trim().toLowerCase();
      const matches = query ? entries.filter(entry => entryText(entry).includes(query)) : entries;
      status.textContent = query ? `${matches.length} of 198 source sections match` : 'Showing all 198 source sections';
      nav.innerHTML = '';
      documentTarget.innerHTML = `<header><p class="primer-meta">Complete source document · ${matches.length} visible sections</p><h2>${escapeHtml(index.displayTitle || index.title)}</h2><p>${escapeHtml(index.subtitle || '')}</p></header>`;
      matches.forEach(entry => {
        const position = entries.indexOf(entry) + 1;
        const button = document.createElement('button');
        button.type = 'button';
        button.innerHTML = `<strong>${String(position).padStart(3, '0')}. ${escapeHtml(entry.title)}</strong><br><small>${escapeHtml(entry.category)}</small>`;
        button.addEventListener('click', () => document.getElementById(`source-${entry.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        nav.appendChild(button);

        const section = document.createElement('section');
        section.className = 'primer-document-section';
        section.id = `source-${entry.id}`;
        const heading = document.createElement(entry.headingLevel === 1 ? 'h2' : entry.headingLevel === 2 ? 'h3' : 'h4');
        heading.textContent = entry.title;
        section.appendChild(heading);
        const metadata = document.createElement('div');
        metadata.className = 'primer-meta';
        metadata.textContent = `Source entry ${position} of 198 · ${entry.category} · paragraphs ${entry.sourceStartParagraph}–${entry.sourceEndParagraph}`;
        section.appendChild(metadata);
        appendBlocks(section, entry.blocks);
        documentTarget.appendChild(section);
      });
      if (!matches.length) {
        nav.innerHTML = '<div class="primer-error">No source sections match this search.</div>';
        documentTarget.innerHTML = '<div class="primer-error">No source sections match this search.</div>';
      }
    }

    search.addEventListener('input', renderDocument);
    renderDocument();
  }

  async function start() {
    document.getElementById(mode === 'source' ? 'primer-source-tab' : 'primer-wiki-tab').classList.add('active');
    try {
      const [index, source] = await Promise.all([fetchJson(indexUrl), loadSource()]);
      const entries = source.entries || [];
      if (entries.length !== 198) throw new Error(`Expected 198 source-defined entries; loaded ${entries.length}.`);
      if (entries[0]?.id !== 'foreword' || entries.at(-1)?.id !== 'final-caution') {
        throw new Error('The reconstructed Primer entry order is incomplete.');
      }
      if (mode === 'source') renderSource(index, entries, source.loadedFrom);
      else renderWiki(index, entries, source.loadedFrom);
    } catch (error) {
      root.innerHTML = `<div class="primer-error"><strong>The Crewman's Primer could not be loaded.</strong><br>${escapeHtml(error.message)}</div>`;
      console.error(error);
    }
  }

  void start();
})();
