(() => {
  'use strict';

  const URLS = {
    rules: 'data/blacklight-continuum/rules/basic-character-options.json',
    creation: 'data/blacklight-continuum/rules/character-creation-foundation.json',
    content: 'data/blacklight-continuum/generators/random-character-content.json',
    human: 'data/blacklight-continuum/rules/human-vigil-practices.json',
    vampire: 'data/blacklight-continuum/rules/vampire-remainder-bloodlines.json',
    shapechanger: 'data/blacklight-continuum/rules/shapechanger-remainder-forms.json',
    eldritch: 'data/blacklight-continuum/rules/eldritch-binding-sources.json',
    harmonic: 'data/blacklight-continuum/rules/harmonic-compact-remainders.json',
    technomancer: 'data/blacklight-continuum/rules/technomancer-awakening-practices.json',
    historicalEquipment: 'data/blacklight-continuum/rules/modern-historical-equipment.json',
    futureEquipment: 'data/blacklight-continuum/rules/future-scavenged-survival-equipment.json',
    relics: 'data/blacklight-continuum/rules/supernatural-artifacts-relics.json',
    alien: 'data/blacklight-continuum/rules/alien-technology-templates.json'
  };

  const STORAGE_KEY = 'hb-ttrpg-tools-blacklight-basic-character-v1';
  const ATTRIBUTE_GROUPS = {
    Physical: ['Force', 'Finesse', 'Resilience'],
    Social: ['Presence', 'Guile', 'Composure'],
    Mental: ['Reason', 'Awareness', 'Resolve']
  };
  const CURRENT_FORMS = {
    'human-investigator': 'Ordinary human-adjacent operating state; no transformative form active.',
    vampire: 'Undead baseline; no additional blood-fed transformation active.',
    shapechanger: 'Social Form. Hunting Form and War Form are available only through recorded Shapechanger capabilities.',
    'eldritch-binder': 'Self-directed baseline with the Binding Source present but not currently manifesting through an active Depth.',
    'harmonic-mutant': 'Stable baseline resonance; no temporary mutation or overload state active.',
    technomancer: 'Awakened baseline; no sustained reality-working effect active.'
  };

  const state = {
    data: null,
    character: null,
    baseSeed: '',
    counters: { identity: 0, statistics: 0, abilities: 0, gear: 0, relationships: 0 }
  };

  const ui = {};

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function slug(value) {
    return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function fieldSlug(value) {
    return slug(value).replace(/-/g, '_');
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`${url} contains invalid JSON: ${error.message}`);
    }
  }

  function hashSeed(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function makeRng(seedText) {
    let value = hashSeed(seedText) || 0x6d2b79f5;
    return () => {
      value += 0x6d2b79f5;
      let result = value;
      result = Math.imul(result ^ (result >>> 15), result | 1);
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  }

  function choice(items, rng) {
    if (!Array.isArray(items) || !items.length) return null;
    return items[Math.floor(rng() * items.length)];
  }

  function shuffled(items, rng) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(rng() * (index + 1));
      [result[index], result[swap]] = [result[swap], result[index]];
    }
    return result;
  }

  function weightedChoice(items, weightFor, rng) {
    const weighted = items.map(item => ({ item, weight: Math.max(0, Number(weightFor(item)) || 0) }));
    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    if (total <= 0) return choice(items, rng);
    let cursor = rng() * total;
    for (const entry of weighted) {
      cursor -= entry.weight;
      if (cursor <= 0) return entry.item;
    }
    return weighted[weighted.length - 1]?.item || null;
  }

  function randomSeed() {
    const bytes = new Uint32Array(3);
    if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(bytes);
    else bytes.forEach((_, index) => { bytes[index] = Math.floor(Math.random() * 0xffffffff); });
    return [...bytes].map(value => value.toString(36)).join('-');
  }

  function partRng(part) {
    const count = state.counters[part] || 0;
    return makeRng(`${state.baseSeed}:${part}:${count}`);
  }

  function allAttributes() {
    return Object.values(ATTRIBUTE_GROUPS).flat();
  }

  function allSkills() {
    return Object.values(state.data.rules.skills || {}).flat();
  }

  function variantCatalogs(archetypeId) {
    const source = state.data.variants[archetypeId];
    if (!source) return [];
    if (Array.isArray(source.catalogs)) return source.catalogs;
    if (Array.isArray(source.lineages)) {
      return [{
        id: 'remainder-bloodlines',
        title: 'Remainder Bloodlines',
        selectionField: 'lineageVariant',
        variants: source.lineages
      }];
    }
    return [];
  }

  function chooseVariants(archetype, rng) {
    const catalogs = variantCatalogs(archetype.id);
    const grouped = new Map();
    catalogs.forEach(catalog => {
      const field = catalog.selectionField || 'lineageVariant';
      const current = grouped.get(field) || [];
      current.push(...(catalog.variants || []).map(variant => ({ catalog, variant })));
      grouped.set(field, current);
    });

    const selections = [];
    for (const [field, options] of grouped.entries()) {
      if (!options.length) continue;
      if (field === 'humanInvestigatorPractice' && rng() < 0.25) {
        selections.push({ field, name: 'Undeclared', optional: true });
        continue;
      }
      if (field === 'technomancerCareer' && rng() < 0.2) {
        selections.push({ field, name: 'Undeclared', optional: true });
        continue;
      }
      if (field === 'technomancerOrder' && rng() < 0.12) {
        selections.push({ field, name: 'Independent', optional: true });
        continue;
      }
      const selected = choice(options, rng);
      selections.push({
        field,
        catalog: selected.catalog.title || selected.catalog.id,
        ...selected.variant
      });
    }
    return selections;
  }

  function favoredFamilies(variants) {
    return new Set(variants.flatMap(variant => variant.favoredFamilies || []));
  }

  function recommendedSkills(variants) {
    return new Set(variants.flatMap(variant => variant.recommendedSkills || []));
  }

  function selectArchetype(rng) {
    const requested = ui.archetype.value;
    return requested === 'random'
      ? choice(state.data.rules.archetypes, rng)
      : state.data.rules.archetypes.find(item => item.id === requested) || state.data.rules.archetypes[0];
  }

  function selectFrame(rng) {
    const requested = ui.frame.value;
    const frames = Object.keys(state.data.content.frameProfiles || {});
    return requested === 'random' ? choice(frames, rng) : requested;
  }

  function generateIdentity(archetype, frame) {
    const rng = partRng('identity');
    const content = state.data.content;
    const frameProfile = content.frameProfiles[frame];
    const given = choice(content.firstNames, rng);
    const surname = choice(content.lastNames, rng);
    const useCallsign = rng() < 0.24;
    const callsign = choice(content.callsigns, rng);
    const name = useCallsign ? `${given} “${callsign}” ${surname}` : `${given} ${surname}`;
    const pronouns = ui.pronouns.value === 'random' ? choice(content.pronouns, rng) : ui.pronouns.value;
    const functionName = choice(frameProfile.functions, rng);
    const archetypePhrase = {
      'human-investigator': 'mortal', vampire: 'blood-fed undead', shapechanger: 'lunar-adaptive',
      'eldritch-binder': 'source-bound', 'harmonic-mutant': 'resonance-altered', technomancer: 'awakened'
    }[archetype.id] || 'exceptional';
    return {
      characterName: name,
      playerName: ui.playerName.value.trim(),
      pronouns,
      concept: `${archetypePhrase} ${functionName}`,
      currentFunction: functionName,
      affiliation: choice(content.affiliations, rng),
      personalObject: choice(content.personalObjects, rng)
    };
  }

  function generateAttributes(archetype, frame, rng) {
    const profile = state.data.content.frameProfiles[frame];
    const attributes = Object.fromEntries(allAttributes().map(name => [name, 1]));
    const preferred = new Set(profile.attributes || []);
    preferred.add(archetype.keyAttribute);
    let remaining = 9;
    while (remaining > 0) {
      const candidates = allAttributes().filter(name => attributes[name] < 4);
      const selected = weightedChoice(candidates, name => {
        let weight = 1;
        if (preferred.has(name)) weight += 5;
        if (name === archetype.keyAttribute) weight += 3;
        if (attributes[name] >= 3) weight *= 0.55;
        return weight;
      }, rng);
      attributes[selected] += 1;
      remaining -= 1;
    }
    return attributes;
  }

  function generateSkills(frame, variants, rng) {
    const profile = state.data.content.frameProfiles[frame];
    const preferred = new Set([...(profile.skills || []), ...recommendedSkills(variants)]);
    const skillNames = allSkills();
    const skills = Object.fromEntries(skillNames.map(name => [name, 0]));
    const signatureCandidates = skillNames.filter(name => preferred.has(name));
    const signatureSkill = choice(signatureCandidates.length ? signatureCandidates : skillNames, rng);
    skills[signatureSkill] = 4;
    let remaining = 20;
    while (remaining > 0) {
      const candidates = skillNames.filter(name => name !== signatureSkill && skills[name] < 3);
      const selected = weightedChoice(candidates, name => {
        let weight = preferred.has(name) ? 6 : 1;
        if (skills[name] === 0 && preferred.has(name)) weight += 2;
        if (skills[name] >= 2) weight *= 0.55;
        return weight;
      }, rng);
      skills[selected] += 1;
      remaining -= 1;
    }

    const eligible = skillNames.filter(name => skills[name] >= 2);
    const specializationSkills = shuffled(eligible, rng).sort((a, b) => {
      if (a === signatureSkill) return -1;
      if (b === signatureSkill) return 1;
      return skills[b] - skills[a];
    }).slice(0, 2);
    const specializations = specializationSkills.map(skill => ({
      skill,
      name: choice(state.data.content.specializations[skill] || [`Applied ${skill}`], rng)
    }));
    return { skills, signatureSkill, specializations };
  }

  function powerId(archetype, family, ability) {
    return `${archetype.id}::${slug(family.name)}::${ability.rank}::${slug(ability.name)}`;
  }

  function generateAbilities(archetype, variants) {
    const rng = partRng('abilities');
    const favored = favoredFamilies(variants);
    const rankOne = [];
    (archetype.powerFamilies || []).forEach(family => {
      (family.abilities || []).filter(ability => Number(ability.rank) === 1).forEach(ability => {
        rankOne.push({ family, ability, id: powerId(archetype, family, ability) });
      });
    });
    const automatic = rankOne.find(record => record.ability.name === archetype.startingAbility) || rankOne[0];
    const remaining = rankOne.filter(record => record !== automatic);
    const purchased = [];
    while (purchased.length < Math.min(2, remaining.length)) {
      const candidates = remaining.filter(record => !purchased.includes(record));
      const selected = weightedChoice(candidates, record => favored.has(record.family.name) ? 5 : 1, rng);
      purchased.push(selected);
    }
    return {
      automatic,
      purchased,
      selectedPowers: [automatic, ...purchased].filter(Boolean).map(record => record.id)
    };
  }

  function generateStatistics(archetype, frame, variants) {
    const rng = partRng('statistics');
    const attributes = generateAttributes(archetype, frame, rng);
    const skillPackage = generateSkills(frame, variants, rng);
    const rating = 1;
    const derived = {
      vitalityMax: attributes.Resilience + 5,
      guard: attributes.Finesse + attributes.Awareness,
      initiative: attributes.Finesse + attributes.Composure,
      cohesionMax: attributes.Resolve + attributes.Composure + 3,
      exposureLimit: attributes.Resolve + attributes.Resilience,
      carry: attributes.Force + attributes.Resilience,
      identityDefense: attributes.Resolve + attributes.Composure,
      pressureLimit: attributes.Composure + 5,
      powerDice: rating + attributes[archetype.keyAttribute],
      resourceMax: Number(archetype.resourceBase || 0) + rating + attributes[archetype.keyAttribute]
    };
    return { attributes, ...skillPackage, derived };
  }

  function flattenEquipment(data) {
    return (data.catalogs || []).flatMap(catalog => (catalog.items || []).map(item => ({ ...item, catalogId: catalog.id, catalogTitle: catalog.title })));
  }

  function equipmentAllowed(record, era) {
    if (era === 'mixed') return true;
    if (era === 'modern') return record.catalogId?.startsWith('modern-');
    if (era === 'historical') return ['world-war-one', 'world-war-two', 'medieval-arms-and-armor'].includes(record.catalogId);
    if (era === 'future') return record.catalogId?.startsWith('human-compatible-future-');
    if (era === 'scavenged') return ['scavenged-and-improvised-gear', 'survival-and-field-equipment'].includes(record.catalogId);
    return true;
  }

  function isWeapon(item) {
    return /weapon|firearm|explosive|projectile/i.test(item.category || '') && Number(item.damageDice || 0) > 0;
  }

  function isArmor(item) {
    return /armor|protective suit|shield|defensive field|defense|powered support/i.test(item.category || '') && Number(item.armorRating || 0) >= 0;
  }

  function chooseByPreferredNames(items, preferredNames, rng) {
    const preferred = items.filter(item => preferredNames.includes(item.name));
    return choice(preferred.length ? preferred : items, rng);
  }

  function eligibleRelics(archetype) {
    const archetypeName = archetype.name.toLowerCase();
    return (state.data.relics.relics || []).filter(relic => {
      const requirement = String(relic.wielderRequirement || '').toLowerCase();
      return requirement.includes(archetypeName)
        || requirement.startsWith('character with')
        || requirement.includes('another character')
        || requirement.includes('two willing characters');
    });
  }

  function generateGear(archetype, frame) {
    const rng = partRng('gear');
    const era = ui.equipmentEra.value;
    const profile = state.data.content.frameProfiles[frame];
    const eraItems = state.data.equipment.filter(item => equipmentAllowed(item, era));
    const universalSupport = state.data.equipment.filter(item => item.catalogId === 'survival-and-field-equipment');
    const weapons = eraItems.filter(isWeapon);
    const armors = eraItems.filter(isArmor);
    const tools = [...eraItems, ...universalSupport].filter((item, index, array) => !isWeapon(item) && !isArmor(item) && array.findIndex(other => other.id === item.id) === index);

    let primary = chooseByPreferredNames(weapons, profile.weaponKinds || [], rng);
    if (!primary) primary = choice(state.data.equipment.filter(isWeapon), rng);
    const secondaryPool = weapons.filter(item => item.id !== primary?.id && Number(item.load ?? 4) <= 1);
    const secondary = choice(secondaryPool, rng);
    let armor = chooseByPreferredNames(armors, profile.armorKinds || [], rng);
    if (!armor) armor = choice(state.data.equipment.filter(isArmor), rng);
    const preferredTools = tools.filter(item => (profile.kits || []).includes(item.name));
    const fieldKit = choice(preferredTools.length ? preferredTools : tools, rng);

    const supplyPool = state.data.equipment.filter(item =>
      /consumable|medical kit|survival tool|camp tool|power supply|repair tool|shelter/i.test(item.category || '')
      || (item.tags || []).some(tag => String(tag).startsWith('Limited'))
    );
    const supplies = shuffled(supplyPool, rng).filter((item, index, array) => array.findIndex(other => other.id === item.id) === index).slice(0, 2);

    const relic = ui.includeRelic.checked ? choice(eligibleRelics(archetype), rng) : null;
    let alienApplication = null;
    if (ui.includeAlien.checked) {
      const base = primary || fieldKit || armor;
      const baseTerms = [base?.category || '', isWeapon(base || {}) ? 'weapon' : '', isArmor(base || {}) ? 'armor' : ''].join(' ').toLowerCase();
      const templates = (state.data.alien.templates || []).filter(template =>
        (template.suitableBases || []).some(type => baseTerms.includes(String(type).toLowerCase()) || String(type).toLowerCase().includes(isWeapon(base || {}) ? 'weapon' : isArmor(base || {}) ? 'armor' : 'tool'))
      );
      const template = choice(templates.length ? templates : state.data.alien.templates, rng);
      alienApplication = template && base ? { template, base } : null;
    }

    return {
      era,
      primary,
      secondary,
      armor,
      fieldKit,
      supplies,
      relic,
      alienApplication,
      personalObject: state.character?.identity?.personalObject || ''
    };
  }

  function generateRelationships(archetype) {
    const rng = partRng('relationships');
    const content = state.data.content;
    return {
      conviction: choice(content.convictions, rng),
      touchstone: choice(content.touchstones, rng),
      groupBond: choice(content.groupBonds, rng),
      professionalObligation: choice(content.obligations, rng),
      personalBoundary: choice(content.boundaries, rng),
      debtPromise: choice(content.debts, rng),
      charlesSavedMe: choice(content.charlesSaved, rng),
      charlesNeverAnswered: choice(content.charlesNeverAnswered, rng),
      safeSite: choice(content.safeSites, rng),
      secret: choice(content.secrets, rng)
    };
  }

  function generateComplete() {
    const requestedSeed = ui.seed.value.trim();
    state.baseSeed = requestedSeed || randomSeed();
    ui.seed.value = state.baseSeed;
    state.counters = { identity: 0, statistics: 0, abilities: 0, gear: 0, relationships: 0 };

    const rootRng = makeRng(`${state.baseSeed}:root`);
    const archetype = selectArchetype(rootRng);
    const frame = selectFrame(rootRng);
    const variants = chooseVariants(archetype, rootRng);
    const identity = generateIdentity(archetype, frame);
    state.character = { archetype, frame, variants, identity };
    state.character.statistics = generateStatistics(archetype, frame, variants);
    state.character.abilities = generateAbilities(archetype, variants);
    state.character.gear = generateGear(archetype, frame);
    state.character.relationships = generateRelationships(archetype);
    render();
  }

  function reroll(part) {
    if (!state.character) return;
    state.counters[part] += 1;
    const { archetype, frame, variants } = state.character;
    if (part === 'identity') {
      state.character.identity = generateIdentity(archetype, frame);
      state.character.gear.personalObject = state.character.identity.personalObject;
    }
    if (part === 'statistics') state.character.statistics = generateStatistics(archetype, frame, variants);
    if (part === 'abilities') state.character.abilities = generateAbilities(archetype, variants);
    if (part === 'gear') state.character.gear = generateGear(archetype, frame);
    if (part === 'relationships') state.character.relationships = generateRelationships(archetype);
    render();
  }

  function itemDamage(item) {
    if (!item) return '—';
    return item.damageDice !== undefined ? `${item.damageDice} ${item.damageType || 'damage dice'}` : '—';
  }

  function itemNotes(item) {
    if (!item) return '—';
    return [...(item.tags || []), item.notes, item.effect, item.limitation].filter(Boolean).join(' · ') || '—';
  }

  function variantSummary(variant) {
    if (!variant) return '';
    const details = [variant.catalog, variant.method?.name, variant.gift?.name, variant.bane?.name, variant.practice?.name, variant.temptation?.name, variant.intrusionBreach?.name].filter(Boolean);
    return `${variant.name}${details.length ? ` — ${details.join(' · ')}` : ''}`;
  }

  function renderAttributeGroups(character) {
    return Object.entries(ATTRIBUTE_GROUPS).map(([group, names]) => `
      <section class="stat-group"><h3>${escapeHtml(group)}</h3>${names.map(name => `<div class="stat-row"><span>${escapeHtml(name)}</span><strong>${character.statistics.attributes[name]}</strong></div>`).join('')}</section>`).join('');
  }

  function renderSkills(character) {
    return Object.entries(state.data.rules.skills || {}).map(([group, names]) => `
      <section class="random-card wide"><h3>${escapeHtml(group)}</h3><div class="table-wrap"><table class="skill-table"><thead><tr><th>Skill</th><th>Rating</th><th>Generation Role</th></tr></thead><tbody>${names.map(name => `<tr class="${name === character.statistics.signatureSkill ? 'signature' : ''}"><td>${escapeHtml(name)}</td><td>${character.statistics.skills[name]}</td><td>${name === character.statistics.signatureSkill ? 'Signature Skill' : character.statistics.specializations.some(spec => spec.skill === name) ? escapeHtml(character.statistics.specializations.find(spec => spec.skill === name).name) : ''}</td></tr>`).join('')}</tbody></table></div></section>`).join('');
  }

  function renderAbilities(character) {
    const automatic = character.abilities.automatic;
    return `
      <div class="ability-list">
        ${automatic ? `<article class="ability-record ability-auto"><strong>Automatic Starting Ability — ${escapeHtml(automatic.ability.name)}</strong><span>${escapeHtml(automatic.family.name)}, Rank 1</span><p>${escapeHtml(automatic.ability.effect)}</p></article>` : ''}
        ${character.abilities.purchased.map(record => `<article class="ability-record ability-purchased"><strong>Starting Ability Point — ${escapeHtml(record.ability.name)}</strong><span>${escapeHtml(record.family.name)}, Rank 1</span><p>${escapeHtml(record.ability.effect)}</p></article>`).join('')}
      </div>`;
  }

  function audit(character) {
    const attributeTotal = Object.values(character.statistics.attributes).reduce((sum, value) => sum + value, 0);
    const skillTotal = Object.values(character.statistics.skills).reduce((sum, value) => sum + value, 0);
    const maxAttribute = Math.max(...Object.values(character.statistics.attributes));
    const maxNonSignature = Math.max(...Object.entries(character.statistics.skills).filter(([name]) => name !== character.statistics.signatureSkill).map(([, value]) => value));
    return [
      { label: `Attributes ${attributeTotal}/18`, pass: attributeTotal === 18 && maxAttribute <= 4 },
      { label: `Skills ${skillTotal}/24`, pass: skillTotal === 24 },
      { label: `Signature ${character.statistics.signatureSkill} ${character.statistics.skills[character.statistics.signatureSkill]}/4`, pass: character.statistics.skills[character.statistics.signatureSkill] === 4 },
      { label: 'Two valid specializations', pass: character.statistics.specializations.length === 2 && character.statistics.specializations.every(spec => character.statistics.skills[spec.skill] >= 2) },
      { label: 'Non-signature Skills ≤3', pass: maxNonSignature <= 3 },
      { label: 'Archetype Rating 1', pass: true },
      { label: `Starting abilities ${1 + character.abilities.purchased.length}/3`, pass: character.abilities.purchased.length === 2 },
      { label: 'Equipment package present', pass: Boolean(character.gear.primary && character.gear.armor && character.gear.fieldKit && character.gear.supplies.length === 2) }
    ];
  }

  function render() {
    const character = state.character;
    if (!character) return;
    const { identity, archetype, frame, variants, statistics, abilities, gear, relationships } = character;
    const variantText = variants.map(variantSummary).join('\n') || 'No integrated variant selected.';
    const specializationText = statistics.specializations.map(spec => `${spec.skill}: ${spec.name}`).join('\n');
    const derived = statistics.derived;
    const gearRows = [gear.primary, gear.secondary].filter(Boolean).map(item => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.attackPool || item.activation || '—')}</td><td>${escapeHtml(itemDamage(item))}</td><td>${escapeHtml(item.range || '—')}</td><td>${escapeHtml(itemNotes(item))}</td></tr>`).join('');
    const auditResults = audit(character);

    ui.output.innerHTML = `
      <article class="random-hero">
        <p class="eyebrow">Generated operative · seed ${escapeHtml(state.baseSeed)}</p>
        <h2>${escapeHtml(identity.characterName)}</h2>
        <p>${escapeHtml(identity.concept)}. ${escapeHtml(identity.currentFunction)} attached to ${escapeHtml(identity.affiliation)}.</p>
        <div class="random-badges"><span>${escapeHtml(identity.pronouns)}</span><span>${escapeHtml(archetype.name)}</span><span>${escapeHtml(frame)}</span><span>Rating 1</span><span>${escapeHtml(archetype.resourceName)} / ${escapeHtml(archetype.pressureName)}</span></div>
      </article>

      <section class="random-section">
        <div class="random-section-head"><h2>Identity and Integrated Choices</h2><button class="secondary-action no-print" type="button" data-reroll="identity">Reroll Identity</button></div>
        <div class="random-grid">
          <article class="random-card"><h3>Player</h3><p>${escapeHtml(identity.playerName || 'Unassigned')}</p></article>
          <article class="random-card"><h3>Present Function</h3><p>${escapeHtml(identity.currentFunction)}</p></article>
          <article class="random-card"><h3>Affiliation</h3><p>${escapeHtml(identity.affiliation)}</p></article>
          <article class="random-card wide"><h3>Archetype Variant Records</h3><p>${escapeHtml(variantText)}</p></article>
          <article class="random-card wide"><h3>Personal Object</h3><p>${escapeHtml(identity.personalObject)}. This object grants no unrecorded mechanical benefit.</p></article>
        </div>
      </section>

      <section class="random-section">
        <div class="random-section-head"><h2>Attributes, Skills, and Derived Traits</h2><button class="secondary-action no-print" type="button" data-reroll="statistics">Reroll Statistics</button></div>
        <div class="stat-groups">${renderAttributeGroups(character)}</div>
        <div class="random-grid" style="margin-top:12px">
          <article class="random-card"><h3>Signature Skill</h3><p>${escapeHtml(statistics.signatureSkill)} ${statistics.skills[statistics.signatureSkill]}</p></article>
          <article class="random-card"><h3>Specializations</h3><p>${escapeHtml(specializationText)}</p></article>
          <article class="random-card"><h3>Core Derived Traits</h3><p>Vitality ${derived.vitalityMax} · Guard ${derived.guard} · Initiative ${derived.initiative} · Carry ${derived.carry}</p></article>
          <article class="random-card"><h3>Continuity Traits</h3><p>Cohesion ${derived.cohesionMax} · Exposure Limit ${derived.exposureLimit} · Identity Defense ${derived.identityDefense}</p></article>
          <article class="random-card"><h3>Archetype Tracks</h3><p>${escapeHtml(archetype.resourceName)} ${derived.resourceMax} · ${escapeHtml(archetype.pressureName)} Limit ${derived.pressureLimit} · Power Dice ${derived.powerDice}</p></article>
        </div>
        <div class="random-grid" style="margin-top:12px">${renderSkills(character)}</div>
      </section>

      <section class="random-section">
        <div class="random-section-head"><h2>Starting Powers and Capabilities</h2><button class="secondary-action no-print" type="button" data-reroll="abilities">Reroll Purchased Abilities</button></div>
        ${renderAbilities(character)}
        <div class="random-grid" style="margin-top:12px">
          <article class="random-card"><h3>Weakness</h3><p><strong>${escapeHtml(archetype.weakness)}:</strong> ${escapeHtml(archetype.weaknessText)}</p></article>
          <article class="random-card wide"><h3>Innate Abilities</h3><p>${escapeHtml((archetype.innateAbilities || []).map(item => `${item.name}: ${item.effect}`).join('\n\n'))}</p></article>
        </div>
      </section>

      <section class="random-section">
        <div class="random-section-head"><h2>Weapons, Protection, and Equipment</h2><button class="secondary-action no-print" type="button" data-reroll="gear">Reroll Equipment</button></div>
        <div class="table-wrap"><table class="gear-table"><thead><tr><th>Weapon</th><th>Pool</th><th>Damage</th><th>Range</th><th>Tags and Notes</th></tr></thead><tbody>${gearRows || '<tr><td colspan="5">No weapon generated.</td></tr>'}</tbody></table></div>
        <div class="random-grid" style="margin-top:12px">
          <article class="random-card"><h3>Armor</h3><p>${escapeHtml(gear.armor ? `${gear.armor.name} — Armor ${gear.armor.armorRating ?? 0}, Load ${gear.armor.load ?? 0}. ${itemNotes(gear.armor)}` : 'None')}</p></article>
          <article class="random-card"><h3>Field Kit</h3><p>${escapeHtml(gear.fieldKit ? `${gear.fieldKit.name}: ${gear.fieldKit.effect || gear.fieldKit.notes || 'Serviceable role-appropriate field equipment.'}` : 'None')}</p></article>
          <article class="random-card"><h3>Supplies</h3><p>${escapeHtml(gear.supplies.map(item => item.name).join('\n'))}</p></article>
          ${gear.relic ? `<article class="random-card wide"><h3>Supernatural Relic</h3><p>${escapeHtml(`${gear.relic.name}\nRequirement: ${gear.relic.wielderRequirement}\nAttunement: ${gear.relic.attunement}\nEffect: ${gear.relic.effect}\nLimit: ${gear.relic.limit}`)}</p></article>` : ''}
          ${gear.alienApplication ? `<article class="random-card wide"><h3>Alien Technology Application</h3><p>${escapeHtml(`${gear.alienApplication.template.name} applied to ${gear.alienApplication.base.name}.\nInterface: ${gear.alienApplication.template.interface}\nModification: ${gear.alienApplication.template.modification}\nBenefit: ${gear.alienApplication.template.benefit}\nInstability: ${gear.alienApplication.template.instability}\nFailure: ${gear.alienApplication.template.failure}`)}</p></article>` : ''}
          <article class="random-card wide"><h3>No Return Signal Opening Rule</h3><p>This equipment is the operative's training profile and preferred requisition package. The campaign opening may still begin with minimal fabricated clothing, no familiar weapons, and no guaranteed carried equipment.</p></article>
        </div>
      </section>

      <section class="random-section">
        <div class="random-section-head"><h2>Bonds, Convictions, and Commitments</h2><button class="secondary-action no-print" type="button" data-reroll="relationships">Reroll Relationships</button></div>
        <div class="random-grid">
          <article class="random-card"><h3>Defining Conviction</h3><p>${escapeHtml(relationships.conviction)}</p></article>
          <article class="random-card"><h3>Touchstone</h3><p>${escapeHtml(relationships.touchstone)}</p></article>
          <article class="random-card"><h3>Group Bond</h3><p>${escapeHtml(relationships.groupBond)}</p></article>
          <article class="random-card"><h3>Professional Obligation</h3><p>${escapeHtml(relationships.professionalObligation)}</p></article>
          <article class="random-card"><h3>Personal Boundary</h3><p>${escapeHtml(relationships.personalBoundary)}</p></article>
          <article class="random-card"><h3>Debt, Promise, or Contract</h3><p>${escapeHtml(relationships.debtPromise)}</p></article>
          <article class="random-card"><h3>Charles Once Saved Me By…</h3><p>${escapeHtml(relationships.charlesSavedMe)}</p></article>
          <article class="random-card"><h3>Charles Never Answered Me About…</h3><p>${escapeHtml(relationships.charlesNeverAnswered)}</p></article>
          <article class="random-card"><h3>Safe Site</h3><p>${escapeHtml(relationships.safeSite)}</p></article>
          <article class="random-card"><h3>Secret or Complication</h3><p>${escapeHtml(relationships.secret)}</p></article>
        </div>
      </section>

      <section class="random-section">
        <div class="random-section-head"><h2>Legality Audit</h2></div>
        <div class="audit">${auditResults.map(result => `<span class="${result.pass ? 'pass' : 'fail'}">${result.pass ? 'PASS' : 'FAIL'} · ${escapeHtml(result.label)}</span>`).join('')}</div>
      </section>`;

    ui.output.querySelectorAll('[data-reroll]').forEach(button => button.addEventListener('click', () => reroll(button.dataset.reroll)));
    ui.transfer.disabled = false;
    ui.export.disabled = false;
    ui.print.disabled = false;
    ui.status.textContent = `Generated ${identity.characterName}. All standard creation totals were audited before display.`;
  }

  function equipmentText(character) {
    const gear = character.gear;
    const lines = [];
    if (gear.fieldKit) lines.push(`Field Kit — ${gear.fieldKit.name}: ${gear.fieldKit.effect || gear.fieldKit.notes || 'Serviceable role equipment.'}`);
    gear.supplies.forEach(item => lines.push(`Supply — ${item.name}: ${item.effect || item.notes || item.uses || 'Common consumable.'}`));
    lines.push(`Personal Object — ${character.identity.personalObject} (no unrecorded mechanical benefit).`);
    if (gear.relic) lines.push(`Relic — ${gear.relic.name}. Requirement: ${gear.relic.wielderRequirement}. Effect: ${gear.relic.effect}. Limit: ${gear.relic.limit}.`);
    if (gear.alienApplication) lines.push(`Alien Template — ${gear.alienApplication.template.name} applied to ${gear.alienApplication.base.name}. ${gear.alienApplication.template.modification} Benefit: ${gear.alienApplication.template.benefit} Instability: ${gear.alienApplication.template.instability}`);
    return lines.join('\n\n');
  }

  function variantFieldValues(character) {
    const fields = {};
    character.variants.forEach(variant => {
      if (variant.field) fields[variant.field] = variant.name;
    });
    return fields;
  }

  function sheetPayload() {
    const character = state.character;
    const { identity, archetype, frame, statistics, abilities, gear, relationships } = character;
    const fields = {
      characterName: identity.characterName,
      playerName: identity.playerName,
      pronouns: identity.pronouns,
      campaign: 'No Return Signal',
      concept: identity.concept,
      archetype: archetype.id,
      archetypeRating: '1',
      operationalFrame: frame,
      currentFunction: identity.currentFunction,
      affiliation: identity.affiliation,
      advancement: '0',
      force: String(statistics.attributes.Force),
      finesse: String(statistics.attributes.Finesse),
      resilience: String(statistics.attributes.Resilience),
      presence: String(statistics.attributes.Presence),
      guile: String(statistics.attributes.Guile),
      composure: String(statistics.attributes.Composure),
      reason: String(statistics.attributes.Reason),
      awareness: String(statistics.attributes.Awareness),
      resolve: String(statistics.attributes.Resolve),
      vitalityCurrent: String(statistics.derived.vitalityMax),
      cohesionCurrent: String(statistics.derived.cohesionMax),
      exposureCurrent: '0',
      armorRating: String(gear.armor?.armorRating || 0),
      resourceCurrent: String(statistics.derived.resourceMax),
      pressureCurrent: '0',
      specializations: statistics.specializations.map(spec => `${spec.skill}: ${spec.name}`).join('\n'),
      customAbilities: character.variants.map(variant => {
        const feature = variant.method || variant.gift || variant.practice || variant.temptation;
        const bane = variant.bane ? ` Bane — ${variant.bane.name}: ${variant.bane.effect}` : '';
        const breach = variant.intrusionBreach ? ` Intrusion Breach — ${variant.intrusionBreach.name}: ${variant.intrusionBreach.effect}` : '';
        return feature ? `${variant.name} — ${feature.name}: ${feature.effect}${bane}${breach}` : `${variant.name}${bane}${breach}`;
      }).join('\n\n'),
      conviction: relationships.conviction,
      touchstone: relationships.touchstone,
      groupBond: relationships.groupBond,
      professionalObligation: relationships.professionalObligation,
      personalBoundary: relationships.personalBoundary,
      debtPromise: relationships.debtPromise,
      charlesSavedMe: relationships.charlesSavedMe,
      charlesNeverAnswered: relationships.charlesNeverAnswered,
      signatureCapability: abilities.automatic ? `${abilities.automatic.ability.name}: ${abilities.automatic.ability.effect}` : archetype.startingAbility,
      capabilityExpression: `${archetype.name}. ${character.variants.map(variant => variant.name).join(', ') || 'No integrated variant'}.`,
      capabilityLimitation: `${archetype.weakness}: ${archetype.weaknessText}`,
      currentForm: CURRENT_FORMS[archetype.id] || 'Baseline operating state.',
      adaptations: gear.alienApplication ? `${gear.alienApplication.template.name} applied to ${gear.alienApplication.base.name}: ${gear.alienApplication.template.modification}` : '',
      conditions: '',
      armorAndProtection: gear.armor ? `${gear.armor.name} — Armor ${gear.armor.armorRating || 0}, Load ${gear.armor.load || 0}. ${itemNotes(gear.armor)}` : 'No armor selected.',
      equipment: equipmentText(character),
      contacts: `${identity.affiliation}. Touchstone: ${relationships.touchstone}.`,
      safeSite: relationships.safeSite,
      characterNotes: `Generated from seed ${state.baseSeed}.\n\nPersonal object: ${identity.personalObject}.\n\nNo Return Signal opening rule: listed equipment represents training and preferred requisition; the opening scene may provide none of it.`,
      secrets: relationships.secret,
      advancementPurchases: `Automatic Starting Ability: ${abilities.automatic?.ability.name || archetype.startingAbility}.\nStarting Ability Point 1: ${abilities.purchased[0]?.ability.name || 'Unspent'}.\nStarting Ability Point 2: ${abilities.purchased[1]?.ability.name || 'Unspent'}.`,
      missionRecord: ''
    };

    Object.entries(statistics.skills).forEach(([skill, value]) => {
      fields[`skill_${fieldSlug(skill)}`] = String(value);
    });
    Object.assign(fields, variantFieldValues(character));

    [gear.primary, gear.secondary].filter(Boolean).slice(0, 4).forEach((item, index) => {
      const slot = index + 1;
      fields[`weapon${slot}`] = item.name;
      fields[`weapon${slot}Pool`] = item.attackPool || item.activation || '';
      fields[`weapon${slot}Damage`] = itemDamage(item);
      fields[`weapon${slot}Range`] = item.range || '';
      fields[`weapon${slot}Notes`] = itemNotes(item);
    });

    if (gear.relic?.mundaneFunction) {
      const slot = 3;
      fields[`weapon${slot}`] = gear.relic.name;
      fields[`weapon${slot}Pool`] = gear.relic.pool || 'See relic record';
      fields[`weapon${slot}Damage`] = gear.relic.mundaneFunction;
      fields[`weapon${slot}Range`] = gear.relic.range || '';
      fields[`weapon${slot}Notes`] = gear.relic.effect;
    }

    return {
      schema: 'blacklight-continuum-basic-character',
      schemaVersion: '0.1.0',
      savedAt: new Date().toISOString(),
      generatedBy: 'blacklight-random-character',
      generationSeed: state.baseSeed,
      selectedPowers: abilities.selectedPowers,
      fields
    };
  }

  function transferToSheet() {
    if (!state.character) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sheetPayload()));
    location.href = 'blacklight-character-sheet.html?from=random';
  }

  function exportCharacter() {
    if (!state.character) return;
    const payload = sheetPayload();
    const fileName = `${slug(state.character.identity.characterName) || 'blacklight-operative'}-random-character.json`;
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function populateControls() {
    state.data.rules.archetypes.forEach(archetype => {
      const option = document.createElement('option');
      option.value = archetype.id;
      option.textContent = archetype.name;
      ui.archetype.appendChild(option);
    });
    Object.keys(state.data.content.frameProfiles).forEach(frame => {
      const option = document.createElement('option');
      option.value = frame;
      option.textContent = frame;
      ui.frame.appendChild(option);
    });
    state.data.content.pronouns.forEach(pronouns => {
      const option = document.createElement('option');
      option.value = pronouns;
      option.textContent = pronouns;
      ui.pronouns.appendChild(option);
    });
  }

  async function initialize() {
    ui.playerName = document.getElementById('random-player-name');
    ui.archetype = document.getElementById('random-archetype');
    ui.frame = document.getElementById('random-frame');
    ui.pronouns = document.getElementById('random-pronouns');
    ui.equipmentEra = document.getElementById('random-equipment-era');
    ui.seed = document.getElementById('random-seed');
    ui.includeRelic = document.getElementById('random-include-relic');
    ui.includeAlien = document.getElementById('random-include-alien');
    ui.generate = document.getElementById('random-generate');
    ui.transfer = document.getElementById('random-transfer');
    ui.export = document.getElementById('random-export');
    ui.print = document.getElementById('random-print');
    ui.status = document.getElementById('random-status');
    ui.output = document.getElementById('random-output');

    try {
      const loaded = await Promise.all(Object.values(URLS).map(fetchJson));
      const mapped = Object.fromEntries(Object.keys(URLS).map((key, index) => [key, loaded[index]]));
      state.data = {
        ...mapped,
        variants: {
          'human-investigator': mapped.human,
          vampire: mapped.vampire,
          shapechanger: mapped.shapechanger,
          'eldritch-binder': mapped.eldritch,
          'harmonic-mutant': mapped.harmonic,
          technomancer: mapped.technomancer
        },
        equipment: [...flattenEquipment(mapped.historicalEquipment), ...flattenEquipment(mapped.futureEquipment)]
      };
      populateControls();
      ui.generate.addEventListener('click', generateComplete);
      ui.transfer.addEventListener('click', transferToSheet);
      ui.export.addEventListener('click', exportCharacter);
      ui.print.addEventListener('click', () => window.print());
      ui.status.textContent = `${state.data.rules.archetypes.length} Archetypes, ${Object.keys(state.data.content.frameProfiles).length} Operational Frames, and ${state.data.equipment.length} ordinary equipment records loaded. Generate an operative when ready.`;
      ui.output.innerHTML = '<div class="random-empty">Choose any fixed parameters above or leave everything Random, then generate a complete operative.</div>';
    } catch (error) {
      ui.status.textContent = `The random character generator could not be loaded: ${error.message}`;
      ui.output.innerHTML = '<div class="random-empty">Serve the project through GitHub Pages or a local web server and verify the character and equipment JSON files.</div>';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
