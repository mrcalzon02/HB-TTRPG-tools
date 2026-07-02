(() => {
  'use strict';

  const DATA_URL = 'data/blacklight-continuum/rules/basic-character-options.json';
  const STORAGE_KEY = 'hb-ttrpg-tools-blacklight-basic-character-v1';

  const state = {
    rules: null,
    archetype: null,
    selectedPowers: new Set(),
    loading: false
  };

  const form = document.getElementById('blacklight-character-form');
  const status = document.getElementById('blacklight-load-status');
  const archetypeSelect = document.getElementById('blacklight-archetype');
  const archetypeRating = document.getElementById('blacklight-archetype-rating');

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function slug(value) {
    return String(value ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function number(name, fallback = 0) {
    const field = form?.elements[name];
    const value = Number(field?.value);
    return Number.isFinite(value) ? value : fallback;
  }

  function setValue(id, value) {
    const field = document.getElementById(id);
    if (field) field.value = value;
  }

  function setText(id, value) {
    const target = document.getElementById(id);
    if (target) target.textContent = value;
  }

  function getArchetype(id = archetypeSelect?.value) {
    return state.rules?.archetypes?.find(item => item.id === id) || null;
  }

  function buildSkills() {
    const target = document.getElementById('blacklight-skills');
    if (!target || !state.rules) return;
    target.innerHTML = '';

    Object.entries(state.rules.skills || {}).forEach(([group, skills]) => {
      const section = document.createElement('section');
      section.className = 'blacklight-skill-group';
      section.innerHTML = `<h3>${escapeHtml(group)}</h3>`;
      skills.forEach(skill => {
        const name = `skill_${slug(skill).replace(/-/g, '_')}`;
        const label = document.createElement('label');
        label.innerHTML = `${escapeHtml(skill)}<input name="${name}" type="number" min="0" max="5" value="0">`;
        section.appendChild(label);
      });
      target.appendChild(section);
    });
  }

  function populateArchetypes() {
    if (!archetypeSelect || !state.rules) return;
    archetypeSelect.innerHTML = '<option value="">Choose an archetype</option>';
    state.rules.archetypes.forEach(archetype => {
      const option = document.createElement('option');
      option.value = archetype.id;
      option.textContent = archetype.name;
      archetypeSelect.appendChild(option);
    });
  }

  function renderArchetypeSummary() {
    const target = document.getElementById('blacklight-archetype-summary');
    if (!target) return;
    const archetype = state.archetype;
    if (!archetype) {
      target.innerHTML = '<p>Select an archetype to load its resource, pressure track, weakness, innate abilities, and power families.</p>';
      return;
    }

    target.innerHTML = `
      <h3>${escapeHtml(archetype.name)}</h3>
      <p>${escapeHtml(archetype.theme)}</p>
      ${(archetype.lore || []).map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}
      <div class="blacklight-weakness-box"><strong>${escapeHtml(archetype.weakness)}:</strong> ${escapeHtml(archetype.weaknessText)}</div>
      <h4>Innate Abilities</h4>
      <ul>${(archetype.innateAbilities || []).map(ability => `<li><strong>${escapeHtml(ability.name)}:</strong> ${escapeHtml(ability.effect)}</li>`).join('')}</ul>`;
  }

  function powerId(family, ability) {
    return `${state.archetype?.id || 'none'}::${slug(family.name)}::${ability.rank}::${slug(ability.name)}`;
  }

  function renderPowers() {
    const target = document.getElementById('blacklight-power-list');
    if (!target) return;
    const archetype = state.archetype;
    if (!archetype) {
      target.innerHTML = '<p class="helper-note">Select an archetype to display power families.</p>';
      return;
    }

    const rating = Math.max(1, Math.min(5, number('archetypeRating', 1)));
    target.innerHTML = '';

    (archetype.powerFamilies || []).forEach(family => {
      const section = document.createElement('section');
      section.className = 'blacklight-power-family';
      section.innerHTML = `<h3>${escapeHtml(family.name)}</h3>`;

      (family.abilities || []).forEach(ability => {
        const id = powerId(family, ability);
        const disabled = Number(ability.rank) > rating;
        if (disabled) state.selectedPowers.delete(id);
        const row = document.createElement('label');
        row.className = 'blacklight-power-row';
        row.innerHTML = `
          <input type="checkbox" data-power-id="${escapeHtml(id)}" ${state.selectedPowers.has(id) ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
          <span><span class="blacklight-power-rank">Rank ${escapeHtml(ability.rank)}</span><br><span class="blacklight-power-name">${escapeHtml(ability.name)}</span></span>
          <span class="blacklight-power-effect">${escapeHtml(ability.effect)}${disabled ? ' Increase Archetype Rating to select this power.' : ''}</span>`;
        const checkbox = row.querySelector('input');
        checkbox?.addEventListener('change', () => {
          if (checkbox.checked) state.selectedPowers.add(id);
          else state.selectedPowers.delete(id);
          saveLocal();
        });
        section.appendChild(row);
      });

      target.appendChild(section);
    });
  }

  function applyArchetype(id, options = {}) {
    const { preservePowers = false } = options;
    state.archetype = getArchetype(id);
    if (!preservePowers) state.selectedPowers.clear();

    if (state.archetype) {
      setText('blacklight-resource-name', state.archetype.resourceName);
      setText('blacklight-pressure-name', state.archetype.pressureName);
      setValue('blacklight-key-attribute', state.archetype.keyAttribute);
    } else {
      setText('blacklight-resource-name', 'Resource');
      setText('blacklight-pressure-name', 'Pressure');
      setValue('blacklight-key-attribute', '');
    }

    renderArchetypeSummary();
    calculateAll();
    renderPowers();
  }

  function calculateAll() {
    if (!form) return;

    const force = number('force', 1);
    const finesse = number('finesse', 1);
    const resilience = number('resilience', 1);
    const composure = number('composure', 1);
    const awareness = number('awareness', 1);
    const resolve = number('resolve', 1);
    const armor = number('armorRating', 0);
    const rating = Math.max(1, Math.min(5, number('archetypeRating', 1)));

    setValue('blacklight-vitality-max', resilience + 5);
    setValue('blacklight-guard', finesse + awareness);
    setValue('blacklight-initiative', finesse + composure);
    setValue('blacklight-cohesion-max', resolve + composure + 3);
    setValue('blacklight-exposure-limit', resolve + resilience);
    setValue('blacklight-carry', force + resilience);
    setValue('blacklight-identity-defense', resolve + composure);
    setValue('blacklight-protection', resilience + armor);
    setValue('blacklight-pressure-limit', composure + 5);

    if (state.archetype) {
      const key = state.archetype.keyAttribute.toLowerCase();
      const keyValue = number(key, 1);
      const resourceMax = Number(state.archetype.resourceBase || 0) + rating + keyValue;
      setValue('blacklight-resource-max', resourceMax);
      setValue('blacklight-power-dice', rating + keyValue);
      setValue('blacklight-key-attribute', state.archetype.keyAttribute);
      setText('blacklight-resource-formula', `${state.archetype.resourceBase} base + Archetype ${rating} + ${state.archetype.keyAttribute} ${keyValue}`);
    } else {
      setValue('blacklight-resource-max', '');
      setValue('blacklight-power-dice', '');
      setText('blacklight-resource-formula', 'Select an archetype.');
    }

    const characterName = form.elements.characterName?.value?.trim();
    setText('blacklight-sheet-character-title', characterName || 'Basic Operative Record');
  }

  function serialize() {
    const data = {
      schema: 'blacklight-continuum-basic-character',
      schemaVersion: '0.1.0',
      savedAt: new Date().toISOString(),
      selectedPowers: Array.from(state.selectedPowers),
      fields: {}
    };

    for (const field of form?.elements || []) {
      if (!field.name || field.type === 'file' || field.type === 'button' || field.readOnly) continue;
      if (field.type === 'checkbox') data.fields[field.name] = field.checked;
      else data.fields[field.name] = field.value;
    }
    return data;
  }

  function saveLocal() {
    if (state.loading) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize()));
    } catch (_) {
      // Browser persistence is helpful but not required for the sheet to function.
    }
  }

  function loadData(data) {
    if (!data || typeof data !== 'object') throw new Error('Character JSON is not a valid object.');
    const fields = data.fields && typeof data.fields === 'object' ? data.fields : data;

    state.loading = true;
    try {
      for (const [name, value] of Object.entries(fields)) {
        const field = form?.elements[name];
        if (!field || field.readOnly) continue;
        if (field.type === 'checkbox') field.checked = Boolean(value);
        else field.value = value ?? '';
      }

      state.selectedPowers = new Set(Array.isArray(data.selectedPowers) ? data.selectedPowers : []);
      applyArchetype(archetypeSelect?.value, { preservePowers: true });
      calculateAll();
    } finally {
      state.loading = false;
    }
  }

  function exportJson() {
    const data = serialize();
    const characterName = form?.elements.characterName?.value?.trim() || 'blacklight-operative';
    const filename = `${slug(characterName) || 'blacklight-operative'}-basic.json`;
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
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
        loadData(JSON.parse(String(reader.result)));
        saveLocal();
        status.textContent = 'Character imported and saved locally.';
      } catch (error) {
        status.textContent = `Import failed: ${error.message}`;
      }
    };
    reader.onerror = () => { status.textContent = 'Import failed: the selected file could not be read.'; };
    reader.readAsText(file);
  }

  function clearCharacter() {
    if (!confirm('Clear the Blacklight character sheet and its local autosave?')) return;
    state.loading = true;
    try {
      form.reset();
      form.querySelectorAll('.blacklight-attribute').forEach(field => { field.value = 2; });
      form.querySelectorAll('#blacklight-skills input').forEach(field => { field.value = 0; });
      state.selectedPowers.clear();
      archetypeRating.value = 1;
      applyArchetype('', { preservePowers: false });
      localStorage.removeItem(STORAGE_KEY);
      calculateAll();
      status.textContent = 'Character cleared.';
    } finally {
      state.loading = false;
    }
  }

  async function initialize() {
    if (!form) return;
    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Rules request failed with status ${response.status}.`);
      state.rules = await response.json();
      buildSkills();
      populateArchetypes();

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          loadData(JSON.parse(stored));
          status.textContent = 'Archetypes loaded. Local character restored.';
        } catch (_) {
          applyArchetype('');
          status.textContent = 'Archetypes loaded. The prior local save could not be restored.';
        }
      } else {
        applyArchetype('');
        calculateAll();
        status.textContent = `${state.rules.archetypes.length} archetypes and their power families loaded.`;
      }

      form.addEventListener('input', event => {
        if (event.target === archetypeRating || event.target.classList.contains('blacklight-attribute') || event.target.name === 'armorRating' || event.target.name === 'characterName') {
          calculateAll();
          if (event.target === archetypeRating) renderPowers();
        }
        saveLocal();
      });

      form.addEventListener('change', event => {
        if (event.target === archetypeSelect) applyArchetype(archetypeSelect.value);
        saveLocal();
      });

      document.getElementById('blacklight-print')?.addEventListener('click', () => {
        calculateAll();
        saveLocal();
        window.print();
      });
      document.getElementById('blacklight-export')?.addEventListener('click', exportJson);
      document.getElementById('blacklight-import')?.addEventListener('change', event => importJson(event.target.files?.[0]));
      document.getElementById('blacklight-reset')?.addEventListener('click', clearCharacter);
    } catch (error) {
      status.textContent = `Character options could not be loaded: ${error.message}`;
    }
  }

  void initialize();
})();