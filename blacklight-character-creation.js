(() => {
  'use strict';

  const URLS = {
    guide: 'data/blacklight-continuum/wiki/character-creation-guide.json',
    rules: 'data/blacklight-continuum/rules/basic-character-options.json',
    creation: 'data/blacklight-continuum/rules/character-creation-foundation.json',
    human: 'data/blacklight-continuum/rules/human-vigil-practices.json',
    vampire: 'data/blacklight-continuum/rules/vampire-remainder-bloodlines.json',
    shapechanger: 'data/blacklight-continuum/rules/shapechanger-remainder-forms.json',
    eldritch: 'data/blacklight-continuum/rules/eldritch-binding-sources.json',
    harmonic: 'data/blacklight-continuum/rules/harmonic-compact-remainders.json',
    technomancer: 'data/blacklight-continuum/rules/technomancer-awakening-practices.json'
  };

  const SHEET_STORAGE_KEY = 'hb-ttrpg-tools-blacklight-basic-character-v1';
  const DRAFT_STORAGE_KEY = 'hb-ttrpg-tools-blacklight-induction-v1';
  const ATTRIBUTE_NAMES = ['force', 'finesse', 'resilience', 'presence', 'guile', 'composure', 'reason', 'awareness', 'resolve'];
  const REQUIRED_BOND_FIELDS = ['conviction', 'touchstone', 'groupBond', 'professionalObligation', 'personalBoundary', 'debtPromise', 'charlesSavedMe', 'charlesNeverAnswered'];

  const state = {
    entries: [],
    rules: null,
    creation: null,
    variants: {},
    activeId: '',
    draft: null
  };

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

  function skillFieldName(skill) {
    return `skill_${slug(skill).replace(/-/g, '_')}`;
  }

  function defaultDraft() {
    const fields = {
      campaign: 'No Return Signal',
      archetypeRating: '1',
      advancement: '0',
      armorRating: '0',
      exposureCurrent: '0',
      pressureCurrent: '0'
    };
    ATTRIBUTE_NAMES.forEach(name => { fields[name] = '2'; });
    return {
      schemaVersion: '1.0.0',
      activeId: 'induction-room',
      fields,
      induction: {
        joinReason: '',
        stayReason: '',
        frameExpectation: '',
        frameAssumption: '',
        archetypeDifference: '',
        archetypeCost: '',
        bestCapabilityUnavailable: '',
        trustedRestraint: '',
        helpingMistake: '',
        enemyExploit: '',
        relianceWarning: '',
        extraNotes: ''
      },
      signatureSkill: '',
      specializations: [
        { skill: '', name: '' },
        { skill: '', name: '' }
      ],
      selectedPowers: [],
      selectedExternalAbilities: [],
      openingOverrideAcknowledged: false,
      finalConfirmed: false
    };
  }

  function mergeDraft(saved) {
    const base = defaultDraft();
    if (!saved || typeof saved !== 'object') return base;
    return {
      ...base,
      ...saved,
      fields: { ...base.fields, ...(saved.fields || {}) },
      induction: { ...base.induction, ...(saved.induction || {}) },
      specializations: Array.isArray(saved.specializations) && saved.specializations.length === 2
        ? saved.specializations.map(item => ({ skill: item?.skill || '', name: item?.name || '' }))
        : base.specializations,
      selectedPowers: Array.isArray(saved.selectedPowers) ? saved.selectedPowers : [],
      selectedExternalAbilities: Array.isArray(saved.selectedExternalAbilities) ? saved.selectedExternalAbilities : []
    };
  }

  function readStoredJson(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null');
    } catch (_) {
      return null;
    }
  }

  function hydrateDraft() {
    const savedDraft = readStoredJson(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      state.draft = mergeDraft(savedDraft);
      return;
    }
    const sheet = readStoredJson(SHEET_STORAGE_KEY);
    if (sheet) {
      const draft = defaultDraft();
      draft.fields = { ...draft.fields, ...(sheet.fields || {}) };
      draft.selectedPowers = Array.isArray(sheet.selectedPowers) ? sheet.selectedPowers : [];
      state.draft = draft;
      return;
    }
    state.draft = defaultDraft();
  }

  function saveDraft() {
    try {
      state.draft.activeId = state.activeId;
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(state.draft));
    } catch (_) {
      // The induction remains usable when browser storage is unavailable.
    }
  }

  function allSkills() {
    return Object.values(state.rules?.skills || {}).flat();
  }

  function getArchetype(id = state.draft?.fields?.archetype) {
    return state.rules?.archetypes?.find(item => item.id === id) || null;
  }

  function catalogsForArchetype(archetypeId) {
    if (archetypeId === 'human-investigator') return state.variants.human?.catalogs || [];
    if (archetypeId === 'vampire') {
      const lineages = state.variants.vampire?.lineages || [];
      return lineages.length ? [{ id: 'remainder-bloodlines', title: 'Remainder Bloodline', selectionField: 'lineageVariant', variants: lineages }] : [];
    }
    if (archetypeId === 'shapechanger') return state.variants.shapechanger?.catalogs || [];
    if (archetypeId === 'eldritch-binder') return state.variants.eldritch?.catalogs || [];
    if (archetypeId === 'harmonic-mutant') return state.variants.harmonic?.catalogs || [];
    if (archetypeId === 'technomancer') return state.variants.technomancer?.catalogs || [];
    return [];
  }

  function groupedVariantFields(archetypeId) {
    const groups = new Map();
    catalogsForArchetype(archetypeId).forEach(catalog => {
      const field = catalog.selectionField || 'lineageVariant';
      if (!groups.has(field)) groups.set(field, { field, titles: [], variants: [] });
      const group = groups.get(field);
      group.titles.push(catalog.title || 'Integrated Choice');
      (catalog.variants || []).forEach(variant => {
        if (!group.variants.some(item => item.id === variant.id)) group.variants.push(variant);
      });
    });
    return [...groups.values()];
  }

  function variantFieldLabel(archetypeId, field) {
    if (field === 'humanInvestigatorPractice') return 'Hunter Practice';
    if (field === 'technomancerOrder') return 'Praxis Order';
    if (field === 'technomancerCareer') return 'Career Practice';
    if (archetypeId === 'human-investigator') return 'Vigil Conviction';
    if (archetypeId === 'vampire') return 'Remainder Bloodline';
    if (archetypeId === 'shapechanger') return 'Lunar Nation or Changing Form';
    if (archetypeId === 'eldritch-binder') return 'Binding Source';
    if (archetypeId === 'harmonic-mutant') return 'Compact Remainder';
    if (archetypeId === 'technomancer') return 'Awakening Paradigm';
    return 'Lineage / Variant';
  }

  function fallbackVariantOption(archetypeId, field) {
    if (field === 'humanInvestigatorPractice' || field === 'technomancerCareer') return 'Undeclared';
    if (field === 'technomancerOrder') return 'Independent';
    if (field === 'lineageVariant' && archetypeId === 'human-investigator') return 'Uncommitted';
    if (field === 'lineageVariant' && ['vampire', 'shapechanger', 'harmonic-mutant'].includes(archetypeId)) return 'Unaligned';
    return '';
  }

  function findSelectedVariant(archetypeId, field) {
    const value = String(state.draft.fields[field] || '').trim().toLowerCase();
    if (!value) return null;
    const group = groupedVariantFields(archetypeId).find(item => item.field === field);
    return group?.variants.find(variant => variant.id?.toLowerCase() === value || variant.name?.toLowerCase() === value) || null;
  }

  function powerId(archetypeId, family, ability) {
    return `${archetypeId}::${slug(family.name)}::${ability.rank}::${slug(ability.name)}`;
  }

  function corePowerOptions() {
    const archetype = getArchetype();
    if (!archetype) return [];
    return (archetype.powerFamilies || []).flatMap(family => (family.abilities || [])
      .filter(ability => Number(ability.rank) === 1)
      .map(ability => ({
        id: powerId(archetype.id, family, ability),
        type: 'core',
        family: family.name,
        name: ability.name,
        effect: ability.effect,
        automatic: ability.name === archetype.startingAbility
      })));
  }

  function externalAbilityOptions() {
    const archetypeId = state.draft.fields.archetype;
    const options = [];
    groupedVariantFields(archetypeId).forEach(group => {
      const selected = findSelectedVariant(archetypeId, group.field);
      const first = selected?.progression?.[0];
      if (!selected || !first) return;
      options.push({
        id: `external::${archetypeId}::${group.field}::${selected.id}::${slug(first.stage || first.name)}`,
        type: 'external',
        family: selected.name,
        name: first.name,
        stage: first.stage || 'Initiate',
        effect: first.effect,
        automatic: false
      });
    });
    return options;
  }

  function automaticPower() {
    return corePowerOptions().find(option => option.automatic) || null;
  }

  function selectedAdditionalCount() {
    return state.draft.selectedPowers.length + state.draft.selectedExternalAbilities.length;
  }

  function normalizeSelections() {
    const coreIds = new Set(corePowerOptions().filter(option => !option.automatic).map(option => option.id));
    const externalIds = new Set(externalAbilityOptions().map(option => option.id));
    state.draft.selectedPowers = state.draft.selectedPowers.filter(id => coreIds.has(id)).slice(0, 2);
    const remaining = Math.max(0, 2 - state.draft.selectedPowers.length);
    state.draft.selectedExternalAbilities = state.draft.selectedExternalAbilities.filter(id => externalIds.has(id)).slice(0, remaining);
  }

  function calculateDerived() {
    const fields = state.draft.fields;
    const archetype = getArchetype();
    const num = (name, fallback = 0) => {
      const value = Number(fields[name]);
      return Number.isFinite(value) ? value : fallback;
    };
    const rating = Math.max(1, Math.min(5, num('archetypeRating', 1)));
    const keyName = archetype?.keyAttribute?.toLowerCase();
    const keyValue = keyName ? num(keyName, 1) : 0;
    return {
      vitalityMax: num('resilience', 1) + 5,
      guard: num('finesse', 1) + num('awareness', 1),
      initiative: num('finesse', 1) + num('composure', 1),
      cohesionMax: num('resolve', 1) + num('composure', 1) + 3,
      exposureLimit: num('resolve', 1) + num('resilience', 1),
      carry: num('force', 1) + num('resilience', 1),
      identityDefense: num('resolve', 1) + num('composure', 1),
      protection: num('resilience', 1) + num('armorRating', 0),
      pressureLimit: num('composure', 1) + 5,
      resourceMax: archetype ? Number(archetype.resourceBase || 0) + rating + keyValue : 0,
      powerDice: archetype ? rating + keyValue : 0,
      resourceName: archetype?.resourceName || 'Resource',
      pressureName: archetype?.pressureName || 'Pressure',
      keyAttribute: archetype?.keyAttribute || ''
    };
  }

  function initializeTrackDefaults() {
    const derived = calculateDerived();
    const fields = state.draft.fields;
    if (fields.vitalityCurrent === '' || fields.vitalityCurrent == null) fields.vitalityCurrent = String(derived.vitalityMax);
    if (fields.cohesionCurrent === '' || fields.cohesionCurrent == null) fields.cohesionCurrent = String(derived.cohesionMax);
    if (fields.resourceCurrent === '' || fields.resourceCurrent == null) fields.resourceCurrent = String(derived.resourceMax);
    if (fields.exposureCurrent === '' || fields.exposureCurrent == null) fields.exposureCurrent = '0';
    if (fields.pressureCurrent === '' || fields.pressureCurrent == null) fields.pressureCurrent = '0';
  }

  function attributeSpend() {
    return ATTRIBUTE_NAMES.reduce((total, name) => total + Math.max(0, Number(state.draft.fields[name] || 1) - 1), 0);
  }

  function skillSpend() {
    return allSkills().reduce((total, skill) => total + Math.max(0, Number(state.draft.fields[skillFieldName(skill)] || 0)), 0);
  }

  function renderTables(tables) {
    if (!Array.isArray(tables) || !tables.length) return '';
    return tables.map(table => `
      <h3>${escapeHtml(table.title || 'Reference')}</h3>
      <div class="creation-table-wrap">
        <table class="creation-table">
          <thead><tr>${(table.columns || []).map(column => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead>
          <tbody>${(table.rows || []).map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>`).join('');
  }

  function textInput(label, field, options = {}) {
    const value = state.draft.fields[field] || '';
    const type = options.type || 'text';
    return `<label class="creation-builder-field">${escapeHtml(label)}<input data-field="${escapeHtml(field)}" type="${escapeHtml(type)}" value="${escapeHtml(value)}" ${options.placeholder ? `placeholder="${escapeHtml(options.placeholder)}"` : ''} ${options.min != null ? `min="${options.min}"` : ''} ${options.max != null ? `max="${options.max}"` : ''}></label>`;
  }

  function textArea(label, field, options = {}) {
    const source = options.induction ? state.draft.induction : state.draft.fields;
    const value = source[field] || '';
    const attr = options.induction ? 'data-induction' : 'data-field';
    return `<label class="creation-builder-field creation-builder-wide">${escapeHtml(label)}<textarea ${attr}="${escapeHtml(field)}" rows="${options.rows || 3}" ${options.placeholder ? `placeholder="${escapeHtml(options.placeholder)}"` : ''}>${escapeHtml(value)}</textarea></label>`;
  }

  function choiceCards(name, options, selected, details = () => '') {
    return `<div class="creation-choice-grid">${options.map(option => {
      const value = typeof option === 'string' ? option : option.value;
      const label = typeof option === 'string' ? option : option.label;
      return `<label class="creation-choice-card ${selected === value ? 'selected' : ''}">
        <input type="radio" name="${escapeHtml(name)}" data-choice="${escapeHtml(name)}" value="${escapeHtml(value)}" ${selected === value ? 'checked' : ''}>
        <strong>${escapeHtml(label)}</strong>${details(option) ? `<span>${escapeHtml(details(option))}</span>` : ''}
      </label>`;
    }).join('')}</div>`;
  }

  function controlsForStage(id) {
    if (id === 'induction-room') {
      return `
        <h3>Begin the Personnel Record</h3>
        <div class="creation-builder-grid creation-builder-grid-2">
          ${textInput('Character Name', 'characterName', { placeholder: 'The name the team will use' })}
          ${textInput('Player', 'playerName', { placeholder: 'Player name' })}
          ${textInput('Pronouns', 'pronouns', { placeholder: 'Pronouns' })}
          ${textInput('Campaign', 'campaign')}
        </div>`;
    }

    if (id === 'creation-profile') {
      return `
        <h3>Define the Operative</h3>
        <div class="creation-builder-grid creation-builder-grid-2">
          ${textInput('Concept', 'concept', { placeholder: 'Identity, practical role, and pressure point' })}
          ${textInput('Current Occupation or Function', 'currentFunction', { placeholder: 'What the team asks you to handle' })}
          ${textInput('Affiliation or Cell', 'affiliation', { placeholder: 'Who considered you one of theirs' })}
          ${textArea('Why did you accept Blacklight’s offer?', 'joinReason', { induction: true, rows: 3 })}
          ${textArea('Why will you stay when Blacklight cannot pay, protect, authorize, or rescue you?', 'stayReason', { induction: true, rows: 3 })}
        </div>`;
    }

    if (id === 'creation-attributes') {
      const groups = [
        ['Physical', ['force', 'finesse', 'resilience']],
        ['Social', ['presence', 'guile', 'composure']],
        ['Mental', ['reason', 'awareness', 'resolve']]
      ];
      return `
        <div class="creation-budget ${attributeSpend() === 9 ? 'valid' : 'invalid'}"><strong>Attribute Points:</strong> ${attributeSpend()} / 9 spent</div>
        <div class="creation-stat-groups">${groups.map(([group, names]) => `
          <fieldset><legend>${group}</legend>${names.map(name => `
            <label>${escapeHtml(name[0].toUpperCase() + name.slice(1))}<input data-attribute="${name}" type="number" min="1" max="4" value="${escapeHtml(state.draft.fields[name] || '2')}"></label>`).join('')}</fieldset>`).join('')}</div>`;
    }

    if (id === 'creation-skills') {
      const signatureOptions = allSkills().map(skill => `<option value="${escapeHtml(skill)}" ${state.draft.signatureSkill === skill ? 'selected' : ''}>${escapeHtml(skill)}</option>`).join('');
      return `
        <div class="creation-budget ${skillSpend() === 24 ? 'valid' : 'invalid'}"><strong>Skill Points:</strong> ${skillSpend()} / 24 spent</div>
        <label class="creation-builder-field">Signature Skill<select data-signature-skill><option value="">Choose one Signature Skill</option>${signatureOptions}</select></label>
        <div class="creation-skill-groups">${Object.entries(state.rules.skills || {}).map(([group, skills]) => `
          <fieldset><legend>${escapeHtml(group)}</legend>${skills.map(skill => {
            const field = skillFieldName(skill);
            const max = state.draft.signatureSkill === skill ? 4 : 3;
            return `<label>${escapeHtml(skill)}<input data-skill="${escapeHtml(skill)}" data-field-name="${field}" type="number" min="0" max="${max}" value="${escapeHtml(state.draft.fields[field] || '0')}"></label>`;
          }).join('')}</fieldset>`).join('')}</div>
        <h3>Specializations</h3>
        <div class="creation-builder-grid creation-builder-grid-2">${state.draft.specializations.map((item, index) => `
          <div class="creation-specialization">
            <label>Specialization ${index + 1} Skill<select data-specialization-skill="${index}"><option value="">Choose a Skill</option>${allSkills().map(skill => `<option value="${escapeHtml(skill)}" ${item.skill === skill ? 'selected' : ''}>${escapeHtml(skill)}</option>`).join('')}</select></label>
            <label>Narrow Focus<input data-specialization-name="${index}" value="${escapeHtml(item.name)}" placeholder="Shipboard Pistols, Altered Records…"></label>
          </div>`).join('')}</div>`;
    }

    if (id === 'creation-frame') {
      const options = state.creation.standardPackage.operationalFrame.options;
      return `
        <h3>Select One Operational Frame</h3>
        ${choiceCards('operationalFrame', options, state.draft.fields.operationalFrame || '')}
        <div class="creation-builder-grid creation-builder-grid-2">
          ${textArea('What does the team expect you to notice before anyone else?', 'frameExpectation', { induction: true })}
          ${textArea('What will they incorrectly assume you can handle because of the title?', 'frameAssumption', { induction: true })}
        </div>`;
    }

    if (id === 'creation-archetype') {
      return `
        <h3>Select One Archetype</h3>
        ${choiceCards('archetype', (state.rules.archetypes || []).map(archetype => ({ value: archetype.id, label: archetype.name, data: archetype })), state.draft.fields.archetype || '', option => {
          const archetype = option.data;
          return `${archetype.resourceName} / ${archetype.pressureName} · Key Attribute ${archetype.keyAttribute}`;
        })}
        <div class="creation-builder-grid creation-builder-grid-2">
          ${textArea('What can you do that an ordinary professional cannot?', 'archetypeDifference', { induction: true })}
          ${textArea('What happens to you when you keep doing it?', 'archetypeCost', { induction: true })}
        </div>`;
    }

    if (id === 'creation-variants') {
      const archetypeId = state.draft.fields.archetype;
      const groups = groupedVariantFields(archetypeId);
      if (!archetypeId) return '<p class="creation-stage-warning">Choose an Archetype before selecting its integrated records.</p>';
      return `<h3>Integrated ${escapeHtml(getArchetype()?.name || '')} Records</h3>${groups.map(group => {
        const fallback = fallbackVariantOption(archetypeId, group.field);
        const selected = state.draft.fields[group.field] || '';
        const selectedVariant = findSelectedVariant(archetypeId, group.field);
        return `<div class="creation-variant-block">
          <label class="creation-builder-field">${escapeHtml(variantFieldLabel(archetypeId, group.field))}
            <select data-variant-field="${escapeHtml(group.field)}">
              <option value="">Choose…</option>
              ${fallback ? `<option value="${escapeHtml(fallback)}" ${selected === fallback ? 'selected' : ''}>${escapeHtml(fallback)}</option>` : ''}
              ${group.variants.map(variant => `<option value="${escapeHtml(variant.name)}" ${selected === variant.name || selected === variant.id ? 'selected' : ''}>${escapeHtml(variant.name)}</option>`).join('')}
            </select>
          </label>
          ${selectedVariant ? `<div class="creation-selection-detail"><strong>${escapeHtml(selectedVariant.name)}</strong><p>${escapeHtml(selectedVariant.continuum || selectedVariant.legacy || '')}</p>${selectedVariant.gift ? `<p><strong>Gift:</strong> ${escapeHtml(selectedVariant.gift.name)} — ${escapeHtml(selectedVariant.gift.effect)}</p>` : ''}${selectedVariant.bane ? `<p><strong>Bane:</strong> ${escapeHtml(selectedVariant.bane.name)} — ${escapeHtml(selectedVariant.bane.effect)}</p>` : ''}${selectedVariant.temptation ? `<p><strong>Temptation:</strong> ${escapeHtml(selectedVariant.temptation.name)} — ${escapeHtml(selectedVariant.temptation.effect)}</p>` : ''}${selectedVariant.intrusionBreach ? `<p><strong>Intrusion Breach:</strong> ${escapeHtml(selectedVariant.intrusionBreach.name)} — ${escapeHtml(selectedVariant.intrusionBreach.effect)}</p>` : ''}</div>` : ''}
        </div>`;
      }).join('') || '<p class="helper-note">This Archetype has no additional integrated selection fields.</p>'}`;
    }

    if (id === 'creation-abilities') {
      normalizeSelections();
      const automatic = automaticPower();
      const options = [...corePowerOptions().filter(option => !option.automatic), ...externalAbilityOptions()];
      return `
        <div class="creation-budget ${selectedAdditionalCount() === 2 ? 'valid' : 'invalid'}"><strong>Starting Ability Points:</strong> ${selectedAdditionalCount()} / 2 spent</div>
        <div class="creation-automatic-ability"><span>Automatic Starting Ability</span><strong>${escapeHtml(automatic?.name || getArchetype()?.startingAbility || 'Select an Archetype')}</strong><p>${escapeHtml(automatic?.effect || '')}</p></div>
        <div class="creation-ability-grid">${options.map(option => {
          const selected = option.type === 'core' ? state.draft.selectedPowers.includes(option.id) : state.draft.selectedExternalAbilities.includes(option.id);
          const disabled = !selected && selectedAdditionalCount() >= 2;
          return `<label class="creation-ability-card ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}">
            <input type="checkbox" data-ability-id="${escapeHtml(option.id)}" data-ability-type="${option.type}" ${selected ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
            <span>${escapeHtml(option.stage || 'Rank 1')} · ${escapeHtml(option.family)}</span>
            <strong>${escapeHtml(option.name)}</strong>
            <p>${escapeHtml(option.effect)}</p>
          </label>`;
        }).join('')}</div>`;
    }

    if (id === 'creation-derived-traits') {
      initializeTrackDefaults();
      const derived = calculateDerived();
      const cards = [
        ['Vitality Maximum', derived.vitalityMax], ['Guard', derived.guard], ['Initiative', derived.initiative],
        ['Cohesion Maximum', derived.cohesionMax], ['Exposure Limit', derived.exposureLimit], ['Carry', derived.carry],
        ['Identity Defense', derived.identityDefense], ['Base Non-Lethal Soak', derived.protection], ['Power Dice', derived.powerDice],
        [`${derived.resourceName} Maximum`, derived.resourceMax], [`${derived.pressureName} Limit`, derived.pressureLimit]
      ];
      return `
        <div class="creation-derived-grid">${cards.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}</div>
        <h3>Starting Tracks and Armor</h3>
        <div class="creation-builder-grid creation-builder-grid-3">
          ${textInput('Armor Rating', 'armorRating', { type: 'number', min: 0, max: 10 })}
          ${textInput('Vitality Current', 'vitalityCurrent', { type: 'number', min: 0, max: derived.vitalityMax })}
          ${textInput('Cohesion Current', 'cohesionCurrent', { type: 'number', min: 0, max: derived.cohesionMax })}
          ${textInput(`${derived.resourceName} Current`, 'resourceCurrent', { type: 'number', min: 0, max: derived.resourceMax })}
          ${textInput('Exposure Current', 'exposureCurrent', { type: 'number', min: 0, max: derived.exposureLimit })}
          ${textInput(`${derived.pressureName} Current`, 'pressureCurrent', { type: 'number', min: 0, max: derived.pressureLimit })}
        </div>`;
    }

    if (id === 'creation-equipment') {
      return `
        <h3>Expected Blacklight Requisition</h3>
        <div class="creation-weapon-builder">${[1, 2, 3, 4].map(number => `
          <fieldset><legend>Weapon or Power ${number}</legend>
            ${textInput('Name', `weapon${number}`, { placeholder: number === 1 ? 'Primary weapon or professional tool' : 'Optional' })}
            ${textInput('Pool', `weapon${number}Pool`, { placeholder: 'Attribute + Skill' })}
            ${textInput('Damage', `weapon${number}Damage`, { placeholder: 'Damage dice and type' })}
            ${textInput('Range', `weapon${number}Range`, { placeholder: 'Range band' })}
            ${textInput('Tags / Notes', `weapon${number}Notes`, { placeholder: 'Tags, charges, restrictions' })}
          </fieldset>`).join('')}</div>
        <div class="creation-builder-grid creation-builder-grid-2">
          ${textArea('Armor and Protection', 'armorAndProtection', { rows: 4, placeholder: 'Serviceable protective item, Armor Rating, eligible damage types' })}
          ${textArea('Equipment and Salvage', 'equipment', { rows: 4, placeholder: 'Field kit, two common supplies, personal object' })}
          ${textArea('Contacts, Allies, and Debts', 'contacts', { rows: 4 })}
          ${textArea('Haven, Territory, Laboratory, or Safe Site', 'safeSite', { rows: 4 })}
        </div>
        <label class="creation-confirmation"><input type="checkbox" data-opening-ack ${state.draft.openingOverrideAcknowledged ? 'checked' : ''}> I understand that No Return Signal begins without guaranteed familiar weapons, armor, credentials, money, institutional authority, or support infrastructure.</label>`;
    }

    if (id === 'creation-bonds') {
      const labels = {
        conviction: 'Defining Conviction', touchstone: 'Touchstone / Important Person', groupBond: 'Pack, Coterie, Cell, or Circle Bond',
        professionalObligation: 'Professional Obligation', personalBoundary: 'Personal Boundary', debtPromise: 'Debt, Promise, or Contract',
        charlesSavedMe: 'Charles once saved me by…', charlesNeverAnswered: 'Charles never answered me about…'
      };
      return `<div class="creation-builder-grid creation-builder-grid-2">${REQUIRED_BOND_FIELDS.map(field => textArea(labels[field], field, { rows: 4 })).join('')}</div>`;
    }

    if (id === 'creation-limits') {
      return `<div class="creation-builder-grid creation-builder-grid-2">
        ${textArea('Signature Capability', 'signatureCapability', { rows: 4, placeholder: 'What can you explicitly do that ordinary characters cannot?' })}
        ${textArea('Capability Source / Expression', 'capabilityExpression', { rows: 4, placeholder: 'Training, blood, pact, technology, resonance, spirit, equipment…' })}
        ${textArea('Meaningful Limitation or Bane', 'capabilityLimitation', { rows: 4, placeholder: 'What restricts, costs, or endangers the capability?' })}
        ${textArea('Current State / Form', 'currentForm', { rows: 4, placeholder: 'Only when it changes available capabilities' })}
        ${textArea('Adaptations / Upgrades', 'adaptations', { rows: 4 })}
        ${textArea('Persistent Conditions', 'conditions', { rows: 4 })}
      </div>`;
    }

    if (id === 'creation-final-audit') {
      return `<div class="creation-builder-grid creation-builder-grid-2">
        ${textArea('What do you contribute when your best capability is unavailable?', 'bestCapabilityUnavailable', { induction: true, rows: 4 })}
        ${textArea('Which teammate would you trust to restrain you during a Pressure Crisis?', 'trustedRestraint', { induction: true, rows: 4 })}
        ${textArea('What mistake are you most likely to make when you believe you are helping?', 'helpingMistake', { induction: true, rows: 4 })}
        ${textArea('Which part of your own record would an enemy exploit first?', 'enemyExploit', { induction: true, rows: 4 })}
        ${textArea('What must another operative know before relying on you?', 'relianceWarning', { induction: true, rows: 4 })}
        ${textArea('Additional Character Notes', 'extraNotes', { induction: true, rows: 5 })}
        ${textArea('Secrets and Complications', 'secrets', { rows: 5 })}
      </div>`;
    }

    if (id === 'creation-team-arrival') {
      const validation = validateAllStages();
      return `
        ${renderFinalSummary()}
        ${validation.length ? `<div class="creation-final-errors"><strong>The record still needs attention:</strong><ul>${validation.map(error => `<li><button type="button" data-go-stage="${escapeHtml(error.stage)}">${escapeHtml(error.message)}</button></li>`).join('')}</ul></div>` : '<div class="creation-final-ready"><strong>READY FOR TEAM REVIEW</strong><span>The character record is complete and can be transferred to the Basic Character Sheet.</span></div>'}
        <label class="creation-confirmation"><input type="checkbox" data-final-confirm ${state.draft.finalConfirmed ? 'checked' : ''}> I confirm that this record represents the operative I am sending.</label>
        <div class="creation-final-actions">
          <button class="secondary-action" type="button" data-download-character ${validation.length ? 'disabled' : ''}>Save Character JSON</button>
          <button class="primary-action" type="button" data-open-sheet ${validation.length || !state.draft.finalConfirmed ? 'disabled' : ''}>Open Completed Character Sheet</button>
          <button class="primary-action" type="button" data-print-sheet ${validation.length || !state.draft.finalConfirmed ? 'disabled' : ''}>Open and Print Character Sheet</button>
        </div>`;
    }

    return '<p class="helper-note">This induction stage has no additional record fields.</p>';
  }

  function stageErrors(stageId) {
    const fields = state.draft.fields;
    const errors = [];
    const requireText = (value, message) => { if (!String(value || '').trim()) errors.push(message); };

    if (stageId === 'induction-room') {
      requireText(fields.characterName, 'Enter the character’s name.');
      requireText(fields.playerName, 'Enter the player’s name.');
    } else if (stageId === 'creation-profile') {
      requireText(fields.concept, 'Write a concise character concept.');
      requireText(fields.currentFunction, 'State the character’s current function for the team.');
      requireText(state.draft.induction.joinReason, 'Explain why the character accepted Blacklight’s offer.');
      requireText(state.draft.induction.stayReason, 'Explain why the character will stay without Blacklight infrastructure.');
    } else if (stageId === 'creation-attributes') {
      if (attributeSpend() !== 9) errors.push(`Spend exactly 9 Attribute Points; ${attributeSpend()} are currently spent.`);
      ATTRIBUTE_NAMES.forEach(name => {
        const value = Number(fields[name]);
        if (!Number.isInteger(value) || value < 1 || value > 4) errors.push(`${name} must be between 1 and 4.`);
      });
    } else if (stageId === 'creation-skills') {
      if (skillSpend() !== 24) errors.push(`Spend exactly 24 Skill Points; ${skillSpend()} are currently spent.`);
      requireText(state.draft.signatureSkill, 'Choose one Signature Skill.');
      allSkills().forEach(skill => {
        const value = Number(fields[skillFieldName(skill)] || 0);
        const max = state.draft.signatureSkill === skill ? 4 : 3;
        if (!Number.isInteger(value) || value < 0 || value > max) errors.push(`${skill} must be between 0 and ${max}.`);
      });
      state.draft.specializations.forEach((specialization, index) => {
        requireText(specialization.skill, `Choose a Skill for Specialization ${index + 1}.`);
        requireText(specialization.name, `Name Specialization ${index + 1}.`);
        if (specialization.skill && Number(fields[skillFieldName(specialization.skill)] || 0) < 2) errors.push(`Specialization ${index + 1} requires ${specialization.skill} at 2 or higher.`);
      });
    } else if (stageId === 'creation-frame') {
      requireText(fields.operationalFrame, 'Choose one Operational Frame.');
      requireText(state.draft.induction.frameExpectation, 'State what the team expects this operative to notice.');
      requireText(state.draft.induction.frameAssumption, 'State what the team may incorrectly assume about the Frame.');
    } else if (stageId === 'creation-archetype') {
      requireText(fields.archetype, 'Choose one Archetype.');
      requireText(state.draft.induction.archetypeDifference, 'State what the Archetype lets the character do beyond ordinary professional action.');
      requireText(state.draft.induction.archetypeCost, 'State what continued use costs or risks.');
    } else if (stageId === 'creation-variants') {
      if (!fields.archetype) errors.push('Choose an Archetype first.');
      groupedVariantFields(fields.archetype).forEach(group => requireText(fields[group.field], `Choose ${variantFieldLabel(fields.archetype, group.field)}.`));
    } else if (stageId === 'creation-abilities') {
      if (selectedAdditionalCount() !== 2) errors.push(`Spend exactly 2 Starting Ability Points; ${selectedAdditionalCount()} are currently spent.`);
    } else if (stageId === 'creation-derived-traits') {
      const derived = calculateDerived();
      const checks = [
        ['vitalityCurrent', 0, derived.vitalityMax], ['cohesionCurrent', 0, derived.cohesionMax], ['resourceCurrent', 0, derived.resourceMax],
        ['exposureCurrent', 0, derived.exposureLimit], ['pressureCurrent', 0, derived.pressureLimit], ['armorRating', 0, 10]
      ];
      checks.forEach(([name, min, max]) => {
        const value = Number(fields[name]);
        if (!Number.isFinite(value) || value < min || value > max) errors.push(`${name} must be between ${min} and ${max}.`);
      });
    } else if (stageId === 'creation-equipment') {
      requireText(fields.weapon1, 'Record the expected primary weapon or professional tool.');
      requireText(fields.armorAndProtection, 'Record the expected protective item or state that none is expected.');
      requireText(fields.equipment, 'Record the field kit, supplies, and personal object.');
      if (!state.draft.openingOverrideAcknowledged) errors.push('Acknowledge the No Return Signal equipment override.');
    } else if (stageId === 'creation-bonds') {
      REQUIRED_BOND_FIELDS.forEach(field => requireText(fields[field], `Complete ${field}.`));
    } else if (stageId === 'creation-limits') {
      requireText(fields.signatureCapability, 'Record the Signature Capability.');
      requireText(fields.capabilityExpression, 'Record the capability source or expression.');
      requireText(fields.capabilityLimitation, 'Record a meaningful limitation or Bane.');
    } else if (stageId === 'creation-final-audit') {
      ['bestCapabilityUnavailable', 'trustedRestraint', 'helpingMistake', 'enemyExploit', 'relianceWarning'].forEach(field => requireText(state.draft.induction[field], `Complete the final audit prompt: ${field}.`));
    }
    return errors;
  }

  function validateAllStages() {
    return state.entries
      .filter(entry => entry.id !== 'creation-team-arrival')
      .flatMap(entry => stageErrors(entry.id).map(message => ({ stage: entry.id, message })));
  }

  function completionForStage(stageId) {
    if (stageId === 'creation-team-arrival') return validateAllStages().length === 0 && state.draft.finalConfirmed;
    return stageErrors(stageId).length === 0;
  }

  function renderFinalSummary() {
    const fields = state.draft.fields;
    const archetype = getArchetype();
    const derived = calculateDerived();
    const selectedCore = corePowerOptions().filter(option => option.automatic || state.draft.selectedPowers.includes(option.id));
    const selectedExternal = externalAbilityOptions().filter(option => state.draft.selectedExternalAbilities.includes(option.id));
    return `<section class="creation-final-summary">
      <div><span>Operative</span><strong>${escapeHtml(fields.characterName || 'Unnamed')}</strong><p>${escapeHtml(fields.concept || '')}</p></div>
      <div><span>Operational Frame</span><strong>${escapeHtml(fields.operationalFrame || 'Unassigned')}</strong><p>${escapeHtml(fields.currentFunction || '')}</p></div>
      <div><span>Archetype</span><strong>${escapeHtml(archetype?.name || 'Unselected')}</strong><p>${escapeHtml(groupedVariantFields(fields.archetype).map(group => fields[group.field]).filter(Boolean).join(' · '))}</p></div>
      <div><span>Core Tracks</span><strong>Vitality ${derived.vitalityMax} · Cohesion ${derived.cohesionMax}</strong><p>${escapeHtml(derived.resourceName)} ${derived.resourceMax} · ${escapeHtml(derived.pressureName)} Limit ${derived.pressureLimit}</p></div>
      <div class="creation-summary-wide"><span>Starting Abilities</span><strong>${escapeHtml([...selectedCore, ...selectedExternal].map(option => option.name).join(' · '))}</strong></div>
    </section>`;
  }

  function composeCharacterNotes() {
    const i = state.draft.induction;
    const sections = [
      ['Reason for joining Blacklight', i.joinReason],
      ['Reason for staying without infrastructure', i.stayReason],
      ['What the team expects me to notice', i.frameExpectation],
      ['What the team may wrongly assume about my role', i.frameAssumption],
      ['What my Archetype lets me do', i.archetypeDifference],
      ['What continued use costs me', i.archetypeCost],
      ['When my best capability is unavailable', i.bestCapabilityUnavailable],
      ['Who I trust during a Pressure Crisis', i.trustedRestraint],
      ['The mistake I make while trying to help', i.helpingMistake],
      ['What an enemy would exploit first', i.enemyExploit],
      ['What another operative must know before relying on me', i.relianceWarning],
      ['Additional notes', i.extraNotes]
    ];
    return sections.filter(([, value]) => String(value || '').trim()).map(([label, value]) => `${label}:\n${String(value).trim()}`).join('\n\n');
  }

  function selectedExternalText() {
    return externalAbilityOptions()
      .filter(option => state.draft.selectedExternalAbilities.includes(option.id))
      .map(option => `${option.stage} — ${option.family} — ${option.name}: ${option.effect}`)
      .join('\n\n');
  }

  function buildSheetData() {
    initializeTrackDefaults();
    const fields = { ...state.draft.fields };
    fields.archetypeRating = '1';
    fields.specializations = state.draft.specializations.map(item => `${item.skill}: ${item.name}`).join('\n');
    fields.characterNotes = composeCharacterNotes();
    fields.customAbilities = selectedExternalText();
    const automatic = automaticPower();
    const selectedPowers = [...new Set([automatic?.id, ...state.draft.selectedPowers].filter(Boolean))];
    return {
      schema: 'blacklight-continuum-basic-character',
      schemaVersion: '0.1.0',
      savedAt: new Date().toISOString(),
      selectedPowers,
      fields
    };
  }

  function transferToSheet() {
    const data = buildSheetData();
    localStorage.setItem(SHEET_STORAGE_KEY, JSON.stringify(data));
    saveDraft();
    return data;
  }

  function downloadCharacter() {
    const data = transferToSheet();
    const filename = `${slug(state.draft.fields.characterName) || 'blacklight-operative'}-basic.json`;
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function openSheet(printMode = false) {
    const errors = validateAllStages();
    if (errors.length || !state.draft.finalConfirmed) return;
    transferToSheet();
    const url = `blacklight-character-sheet.html?from=induction${printMode ? '&print=1' : ''}`;
    if (printMode) window.open(url, '_blank', 'noopener');
    else window.location.href = url;
  }

  function renderStageErrors(errors) {
    const target = document.getElementById('creation-stage-errors');
    if (!target) return;
    target.innerHTML = errors.length ? `<strong>Complete this induction before continuing:</strong><ul>${errors.map(error => `<li>${escapeHtml(error)}</li>`).join('')}</ul>` : '';
    target.hidden = !errors.length;
  }

  function renderEntry(entryId, options = {}) {
    const target = document.getElementById('creation-reader-entry');
    const entry = state.entries.find(item => item.id === entryId) || state.entries[0];
    if (!target || !entry) return;

    state.activeId = entry.id;
    saveDraft();
    target.innerHTML = `
      <div class="creation-reader-meta">${escapeHtml(entry.category || 'Character Creation')}</div>
      <h2>${escapeHtml(entry.title)}</h2>
      <p class="creation-reader-summary">${escapeHtml(entry.summary || '')}</p>
      ${(entry.body || []).map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}
      ${renderTables(entry.tables)}
      <section class="creation-builder-stage" aria-labelledby="creation-stage-title">
        <div class="creation-builder-stage-heading"><p class="eyebrow">Complete this induction record</p><h2 id="creation-stage-title">Your Character</h2></div>
        <div id="creation-stage-errors" class="creation-stage-errors" hidden></div>
        ${controlsForStage(entry.id)}
      </section>`;

    updateNavigation();
    const previous = document.getElementById('creation-reader-previous');
    const next = document.getElementById('creation-reader-next');
    const index = state.entries.findIndex(item => item.id === entry.id);
    if (previous) previous.disabled = index <= 0;
    if (next) {
      next.disabled = index >= state.entries.length - 1;
      next.textContent = index === state.entries.length - 2 ? 'Meet the Team' : 'Save and Continue';
    }
    updateProgress();
    if (!options.preserveScroll) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateNavigation() {
    document.querySelectorAll('#creation-reader-nav button').forEach(button => {
      const id = button.dataset.entryId;
      button.classList.toggle('active', id === state.activeId);
      button.classList.toggle('complete', completionForStage(id));
      const marker = button.querySelector('[data-completion-marker]');
      if (marker) marker.textContent = completionForStage(id) ? '✓' : '';
    });
  }

  function updateProgress() {
    const completed = state.entries.filter(entry => completionForStage(entry.id)).length;
    const percent = Math.round((completed / state.entries.length) * 100);
    const bar = document.getElementById('creation-progress-bar');
    const text = document.getElementById('creation-progress-text');
    if (bar) bar.style.width = `${percent}%`;
    if (text) text.textContent = `${completed} of ${state.entries.length} induction stages complete`;
  }

  function renderNavigation() {
    const target = document.getElementById('creation-reader-nav');
    if (!target) return;
    target.innerHTML = '';
    state.entries.forEach((entry, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.entryId = entry.id;
      button.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(entry.title)}</strong><small>${escapeHtml(entry.category || 'Character Creation')}</small><b data-completion-marker></b>`;
      button.addEventListener('click', () => renderEntry(entry.id));
      target.appendChild(button);
    });
    updateNavigation();
  }

  function move(direction) {
    const index = state.entries.findIndex(entry => entry.id === state.activeId);
    if (direction > 0) {
      const errors = stageErrors(state.activeId);
      if (errors.length) {
        renderStageErrors(errors);
        return;
      }
    }
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= state.entries.length) return;
    renderEntry(state.entries[nextIndex].id);
  }

  function refreshBudgetOnly() {
    const budget = document.querySelector('.creation-budget');
    if (!budget) return;
    if (state.activeId === 'creation-attributes') {
      budget.classList.toggle('valid', attributeSpend() === 9);
      budget.classList.toggle('invalid', attributeSpend() !== 9);
      budget.innerHTML = `<strong>Attribute Points:</strong> ${attributeSpend()} / 9 spent`;
    } else if (state.activeId === 'creation-skills') {
      budget.classList.toggle('valid', skillSpend() === 24);
      budget.classList.toggle('invalid', skillSpend() !== 24);
      budget.innerHTML = `<strong>Skill Points:</strong> ${skillSpend()} / 24 spent`;
    }
    updateNavigation();
    updateProgress();
  }

  function handleBuilderInput(event) {
    const target = event.target;
    if (target.matches('[data-field]')) {
      state.draft.fields[target.dataset.field] = target.value;
    } else if (target.matches('[data-induction]')) {
      state.draft.induction[target.dataset.induction] = target.value;
    } else if (target.matches('[data-attribute]')) {
      state.draft.fields[target.dataset.attribute] = target.value;
      refreshBudgetOnly();
    } else if (target.matches('[data-skill]')) {
      state.draft.fields[target.dataset.fieldName] = target.value;
      refreshBudgetOnly();
    } else if (target.matches('[data-specialization-name]')) {
      state.draft.specializations[Number(target.dataset.specializationName)].name = target.value;
    }
    saveDraft();
    updateNavigation();
    updateProgress();
  }

  function handleBuilderChange(event) {
    const target = event.target;
    if (target.matches('[data-choice="operationalFrame"]')) {
      state.draft.fields.operationalFrame = target.value;
      renderEntry(state.activeId, { preserveScroll: true });
    } else if (target.matches('[data-choice="archetype"]')) {
      state.draft.fields.archetype = target.value;
      state.draft.fields.archetypeRating = '1';
      ['lineageVariant', 'humanInvestigatorPractice', 'technomancerOrder', 'technomancerCareer'].forEach(field => { delete state.draft.fields[field]; });
      state.draft.selectedPowers = [];
      state.draft.selectedExternalAbilities = [];
      state.draft.fields.resourceCurrent = '';
      renderEntry(state.activeId, { preserveScroll: true });
    } else if (target.matches('[data-signature-skill]')) {
      const previous = state.draft.signatureSkill;
      state.draft.signatureSkill = target.value;
      if (previous && previous !== target.value) {
        const oldField = skillFieldName(previous);
        if (Number(state.draft.fields[oldField] || 0) > 3) state.draft.fields[oldField] = '3';
      }
      renderEntry(state.activeId, { preserveScroll: true });
    } else if (target.matches('[data-specialization-skill]')) {
      state.draft.specializations[Number(target.dataset.specializationSkill)].skill = target.value;
    } else if (target.matches('[data-variant-field]')) {
      state.draft.fields[target.dataset.variantField] = target.value;
      state.draft.selectedExternalAbilities = [];
      renderEntry(state.activeId, { preserveScroll: true });
    } else if (target.matches('[data-ability-id]')) {
      const list = target.dataset.abilityType === 'core' ? state.draft.selectedPowers : state.draft.selectedExternalAbilities;
      if (target.checked && !list.includes(target.dataset.abilityId) && selectedAdditionalCount() < 2) list.push(target.dataset.abilityId);
      if (!target.checked) {
        const index = list.indexOf(target.dataset.abilityId);
        if (index >= 0) list.splice(index, 1);
      }
      renderEntry(state.activeId, { preserveScroll: true });
    } else if (target.matches('[data-opening-ack]')) {
      state.draft.openingOverrideAcknowledged = target.checked;
    } else if (target.matches('[data-final-confirm]')) {
      state.draft.finalConfirmed = target.checked;
      renderEntry(state.activeId, { preserveScroll: true });
    }
    saveDraft();
    updateNavigation();
    updateProgress();
  }

  function resetInduction() {
    if (!confirm('Clear the entire character creation induction and begin again?')) return;
    state.draft = defaultDraft();
    allSkills().forEach(skill => { state.draft.fields[skillFieldName(skill)] = '0'; });
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    renderEntry(state.entries[0].id);
  }

  async function fetchJson(url, label) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${label} request failed with status ${response.status}.`);
    return response.json();
  }

  async function initialize() {
    document.getElementById('creation-reader-print')?.addEventListener('click', () => window.print());
    document.getElementById('creation-reader-previous')?.addEventListener('click', () => move(-1));
    document.getElementById('creation-reader-next')?.addEventListener('click', () => move(1));
    document.getElementById('creation-reset')?.addEventListener('click', resetInduction);

    const root = document.getElementById('creation-reader-entry');
    root?.addEventListener('input', handleBuilderInput);
    root?.addEventListener('change', handleBuilderChange);
    root?.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.matches('[data-go-stage]')) renderEntry(button.dataset.goStage);
      else if (button.matches('[data-download-character]')) downloadCharacter();
      else if (button.matches('[data-open-sheet]')) openSheet(false);
      else if (button.matches('[data-print-sheet]')) openSheet(true);
    });

    try {
      const [guide, rules, creation, human, vampire, shapechanger, eldritch, harmonic, technomancer] = await Promise.all([
        fetchJson(URLS.guide, 'Character creation guide'),
        fetchJson(URLS.rules, 'Character options'),
        fetchJson(URLS.creation, 'Character creation rules'),
        fetchJson(URLS.human, 'Human Vigil options'),
        fetchJson(URLS.vampire, 'Vampire bloodlines'),
        fetchJson(URLS.shapechanger, 'Shapechanger variants'),
        fetchJson(URLS.eldritch, 'Eldritch sources'),
        fetchJson(URLS.harmonic, 'Harmonic variants'),
        fetchJson(URLS.technomancer, 'Technomancer practices')
      ]);
      state.entries = guide.entries || [];
      state.rules = rules;
      state.creation = creation;
      state.variants = { human, vampire, shapechanger, eldritch, harmonic, technomancer };
      if (!state.entries.length) throw new Error('Character creation guide contains no entries.');
      hydrateDraft();
      allSkills().forEach(skill => {
        const field = skillFieldName(skill);
        if (state.draft.fields[field] == null) state.draft.fields[field] = '0';
      });
      normalizeSelections();
      renderNavigation();
      const requested = new URLSearchParams(window.location.search).get('stage');
      const startingId = state.entries.some(entry => entry.id === requested)
        ? requested
        : state.entries.some(entry => entry.id === state.draft.activeId) ? state.draft.activeId : state.entries[0].id;
      renderEntry(startingId, { preserveScroll: true });
    } catch (error) {
      console.error(error);
      const nav = document.getElementById('creation-reader-nav');
      const target = document.getElementById('creation-reader-entry');
      if (nav) nav.innerHTML = '<p class="creation-reader-status">The induction index could not be loaded.</p>';
      if (target) target.innerHTML = `<p class="creation-reader-status">The interactive character induction could not be loaded: ${escapeHtml(error.message)}</p>`;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else void initialize();
})();
