(() => {
  'use strict';

  const STORAGE_KEY = 'hb-ttrpg-tools-character-sheet-v1';
  const KAYSENDER_REGISTRY_URL = 'data/kaysender-tools-registry.json';
  const state = {
    sheetInitialized: false,
    registryPromise: null,
    registry: null,
    kaysenderFilter: 'all'
  };

  const skills = [
    ['Appraise', 'int'], ['Balance', 'dex'], ['Bluff', 'cha'], ['Climb', 'str'],
    ['Concentration', 'con'], ['Craft', 'int'], ['Decipher Script', 'int'], ['Diplomacy', 'cha'],
    ['Disable Device', 'int'], ['Disguise', 'cha'], ['Escape Artist', 'dex'], ['Forgery', 'int'],
    ['Gather Information', 'cha'], ['Handle Animal', 'cha'], ['Heal', 'wis'], ['Hide', 'dex'],
    ['Intimidate', 'cha'], ['Jump', 'str'], ['Knowledge', 'int'], ['Listen', 'wis'],
    ['Move Silently', 'dex'], ['Open Lock', 'dex'], ['Perform', 'cha'], ['Profession', 'wis'],
    ['Ride', 'dex'], ['Search', 'int'], ['Sense Motive', 'wis'], ['Sleight of Hand', 'dex'],
    ['Spellcraft', 'int'], ['Spot', 'wis'], ['Survival', 'wis'], ['Swim', 'str'],
    ['Tumble', 'dex'], ['Use Magic Device', 'cha'], ['Use Rope', 'dex']
  ];

  function sheetElements() {
    return {
      layoutButtons: [...document.querySelectorAll('.layout-button')],
      panelGrid: document.getElementById('panel-grid'),
      title: document.getElementById('sheet-title'),
      printTitle: document.getElementById('print-title'),
      sheet: document.getElementById('character-sheet'),
      skillTable: document.getElementById('skill-table')
    };
  }

  function signed(value) {
    if (value === '' || value === null || Number.isNaN(Number(value))) return '';
    const number = Number(value);
    return number >= 0 ? `+${number}` : `${number}`;
  }

  function abilityMod(score) {
    const number = Number(score);
    if (!Number.isFinite(number) || score === '') return '';
    return Math.floor((number - 10) / 2);
  }

  function numericValue(sheet, name) {
    const field = sheet?.elements[name];
    if (!field || field.value === '') return 0;
    const value = Number(String(field.value).replace('+', ''));
    return Number.isFinite(value) ? value : 0;
  }

  function buildSkills() {
    const { skillTable } = sheetElements();
    if (!skillTable || skillTable.dataset.built === 'true') return;
    skillTable.dataset.built = 'true';
    skillTable.innerHTML = '<div class="table-row table-head"><span>Skill</span><span>Ranks</span><span>Ability</span><span>Misc</span><span>Total</span></div>';
    for (const [label, ability] of skills) {
      const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '');
      const row = document.createElement('div');
      row.className = 'table-row skill-row';
      row.dataset.ability = ability;
      row.innerHTML = `<span class="skill-name">${label} <small>(${ability.toUpperCase()})</small></span><input name="skill_${key}_ranks" type="number" step="0.5"><input name="skill_${key}_ability" readonly><input name="skill_${key}_misc" type="number"><input name="skill_${key}_total" readonly>`;
      skillTable.appendChild(row);
    }
  }

  function calculateAll() {
    const { sheet } = sheetElements();
    if (!sheet) return;
    document.querySelectorAll('.ability-score').forEach(input => {
      const target = sheet.elements[input.dataset.modTarget];
      const mod = abilityMod(input.value);
      if (target) target.value = mod === '' ? '' : signed(mod);
    });
    for (const save of ['fort', 'ref', 'will']) {
      const abilityField = sheet.elements[`${save}Ability`];
      const fallback = save === 'fort' ? numericValue(sheet, 'conMod') : save === 'ref' ? numericValue(sheet, 'dexMod') : numericValue(sheet, 'wisMod');
      const ability = abilityField?.value !== '' ? Number(abilityField.value) : fallback;
      const total = numericValue(sheet, `${save}Base`) + (Number.isFinite(ability) ? ability : 0) + numericValue(sheet, `${save}Magic`) + numericValue(sheet, `${save}Misc`);
      if (sheet.elements[`${save}Total`]) sheet.elements[`${save}Total`].value = signed(total);
    }
    document.querySelectorAll('.skill-row').forEach(row => {
      const inputs = row.querySelectorAll('input');
      const abilityNumber = Number(String(sheet.elements[`${row.dataset.ability}Mod`]?.value || '0').replace('+', '')) || 0;
      const ranks = Number(inputs[0].value || 0);
      const misc = Number(inputs[2].value || 0);
      inputs[1].value = signed(abilityNumber);
      inputs[3].value = signed(ranks + abilityNumber + misc);
    });
  }

  function activeLayout() {
    return document.querySelector('.layout-button.active')?.dataset.layout || '4';
  }

  function serializeSheet() {
    const { title, sheet } = sheetElements();
    const data = { title: title?.value || '', layout: activeLayout() };
    if (!sheet) return data;
    for (const field of sheet.elements) if (field.name) data[field.name] = field.value;
    return data;
  }

  function saveLocal() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeSheet())); } catch (_) { /* optional persistence */ }
  }

  function setLayout(layout) {
    const { panelGrid, layoutButtons } = sheetElements();
    if (!panelGrid) return;
    panelGrid.classList.remove('panels-2', 'panels-3', 'panels-4');
    panelGrid.classList.add(`panels-${layout}`);
    layoutButtons.forEach(button => button.classList.toggle('active', button.dataset.layout === String(layout)));
    saveLocal();
  }

  function loadSheet(data) {
    const { title, printTitle, sheet } = sheetElements();
    if (!data || typeof data !== 'object' || !sheet) return;
    if (data.title && title && printTitle) {
      title.value = data.title;
      printTitle.textContent = data.title;
    }
    for (const field of sheet.elements) if (field.name && field.name in data) field.value = data[field.name];
    if (data.layout) setLayout(data.layout);
    calculateAll();
  }

  function exportJson() {
    const data = serializeSheet();
    const name = data.characterName ? data.characterName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') : 'character';
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name || 'character'}-sheet.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function importJson(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        loadSheet(JSON.parse(reader.result));
        saveLocal();
      } catch (_) {
        alert('The selected file could not be read as character sheet JSON.');
      }
    };
    reader.readAsText(file);
  }

  function clearSheet() {
    const { sheet } = sheetElements();
    if (!sheet || !confirm('Clear the current sheet and local autosave?')) return;
    for (const field of sheet.elements) if (field.name && !field.readOnly) field.value = '';
    localStorage.removeItem(STORAGE_KEY);
    calculateAll();
  }

  function initializeSheet() {
    if (state.sheetInitialized) return;
    state.sheetInitialized = true;
    buildSkills();
    const { layoutButtons, title, printTitle, sheet } = sheetElements();
    layoutButtons.forEach(button => button.addEventListener('click', () => setLayout(button.dataset.layout)));
    title?.addEventListener('input', () => {
      if (printTitle) printTitle.textContent = title.value || 'AD and D 3.5 - Hypertext D20 compatible character sheet';
      saveLocal();
    });
    sheet?.addEventListener('input', () => { calculateAll(); saveLocal(); });
    document.getElementById('print-sheet')?.addEventListener('click', () => { calculateAll(); saveLocal(); window.print(); });
    document.getElementById('export-json')?.addEventListener('click', exportJson);
    document.getElementById('import-json')?.addEventListener('change', event => importJson(event.target.files[0]));
    document.getElementById('reset-sheet')?.addEventListener('click', clearSheet);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { loadSheet(JSON.parse(stored)); } catch (_) { calculateAll(); }
    } else calculateAll();
  }

  function createBadge(text, className = '') {
    const badge = document.createElement('span');
    badge.className = `badge ${className}`.trim();
    badge.textContent = text;
    return badge;
  }

  function createModuleCard(module) {
    const article = document.createElement('article');
    article.className = 'module-card';
    article.dataset.moduleId = module.id;
    article.dataset.section = module.section;
    const meta = document.createElement('div');
    meta.className = 'module-meta';
    meta.append(createBadge(module.section, `section-${module.section}`), createBadge(module.status || 'planned', `status-${module.status || 'planned'}`), createBadge(`priority ${module.priority ?? '-'}`));
    const title = document.createElement('h3');
    title.textContent = module.title;
    const description = document.createElement('p');
    description.textContent = module.description;
    article.append(meta, title, description);
    return article;
  }

  function setEmpty(container, message) {
    if (container) container.innerHTML = `<div class="module-empty">${message}</div>`;
  }

  function renderRegistrySection(section, modules) {
    const target = document.querySelector(`[data-registry-section="${section}"]`);
    if (!target) return;
    const visible = modules.filter(module => section === 'overview' || module.section === section).sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
    target.innerHTML = '';
    if (!visible.length) return setEmpty(target, `No ${section} modules are currently registered.`);
    visible.forEach(module => target.appendChild(createModuleCard(module)));
  }

  function renderKaysenderOverview() {
    if (!state.registry) return;
    const target = document.getElementById('kaysender-overview-grid');
    if (!target) return;
    const query = (document.getElementById('kaysender-search')?.value || '').trim().toLowerCase();
    const modules = (state.registry.modules || []).filter(module => state.kaysenderFilter === 'all' || module.section === state.kaysenderFilter).filter(module => !query || [module.title, module.description, module.section, module.status, ...(module.dataFamilies || [])].join(' ').toLowerCase().includes(query)).sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
    target.innerHTML = '';
    if (!modules.length) return setEmpty(target, 'No Kaysender modules match the current filter.');
    modules.forEach(module => target.appendChild(createModuleCard(module)));
  }

  async function loadKaysenderRegistry() {
    if (state.registryPromise) return state.registryPromise;
    state.registryPromise = (async () => {
      const containers = [...document.querySelectorAll('[data-registry-section]')];
      try {
        const response = await fetch(KAYSENDER_REGISTRY_URL, { cache: 'force-cache' });
        if (!response.ok) throw new Error(`Registry request failed: ${response.status}`);
        state.registry = await response.json();
        const modules = state.registry.modules || [];
        renderRegistrySection('tools', modules);
        renderRegistrySection('utilities', modules);
        renderRegistrySection('generators', modules);
        renderKaysenderOverview();
        const status = document.getElementById('kaysender-status');
        if (status) status.textContent = `${state.registry.setting || 'Kaysender'} registry loaded: ${modules.length} modules · ${state.registry.compatibilityTarget || 'open d20 target'}.`;
        document.getElementById('kaysender-search')?.addEventListener('input', renderKaysenderOverview);
        document.querySelectorAll('.registry-filter').forEach(button => button.addEventListener('click', () => {
          state.kaysenderFilter = button.dataset.kaysenderFilter || 'all';
          document.querySelectorAll('.registry-filter').forEach(filter => filter.classList.toggle('active', filter === button));
          renderKaysenderOverview();
        }));
        return state.registry;
      } catch (error) {
        containers.forEach(container => setEmpty(container, 'Kaysender registry could not be loaded.'));
        const status = document.getElementById('kaysender-status');
        if (status) status.textContent = `Kaysender registry failed to load: ${error.message}`;
        throw error;
      }
    })();
    return state.registryPromise;
  }

  function prepareView(viewId) {
    if (viewId === 'utilities') initializeSheet();
    if (viewId === 'kaysender' || viewId === 'generators') return loadKaysenderRegistry();
    return Promise.resolve();
  }

  document.querySelectorAll('[data-registry-section]').forEach(container => {
    if (!container.children.length) setEmpty(container, 'This registry loads only when its workspace is opened.');
  });

  window.HBTTRPGApp = Object.freeze({ initializeSheet, loadKaysenderRegistry, prepareView });
})();
