(() => {
  const SETTLEMENT_EDITOR_URL = 'data/kaysender/editors/settlement-editor.json';
  let settlementEditorConfig = null;
  let latestSettlementProfile = null;

  function injectStyles() {
    if (document.getElementById('kaysender-settlement-editor-style')) return;
    const style = document.createElement('style');
    style.id = 'kaysender-settlement-editor-style';
    style.textContent = `
      .settlement-editor-launch { margin-top: 10px; width: 100%; }
      .settlement-import-panel {
        border: 1px solid rgba(200,138,53,0.28);
        border-radius: 16px;
        padding: 14px;
        margin: 12px 0;
        background: rgba(0,0,0,0.16);
      }
      .settlement-import-panel textarea {
        min-height: 120px;
        font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
        font-size: 0.78rem;
      }
    `;
    document.head.appendChild(style);
  }

  async function loadConfig() {
    if (settlementEditorConfig) return settlementEditorConfig;
    const response = await fetch(SETTLEMENT_EDITOR_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Settlement editor request failed: ${response.status}`);
    settlementEditorConfig = await response.json();
    return settlementEditorConfig;
  }

  function switchKaysenderView() {
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === 'kaysender'));
    document.querySelectorAll('.nav-button').forEach(button => button.classList.toggle('active', button.dataset.view === 'kaysender'));
  }

  function getPanel() {
    let panel = document.getElementById('kaysender-settlement-editor-panel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'kaysender-settlement-editor-panel';
      panel.className = 'editor-panel no-print';
      const status = document.getElementById('kaysender-status');
      if (status) status.insertAdjacentElement('afterend', panel);
      else document.getElementById('kaysender')?.prepend(panel);
    }
    return panel;
  }

  async function openSettlementEditor() {
    injectStyles();
    switchKaysenderView();
    const panel = getPanel();
    panel.innerHTML = '<p class="helper-note">Loading detailed Settlement / Skyport editor…</p>';

    try {
      const config = await loadConfig();
      renderSettlementEditor(panel, config);
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      panel.innerHTML = '<p class="helper-note">Settlement editor could not be loaded. Confirm GitHub Pages or a local web server is serving JSON files.</p>';
    }
  }

  function renderSettlementEditor(panel, config) {
    panel.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'section-heading';
    header.innerHTML = `
      <p class="eyebrow">Stage ${config.stage} editor-alpha</p>
      <h2>${config.title}</h2>
      <p>${config.purpose}</p>
    `;

    const sourceCard = document.createElement('article');
    sourceCard.className = 'editor-card';
    sourceCard.innerHTML = `<h3>Source-derived build assumptions</h3><ul>${config.sourceThemes.map(theme => `<li>${theme}</li>`).join('')}</ul>`;

    const importPanel = document.createElement('div');
    importPanel.className = 'settlement-import-panel';
    importPanel.innerHTML = `
      <h3>Optional Island Context</h3>
      <p class="helper-note">Paste a Floating Island / Skyland profile JSON here to make the settlement inherit island pressure. The editor still works without it.</p>
      <textarea id="settlement-island-import" placeholder="Paste Floating Island profile JSON here..."></textarea>
      <button id="settlement-load-island" class="secondary-action" type="button">Read Island Context</button>
      <p id="settlement-island-status" class="helper-note">No island profile loaded.</p>
    `;

    const form = document.createElement('form');
    form.id = 'settlement-editor-form';
    form.className = 'editor-grid';
    form.autocomplete = 'off';
    config.controls.forEach(control => form.appendChild(createControl(control)));

    const actions = document.createElement('div');
    actions.className = 'editor-action-row';
    actions.innerHTML = `
      <button class="primary-action" type="button" id="settlement-build-profile">Build Settlement Profile</button>
      <button class="secondary-action" type="button" id="settlement-randomize">Randomize Controls</button>
      <button class="secondary-action" type="button" id="settlement-copy-json">Copy Profile JSON</button>
      <button class="secondary-action" type="button" id="settlement-download-json">Download Profile JSON</button>
    `;

    const output = document.createElement('div');
    output.id = 'settlement-editor-output';
    output.className = 'editor-output-grid';

    panel.append(header, sourceCard, importPanel, form, actions, output);

    panel.querySelector('#settlement-load-island').addEventListener('click', () => loadIslandContext(panel));
    panel.querySelector('#settlement-build-profile').addEventListener('click', () => buildAndRenderProfile(config, panel));
    panel.querySelector('#settlement-randomize').addEventListener('click', () => {
      randomizeControls(config, panel);
      buildAndRenderProfile(config, panel);
    });
    panel.querySelector('#settlement-copy-json').addEventListener('click', copyProfileJson);
    panel.querySelector('#settlement-download-json').addEventListener('click', downloadProfileJson);

    buildAndRenderProfile(config, panel);
  }

  function createControl(control) {
    const label = document.createElement('label');
    label.textContent = control.label;
    if (control.type === 'select') {
      const select = document.createElement('select');
      select.name = control.id;
      control.options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        if (option === control.default) opt.selected = true;
        select.appendChild(opt);
      });
      label.appendChild(select);
      return label;
    }
    const input = document.createElement('input');
    input.name = control.id;
    input.type = control.type || 'text';
    input.value = control.default || '';
    label.appendChild(input);
    return label;
  }

  function loadIslandContext(panel) {
    const text = panel.querySelector('#settlement-island-import')?.value || '';
    const status = panel.querySelector('#settlement-island-status');
    if (!text.trim()) {
      panel.dataset.sourceIsland = '';
      if (status) status.textContent = 'No island profile loaded.';
      buildAndRenderProfile(settlementEditorConfig, panel);
      return;
    }
    try {
      const parsed = JSON.parse(text);
      panel.dataset.sourceIsland = JSON.stringify(parsed);
      if (status) status.textContent = `Loaded island context: ${parsed.name || parsed.outputs?.wikiDraft?.title || 'unnamed island profile'}.`;
      inheritIslandDefaults(panel, parsed);
      buildAndRenderProfile(settlementEditorConfig, panel);
    } catch (error) {
      panel.dataset.sourceIsland = '';
      if (status) status.textContent = 'Could not parse island profile JSON.';
    }
  }

  function inheritIslandDefaults(panel, island) {
    const form = panel.querySelector('#settlement-editor-form');
    if (!form || !island) return;
    if (island.settlementFootprint && form.elements.settlementType) form.elements.settlementType.value = island.settlementFootprint;
    if (island.waterProfile && form.elements.waterStatus) form.elements.waterStatus.value = mapIslandWater(island.waterProfile);
    if (island.foodProfile && form.elements.foodStatus) form.elements.foodStatus.value = mapIslandFood(island.foodProfile);
    if (island.routeAccess && form.elements.tradeAccess) form.elements.tradeAccess.value = mapIslandRoute(island.routeAccess);
    if (island.factionPressure && form.elements.factionPresence) form.elements.factionPresence.value = mapIslandFaction(island.factionPressure);
    if (island.threatClock && form.elements.crisisClock) form.elements.crisisClock.value = mapIslandThreat(island.threatClock);
  }

  function mapIslandWater(value) {
    if (value.includes('rain')) return 'rain capture network';
    if (value.includes('dew')) return 'cloud dew collectors';
    if (value.includes('tainted')) return 'tainted wells or tanks';
    if (value.includes('import')) return 'import dependent';
    if (value.includes('tithe') || value.includes('lost')) return 'dragon tithe depleted';
    if (value.includes('export')) return 'water auction economy';
    if (value.includes('hidden')) return 'hidden emergency reserve';
    return 'rationed cisterns';
  }

  function mapIslandFood(value) {
    if (value.includes('surplus')) return 'surplus exports';
    if (value.includes('disease')) return 'herd disease';
    if (value.includes('import')) return 'import dependent';
    if (value.includes('starv')) return 'famine risk';
    if (value.includes('blight')) return 'crop blight';
    return 'tight but stable';
  }

  function mapIslandRoute(value) {
    if (value.includes('easy')) return 'major trade lane';
    if (value.includes('risky')) return 'minor route access';
    if (value.includes('pilot')) return 'requires local pilot';
    if (value.includes('storm')) return 'storm-disrupted route';
    if (value.includes('pirate')) return 'pirate-watched route';
    if (value.includes('dragon')) return 'dragon-permitted route';
    if (value.includes('hidden')) return 'hidden approach';
    if (value.includes('no safe')) return 'cut off from trade';
    return 'minor route access';
  }

  function mapIslandFaction(value) {
    if (value.includes('Surveyor')) return "Surveyor's Guild office";
    if (value.includes('Skyweaver')) return 'Skyweaver Consortium contract';
    if (value.includes('Black Fleet')) return 'Black Fleet informants';
    if (value.includes('Dragon')) return 'Dragon Lord collectors';
    if (value.includes('Brotherhood')) return 'Free Sky Brotherhood cell';
    if (value.includes('criminal')) return 'criminal syndicate broker';
    return 'local merchant guild';
  }

  function mapIslandThreat(value) {
    if (value.includes('water')) return 'water stores will fail within days';
    if (value.includes('pirate')) return 'pirates are expected before dawn';
    if (value.includes('storm')) return 'storm season will close the route';
    if (value.includes('disease')) return 'disease spreads through herds';
    if (value.includes('collector') || value.includes('tithe')) return 'dragon collector is returning early';
    if (value.includes('drift')) return 'island drift threatens evacuation';
    return 'tithe fleet recently departed';
  }

  function getFormValues(panel) {
    const form = panel.querySelector('#settlement-editor-form');
    const data = {};
    new FormData(form).forEach((value, key) => { data[key] = value; });
    return data;
  }

  function getIslandContext(panel) {
    try {
      return panel.dataset.sourceIsland ? JSON.parse(panel.dataset.sourceIsland) : null;
    } catch (_) {
      return null;
    }
  }

  function randomizeControls(config, panel) {
    const form = panel.querySelector('#settlement-editor-form');
    config.controls.forEach(control => {
      const field = form.elements[control.id];
      if (!field) return;
      if (control.type === 'select') field.value = choice(control.options);
      if (control.id === 'name') field.value = randomSettlementName();
    });
  }

  function buildProfile(config, values, islandContext) {
    const scores = calculateScores(config, values, islandContext);
    const outputs = buildOutputs(config, values, scores, islandContext);
    return {
      name: values.name || 'Unnamed Skyport',
      profileType: 'settlement-profile',
      sourceIslandProfile: islandContext,
      settlementType: values.settlementType,
      populationScale: values.populationScale,
      governmentType: values.governmentType,
      defensePosture: values.defensePosture,
      economyBase: values.economyBase,
      waterStatus: values.waterStatus,
      foodStatus: values.foodStatus,
      tradeAccess: values.tradeAccess,
      factionPresence: values.factionPresence,
      socialStress: values.socialStress,
      civicAsset: values.civicAsset,
      localSecret: values.localSecret,
      crisisClock: values.crisisClock,
      derivedScores: scores,
      outputs
    };
  }

  function calculateScores(config, values, islandContext) {
    const survivability = 6 + scorePart(config.scoring.survivability.waterStatus, values.waterStatus) + scorePart(config.scoring.survivability.foodStatus, values.foodStatus) + scorePart(config.scoring.survivability.defensePosture, values.defensePosture) + islandSurvivalModifier(islandContext);
    const tradeValue = 5 + scorePart(config.scoring.tradeValue.economyBase, values.economyBase) + scorePart(config.scoring.tradeValue.tradeAccess, values.tradeAccess) + islandTradeModifier(islandContext);
    const defenseReadiness = clamp(5 + scorePart(config.scoring.survivability.defensePosture, values.defensePosture) + defenseFactionModifier(values), 0, 20);
    const unrestRisk = 2 + scorePart(config.scoring.unrestRisk.socialStress, values.socialStress) + scorePart(config.scoring.unrestRisk.factionPresence, values.factionPresence) + scorePart(config.scoring.unrestRisk.crisisClock, values.crisisClock) + islandUnrestModifier(islandContext);
    const islandDependency = clamp(islandContext ? 6 + (islandContext.derivedScores?.collapseRisk || 0) - Math.floor((islandContext.derivedScores?.habitability || 5) / 2) : 3, 0, 20);
    const adventureDensity = clamp(Math.ceil((tradeValue + unrestRisk + islandDependency) / 3), 1, 20);
    return {
      survivability: clamp(survivability, 0, 20),
      tradeValue: clamp(tradeValue, 0, 20),
      defenseReadiness,
      unrestRisk: clamp(unrestRisk, 0, 20),
      adventureDensity,
      islandDependency
    };
  }

  function islandSurvivalModifier(island) {
    if (!island?.derivedScores) return 0;
    return Math.round((island.derivedScores.habitability - island.derivedScores.collapseRisk) / 5);
  }

  function islandTradeModifier(island) {
    if (!island?.derivedScores) return 0;
    return Math.round(island.derivedScores.routeValue / 5) - 1;
  }

  function islandUnrestModifier(island) {
    if (!island?.derivedScores) return 0;
    return Math.round((island.derivedScores.conflictPressure + island.derivedScores.collapseRisk) / 8);
  }

  function defenseFactionModifier(values) {
    if (values.factionPresence.includes('Dragon')) return 2;
    if (values.factionPresence.includes('mercenary')) return 2;
    if (values.factionPresence.includes('Black Fleet')) return -2;
    if (values.factionPresence.includes('criminal')) return -1;
    return 0;
  }

  function buildOutputs(config, values, scores, islandContext) {
    const summary = fillTemplate(config.outputTemplates.summary, values);
    const gmNotes = config.outputTemplates.gmNoteTemplates.map(template => fillTemplate(template, values));
    if (islandContext) {
      gmNotes.push(`Island context inherited from ${islandContext.name || 'an unnamed island'}: habitability ${islandContext.derivedScores?.habitability ?? 'unknown'}, route value ${islandContext.derivedScores?.routeValue ?? 'unknown'}, collapse risk ${islandContext.derivedScores?.collapseRisk ?? 'unknown'}.`);
    }
    const leadershipHooks = config.outputTemplates.leadershipHooks.map(template => fillTemplate(template, values));
    const marketHooks = config.outputTemplates.marketHooks.map(template => fillTemplate(template, values));
    const factionHooks = config.outputTemplates.factionHooks.map(template => fillTemplate(template, values));
    const defenseHooks = config.outputTemplates.defenseHooks.map(template => fillTemplate(template, values));
    const jobHooks = config.outputTemplates.jobHooks.map(template => fillTemplate(template, values));
    const wikiDraft = {
      id: slugify(values.name || 'unnamed-skyport'),
      title: values.name || 'Unnamed Skyport',
      category: 'Settlements',
      summary,
      body: [
        summary,
        `Survivability ${scores.survivability}/20, trade value ${scores.tradeValue}/20, defense readiness ${scores.defenseReadiness}/20, unrest risk ${scores.unrestRisk}/20, adventure density ${scores.adventureDensity}/20.`,
        `Core scene assets: ${values.civicAsset}; current crisis: ${values.crisisClock}; local secret: ${values.localSecret}.`
      ],
      tags: ['settlement', values.settlementType, values.economyBase, values.factionPresence, values.crisisClock],
      relatedEntries: ['floating-islands', 'scarcity-loop', 'water-trade'],
      relatedModules: ['settlement-generator', 'shop-market-generator', 'supply-water-planner', 'job-board-generator']
    };
    return { summary, gmNotes, leadershipHooks, marketHooks, factionHooks, defenseHooks, jobHooks, wikiDraft };
  }

  function buildAndRenderProfile(config, panel) {
    const values = getFormValues(panel);
    const islandContext = getIslandContext(panel);
    latestSettlementProfile = buildProfile(config, values, islandContext);
    renderProfile(panel, latestSettlementProfile);
  }

  function renderProfile(panel, profile) {
    const output = panel.querySelector('#settlement-editor-output');
    if (!output) return;
    output.innerHTML = '';

    const overview = document.createElement('article');
    overview.className = 'editor-card';
    overview.innerHTML = `
      <h3>${profile.name}</h3>
      <p>${profile.outputs.summary}</p>
      <div class="score-grid">
        ${scoreBox('Survivability', profile.derivedScores.survivability)}
        ${scoreBox('Trade Value', profile.derivedScores.tradeValue)}
        ${scoreBox('Defense', profile.derivedScores.defenseReadiness)}
        ${scoreBox('Unrest Risk', profile.derivedScores.unrestRisk)}
        ${scoreBox('Adventure Density', profile.derivedScores.adventureDensity)}
        ${scoreBox('Island Dependency', profile.derivedScores.islandDependency)}
      </div>
      ${renderList('GM Notes', profile.outputs.gmNotes)}
      ${renderList('Leadership Hooks', profile.outputs.leadershipHooks)}
      ${renderList('Market Hooks', profile.outputs.marketHooks)}
      ${renderList('Faction Hooks', profile.outputs.factionHooks)}
      ${renderList('Defense Hooks', profile.outputs.defenseHooks)}
      ${renderList('Job Hooks', profile.outputs.jobHooks)}
    `;

    const exportCard = document.createElement('article');
    exportCard.className = 'editor-card';
    exportCard.innerHTML = `
      <h3>Structured Output</h3>
      <p>This profile is shaped for later campaign-note storage, generated wiki entries, market generation, faction generation, and job-board generation.</p>
      <h4>Draft Wiki Entry</h4>
      <textarea class="json-export" readonly>${JSON.stringify(profile.outputs.wikiDraft, null, 2)}</textarea>
      <h4>Full Settlement Profile JSON</h4>
      <textarea class="json-export" readonly>${JSON.stringify(profile, null, 2)}</textarea>
    `;

    output.append(overview, exportCard);
  }

  async function copyProfileJson() {
    if (!latestSettlementProfile) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(latestSettlementProfile, null, 2));
      alert('Settlement profile JSON copied.');
    } catch (error) {
      alert('Clipboard copy failed. Use the visible JSON text area instead.');
    }
  }

  function downloadProfileJson() {
    if (!latestSettlementProfile) return;
    const blob = new Blob([JSON.stringify(latestSettlementProfile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${slugify(latestSettlementProfile.name)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function decorateCards() {
    injectStyles();
    document.querySelectorAll('.module-card').forEach(card => {
      if (card.dataset.moduleId !== 'settlement-generator' || card.dataset.settlementEditorLinked === 'true') return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'primary-action settlement-editor-launch';
      button.textContent = 'Launch Detailed Settlement Editor';
      button.addEventListener('click', openSettlementEditor);
      card.appendChild(button);
      card.dataset.settlementEditorLinked = 'true';
    });
  }

  function scorePart(table, key) {
    if (!table || !(key in table)) return 0;
    return Number(table[key]) || 0;
  }

  function fillTemplate(template, values) {
    return template.replace(/\{(\w+)\}/g, (_, key) => values[key] || 'unknown');
  }

  function renderList(title, items) {
    return `<h4>${title}</h4><ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
  }

  function scoreBox(title, value) {
    return `<div class="score-box"><span>${title}</span><strong>${value}</strong></div>`;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function choice(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function slugify(value) {
    return String(value || 'unnamed-skyport').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unnamed-skyport';
  }

  function randomSettlementName() {
    const prefixes = ['Dun', 'Hollow', 'Wind', 'Ash', 'Veyr', 'Cloud', 'Stone', 'Brass', 'Sable', 'High', 'Rook', 'Fallow'];
    const roots = ['roost', 'harbor', 'watch', 'haven', 'mill', 'gate', 'end', 'dock', 'reach', 'spire', 'field', 'rest'];
    return `${choice(prefixes)}${choice(roots)}`;
  }

  window.openSettlementEditor = openSettlementEditor;

  const observer = new MutationObserver(decorateCards);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', decorateCards);
  setInterval(decorateCards, 1000);
})();
