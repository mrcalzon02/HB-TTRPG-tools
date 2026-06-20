(() => {
  const root = document.getElementById('primer-root');
  const mode = new URLSearchParams(window.location.search).get('mode') === 'source' ? 'source' : 'wiki';

  // Entries are attached here one at a time.
  const wikiEntryFiles = [
    'data/barotrauma/wiki/entries/001-foreword.md'
  ];

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));

  const slugify = value => value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'entry';

  async function fetchText(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.text();
  }

  function parseEntry(documentText, file) {
    const lines = documentText.replace(/\r\n?/g, '\n').split('\n');
    let title = '';
    const blocks = [];

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      const heading = line.match(/^##\s+(.+?)\s*$/);

      if (heading) {
        if (title) throw new Error(`${file} contains more than one wiki entry.`);
        title = heading[1].trim();
        continue;
      }

      if (!title || !line.trim()) continue;

      if (/^[-*]\s+/.test(line)) {
        blocks.push({ type: 'listItem', text: line.replace(/^[-*]\s+/, '').trim() });
      } else {
        blocks.push({ type: 'paragraph', text: line.trim() });
      }
    }

    if (!title) throw new Error(`${file} does not contain a wiki-entry title.`);

    return {
      id: slugify(title),
      title,
      blocks,
      file
    };
  }

  async function loadEntries() {
    root.innerHTML = `<div class="primer-loading">Loading ${wikiEntryFiles.length} attached wiki entry…</div>`;
    const documents = await Promise.all(wikiEntryFiles.map(fetchText));
    return documents.map((documentText, index) => parseEntry(documentText, wikiEntryFiles[index]));
  }

  function entryText(entry) {
    return [entry.title, ...entry.blocks.map(block => block.text || '')].join(' ').toLowerCase();
  }

  function appendBlocks(target, blocks) {
    let activeList = null;

    for (const block of blocks) {
      if (block.type === 'listItem') {
        if (!activeList) {
          activeList = document.createElement('ul');
          target.appendChild(activeList);
        }

        const item = document.createElement('li');
        item.textContent = block.text;
        activeList.appendChild(item);
      } else {
        activeList = null;
        const paragraph = document.createElement('p');
        paragraph.textContent = block.text;
        target.appendChild(paragraph);
      }
    }
  }

  function renderWiki(entries) {
    const total = entries.length;
    let activeId = window.location.hash.replace(/^#/, '') || entries[0].id;

    root.innerHTML = `
      <div class="primer-controls">
        <input id="primer-search" type="search" placeholder="Search attached wiki entries…" aria-label="Search Primer wiki">
        <span id="primer-status" class="primer-status">${total} attached ${total === 1 ? 'entry' : 'entries'}</span>
      </div>
      <div class="primer-layout">
        <nav id="primer-nav" class="primer-nav" aria-label="Primer entries"></nav>
        <article id="primer-article" class="primer-article"></article>
      </div>`;

    const nav = document.getElementById('primer-nav');
    const article = document.getElementById('primer-article');
    const search = document.getElementById('primer-search');
    const status = document.getElementById('primer-status');

    function openEntry(id, updateHash = true) {
      const entry = entries.find(item => item.id === id) || entries[0];
      activeId = entry.id;

      nav.querySelectorAll('a').forEach(link => {
        link.classList.toggle('active', link.dataset.entryId === activeId);
      });

      const position = entries.indexOf(entry) + 1;
      article.innerHTML = `<div class="primer-meta">Wiki entry ${position} of ${total}</div><h2>${escapeHtml(entry.title)}</h2>`;
      appendBlocks(article, entry.blocks);

      if (updateHash) history.replaceState(null, '', `#${entry.id}`);
    }

    function renderList() {
      const query = search.value.trim().toLowerCase();
      const matches = query ? entries.filter(entry => entryText(entry).includes(query)) : entries;

      status.textContent = `${matches.length} of ${total} attached ${total === 1 ? 'entry' : 'entries'}`;
      nav.innerHTML = '';

      for (const entry of matches) {
        const link = document.createElement('a');
        link.href = `#${entry.id}`;
        link.dataset.entryId = entry.id;
        link.className = `secondary-action${entry.id === activeId ? ' active' : ''}`;
        link.innerHTML = `<strong>${String(entries.indexOf(entry) + 1).padStart(3, '0')}. ${escapeHtml(entry.title)}</strong>`;
        link.addEventListener('click', event => {
          event.preventDefault();
          openEntry(entry.id);
        });
        nav.appendChild(link);
      }

      if (!matches.length) {
        nav.innerHTML = '<div class="primer-error">No attached entries match this search.</div>';
      } else if (!matches.some(entry => entry.id === activeId)) {
        openEntry(matches[0].id);
      }
    }

    search.addEventListener('input', renderList);
    window.addEventListener('hashchange', () => openEntry(window.location.hash.replace(/^#/, ''), false));

    renderList();
    openEntry(activeId, false);
  }

  function renderSource(entries) {
    const total = entries.length;

    root.innerHTML = `
      <div class="primer-controls">
        <input id="primer-search" type="search" placeholder="Search attached source entries…" aria-label="Search source entries">
        <span id="primer-status" class="primer-status">Showing ${total} attached ${total === 1 ? 'section' : 'sections'}</span>
      </div>
      <div class="primer-layout">
        <nav id="primer-nav" class="primer-nav" aria-label="Source table of contents"></nav>
        <article id="primer-document" class="primer-article primer-document"></article>
      </div>`;

    const nav = document.getElementById('primer-nav');
    const documentTarget = document.getElementById('primer-document');
    const search = document.getElementById('primer-search');
    const status = document.getElementById('primer-status');

    function renderDocument() {
      const query = search.value.trim().toLowerCase();
      const matches = query ? entries.filter(entry => entryText(entry).includes(query)) : entries;

      status.textContent = `${matches.length} of ${total} attached ${total === 1 ? 'section' : 'sections'}`;
      nav.innerHTML = '';
      documentTarget.innerHTML = `<header><p class="primer-meta">Attached source entries</p><h2>THE EUROPAN CREWMAN’S PRIMER</h2></header>`;

      for (const entry of matches) {
        const link = document.createElement('a');
        link.href = `#source-${entry.id}`;
        link.className = 'secondary-action';
        link.innerHTML = `<strong>${String(entries.indexOf(entry) + 1).padStart(3, '0')}. ${escapeHtml(entry.title)}</strong>`;
        nav.appendChild(link);

        const section = document.createElement('section');
        section.className = 'primer-document-section';
        section.id = `source-${entry.id}`;

        const heading = document.createElement('h3');
        heading.textContent = entry.title;
        section.appendChild(heading);
        appendBlocks(section, entry.blocks);
        documentTarget.appendChild(section);
      }

      if (!matches.length) {
        nav.innerHTML = '<div class="primer-error">No attached source entries match this search.</div>';
        documentTarget.innerHTML = '<div class="primer-error">No attached source entries match this search.</div>';
      }
    }

    search.addEventListener('input', renderDocument);
    renderDocument();
  }

  async function start() {
    document.getElementById(mode === 'source' ? 'primer-source-tab' : 'primer-wiki-tab').classList.add('active');

    try {
      const entries = await loadEntries();
      if (!entries.length) throw new Error('No wiki entries are attached yet.');

      if (mode === 'source') renderSource(entries);
      else renderWiki(entries);
    } catch (error) {
      root.innerHTML = `<div class="primer-error"><strong>The Crewman's Primer could not be loaded.</strong><br>${escapeHtml(error.message)}</div>`;
      console.error(error);
    }
  }

  void start();
})();
