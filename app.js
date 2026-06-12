const views = document.querySelectorAll('.view');
const navButtons = document.querySelectorAll('[data-view]');
const layoutButtons = document.querySelectorAll('.layout-button');
const panelGrid = document.getElementById('panel-grid');
const sheetTitleInput = document.getElementById('sheet-title');
const printTitle = document.getElementById('print-title');
const sheet = document.getElementById('character-sheet');
const skillTable = document.getElementById('skill-table');
const STORAGE_KEY = 'hb-ttrpg-tools-character-sheet-v1';
const KAYSENDER_REGISTRY_URL = 'data/kaysender-tools-registry.json';
let kaysenderRegistry = null;
let kaysenderFilter = 'all';

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

function switchView(viewId) {
  views.forEach(view => view.classList.toggle('active', view.id === viewId));
  document.querySelectorAll('.nav-button').forEach(button => {
    button.classList.toggle('active', button.dataset.view === viewId);
  });
}

function buildSkills() {
  if (!skillTable) return;
  skillTable.innerHTML = '';
  const header = document.createElement('div');
  header.className = 'table-row table-head';
  header.innerHTML = '<span>Skill</span><span>Ranks</span><span>Ability</span><span>Misc</span><span>Total</span>';
  skillTable.appendChild(header);

  skills.forEach(([label, ability]) => {
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const row = document.createElement('div');
    row.className = 'table-row skill-row';
    row.dataset.ability = ability;
    row.innerHTML = `
      <span class="skill-name">${label} <small>(${ability.toUpperCase()})</small></span>
      <input name="skill_${key}_ranks" type="number" step="0.5" />
      <input name="skill_${key}_ability" readonly />
      <input name="skill_${key}_misc" type="number" />
      <input name="skill_${key}_total" readonly />
    `;
    skillTable.appendChild(row);
  });
}

function numericValue(name) {
  const field = sheet?.elements[name];
  if (!field || field.value === '') return 0;
  const value = Number(field.value);
  return Number.isFinite(value) ? value : 0;
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

function calculateAbilities() {
  if (!sheet) return;
  document.querySelectorAll('.ability-score').forEach(input => {
    const target = sheet.elements[input.dataset.modTarget];
    if (!target) return;
    const mod = abilityMod(input.value);
    target.value = mod === '' ? '' : signed(mod);
  });

  const saveAbilityMap = {
    fortAbility: 'conMod',
    refAbility: 'dexMod',
    willAbility: 'wisMod'
  };

  Object.entries(saveAbilityMap).forEach(([saveField, modField]) => {
    const saveInput = sheet.elements[saveField];
    const modInput = sheet.elements[modField];
    if (saveInput && modInput && saveInput.value === '') saveInput.placeholder = modInput.value || '0';
  });
}

function calculateSaves() {
  if (!sheet) return;
  ['fort', 'ref', 'will'].forEach(save => {
    const abilityField = sheet.elements[`${save}Ability`];
    const defaultAbility = save === 'fort' ? numericValue('conMod') : save === 'ref' ? numericValue('dexMod') : numericValue('wisMod');
    const ability = abilityField && abilityField.value !== '' ? Number(abilityField.value) : defaultAbility;
    const total = numericValue(`${save}Base`) + (Number.isFinite(ability) ? ability : 0) + numericValue(`${save}Magic`) + numericValue(`${save}Misc`);
    const totalField = sheet.elements[`${save}Total`];
    if (totalField) totalField.value = signed(total);
  });
}

function calculateSkills() {
  if (!sheet) return;
  document.querySelectorAll('.skill-row').forEach(row => {
    const ability = row.dataset.ability;
    const inputs = row.querySelectorAll('input');
    const ranks = Number(inputs[0].value || 0);
    const abilityNumber = Number((sheet.elements[`${ability}Mod`]?.value || '0').replace('+', '')) || 0;
    const misc = Number(inputs[2].value || 0);
    inputs[1].value = signed(abilityNumber);
    inputs[3].value = signed(ranks + abilityNumber + misc);
  });
}

function calculateAll() {
  calculateAbilities();
  calculateSaves();
  calculateSkills();
}

function serializeSheet() {
  const data = { title: sheetTitleInput?.value || '', layout: activeLayout() };
  if (!sheet) return data;
  Array.from(sheet.elements).forEach(field => {
    if (!field.name) return;
    data[field.name] = field.value;
  });
  return data;
}

function loadSheet(data) {
  if (!data || typeof data !== 'object' || !sheet) return;
  if (data.title && sheetTitleInput && printTitle) {
    sheetTitleInput.value = data.title;
    printTitle.textContent = data.title;
  }
  Array.from(sheet.elements).forEach(field => {
    if (!field.name || !(field.name in data)) return;
    field.value = data[field.name];
  });
  if (data.layout) setLayout(data.layout);
  calculateAll();
}

function saveLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeSheet()));
}

function activeLayout() {
  const active = document.querySelector('.layout-button.active');
  return active ? active.dataset.layout : '4';
}

function setLayout(layout) {
  if (!panelGrid) return;
  panelGrid.classList.remove('panels-2', 'panels-3', 'panels-4');
  panelGrid.classList.add(`panels-${layout}`);
  layoutButtons.forEach(button => button.classList.toggle('active', button.dataset.layout === String(layout)));
  saveLocal();
}

function exportJson() {
  const data = serializeSheet();
  const name = data.characterName ? data.characterName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') : 'character';
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
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
      const data = JSON.parse(reader.result);
      loadSheet(data);
      saveLocal();
    } catch (error) {
      alert('The selected file could not be read as character sheet JSON.');
    }
  };
  reader.readAsText(file);
}

function clearSheet() {
  if (!sheet) return;
  const confirmed = confirm('Clear the current sheet and local autosave?');
  if (!confirmed) return;
  Array.from(sheet.elements).forEach(field => {
    if (field.name && !field.readOnly) field.value = '';
  });
  localStorage.removeItem(STORAGE_KEY);
  calculateAll();
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
  meta.append(
    createBadge(module.section, `section-${module.section}`),
    createBadge(module.status || 'planned', `status-${module.status || 'planned'}`),
    createBadge(`priority ${module.priority ?? '-'}`)
  );

  const title = document.createElement('h3');
  title.textContent = module.title;

  const description = document.createElement('p');
  description.textContent = module.description;

  const familyLabel = document.createElement('h4');
  familyLabel.textContent = 'Data families';

  const chipList = document.createElement('div');
  chipList.className = 'chip-list';
  (module.dataFamilies || []).forEach(family => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = family;
    chipList.appendChild(chip);
  });

  article.append(meta, title, description, familyLabel, chipList);
  return article;
}

function setEmptyRegistryMessage(container, message) {
  if (!container) return;
  container.innerHTML = '';
  const empty = document.createElement('div');
  empty.className = 'module-empty';
  empty.textContent = message;
  container.appendChild(empty);
}

function renderRegistrySection(section, modules) {
  const target = document.querySelector(`[data-registry-section="${section}"]`);
  if (!target) return;
  target.innerHTML = '';

  const sectionModules = modules
    .filter(module => section === 'overview' || module.section === section)
    .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));

  if (!sectionModules.length) {
    setEmptyRegistryMessage(target, `No ${section} modules are currently registered.`);
    return;
  }

  sectionModules.forEach(module => target.appendChild(createModuleCard(module)));
}

function renderKaysenderOverview() {
  if (!kaysenderRegistry) return;
  const target = document.getElementById('kaysender-overview-grid');
  if (!target) return;

  const search = (document.getElementById('kaysender-search')?.value || '').trim().toLowerCase();
  const modules = (kaysenderRegistry.modules || [])
    .filter(module => kaysenderFilter === 'all' || module.section === kaysenderFilter)
    .filter(module => {
      if (!search) return true;
      const haystack = [module.title, module.description, module.section, module.status, ...(module.dataFamilies || [])]
        .join(' ')
        .toLowerCase();
      return haystack.includes(search);
    })
    .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));

  target.innerHTML = '';
  if (!modules.length) {
    setEmptyRegistryMessage(target, 'No Kaysender modules match the current filter.');
    return;
  }

  modules.forEach(module => target.appendChild(createModuleCard(module)));
}

function renderKaysenderRegistry(registry) {
  kaysenderRegistry = registry;
  const modules = registry.modules || [];
  renderRegistrySection('tools', modules);
  renderRegistrySection('utilities', modules);
  renderRegistrySection('generators', modules);
  renderKaysenderOverview();

  const status = document.getElementById('kaysender-status');
  if (status) {
    status.textContent = `${registry.setting || 'Kaysender'} registry loaded: ${modules.length} modules · ${registry.compatibilityTarget || 'open d20 target'}.`;
  }
}

async function loadKaysenderRegistry() {
  const containers = document.querySelectorAll('[data-registry-section]');
  if (!containers.length) return;

  try {
    const response = await fetch(KAYSENDER_REGISTRY_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Registry request failed: ${response.status}`);
    const registry = await response.json();
    renderKaysenderRegistry(registry);
  } catch (error) {
    containers.forEach(container => setEmptyRegistryMessage(container, 'Kaysender registry could not be loaded. On GitHub Pages this should resolve automatically; local file opening may block JSON fetches.'));
    const status = document.getElementById('kaysender-status');
    if (status) status.textContent = 'Kaysender registry failed to load. Use a local web server or GitHub Pages to test JSON-driven modules.';
  }
}

navButtons.forEach(button => {
  button.addEventListener('click', () => switchView(button.dataset.view));
});

layoutButtons.forEach(button => {
  button.addEventListener('click', () => setLayout(button.dataset.layout));
});

sheetTitleInput?.addEventListener('input', () => {
  if (printTitle) printTitle.textContent = sheetTitleInput.value || 'D&D 3.5-Compatible Character Sheet';
  saveLocal();
});

sheet?.addEventListener('input', () => {
  calculateAll();
  saveLocal();
});

document.getElementById('print-sheet')?.addEventListener('click', () => {
  calculateAll();
  saveLocal();
  window.print();
});

document.getElementById('export-json')?.addEventListener('click', exportJson);
document.getElementById('import-json')?.addEventListener('change', event => importJson(event.target.files[0]));
document.getElementById('reset-sheet')?.addEventListener('click', clearSheet);

document.getElementById('kaysender-search')?.addEventListener('input', renderKaysenderOverview);
document.querySelectorAll('.registry-filter').forEach(button => {
  button.addEventListener('click', () => {
    kaysenderFilter = button.dataset.kaysenderFilter || 'all';
    document.querySelectorAll('.registry-filter').forEach(filter => filter.classList.toggle('active', filter === button));
    renderKaysenderOverview();
  });
});

buildSkills();
const existing = localStorage.getItem(STORAGE_KEY);
if (existing) {
  try { loadSheet(JSON.parse(existing)); } catch (_) { calculateAll(); }
} else {
  calculateAll();
}
loadKaysenderRegistry();
