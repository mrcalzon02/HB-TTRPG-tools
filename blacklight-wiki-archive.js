(() => {
  'use strict';

  const CLASS_SOURCES = {
    'human-investigator': 'data/blacklight-continuum/rules/human-vigil-practices.json',
    vampire: 'data/blacklight-continuum/rules/vampire-remainder-bloodlines.json',
    shapechanger: 'data/blacklight-continuum/rules/shapechanger-remainder-forms.json',
    'eldritch-binder': 'data/blacklight-continuum/rules/eldritch-binding-sources.json',
    'harmonic-mutant': 'data/blacklight-continuum/rules/harmonic-compact-remainders.json',
    technomancer: 'data/blacklight-continuum/rules/technomancer-awakening-practices.json'
  };
  const RULES_URL = 'data/blacklight-continuum/rules/basic-character-options.json';
  const FACTIONS_URL = 'data/blacklight-continuum/wiki/supernatural-factions.json';
  const ADVERSARIES_URL = 'data/blacklight-continuum/wiki/internal-adversaries.json';

  const state = {
    filter: 'all',
    query: '',
    classes: [],
    factions: [],
    adversaries: {}
  };

  const ui = {
    classRecords: document.getElementById('wiki-class-records'),
    factionRecords: document.getElementById('wiki-faction-records'),
    search: document.getElementById('wiki-search'),
    clear: document.getElementById('wiki-search-clear'),
    status: document.getElementById('wiki-search-status'),
    classCount: document.getElementById('wiki-class-count'),
    subgroupCount: document.getElementById('wiki-subgroup-count'),
    factionCount: document.getElementById('wiki-faction-count'),
    adversaryCount: document.getElementById('wiki-adversary-count')
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function slug(value) {
    return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function titleCase(value) {
    return String(value ?? '')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, character => character.toUpperCase());
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
  }

  function list(value) {
    return Array.isArray(value) ? value.filter(Boolean) : [];
  }

  function concise(text, length = 180) {
    const value = String(text ?? '').trim();
    if (value.length <= length) return value;
    const cut = value.slice(0, length);
    return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), length - 30)).trim()}…`;
  }

  function collectCatalogs(data) {
    const catalogs = [];
    if (Array.isArray(data?.catalogs)) {
      for (const catalog of data.catalogs) {
        if (!Array.isArray(catalog?.variants)) continue;
        catalogs.push({
          id: catalog.id || slug(catalog.title || 'catalog'),
          title: catalog.title || titleCase(catalog.id || 'Subgroups'),
          eyebrow: catalog.eyebrow || catalog.legacyLabel || '',
          code: catalog.code || `${catalog.variants.length} records`,
          variants: catalog.variants
        });
      }
    }

    const ignored = new Set(['catalogs', 'powerLevels', 'highSecurityClearanceScales', 'eldritchCreatureLookupTables']);
    for (const [key, value] of Object.entries(data || {})) {
      if (ignored.has(key) || !Array.isArray(value) || !value.length) continue;
      if (!value.every(item => item && typeof item === 'object' && (item.name || item.id))) continue;
      catalogs.push({
        id: key,
        title: titleCase(key),
        eyebrow: '',
        code: `${value.length} records`,
        variants: value
      });
    }

    const seen = new Set();
    return catalogs.filter(catalog => {
      const key = `${catalog.id}|${catalog.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function feature(label, value) {
    if (!value || typeof value !== 'object') return '';
    const name = value.name ? `<strong>${escapeHtml(value.name)}</strong>` : '';
    const effect = value.effect ? `<p>${escapeHtml(value.effect)}</p>` : '';
    if (!name && !effect) return '';
    return `<div class="wiki-subgroup-feature"><span class="wiki-badge">${escapeHtml(label)}</span>${name}${effect}</div>`;
  }

  function internalAdversaryFor(classId, variantId) {
    return state.adversaries?.[classId]?.[variantId] || null;
  }

  function renderInternalAdversary(adversary) {
    if (!adversary) return '';
    return `
      <section class="wiki-internal-adversary" aria-label="Internal adversary">
        <div class="wiki-adversary-heading">
          <span class="wiki-badge wiki-badge-danger">Internal adversary</span>
          <strong>${escapeHtml(adversary.name)}</strong>
          ${adversary.classification ? `<span>${escapeHtml(adversary.classification)}</span>` : ''}
        </div>
        <p>${escapeHtml(adversary.description)}</p>
        ${adversary.method ? `<p><strong>Operating method:</strong> ${escapeHtml(adversary.method)}</p>` : ''}
        ${adversary.conflict ? `<p class="wiki-adversary-conflict"><strong>Why the conflict is personal:</strong> ${escapeHtml(adversary.conflict)}</p>` : ''}
      </section>`;
  }

  function subgroupSearchText(variant, catalog, className, adversary) {
    const parts = [
      className, catalog.title, variant.name, variant.legacy, variant.continuum,
      ...(variant.favoredFamilies || []), ...(variant.recommendedSkills || []),
      ...(variant.trainedSkills || []), variant.entryRequirement,
      adversary?.name, adversary?.classification, adversary?.description,
      adversary?.method, adversary?.conflict
    ];
    for (const key of ['gift', 'bane', 'method', 'practice', 'temptation', 'intrusionBreach']) {
      parts.push(variant[key]?.name, variant[key]?.effect);
    }
    for (const step of list(variant.progression)) parts.push(step.stage, step.name, step.effect);
    return parts.filter(Boolean).join(' ').toLowerCase();
  }

  function renderSubgroup(variant, catalog, archetype) {
    const tags = [
      ...list(variant.favoredFamilies),
      ...list(variant.recommendedSkills),
      ...list(variant.trainedSkills)
    ];
    const intro = variant.continuum || variant.legacy || variant.description || '';
    const progression = list(variant.progression);
    const adversary = internalAdversaryFor(archetype.id, variant.id);
    const detailFeatures = [
      feature('Gift', variant.gift),
      feature('Bane', variant.bane),
      feature('Method', variant.method),
      feature('Practice', variant.practice),
      feature('Temptation', variant.temptation),
      feature('Intrusion breach', variant.intrusionBreach)
    ].join('');
    const searchText = subgroupSearchText(variant, catalog, archetype.name, adversary);
    return `
      <details class="wiki-subgroup" data-record-type="subgroup" data-search="${escapeHtml(searchText)}">
        <summary>
          <strong>${escapeHtml(variant.name || titleCase(variant.id))}</strong>
          <span>${escapeHtml(concise(intro, 150))}</span>
          ${adversary ? `<span class="wiki-adversary-summary">Enemy within: ${escapeHtml(adversary.name)}</span>` : ''}
        </summary>
        <div class="wiki-subgroup-body">
          ${variant.legacy ? `<p><strong>Inherited tradition:</strong> ${escapeHtml(variant.legacy)}</p>` : ''}
          ${variant.continuum ? `<p><strong>Continuum expression:</strong> ${escapeHtml(variant.continuum)}</p>` : ''}
          ${variant.description && !variant.continuum ? `<p>${escapeHtml(variant.description)}</p>` : ''}
          ${variant.entryRequirement ? `<p><strong>Entry requirement:</strong> ${escapeHtml(variant.entryRequirement)}</p>` : ''}
          ${tags.length ? `<div class="wiki-subgroup-meta">${[...new Set(tags)].map(tag => `<span class="wiki-tag">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
          ${renderInternalAdversary(adversary)}
          ${detailFeatures}
          ${progression.length ? `<div class="wiki-subgroup-feature"><span class="wiki-badge">Progression</span><ol class="wiki-progression">${progression.map(step => `<li><strong>${escapeHtml([step.stage, step.name].filter(Boolean).join(' · '))}</strong>${step.effect ? ` — ${escapeHtml(step.effect)}` : ''}</li>`).join('')}</ol></div>` : ''}
        </div>
      </details>`;
  }

  function renderClass(archetype, subgroupData) {
    const catalogs = collectCatalogs(subgroupData);
    const subgroupCount = catalogs.reduce((sum, catalog) => sum + catalog.variants.length, 0);
    const adversaryCount = catalogs.reduce((sum, catalog) => (
      sum + catalog.variants.filter(variant => internalAdversaryFor(archetype.id, variant.id)).length
    ), 0);
    const innate = list(archetype.innateAbilities);
    const families = list(archetype.powerFamilies);
    const lore = list(archetype.lore);
    const searchText = [
      archetype.name, archetype.theme, archetype.resourceName, archetype.pressureName,
      archetype.keyAttribute, archetype.startingAbility, archetype.weakness,
      ...innate.flatMap(item => [item.name, item.effect]),
      ...families.flatMap(item => [item.name, item.description]),
      ...catalogs.flatMap(catalog => catalog.variants.flatMap(item => {
        const adversary = internalAdversaryFor(archetype.id, item.id);
        return [
          item.name, item.legacy, item.continuum, ...(item.favoredFamilies || []),
          ...(item.recommendedSkills || []), ...(item.trainedSkills || []),
          adversary?.name, adversary?.classification, adversary?.description,
          adversary?.method, adversary?.conflict
        ];
      }))
    ].filter(Boolean).join(' ').toLowerCase();

    return `
      <details id="class-${escapeHtml(archetype.id)}" class="wiki-record" data-record-type="class" data-search="${escapeHtml(searchText)}">
        <summary>
          <div>
            <h3>${escapeHtml(archetype.name)}</h3>
            <p>${escapeHtml(concise(archetype.theme, 310))}</p>
          </div>
          <div class="wiki-record-code">
            <span class="wiki-badge">${escapeHtml(archetype.resourceName)} resource</span>
            <span class="wiki-badge">${escapeHtml(archetype.pressureName)} pressure</span>
            <span class="wiki-badge">${subgroupCount} subgroup entries</span>
            ${adversaryCount ? `<span class="wiki-badge wiki-badge-danger">${adversaryCount} internal enemies</span>` : ''}
          </div>
        </summary>
        <div class="wiki-record-body">
          <p class="wiki-class-lede">${escapeHtml(archetype.theme)}</p>
          <div class="wiki-stat-grid">
            <div class="wiki-stat"><span>Resource</span><strong>${escapeHtml(archetype.resourceName)}</strong></div>
            <div class="wiki-stat"><span>Pressure</span><strong>${escapeHtml(archetype.pressureName)}</strong></div>
            <div class="wiki-stat"><span>Key Attribute</span><strong>${escapeHtml(archetype.keyAttribute)}</strong></div>
            <div class="wiki-stat"><span>Starting Ability</span><strong>${escapeHtml(archetype.startingAbility)}</strong></div>
            <div class="wiki-stat"><span>Weakness</span><strong>${escapeHtml(archetype.weakness)}</strong></div>
            <div class="wiki-stat"><span>Subgroup records</span><strong>${subgroupCount}</strong></div>
            ${adversaryCount ? `<div class="wiki-stat wiki-stat-danger"><span>Internal adversaries</span><strong>${adversaryCount}</strong></div>` : ''}
          </div>
          ${archetype.weaknessText ? `<div class="wiki-record-section"><h4>${escapeHtml(archetype.weakness)}</h4><p>${escapeHtml(archetype.weaknessText)}</p></div>` : ''}
          ${innate.length ? `<div class="wiki-record-section"><h4>Innate capabilities</h4><div class="wiki-compact-list">${innate.map(item => `<div class="wiki-compact-item"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.effect)}</span></div>`).join('')}</div></div>` : ''}
          ${families.length ? `<div class="wiki-record-section"><h4>Shared power families</h4><div class="wiki-compact-list">${families.map(item => `<div class="wiki-compact-item"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.description)}</span></div>`).join('')}</div></div>` : ''}
          ${subgroupData?.framework ? `<div class="wiki-record-section"><h4>Subgroup framework</h4><p>${escapeHtml(subgroupData.framework)}</p></div>` : ''}
          ${adversaryCount ? `<div class="wiki-record-section wiki-adversary-doctrine"><h4>Enemies within the tradition</h4><p>These adversaries are not universal biological enemies. They are corrupted mirrors, predatory institutions, fallen houses, hostile offshoots, and ideological schisms produced by the same history and capabilities as the subgroup they oppose.</p></div>` : ''}
          ${catalogs.map(catalog => `
            <section class="wiki-catalog">
              <div class="wiki-catalog-header"><h4>${escapeHtml(catalog.title)}</h4><span>${escapeHtml(catalog.eyebrow || catalog.code)}</span><span class="wiki-badge">${catalog.variants.length} entries</span></div>
              <div class="wiki-subgroup-grid">${catalog.variants.map(variant => renderSubgroup(variant, catalog, archetype)).join('')}</div>
            </section>`).join('')}
          ${lore.length ? `<details class="wiki-subgroup wiki-record-section"><summary><strong>Full class setting notes</strong><span>${lore.length} archive paragraphs</span></summary><div class="wiki-subgroup-body">${lore.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}</div></details>` : ''}
        </div>
      </details>`;
  }

  function factionSearchText(faction) {
    return [
      faction.name, faction.family, faction.summary, faction.doctrine,
      ...list(faction.subgroups).flatMap(item => [item.name, item.description]),
      ...list(faction.rivals), ...list(faction.commonIncidents)
    ].filter(Boolean).join(' ').toLowerCase();
  }

  function renderFaction(faction) {
    return `
      <article id="faction-${escapeHtml(faction.id)}" class="wiki-faction-card" data-record-type="faction" data-search="${escapeHtml(factionSearchText(faction))}">
        <h3>${escapeHtml(faction.name)}</h3>
        <span class="wiki-faction-family">${escapeHtml(faction.family)}</span>
        <p>${escapeHtml(faction.summary)}</p>
        <p class="wiki-doctrine"><strong>Operating doctrine:</strong> ${escapeHtml(faction.doctrine)}</p>
        <h4>Subgroups and operating bodies</h4>
        <div class="wiki-faction-subgroups">
          ${list(faction.subgroups).map(item => `<div class="wiki-faction-subgroup"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.description)}</span></div>`).join('')}
        </div>
        ${list(faction.rivals).length ? `<h4>Frequent rivals</h4><div class="wiki-tag-row">${faction.rivals.map(item => `<span class="wiki-tag">${escapeHtml(item)}</span>`).join('')}</div>` : ''}
        ${list(faction.commonIncidents).length ? `<h4>Common incident patterns</h4><div class="wiki-tag-row">${faction.commonIncidents.map(item => `<span class="wiki-tag">${escapeHtml(item)}</span>`).join('')}</div>` : ''}
        ${list(faction.links).length ? `<div class="wiki-link-row">${faction.links.map(item => `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`).join('')}</div>` : ''}
      </article>`;
  }

  function applySearch() {
    const query = state.query.trim().toLowerCase();
    const classRecords = [...document.querySelectorAll('.wiki-record[data-record-type="class"]')];
    const factionRecords = [...document.querySelectorAll('.wiki-faction-card[data-record-type="faction"]')];
    let visibleClasses = 0;
    let visibleSubgroups = 0;
    let visibleFactions = 0;

    for (const record of classRecords) {
      const subgroups = [...record.querySelectorAll('.wiki-subgroup[data-record-type="subgroup"]')];
      const ownMatch = !query || record.dataset.search.includes(query);
      let subgroupMatchCount = 0;
      for (const subgroup of subgroups) {
        const matchesQuery = !query || subgroup.dataset.search.includes(query);
        const visibleByFilter = state.filter === 'all' || state.filter === 'subgroup';
        const shouldShow = visibleByFilter && matchesQuery;
        subgroup.hidden = !shouldShow;
        if (shouldShow) subgroupMatchCount += 1;
      }

      let show = false;
      if (state.filter === 'class') show = ownMatch;
      else if (state.filter === 'subgroup') show = subgroupMatchCount > 0;
      else if (state.filter === 'faction') show = false;
      else show = ownMatch || subgroupMatchCount > 0;

      record.hidden = !show;
      if (show) {
        visibleClasses += 1;
        visibleSubgroups += subgroupMatchCount;
        if (query && subgroupMatchCount > 0) record.open = true;
      }
    }

    for (const record of factionRecords) {
      const matchesQuery = !query || record.dataset.search.includes(query);
      const show = (state.filter === 'all' || state.filter === 'faction') && matchesQuery;
      record.hidden = !show;
      if (show) visibleFactions += 1;
    }

    const parts = [];
    if (state.filter !== 'faction') parts.push(`${visibleClasses} class record${visibleClasses === 1 ? '' : 's'}`);
    if (state.filter === 'all' || state.filter === 'subgroup') parts.push(`${visibleSubgroups} subgroup entr${visibleSubgroups === 1 ? 'y' : 'ies'}`);
    if (state.filter === 'all' || state.filter === 'faction') parts.push(`${visibleFactions} faction famil${visibleFactions === 1 ? 'y' : 'ies'}`);
    ui.status.textContent = parts.length ? `Showing ${parts.join(' · ')}.` : 'No archive records match the current search.';
  }

  function bindSearch() {
    ui.search?.addEventListener('input', () => {
      state.query = ui.search.value;
      applySearch();
    });
    ui.clear?.addEventListener('click', () => {
      state.query = '';
      if (ui.search) ui.search.value = '';
      applySearch();
      ui.search?.focus();
    });
    document.querySelectorAll('.wiki-filter').forEach(button => {
      button.addEventListener('click', () => {
        state.filter = button.dataset.filter || 'all';
        document.querySelectorAll('.wiki-filter').forEach(item => item.classList.toggle('active', item === button));
        applySearch();
      });
    });
  }

  function openHashTarget() {
    if (!location.hash) return;
    const target = document.querySelector(location.hash);
    if (target instanceof HTMLDetailsElement) target.open = true;
    target?.scrollIntoView({ block: 'start' });
  }

  async function initialize() {
    try {
      const [rules, factionData, adversaryData, ...subgroupFiles] = await Promise.all([
        fetchJson(RULES_URL),
        fetchJson(FACTIONS_URL),
        fetchJson(ADVERSARIES_URL),
        ...Object.values(CLASS_SOURCES).map(fetchJson)
      ]);
      const subgroupByClass = {};
      Object.keys(CLASS_SOURCES).forEach((id, index) => { subgroupByClass[id] = subgroupFiles[index]; });

      state.classes = list(rules.archetypes);
      state.factions = list(factionData.factions);
      state.adversaries = adversaryData?.classes || {};
      ui.classRecords.innerHTML = state.classes.map(archetype => renderClass(archetype, subgroupByClass[archetype.id])).join('');
      ui.factionRecords.innerHTML = state.factions.map(renderFaction).join('');

      const subgroupCount = state.classes.reduce((sum, archetype) => {
        const catalogs = collectCatalogs(subgroupByClass[archetype.id]);
        return sum + catalogs.reduce((catalogSum, catalog) => catalogSum + catalog.variants.length, 0);
      }, 0);
      const adversaryCount = Object.values(state.adversaries)
        .reduce((sum, classAdversaries) => sum + Object.keys(classAdversaries || {}).length, 0);

      if (ui.classCount) ui.classCount.textContent = String(state.classes.length);
      if (ui.subgroupCount) ui.subgroupCount.textContent = String(subgroupCount);
      if (ui.factionCount) ui.factionCount.textContent = String(state.factions.length);
      if (ui.adversaryCount) ui.adversaryCount.textContent = String(adversaryCount);

      bindSearch();
      applySearch();
      openHashTarget();
    } catch (error) {
      console.error(error);
      ui.classRecords.innerHTML = `<div class="wiki-error">Player class records could not be loaded: ${escapeHtml(error.message)}</div>`;
      ui.factionRecords.innerHTML = `<div class="wiki-error">Faction records could not be loaded. The deeper archive routes below remain available.</div>`;
      ui.status.textContent = 'The unified archive could not load one or more source records.';
    }
  }

  initialize();
})();
