(() => {
  const indexUrl = 'data/barotrauma/wiki/crewmans-primer-index.json';
  const sourceUrl = 'data/barotrauma/wiki/crewmans-primer.json';
  const root = document.getElementById('primer-root');
  const mode = new URLSearchParams(window.location.search).get('mode') === 'source' ? 'source' : 'wiki';

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
  }

  function entryText(entry) {
    return [
      entry.title,
      entry.category,
      entry.chapter,
      ...(entry.blocks || []).flatMap(block => block.type === 'list' ? block.items || [] : [block.text || ''])
    ].join(' ').toLowerCase();
  }

  function appendBlocks(target, blocks) {
    let activeList = null;
    for (const block of blocks || []) {
      if (block.type === 'list') {
        const list = document.createElement(block.ordered ? 'ol' : 'ul');
        for (const text of block.items || []) {
          const item = document.createElement('li');
          item.textContent = text;
          list.appendChild(item);
        }
        target.appendChild(list);
        activeList = null;
      } else if (block.type === 'listItem') {
        if (!activeList) {
          activeList = document.createElement('ul');
          target.appendChild(activeList);
        }
        const item = document.createElement('li');
        item.textContent = block.text || '';
        activeList.appendChild(item);
      } else {
        activeList = null;
        const paragraph = document.createElement('p');
        paragraph.textContent = block.text || '';
        target.appendChild(paragraph);
      }
    }
  }

  function renderWiki(index, entries) {
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

  function renderSource(index, entries) {
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
      documentTarget.innerHTML = `<header><p class="primer-meta">Complete source document · ${matches.length} visible sections</p><h2>${escapeHtml(index.displayTitle || index.title)}</h2><p>${escapeHtml(index.subtitle || '')}</p></header>`;

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
        const heading = document.createElement(entry.headingLevel === 1 || entry.level === 1 ? 'h2' : entry.headingLevel === 3 || entry.level === 3 ? 'h4' : 'h3');
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
      const [index, source] = await Promise.all([fetchJson(indexUrl), fetchJson(sourceUrl)]);
      const entries = source.entries || [];
      if (entries.length !== 198) throw new Error(`Expected 198 entries; loaded ${entries.length}.`);
      if (mode === 'source') renderSource(index, entries);
      else renderWiki(index, entries);
    } catch (error) {
      root.innerHTML = `<div class="primer-error"><strong>The Crewman's Primer could not be loaded.</strong><br>${escapeHtml(error.message)}</div>`;
      console.error(error);
    }
  }

  void start();
})();
