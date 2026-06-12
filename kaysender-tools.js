(() => {
  const alphaTools = {
    'kaysender-compatibility-scanner': {
      label: 'Launch Alpha Scanner',
      render: renderCompatibilityScanner
    },
    'floating-island-generator': {
      label: 'Launch Alpha Generator',
      render: renderFloatingIslandGenerator
    },
    'settlement-generator': {
      label: 'Launch Alpha Generator',
      render: renderSettlementGenerator
    },
    'shop-market-generator': {
      label: 'Launch Alpha Generator',
      render: renderMarketGenerator
    },
    'airship-vessel-generator': {
      label: 'Launch Alpha Generator',
      render: renderAirshipGenerator
    },
    'supply-water-planner': {
      label: 'Launch Alpha Planner',
      render: renderSupplyPlanner
    }
  };

  const tables = {
    islandSize: ['tiny rocklet', 'small farming isle', 'narrow ridge island', 'village-scale island', 'township island', 'ruined city isle', 'large frontier island', 'minor floating continent'],
    islandStability: ['dangerously crumbling', 'unstable and shedding stone', 'seasonally stable', 'mostly stable', 'anchored by old magic', 'artificially stabilized'],
    altitude: ['low mist belt', 'trade-wind layer', 'storm edge', 'high bright air', 'dragon-route altitude', 'abyss-shadowed undercurrent'],
    terrain: ['sheffel pasture', 'skystone cliffs', 'fungal cloud forest', 'terraced farms', 'old ruins', 'crystal gullies', 'wind-cut mesas', 'water-starved scrubland'],
    crisis: ['water stores are almost gone', 'pirates were sighted nearby', 'a dragon tithe collector is expected', 'the island drift is changing', 'a disease is moving through livestock', 'a mine shaft broke into old ruins', 'a faction envoy has gone missing', 'storms have cut off trade'],
    resources: ['skystone', 'buoyant oils', 'arcane moss', 'clean rainwater cisterns', 'rare feathers', 'levitation salts', 'ironwood', 'salvage from a wreck'],
    governments: ['elder council', 'guild compact', 'militia captaincy', 'merchant charter', 'temple authority', 'dragon-appointed reeve', 'freeholder moot', 'company factor'],
    defenses: ['none beyond watch bells', 'wooden palisades', 'trained local militia', 'warded cliff gates', 'mercenary contract', 'old stone fortress', 'skychain barriers', 'concealed ballista nests'],
    factions: ['Surveyor\'s Guild', 'Whisper Web', 'Skyweaver Consortium', 'Aetherbound Company', 'Ember Guild', 'Black Fleet pretenders', 'Free Sky Brotherhood', 'local merchant guild'],
    marketGoods: ['water and purification salts', 'skygrain and hard tack', 'sheffel wool and textiles', 'airship parts', 'alchemical oils', 'route maps', 'salvage and relics', 'weapons and armor', 'potions and healing draughts', 'livestock and skybeasts'],
    marketTrouble: ['counterfeit goods', 'guild price fixing', 'pirate-tainted inventory', 'dragon tithe surcharge', 'water shortage rationing', 'hidden contraband', 'angry unpaid suppliers', 'sick livestock'],
    hulls: ['Dwarven heavy craft', 'Elven living-attuned craft', 'Dragon Kin elemental warcraft', 'Gnomish mechanical-arcane hybrid', 'Human mixed steam-and-magic vessel', 'pirate cutter', 'survey sloop', 'merchant hauler', 'smuggling skiff', 'creature-containment barge'],
    cores: ['Dwarven stone-heart core', 'Elven windroot core', 'Dragon Kin ember core', 'Gnomish gyro-aether core', 'Human hybrid boiler-core', 'salvaged unknown core'],
    conditions: ['pristine', 'serviceable', 'patched after battle', 'overloaded', 'badly maintained', 'one failure from disaster'],
    missions: ['escort convoy', 'deliver water', 'smuggle relics', 'hunt pirates', 'survey a drifting island', 'collect tithe', 'flee creditors', 'transport pilgrims', 'move refugees', 'track a skybeast herd']
  };

  const scannerRules = [
    { term: /\badvantage\b|\bdisadvantage\b/gi, replacement: 'Use typed circumstance bonuses, penalties, rerolls, or explicit d20 roll clauses.' },
    { term: /\bproficiency bonus\b/gi, replacement: 'Use skill ranks, base attack bonus, class level, caster level, or a fixed scaling table.' },
    { term: /\bbonus action\b/gi, replacement: 'Convert to swift action, immediate action, move action, standard action, full-round action, free action, or attack of opportunity timing.' },
    { term: /\breaction\b/gi, replacement: 'Convert to immediate action, readied action, attack of opportunity, or a named trigger.' },
    { term: /\blong rest\b|\bshort rest\b/gi, replacement: 'Convert to daily uses, per-encounter uses, hourly recovery, rest-period recovery, or prepared-resource recovery.' },
    { term: /\bsubclass\b|\bclass archetype\b/gi, replacement: 'Convert to class feature tree, prestige path, domain, feat chain, or campaign trait package.' },
    { term: /\bbackground feature\b|\bbackgrounds?\b/gi, replacement: 'Convert to origin, occupation, regional trait, social trait, or starting package.' },
    { term: /\bChannel Divinity\b/gi, replacement: 'Convert to a domain power, turning feature, daily supernatural ability, or divine class feature.' },
    { term: /\battunement\b|\battuned\b/gi, replacement: 'Convert to slot restrictions, item activation requirements, command word use, caster-level limits, or body-slot rules.' },
    { term: /\blegendary action\b|\blair action\b/gi, replacement: 'Convert to initiative-count events, environmental hazards, triggered abilities, or elite monster special actions.' },
    { term: /\bdeath saving throw\b/gi, replacement: 'Convert to dying, stabilization, negative hit point, or campaign-specific injury rules.' }
  ];

  function injectStyles() {
    if (document.getElementById('kaysender-alpha-style')) return;
    const style = document.createElement('style');
    style.id = 'kaysender-alpha-style';
    style.textContent = `
      .alpha-launch { margin-top: 10px; width: 100%; }
      .alpha-tool-panel {
        border: 1px solid var(--line);
        border-radius: 24px;
        padding: 22px;
        margin: 18px 0 28px;
        background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.025));
        box-shadow: var(--shadow);
      }
      .alpha-tool-panel textarea,
      .alpha-tool-panel input,
      .alpha-tool-panel select {
        background: #10131a;
        border: 1px solid var(--line);
        color: var(--ink);
        border-radius: 12px;
        padding: 10px 12px;
        width: 100%;
      }
      .alpha-tool-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 14px 0; }
      .alpha-output { display: grid; gap: 10px; margin-top: 14px; }
      .alpha-result-card {
        border: 1px solid rgba(200, 138, 53, 0.35);
        border-radius: 16px;
        padding: 14px;
        background: rgba(0, 0, 0, 0.18);
      }
      .alpha-result-card h4 { margin-top: 0; color: var(--accent); }
      .alpha-kv { display: grid; grid-template-columns: 160px 1fr; gap: 8px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 8px; }
      .alpha-kv strong { color: var(--ink); }
      .scan-hit { border-color: rgba(155, 63, 63, 0.72); }
      .scan-clean { border-color: rgba(131, 179, 109, 0.72); }
      @media (max-width: 900px) { .alpha-tool-grid { grid-template-columns: 1fr; } .alpha-kv { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(style);
  }

  function choice(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function numberBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function kebabToTitle(id) {
    return id.replace(/-/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function decorateCards() {
    injectStyles();
    document.querySelectorAll('.module-card').forEach(card => {
      const moduleId = card.dataset.moduleId;
      const tool = alphaTools[moduleId];
      if (!tool || card.dataset.alphaReady === 'true') return;

      const button = document.createElement('button');
      button.className = 'secondary-action alpha-launch';
      button.type = 'button';
      button.textContent = tool.label;
      button.addEventListener('click', () => openTool(moduleId, card.querySelector('h3')?.textContent || kebabToTitle(moduleId)));
      card.appendChild(button);
      card.dataset.alphaReady = 'true';
    });
  }

  function openTool(moduleId, title) {
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

    const tool = alphaTools[moduleId];
    panel.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'section-heading';
    header.innerHTML = `<p class="eyebrow">Alpha tool</p><h2>${title}</h2><p>This is an early working utility built from the Kaysender extraction framework. Results are campaign-operation drafts, not final balanced rules text.</p>`;
    panel.appendChild(header);
    tool.render(panel);
    switchKaysenderView();
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function switchKaysenderView() {
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === 'kaysender'));
    document.querySelectorAll('.nav-button').forEach(button => button.classList.toggle('active', button.dataset.view === 'kaysender'));
  }

  function renderOutput(container, title, rows, extraClass = '') {
    container.innerHTML = '';
    const card = document.createElement('article');
    card.className = `alpha-result-card ${extraClass}`.trim();
    const h4 = document.createElement('h4');
    h4.textContent = title;
    card.appendChild(h4);
    rows.forEach(([key, value]) => {
      const row = document.createElement('div');
      row.className = 'alpha-kv';
      row.innerHTML = `<strong>${key}</strong><span>${value}</span>`;
      card.appendChild(row);
    });
    container.appendChild(card);
  }

  function renderCompatibilityScanner(panel) {
    const textarea = document.createElement('textarea');
    textarea.rows = 10;
    textarea.placeholder = 'Paste Kaysender rules or lore text here to flag legacy fifth-edition phrasing before open d20 conversion...';

    const button = document.createElement('button');
    button.className = 'primary-action';
    button.type = 'button';
    button.textContent = 'Scan Text';

    const output = document.createElement('div');
    output.className = 'alpha-output';

    button.addEventListener('click', () => {
      const text = textarea.value || '';
      const hits = scannerRules.map(rule => {
        const matches = text.match(rule.term) || [];
        return { ...rule, count: matches.length, examples: [...new Set(matches)].slice(0, 4) };
      }).filter(hit => hit.count > 0);

      const density = hits.reduce((sum, hit) => sum + hit.count, 0);
      const classification = density === 0 ? 'Lore-only or already low-risk' : density <= 3 ? 'Rules-linked conversion needed' : 'Mechanics-heavy conversion needed';
      const readiness = density === 0 ? 'Public-facing lore pass likely safe after editorial review.' : 'Hold for conversion before public reusable rules release.';

      const rows = [
        ['Classification', classification],
        ['Flag count', String(density)],
        ['Public readiness', readiness]
      ];

      if (hits.length) {
        hits.forEach(hit => rows.push([
          hit.examples.join(', '),
          hit.replacement
        ]));
      } else {
        rows.push(['Result', 'No tracked fifth-edition conversion terms found by this alpha scanner.']);
      }

      renderOutput(output, 'Compatibility Scan Result', rows, hits.length ? 'scan-hit' : 'scan-clean');
    });

    panel.append(textarea, button, output);
  }

  function renderFloatingIslandGenerator(panel) {
    const button = makeGenerateButton('Generate Floating Island');
    const output = makeOutput(panel, button);
    button.addEventListener('click', () => renderOutput(output, 'Floating Island Profile', [
      ['Island type', choice(tables.islandSize)],
      ['Stability', choice(tables.islandStability)],
      ['Altitude band', choice(tables.altitude)],
      ['Terrain', choice(tables.terrain)],
      ['Primary resource', choice(tables.resources)],
      ['Water situation', choice(['none visible', 'rain cisterns', 'contested spring', 'alchemical purification required', 'good reservoirs', 'import dependent'])],
      ['Food situation', choice(['starving', 'barely sufficient', 'sheffel-supported', 'terrace farms', 'import dependent', 'surplus in season'])],
      ['Threat pressure', choice(['pirate scouts', 'skybeast migration', 'dragon tithe claim', 'faction surveyors', 'storm shear', 'smugglers using the underside'])],
      ['Current crisis', choice(tables.crisis)]
    ]));
  }

  function renderSettlementGenerator(panel) {
    const button = makeGenerateButton('Generate Settlement');
    const output = makeOutput(panel, button);
    button.addEventListener('click', () => {
      const population = numberBetween(80, 12000).toLocaleString();
      renderOutput(output, 'Settlement Profile', [
        ['Settlement type', choice(['outer-island village', 'fortified skyport', 'company mining camp', 'freeholder town', 'temple refuge', 'merchant enclave', 'cliffside slum', 'guild charter settlement'])],
        ['Population', population],
        ['Government', choice(tables.governments)],
        ['Defense', choice(tables.defenses)],
        ['Dominant faction', choice(tables.factions)],
        ['Food status', choice(['surplus', 'stable', 'tight rationing', 'famine risk', 'import dependent'])],
        ['Water status', choice(['clean reservoir', 'rationed cisterns', 'tainted source', 'import dependent', 'storm-harvested'])],
        ['Market type', choice(['open bazaar', 'guild-controlled stalls', 'black-market alley', 'water auction', 'shipyard exchange', 'pilgrim market'])],
        ['Political stress', choice(['labor unrest', 'noble dispute', 'guild pressure', 'dragon tithe fear', 'refugee influx', 'militia coup rumors'])],
        ['Adventure hook', choice(['missing survey crew', 'sabotaged cistern', 'pirate informant', 'forbidden ruin below town', 'rigged election', 'ship core theft'])]
      ]);
    });
  }

  function renderMarketGenerator(panel) {
    const button = makeGenerateButton('Generate Shop or Stall');
    const output = makeOutput(panel, button);
    button.addEventListener('click', () => renderOutput(output, 'Market Stall Profile', [
      ['Goods', choice(tables.marketGoods)],
      ['Legitimacy', choice(['fully legal', 'guild licensed', 'gray market', 'smuggler-backed', 'counterfeit front', 'temple sanctioned'])],
      ['Quality', choice(['scrap-grade', 'common', 'sturdy', 'fine', 'masterwork', 'dangerously experimental'])],
      ['Price pressure', choice(['fair', 'scarcity markup', 'guild-fixed', 'desperate discount', 'auction only', 'payment in water preferred'])],
      ['Owner', choice(['cheerful survivor', 'paranoid quartermaster', 'retired sky pirate', 'guild clerk', 'widowed craftmaster', 'young inventor'])],
      ['Supply problem', choice(tables.marketTrouble)],
      ['Secret', choice(['hides a map fragment', 'owes pirates', 'reports to a dragon reeve', 'sells to rebels', 'has a cursed relic', 'knows a safe route'])]
    ]));
  }

  function renderAirshipGenerator(panel) {
    const button = makeGenerateButton('Generate Airship');
    const output = makeOutput(panel, button);
    button.addEventListener('click', () => renderOutput(output, 'Airship or Vessel Profile', [
      ['Hull family', choice(tables.hulls)],
      ['Size class', choice(['skiff', 'cutter', 'sloop', 'barge', 'frigate', 'hauler', 'warship', 'mobile platform'])],
      ['Primary core', choice(tables.cores)],
      ['Crew size', String(numberBetween(4, 140))],
      ['Armament', choice(['none', 'deck archers', 'light ballistae', 'alchemical throwers', 'broadside guns', 'boarding hooks', 'ward projectors'])],
      ['Condition', choice(tables.conditions)],
      ['Legal status', choice(['registered merchant', 'privateer letter', 'wanted pirate', 'unmarked', 'guild chartered', 'stolen papers', 'temple protected'])],
      ['Current cargo', choice(['water casks', 'sheffel wool', 'ore', 'refugees', 'weapons', 'pilgrims', 'salvage', 'sealed relic crates'])],
      ['Hidden problem', choice(['core instability', 'sick crew', 'false captain', 'contraband', 'tracking curse', 'mutiny plot', 'hull parasites'])],
      ['Mission', choice(tables.missions)]
    ]));
  }

  function renderSupplyPlanner(panel) {
    const grid = document.createElement('div');
    grid.className = 'alpha-tool-grid';
    grid.innerHTML = `
      <label>Party size<input id="supply-party" type="number" min="0" value="4"></label>
      <label>Crew size<input id="supply-crew" type="number" min="0" value="12"></label>
      <label>Travel days<input id="supply-days" type="number" min="1" value="7"></label>
      <label>Water units stored<input id="supply-water" type="number" min="0" value="140"></label>
      <label>Food units stored<input id="supply-food" type="number" min="0" value="160"></label>
      <label>Skybeasts / animals<input id="supply-animals" type="number" min="0" value="2"></label>
    `;
    const button = makeGenerateButton('Calculate Supplies');
    const output = document.createElement('div');
    output.className = 'alpha-output';
    panel.append(grid, button, output);

    button.addEventListener('click', () => {
      const party = value('supply-party');
      const crew = value('supply-crew');
      const days = value('supply-days');
      const water = value('supply-water');
      const food = value('supply-food');
      const animals = value('supply-animals');
      const bodies = party + crew;
      const waterNeeded = (bodies * 1 + animals * 2) * days;
      const foodNeeded = (bodies * 1 + animals * 1.5) * days;
      const waterDelta = water - waterNeeded;
      const foodDelta = food - foodNeeded;
      renderOutput(output, 'Supply Projection', [
        ['Traveling people', String(bodies)],
        ['Animals / skybeasts', String(animals)],
        ['Water required', `${waterNeeded} units`],
        ['Food required', `${foodNeeded} units`],
        ['Water result', waterDelta >= 0 ? `${waterDelta} units surplus` : `${Math.abs(waterDelta)} units short`],
        ['Food result', foodDelta >= 0 ? `${foodDelta} units surplus` : `${Math.abs(foodDelta)} units short`],
        ['Crisis note', waterDelta < 0 || foodDelta < 0 ? 'Route needs resupply, rationing, rain capture, or trade stop.' : 'Stores cover the route before spoilage, theft, or storm loss.'],
        ['Random complication', choice(['storm delay adds 1d4 days', 'cistern contamination risk', 'crew morale drops under rationing', 'pirates target water cargo', 'animals consume extra under stress', 'unexpected rain capture opportunity'])]
      ], waterDelta < 0 || foodDelta < 0 ? 'scan-hit' : 'scan-clean');
    });
  }

  function makeGenerateButton(text) {
    const button = document.createElement('button');
    button.className = 'primary-action';
    button.type = 'button';
    button.textContent = text;
    return button;
  }

  function makeOutput(panel, button) {
    const output = document.createElement('div');
    output.className = 'alpha-output';
    panel.append(button, output);
    return output;
  }

  function value(id) {
    const input = document.getElementById(id);
    return Number(input?.value || 0);
  }

  const observer = new MutationObserver(decorateCards);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', decorateCards);
  setInterval(decorateCards, 1000);
})();
