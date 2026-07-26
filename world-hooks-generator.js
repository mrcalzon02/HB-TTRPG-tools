(() => {
  'use strict';

  const core = window.HBWorldHooksCoreData;
  const focused = window.HBWorldHooksFocusedData;
  if (!core || !focused) return;

  const toneProfiles = Object.freeze({
    bubblegum: Object.freeze({
      register: "bright, fashionable, emotionally sincere bubble-gum fantasy",
      mystery: "charming, collectible, and increasingly spectacular",
      morality: "optimistic; friendship, compassion, and self-expression can change both people and systems",
      conflict: "flamboyant, personal, and open to redemption or dramatic reconciliation",
      magic: "abundant, personalized, colorful, and expressive",
      danger: "dramatic and clearly signaled rather than casually lethal",
      consequences: "focused on relationships, dreams, belonging, and restoring wonder",
      realism: "cinematic; logistics and injury matter only when they strengthen the emotional adventure",
      play: "colorful set pieces, rival teams, emotional reveals, and celebratory payoffs"
    }),
    cartoon: Object.freeze({
      register: "bold, readable, high-energy Saturday-morning cartoon adventure",
      mystery: "visual, immediate, symbol-heavy, and full of suspiciously thematic coincidences",
      morality: "clear but not simplistic; ingenuity, courage, teamwork, and second chances matter",
      conflict: "built around memorable gimmicks, oversized personalities, and fast reversals",
      magic: "easy to understand, visually exaggerated, and flexible enough for inventive action",
      danger: "kinetic, comedic in timing, and recoverable without becoming meaningless",
      consequences: "carried forward through recurring villains, damaged places, and changed relationships",
      realism: "elastic and cinematic; momentum, clarity, and fun outrank simulation",
      play: "strong episode premises, escalating set pieces, recurring rivals, and cliffhangers"
    }),
    storybook: Object.freeze({
      register: "intimate, symbolic storybook fantasy governed by folktale logic",
      mystery: "hidden in songs, customs, gifts, household warnings, talking animals, and repeated motifs",
      morality: "concerned with promises, hospitality, generosity, pride, cleverness, and wisdom",
      conflict: "rooted in broken bargains, inherited curses, unequal customs, and assigned roles",
      magic: "symbolic; it rewards appropriate acts and punishes disregard for meaning",
      danger: "uncanny and consequential, but shaped by rules that can be learned and honored",
      consequences: "transformed into blessings, curses, names, customs, and future cautionary tales",
      realism: "emotional and symbolic rather than material; meaning governs causality",
      play: "tests, temptations, bargains, transformations, and consequences that become folklore"
    }),
    heroic: Object.freeze({
      register: "sweeping heroic high fantasy in which the world is dangerous but worth defending",
      mystery: "connected to a larger threat that demands courage, investigation, and moral judgment",
      morality: "centered on duty, mercy, sacrifice, leadership, and the difficult admirable choice",
      conflict: "driven by powerful adversaries, divided allies, and a need to build real coalitions",
      magic: "wondrous and potent without replacing discipline, judgment, or sacrifice",
      danger: "formidable but fair enough that preparation, bravery, and leadership can prevail",
      consequences: "measured in lives, freedom, territory, hope, and the example heroes leave behind",
      realism: "cinematic but coherent; practical constraints exist without smothering legendary action",
      play: "escalation from local rescue to regional alliance and age-defining confrontation"
    }),
    mythic: Object.freeze({
      register: "mythic epic fantasy told at the scale of ages, gods, ancestors, and sacred landscapes",
      mystery: "preserved in omens, ritual fragments, contradictory scriptures, and wounds in creation",
      morality: "concerned with legacy, fate, sacrifice, divine responsibility, and inherited obligation",
      conflict: "a collision between mortal lives and cosmic covenants whose authors no longer understand the cost",
      magic: "bound to names, bloodlines, oaths, monuments, memory, and divine precedent",
      danger: "vast, cyclical, and meaningful rather than random",
      consequences: "capable of changing the relationship between mortals, gods, nature, death, and destiny",
      realism: "legendary rather than simulationist; symbolic acts can outweigh material scale",
      play: "recovering the world’s founding story and choosing whether to restore, amend, or break it"
    }),
    grounded: Object.freeze({
      register: "grounded fantasy where institutions, labor, transport, food, law, and maintenance shape daily life",
      mystery: "evidence-based, incentive-aware, and anchored in records, testimony, access, and material traces",
      morality: "focused on responsibility, compromise, community, implementation, and lived consequence",
      conflict: "constrained by limited capacity, internal divisions, dependencies, legitimacy, and ordinary people",
      magic: "treated as infrastructure, specialized labor, unevenly distributed power, or dangerous technology",
      danger: "predictable enough to prepare for and severe enough to punish negligence",
      consequences: "expressed through shortages, displacement, political backlash, preventable deaths, and precedent",
      realism: "practical and materially coherent without demanding exhaustive simulation",
      play: "travel, investigation, negotiation, action, follow-through, and visible institutional change"
    }),
    noir: Object.freeze({
      register: "rain-dark fantasy noir where order survives through favors, secrets, and selective enforcement",
      mystery: "personal, compromised, and guaranteed to implicate someone useful, protected, or desperate",
      morality: "about the price of integrity when innocence is scarce and truth is marketable",
      conflict: "built from institutions that condemn one another publicly while trading the same secrets privately",
      magic: "a source of evidence, addiction, debt, jurisdiction, blackmail, and specialized crime",
      danger: "intimate, urban, isolating, and often delivered by people the party understands",
      consequences: "rarely clean; exposing the truth may destroy people who were surviving inside the lie",
      realism: "grounded in motive, leverage, procedure, and institutional self-protection",
      play: "cases that close one question, open two worse ones, and change who owes or watches the party"
    }),
    gritty: Object.freeze({
      register: "gritty low fantasy where every gain consumes time, supplies, trust, labor, or blood",
      mystery: "incomplete, damaged, contested, and dangerous to verify",
      morality: "about endurance, necessity, loyalty, moral injury, and survivable compromise",
      conflict: "over food, routes, defensible ground, labor, weapons, legitimacy, and fear",
      magic: "scarce, exhausting, expensive, risky, politically controlled, or physically damaging",
      danger: "physical, cumulative, and unforgiving of poor preparation",
      consequences: "graves, abandoned communities, broken alliances, lost skills, and a smaller future",
      realism: "hard-edged; weather, injury, fatigue, disease, and supply failures materially matter",
      play: "preparation, attrition, imperfect intelligence, escalation, recovery, and persistent losses"
    }),
    ultraRealistic: Object.freeze({
      register: "ultra-realistic fantasy constrained by climate, logistics, medicine, engineering, demographics, and governance",
      mystery: "tested against timelines, geography, physical evidence, chain of custody, and alternative explanations",
      morality: "about competence, systems, institutional capacity, unintended consequences, and finite resources",
      conflict: "limited by budgets, personnel, transport, communications, law, legitimacy, and incomplete information",
      magic: "measurable, trainable, fallible, counterable, expensive, and economically disruptive",
      danger: "governed by exposure, calories, hydration, sleep, load, sanitation, terrain, and weather windows",
      consequences: "statistically credible mortality, infrastructure failure, debt, migration, labor loss, and radicalization",
      realism: "simulation-forward; plans must account for labor, tools, timing, transport, security, resupply, and maintenance",
      play: "reconnaissance, planning, execution, after-action review, repair, political response, and revised assumptions"
    }),
    grimdark: Object.freeze({
      register: "grimdark fantasy sustained by cruel institutions that convert suffering into stability",
      mystery: "suppressed because powerful people have made ignorance necessary for ordinary life to continue",
      morality: "about survival without justice, compromised power, repeated necessity, and whether hope remains honest",
      conflict: "between factions that protect someone, exploit someone, and justify atrocity by pointing to something worse",
      magic: "built from sacrifice, inherited guilt, controlled monstrosity, divine indifference, or living resources",
      danger: "lethal, exhausting, systemic, and readily weaponized by those already in power",
      consequences: "a choice over who suffers, who remembers, and whether a less monstrous future remains imaginable",
      realism: "brutal but coherent; suffering follows material systems rather than random edginess",
      play: "victories that expose deeper machinery, transfer responsibility, and create new victims or enemies"
    }),
    weird: Object.freeze({
      register: "surreal weird fantasy that becomes coherent only after alien assumptions are taken seriously",
      mystery: "unstable under observation, naming, memory, classification, or movement across borders",
      morality: "about identity, perception, language, embodiment, normality, and mutually incompatible truths",
      conflict: "between realities, bodies, histories, or causal orders competing to be treated as primary",
      magic: "changes categories such as ownership, distance, ancestry, sequence, interiority, and metaphor",
      danger: "conceptual, ecological, and disorienting rather than conventionally tactical",
      consequences: "communities remaining alive but unable to share the same spaces, histories, bodies, or truths",
      realism: "internally rigorous but alien; impossible rules remain consistent once discovered",
      play: "learning local impossibilities, exploiting them, and becoming less compatible with ordinary reality"
    })
  });

  const fieldLens = Object.freeze({
    premise: 'register',
    centralMystery: 'mystery',
    theme: 'morality',
    centralConflict: 'conflict',
    initialMystery: 'mystery',
    fantasyTwist: 'magic',
    limitation: 'realism',
    campaignStructure: 'play',
    settlementComplication: 'danger',
    environmentalPressure: 'danger',
    hiddenTruth: 'mystery',
    stakes: 'consequences'
  });

  const lensTemplates = Object.freeze({
    premise: value => `Presentation: ${value}.`,
    centralMystery: value => `Its clues are ${value}.`,
    theme: value => `Its moral register is ${value}.`,
    centralConflict: value => `Conflict is ${value}.`,
    initialMystery: value => `The opening investigation is ${value}.`,
    fantasyTwist: value => `Magic is ${value}.`,
    limitation: value => `The reality model is ${value}.`,
    campaignStructure: value => `Campaign play emphasizes ${value}.`,
    settlementComplication: value => `The danger is ${value}.`,
    environmentalPressure: value => `Environmental pressure is ${value}.`,
    hiddenTruth: value => `The concealed truth remains ${value}.`,
    stakes: value => `Consequences are ${value}.`
  });

  const fields = Object.keys(core.labels);
  const toneKeys = Object.keys(toneProfiles);
  const state = { result: {}, locks: new Set(), rerolls: {}, root: null, controls: null };

  function seeded(seed) {
    let value = 2166136261;
    for (const character of String(seed)) {
      value ^= character.charCodeAt(0);
      value = Math.imul(value, 16777619);
    }
    return () => {
      value += 0x6D2B79F5;
      let mixed = value;
      mixed = Math.imul(mixed ^ mixed >>> 15, mixed | 1);
      mixed ^= mixed + Math.imul(mixed ^ mixed >>> 7, mixed | 61);
      return ((mixed ^ mixed >>> 14) >>> 0) / 4294967296;
    };
  }

  function pick(items, random) {
    return items[Math.floor(random() * items.length)] || items[0] || '';
  }

  function randomSeed() {
    if (globalThis.crypto?.getRandomValues) {
      const values = new Uint32Array(2);
      crypto.getRandomValues(values);
      return `${values[0].toString(36)}-${values[1].toString(36)}`;
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function resolveTone(selection, seed, focus) {
    if (selection !== 'any') return selection;
    return pick(toneKeys, seeded(`${seed}:${focus}:tone`));
  }

  function settings() {
    const seed = state.controls.seed.value.trim() || randomSeed();
    const focus = state.controls.focus.value;
    const toneSelection = state.controls.tone.value;
    return { seed, focus, toneSelection, tone: resolveTone(toneSelection, seed, focus) };
  }

  function pool(field, focus) {
    return focused[focus]?.[field] || core.common[field] || [];
  }

  function toneLens(field, tone) {
    const key = fieldLens[field];
    const value = toneProfiles[tone]?.[key];
    return value ? lensTemplates[field](value) : '';
  }

  function styled(base, field, tone) {
    const lens = toneLens(field, tone);
    return lens ? `${base} ${lens}` : base;
  }

  function generateField(field, current, salt = '') {
    const random = seeded(`${current.seed}:${current.focus}:${current.tone}:${field}:${salt}`);
    if (field === 'premise') {
      const candidates = current.focus === 'any'
        ? core.premises
        : core.premises.filter(item => item[0] === current.focus);
      const selected = pick(candidates.length ? candidates : core.premises, random);
      return { title: selected[1], text: styled(selected[2], field, current.tone) };
    }
    return styled(pick(pool(field, current.focus), random), field, current.tone);
  }

  function text(field) {
    return field === 'premise' ? state.result[field]?.text || '' : state.result[field] || '';
  }

  function title() {
    return state.result.premise?.title || 'Generated Campaign World';
  }

  function generate({ freshSeed = false } = {}) {
    if (freshSeed || !state.controls.seed.value.trim()) state.controls.seed.value = randomSeed();
    const current = settings();
    state.controls.seed.value = current.seed;
    for (const field of fields) {
      if (state.locks.has(field) && state.result[field]) continue;
      state.rerolls[field] = 0;
      state.result[field] = generateField(field, current);
    }
    render();
  }

  function reroll(field) {
    const current = settings();
    state.rerolls[field] = (state.rerolls[field] || 0) + 1;
    state.result[field] = generateField(field, current, state.rerolls[field]);
    render();
  }

  function pitch() {
    const limitation = text('limitation');
    return `${text('premise')} The central campaign pressure is this: ${text('centralConflict')} Ordinary fantasy solutions are constrained because ${limitation.charAt(0).toLowerCase()}${limitation.slice(1)}`;
  }

  function formatted() {
    const current = settings();
    const toneLabel = current.toneSelection === 'any'
      ? `Randomized as ${core.tones[current.tone]}`
      : core.tones[current.tone];
    const lines = [
      title(), `Seed: ${current.seed}`, `Focus: ${core.focuses[current.focus]}`,
      `Tone and presentation: ${toneLabel}`, '', 'CAMPAIGN PITCH', pitch(), ''
    ];
    for (const field of fields) lines.push(core.labels[field].toUpperCase(), text(field), '');
    return lines.join('\n').trim();
  }

  function setStatus(message) {
    const status = state.root.querySelector('[data-world-hooks-status]');
    if (status) status.textContent = message;
  }

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(formatted());
    } catch (_) {
      const area = document.createElement('textarea');
      area.value = formatted();
      document.body.append(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setStatus('World hook copied to the clipboard.');
  }

  function exportJson() {
    const current = settings();
    const payload = {
      generator: 'HB-TTRPG World Hooks',
      generatedAt: new Date().toISOString(),
      seed: current.seed,
      focus: current.focus,
      toneSelection: current.toneSelection,
      tone: current.tone,
      title: title(),
      pitch: pitch(),
      fields: Object.fromEntries(fields.map(field => [field, text(field)]))
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `world-hook-${current.seed.replace(/[^a-z0-9_-]+/gi, '-')}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus('World hook exported as JSON.');
  }

  function fieldCard(field) {
    const card = document.createElement('article');
    card.className = 'world-hook-field';
    card.classList.toggle('is-locked', state.locks.has(field));

    const header = document.createElement('div');
    header.className = 'world-hook-field-header';
    const heading = document.createElement('h3');
    heading.textContent = core.labels[field];
    const actions = document.createElement('div');
    actions.className = 'world-hook-field-actions';

    const lockLabel = document.createElement('label');
    lockLabel.className = 'world-hook-lock';
    const lock = document.createElement('input');
    lock.type = 'checkbox';
    lock.checked = state.locks.has(field);
    lock.addEventListener('change', () => {
      if (lock.checked) state.locks.add(field);
      else state.locks.delete(field);
      card.classList.toggle('is-locked', lock.checked);
    });
    const lockText = document.createElement('span');
    lockText.textContent = 'Lock';
    lockLabel.append(lock, lockText);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary-action world-hook-reroll';
    button.textContent = 'Reroll';
    button.addEventListener('click', () => reroll(field));

    const paragraph = document.createElement('p');
    paragraph.textContent = text(field);
    actions.append(lockLabel, button);
    header.append(heading, actions);
    card.append(header, paragraph);
    return card;
  }

  function render() {
    const output = state.root.querySelector('[data-world-hooks-output]');
    output.replaceChildren();
    const hero = document.createElement('article');
    hero.className = 'world-hook-result-hero';
    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'Generated campaign foundation';
    const heading = document.createElement('h2');
    heading.textContent = title();
    const paragraph = document.createElement('p');
    paragraph.className = 'world-hook-pitch';
    paragraph.textContent = pitch();
    const meta = document.createElement('div');
    meta.className = 'world-hook-meta';
    const current = settings();
    const toneLabel = current.toneSelection === 'any'
      ? `Random style: ${core.tones[current.tone]}`
      : core.tones[current.tone];
    for (const value of [`Seed ${current.seed}`, core.focuses[current.focus], toneLabel]) {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = value;
      meta.append(chip);
    }
    hero.append(eyebrow, heading, paragraph, meta);
    const grid = document.createElement('div');
    grid.className = 'world-hook-grid';
    fields.forEach(field => grid.append(fieldCard(field)));
    output.append(hero, grid);
    setStatus('World hook generated. Tone and presentation now shape every field. Lock fields to preserve them during the next full generation.');
  }

  function addOptions(select, values) {
    for (const [value, label] of Object.entries(values)) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      select.append(option);
    }
  }

  function mount() {
    const root = document.getElementById('world-hooks-root');
    if (!root || root.dataset.mounted === 'true') return;
    root.dataset.mounted = 'true';
    state.root = root;
    root.innerHTML = `<section class="world-hooks-module" aria-labelledby="world-hooks-title"><div class="world-hooks-heading"><div><p class="eyebrow">Campaign world randomizer</p><h2 id="world-hooks-title">World Hooks and Setting Foundations</h2><p>Generate a campaign-scale premise, central mystery, theme, conflict, opening mystery, fantasy twist, unusual requirement, recurring structure, environmental hazards, settlement complications, hidden truth, and long-term stakes. Tone and presentation range from bubble-gum fantasy and Saturday-morning cartoons through heroic, mythic, grounded, noir, gritty, ultra-realistic, grimdark, and surreal worlds.</p></div></div><div class="world-hooks-controls"><div class="world-hooks-control-grid"><label>World focus<select data-world-hooks-focus></select></label><label>Tone and presentation<select data-world-hooks-tone></select></label><label class="world-hooks-seed-label">Seed<input data-world-hooks-seed type="text" autocomplete="off" spellcheck="false"></label></div><div class="world-hooks-actions"><button class="primary-action" type="button" data-world-hooks-generate>Generate World Hook</button><button class="secondary-action" type="button" data-world-hooks-new>New Seed and Generate</button><button class="secondary-action" type="button" data-world-hooks-copy>Copy</button><button class="secondary-action" type="button" data-world-hooks-export>Export JSON</button></div><p class="world-hooks-status" data-world-hooks-status role="status" aria-live="polite"></p></div><div data-world-hooks-output></div></section>`;

    const focus = root.querySelector('[data-world-hooks-focus]');
    const tone = root.querySelector('[data-world-hooks-tone]');
    const seed = root.querySelector('[data-world-hooks-seed]');
    addOptions(focus, core.focuses);
    addOptions(tone, core.tones);
    seed.value = randomSeed();
    state.controls = { focus, tone, seed };

    root.querySelector('[data-world-hooks-generate]').addEventListener('click', () => generate());
    root.querySelector('[data-world-hooks-new]').addEventListener('click', () => generate({ freshSeed: true }));
    root.querySelector('[data-world-hooks-copy]').addEventListener('click', () => void copyOutput());
    root.querySelector('[data-world-hooks-export]').addEventListener('click', exportJson);
    seed.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      generate();
    });
    generate();
  }

  window.HBWorldHooksGenerator = Object.freeze({ mount });
})();
