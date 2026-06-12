(() => {
  const AIRSHIP_EDITOR_URL = 'data/kaysender/editors/airship-editor.json';
  let airshipEditorConfig = null;
  let latestAirshipProfile = null;

  function injectStyles() {
    if (document.getElementById('kaysender-airship-editor-style')) return;
    const style = document.createElement('style');
    style.id = 'kaysender-airship-editor-style';
    style.textContent = `
      .airship-editor-launch { margin-top: 10px; width: 100%; }
      .airship-import-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(260px, 1fr));
        gap: 12px;
        margin: 12px 0;
      }
      .airship-import-panel {
        border: 1px solid rgba(200,138,53,0.28);
        border-radius: 16px;
        padding: 14px;
        background: rgba(0,0,0,0.16);
      }
      .airship-import-panel textarea {
        min-height: 120px;
        font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
        font-size: 0.78rem;
      }
      @media (max-width: 900px) { .airship-import-grid { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(style);
  }

  async function loadConfig() {
    if (airshipEditorConfig) return airshipEditorConfig;
    const response = await fetch(AIRSHIP_EDITOR_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Airship editor request failed: ${response.status}`);
    airshipEditorConfig = await response.json();
    return airshipEditorConfig;
  }

  function switchKaysenderView() {
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === 'kaysender'));
    document.querySelectorAll('.nav-button').forEach(button => button.classList.toggle('active', button.dataset.view === 'kaysender'));
  }

  function getPanel() {
    let panel = document.getElementById('kaysender-airship-editor-panel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'kaysender-airship-editor-panel';
      panel.className = 'editor-panel no-print';
      const status = document.getElementById('kaysender-status');
      if (status) status.insertAdjacentElement('afterend', panel);
      else document.getElementById('kaysender')?.prepend(panel);
    }
    return panel;
  }

  async function openAirshipEditor() {
    injectStyles();
    switchKaysenderView();
    const panel = getPanel();
    panel.innerHTML = '<p class="helper-note">Loading detailed Airship / Vessel editor…</p>';

    try {
      const config = await loadConfig();
      renderAirshipEditor(panel, config);
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      panel.innerHTML = '<p class="helper-note">Airship editor could not be loaded. Confirm GitHub Pages or a local web server is serving JSON files.</p>';
    }
  }

  function renderAirshipEditor(panel, config) {
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

    const importGrid = document.createElement('div');
    importGrid.className = 'airship-import-grid';
    importGrid.innerHTML = `
      <div class="airship-import-panel">
        <h3>Optional Island Context</h3>
        <p class="helper-note">Paste a Floating Island / Skyland profile JSON here to inherit route and hazard pressure.</p>
        <textarea id="airship-island-import" placeholder="Paste Floating Island profile JSON here..."></textarea>
        <button id="airship-load-island" class="secondary-action" type="button">Read Island Context</button>
        <p id="airship-island-status" class="helper-note">No island profile loaded.</p>
      </div>
      <div class="airship-import-panel">
        <h3>Optional Settlement Context</h3>
        <p class="helper-note">Paste a Settlement / Skyport profile JSON here to inherit port, cargo, faction, and crisis pressure.</p>
        <textarea id="airship-settlement-import" placeholder="Paste Settlement profile JSON here..."></textarea>
        <button id="airship-load-settlement" class="secondary-action" type="button">Read Settlement Context</button>
        <p id="airship-settlement-status" class="helper-note">No settlement profile loaded.</p>
      </div>
    `;

    const form = document.createElement('form');
    form.id = 'airship-editor-form';
    form.className = 'editor-grid';
    form.autocomplete = 'off';
    config.controls.forEach(control => form.appendChild(createControl(control)));

    const actions = document.createElement('div');
    actions.className = 'editor-action-row';
    actions.innerHTML = `
      <button class="primary-action" type="button" id="airship-build-profile">Build Airship Profile</button>
      <button class="secondary-action" type="button" id="airship-randomize">Randomize Controls</button>
      <button class="secondary-action" type="button" id="airship-copy-json">Copy Profile JSON</button>
      <button class="secondary-action" type="button" id="airship-download-json">Download Profile JSON</button>
    `;

    const output = document.createElement('div');
    output.id = 'airship-editor-output';
    output.className = 'editor-output-grid';

    panel.append(header, sourceCard, importGrid, form, actions, output);

    panel.querySelector('#airship-load-island').addEventListener('click', () => loadContext(panel, 'island'));
    panel.querySelector('#airship-load-settlement').addEventListener('click', () => loadContext(panel, 'settlement'));
    panel.querySelector('#airship-build-profile').addEventListener('click', () => buildAndRenderProfile(config, panel));
    panel.querySelector('#airship-randomize').addEventListener('click', () => {
      randomizeControls(config, panel);
      buildAndRenderProfile(config, panel);
    });
    panel.querySelector('#airship-copy-json').addEventListener('click', copyProfileJson);
    panel.querySelector('#airship-download-json').addEventListener('click', downloadProfileJson);

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

  function loadContext(panel, type) {
    const textarea = panel.querySelector(`#airship-${type}-import`);
    const status = panel.querySelector(`#airship-${type}-status`);
    const text = textarea?.value || '';
    const key = type === 'island' ? 'sourceIsland' : 'sourceSettlement';
    if (!text.trim()) {
      panel.dataset[key] = '';
      if (status) status.textContent = `No ${type} profile loaded.`;
      buildAndRenderProfile(airshipEditorConfig, panel);
      return;
    }
    try {
      const parsed = JSON.parse(text);
      panel.dataset[key] = JSON.stringify(parsed);
      if (status) status.textContent = `Loaded ${type} context: ${parsed.name || parsed.outputs?.wikiDraft?.title || `unnamed ${type} profile`}.`;
      inheritDefaults(panel, type, parsed);
      buildAndRenderProfile(airshipEditorConfig, panel);
    } catch (error) {
      panel.dataset[key] = '';
      if (status) status.textContent = `Could not parse ${type} profile JSON.`;
    }
  }

  function inheritDefaults(panel, type, profile) {
    const form = panel.querySelector('#airship-editor-form');
    if (!form || !profile) return;
    if (type === 'island') {
      if (profile.routeAccess && form.elements.routeAccess) form.elements.routeAccess.value = mapIslandRoute(profile.routeAccess);
      if (profile.factionPressure && form.elements.factionEntanglement) form.elements.factionEntanglement.value = mapFaction(profile.factionPressure);
      if (profile.primaryResource && form.elements.cargoProfile) form.elements.cargoProfile.value = mapIslandResource(profile.primaryResource);
      if (profile.threatClock && form.elements.routeMandate) form.elements.routeMandate.value = mapThreatToMandate(profile.threatClock);
      if (profile.altitudeBand && form.elements.routeAccess) form.elements.routeAccess.value = mapAltitude(profile.altitudeBand, form.elements.routeAccess.value);
    }
    if (type === 'settlement') {
      if (profile.tradeAccess && form.elements.routeAccess) form.elements.routeAccess.value = mapSettlementTrade(profile.tradeAccess);
      if (profile.economyBase && form.elements.cargoProfile) form.elements.cargoProfile.value = mapSettlementEconomy(profile.economyBase);
      if (profile.factionPresence && form.elements.factionEntanglement) form.elements.factionEntanglement.value = mapFaction(profile.factionPresence);
      if (profile.crisisClock && form.elements.routeMandate) form.elements.routeMandate.value = mapSettlementCrisis(profile.crisisClock);
      if (profile.defensePosture && form.elements.legalStatus) form.elements.legalStatus.value = profile.defensePosture.includes('dragon') ? 'dragon-permitted tribute hauler' : form.elements.legalStatus.value;
      if (profile.name && form.elements.portOfCall) form.elements.portOfCall.value = mapPortOfCall(profile);
    }
  }

  function mapIslandRoute(value) {
    if (value.includes('storm')) return 'storm-edge capable';
    if (value.includes('dragon')) return 'dragon-route permitted';
    if (value.includes('hidden')) return 'hidden route optimized';
    if (value.includes('pilot')) return 'requires expert pilot';
    if (value.includes('no safe')) return 'unsafe for current route';
    return 'standard trade-wind capable';
  }

  function mapAltitude(value, current) {
    if (value.includes('high')) return 'high-altitude capable';
    if (value.includes('storm')) return 'storm-edge capable';
    if (value.includes('dragon')) return 'dragon-route permitted';
    return current;
  }

  function mapSettlementTrade(value) {
    if (value.includes('major')) return 'standard trade-wind capable';
    if (value.includes('seasonal')) return 'route charts outdated';
    if (value.includes('pilot')) return 'requires expert pilot';
    if (value.includes('storm')) return 'storm-edge capable';
    if (value.includes('pirate')) return 'hidden route optimized';
    if (value.includes('dragon')) return 'dragon-route permitted';
    if (value.includes('hidden')) return 'hidden route optimized';
    if (value.includes('cut off')) return 'unsafe for current route';
    return 'standard trade-wind capable';
  }

  function mapFaction(value) {
    if (value.includes('Surveyor')) return "Surveyor's Guild contract";
    if (value.includes('Skyweaver')) return 'Skyweaver Consortium warranty';
    if (value.includes('Black Fleet')) return 'Black Fleet shadow claim';
    if (value.includes('Dragon')) return 'Dragon Lord tithe papers';
    if (value.includes('Brotherhood')) return 'Free Sky Brotherhood courier job';
    if (value.includes('mercenary')) return 'mercenary company charter';
    if (value.includes('criminal')) return 'criminal syndicate debt';
    if (value.includes('temple')) return 'temple pilgrimage bond';
    return 'local merchant backers';
  }

  function mapIslandResource(value) {
    if (value.includes('freshwater')) return 'water barrels and cistern tanks';
    if (value.includes('skystone') || value.includes('ore')) return 'ore and skystone';
    if (value.includes('feathers')) return 'alchemical herbs and oils';
    if (value.includes('oils') || value.includes('herbs') || value.includes('moss')) return 'alchemical herbs and oils';
    if (value.includes('wool')) return 'sheffel wool and textiles';
    return 'mixed trade goods';
  }

  function mapSettlementEconomy(value) {
    if (value.includes('water')) return 'water barrels and cistern tanks';
    if (value.includes('grain') || value.includes('airfruit')) return 'skygrain and airfruit';
    if (value.includes('wool')) return 'sheffel wool and textiles';
    if (value.includes('repair')) return 'mixed trade goods';
    if (value.includes('ore') || value.includes('skystone')) return 'ore and skystone';
    if (value.includes('salvage')) return 'salvage and wreckage';
    if (value.includes('alchemical')) return 'alchemical herbs and oils';
    if (value.includes('smuggling')) return 'contraband under false manifest';
    if (value.includes('military')) return 'weapon crates';
    return 'mixed trade goods';
  }

  function mapThreatToMandate(value) {
    if (value.includes('water')) return 'answer a settlement distress call';
    if (value.includes('pirate')) return 'avoid a pirate-observed corridor';
    if (value.includes('storm')) return 'reach a port before storm closure';
    if (value.includes('collector') || value.includes('tithe')) return 'carry tribute without losing face';
    if (value.includes('drift') || value.includes('fracture')) return 'evacuate before island fracture';
    if (value.includes('survey')) return 'recover a missing survey crew';
    return 'deliver cargo under delay pressure';
  }

  function mapSettlementCrisis(value) {
    if (value.includes('water')) return 'answer a settlement distress call';
    if (value.includes('pirates')) return 'avoid a pirate-observed corridor';
    if (value.includes('storm')) return 'reach a port before storm closure';
    if (value.includes('food') || value.includes('convoy')) return 'deliver cargo under delay pressure';
    if (value.includes('disease')) return 'answer a settlement distress call';
    if (value.includes('dragon')) return 'carry tribute without losing face';
    if (value.includes('drift')) return 'evacuate before island fracture';
    return 'deliver cargo under delay pressure';
  }

  function mapPortOfCall(settlement) {
    const type = settlement.settlementType || '';
    if (type.includes('skyport')) return 'minor skyport';
    if (type.includes('village')) return 'frontier village dock';
    if (type.includes('guild')) return 'guild drydock';
    if (type.includes('pirate')) return 'pirate-tolerated harbor';
    if (type.includes('military')) return 'military watch island';
    if (type.includes('tavern')) return 'neutral-ground tavern stop';
    if (type.includes('dragon')) return 'dragon tribute landing';
    return 'minor skyport';
  }

  function getFormValues(panel) {
    const form = panel.querySelector('#airship-editor-form');
    const data = {};
    new FormData(form).forEach((value, key) => { data[key] = value; });
    return data;
  }

  function getContext(panel, key) {
    try { return panel.dataset[key] ? JSON.parse(panel.dataset[key]) : null; } catch (_) { return null; }
  }

  function randomizeControls(config, panel) {
    const form = panel.querySelector('#airship-editor-form');
    config.controls.forEach(control => {
      const field = form.elements[control.id];
      if (!field) return;
      if (control.type === 'select') field.value = choice(control.options);
      if (control.id === 'name') field.value = randomVesselName();
    });
  }

  function buildProfile(config, values, islandContext, settlementContext) {
    const scores = calculateScores(config, values, islandContext, settlementContext);
    const outputs = buildOutputs(config, values, scores, islandContext, settlementContext);
    return {
      name: values.name || 'Unnamed Skyship',
      profileType: 'airship-profile',
      sourceIslandProfile: islandContext,
      sourceSettlementProfile: settlementContext,
      vesselClass: values.vesselClass,
      hullCulture: values.hullCulture,
      coreType: values.coreType,
      purpose: values.purpose,
      legalStatus: values.legalStatus,
      crewQuality: values.crewQuality,
      crewScale: values.crewScale,
      captainStyle: values.captainStyle,
      cargoProfile: values.cargoProfile,
      armament: values.armament,
      defenseSystem: values.defenseSystem,
      condition: values.condition,
      maintenancePressure: values.maintenancePressure,
      routeAccess: values.routeAccess,
      routeMandate: values.routeMandate,
      factionEntanglement: values.factionEntanglement,
      hiddenProblem: values.hiddenProblem,
      currentMission: values.currentMission,
      moraleState: values.moraleState,
      fuelSupply: values.fuelSupply,
      portOfCall: values.portOfCall,
      derivedScores: scores,
      outputs
    };
  }

  function calculateScores(config, values, islandContext, settlementContext) {
    const airworthiness = 6 + scorePart(config.scoring.airworthiness.condition, values.condition) + scorePart(config.scoring.airworthiness.crewQuality, values.crewQuality) + scorePart(config.scoring.airworthiness.coreType, values.coreType) + routeContextModifier(islandContext, settlementContext);
    const cargoValue = 4 + scorePart(config.scoring.cargoValue.cargoProfile, values.cargoProfile) + scorePart(config.scoring.cargoValue.purpose, values.purpose) + settlementTradeModifier(settlementContext);
    const combatThreat = scorePart(config.scoring.combatThreat.armament, values.armament) + scorePart(config.scoring.combatThreat.vesselClass, values.vesselClass) + defenseModifier(values.defenseSystem);
    const maintenanceRisk = 2 + scorePart(config.scoring.risk.maintenancePressure, values.maintenancePressure) + conditionMaintenancePenalty(values.condition) + coreComplexityPenalty(values.coreType);
    const legalRisk = scorePart(config.scoring.risk.legalStatus, values.legalStatus) + factionLegalRisk(values.factionEntanglement) + hiddenProblemRisk(values.hiddenProblem);
    const crewMorale = 6 + scorePart(config.scoring.risk.moraleState, values.moraleState) + crewQualityMorale(values.crewQuality);
    const routeCompatibility = clamp(6 + routeCapability(values.routeAccess) + routeContextModifier(islandContext, settlementContext) - maintenanceRiskPenalty(values), 0, 20);
    const adventureDensity = clamp(Math.ceil((cargoValue + combatThreat + maintenanceRisk + legalRisk + (20 - crewMorale)) / 4), 1, 20);
    return {
      airworthiness: clamp(airworthiness, 0, 20),
      cargoValue: clamp(cargoValue, 0, 20),
      combatThreat: clamp(combatThreat, 0, 20),
      maintenanceRisk: clamp(maintenanceRisk, 0, 20),
      legalRisk: clamp(legalRisk, 0, 20),
      crewMorale: clamp(crewMorale, 0, 20),
      adventureDensity,
      routeCompatibility
    };
  }

  function routeContextModifier(island, settlement) {
    let mod = 0;
    if (island?.derivedScores) mod += Math.round((island.derivedScores.routeValue - island.derivedScores.collapseRisk) / 6);
    if (settlement?.derivedScores) mod += Math.round((settlement.derivedScores.tradeValue - settlement.derivedScores.unrestRisk) / 8);
    return mod;
  }

  function settlementTradeModifier(settlement) {
    if (!settlement?.derivedScores) return 0;
    return Math.round(settlement.derivedScores.tradeValue / 5) - 1;
  }

  function defenseModifier(value) {
    if (value.includes('magical') || value.includes('shielded') || value.includes('military')) return 2;
    if (value.includes('none')) return -2;
    if (value.includes('jury')) return -1;
    return 0;
  }

  function conditionMaintenancePenalty(value) {
    if (value.includes('pristine') || value.includes('well maintained')) return -1;
    if (value.includes('sputtering') || value.includes('fatigue') || value.includes('unsafe')) return 4;
    if (value.includes('damaged') || value.includes('salvage')) return 2;
    return 0;
  }

  function coreComplexityPenalty(value) {
    if (value.includes('experimental') || value.includes('unknown')) return 3;
    if (value.includes('elven') || value.includes('dragon kin')) return 2;
    if (value.includes('black-market')) return 2;
    return 0;
  }

  function factionLegalRisk(value) {
    if (value.includes('Black Fleet') || value.includes('criminal')) return 4;
    if (value.includes('Dragon') || value.includes('Free Sky')) return 2;
    if (value.includes('secret')) return 3;
    return 0;
  }

  function hiddenProblemRisk(value) {
    if (value.includes('false') || value.includes('contraband') || value.includes('sabotaged') || value.includes('blackmail')) return 3;
    if (value.includes('failing') || value.includes('contaminated')) return 2;
    return 1;
  }

  function crewQualityMorale(value) {
    if (value.includes('veteran') || value.includes('elite') || value.includes('loyal')) return 2;
    if (value.includes('mutinous') || value.includes('press-ganged')) return -3;
    if (value.includes('green')) return -2;
    return 0;
  }

  function routeCapability(value) {
    if (value.includes('high') || value.includes('storm') || value.includes('dragon') || value.includes('hidden')) return 3;
    if (value.includes('unsafe')) return -5;
    if (value.includes('outdated')) return -2;
    if (value.includes('expert')) return -1;
    if (value.includes('short-hop')) return -2;
    return 1;
  }

  function maintenanceRiskPenalty(values) {
    if (values.maintenancePressure.includes('fresh')) return 0;
    if (values.maintenancePressure.includes('overdue')) return 1;
    if (values.maintenancePressure.includes('failing') || values.maintenancePressure.includes('unstable')) return 3;
    return 2;
  }

  function buildOutputs(config, values, scores, islandContext, settlementContext) {
    const summary = fillTemplate(config.outputTemplates.summary, values);
    const technicalNotes = config.outputTemplates.technicalNotes.map(template => fillTemplate(template, values));
    const crewHooks = config.outputTemplates.crewHooks.map(template => fillTemplate(template, values));
    const cargoHooks = config.outputTemplates.cargoHooks.map(template => fillTemplate(template, values));
    const routeHooks = config.outputTemplates.routeHooks.map(template => fillTemplate(template, values));
    const factionHooks = config.outputTemplates.factionHooks.map(template => fillTemplate(template, values));
    const maintenanceHooks = config.outputTemplates.maintenanceHooks.map(template => fillTemplate(template, values));
    const encounterHooks = config.outputTemplates.encounterHooks.map(template => fillTemplate(template, values));
    if (islandContext) routeHooks.push(`Island context inherited from ${islandContext.name || 'an unnamed island'}: route value ${islandContext.derivedScores?.routeValue ?? 'unknown'}, collapse risk ${islandContext.derivedScores?.collapseRisk ?? 'unknown'}.`);
    if (settlementContext) cargoHooks.push(`Settlement context inherited from ${settlementContext.name || 'an unnamed settlement'}: trade value ${settlementContext.derivedScores?.tradeValue ?? 'unknown'}, unrest risk ${settlementContext.derivedScores?.unrestRisk ?? 'unknown'}, economy ${settlementContext.economyBase || 'unknown'}.`);
    const wikiDraft = {
      id: slugify(values.name || 'unnamed-skyship'),
      title: values.name || 'Unnamed Skyship',
      category: 'Ships',
      summary,
      body: [
        summary,
        `Airworthiness ${scores.airworthiness}/20, cargo value ${scores.cargoValue}/20, combat threat ${scores.combatThreat}/20, maintenance risk ${scores.maintenanceRisk}/20, legal risk ${scores.legalRisk}/20, crew morale ${scores.crewMorale}/20.`,
        `Current mission: ${values.currentMission}; route mandate: ${values.routeMandate}; hidden problem: ${values.hiddenProblem}.`
      ],
      tags: ['airship', values.vesselClass, values.hullCulture, values.coreType, values.factionEntanglement],
      relatedEntries: ['airships', 'scarcity-loop', 'water-trade'],
      relatedModules: ['airship-vessel-generator', 'airship-core-builder', 'npc-crew-generator', 'world-map-route-generator']
    };
    return { summary, technicalNotes, crewHooks, cargoHooks, routeHooks, factionHooks, maintenanceHooks, encounterHooks, wikiDraft };
  }

  function buildAndRenderProfile(config, panel) {
    const values = getFormValues(panel);
    const islandContext = getContext(panel, 'sourceIsland');
    const settlementContext = getContext(panel, 'sourceSettlement');
    latestAirshipProfile = buildProfile(config, values, islandContext, settlementContext);
    renderProfile(panel, latestAirshipProfile);
  }

  function renderProfile(panel, profile) {
    const output = panel.querySelector('#airship-editor-output');
    if (!output) return;
    output.innerHTML = '';
    const overview = document.createElement('article');
    overview.className = 'editor-card';
    overview.innerHTML = `
      <h3>${profile.name}</h3>
      <p>${profile.outputs.summary}</p>
      <div class="score-grid">
        ${scoreBox('Airworthiness', profile.derivedScores.airworthiness)}
        ${scoreBox('Cargo Value', profile.derivedScores.cargoValue)}
        ${scoreBox('Combat Threat', profile.derivedScores.combatThreat)}
        ${scoreBox('Maintenance Risk', profile.derivedScores.maintenanceRisk)}
        ${scoreBox('Legal Risk', profile.derivedScores.legalRisk)}
        ${scoreBox('Crew Morale', profile.derivedScores.crewMorale)}
        ${scoreBox('Adventure Density', profile.derivedScores.adventureDensity)}
        ${scoreBox('Route Compatibility', profile.derivedScores.routeCompatibility)}
      </div>
      ${renderList('Technical Notes', profile.outputs.technicalNotes)}
      ${renderList('Crew Hooks', profile.outputs.crewHooks)}
      ${renderList('Cargo Hooks', profile.outputs.cargoHooks)}
      ${renderList('Route Hooks', profile.outputs.routeHooks)}
      ${renderList('Faction Hooks', profile.outputs.factionHooks)}
      ${renderList('Maintenance Hooks', profile.outputs.maintenanceHooks)}
      ${renderList('Encounter Hooks', profile.outputs.encounterHooks)}
    `;
    const exportCard = document.createElement('article');
    exportCard.className = 'editor-card';
    exportCard.innerHTML = `
      <h3>Structured Output</h3>
      <p>This profile is shaped for campaign-note storage, generated wiki entries, route planning, port scenes, crew generation, market cargo, and encounter generation.</p>
      <h4>Draft Wiki Entry</h4>
      <textarea class="json-export" readonly>${JSON.stringify(profile.outputs.wikiDraft, null, 2)}</textarea>
      <h4>Full Airship Profile JSON</h4>
      <textarea class="json-export" readonly>${JSON.stringify(profile, null, 2)}</textarea>
    `;
    output.append(overview, exportCard);
  }

  async function copyProfileJson() {
    if (!latestAirshipProfile) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(latestAirshipProfile, null, 2));
      alert('Airship profile JSON copied.');
    } catch (error) {
      alert('Clipboard copy failed. Use the visible JSON text area instead.');
    }
  }

  function downloadProfileJson() {
    if (!latestAirshipProfile) return;
    const blob = new Blob([JSON.stringify(latestAirshipProfile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${slugify(latestAirshipProfile.name)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function decorateCards() {
    injectStyles();
    document.querySelectorAll('.module-card').forEach(card => {
      if (card.dataset.moduleId !== 'airship-vessel-generator' || card.dataset.airshipEditorLinked === 'true') return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'primary-action airship-editor-launch';
      button.textContent = 'Launch Detailed Airship Editor';
      button.addEventListener('click', openAirshipEditor);
      card.appendChild(button);
      card.dataset.airshipEditorLinked = 'true';
    });
  }

  function scorePart(table, key) { return table && key in table ? Number(table[key]) || 0 : 0; }
  function fillTemplate(template, values) { return template.replace(/\{(\w+)\}/g, (_, key) => values[key] || 'unknown'); }
  function renderList(title, items) { return `<h4>${title}</h4><ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`; }
  function scoreBox(title, value) { return `<div class="score-box"><span>${title}</span><strong>${value}</strong></div>`; }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function choice(list) { return list[Math.floor(Math.random() * list.length)]; }
  function slugify(value) { return String(value || 'unnamed-skyship').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unnamed-skyship'; }

  function randomVesselName() {
    const prefixes = ['Aether', 'Brass', 'Cloud', 'Drift', 'Ember', 'Hollow', 'Iron', 'Sable', 'Sky', 'Storm', 'Veyr', 'Wind'];
    const roots = ['Crown', 'Gull', 'Lantern', 'Mast', 'Promise', 'Rook', 'Runner', 'Spear', 'Star', 'Tithe', 'Wake', 'Warden'];
    return `${choice(prefixes)} ${choice(roots)}`;
  }

  window.openAirshipEditor = openAirshipEditor;
  const observer = new MutationObserver(decorateCards);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', decorateCards);
  setInterval(decorateCards, 1000);
})();
