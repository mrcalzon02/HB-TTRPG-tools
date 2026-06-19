(() => {
  const root = document.getElementById('primer-root');
  const mode = new URLSearchParams(window.location.search).get('mode') === 'source' ? 'source' : 'wiki';
  const manuscriptFiles = [
    'data/barotrauma/wiki/canonical/crewmans-primer-01.md',
    'data/barotrauma/wiki/canonical/crewmans-primer-02.md',
    'data/barotrauma/wiki/canonical/crewmans-primer-03.md',
    'data/barotrauma/wiki/canonical/crewmans-primer-04.md',
    'data/barotrauma/wiki/plain/crewmans-primer-05.md',
    'data/barotrauma/wiki/plain/crewmans-primer-06.md',
    'data/barotrauma/wiki/plain/crewmans-primer-07.md',
    'data/barotrauma/wiki/plain/crewmans-primer-08.md',
    'data/barotrauma/wiki/plain/crewmans-primer-09.md',
    'data/barotrauma/wiki/plain/crewmans-primer-10a.md',
    'data/barotrauma/wiki/plain/crewmans-primer-10b.md',
    'data/barotrauma/wiki/plain/crewmans-primer-11.md',
    'data/barotrauma/wiki/plain/crewmans-primer-12.md',
    'data/barotrauma/wiki/plain/crewmans-primer-13.md',
    'data/barotrauma/wiki/plain/crewmans-primer-14.md',
    'data/barotrauma/wiki/plain/crewmans-primer-15.md',
    'data/barotrauma/wiki/plain/crewmans-primer-16.md',
    'data/barotrauma/wiki/plain/crewmans-primer-17.md',
    'data/barotrauma/wiki/plain/crewmans-primer-17b.md',
    'data/barotrauma/wiki/plain/crewmans-primer-17c.md',
    'data/barotrauma/wiki/plain/crewmans-primer-17d.md',
    'data/barotrauma/wiki/plain/crewmans-primer-17e.md',
    'data/barotrauma/wiki/plain/crewmans-primer-17f.md',
    'data/barotrauma/wiki/plain/crewmans-primer-17g.md',
    'data/barotrauma/wiki/plain/crewmans-primer-17h.md',
    'data/barotrauma/wiki/plain/crewmans-primer-18.md',
    'data/barotrauma/wiki/plain/crewmans-primer-19.md',
    'data/barotrauma/wiki/plain/crewmans-primer-20a.md',
    'data/barotrauma/wiki/plain/crewmans-primer-20b.md',
    'data/barotrauma/wiki/plain/crewmans-primer-20.md',
    'data/barotrauma/wiki/plain/crewmans-primer-21.md',
    'data/barotrauma/wiki/plain/crewmans-primer-22.md',
    'data/barotrauma/wiki/plain/crewmans-primer-23.md',
    'data/barotrauma/wiki/plain/crewmans-primer-24.md',
    'data/barotrauma/wiki/plain/crewmans-primer-25.md'
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

  function parseMarkdownFiles(documents) {
    const entries = [];
    const titleKeys = new Set();
    const usedIds = new Set();

    for (const documentText of documents) {
      const lines = documentText.replace(/\r\n?/g, '\n').split('\n');
      let current = null;

      const finish = () => {
        if (!current) return;
        const key = current.title.trim().toLocaleUpperCase();
        if (!titleKeys.has(key)) {
          titleKeys.add(key);
          let id = slugify(current.title);
          let suffix = 2;
          while (usedIds.has(id)) id = `${slugify(current.title)}-${suffix++}`;
          usedIds.add(id);
          current.id = id;
          entries.push(current);
        }
        current = null;
      };

      for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        const heading = line.match(/^##\s+(.+?)\s*$/);
        if (heading) {
          finish();
          current = { id: '', title: heading[1].trim(), blocks: [] };
          continue;
        }
        if (!current || !line.trim()) continue;
        if (/^-\s+/.test(line)) {
          current.blocks.push({ type: 'listItem', text: line.replace(/^-\s+/, '').trim() });
        } else {
          current.blocks.push({ type: 'paragraph', text: line.trim() });
        }
      }
      finish();
    }

    if (entries.length !== 198) {
      throw new Error(`The committed Markdown manuscript contains ${entries.length} titled entries instead of 198.`);
    }
    if (entries[0]?.title !== 'FOREWORD' || entries.at(-1)?.title !== 'FINAL CAUTION') {
      throw new Error(`The committed Markdown manuscript is out of order: ${entries[0]?.title || 'missing'} through ${entries.at(-1)?.title || 'missing'}.`);
    }
    return entries;
  }

  async function loadEntries() {
    root.innerHTML = `<div class="primer-loading">Loading 198 entries from ${manuscriptFiles.length} plain Markdown files…</div>`;
    const documents = await Promise.all(manuscriptFiles.map(fetchText));
    return parseMarkdownFiles(documents);
  }

  function entryText(entry) {
    return [entry.title, ...entry.blocks.map(block => block.text || '')].join(' ').toLowerCase();
  }

  function appendBlocks(target, blocks) {
    let activeList = null;
    for (const block of blocks || []) {
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
    let activeId = entries[0].id;
    root.innerHTML = `
      <div class="primer-controls"><input id="primer-search" type="search" placeholder="Search every title, paragraph, and list item…" aria-label="Search Primer wiki"><span id="primer-status" class="primer-status">198 entries</span></div>
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
      article.innerHTML = `<div class="primer-meta">Entry ${position} of 198</div><h2>${escapeHtml(entry.title)}</h2>`;
      appendBlocks(article, entry.blocks);
      article.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function renderList() {
      const query = search.value.trim().toLowerCase();
      const matches = query ? entries.filter(entry => entryText(entry).includes(query)) : entries;
      status.textContent = `${matches.length} of 198 entries`;
      nav.innerHTML = '';
      for (const entry of matches) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.entryId = entry.id;
        button.className = entry.id === activeId ? 'active' : '';
        button.innerHTML = `<strong>${String(entries.indexOf(entry) + 1).padStart(3, '0')}. ${escapeHtml(entry.title)}</strong>`;
        button.addEventListener('click', () => openEntry(entry.id));
        nav.appendChild(button);
      }
      if (!matches.length) nav.innerHTML = '<div class="primer-error">No entries match this search.</div>';
      else if (!matches.some(entry => entry.id === activeId)) openEntry(matches[0].id);
    }

    search.addEventListener('input', renderList);
    renderList();
    openEntry(activeId);
  }

  function renderSource(entries) {
    root.innerHTML = `
      <div class="primer-controls"><input id="primer-search" type="search" placeholder="Search inside the full source document…" aria-label="Search source document"><span id="primer-status" class="primer-status">Showing all 198 sections</span></div>
      <div class="primer-layout"><nav id="primer-nav" class="primer-nav" aria-label="Source table of contents"></nav><article id="primer-document" class="primer-article primer-document"></article></div>`;

    const nav = document.getElementById('primer-nav');
    const documentTarget = document.getElementById('primer-document');
    const search = document.getElementById('primer-search');
    const status = document.getElementById('primer-status');

    function renderDocument() {
      const query = search.value.trim().toLowerCase();
      const matches = query ? entries.filter(entry => entryText(entry).includes(query)) : entries;
      status.textContent = query ? `${matches.length} of 198 sections match` : 'Showing all 198 sections';
      nav.innerHTML = '';
      documentTarget.innerHTML = `<header><p class="primer-meta">Complete source document · ${matches.length} visible sections</p><h2>THE EUROPAN CREWMAN’S PRIMER</h2><p>Conduct, Readiness, and Survival in the Submariner’s Trade</p></header>`;

      for (const entry of matches) {
        const position = entries.indexOf(entry) + 1;
        const button = document.createElement('button');
        button.type = 'button';
        button.innerHTML = `<strong>${String(position).padStart(3, '0')}. ${escapeHtml(entry.title)}</strong>`;
        button.addEventListener('click', () => document.getElementById(`source-${entry.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        nav.appendChild(button);

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
      const entries = await loadEntries();
      if (mode === 'source') renderSource(entries);
      else renderWiki(entries);
    } catch (error) {
      root.innerHTML = `<div class="primer-error"><strong>The Crewman's Primer could not be loaded.</strong><br>${escapeHtml(error.message)}</div>`;
      console.error(error);
    }
  }

  void start();
})();
