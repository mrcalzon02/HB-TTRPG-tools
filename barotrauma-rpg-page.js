(() => {
  const root = document.getElementById('rpg-root');

  const wikiEntryFiles = [
    'data/barotrauma/wiki/rpg/entries/001-barotrauma-rpg-test-v-0-10.md',
    'data/barotrauma/wiki/rpg/entries/002-stats.md',
    'data/barotrauma/wiki/rpg/entries/003-gaining-a-level-and-gameplay-order.md',
    'data/barotrauma/wiki/rpg/entries/004-stuff-mine-yours-ours.md',
    'data/barotrauma/wiki/rpg/entries/005-backgrounds.md',
    'data/barotrauma/wiki/rpg/entries/006-submarines.md',
    'data/barotrauma/wiki/rpg/entries/007-upgrades.md',
    'data/barotrauma/wiki/rpg/entries/008-alien-salvage.md',
    'data/barotrauma/wiki/rpg/entries/009-jobs-events-and-stations.md',
    'data/barotrauma/wiki/rpg/entries/010-upkeep.md',
    'data/barotrauma/wiki/rpg/entries/011-personal-combat-damage-repairs-disease-and-death.md',
    'data/barotrauma/wiki/rpg/entries/012-death-is-not-the-end.md',
    'data/barotrauma/wiki/rpg/entries/013-sanity-and-losing-your-mind.md',
    'data/barotrauma/wiki/rpg/entries/014-game-flow.md',
    'data/barotrauma/wiki/rpg/entries/015-sample-stations.md',
    'data/barotrauma/wiki/rpg/entries/016-12-quotes-of-famous-europan-sea-captains-to-live-by.md',
    'data/barotrauma/wiki/rpg/entries/017-submarine-weapons-systems.md',
    'data/barotrauma/wiki/rpg/entries/018-sample-pirate-encounter.md',
    'data/barotrauma/wiki/rpg/entries/019-salvaging-a-wreck.md'
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

    return { id, title, paragraphs, file };
  }

  async function loadEntries() {
    root.innerHTML = '<div class="rpg-loading">Loading 19 exact source entries…</div>';
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
        <input id="rpg-search" type="search" placeholder="Search all RPG source entries…" aria-label="Search Barotrauma RPG wiki">
        <span id="rpg-status" class="rpg-status">${total} exact source entries</span>
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
      status.textContent = `${matches.length} of ${total} exact source entries`;
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

      if (!matches.length) nav.innerHTML = '<div class="rpg-error">No entries match this search.</div>';
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
      if (entries.length !== 19) throw new Error(`Expected 19 source entries but loaded ${entries.length}.`);
      render(entries);
    } catch (error) {
      root.innerHTML = `<div class="rpg-error"><strong>The Barotrauma RPG wiki could not be loaded.</strong><br>${escapeHtml(error.message)}</div>`;
      console.error(error);
    }
  }

  void start();
})();
