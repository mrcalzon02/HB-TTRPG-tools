(() => {
  'use strict';

  const input = document.getElementById('foundry-tool-search');
  const results = document.getElementById('foundry-search-results');
  const status = document.getElementById('foundry-search-status');
  if (!input || !results) return;

  const INDEX_URL = 'search-index.json';
  let entries = [];

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function searchableText(entry) {
    return normalize([
      entry.title,
      entry.workspace,
      entry.description,
      ...(entry.keywords || [])
    ].join(' '));
  }

  function scoreEntry(entry, terms) {
    const title = normalize(entry.title);
    const workspace = normalize(entry.workspace);
    const keywords = normalize((entry.keywords || []).join(' '));
    const all = searchableText(entry);
    let score = 0;
    for (const term of terms) {
      if (!all.includes(term)) return -1;
      if (title.includes(term)) score += 8;
      if (workspace.includes(term)) score += 5;
      if (keywords.includes(term)) score += 4;
      score += 1;
    }
    return score;
  }

  function makeResult(entry) {
    const article = document.createElement('article');
    article.className = 'search-result-card';

    const meta = document.createElement('div');
    meta.className = 'search-result-meta';
    meta.textContent = entry.workspace || 'Foundry';

    const title = document.createElement('h3');
    title.textContent = entry.title;

    const description = document.createElement('p');
    description.textContent = entry.description;

    const link = document.createElement('a');
    link.className = 'link-button';
    link.href = entry.url;
    link.textContent = 'Open';
    link.dataset.analyticsTool = entry.id;
    link.dataset.analyticsLabel = `Search result: ${entry.title}`;

    article.append(meta, title, description, link);
    return article;
  }

  function render() {
    const terms = normalize(input.value).split(/\s+/).filter(Boolean);
    const ranked = entries
      .map(entry => ({ entry, score: terms.length ? scoreEntry(entry, terms) : 0 }))
      .filter(item => item.score >= 0)
      .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
      .slice(0, terms.length ? 18 : 12);

    results.replaceChildren();
    if (!ranked.length) {
      const empty = document.createElement('div');
      empty.className = 'search-empty';
      empty.textContent = 'No indexed workspace or tool matches that search.';
      results.appendChild(empty);
    } else {
      ranked.forEach(item => results.appendChild(makeResult(item.entry)));
    }

    if (status) {
      status.textContent = terms.length
        ? `${ranked.length} indexed result${ranked.length === 1 ? '' : 's'} shown.`
        : `Showing ${ranked.length} featured entries from ${entries.length} indexed pages and tools.`;
    }
  }

  async function initialize() {
    if (status) status.textContent = 'Loading searchable tool directory…';
    const initialQuery = new URLSearchParams(location.search).get('search');
    if (initialQuery) input.value = initialQuery.slice(0, 160);

    try {
      const response = await fetch(INDEX_URL, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`Index request failed: ${response.status}`);
      const data = await response.json();
      entries = Array.isArray(data) ? data : [];
      render();
      if (initialQuery) document.getElementById('foundry-search')?.scrollIntoView({ block: 'start' });
      input.addEventListener('input', render);
      document.getElementById('foundry-search-clear')?.addEventListener('click', () => {
        input.value = '';
        input.focus();
        render();
      });
    } catch (error) {
      results.innerHTML = '<div class="search-empty">The searchable tool directory could not be loaded. Use the workspace cards or site map below.</div>';
      if (status) status.textContent = error.message;
    }
  }

  void initialize();
})();
