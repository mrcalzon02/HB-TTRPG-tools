(() => {
  const root = document.getElementById('rpg-root');

  // Source sections are attached here one at a time in document order.
  const wikiEntryFiles = [
    'data/barotrauma/wiki/rpg/entries/001-barotrauma-rpg-test-v-0-10.md',
    'data/barotrauma/wiki/rpg/entries/002-stats.md'
  ];

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
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

  function parseEntry(documentText, file, usedIds) {
    const lines = documentText.replace(/\r\n?/g, '\n').split('\n');
    let title = '';
    const paragraphs = [];

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      const heading = line.match(/^##\s+(.+?)\s*$/);

      if (heading) {
        if (title) throw new Error(`${file} contains more than one wiki entry.`);
        title = heading[1].trim();
        continue;
      }

      if (title && line.trim()) paragraphs.push(line);
    }

    if (!title) throw new Error(`${file} does not contain a wiki-entry title.`);

    const baseId = slugify(title);
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) id = `${baseId}-${suffix++}`;
    usedIds.add(id);

    return { id, title, paragraphs };
  }

  async function loadEntries() {
    const count = wikiEntryFiles.length;
    root.innerHTML = `<div class="rpg-loading">Loading ${count} converted wiki ${count === 1 ? 'entry' : 'entries'}…</div>`;
    const documents = await Promise.all(wikiEntryFiles.map(fetchText));
    const usedIds = new Set();
    return documents.map((documentText, index) => parseEntry(documentText, wikiEntryFiles[index], usedIds));
  }

  function entryText(entry) {
    return [entry.title, ...entry.paragraphs].join(' ').toLowerCase();
  }

  function render(entries) {
    const total = entries.length;
    let activeId = window.location.hash.replace(/^#/, '') || entries[0].id;

    root.innerHTML = `
      <div class="rpg-controls">
        <input id="rpg-search" type="search" placeholder="Search converted RPG entries…" aria-label="Search Barotrauma RPG wiki">
        <span id="rpg-status" class="rpg-status">${total} converted ${total === 1 ? 'entry' : 'entries'}</span>
      </div>
      <div class="rpg-layout">
        <nav id="rpg-nav" class="rpg-nav" aria-label="Barotrauma RPG entries"></nav>
        <article id="rpg-article" class="rpg-article"></article>
      </div>`;

    const nav = document.getElementById('rpg-nav');
    const article = document.getElementById('rpg-article');
    const search = document.getElementById('rpg-search');
    const status = document.getElementById('rpg-status');

    function openEntry(id, updateHash = true) {
      const entry = entries.find(item => item.id === id) || entries[0];
      activeId = entry.id;
      nav.querySelectorAll('a').forEach(link => link.classList.toggle('active', link.dataset.entryId === activeId));
      const position = entries.indexOf(entry) + 1;
      article.innerHTML = `<div class="rpg-meta">Wiki entry ${position} of ${total}</div><h2>${escapeHtml(entry.title)}</h2>${entry.paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}`;
      if (updateHash) history.replaceState(null, '', `#${entry.id}`);
    }

    function renderList() {
      const query = search.value.trim().toLowerCase();
      const matches = query ? entries.filter(entry => entryText(entry).includes(query)) : entries;
      status.textContent = `${matches.length} of ${total} converted ${total === 1 ? 'entry' : 'entries'}`;
      nav.innerHTML = '';

      for (const entry of matches) {
        const link = document.createElement('a');
        link.href = `#${entry.id}`;
        link.dataset.entryId = entry.id;
        link.className = entry.id === activeId ? 'active' : '';
        link.innerHTML = `<strong>${String(entries.indexOf(entry) + 1).padStart(3, '0')}. ${escapeHtml(entry.title)}</strong>`;
        link.addEventListener('click', event => {
          event.preventDefault();
          openEntry(entry.id);
        });
        nav.appendChild(link);
      }

      if (!matches.length) nav.innerHTML = '<div class="rpg-error">No converted entries match this search.</div>';
      else if (!matches.some(entry => entry.id === activeId)) openEntry(matches[0].id);
    }

    search.addEventListener('input', renderList);
    window.addEventListener('hashchange', () => openEntry(window.location.hash.replace(/^#/, ''), false));
    renderList();
    openEntry(activeId, false);
  }

  async function start() {
    try {
      const entries = await loadEntries();
      if (!entries.length) throw new Error('No Barotrauma RPG wiki entries are attached yet.');
      render(entries);
    } catch (error) {
      root.innerHTML = `<div class="rpg-error"><strong>The Barotrauma RPG wiki could not be loaded.</strong><br>${escapeHtml(error.message)}</div>`;
      console.error(error);
    }
  }

  void start();
})();
