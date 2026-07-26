(() => {
  'use strict';

  const input = document.getElementById('foundry-tool-search');
  const results = document.getElementById('foundry-search-results');
  const status = document.getElementById('foundry-search-status');
  if (!input || !results) return;

  const INDEX_URL = 'search-index.json';
  const BUILT_IN_ENTRIES = [
    {
      id: 'world-hooks-generator',
      title: 'World Hooks and Setting Foundations',
      workspace: 'Generators',
      description: 'Generate campaign-scale world premises with a central mystery, theme, conflict, opening mystery, fantasy twist, unusual limitation, recurring structure, settlement complication, environmental pressure, hidden truth, and long-term stakes.',
      keywords: ['world hooks generator', 'campaign setting generator', 'worldbuilding randomizer', 'central mystery', 'campaign theme', 'fantasy setting twist', 'dwarven migration', 'snowy mountain caravan', 'sunless world', 'bioluminescent world', 'fungal world'],
      url: 'index.html?view=generators&generator=world-hooks'
    },
    {
      id: 'high-fantasy-potion-generator',
      title: 'Generic High Fantasy Potion Generator',
      workspace: 'Generators',
      description: 'Generate complete generic d20-compatible potions with effects, rarity, price, taste, aroma, color, clarity, glow, bottle, seal, label, age, potency, ingredients, maker, provenance, side effects, quirks, appraisal, and counterfeit clues.',
      keywords: ['high fantasy potion generator', 'D&D potion generator', 'random potion', 'potion taste', 'potion bottle', 'potion color', 'aged potion', 'magic item generator'],
      url: 'index.html?view=generators&generator=high-fantasy-potions'
    },
    {
      id: 'kaysender-potion-generator',
      title: 'Kaysender Potion Generator',
      workspace: 'Generators',
      description: 'Generate Kaysender formula-first Medicinal, Minor, Medium, Major, Elixir, aged-batch, and standard open-d20 potion and oil records.',
      keywords: ['Kaysender potion generator', 'medicinal potion formulary', 'potion aging', 'elixir generator', 'open d20 potion table'],
      url: 'index.html?view=generators&generator=kaysender-potions'
    }
  ];
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
      const baseEntries = Array.isArray(data) ? data : [];
      const builtInIds = new Set(BUILT_IN_ENTRIES.map(entry => entry.id));
      entries = [...baseEntries.filter(entry => !builtInIds.has(entry.id)), ...BUILT_IN_ENTRIES];
      render();
      if (initialQuery) document.getElementById('foundry-search')?.scrollIntoView({ block: 'start' });
      input.addEventListener('input', render);
      document.getElementById('foundry-search-clear')?.addEventListener('click', () => {
        input.value = '';
        input.focus();
        render();
      });
    } catch (error) {
      entries = [...BUILT_IN_ENTRIES];
      render();
      if (status) status.textContent = `${error.message}. Showing built-in generator entries.`;
    }
  }

  void initialize();
})();
