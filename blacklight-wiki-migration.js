(() => {
  'use strict';

  const LEDGER_URL = 'data/blacklight-continuum/wiki/reports/migration-status.json';
  const ACTIVE_URL = 'data/blacklight-continuum/wiki/reports/active-vampire-revisions.json';
  const STYLE_URL = 'data/blacklight-continuum/wiki/reports/charles-intelligence-style-guide.json';
  const SCHEMA_URL = 'data/blacklight-continuum/wiki/reports/charles-intelligence-report.schema.json';
  const RULES_URL = 'data/blacklight-continuum/rules/basic-character-options.json';
  const FACTIONS_URL = 'data/blacklight-continuum/wiki/supernatural-factions.json';
  const ADVERSARIES_URL = 'data/blacklight-continuum/wiki/internal-adversaries.json';
  const CLASS_SOURCES = {
    'human-investigator': 'data/blacklight-continuum/rules/human-vigil-practices.json',
    vampire: 'data/blacklight-continuum/rules/vampire-remainder-bloodlines.json',
    shapechanger: 'data/blacklight-continuum/rules/shapechanger-remainder-forms.json',
    'eldritch-binder': 'data/blacklight-continuum/rules/eldritch-binding-sources.json',
    'harmonic-mutant': 'data/blacklight-continuum/rules/harmonic-compact-remainders.json',
    technomancer: 'data/blacklight-continuum/rules/technomancer-awakening-practices.json'
  };

  const ui = {
    status: document.getElementById('migration-status'),
    metrics: document.getElementById('migration-metrics'),
    phases: document.getElementById('migration-phases'),
    style: document.getElementById('migration-style-guide'),
    classes: document.getElementById('migration-class-inventory'),
    factions: document.getElementById('migration-faction-inventory'),
    sources: document.getElementById('migration-source-manifest'),
    search: document.getElementById('migration-search'),
    clear: document.getElementById('migration-search-clear')
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function list(value) {
    return Array.isArray(value) ? value.filter(Boolean) : [];
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
  }

  function stringsIn(value, output = []) {
    if (typeof value === 'string') output.push(value);
    else if (Array.isArray(value)) value.forEach(item => stringsIn(item, output));
    else if (value && typeof value === 'object') Object.values(value).forEach(item => stringsIn(item, output));
    return output;
  }

  function wordCount(value) {
    return stringsIn(value).join(' ').trim().split(/\s+/).filter(Boolean).length;
  }

  function leafFieldCount(value) {
    if (value === null || typeof value !== 'object') return 1;
    if (Array.isArray(value)) return value.reduce((sum, item) => sum + leafFieldCount(item), 0);
    return Object.values(value).reduce((sum, item) => sum + leafFieldCount(item), 0);
  }

  function collectCatalogs(data) {
    const catalogs = [];
    if (Array.isArray(data?.catalogs)) {
      for (const catalog of data.catalogs) {
        if (!Array.isArray(catalog?.variants)) continue;
        catalogs.push({
          id: catalog.id || 'catalog',
          title: catalog.title || catalog.id || 'Catalog',
          variants: catalog.variants
        });
      }
    }
    const ignored = new Set(['catalogs', 'powerLevels', 'highSecurityClearanceScales', 'eldritchCreatureLookupTables']);
    for (const [key, value] of Object.entries(data || {})) {
      if (ignored.has(key) || !Array.isArray(value) || !value.length) continue;
      if (!value.every(item => item && typeof item === 'object' && (item.name || item.id))) continue;
      catalogs.push({ id: key, title: key, variants: value });
    }
    const seen = new Set();
    return catalogs.filter(catalog => {
      const key = `${catalog.id}|${catalog.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function indexVariants(data) {
    const index = new Map();
    for (const catalog of collectCatalogs(data)) {
      for (const variant of catalog.variants) index.set(variant.id, { variant, catalog });
    }
    return index;
  }

  function badge(status) {
    const normalized = String(status || 'untouched').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `<span class="migration-badge ${escapeHtml(normalized)}">${escapeHtml(status || 'untouched')}</span>`;
  }

  function applyActiveRevisionState(ledger, active) {
    if (!active || typeof active !== 'object') return ledger;
    if (active.currentPhase) ledger.currentPhase = active.currentPhase;
    if (Array.isArray(active.reports)) {
      ledger.pilotReports = active.reports;
      const vampireRecords = ledger.classes?.vampire?.subgroups || [];
      for (const report of active.reports) {
        const record = vampireRecords.find(item => item.id === report.recordId);
        if (record) record.status = report.status;
      }
    }
    for (const override of list(active.phaseOverrides)) {
      const phase = list(ledger.phaseStatus).find(item => item.phase === override.phase);
      if (!phase) continue;
      if (override.status) phase.status = override.status;
      if (override.notes) phase.notes = override.notes;
    }
    return ledger;
  }

  function renderMetrics(metrics) {
    const items = [
      ['Source files inventoried', metrics.sourceFiles],
      ['Archetype overviews', metrics.archetypes],
      ['Class subgroup records', metrics.subgroups],
      ['Internal adversaries', metrics.adversaries],
      ['Faction families', metrics.factions],
      ['Faction subgroups', metrics.factionSubgroups],
      ['Setting entries', metrics.settingEntries],
      ['Inventory mismatches', metrics.mismatches]
    ];
    ui.metrics.innerHTML = items.map(([label, value]) => `
      <div class="migration-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>
    `).join('');
  }

  function renderPhases(ledger) {
    const phases = list(ledger.phaseStatus).map(phase => `
      <article class="migration-card migration-phase" data-search="phase ${escapeHtml(phase.phase)} ${escapeHtml(phase.name)} ${escapeHtml(phase.status)} ${escapeHtml(phase.notes || '')}">
        <span class="migration-phase-number">${escapeHtml(phase.phase)}</span>
        <div><strong>${escapeHtml(phase.name)}</strong>${phase.notes ? `<p>${escapeHtml(phase.notes)}</p>` : ''}</div>
        ${badge(phase.status)}
      </article>
    `).join('');
    const active = list(ledger.pilotReports).map(report => `
      <article class="migration-card" data-search="${escapeHtml([report.name, report.id, report.status].join(' ').toLowerCase())}">
        <h3>${escapeHtml(report.name)}</h3>
        <p>${badge(report.status)}</p>
        <p>${report.encounterQuotes ? `${escapeHtml(report.encounterQuotes)} encounter quotations filed.` : 'No encounter quotations recorded.'}</p>
        <p><a class="bli-action" href="${escapeHtml(report.reviewPath)}">Open review</a></p>
      </article>
    `).join('');
    ui.phases.innerHTML = `${phases}${active ? `<div class="migration-section-head"><p class="bli-eyebrow">Active report files</p><h2>Current incremental revisions.</h2></div><div class="migration-grid">${active}</div>` : ''}`;
  }

  function renderStyleGuide(style, schema) {
    const requiredSections = list(style.standardSections).filter(section => section.required);
    ui.style.innerHTML = `
      <div class="migration-style-columns">
        <article class="migration-card" data-search="style guide voice principles preservation">
          <h3>Governing principles</h3>
          <ul>${list(style.governingPrinciples).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </article>
        <article class="migration-card" data-search="Charles voice evidence confidence ethics">
          <h3>Charles archive voice</h3>
          <p>${escapeHtml(style.charlesVoice?.preferredPerspective || '')}</p>
          <p>${escapeHtml(style.charlesVoice?.cadence || '')}</p>
          <p><strong>Ethical lens:</strong> ${escapeHtml(style.charlesVoice?.ethicalLens || '')}</p>
        </article>
        <article class="migration-card" data-search="encounter testimony quotes witness survivor custody confidence">
          <h3>Encounter testimony</h3>
          <p>${escapeHtml(style.encounterTestimonyPolicy?.purpose || '')}</p>
          <p>${escapeHtml(style.encounterTestimonyPolicy?.placement || '')}</p>
          <ul>${list(style.encounterTestimonyPolicy?.rules).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </article>
        <article class="migration-card" data-search="required report sections schema">
          <h3>Required report sections</h3>
          <ul>${requiredSections.map(section => `<li><strong>${escapeHtml(section.label)}</strong> — ${escapeHtml(section.purpose)}</li>`).join('')}</ul>
          <p class="migration-code">Schema: ${escapeHtml(schema.$id || SCHEMA_URL)}</p>
        </article>
        <article class="migration-card" data-search="prohibited patterns no truncation no boilerplate">
          <h3>Prohibited migration patterns</h3>
          <ul>${list(style.prohibitedPatterns).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </article>
        <article class="migration-card" data-search="confidence confirmed high moderate low disputed unknown">
          <h3>Confidence vocabulary</h3>
          ${list(style.confidenceLevels).map(level => `<p><strong>${escapeHtml(level.label)}:</strong> ${escapeHtml(level.definition)}</p>`).join('')}
        </article>
        <article class="migration-card" data-search="mechanics verbatim protected fields">
          <h3>Protected mechanics</h3>
          <p>${escapeHtml(style.mechanicalTextPolicy?.rule || '')}</p>
          <p>${escapeHtml(style.mechanicalTextPolicy?.presentation || '')}</p>
          <div>${list(style.mechanicalTextPolicy?.protectedFields).map(field => `<span class="migration-badge">${escapeHtml(field)}</span>`).join(' ')}</div>
        </article>
      </div>`;
  }

  function classInventory(ledger, rules, classData, adversaries) {
    const archetypeIndex = new Map(list(rules.archetypes).map(archetype => [archetype.id, archetype]));
    let mismatches = 0;
    let subgroupCount = 0;
    const html = [];

    for (const [classId, classLedger] of Object.entries(ledger.classes || {})) {
      const source = classData[classId];
      const variants = indexVariants(source);
      const archetype = archetypeIndex.get(classId);
      const ledgerRecords = list(classLedger.subgroups);
      const ledgerIds = new Set(ledgerRecords.map(record => record.id));
      const actualIds = new Set([...variants.keys()]);
      const expectedAdversaryIds = new Set(ledgerRecords.filter(record => record.internalAdversary).map(record => record.id));
      const actualAdversaryIds = new Set(Object.keys(adversaries?.[classId] || {}));
      const missingInSource = [...ledgerIds].filter(id => !actualIds.has(id));
      const missingInLedger = [...actualIds].filter(id => !ledgerIds.has(id));
      const missingAdversaries = [...expectedAdversaryIds].filter(id => !actualAdversaryIds.has(id));
      const orphanAdversaries = [...actualAdversaryIds].filter(id => !ledgerIds.has(id));
      const adversaryNameMismatches = ledgerRecords.filter(record => {
        if (!record.internalAdversary) return false;
        const actualAdversary = adversaries?.[classId]?.[record.id];
        return actualAdversary && actualAdversary.name !== record.internalAdversary;
      });
      mismatches += missingInSource.length + missingInLedger.length + missingAdversaries.length + orphanAdversaries.length + adversaryNameMismatches.length + (archetype ? 0 : 1);
      subgroupCount += actualIds.size;

      const rows = ledgerRecords.map(record => {
        const match = variants.get(record.id);
        const adversary = adversaries?.[classId]?.[record.id] || null;
        const missing = !match || Boolean(record.internalAdversary && !adversary) || Boolean(adversary && record.internalAdversary && adversary.name !== record.internalAdversary);
        return `
          <tr data-search="${escapeHtml([classLedger.name, record.name, record.id, record.catalog, record.status, record.internalAdversary, adversary?.classification, adversary?.description].filter(Boolean).join(' ').toLowerCase())}" data-missing="${missing}">
            <td><strong>${escapeHtml(record.name)}</strong><div class="migration-code">${escapeHtml(record.id)}</div></td>
            <td>${escapeHtml(record.catalog)}</td>
            <td>${badge(record.status)}</td>
            <td>${match ? wordCount(match.variant) : 'missing'}</td>
            <td>${match ? leafFieldCount(match.variant) : 'missing'}</td>
            <td>${adversary ? `<strong>${escapeHtml(adversary.name)}</strong><div>${escapeHtml(adversary.classification || '')}</div>` : '—'}</td>
            <td>${adversary ? wordCount(adversary) : '—'}</td>
          </tr>`;
      }).join('');

      const hasWarnings = missingInSource.length || missingInLedger.length || missingAdversaries.length || orphanAdversaries.length || adversaryNameMismatches.length;
      const warning = hasWarnings ? `
        <div class="migration-error">
          ${missingInSource.length ? `<p><strong>Ledger records missing from source:</strong> ${escapeHtml(missingInSource.join(', '))}</p>` : ''}
          ${missingInLedger.length ? `<p><strong>Source records missing from ledger:</strong> ${escapeHtml(missingInLedger.join(', '))}</p>` : ''}
          ${missingAdversaries.length ? `<p><strong>Expected adversaries missing from source:</strong> ${escapeHtml(missingAdversaries.join(', '))}</p>` : ''}
          ${orphanAdversaries.length ? `<p><strong>Adversaries without a ledgered parent record:</strong> ${escapeHtml(orphanAdversaries.join(', '))}</p>` : ''}
          ${adversaryNameMismatches.length ? `<p><strong>Adversary names differing from ledger:</strong> ${escapeHtml(adversaryNameMismatches.map(record => record.id).join(', '))}</p>` : ''}
        </div>` : '';

      html.push(`
        <details class="migration-class-block" open data-class-search="${escapeHtml(classLedger.name.toLowerCase())}">
          <summary>
            <div><strong>${escapeHtml(classLedger.name)}</strong><span>${actualIds.size} subgroup records · ${actualAdversaryIds.size} internal adversaries</span></div>
            ${badge(classLedger.overviewStatus)}
          </summary>
          <div class="migration-class-body">
            ${warning}
            <div class="migration-card" data-search="${escapeHtml(`${classLedger.name} archetype overview ${classLedger.source}`.toLowerCase())}">
              <h4>Archetype overview baseline</h4>
              <p><strong>Source:</strong> <span class="migration-code">${escapeHtml(classLedger.source)}</span></p>
              <p><strong>Overview words:</strong> ${archetype ? wordCount(archetype) : 'missing'} · <strong>Leaf fields:</strong> ${archetype ? leafFieldCount(archetype) : 'missing'}</p>
            </div>
            <div class="migration-table-wrap">
              <table class="migration-table">
                <thead><tr><th>Record</th><th>Catalog</th><th>Status</th><th>Words</th><th>Leaf fields</th><th>Internal adversary</th><th>Enemy words</th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>
        </details>`);
    }
    ui.classes.innerHTML = html.join('');
    return { mismatches, subgroupCount, archetypes: archetypeIndex.size };
  }

  function factionInventory(ledger, factionData) {
    const actual = new Map(list(factionData.factions).map(faction => [faction.id, faction]));
    const ledgerIds = new Set(list(ledger.factions).map(faction => faction.id));
    const actualIds = new Set(actual.keys());
    const missingInSource = [...ledgerIds].filter(id => !actualIds.has(id));
    const missingInLedger = [...actualIds].filter(id => !ledgerIds.has(id));
    let factionSubgroups = 0;

    const rows = list(ledger.factions).map(record => {
      const faction = actual.get(record.id);
      const missing = !faction;
      const subgroupTotal = list(faction?.subgroups).length;
      factionSubgroups += subgroupTotal;
      return `
        <tr data-search="${escapeHtml([record.name, record.id, record.status, faction?.family, faction?.summary, faction?.doctrine, ...list(faction?.subgroups).flatMap(item => [item.name, item.description])].filter(Boolean).join(' ').toLowerCase())}" data-missing="${missing}">
          <td><strong>${escapeHtml(record.name)}</strong><div class="migration-code">${escapeHtml(record.id)}</div></td>
          <td>${badge(record.status)}</td>
          <td>${faction ? wordCount(faction) : 'missing'}</td>
          <td>${faction ? leafFieldCount(faction) : 'missing'}</td>
          <td>${subgroupTotal}</td>
          <td>${list(faction?.rivals).length}</td>
          <td>${list(faction?.commonIncidents).length}</td>
          <td>${list(faction?.links).length}</td>
        </tr>`;
    }).join('');

    const warning = missingInSource.length || missingInLedger.length ? `
      <div class="migration-error">
        ${missingInSource.length ? `<p><strong>Ledger factions missing from source:</strong> ${escapeHtml(missingInSource.join(', '))}</p>` : ''}
        ${missingInLedger.length ? `<p><strong>Source factions missing from ledger:</strong> ${escapeHtml(missingInLedger.join(', '))}</p>` : ''}
      </div>` : '';

    ui.factions.innerHTML = `${warning}
      <div class="migration-table-wrap">
        <table class="migration-table">
          <thead><tr><th>Faction</th><th>Status</th><th>Words</th><th>Leaf fields</th><th>Subgroups</th><th>Rivals</th><th>Incidents</th><th>Links</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

    return {
      mismatches: missingInSource.length + missingInLedger.length,
      factionCount: actualIds.size,
      factionSubgroups
    };
  }

  function renderSources(ledger) {
    ui.sources.innerHTML = `<div class="migration-source-list">${list(ledger.sourceManifest).map(source => `
      <article class="migration-source" data-search="${escapeHtml([source.id, source.path, source.sha, ...list(source.contains)].join(' ').toLowerCase())}">
        <strong>${escapeHtml(source.id)}</strong>
        <span class="migration-code">${escapeHtml(source.path)}</span>
        <span>Snapshot SHA: <span class="migration-code">${escapeHtml(source.sha)}</span></span>
        <span>${escapeHtml(list(source.contains).join(' · '))}</span>
      </article>`).join('')}</div>`;
  }

  function bindSearch() {
    function apply() {
      const query = String(ui.search?.value || '').trim().toLowerCase();
      const searchable = [...document.querySelectorAll('[data-search]')];
      for (const node of searchable) {
        node.hidden = Boolean(query) && !String(node.dataset.search || '').includes(query);
      }
      for (const block of document.querySelectorAll('.migration-class-block')) {
        const classMatch = !query || String(block.dataset.classSearch || '').includes(query);
        const visibleRows = [...block.querySelectorAll('tbody tr')].some(row => !row.hidden);
        const visibleCards = [...block.querySelectorAll('.migration-card[data-search]')].some(card => !card.hidden);
        block.hidden = !(classMatch || visibleRows || visibleCards);
        if (query && !block.hidden) block.open = true;
      }
    }
    ui.search?.addEventListener('input', apply);
    ui.clear?.addEventListener('click', () => {
      ui.search.value = '';
      apply();
      ui.search.focus();
    });
  }

  async function initialize() {
    try {
      ui.status.textContent = 'Loading authoritative records and comparing them against the migration ledger…';
      const [ledgerBase, active, style, schema, rules, factionData, adversaryData, ...classFiles] = await Promise.all([
        fetchJson(LEDGER_URL),
        fetchJson(ACTIVE_URL),
        fetchJson(STYLE_URL),
        fetchJson(SCHEMA_URL),
        fetchJson(RULES_URL),
        fetchJson(FACTIONS_URL),
        fetchJson(ADVERSARIES_URL),
        ...Object.values(CLASS_SOURCES).map(fetchJson)
      ]);

      const ledger = applyActiveRevisionState(ledgerBase, active);
      const classData = {};
      Object.keys(CLASS_SOURCES).forEach((id, index) => { classData[id] = classFiles[index]; });
      const adversaries = adversaryData?.classes || {};

      renderPhases(ledger);
      renderStyleGuide(style, schema);
      renderSources(ledger);
      const classResult = classInventory(ledger, rules, classData, adversaries);
      const factionResult = factionInventory(ledger, factionData);
      const adversaryCount = Object.values(adversaries).reduce((sum, group) => sum + Object.keys(group || {}).length, 0);
      const mismatchCount = classResult.mismatches + factionResult.mismatches;

      renderMetrics({
        sourceFiles: list(ledger.sourceManifest).length,
        archetypes: classResult.archetypes,
        subgroups: classResult.subgroupCount,
        adversaries: adversaryCount,
        factions: factionResult.factionCount,
        factionSubgroups: factionResult.factionSubgroups,
        settingEntries: list(ledger.settingEntries).length,
        mismatches: mismatchCount
      });

      bindSearch();
      ui.status.textContent = mismatchCount === 0
        ? `${escapeHtml(active.currentPhase || ledger.currentPhase)}. Every ledgered class subgroup, attached internal adversary, and faction family resolves to its current authoritative source record.`
        : `Preservation inventory loaded with ${mismatchCount} ledger/source mismatch${mismatchCount === 1 ? '' : 'es'} requiring review.`;
    } catch (error) {
      console.error(error);
      ui.status.innerHTML = `<span class="migration-error">Migration control could not load one or more records: ${escapeHtml(error.message)}</span>`;
    }
  }

  initialize();
})();
