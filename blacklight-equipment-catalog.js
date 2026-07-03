(() => {
  'use strict';

  const SOURCES = [
    'data/blacklight-continuum/rules/equipment-foundation.json',
    'data/blacklight-continuum/rules/modern-historical-equipment.json',
    'data/blacklight-continuum/rules/supernatural-artifacts-relics.json',
    'data/blacklight-continuum/rules/future-scavenged-survival-equipment.json',
    'data/blacklight-continuum/rules/alien-technology-templates.json'
  ];

  const state = {
    records: [],
    filtered: [],
    activeId: '',
    search: '',
    group: 'all',
    classification: 'all'
  };

  const elements = {};

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function humanize(value) {
    return String(value || '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/^./, character => character.toUpperCase());
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    const source = await response.text();
    try {
      return JSON.parse(source);
    } catch (error) {
      throw new Error(`${url} contains invalid JSON: ${error.message}`);
    }
  }

  function classify(record, forced = '') {
    if (forced) return forced;
    const category = String(record.category || '').toLowerCase();
    if (/armor|shield|protective|defensive/.test(category)) return 'Protection';
    if (/weapon|firearm|explosive|projectile/.test(category)) return 'Weapon';
    if (/medical|survival|shelter|camp|mobility|sensor|tool|kit|consumable|container|drone|system|supply|communication|navigation|power|transport|support|recovery/.test(category)) return 'Tools and Survival';
    return 'Equipment';
  }

  function searchable(value) {
    if (Array.isArray(value)) return value.map(searchable).join(' ');
    if (value && typeof value === 'object') return Object.entries(value).map(([key, item]) => `${key} ${searchable(item)}`).join(' ');
    return String(value ?? '');
  }

  function createRecord(data, group, forcedClassification = '', sourceType = 'item') {
    const name = data.name || data.tag || humanize(data.id || 'Equipment Record');
    const id = `${sourceType}-${data.id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const classification = classify(data, forcedClassification);
    return {
      id,
      name,
      group,
      classification,
      sourceType,
      data,
      searchText: `${name} ${group} ${classification} ${searchable(data)}`.toLowerCase()
    };
  }

  function flattenFoundation(data) {
    const records = [createRecord({
      id: 'equipment-foundation-overview',
      name: data.name,
      designRule: data.designRule,
      coreRules: data.coreRules,
      loadScale: data.loadScale,
      relicRules: data.relicRules,
      alienTemplateRules: data.alienTemplateRules
    }, 'Equipment Rules', 'Rules', 'rule')];

    (data.conditionStates || []).forEach(item => records.push(createRecord(item, 'Condition States', 'Rules', 'condition')));
    (data.weaponTags || []).forEach(item => records.push(createRecord({ id: `weapon-${item.tag}`, name: item.tag, effect: item.effect }, 'Weapon Tags', 'Rules', 'weapon-tag')));
    (data.armorTags || []).forEach(item => records.push(createRecord({ id: `armor-${item.tag}`, name: item.tag, effect: item.effect }, 'Armor Tags', 'Rules', 'armor-tag')));
    return records;
  }

  function flattenCatalogs(data) {
    const records = [];
    (data.catalogs || []).forEach(catalog => {
      (catalog.items || []).forEach(item => records.push(createRecord(item, catalog.title, '', 'item')));
    });
    return records;
  }

  function flattenRelics(data) {
    return (data.relics || []).map(item => createRecord(item, 'Supernatural Artifacts and Relics', 'Relic', 'relic'));
  }

  function flattenTemplates(data) {
    return (data.templates || []).map(item => createRecord(item, 'Alien Technology Templates', 'Alien Technology', 'alien-template'));
  }

  function flattenSource(data) {
    if (data.conditionStates || data.weaponTags || data.armorTags) return flattenFoundation(data);
    if (data.relics) return flattenRelics(data);
    if (data.templates) return flattenTemplates(data);
    return flattenCatalogs(data);
  }

  function displayValue(value) {
    if (Array.isArray(value)) {
      return value.map(item => typeof item === 'object' ? displayValue(item) : String(item)).join(' · ');
    }
    if (value && typeof value === 'object') {
      return Object.entries(value).map(([key, item]) => `${humanize(key)}: ${displayValue(item)}`).join('\n');
    }
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value ?? '—');
  }

  function metaValues(record) {
    const data = record.data;
    return [
      record.classification,
      record.group,
      data.category,
      data.era,
      data.origin,
      data.originPattern,
      data.availability,
      data.load !== undefined ? `Load ${data.load}` : '',
      data.armorRating !== undefined ? `Armor ${data.armorRating}` : '',
      data.damageDice !== undefined ? `${data.damageDice} ${data.damageType || 'damage dice'}` : ''
    ].filter(Boolean);
  }

  function renderDetail(record) {
    if (!record) {
      elements.detail.innerHTML = '<div class="equipment-empty">No equipment record matches the current filters.</div>';
      return;
    }

    state.activeId = record.id;
    const omitted = new Set(['id', 'name']);
    const preferred = [
      'category', 'era', 'origin', 'originPattern', 'form', 'availability', 'load', 'condition',
      'attackPool', 'activation', 'pool', 'damageDice', 'damageType', 'armorRating', 'coverage', 'range',
      'tags', 'uses', 'power', 'mundaneFunction', 'effect', 'alternateMode', 'stacking',
      'wielderRequirement', 'skillRequirement', 'attunement', 'cost', 'requirement',
      'interface', 'translationRequirement', 'modification', 'benefit', 'instability',
      'limit', 'limitation', 'failure', 'reverseEngineering', 'notes', 'designRule',
      'coreRules', 'loadScale', 'relicRules', 'alienTemplateRules'
    ];
    const keys = [
      ...preferred.filter(key => key in record.data),
      ...Object.keys(record.data).filter(key => !omitted.has(key) && !preferred.includes(key))
    ];

    const fields = keys.map(key => {
      const value = displayValue(record.data[key]);
      const wide = value.length > 110 || value.includes('\n') || ['effect', 'benefit', 'failure', 'limitation', 'notes', 'designRule', 'coreRules', 'loadScale', 'relicRules', 'alienTemplateRules', 'reverseEngineering'].includes(key);
      return `<section class="equipment-field ${wide ? 'wide' : ''}"><span>${escapeHtml(humanize(key))}</span><p>${escapeHtml(value)}</p></section>`;
    }).join('');

    elements.detail.innerHTML = `
      <p class="eyebrow">${escapeHtml(record.group)}</p>
      <h2>${escapeHtml(record.name)}</h2>
      <div class="equipment-meta">${metaValues(record).map(value => `<span>${escapeHtml(value)}</span>`).join('')}</div>
      <div class="equipment-detail-grid">${fields}</div>`;

    elements.list.querySelectorAll('button').forEach(button => button.classList.toggle('active', button.dataset.recordId === record.id));
  }

  function recordSubtitle(record) {
    const data = record.data;
    const pieces = [data.category || record.classification];
    if (data.damageDice !== undefined) pieces.push(`${data.damageDice} ${data.damageType || 'damage'}`);
    if (data.armorRating !== undefined) pieces.push(`Armor ${data.armorRating}`);
    if (data.load !== undefined) pieces.push(`Load ${data.load}`);
    return pieces.filter(Boolean).join(' · ');
  }

  function applyFilters() {
    const query = state.search.trim().toLowerCase();
    state.filtered = state.records.filter(record => {
      if (state.group !== 'all' && record.group !== state.group) return false;
      if (state.classification !== 'all' && record.classification !== state.classification) return false;
      return !query || record.searchText.includes(query);
    });

    elements.list.innerHTML = '';
    if (!state.filtered.length) {
      elements.list.innerHTML = '<div class="equipment-empty">No records match the current search and filters.</div>';
      renderDetail(null);
      updateSummary();
      return;
    }

    state.filtered.forEach(record => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.recordId = record.id;
      button.innerHTML = `<strong>${escapeHtml(record.name)}</strong><small>${escapeHtml(record.group)}<br>${escapeHtml(recordSubtitle(record))}</small>`;
      button.addEventListener('click', () => renderDetail(record));
      elements.list.appendChild(button);
    });

    const active = state.filtered.find(record => record.id === state.activeId) || state.filtered[0];
    renderDetail(active);
    updateSummary();
  }

  function updateSummary() {
    const counts = state.records.reduce((result, record) => {
      result[record.classification] = (result[record.classification] || 0) + 1;
      return result;
    }, {});
    elements.summary.innerHTML = [
      `${state.records.length} loaded records`,
      `${state.filtered.length} visible`,
      ...Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)).map(([name, count]) => `${count} ${name}`)
    ].map(value => `<span>${escapeHtml(value)}</span>`).join('');
  }

  function populateFilters() {
    const groups = [...new Set(state.records.map(record => record.group))].sort();
    elements.group.innerHTML = '<option value="all">All catalogs</option>' + groups.map(group => `<option value="${escapeHtml(group)}">${escapeHtml(group)}</option>`).join('');
    const classifications = [...new Set(state.records.map(record => record.classification))].sort();
    elements.classification.innerHTML = '<option value="all">All record types</option>' + classifications.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
  }

  async function initialize() {
    elements.search = document.getElementById('equipment-search');
    elements.group = document.getElementById('equipment-group');
    elements.classification = document.getElementById('equipment-classification');
    elements.reset = document.getElementById('equipment-reset');
    elements.list = document.getElementById('equipment-list');
    elements.detail = document.getElementById('equipment-detail');
    elements.summary = document.getElementById('equipment-summary');
    elements.status = document.getElementById('equipment-status');

    try {
      const sources = await Promise.all(SOURCES.map(fetchJson));
      state.records = sources.flatMap(flattenSource).sort((left, right) => left.group.localeCompare(right.group) || left.name.localeCompare(right.name));
      state.filtered = [...state.records];
      populateFilters();

      elements.search.addEventListener('input', () => { state.search = elements.search.value; applyFilters(); });
      elements.group.addEventListener('change', () => { state.group = elements.group.value; applyFilters(); });
      elements.classification.addEventListener('change', () => { state.classification = elements.classification.value; applyFilters(); });
      elements.reset.addEventListener('click', () => {
        state.search = '';
        state.group = 'all';
        state.classification = 'all';
        elements.search.value = '';
        elements.group.value = 'all';
        elements.classification.value = 'all';
        applyFilters();
      });
      document.getElementById('equipment-print')?.addEventListener('click', () => window.print());

      elements.status.hidden = true;
      applyFilters();
    } catch (error) {
      elements.status.hidden = false;
      elements.status.textContent = `The equipment catalog could not be loaded: ${error.message}`;
      elements.list.innerHTML = '';
      elements.detail.innerHTML = '<div class="equipment-empty">Serve the project through GitHub Pages or a local web server and verify the equipment JSON files.</div>';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
