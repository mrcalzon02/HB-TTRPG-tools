(() => {
  'use strict';

  const core = window.HBWorldHooksCoreData;
  const focused = window.HBWorldHooksFocusedData;
  if (!core || !focused) return;

  const fields = Object.keys(core.labels);
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

  function settings() {
    return {
      seed: state.controls.seed.value.trim() || randomSeed(),
      focus: state.controls.focus.value,
      tone: state.controls.tone.value
    };
  }

  function themePool(tone) {
    const themes = {
      hopeful: ['Home is built together rather than found ready-made.', 'Cooperation creates futures no isolated faction can reach.'],
      grim: ['Every refuge is purchased by transferring danger to someone else.', 'Survival may preserve a people while destroying its values.'],
      mythic: ['A people becomes legendary through the burdens it agrees to carry.', 'Old promises remain part of the world after their speakers die.'],
      weird: ['The world is a participant whose needs do not resemble human morality.', 'Normal life is a local custom rather than a universal condition.'],
      grounded: ['Logistics, labor, trust, and maintenance decide the fate of nations.', 'A community’s real values appear in how it distributes hardship.']
    };
    return themes[tone] || core.common.theme;
  }

  function pool(field, focus, tone) {
    if (field === 'theme') return themePool(tone);
    return focused[focus]?.[field] || core.common[field] || [];
  }

  function generateField(field, current, salt = '') {
    const random = seeded(`${current.seed}:${current.focus}:${current.tone}:${field}:${salt}`);
    if (field === 'premise') {
      const candidates = current.focus === 'any'
        ? core.premises
        : core.premises.filter(item => item[0] === current.focus);
      const selected = pick(candidates.length ? candidates : core.premises, random);
      return { title: selected[1], text: selected[2] };
    }
    return pick(pool(field, current.focus, current.tone), random);
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
    const lines = [
      title(), `Seed: ${current.seed}`, `Focus: ${core.focuses[current.focus]}`,
      `Tone: ${core.tones[current.tone]}`, '', 'CAMPAIGN PITCH', pitch(), ''
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
      generator: 'HB-TTRPG World Hooks', generatedAt: new Date().toISOString(),
      ...current, title: title(), pitch: pitch(),
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
    for (const value of [`Seed ${current.seed}`, core.focuses[current.focus], core.tones[current.tone]]) {
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
    setStatus('World hook generated. Lock fields to preserve them during the next full generation.');
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
    root.innerHTML = `<section class="world-hooks-module" aria-labelledby="world-hooks-title"><div class="world-hooks-heading"><div><p class="eyebrow">Campaign world randomizer</p><h2 id="world-hooks-title">World Hooks and Setting Foundations</h2><p>Generate a campaign-scale premise, central mystery, theme, conflict, opening mystery, fantasy twist, unusual requirement, recurring structure, environmental hazards, settlement complications, hidden truth, and long-term stakes.</p></div></div><div class="world-hooks-controls"><div class="world-hooks-control-grid"><label>World focus<select data-world-hooks-focus></select></label><label>Tone<select data-world-hooks-tone></select></label><label class="world-hooks-seed-label">Seed<input data-world-hooks-seed type="text" autocomplete="off" spellcheck="false"></label></div><div class="world-hooks-actions"><button class="primary-action" type="button" data-world-hooks-generate>Generate World Hook</button><button class="secondary-action" type="button" data-world-hooks-new>New Seed and Generate</button><button class="secondary-action" type="button" data-world-hooks-copy>Copy</button><button class="secondary-action" type="button" data-world-hooks-export>Export JSON</button></div><p class="world-hooks-status" data-world-hooks-status role="status" aria-live="polite"></p></div><div data-world-hooks-output></div></section>`;

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
