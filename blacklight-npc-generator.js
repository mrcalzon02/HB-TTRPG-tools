(() => {
  'use strict';

  const DATA_URL = 'data/blacklight-continuum/generators/npc-generator-content.json';
  const STORAGE_KEY = 'hb-ttrpg-tools-blacklight-npc-generator-v1';

  const state = {
    data: null,
    profile: null,
    seed: '',
    counters: { identity: 0, role: 0, power: 0 }
  };

  const ui = {};

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function hashSeed(text) {
    let hash = 2166136261;
    for (const character of String(text)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function mulberry32(seed) {
    return function random() {
      let value = seed += 0x6D2B79F5;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  function createSeed() {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID().split('-').slice(0, 2).join('-');
    return `npc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function pick(items, rng) {
    if (!Array.isArray(items) || !items.length) return null;
    return items[Math.floor(rng() * items.length)];
  }

  function uniquePicks(items, count, rng) {
    const pool = [...new Set((items || []).filter(Boolean))];
    const result = [];
    while (pool.length && result.length < count) {
      result.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    }
    return result;
  }

  function weightedPick(items, weightFor, rng) {
    const weighted = (items || []).map(item => ({ item, weight: Math.max(0.01, Number(weightFor(item)) || 0.01) }));
    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = rng() * total;
    for (const entry of weighted) {
      roll -= entry.weight;
      if (roll <= 0) return entry.item;
    }
    return weighted[weighted.length - 1]?.item || null;
  }

  function titleCase(value) {
    return String(value ?? '').replace(/(^|[-_\s]+)([a-z])/g, (_, gap, letter) => `${gap ? ' ' : ''}${letter.toUpperCase()}`).trim();
  }

  function findById(items, id) {
    return (items || []).find(item => String(item.id) === String(id)) || null;
  }

  function isCompatible(category, power) {
    const [min, max] = category.range || [1, 10];
    return power >= min && power <= max;
  }

  function controlsSignature() {
    return [ui.power.value, ui.category.value, ui.role.value, ui.environment.value].join('|');
  }

  function rngFor(section) {
    const counter = state.counters[section] || 0;
    return mulberry32(hashSeed(`${state.seed}|${controlsSignature()}|${section}|${counter}`));
  }

  function populateSelect(select, items, randomLabel, labelFor = item => item.label || item) {
    select.innerHTML = `<option value="random">${escapeHtml(randomLabel)}</option>` +
      items.map(item => `<option value="${escapeHtml(item.id ?? item)}">${escapeHtml(labelFor(item))}</option>`).join('');
  }

  function initializeControls() {
    populateSelect(ui.power, state.data.powerLevels, 'Random Power Class', item => `Power ${item.id}`);
    populateSelect(ui.category, state.data.categories, 'Random Category');
    populateSelect(ui.role, state.data.roles.map(role => ({ id: role, label: titleCase(role) })), 'Random Role');
    populateSelect(ui.environment, state.data.environments.map(environment => ({ id: environment, label: environment })), 'Random Environment');
  }

  function choosePower(rng, selectedCategory = null) {
    if (ui.power.value !== 'random') return Number(ui.power.value);
    if (selectedCategory && ui.category.value !== 'random') {
      const [min, max] = selectedCategory.range || [1, 10];
      return min + Math.floor(rng() * (max - min + 1));
    }
    return weightedPick(state.data.powerLevels, level => ({ 1: 4, 2: 7, 3: 8, 4: 7, 5: 7, 6: 4, 7: 3, 8: 2, 9: 0.8, 10: 0.35 }[level.id] || 1), rng).id;
  }

  function chooseCategory(power, rng) {
    if (ui.category.value !== 'random') return findById(state.data.categories, ui.category.value) || state.data.categories[0];
    const compatible = state.data.categories.filter(category => isCompatible(category, power));
    return pick(compatible.length ? compatible : state.data.categories, rng) || state.data.categories[0];
  }

  function namePoolFor(category, power) {
    if (power >= 9 || category.id === 'cosmic-sovereign') return state.data.names.cosmic;
    if (category.id === 'machine-intelligence') return state.data.names.machine;
    if (['otherworldly-entity', 'eldritch-bound', 'monster-beast', 'alien-remnant'].includes(category.id) || power >= 7) return state.data.names.entity;
    if (['mundane-vermin', 'mundane-animal'].includes(category.id)) return [];
    return state.data.names.human;
  }

  function diceGuidance(power) {
    if (power <= 1) return '1-2 dice when a roll matters; usually not a combatant.';
    if (power === 2) return '2-3 dice for ordinary action; stress breaks them quickly.';
    if (power === 3) return '3-5 dice in trained tasks; mundane but dangerous to civilians.';
    if (power === 4) return '5-7 dice in core competency; one significant trick or resource.';
    if (power === 5) return '7-9 dice in focus areas; standard serious operative threat.';
    if (power === 6) return '9-11 dice in major actions; demands teamwork or preparation.';
    if (power === 7) return '11-14 dice or multiple scene tools; named regional threat.';
    if (power === 8) return '14-18 dice where dice still matter; usually an arc-scale problem.';
    if (power === 9) return 'Narrative-tier opposition; rolls decide survival, leverage, access, or consequence.';
    return 'Do not use as a normal stat block. Define domain, permission, cost, limits, and what lesser beings can influence.';
  }

  function threatUse(power) {
    if (power <= 2) return 'Use as evidence, moral pressure, witness, dependency, omen, or vulnerable thing at risk.';
    if (power <= 4) return 'Use as complication, local obstacle, support contact, low-tier combatant, or public-facing liability.';
    if (power <= 6) return 'Use as a serious scene threat, ally, handler, monster, operative rival, or specialist with leverage.';
    if (power <= 8) return 'Use as a named antagonist, patron, court agent, territory holder, or operation-defining force.';
    return 'Use as campaign structure, cosmic pressure, impossible authority, or a being negotiated around rather than simply attacked.';
  }

  function buildProfile() {
    const powerRng = rngFor('power');
    const categoryFromControl = ui.category.value !== 'random' ? findById(state.data.categories, ui.category.value) : null;
    const power = choosePower(powerRng, categoryFromControl);
    const level = state.data.powerLevels[power - 1] || state.data.powerLevels[0];

    const identityRng = rngFor('identity');
    const roleRng = rngFor('role');
    const category = chooseCategory(power, identityRng);
    const archetype = pick(category.archetypes, identityRng) || category.label;
    const specimen = pick(category.examples, identityRng) || category.label;
    const namePool = namePoolFor(category, power);
    const name = pick(namePool, identityRng) || `${titleCase(specimen)} #${String(hashSeed(state.seed + category.id) % 900 + 100)}`;
    const role = ui.role.value === 'random' ? pick(state.data.roles, roleRng) : ui.role.value;
    const environment = ui.environment.value === 'random' ? pick(state.data.environments, roleRng) : ui.environment.value;
    const faction = pick(state.data.factions, roleRng);
    const temperament = pick(state.data.temperaments, roleRng);
    const motive = pick(state.data.motives, roleRng);
    const complication = pick(state.data.complications, roleRng);
    const capabilityCount = Math.min(6, Math.max(2, Math.ceil(power / 2) + 1));
    const capabilities = uniquePicks([...(category.capabilityTags || []), ...state.data.generalCapabilities], capabilityCount, identityRng);
    const limitations = uniquePicks([...(category.limits || []), ...state.data.generalLimitations], power >= 8 ? 4 : 3, roleRng);
    const outOfBand = !isCompatible(category, power);

    return {
      seed: state.seed,
      power,
      level,
      category,
      archetype,
      specimen,
      name,
      role,
      environment,
      faction,
      temperament,
      motive,
      complication,
      capabilities,
      limitations,
      outOfBand,
      diceGuidance: diceGuidance(power),
      threatUse: threatUse(power)
    };
  }

  function meter(power) {
    return `<div class="power-meter" aria-label="Power Class ${power} of 10">${Array.from({ length: 10 }, (_, index) => `<i class="${index < power ? 'active' : ''}"></i>`).join('')}</div>`;
  }

  function renderList(items) {
    return `<ul class="npc-list">${(items || []).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
  }

  function renderProfile() {
    const profile = state.profile;
    if (!profile) return;
    ui.output.innerHTML = `
      <section class="npc-hero">
        <p class="eyebrow">Generated NPC / Entity</p>
        <h2>${escapeHtml(profile.name)}</h2>
        <p>${escapeHtml(profile.category.label)} · ${escapeHtml(profile.archetype)} · ${escapeHtml(titleCase(profile.role))}</p>
        <div class="npc-badges">
          <span>Power Class ${profile.power}</span>
          <span>${escapeHtml(profile.level.label)}</span>
          <span>${escapeHtml(profile.faction)}</span>
          <span>Seed: ${escapeHtml(profile.seed)}</span>
        </div>
        ${meter(profile.power)}
      </section>

      <section class="npc-section">
        <div class="npc-section-head">
          <div><h2>Classification</h2><p>${escapeHtml(profile.level.scale)}</p></div>
        </div>
        <div class="npc-grid">
          <article class="npc-card"><h3>Specimen / Presentation</h3><p>${escapeHtml(profile.specimen)}</p></article>
          <article class="npc-card"><h3>Temperament</h3><p>${escapeHtml(profile.temperament)}</p></article>
          <article class="npc-card"><h3>Operating Environment</h3><p>${escapeHtml(profile.environment)}</p></article>
          <article class="npc-card"><h3>Mechanical Handling</h3><p>${escapeHtml(profile.diceGuidance)}</p></article>
          <article class="npc-card"><h3>Encounter Use</h3><p>${escapeHtml(profile.threatUse)}</p></article>
          <article class="npc-card"><h3>Motive</h3><p>${escapeHtml(profile.motive)}</p></article>
          <article class="npc-card wide"><h3>Power Class Note</h3><p>${escapeHtml(profile.level.narrative)}${profile.outOfBand ? '\n\nOut-of-band result: the selected category does not normally occupy this Power Class. Treat this as an exceptional specimen, joke of reality, artificial amplification, downgrade, or deliberate campaign anomaly.' : ''}</p></article>
        </div>
      </section>

      <section class="npc-section">
        <div class="npc-section-head"><div><h2>Capabilities and Limits</h2><p>Capabilities define what the NPC can push into the scene. Limits define how players can survive, bargain, trap, redirect, shame, expose, contain, or meaningfully affect it.</p></div></div>
        <div class="npc-grid">
          <article class="npc-card double"><h3>Capabilities</h3>${renderList(profile.capabilities)}</article>
          <article class="npc-card"><h3>Limitations</h3>${renderList(profile.limitations)}</article>
          <article class="npc-card wide"><h3>Complication</h3><p>${escapeHtml(profile.complication)}</p></article>
        </div>
      </section>

      <section class="npc-section">
        <h2>Power Scale Reference</h2>
        <p class="npc-callout"><strong>Power Class 1</strong> starts at insignificant mundane creatures such as mice, ants, vermin, and fragile ordinary beings. <strong>Power Class 10</strong> reaches Charles-tier extravagant limited sovereigns: entities capable of continent, stellar, dimensional, or existential feats while still having strange prohibitions, costs, domains, blind spots, or political constraints.</p>
      </section>`;
  }

  function plainText(profile) {
    if (!profile) return '';
    return [
      profile.name,
      `Seed: ${profile.seed}`,
      `Power Class: ${profile.power} — ${profile.level.label}`,
      `Category: ${profile.category.label}`,
      `Archetype: ${profile.archetype}`,
      `Specimen: ${profile.specimen}`,
      `Role: ${titleCase(profile.role)}`,
      `Faction: ${profile.faction}`,
      `Environment: ${profile.environment}`,
      `Temperament: ${profile.temperament}`,
      `Motive: ${profile.motive}`,
      `Mechanical Handling: ${profile.diceGuidance}`,
      `Encounter Use: ${profile.threatUse}`,
      '',
      'Capabilities:',
      ...profile.capabilities.map(item => `- ${item}`),
      '',
      'Limitations:',
      ...profile.limitations.map(item => `- ${item}`),
      '',
      `Complication: ${profile.complication}`
    ].join('\n');
  }

  function generate() {
    state.seed = ui.seed.value.trim() || createSeed();
    ui.seed.value = state.seed;
    state.profile = buildProfile();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ seed: state.seed, controls: controlsSignature(), profile: state.profile })); } catch (_) {}
    renderProfile();
    ui.copy.disabled = false;
    ui.export.disabled = false;
    ui.print.disabled = false;
    ui.rerollIdentity.disabled = false;
    ui.rerollRole.disabled = false;
    ui.rerollPower.disabled = false;
    ui.status.textContent = `Generated ${state.profile.name} at Power Class ${state.profile.power}.`;
  }

  function reroll(section) {
    state.counters[section] = (state.counters[section] || 0) + 1;
    if (!state.seed) state.seed = ui.seed.value.trim() || createSeed();
    ui.seed.value = state.seed;
    state.profile = buildProfile();
    renderProfile();
    ui.status.textContent = `Rerolled ${section} for ${state.profile.name}.`;
  }

  async function copyBrief() {
    const text = plainText(state.profile);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      ui.status.textContent = 'NPC brief copied to clipboard.';
    } catch (_) {
      ui.status.textContent = 'Clipboard copy failed. Use export or print instead.';
    }
  }

  function exportJson() {
    if (!state.profile) return;
    const safe = state.profile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'blacklight-npc';
    const url = URL.createObjectURL(new Blob([JSON.stringify(state.profile, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safe}-pc${state.profile.power}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function initialize() {
    ui.power = document.getElementById('npc-power');
    ui.category = document.getElementById('npc-category');
    ui.role = document.getElementById('npc-role');
    ui.environment = document.getElementById('npc-environment');
    ui.seed = document.getElementById('npc-seed');
    ui.generate = document.getElementById('npc-generate');
    ui.rerollIdentity = document.getElementById('npc-reroll-identity');
    ui.rerollRole = document.getElementById('npc-reroll-role');
    ui.rerollPower = document.getElementById('npc-reroll-power');
    ui.copy = document.getElementById('npc-copy');
    ui.export = document.getElementById('npc-export');
    ui.print = document.getElementById('npc-print');
    ui.status = document.getElementById('npc-status');
    ui.output = document.getElementById('npc-output');

    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`NPC data request failed with status ${response.status}.`);
      state.data = await response.json();
      initializeControls();
      ui.generate.addEventListener('click', generate);
      ui.rerollIdentity.addEventListener('click', () => reroll('identity'));
      ui.rerollRole.addEventListener('click', () => reroll('role'));
      ui.rerollPower.addEventListener('click', () => reroll('power'));
      ui.copy.addEventListener('click', copyBrief);
      ui.export.addEventListener('click', exportJson);
      ui.print.addEventListener('click', () => window.print());
      ui.status.textContent = 'NPC and entity generator ready. Choose parameters or generate a fully random being.';
    } catch (error) {
      ui.status.textContent = `The NPC generator could not load: ${error.message}`;
      ui.output.innerHTML = '<div class="npc-empty">NPC generator data could not be loaded. Serve the project through GitHub Pages or a local web server.</div>';
      ui.generate.disabled = true;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
