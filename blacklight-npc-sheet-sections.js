(() => {
  'use strict';

  const SECTION_GROUPS = {
    human: {
      title: 'Humans and Human-Adjacent Operatives',
      short: 'Human / Human-Adjacent',
      description: 'Full character-style sheet: attributes, derived values, skills, access, equipment, stress, and operative handling.',
      categories: ['civilian','corporate-staff','operative','security-military','human-vigil','vampire-remainder','shapechanger','harmonic-compact','technomancer','eldritch-bound','eldritch-cultist']
    },
    creature: {
      title: 'Creatures and Embodied Entities',
      short: 'Creature / Embodied Entity',
      description: 'Creature-style sheet: character-like stats plus natural weapons, senses, movement, instincts, corpus, and unusual biology.',
      categories: ['mundane-vermin','mundane-animal','monster-beast','alien-remnant','machine-intelligence','eldritch-intrusion-creature','eldritch-vessel']
    },
    corpus: {
      title: 'True Entities and Corpus-Scale Powers',
      short: 'True Entity / Corpus',
      description: 'Corpus sheet only: domain, anchor, manifestation pressure, propagation medium, containment handles, and ability-relevant stats.',
      categories: ['eldritch-cognitohazard','eldritch-apex-incursion','otherworldly-entity','cosmic-sovereign']
    }
  };

  const CATEGORY_TO_GROUP = Object.fromEntries(Object.entries(SECTION_GROUPS).flatMap(([group, data]) => data.categories.map(category => [category, group])));
  const CATEGORY_LABEL_HINTS = [
    ['Mundane Vermin or Tiny Animal', 'creature'], ['Mundane Animal or Beast', 'creature'], ['Monster, Cryptid, or Beastly Horror', 'creature'], ['Alien Remnant or Nonhuman Technology Actor', 'creature'], ['Machine Intelligence, AI Fragment, or Automated System', 'creature'], ['High-Clearance Eldritch Intrusion Creature', 'creature'], ['Eldritch Vessel or Incursion Host', 'creature'],
    ['Eldritch Cognitohazard Manifestation', 'corpus'], ['Charles-Restricted Apex Eldritch Incursion', 'corpus'], ['Otherworldly Entity, Court Power, or Deific Agent', 'corpus'], ['Cosmic Sovereign, Charles-Tier Intelligence, or Reality Actor', 'corpus']
  ];

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  }

  function hashSeed(text) {
    let hash = 2166136261;
    for (const character of String(text)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function rngFrom(text) {
    let seed = hashSeed(text);
    return () => {
      seed += 0x6D2B79F5;
      let value = seed;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  function pick(list, rng) {
    return list[Math.floor(rng() * list.length)] || list[0];
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function injectStyle() {
    if (document.getElementById('npc-sheet-sections-style')) return;
    const style = document.createElement('style');
    style.id = 'npc-sheet-sections-style';
    style.textContent = `
      .npc-generator-sections{border:1px solid var(--line);border-radius:18px;padding:16px;background:rgba(0,0,0,.22);margin-bottom:14px}.npc-generator-sections h2{margin:0}.npc-generator-sections>p{color:var(--muted);line-height:1.55}.npc-section-picker-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}.npc-section-picker{border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.025);padding:12px}.npc-section-picker h3{margin:0 0 6px;color:var(--accent);font-size:.92rem}.npc-section-picker p{margin:0 0 10px;color:var(--muted);line-height:1.45}.npc-section-picker button{border:1px solid rgba(200,138,53,.62);border-radius:999px;background:rgba(200,138,53,.12);color:var(--ink);padding:8px 10px;font-weight:800;cursor:pointer}.npc-section-picker button:hover{background:rgba(200,138,53,.24)}.npc-sheet-mode-section .npc-card.stat-card p{font-size:1.05rem;color:var(--ink);font-weight:800}.npc-sheet-mode-section .npc-card.stat-card small{display:block;color:var(--muted);font-weight:400;margin-top:4px;line-height:1.35}.npc-stat-row{display:grid;grid-template-columns:1fr auto;gap:8px;border-bottom:1px solid rgba(255,255,255,.07);padding:6px 0;color:var(--muted)}.npc-stat-row:last-child{border-bottom:0}.npc-stat-row strong{color:var(--ink)}.npc-mode-badge{display:inline-block;border:1px solid rgba(200,138,53,.65);border-radius:999px;padding:5px 9px;color:var(--accent);font-weight:900;text-transform:uppercase;letter-spacing:.06em;font-size:.74rem;margin-bottom:8px}@media(max-width:900px){.npc-section-picker-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function insertPickerPanel() {
    if (document.getElementById('npc-generator-sections')) return;
    const controls = document.querySelector('.npc-controls');
    if (!controls) return;
    const panel = document.createElement('section');
    panel.id = 'npc-generator-sections';
    panel.className = 'npc-generator-sections no-print';
    panel.innerHTML = `
      <p class="eyebrow">Generator sections</p>
      <h2>Choose the kind of sheet first.</h2>
      <p>The generator now separates beings by how they should be handled at the table: full human-like character sheets, embodied creature/entity sheets with natural abilities, or true entity corpus sheets where only the relevant manifestation and ability stats matter.</p>
      <div class="npc-section-picker-grid">
        ${Object.entries(SECTION_GROUPS).map(([key, group]) => `<article class="npc-section-picker"><h3>${escapeHtml(group.title)}</h3><p>${escapeHtml(group.description)}</p><button type="button" data-npc-section-pick="${escapeHtml(key)}">Generate ${escapeHtml(group.short)}</button></article>`).join('')}
      </div>`;
    controls.insertAdjacentElement('beforebegin', panel);
    panel.addEventListener('click', event => {
      const button = event.target.closest('[data-npc-section-pick]');
      if (!button) return;
      generateSection(button.dataset.npcSectionPick);
    });
  }

  function generateSection(groupKey) {
    const group = SECTION_GROUPS[groupKey];
    const category = document.getElementById('npc-category');
    const power = document.getElementById('npc-power');
    const seed = document.getElementById('npc-seed');
    const generate = document.getElementById('npc-generate');
    if (!group || !category || !generate) return;
    const available = group.categories.filter(id => Array.from(category.options).some(option => option.value === id));
    const rng = rngFrom(`${groupKey}|${Date.now()}|${Math.random()}`);
    category.value = pick(available.length ? available : group.categories, rng);
    if (power) power.value = 'random';
    if (seed && !seed.value.trim()) seed.value = `${groupKey}-${Date.now().toString(36)}`;
    generate.click();
  }

  function readProfileMeta() {
    const hero = document.querySelector('#npc-output .npc-hero');
    if (!hero) return null;
    const name = hero.querySelector('h2')?.textContent?.trim() || 'Generated being';
    const descriptor = hero.querySelector('p:not(.eyebrow)')?.textContent?.trim() || '';
    const categoryLabel = descriptor.split('·')[0]?.trim() || '';
    const badges = Array.from(hero.querySelectorAll('.npc-badges span')).map(span => span.textContent.trim());
    const powerText = badges.find(text => /Power Class/i.test(text)) || 'Power Class 4';
    const seedText = badges.find(text => /^Seed:/i.test(text)) || '';
    const power = Number((powerText.match(/\d+/) || ['4'])[0]);
    const seed = seedText.replace(/^Seed:\s*/i, '') || name;
    return { name, descriptor, categoryLabel, power, seed };
  }

  function inferGroup(meta) {
    const categorySelect = document.getElementById('npc-category');
    const selected = categorySelect?.value;
    if (selected && selected !== 'random' && CATEGORY_TO_GROUP[selected]) return CATEGORY_TO_GROUP[selected];
    const hinted = CATEGORY_LABEL_HINTS.find(([label]) => meta.categoryLabel === label);
    if (hinted) return hinted[1];
    if (meta.power >= 9) return 'corpus';
    return 'human';
  }

  function score(base, rng, spread = 2) {
    return clamp(Math.round(base + (rng() * spread * 2 - spread)), 1, 12);
  }

  function statRows(stats) {
    return Object.entries(stats).map(([key, value]) => `<div class="npc-stat-row"><span>${escapeHtml(key)}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
  }

  function list(items) {
    return `<ul class="npc-list">${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
  }

  function humanSheet(meta, rng) {
    const base = clamp(meta.power + 1, 2, 10);
    const attributes = {
      Body: score(base, rng), Reflex: score(base, rng), Focus: score(base, rng), Presence: score(base, rng), Knowledge: score(base, rng), Will: score(base, rng)
    };
    const skills = {
      Combat: score(meta.power + 1, rng), Investigation: score(meta.power, rng), Social: score(meta.power, rng), Technical: score(meta.power, rng), Occult: score(Math.max(1, meta.power - 1), rng), Mobility: score(meta.power, rng)
    };
    const derived = {
      Health: attributes.Body + 4,
      Stress: attributes.Will + 4,
      Initiative: attributes.Reflex + attributes.Focus,
      Defense: Math.ceil((attributes.Reflex + attributes.Body) / 2),
      Resolve: Math.ceil((attributes.Will + attributes.Presence) / 2),
      Access: score(meta.power, rng)
    };
    const gear = ['sidearm or field tool appropriate to cover identity','encrypted comms or burner contact chain','one faction-specific credential, debt, key, badge, or token','personal complication that can be pushed by players'];
    return sheetSection(meta, 'Human / Human-Adjacent Full Stat Sheet', 'Full attributes, derived values, skills, gear, social leverage, stress, and operative handling. Use this for civilians, staff, operatives, hunters, vampires, shapechangers, technomancers, and other human-adjacent actors.', [
      card('Core Attributes', statRows(attributes), 'stat-card'),
      card('Derived Values', statRows(derived), 'stat-card'),
      card('Field Skills', statRows(skills), 'stat-card'),
      card('Gear / Access / Leverage', list(gear), 'wide')
    ]);
  }

  function creatureSheet(meta, rng) {
    const base = clamp(meta.power + 1, 2, 11);
    const stats = { Body: score(base + 1, rng), Reflex: score(base, rng), Senses: score(base + 1, rng), Instinct: score(base, rng), Will: score(Math.max(1, base - 1), rng), Threat: score(base + 1, rng) };
    const derived = { Corpus: stats.Body + meta.power, Soak: Math.ceil(stats.Body / 2), Speed: stats.Reflex + 2, Grapple: stats.Body + stats.Threat, Terror: Math.ceil((stats.Threat + stats.Instinct) / 2), Containment: Math.ceil((stats.Will + stats.Corpus) / 2) };
    const abilities = ['natural weapon, bite, impact, signal strike, or body-contact threat','enhanced senses, tracking, resonance, telemetry, or alien perception','movement trick: climb, leap, burrow, phase, swarm, sprint, flight, or interface traversal','corpus behavior: regeneration, armor, segmentation, drone body, machine shell, or breach physiology'];
    return sheetSection(meta, 'Creature / Embodied Entity Stat Sheet', 'Character-like stats plus natural abilities. Use this for animals, monsters, alien remnants, machine systems, intrusion creatures, vessels, and embodied horrors that still occupy a scene as a body or body-equivalent.', [
      card('Creature Stats', statRows(stats), 'stat-card'),
      card('Derived Creature Values', statRows(derived), 'stat-card'),
      card('Natural / Platform Abilities', list(abilities), 'double'),
      card('Handling Note', `<p>Run like a character-scale opponent, but let natural abilities alter positioning, evidence, injury, containment, and escape routes before reducing it to ordinary attacks.</p>`, 'wide')
    ]);
  }

  function corpusSheet(meta, rng) {
    const base = clamp(meta.power + 1, 7, 12);
    const corpus = { 'Primary Corpus': score(base + 1, rng), 'Manifestation Pressure': score(base, rng), 'Domain Reach': score(base, rng), 'Attention Budget': score(base - 1, rng), 'Anchor Integrity': score(base, rng), 'Containment Friction': score(base - 1, rng) };
    const abilityStats = { 'Domain Action': score(base, rng), Influence: score(base, rng), Perception: score(base, rng), Propagation: score(base - 1, rng), 'Resistance to Direct Force': score(base, rng), 'Negotiation Surface': score(Math.max(1, 13 - meta.power), rng, 1) };
    const handles = ['what it can act through: host, symbol, court, signal, dream, office, shrine, file, body, or law','what damages or interrupts the corpus: severed anchor, broken permission, redaction, witness collapse, oath breach, or denied medium','what lesser beings can affect: access, timing, invitation, leverage, translation, containment geometry, or political consequence','what must never be printed as ordinary stats: full true form, absolute capability, or safe complete description'];
    return sheetSection(meta, 'True Entity / Corpus Sheet', 'Do not use a full human stat block. Only track the stats directly related to the entity’s primary corpus, domain, manifestation, propagation, and abilities. Ordinary combat stats are intentionally omitted.', [
      card('Corpus-Relevant Stats', statRows(corpus), 'stat-card'),
      card('Ability-Relevant Stats', statRows(abilityStats), 'stat-card'),
      card('Anchors / Handles / Limits', list(handles), 'double'),
      card('Handling Note', `<p>Resolve scenes through permissions, anchors, domains, costs, containment windows, and what staff can safely learn. Direct combat is usually a symptom of the entity, not the entity itself.</p>`, 'wide')
    ]);
  }

  function card(title, body, className = '') {
    return `<article class="npc-card ${className}"><h3>${escapeHtml(title)}</h3>${body}</article>`;
  }

  function sheetSection(meta, title, description, cards) {
    return `<section class="npc-section npc-sheet-mode-section"><div class="npc-section-head"><div><span class="npc-mode-badge">${escapeHtml(SECTION_GROUPS[inferGroup(meta)].short)}</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div></div><div class="npc-grid">${cards.join('')}</div></section>`;
  }

  let rendering = false;
  function renderSheet() {
    if (rendering) return;
    rendering = true;
    window.setTimeout(() => {
      const output = document.getElementById('npc-output');
      const meta = readProfileMeta();
      if (!output || !meta) { rendering = false; return; }
      output.querySelectorAll('.npc-sheet-mode-section').forEach(node => node.remove());
      const rng = rngFrom(`${meta.seed}|${meta.name}|sheet-section`);
      const group = inferGroup(meta);
      const html = group === 'corpus' ? corpusSheet(meta, rng) : group === 'creature' ? creatureSheet(meta, rng) : humanSheet(meta, rng);
      const hero = output.querySelector('.npc-hero');
      if (hero) hero.insertAdjacentHTML('afterend', html);
      rendering = false;
    }, 0);
  }

  function observeOutput() {
    const output = document.getElementById('npc-output');
    if (!output) return;
    const observer = new MutationObserver(renderSheet);
    observer.observe(output, { childList: true, subtree: false });
  }

  function initialize() {
    injectStyle();
    insertPickerPanel();
    observeOutput();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
