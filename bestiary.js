(() => {
  'use strict';

  const PACK_URL = 'data/bestiary/archive-pack.json';
  const FEATURED_ID = 'caprine-0233-mellisande';
  const PAGE_SIZE = 120;

  const elements = {
    search: document.getElementById('bestiary-search'),
    register: document.getElementById('bestiary-register'),
    depth: document.getElementById('bestiary-depth'),
    sort: document.getElementById('bestiary-sort'),
    clear: document.getElementById('bestiary-clear'),
    status: document.getElementById('bestiary-status'),
    results: document.getElementById('bestiary-results'),
    detail: document.getElementById('bestiary-detail'),
    loadMore: document.getElementById('bestiary-load-more'),
    openFeatured: document.getElementById('open-featured-entry'),
    total: document.getElementById('bestiary-total'),
    full: document.getElementById('bestiary-full'),
    registers: document.getElementById('bestiary-registers')
  };

  if (!elements.results || !elements.detail) return;

  const state = {
    index: null,
    mellisande: null,
    filtered: [],
    selectedId: '',
    visibleLimit: PAGE_SIZE
  };

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function formatArchiveNumber(number) {
    return String(number).padStart(4, '0');
  }

  function entrySearchText(entry) {
    return normalize([
      entry.archiveNumber,
      entry.name,
      entry.epithet,
      entry.register,
      entry.registerTitle,
      entry.summary
    ].join(' '));
  }

  function validateIndex(index) {
    if (!index || !Array.isArray(index.entries) || !Array.isArray(index.registers)) {
      throw new Error('Bestiary index has an invalid structure');
    }
    if (index.entries.length !== 1000) {
      throw new Error(`Bestiary index expected 1000 entries and found ${index.entries.length}`);
    }
    const ids = new Set(index.entries.map(entry => entry.id));
    if (ids.size !== index.entries.length) {
      throw new Error('Bestiary index contains duplicate entry IDs');
    }
  }

  function populateRegisterFilter() {
    const fragment = document.createDocumentFragment();
    state.index.registers.forEach(register => {
      const option = document.createElement('option');
      option.value = register.id;
      option.textContent = `Register ${register.id} — ${register.title}`;
      fragment.appendChild(option);
    });
    elements.register.appendChild(fragment);
  }

  function updateSummary() {
    elements.total.textContent = state.index.entries.length.toLocaleString();
    elements.full.textContent = state.index.entries.filter(entry => entry.recordDepth === 'full').length.toLocaleString();
    elements.registers.textContent = state.index.registers.length.toLocaleString();
  }

  function compareEntries(a, b) {
    const mode = elements.sort.value;
    if (mode === 'name') return a.name.localeCompare(b.name) || a.archiveNumber - b.archiveNumber;
    if (mode === 'register') return a.register.localeCompare(b.register) || a.archiveNumber - b.archiveNumber;
    return a.archiveNumber - b.archiveNumber;
  }

  function applyFilters() {
    const terms = normalize(elements.search.value).split(/\s+/).filter(Boolean);
    const register = elements.register.value;
    const depth = elements.depth.value;

    state.filtered = state.index.entries
      .filter(entry => !register || entry.register === register)
      .filter(entry => !depth || entry.recordDepth === depth)
      .filter(entry => {
        if (!terms.length) return true;
        const haystack = entrySearchText(entry);
        return terms.every(term => haystack.includes(term));
      })
      .sort(compareEntries);

    state.visibleLimit = PAGE_SIZE;
    renderResults();
  }

  function makeEntryCard(entry) {
    const card = make('article', 'bestiary-card');
    card.dataset.entryId = entry.id;
    if (entry.id === state.selectedId) card.classList.add('is-selected');

    const topline = make('div', 'bestiary-card-topline');
    topline.appendChild(make('span', 'bestiary-archive-number', `Archive ${formatArchiveNumber(entry.archiveNumber)}`));
    const depth = make('span', `bestiary-depth-badge${entry.recordDepth === 'full' ? ' is-full' : ''}`, entry.recordDepth === 'full' ? 'Full dossier' : 'Capsule');
    topline.appendChild(depth);

    const title = make('h3', '', entry.name);
    const epithet = make('p', 'bestiary-card-epithet', entry.epithet);
    const summary = make('p', 'bestiary-card-summary', entry.summary);
    const button = make('button', 'link-button', entry.recordDepth === 'full' ? 'Open Complete Dossier' : 'Open Record');
    button.type = 'button';
    button.addEventListener('click', () => selectEntry(entry.id));

    card.append(topline, title, epithet, summary, button);
    return card;
  }

  function renderResults() {
    const shown = state.filtered.slice(0, state.visibleLimit);
    const fragment = document.createDocumentFragment();

    if (!shown.length) {
      fragment.appendChild(make('div', 'bestiary-empty-results', 'No recognized entry matches the current search and filters.'));
    } else {
      shown.forEach(entry => fragment.appendChild(makeEntryCard(entry)));
    }

    elements.results.replaceChildren(fragment);
    elements.loadMore.hidden = shown.length >= state.filtered.length;
    elements.status.textContent = state.filtered.length
      ? `Showing ${shown.length.toLocaleString()} of ${state.filtered.length.toLocaleString()} matching record${state.filtered.length === 1 ? '' : 's'} from ${state.index.entries.length.toLocaleString()} recognized names.`
      : `No records match the current filters. The archive contains ${state.index.entries.length.toLocaleString()} recognized names.`;
  }

  function setSelectedCard() {
    elements.results.querySelectorAll('.bestiary-card').forEach(card => {
      card.classList.toggle('is-selected', card.dataset.entryId === state.selectedId);
    });
  }

  function parseHash() {
    const raw = location.hash.replace(/^#/, '');
    if (!raw) return '';
    const params = new URLSearchParams(raw.includes('=') ? raw : `entry=${raw}`);
    return params.get('entry') || '';
  }

  function updateHash(entryId) {
    const next = `#entry=${encodeURIComponent(entryId)}`;
    if (location.hash !== next) history.pushState(null, '', next);
  }

  function makeDetailHeader(entry, titleText, epithetText) {
    const header = make('header', 'bestiary-detail-header');
    const meta = make('div', 'bestiary-detail-meta');
    meta.append(
      make('span', 'bestiary-archive-number', `Archive ${formatArchiveNumber(entry.archiveNumber)}`),
      make('span', 'bestiary-register-badge', `Register ${entry.register}`),
      make('span', `bestiary-depth-badge${entry.recordDepth === 'full' ? ' is-full' : ''}`, entry.recordDepth === 'full' ? 'Full dossier' : 'Capsule record')
    );

    const title = make('h2', '', titleText);
    const epithet = make('p', 'bestiary-detail-epithet', epithetText);
    const summary = make('p', 'bestiary-detail-summary', entry.summary);
    const actions = make('div', 'bestiary-detail-actions');

    const copy = make('button', '', 'Copy Record Link');
    copy.type = 'button';
    copy.addEventListener('click', async () => {
      const url = new URL(location.href);
      url.hash = `entry=${entry.id}`;
      try {
        await navigator.clipboard.writeText(url.href);
        copy.textContent = 'Link Copied';
      } catch {
        copy.textContent = 'Copy Unavailable';
      }
      window.setTimeout(() => { copy.textContent = 'Copy Record Link'; }, 1400);
    });
    actions.appendChild(copy);

    header.append(meta, title, epithet, summary, actions);
    return { header, actions };
  }

  function appendBlocks(container, blocks) {
    blocks.forEach(block => {
      if (block.type === 'list') {
        const list = make('ul');
        block.items.forEach(item => list.appendChild(make('li', '', item)));
        container.appendChild(list);
      } else if (block.type === 'quote') {
        container.appendChild(make('blockquote', '', block.text));
      } else {
        container.appendChild(make('p', '', block.text));
      }
    });
  }

  function groupSections(sections) {
    const groups = [];
    let current = {
      title: 'Core Abilities and Lair',
      synthetic: true,
      blocks: [],
      subsections: []
    };
    groups.push(current);

    sections.forEach(section => {
      if (section.level === 1) {
        current = {
          title: section.title,
          synthetic: false,
          blocks: section.blocks,
          subsections: []
        };
        groups.push(current);
      } else {
        current.subsections.push(section);
      }
    });

    return groups.filter(group => group.blocks.length || group.subsections.length);
  }

  function renderFullEntry(indexEntry) {
    const record = state.mellisande;
    const fragment = document.createDocumentFragment();
    const { header, actions } = makeDetailHeader(indexEntry, record.title, record.epithet);

    const expand = make('button', '', 'Expand All Sections');
    expand.type = 'button';
    expand.addEventListener('click', () => {
      elements.detail.querySelectorAll('details').forEach(detail => { detail.open = true; });
    });
    const collapse = make('button', '', 'Collapse All Sections');
    collapse.type = 'button';
    collapse.addEventListener('click', () => {
      elements.detail.querySelectorAll('details').forEach(detail => { detail.open = false; });
    });
    const print = make('button', '', 'Print Selected Dossier');
    print.type = 'button';
    print.addEventListener('click', () => window.print());
    actions.append(expand, collapse, print);

    const introduction = make('section', 'bestiary-introduction');
    record.introduction.forEach(paragraph => introduction.appendChild(make('p', '', paragraph)));

    const classification = make('p', 'bestiary-classification', record.classification);
    const statList = make('dl', 'bestiary-stat-block');
    record.statBlock.forEach(stat => {
      const row = make('div', 'bestiary-stat-row');
      row.append(make('dt', '', stat.label), make('dd', '', stat.value));
      statList.appendChild(row);
    });

    const sectionsRoot = make('section', 'bestiary-sections');
    groupSections(record.sections).forEach((group, groupIndex) => {
      const details = make('details', 'bestiary-section-group');
      if (groupIndex === 0) details.open = true;
      details.appendChild(make('summary', '', group.title));
      const body = make('div', 'bestiary-section-body');
      appendBlocks(body, group.blocks);

      group.subsections.forEach(subsection => {
        const sub = make('details', 'bestiary-section bestiary-subsection');
        sub.appendChild(make('summary', '', subsection.title));
        const subBody = make('div', 'bestiary-section-body');
        appendBlocks(subBody, subsection.blocks);
        sub.appendChild(subBody);
        body.appendChild(sub);
      });

      details.appendChild(body);
      sectionsRoot.appendChild(details);
    });

    fragment.append(header, introduction, classification, statList, sectionsRoot);
    elements.detail.replaceChildren(fragment);
  }

  function relatedEntries(entry) {
    const inRegister = state.index.entries.filter(candidate => candidate.register === entry.register);
    const position = inRegister.findIndex(candidate => candidate.id === entry.id);
    const start = Math.max(0, position - 2);
    return inRegister.slice(start, start + 5).filter(candidate => candidate.id !== entry.id);
  }

  function renderCapsuleEntry(entry) {
    const fragment = document.createDocumentFragment();
    const { header } = makeDetailHeader(entry, entry.name, entry.epithet);
    const panel = make('div', 'bestiary-capsule-panel');

    const callout = make('section', 'bestiary-capsule-callout');
    callout.append(
      make('p', 'eyebrow', `Register ${entry.register} — ${entry.registerTitle}`),
      make('h3', '', 'Recognized capsule record'),
      make('p', '', entry.summary),
      make('p', '', 'This name is established in the archive and ready for campaign use. A complete mechanical dossier has not yet been authored, so the bestiary preserves the source concept without inventing statistics that are not present.')
    );
    panel.appendChild(callout);

    const related = make('section');
    related.append(make('p', 'eyebrow', 'Nearby archive records'), make('h3', '', 'Related names in the same register'));
    const relatedGrid = make('div', 'bestiary-related-grid');
    relatedEntries(entry).forEach(candidate => {
      const link = make('a', 'bestiary-related-entry');
      link.href = `#entry=${encodeURIComponent(candidate.id)}`;
      link.addEventListener('click', event => {
        event.preventDefault();
        selectEntry(candidate.id);
      });
      link.append(
        make('span', 'bestiary-archive-number', formatArchiveNumber(candidate.archiveNumber)),
        make('span', '', `${candidate.name}, ${candidate.epithet}`)
      );
      relatedGrid.appendChild(link);
    });
    related.appendChild(relatedGrid);
    panel.appendChild(related);

    fragment.append(header, panel);
    elements.detail.replaceChildren(fragment);
  }

  function selectEntry(entryId, options = {}) {
    const entry = state.index.entries.find(candidate => candidate.id === entryId);
    if (!entry) return;

    state.selectedId = entry.id;
    if (entry.recordDepth === 'full' && state.mellisande?.id === entry.id) {
      renderFullEntry(entry);
    } else {
      renderCapsuleEntry(entry);
    }

    setSelectedCard();
    if (options.updateHash !== false) updateHash(entry.id);
    if (options.scrollDetail) {
      elements.detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  async function initialize() {
    try {
      const packResponse = await fetch(PACK_URL, { cache: 'no-cache' });
      if (!packResponse.ok) throw new Error(`Bestiary archive request failed: ${packResponse.status}`);
      const pack = await packResponse.json();
      if (pack.encoding !== 'gzip-base64' || !pack.payloads) {
        throw new Error('Bestiary archive uses an unsupported encoding');
      }
      if (typeof DecompressionStream !== 'function') {
        throw new Error('This browser does not support the compressed bestiary archive');
      }

      const decodePayload = async payload => {
        const binary = atob(payload);
        const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
        return JSON.parse(await new Response(stream).text());
      };

      [state.index, state.mellisande] = await Promise.all([
        decodePayload(pack.payloads.index),
        decodePayload(pack.payloads.mellisande)
      ]);
      validateIndex(state.index);

      populateRegisterFilter();
      updateSummary();

      const initialQuery = new URLSearchParams(location.search).get('q');
      if (initialQuery) elements.search.value = initialQuery.slice(0, 160);

      applyFilters();

      const requested = parseHash();
      selectEntry(
        state.index.entries.some(entry => entry.id === requested) ? requested : FEATURED_ID,
        { updateHash: false }
      );

      [elements.search, elements.register, elements.depth, elements.sort].forEach(control => {
        control.addEventListener(control === elements.search ? 'input' : 'change', applyFilters);
      });

      elements.clear.addEventListener('click', () => {
        elements.search.value = '';
        elements.register.value = '';
        elements.depth.value = '';
        elements.sort.value = 'archive';
        applyFilters();
        elements.search.focus();
      });

      elements.loadMore.addEventListener('click', () => {
        state.visibleLimit += PAGE_SIZE;
        renderResults();
      });

      elements.openFeatured.addEventListener('click', () => {
        selectEntry(FEATURED_ID, { scrollDetail: true });
      });

      window.addEventListener('hashchange', () => {
        const requestedId = parseHash();
        if (requestedId && requestedId !== state.selectedId) {
          selectEntry(requestedId, { updateHash: false, scrollDetail: true });
        }
      });
    } catch (error) {
      elements.status.textContent = `${error.message}. The custom bestiary could not be loaded.`;
      elements.results.replaceChildren(make('div', 'bestiary-empty-results', 'The archive data is unavailable.'));
      elements.detail.replaceChildren(make('div', 'bestiary-detail-empty', 'The selected record could not be opened.'));
    }
  }

  void initialize();
})();
