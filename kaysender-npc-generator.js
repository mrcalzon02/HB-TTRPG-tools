(() => {
  const MODULE_ID = 'npc-crew-generator';
  const MANIFEST_URL = 'data/kaysender/generators/npc-crew-generator.json';
  let dataPromise;

  function injectStyles() {
    if (document.getElementById('kaysender-npc-style')) return;
    const style = document.createElement('style');
    style.id = 'kaysender-npc-style';
    style.textContent = `
      .alpha-launch { margin-top: 10px; width: 100%; }
      .alpha-tool-panel { border: 1px solid var(--line); border-radius: 24px; padding: 22px; margin: 18px 0 28px; background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.025)); box-shadow: var(--shadow); }
      .alpha-tool-panel input, .alpha-tool-panel select { background: #10131a; border: 1px solid var(--line); color: var(--ink); border-radius: 12px; padding: 10px 12px; width: 100%; }
      .alpha-tool-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 14px 0; }
      .alpha-tool-note { margin: -2px 0 14px; color: var(--muted); }
      .alpha-output { display: grid; gap: 10px; margin-top: 14px; }
      .alpha-result-card { border: 1px solid rgba(200,138,53,.35); border-radius: 16px; padding: 14px; background: rgba(0,0,0,.18); }
      .alpha-result-card h4 { margin-top: 0; color: var(--accent); }
      .alpha-kv { display: grid; grid-template-columns: 160px 1fr; gap: 8px; border-top: 1px solid rgba(255,255,255,.08); padding-top: 8px; }
      .alpha-kv strong { color: var(--ink); }
      .scan-hit { border-color: rgba(155,63,63,.72); }
      .scan-clean { border-color: rgba(131,179,109,.72); }
      @media (max-width: 900px) { .alpha-tool-grid, .alpha-kv { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(style);
  }

  function choice(list) {
    if (!Array.isArray(list) || !list.length) return 'none';
    return list[Math.floor(Math.random() * list.length)];
  }

  function numberBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function weightedChoice(entries) {
    const total = entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.weight) || 0), 0);
    if (!total) return choice(entries);
    let roll = Math.random() * total;
    for (const entry of entries) {
      roll -= Math.max(0, Number(entry.weight) || 0);
      if (roll <= 0) return entry;
    }
    return entries[entries.length - 1];
  }

  function titleCase(value) {
    return value.replace(/-/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function splitPipe(value) {
    return value ? value.split('|').filter(Boolean) : [];
  }

  function normalizeData(raw) {
    const classPools = { pc: [], npc: [], custom: [] };
    raw.classes.forEach(row => {
      const entry = {
        name: row[0], pool: row[1], role: row[2], hitDie: row[3], baseAttack: row[4],
        goodSaves: splitPipe(row[5]), keyAbilities: splitPipe(row[6]), paths: splitPipe(row[7]), conversionStatus: row[8]
      };
      classPools[entry.pool].push(entry);
    });

    const ancestries = raw.ancestries.map(row => ({
      name: row[0], givenNames: splitPipe(row[1]), familyNames: splitPipe(row[2])
    }));

    const populationBands = raw.populationBands.map(row => {
      const levels = row[4].split('-').map(Number);
      return {
        id: row[0], label: row[1], description: row[2], ageBands: splitPipe(row[3]),
        levelRange: { min: levels[0], max: levels[1] }, combatReadiness: row[5],
        occupations: splitPipe(row[6]), crewRoles: splitPipe(row[7]),
        preferredClasses: splitPipe(row[8]).map(value => {
          const separator = value.lastIndexOf(':');
          return { name: value.slice(0, separator), weight: Number(value.slice(separator + 1)) };
        })
      };
    });

    return { ...raw, classPools, ancestries, populationBands };
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
  }

  function loadData() {
    if (!dataPromise) {
      dataPromise = fetchJson(MANIFEST_URL).then(async manifest => {
        const packs = await Promise.all((manifest.bandPacks || []).map(fetchJson));
        return normalizeData({ ...manifest, populationBands: packs.flatMap(pack => pack.populationBands || []) });
      });
    }
    return dataPromise;
  }

  function decorateCards() {
    injectStyles();
    document.querySelectorAll(`.module-card[data-module-id="${MODULE_ID}"]`).forEach(card => {
      if (card.dataset.npcReady === 'true') return;
      const button = document.createElement('button');
      button.className = 'secondary-action alpha-launch';
      button.type = 'button';
      button.textContent = 'Launch Alpha Generator';
      button.addEventListener('click', () => openGenerator(card.querySelector('h3')?.textContent || 'NPC and Crew Generator'));
      card.appendChild(button);
      card.dataset.npcReady = 'true';
    });
  }

  function switchKaysenderView() {
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === 'kaysender'));
    document.querySelectorAll('.nav-button').forEach(button => button.classList.toggle('active', button.dataset.view === 'kaysender'));
  }

  function outputCard(title, rows, extraClass = '') {
    const card = document.createElement('article');
    card.className = `alpha-result-card ${extraClass}`.trim();
    const heading = document.createElement('h4');
    heading.textContent = title;
    card.appendChild(heading);
    rows.forEach(([key, value]) => {
      const row = document.createElement('div');
      row.className = 'alpha-kv';
      const label = document.createElement('strong');
      const content = document.createElement('span');
      label.textContent = key;
      content.textContent = String(value);
      row.append(label, content);
      card.appendChild(row);
    });
    return card;
  }

  function fillSelect(select, options) {
    select.innerHTML = '';
    options.forEach(entry => {
      const option = document.createElement('option');
      option.value = entry.value;
      option.textContent = entry.label;
      select.appendChild(option);
    });
  }

  async function openGenerator(title) {
    const dashboard = document.getElementById('kaysender');
    const status = document.getElementById('kaysender-status');
    const target = dashboard || document.querySelector('main');
    if (!target) return;

    let panel = document.getElementById('kaysender-alpha-panel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'kaysender-alpha-panel';
      panel.className = 'alpha-tool-panel no-print';
      if (status) status.insertAdjacentElement('afterend', panel);
      else target.prepend(panel);
    }

    panel.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'section-heading';
    header.innerHTML = `<p class="eyebrow">Alpha tool</p><h2>${title}</h2><p>Generate player-facing or GM-facing people from broad Kaysender population bands and Hypertext d20-compatible class pools.</p>`;
    const loading = document.createElement('p');
    loading.className = 'alpha-tool-note';
    loading.textContent = 'Loading population and class tables…';
    panel.append(header, loading);
    switchKaysenderView();
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
      const data = await loadData();
      if (!loading.isConnected || !panel.contains(loading)) return;
      loading.remove();
      renderControls(panel, data);
    } catch (error) {
      if (!loading.isConnected || !panel.contains(loading)) return;
      loading.remove();
      panel.appendChild(outputCard('NPC Generator Data Error', [
        ['Problem', error.message],
        ['Recovery', 'Serve the project through a local web server or GitHub Pages so all JSON packs can load.']
      ], 'scan-hit'));
    }
  }

  function renderControls(panel, data) {
    const grid = document.createElement('div');
    grid.className = 'alpha-tool-grid';
    grid.innerHTML = `
      <label>Population band<select data-npc="band"></select></label>
      <label>Class pool<select data-npc="class-pool"></select></label>
      <label>Power tier<select data-npc="tier"></select></label>
      <label>Age band<select data-npc="age"></select></label>
      <label>Ancestry<select data-npc="ancestry"></select></label>
      <label>NPCs to generate<input data-npc="count" type="number" min="1" max="12" value="1"></label>
    `;
    const bandSelect = grid.querySelector('[data-npc="band"]');
    const classPoolSelect = grid.querySelector('[data-npc="class-pool"]');
    const tierSelect = grid.querySelector('[data-npc="tier"]');
    const ageSelect = grid.querySelector('[data-npc="age"]');
    const ancestrySelect = grid.querySelector('[data-npc="ancestry"]');

    const random = data.populationBands.find(band => band.id === 'random-population');
    fillSelect(bandSelect, [random, ...data.populationBands.filter(band => band !== random)].filter(Boolean).map(band => ({ value: band.id, label: band.label })));
    fillSelect(classPoolSelect, [
      { value: 'appropriate', label: 'Population-appropriate class mix' },
      { value: 'npc', label: 'Standard NPC classes only' },
      { value: 'pc', label: 'Standard player classes only' },
      { value: 'custom', label: 'Kaysender custom classes only' },
      { value: 'all', label: 'All compatible class pools' }
    ]);
    fillSelect(tierSelect, data.powerTiers.map(tier => ({ value: tier.id, label: tier.label })));
    fillSelect(ageSelect, data.ageBands.map(age => ({ value: age, label: age === 'appropriate' ? 'Population-appropriate age' : titleCase(age) })));
    fillSelect(ancestrySelect, [{ value: 'random', label: 'Random Kaysender ancestry' }, ...data.ancestries.map(ancestry => ({ value: ancestry.name, label: ancestry.name }))]);

    const note = document.createElement('p');
    note.className = 'alpha-tool-note';
    const updateNote = () => {
      note.textContent = data.populationBands.find(band => band.id === bandSelect.value)?.description || 'Draws from the complete population catalogue.';
    };
    bandSelect.addEventListener('change', updateNote);
    updateNote();

    const button = document.createElement('button');
    button.className = 'primary-action';
    button.type = 'button';
    button.textContent = 'Generate NPC or Crew Member';
    const output = document.createElement('div');
    output.className = 'alpha-output';
    panel.append(grid, note, button, output);

    button.addEventListener('click', () => {
      const count = Math.min(12, Math.max(1, Number(grid.querySelector('[data-npc="count"]')?.value || 1)));
      output.innerHTML = '';
      for (let index = 0; index < count; index += 1) {
        const npc = generateNpc(data, {
          populationBandId: bandSelect.value,
          classPool: classPoolSelect.value,
          powerTierId: tierSelect.value,
          ageBand: ageSelect.value,
          ancestryName: ancestrySelect.value
        });
        output.appendChild(outputCard(`${npc.name} — ${npc.occupation}`, npc.rows, npc.extraClass));
      }
    });
  }

  function selectClass(data, band, mode) {
    const index = new Map(Object.values(data.classPools).flat().map(entry => [entry.name, entry]));
    if (mode === 'appropriate') return index.get(weightedChoice(band.preferredClasses)?.name) || choice(data.classPools.npc);
    const candidates = mode === 'all' ? Object.values(data.classPools).flat() : data.classPools[mode];
    return choice(candidates) || choice(data.classPools.npc);
  }

  function generateNpc(data, options) {
    const selectableBands = data.populationBands.filter(band => band.id !== 'random-population');
    let band = data.populationBands.find(entry => entry.id === options.populationBandId) || choice(selectableBands);
    if (band.id === 'random-population') band = choice(selectableBands);
    const ancestry = options.ancestryName === 'random' ? choice(data.ancestries) : data.ancestries.find(entry => entry.name === options.ancestryName) || choice(data.ancestries);
    const age = options.ageBand === 'appropriate' ? choice(band.ageBands) : options.ageBand;
    const profile = selectClass(data, band, options.classPool);
    const tier = data.powerTiers.find(entry => entry.id === options.powerTierId);
    const range = tier?.id === 'appropriate' ? band.levelRange : { min: tier?.min || 1, max: tier?.max || 1 };
    const level = numberBetween(range.min, range.max);
    const path = choice(profile.paths);
    const classLabel = path === 'none' ? `${profile.name} ${level}` : `${profile.name} ${level} — ${path}`;
    const saves = profile.goodSaves.length ? profile.goodSaves.join(', ') : 'none';
    const statStub = profile.pool === 'custom'
      ? `${profile.name} ${level}; exact Hit Die, base attack, saves, and feature progression remain conversion-pending. Key ability priorities: ${profile.keyAbilities.join(', ')}.`
      : `${profile.name} ${level}; ${profile.hitDie} Hit Die; ${profile.baseAttack} base attack progression; good saves: ${saves}; key ability priorities: ${profile.keyAbilities.join(', ')}.`;
    const occupation = choice(band.occupations);
    const name = `${choice(ancestry.givenNames)} ${choice(ancestry.familyNames)}`;

    return {
      name,
      occupation,
      extraClass: band.combatReadiness.includes('noncombatant') ? 'scan-clean' : '',
      rows: [
        ['Population band', band.label], ['Ancestry and age', `${ancestry.name}; ${age}`],
        ['Home region', choice(data.homeRegions)], ['Occupation', occupation], ['Class and level', classLabel],
        ['Class role', profile.role], ['Ship role', band.crewRoles.length ? choice(band.crewRoles) : 'shore-based or no assigned ship role'],
        ['Faction tie', choice(data.factions)], ['Disposition', choice(data.dispositions)], ['Need', choice(data.needs)],
        ['Fear', choice(data.fears)], ['Loyalty', choice(data.loyalties)], ['Secret', choice(data.secrets)],
        ['Current problem', choice(data.problems)], ['Combat readiness', band.combatReadiness],
        ['Open d20 stat stub', statStub],
        ['Rules status', profile.conversionStatus || 'Standard open-d20 class progression descriptors are available in the Hypertext d20 rules reference.']
      ]
    };
  }

  const observer = new MutationObserver(decorateCards);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', decorateCards);
  setInterval(decorateCards, 1000);
})();
