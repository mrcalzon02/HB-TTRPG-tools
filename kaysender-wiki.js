(() => {
  const WIKI_INDEX_URL = 'data/kaysender/wiki/wiki-index.json';
  const FALLBACK_WIKI_URL = 'data/kaysender/wiki/entries.json';
  let wikiData = null;
  let activeCategory = 'all';

  const moduleEntryMap = {
    'kaysender-wiki': ['kaysender-overview', 'messara', 'floating-islands'],
    'floating-island-generator': ['floating-islands', 'scarcity-loop', 'sky-ecology'],
    'world-map-route-generator': ['messara', 'floating-islands', 'surveyors-guild'],
    'settlement-generator': ['floating-islands', 'scarcity-loop', 'dragon-lords', 'water-trade', 'dunhallow-roost'],
    'city-district-generator': ['messara', 'valeria-valthorn', 'water-trade'],
    'population-generator': ['messara', 'peoples-of-kaysender', 'scarcity-loop'],
    'shop-market-generator': ['water-trade', 'skyweaver-consortium', 'black-fleet'],
    'airship-vessel-generator': ['airships', 'black-fleet', 'surveyors-guild', 'dwarven-airship-core'],
    'airship-core-builder': ['airships', 'dwarven-airship-core', 'elven-airship-core', 'gnomish-airship-core'],
    'crafting-gadget-creator': ['skyweaver-consortium', 'airships', 'gnomish-airship-core'],
    'supply-water-planner': ['scarcity-loop', 'water-trade', 'airships'],
    'faction-guild-generator': ['dragon-lords', 'black-fleet', 'surveyors-guild', 'skyweaver-consortium'],
    'black-market-piracy-generator': ['black-fleet', 'black-chain-consortium', 'free-sky-brotherhood'],
    'encounter-generator': ['floating-islands', 'black-fleet', 'dragon-lords', 'sky-ecology'],
    'sky-ecology-generator': ['sky-ecology', 'floating-islands'],
    'npc-crew-generator': ['airships', 'surveyors-guild', 'peoples-of-kaysender'],
    'job-board-generator': ['surveyors-guild', 'scarcity-loop', 'black-fleet', 'free-sky-brotherhood'],
    'draconic-tithe-generator': ['dragon-lords', 'dunhallow-roost', 'water-trade'],
    'organization-operations-tracker': ['skyweaver-consortium', 'surveyors-guild', 'black-fleet']
  };

  function injectStyles() {
    if (document.getElementById('kaysender-wiki-style')) return;
    const style = document.createElement('style');
    style.id = 'kaysender-wiki-style';
    style.textContent = `
      .wiki-link-strip { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
      .wiki-chip-button { border: 1px solid var(--line); border-radius: 999px; background: rgba(255,255,255,0.04); color: var(--muted); padding: 5px 9px; font-size: 0.75rem; }
      .wiki-chip-button:hover, .wiki-chip-button.active { border-color: var(--accent); color: var(--ink); }
      .wiki-panel { border: 1px solid var(--line); border-radius: 24px; padding: 22px; margin: 18px 0 28px; background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.025)); box-shadow: var(--shadow); }
      .wiki-controls { display: grid; grid-template-columns: minmax(220px, 1fr) auto; gap: 12px; align-items: end; margin-bottom: 16px; }
      .wiki-controls input { background: #10131a; border: 1px solid var(--line); color: var(--ink); border-radius: 12px; padding: 10px 12px; }
      .wiki-category-row { display: flex; flex-wrap: wrap; gap: 8px; grid-column: 1 / -1; }
      .wiki-layout { display: grid; grid-template-columns: 340px 1fr; gap: 16px; align-items: start; }
      .wiki-list { display: grid; gap: 8px; max-height: 72vh; overflow: auto; padding-right: 4px; }
      .wiki-list button { text-align: left; border: 1px solid var(--line); border-radius: 14px; padding: 10px 12px; background: rgba(0,0,0,0.18); color: var(--ink); }
      .wiki-list button.active, .wiki-list button:hover { border-color: var(--accent); background: rgba(200,138,53,0.12); }
      .wiki-entry-view { border: 1px solid rgba(200,138,53,0.35); border-radius: 18px; padding: 20px; background: rgba(0,0,0,0.18); }
      .wiki-entry-view h3 { margin-bottom: 6px; }
      .wiki-entry-view h4 { color: var(--accent); margin: 20px 0 8px; }
      .wiki-entry-meta { color: var(--accent); font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.78rem; }
      .wiki-entry-view p { color: var(--muted); line-height: 1.62; margin: 0 0 12px; }
      .wiki-entry-summary { color: var(--ink) !important; }
      .wiki-hotlink { color: var(--accent); text-decoration: underline; text-underline-offset: 3px; font-weight: 700; }
      .wiki-hotlink:hover { color: var(--ink); }
      .wiki-related { margin-top: 18px; }
      .wiki-related h4 { color: var(--accent); }
      .wiki-stat-block { border: 1px solid rgba(200,138,53,0.45); border-radius: 18px; margin: 18px 0; padding: 16px; background: rgba(6,8,12,0.72); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.025); }
      .wiki-stat-block h4 { margin-top: 0; color: var(--ink); }
      .wiki-stat-subtitle { color: var(--accent); font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.72rem; margin-bottom: 10px; }
      .wiki-stat-line { color: var(--muted); margin: 5px 0; line-height: 1.45; }
      .wiki-stat-line strong { color: var(--ink); }
      .wiki-stat-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 10px 0; }
      .wiki-stat-cell { border: 1px solid var(--line); border-radius: 12px; padding: 8px 10px; background: rgba(255,255,255,0.035); color: var(--muted); }
      .wiki-stat-cell strong { display: block; color: var(--accent); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; }
      .wiki-stat-list { margin: 6px 0 12px 18px; color: var(--muted); }
      .wiki-stat-list li { margin-bottom: 5px; line-height: 1.45; }
      @media (max-width: 900px) { .wiki-controls, .wiki-layout { grid-template-columns: 1fr; } .wiki-list { max-height: unset; } .wiki-stat-grid { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(style);
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Wiki request failed: ${url} ${response.status}`);
    return response.json();
  }

  async function loadWiki() {
    if (wikiData) return wikiData;
    try {
      const index = await fetchJson(WIKI_INDEX_URL);
      const packs = await Promise.all((index.packs || []).map(fetchJson));
      wikiData = mergePacks(index, packs);
    } catch (error) {
      wikiData = await fetchJson(FALLBACK_WIKI_URL);
    }
    return wikiData;
  }

  function mergePacks(index, packs) {
    const byId = new Map();
    packs.forEach(pack => {
      (pack.entries || []).forEach(entry => {
        const previous = byId.get(entry.id) || {};
        byId.set(entry.id, { ...previous, ...entry });
      });
    });
    return {
      setting: index.setting || 'Kaysender',
      schemaVersion: index.schemaVersion || '0.2.0',
      entries: Array.from(byId.values()).sort((a, b) => (a.category || '').localeCompare(b.category || '') || (a.title || '').localeCompare(b.title || ''))
    };
  }

  function switchKaysenderView() {
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === 'kaysender'));
    document.querySelectorAll('.nav-button').forEach(button => button.classList.toggle('active', button.dataset.view === 'kaysender'));
  }

  function getPanel() {
    let panel = document.getElementById('kaysender-wiki-panel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'kaysender-wiki-panel';
      panel.className = 'wiki-panel no-print';
      const status = document.getElementById('kaysender-status');
      if (status) status.insertAdjacentElement('afterend', panel);
      else document.getElementById('kaysender')?.prepend(panel);
    }
    return panel;
  }

  async function openWiki(preferredEntryId = 'kaysender-overview') {
    injectStyles();
    switchKaysenderView();
    const panel = getPanel();
    panel.innerHTML = '<p class="helper-note">Loading Kaysender wiki entries…</p>';
    try {
      const data = await loadWiki();
      renderWiki(panel, data, preferredEntryId);
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      panel.innerHTML = '<p class="helper-note">Kaysender wiki could not be loaded. Confirm GitHub Pages or a local web server is serving JSON files.</p>';
    }
  }

  function renderWiki(panel, data, preferredEntryId) {
    const entries = data.entries || [];
    const categories = ['all', ...Array.from(new Set(entries.map(entry => entry.category))).sort()];
    const startEntry = entries.find(entry => entry.id === preferredEntryId) || entries.find(entry => entry.id === 'kaysender-overview') || entries[0];
    panel.innerHTML = `
      <div class="section-heading">
        <p class="eyebrow">Kaysender hypertext wiki</p>
        <h2>Setting Wiki Browser</h2>
        <p>Search lore entries, converted Hypertext d20 stat blocks, source-derived hotlinks, related entries, and related campaign tools. Entries are loaded from the multi-pack wiki index.</p>
      </div>
      <div class="wiki-controls">
        <input id="wiki-search" type="search" placeholder="Search Kaysender wiki entries..." />
        <button id="wiki-reset" class="secondary-action" type="button">Reset</button>
        <div id="wiki-categories" class="wiki-category-row"></div>
      </div>
      <div class="wiki-layout">
        <div id="wiki-list" class="wiki-list"></div>
        <article id="wiki-entry-view" class="wiki-entry-view"></article>
      </div>
    `;

    const categoryTarget = panel.querySelector('#wiki-categories');
    categories.forEach(category => {
      const button = document.createElement('button');
      button.className = `wiki-chip-button ${category === activeCategory ? 'active' : ''}`;
      button.type = 'button';
      button.textContent = category === 'all' ? 'All Categories' : category;
      button.addEventListener('click', () => {
        activeCategory = category;
        categoryTarget.querySelectorAll('button').forEach(categoryButton => categoryButton.classList.toggle('active', categoryButton === button));
        renderWikiList(panel, entries, getActiveEntryId(panel));
      });
      categoryTarget.appendChild(button);
    });

    panel.querySelector('#wiki-search').addEventListener('input', () => renderWikiList(panel, entries, getActiveEntryId(panel)));
    panel.querySelector('#wiki-reset').addEventListener('click', () => {
      activeCategory = 'all';
      panel.querySelector('#wiki-search').value = '';
      renderWiki(panel, data, 'kaysender-overview');
    });

    renderWikiList(panel, entries, startEntry?.id);
    renderEntry(panel, entries, startEntry?.id);
  }

  function getActiveEntryId(panel) {
    return panel.querySelector('#wiki-entry-view')?.dataset.entryId || 'kaysender-overview';
  }

  function renderWikiList(panel, entries, activeId) {
    const query = (panel.querySelector('#wiki-search')?.value || '').toLowerCase().trim();
    const list = panel.querySelector('#wiki-list');
    if (!list) return;
    list.innerHTML = '';
    const filtered = entries.filter(entry => {
      const categoryOk = activeCategory === 'all' || entry.category === activeCategory;
      const searchCorpus = [
        entry.title,
        entry.category,
        entry.summary,
        ...(entry.tags || []),
        ...(entry.body || []),
        ...sectionText(entry.sections),
        ...statBlockText(entry.statBlocks)
      ].join(' ').toLowerCase();
      const searchOk = !query || searchCorpus.includes(query);
      return categoryOk && searchOk;
    });
    if (!filtered.length) {
      list.innerHTML = '<p class="helper-note">No wiki entries match the current search.</p>';
      return;
    }
    filtered.forEach(entry => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.entryId = entry.id;
      button.className = entry.id === activeId ? 'active' : '';
      const statCount = (entry.statBlocks || []).length;
      button.innerHTML = `<strong>${escapeHtml(entry.title)}</strong><br><small>${escapeHtml(entry.category || 'Uncategorized')}${statCount ? ` · ${statCount} stat block${statCount === 1 ? '' : 's'}` : ''}</small>`;
      button.addEventListener('click', () => renderEntry(panel, entries, entry.id));
      list.appendChild(button);
    });
  }

  function sectionText(sections) {
    return (sections || []).flatMap(section => [section.heading || '', ...(section.body || [])]);
  }

  function statBlockText(statBlocks) {
    return (statBlocks || []).flatMap(stat => [
      stat.title || '', stat.creatureType || '', stat.challengeRating || '', stat.hitDice || '', stat.hitPoints || '', stat.attack || '', stat.fullAttack || '',
      ...(stat.specialAttacks || []), ...(stat.specialQualities || []), ...(stat.skills || []), ...(stat.feats || []), ...(stat.tactics || [])
    ]);
  }

  function renderEntry(panel, entries, entryId) {
    const entry = entries.find(item => item.id === entryId) || entries[0];
    const view = panel.querySelector('#wiki-entry-view');
    if (!entry || !view) return;
    view.dataset.entryId = entry.id;
    panel.querySelectorAll('#wiki-list button').forEach(button => {
      button.classList.toggle('active', button.dataset.entryId === entry.id);
    });

    view.innerHTML = '';
    const meta = document.createElement('div');
    meta.className = 'wiki-entry-meta';
    meta.textContent = entry.category || 'Uncategorized';
    const title = document.createElement('h3');
    title.textContent = entry.title;
    const summary = document.createElement('p');
    summary.className = 'wiki-entry-summary';
    summary.innerHTML = `<strong>${renderInlineLinks(entry.summary || '', entries)}</strong>`;
    view.append(meta, title, summary);

    (entry.body || []).forEach(paragraph => appendParagraph(view, paragraph, entries));
    (entry.sections || []).forEach(section => {
      const heading = document.createElement('h4');
      heading.textContent = section.heading || 'Section';
      view.appendChild(heading);
      (section.body || []).forEach(paragraph => appendParagraph(view, paragraph, entries));
    });

    renderStatBlocks(view, entry.statBlocks || []);

    appendChips(view, 'Tags', entry.tags || [], tag => {
      const search = panel.querySelector('#wiki-search');
      if (search) search.value = tag;
      renderWikiList(panel, entries, entry.id);
    });
    appendEntryLinks(view, entries, entry.relatedEntries || []);
    appendModuleLinks(view, entry.relatedModules || []);
  }

  function appendParagraph(parent, text, entries) {
    const p = document.createElement('p');
    p.innerHTML = renderInlineLinks(text || '', entries);
    parent.appendChild(p);
  }

  function renderStatBlocks(parent, statBlocks) {
    if (!statBlocks.length) return;
    const heading = document.createElement('h4');
    heading.textContent = 'Hypertext d20 statistics';
    parent.appendChild(heading);
    statBlocks.forEach(stat => parent.appendChild(createStatBlock(stat)));
  }

  function createStatBlock(stat) {
    const block = document.createElement('section');
    block.className = 'wiki-stat-block';
    const title = document.createElement('h4');
    title.textContent = stat.title || 'Stat Block';
    const subtitle = document.createElement('div');
    subtitle.className = 'wiki-stat-subtitle';
    subtitle.textContent = [stat.ruleset, stat.conversionStatus, stat.statType].filter(Boolean).join(' · ');
    block.append(title, subtitle);

    appendStatLine(block, 'Type', [stat.size, stat.creatureType, stat.alignment].filter(Boolean).join(' '));
    appendStatLine(block, 'Challenge Rating', stat.challengeRating);
    appendStatLine(block, 'Experience', stat.experience);
    appendStatLine(block, 'Hit Dice', stat.hitDice);
    appendStatLine(block, 'Hit Points', stat.hitPoints);
    appendStatLine(block, 'Initiative', stat.initiative);
    appendStatLine(block, 'Speed', (stat.speed || []).join('; '));
    appendStatLine(block, 'Armor Class', armorText(stat.armorClass));
    appendStatLine(block, 'Base Attack/Grapple', stat.baseAttackGrapple);
    appendStatLine(block, 'Attack', stat.attack);
    appendStatLine(block, 'Full Attack', stat.fullAttack);
    appendStatLine(block, 'Space/Reach', stat.spaceReach);

    const grid = document.createElement('div');
    grid.className = 'wiki-stat-grid';
    appendStatCell(grid, 'Fortitude', stat.saves?.fortitude);
    appendStatCell(grid, 'Reflex', stat.saves?.reflex);
    appendStatCell(grid, 'Will', stat.saves?.will);
    appendStatCell(grid, 'Strength', stat.abilities?.strength);
    appendStatCell(grid, 'Dexterity', stat.abilities?.dexterity);
    appendStatCell(grid, 'Constitution', stat.abilities?.constitution);
    appendStatCell(grid, 'Intelligence', stat.abilities?.intelligence);
    appendStatCell(grid, 'Wisdom', stat.abilities?.wisdom);
    appendStatCell(grid, 'Charisma', stat.abilities?.charisma);
    block.appendChild(grid);

    appendStatList(block, 'Special Attacks', stat.specialAttacks || []);
    appendStatList(block, 'Special Qualities', stat.specialQualities || []);
    appendStatList(block, 'Skills', stat.skills || []);
    appendStatList(block, 'Feats', stat.feats || []);
    appendStatLine(block, 'Environment', stat.environment);
    appendStatLine(block, 'Organization', stat.organization);
    appendStatLine(block, 'Treasure', stat.treasure);
    appendStatLine(block, 'Advancement', stat.advancement);
    appendStatLine(block, 'Level Adjustment', stat.levelAdjustment);
    appendStatList(block, 'Tactics', stat.tactics || []);
    appendStatList(block, 'Conversion Notes', stat.conversionNotes || []);
    return block;
  }

  function armorText(armorClass) {
    if (!armorClass) return '';
    return [`AC ${armorClass.total || '?'}`, `touch ${armorClass.touch || '?'}`, `flat-footed ${armorClass.flatFooted || '?'}`, armorClass.notes || ''].filter(Boolean).join('; ');
  }

  function appendStatLine(parent, label, value) {
    if (!value) return;
    const line = document.createElement('div');
    line.className = 'wiki-stat-line';
    line.innerHTML = `<strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}`;
    parent.appendChild(line);
  }

  function appendStatCell(parent, label, value) {
    if (!value) return;
    const cell = document.createElement('div');
    cell.className = 'wiki-stat-cell';
    cell.innerHTML = `<strong>${escapeHtml(label)}</strong>${escapeHtml(value)}`;
    parent.appendChild(cell);
  }

  function appendStatList(parent, label, values) {
    if (!values.length) return;
    const line = document.createElement('div');
    line.className = 'wiki-stat-line';
    line.innerHTML = `<strong>${escapeHtml(label)}:</strong>`;
    const list = document.createElement('ul');
    list.className = 'wiki-stat-list';
    values.forEach(value => {
      const item = document.createElement('li');
      item.textContent = value;
      list.appendChild(item);
    });
    parent.append(line, list);
  }

  function renderInlineLinks(text, entries) {
    const escaped = escapeHtml(text);
    return escaped.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, id, label) => {
      const cleanId = id.trim();
      const entry = entries.find(item => item.id === cleanId);
      const textLabel = label ? label.trim() : cleanId.replace(/-/g, ' ');
      if (!entry) return `<span>${escapeHtml(textLabel)}</span>`;
      return `<a href="#" class="wiki-hotlink" data-wiki-entry="${escapeHtml(cleanId)}">${escapeHtml(textLabel)}</a>`;
    });
  }

  function appendChips(parent, title, values, onClick) {
    if (!values.length) return;
    const wrap = document.createElement('div');
    wrap.className = 'wiki-related';
    const h4 = document.createElement('h4');
    h4.textContent = title;
    const strip = document.createElement('div');
    strip.className = 'wiki-link-strip';
    values.forEach(value => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'wiki-chip-button';
      button.textContent = value;
      button.addEventListener('click', () => onClick(value));
      strip.appendChild(button);
    });
    wrap.append(h4, strip);
    parent.appendChild(wrap);
  }

  function appendEntryLinks(parent, entries, ids) {
    const linked = ids.map(id => entries.find(entry => entry.id === id)).filter(Boolean);
    if (!linked.length) return;
    appendChips(parent, 'Related wiki entries', linked.map(entry => entry.title), title => {
      const entry = entries.find(item => item.title === title);
      if (entry) renderEntry(getPanel(), entries, entry.id);
    });
  }

  function appendModuleLinks(parent, ids) {
    if (!ids.length) return;
    appendChips(parent, 'Related tools and generators', ids.map(id => id.replace(/-/g, ' ')), label => {
      const moduleId = label.replace(/ /g, '-');
      const allFilter = document.querySelector('.registry-filter[data-kaysender-filter="all"]');
      if (allFilter && !allFilter.classList.contains('active')) allFilter.click();
      const search = document.getElementById('kaysender-search');
      if (search) {
        search.value = moduleId;
        search.dispatchEvent(new Event('input', { bubbles: true }));
      }
      document.getElementById('kaysender-overview-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function decorateCards() {
    injectStyles();
    document.querySelectorAll('.module-card').forEach(card => {
      const moduleId = card.dataset.moduleId;
      if (!moduleId || card.dataset.wikiLinked === 'true') return;
      const entryIds = moduleEntryMap[moduleId] || [];
      if (moduleId === 'kaysender-wiki') {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'primary-action alpha-launch';
        button.textContent = 'Launch Alpha Wiki';
        button.addEventListener('click', () => openWiki('kaysender-overview'));
        card.appendChild(button);
      }
      if (entryIds.length) {
        const strip = document.createElement('div');
        strip.className = 'wiki-link-strip';
        entryIds.slice(0, 4).forEach(entryId => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'wiki-chip-button';
          button.textContent = entryId.replace(/-/g, ' ');
          button.addEventListener('click', () => openWiki(entryId));
          strip.appendChild(button);
        });
        card.appendChild(strip);
      }
      card.dataset.wikiLinked = 'true';
    });
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  window.openKaysenderWiki = openWiki;
  window.decorateKaysenderWikiCards = decorateCards;

  document.addEventListener('click', event => {
    const link = event.target.closest?.('.wiki-hotlink');
    if (!link) return;
    event.preventDefault();
    const entryId = link.dataset.wikiEntry;
    if (!entryId || !wikiData) return;
    renderEntry(getPanel(), wikiData.entries || [], entryId);
    getPanel().scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const observer = new MutationObserver(decorateCards);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', decorateCards);
  setInterval(decorateCards, 1000);
})();
