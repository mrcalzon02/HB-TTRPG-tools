(() => {
  const root = document.getElementById('rpg-root');

  // Every source-defined section is attached explicitly, in DOCX order.
  // The Markdown files remain the source of truth; there is no bundled content payload.
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

  const expectedTextUnitCount = 804;

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

  function renderInline(value) {
    const parts = String(value ?? '').split('**');
    return parts.map((part, index) => index % 2
      ? `<strong>${escapeHtml(part)}</strong>`
      : escapeHtml(part)
    ).join('');
  }

  function parseEntry(documentText, file, usedIds) {
    const lines = documentText.replace(/\r\n?/g, '\n').split('\n');
    let title = null;
    const blocks = [];

    for (const rawLine of lines) {
      if (title === null) {
        const heading = rawLine.match(/^## (.*)$/);
        if (heading) {
          title = heading[1];
          continue;
        }
        if (rawLine !== '') throw new Error(`${file} contains content before its wiki-entry title.`);
        continue;
      }

      if (rawLine === '') continue;

      const image = rawLine.match(/^!\[\]\((data\/barotrauma\/wiki\/rpg\/assets\/[^)]+)\)$/);
      if (image) {
        blocks.push({ type: 'image', src: image[1] });
        continue;
      }

      const listItem = rawLine.match(/^(\s*)(-|\d+\.|[a-z]\.) (.*)$/);
      if (listItem) {
        if (/\t/.test(listItem[1])) throw new Error(`${file} uses a tab-indented list item.`);
        if (listItem[1].length % 4 !== 0) throw new Error(`${file} uses nonstandard list indentation.`);
        blocks.push({
          type: 'listItem',
          depth: listItem[1].length / 4,
          marker: listItem[2],
          text: listItem[3]
        });
        continue;
      }

      blocks.push({ type: 'paragraph', text: rawLine });
    }

    if (title === null) throw new Error(`${file} does not contain a wiki-entry title.`);

    const baseId = slugify(title);
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) id = `${baseId}-${suffix++}`;
    usedIds.add(id);

    return {
      id,
      title,
      file,
      blocks,
      textUnitCount: blocks.filter(block => block.type !== 'image').length
    };
  }

  async function loadEntries() {
    const count = wikiEntryFiles.length;
    root.innerHTML = `<div class="rpg-loading">Loading all ${count} source-defined Markdown entries…</div>`;
    const documents = await Promise.all(wikiEntryFiles.map(fetchText));
    const usedIds = new Set();
    const entries = documents.map((documentText, index) =>
      parseEntry(documentText, wikiEntryFiles[index], usedIds)
    );
    const textUnitCount = entries.reduce((sum, entry) => sum + entry.textUnitCount, 0);
    if (textUnitCount !== expectedTextUnitCount) {
      throw new Error(`Expected ${expectedTextUnitCount} preserved text units; loaded ${textUnitCount}.`);
    }
    return entries;
  }

  function entryText(entry) {
    return [
      entry.title,
      ...entry.blocks.map(block => block.text || '')
    ].join(' ').toLowerCase();
  }

  function renderBlocks(blocks) {
    const output = [];
    let listOpen = false;

    const closeList = () => {
      if (!listOpen) return;
      output.push('</div>');
      listOpen = false;
    };

    for (const block of blocks) {
      if (block.type === 'listItem') {
        if (!listOpen) {
          output.push('<div class="rpg-list" role="list">');
          listOpen = true;
        }
        output.push(
          `<div class="rpg-list-line" role="listitem" style="--list-depth:${block.depth}">` +
          `<span class="rpg-list-marker" aria-hidden="true">${escapeHtml(block.marker)}</span>` +
          `<span class="rpg-list-text">${renderInline(block.text)}</span>` +
          '</div>'
        );
        continue;
      }

      closeList();

      if (block.type === 'image') {
        output.push(`<figure class="rpg-source-image"><img src="${escapeHtml(block.src)}" alt="" loading="lazy"></figure>`);
      } else {
        output.push(`<p>${renderInline(block.text)}</p>`);
      }
    }

    closeList();
    return output.join('');
  }

  function render(entries) {
    const total = entries.length;
    const totalTextUnits = entries.reduce((sum, entry) => sum + entry.textUnitCount, 0);
    let activeId = window.location.hash.replace(/^#/, '') || entries[0].id;

    root.innerHTML = `
      <div class="rpg-controls">
        <input id="rpg-search" type="search" placeholder="Search all Barotrauma RPG entries…" aria-label="Search Barotrauma RPG wiki">
        <span id="rpg-status" class="rpg-status">${total} entries · ${totalTextUnits} preserved text units</span>
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
      nav.querySelectorAll('a').forEach(link => {
        link.classList.toggle('active', link.dataset.entryId === activeId);
      });
      const position = entries.indexOf(entry) + 1;
      article.innerHTML =
        `<div class="rpg-meta">Source entry ${position} of ${total} · ${entry.textUnitCount} text units</div>` +
        `<h2>${escapeHtml(entry.title)}</h2>` +
        renderBlocks(entry.blocks);
      if (updateHash) history.replaceState(null, '', `#${entry.id}`);
      article.scrollTop = 0;
    }

    function renderList() {
      const query = search.value.trim().toLowerCase();
      const matches = query ? entries.filter(entry => entryText(entry).includes(query)) : entries;
      status.textContent = query
        ? `${matches.length} of ${total} entries match`
        : `${total} entries · ${totalTextUnits} preserved text units`;
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

      if (!matches.length) {
        nav.innerHTML = '<div class="rpg-error">No source entries match this search.</div>';
      } else if (!matches.some(entry => entry.id === activeId)) {
        openEntry(matches[0].id);
      }
    }

    search.addEventListener('input', renderList);
    window.addEventListener('hashchange', () => {
      openEntry(window.location.hash.replace(/^#/, ''), false);
    });
    renderList();
    openEntry(activeId, false);
  }

  async function start() {
    try {
      const entries = await loadEntries();
      if (!entries.length) throw new Error('No Barotrauma RPG Markdown entries are attached.');
      render(entries);
    } catch (error) {
      root.innerHTML = `<div class="rpg-error"><strong>The Barotrauma RPG wiki could not be loaded.</strong><br>${escapeHtml(error.message)}</div>`;
      console.error(error);
    }
  }

  void start();
})();
