(() => {
  const CONFIG_URL = 'data/kaysender/editors/floating-island-editor.json';
  let editorConfig = null;
  let latestProfile = null;

  const editorModules = {
    'floating-island-generator': {
      label: 'Launch Island Foundation Editor',
      open: openEditor
    }
  };

  function injectStyles() {
    if (document.getElementById('kaysender-editor-style')) return;
    const style = document.createElement('style');
    style.id = 'kaysender-editor-style';
    style.textContent = `
      .editor-launch { margin-top: 10px; width: 100%; }
      .editor-panel { border: 1px solid var(--line); border-radius: 24px; padding: 22px; margin: 18px 0 28px; background: linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025)); box-shadow: var(--shadow); }
      .editor-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 16px 0; }
      .editor-grid label { color: var(--muted); font-size: 0.76rem; display: grid; gap: 5px; }
      .editor-grid input, .editor-grid select, .editor-panel textarea { background: #10131a; border: 1px solid var(--line); color: var(--ink); border-radius: 12px; padding: 10px 12px; width: 100%; }
      .editor-action-row { display: flex; flex-wrap: wrap; gap: 10px; margin: 12px 0 18px; }
      .editor-action-row button { width: auto; }
      .editor-output-grid { display: grid; grid-template-columns: minmax(300px, 0.9fr) minmax(420px, 1.1fr); gap: 16px; align-items: start; }
      .editor-card { border: 1px solid rgba(200,138,53,0.35); border-radius: 18px; padding: 16px; background: rgba(0,0,0,0.18); overflow: auto; }
      .editor-card h3, .editor-card h4 { color: var(--accent); }
      .editor-card p, .editor-card li { color: var(--muted); line-height: 1.5; }
      .score-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
      .score-box { border: 1px solid var(--line); border-radius: 14px; padding: 10px; background: rgba(255,255,255,0.04); }
      .score-box strong { display: block; color: var(--ink); font-size: 1.3rem; }
      .json-export { min-height: 280px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 0.76rem; }
      .island-map-wrap { overflow: auto; border: 1px solid var(--line); border-radius: 14px; background: #0c1016; padding: 10px; }
      .island-map { min-width: 680px; width: 100%; height: auto; display: block; }
      .map-legend { display: flex; flex-wrap: wrap; gap: 8px 12px; margin-top: 10px; font-size: 0.72rem; color: var(--muted); }
      .map-key { display: inline-flex; align-items: center; gap: 5px; }
      .map-swatch { width: 12px; height: 12px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.25); }
      .foundation-table { width: 100%; border-collapse: collapse; font-size: 0.78rem; }
      .foundation-table th, .foundation-table td { text-align: left; border-bottom: 1px solid rgba(255,255,255,0.08); padding: 6px; vertical-align: top; }
      .foundation-table th { color: var(--ink); }
      .warning-box { border-left: 4px solid #c88a35; padding: 8px 12px; background: rgba(200,138,53,0.09); margin: 10px 0; color: var(--muted); }
      @media (max-width: 1200px) { .editor-grid { grid-template-columns: repeat(2, minmax(0,1fr)); } .editor-output-grid { grid-template-columns: 1fr; } }
      @media (max-width: 700px) { .editor-grid, .score-grid { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(style);
  }

  async function loadConfig() {
    if (editorConfig) return editorConfig;
    const response = await fetch(CONFIG_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Island editor request failed: ${response.status}`);
    editorConfig = await response.json();
    return editorConfig;
  }

  function switchKaysenderView() {
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === 'kaysender'));
    document.querySelectorAll('.nav-button').forEach(button => button.classList.toggle('active', button.dataset.view === 'kaysender'));
  }

  function getPanel() {
    let panel = document.getElementById('kaysender-editor-panel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'kaysender-editor-panel';
      panel.className = 'editor-panel no-print';
      const status = document.getElementById('kaysender-status');
      if (status) status.insertAdjacentElement('afterend', panel);
      else document.getElementById('kaysender')?.prepend(panel);
    }
    return panel;
  }

  async function openEditor() {
    injectStyles();
    switchKaysenderView();
    const panel = getPanel();
    panel.innerHTML = '<p class="helper-note">Loading quantitative island foundation editor…</p>';
    try {
      const config = await loadConfig();
      renderEditor(panel, config);
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      panel.innerHTML = '<p class="helper-note">Island foundation editor could not be loaded. Use GitHub Pages or a local web server.</p>';
    }
  }

  function renderEditor(panel, config) {
    panel.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'section-heading';
    header.innerHTML = `<p class="eyebrow">Stage ${config.stage} ${config.status}</p><h2>${config.title}</h2><p>${config.purpose}</p>`;

    const assumptions = document.createElement('article');
    assumptions.className = 'editor-card';
    assumptions.innerHTML = `<h3>Foundation assumptions</h3><ul>${config.sourceThemes.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;

    const form = document.createElement('form');
    form.id = 'floating-island-editor-form';
    form.className = 'editor-grid';
    form.autocomplete = 'off';
    config.controls.forEach(control => form.appendChild(createControl(control)));

    const actions = document.createElement('div');
    actions.className = 'editor-action-row';
    actions.innerHTML = `
      <button class="primary-action" type="button" id="island-build-profile">Build Foundation</button>
      <button class="secondary-action" type="button" id="island-randomize">Randomize Full Island</button>
      <button class="secondary-action" type="button" id="island-apply-size">Apply Size Preset</button>
      <button class="secondary-action" type="button" id="island-copy-json">Copy Profile JSON</button>
      <button class="secondary-action" type="button" id="island-download-json">Download Profile JSON</button>
    `;

    const output = document.createElement('div');
    output.id = 'floating-island-editor-output';
    output.className = 'editor-output-grid';
    panel.append(header, assumptions, form, actions, output);

    panel.querySelector('#island-build-profile').addEventListener('click', () => buildAndRender(config, panel));
    panel.querySelector('#island-randomize').addEventListener('click', () => { randomizeControls(config, panel); buildAndRender(config, panel); });
    panel.querySelector('#island-apply-size').addEventListener('click', () => { applySizePreset(config, panel, false); buildAndRender(config, panel); });
    panel.querySelector('#island-copy-json').addEventListener('click', copyJson);
    panel.querySelector('#island-download-json').addEventListener('click', downloadJson);
    panel.querySelector('[name="sizeClass"]').addEventListener('change', () => applySizePreset(config, panel, true));
    buildAndRender(config, panel);
  }

  function createControl(control) {
    const label = document.createElement('label');
    label.textContent = control.label;
    let field;
    if (control.type === 'select') {
      field = document.createElement('select');
      control.options.forEach(option => {
        const item = document.createElement('option');
        item.value = option;
        item.textContent = option;
        if (option === control.default) item.selected = true;
        field.appendChild(item);
      });
    } else {
      field = document.createElement('input');
      field.type = control.type || 'text';
      field.value = control.default ?? '';
      if (control.min !== undefined) field.min = control.min;
      if (control.max !== undefined) field.max = control.max;
      if (control.step !== undefined) field.step = control.step;
    }
    field.name = control.id;
    label.appendChild(field);
    return label;
  }

  function getValues(panel) {
    const raw = {};
    new FormData(panel.querySelector('#floating-island-editor-form')).forEach((value, key) => { raw[key] = value; });
    const numericIds = new Set(editorConfig.controls.filter(control => control.type === 'number').map(control => control.id));
    Object.keys(raw).forEach(key => { if (numericIds.has(key)) raw[key] = Number(raw[key] || 0); });
    return raw;
  }

  function randomizeControls(config, panel) {
    const form = panel.querySelector('#floating-island-editor-form');
    config.controls.forEach(control => {
      const field = form.elements[control.id];
      if (!field) return;
      if (control.type === 'select') field.value = choice(control.options);
      if (control.type === 'number' && !['lengthKm','widthKm','meanThicknessM','usableSurfacePercent'].includes(control.id)) {
        const min = Number(control.min ?? 0);
        const max = Number(control.max ?? 100);
        const step = Number(control.step ?? 1);
        const spreadMax = Math.min(max, min + Math.max(step * 30, (max - min) * 0.45));
        field.value = roundTo(randomBetween(min, spreadMax), step);
      }
      if (control.id === 'name') field.value = randomIslandName();
    });
    applySizePreset(config, panel, false);
    normalizeComposition(panel);
  }

  function applySizePreset(config, panel, keepExistingName) {
    const form = panel.querySelector('#floating-island-editor-form');
    const size = form.elements.sizeClass.value;
    const preset = config.sizePresets[size];
    if (!preset) return;
    form.elements.lengthKm.value = roundTo(randomBetween(...preset.lengthKm), 0.05);
    form.elements.widthKm.value = roundTo(randomBetween(...preset.widthKm), 0.05);
    form.elements.meanThicknessM.value = Math.round(randomBetween(...preset.thicknessM));
    form.elements.usableSurfacePercent.value = Math.round(randomBetween(...preset.usableSurfacePercent));
    if (!keepExistingName && !form.elements.name.value) form.elements.name.value = randomIslandName();
  }

  function normalizeComposition(panel) {
    const form = panel.querySelector('#floating-island-editor-form');
    const ids = ['baseRockPercent','floatstonePercent','soilPercent','cavernVoidPercent'];
    const values = ids.map(id => Math.max(0, Number(form.elements[id].value || 0)));
    const total = values.reduce((sum, value) => sum + value, 0) || 1;
    ids.forEach((id, index) => { form.elements[id].value = Math.round(values[index] / total * 100); });
    const adjusted = ids.reduce((sum, id) => sum + Number(form.elements[id].value), 0);
    form.elements.baseRockPercent.value = Math.max(0, Number(form.elements.baseRockPercent.value) + (100 - adjusted));
  }

  function buildProfile(config, values) {
    const warnings = [];
    const composition = normalizeCompositionValues(values, warnings);
    const geometry = calculateGeometry(values, composition);
    const motion = calculateMotion(values);
    const access = calculateAccess(values, motion);
    const resources = calculateResources(config, values, geometry, composition);
    const ecology = calculateEcology(values, geometry);
    const scores = calculateScores(values, geometry, motion, access, resources, ecology);
    const mapFoundation = buildMapFoundation(config, values, geometry, scores);
    const capacity = calculateCapacity(values, geometry, scores, mapFoundation);
    const outputs = buildOutputs(values, geometry, motion, access, resources, ecology, scores, mapFoundation, capacity, warnings);

    return {
      schemaVersion: '2.0.0',
      name: values.name || 'Unnamed Skyland',
      profileType: 'floating-island-foundation-profile',
      generatedAt: new Date().toISOString(),
      classification: { sizeClass: values.sizeClass, shapeProfile: values.shapeProfile, currentUse: values.currentUse },
      geometry,
      composition,
      motion,
      access,
      hydrology: { profile: values.waterProfile, annualRainfallMm: values.annualRainfallMm },
      terrain: { primary: values.primaryTerrain, secondary: values.secondaryTerrain, flatlandPercent: values.flatlandPercent, arableSoilPercent: values.arableSoilPercent, vegetationCoverPercent: values.vegetationCoverPercent },
      resources,
      ecology,
      population: { permanentPopulation: values.existingPopulation, currentUse: values.currentUse },
      siteInventory: { knownDungeonCount: values.knownDungeonCount, hiddenSiteDensity: values.hiddenSiteDensity },
      mapFoundation,
      insertionCapacity: capacity,
      derivedScores: scores,
      warnings,
      outputs
    };
  }

  function normalizeCompositionValues(values, warnings) {
    const parts = {
      ordinaryRockPercent: Math.max(0, values.baseRockPercent),
      floatstonePercent: Math.max(0, values.floatstonePercent),
      soilSedimentPercent: Math.max(0, values.soilPercent),
      cavernVoidPercent: Math.max(0, values.cavernVoidPercent)
    };
    const total = Object.values(parts).reduce((sum, value) => sum + value, 0);
    if (Math.abs(total - 100) > 0.1) warnings.push(`Composition totaled ${round(total,1)}%; values were normalized to 100%.`);
    const divisor = total || 1;
    Object.keys(parts).forEach(key => { parts[key] = round(parts[key] / divisor * 100, 1); });
    parts.rawTotalBeforeNormalization = round(total, 1);
    return parts;
  }

  function calculateGeometry(values, composition) {
    const shapeFactors = { 'loose cluster':0.42,'narrow shard':0.38,'irregular oval':0.68,'broad tabular plateau':0.88,'crescent shelf':0.55,'split twin-mass':0.58,'terraced cone':0.65,'ring island':0.62,'long ridge':0.44,'fractured archipelago':0.46 };
    const factor = shapeFactors[values.shapeProfile] || 0.65;
    const planAreaKm2 = Math.max(0.001, values.lengthKm * values.widthKm * factor);
    const usableAreaKm2 = planAreaKm2 * clamp(values.usableSurfacePercent,0,100) / 100;
    const flatAreaKm2 = usableAreaKm2 * clamp(values.flatlandPercent,0,100) / 100;
    const arableAreaKm2 = flatAreaKm2 * clamp(values.arableSoilPercent,0,100) / 100;
    const grossVolumeKm3 = planAreaKm2 * values.meanThicknessM / 1000;
    const solidVolumeKm3 = grossVolumeKm3 * (1 - composition.cavernVoidPercent / 100);
    const densityTPerM3 = 2.55 * composition.ordinaryRockPercent/100 + 1.35 * composition.floatstonePercent/100 + 1.5 * composition.soilSedimentPercent/100;
    const estimatedMassMillionTons = solidVolumeKm3 * 1e9 * densityTPerM3 / 1e6;
    return {
      lengthKm: round(values.lengthKm,3), widthKm: round(values.widthKm,3), meanThicknessM: round(values.meanThicknessM,1),
      shapeFactor: factor, planAreaKm2: round(planAreaKm2,3), planAreaAcres: Math.round(planAreaKm2 * 247.105),
      usableAreaKm2: round(usableAreaKm2,3), usableAreaAcres: Math.round(usableAreaKm2 * 247.105),
      flatAreaKm2: round(flatAreaKm2,3), flatAreaAcres: Math.round(flatAreaKm2 * 247.105),
      arableAreaKm2: round(arableAreaKm2,3), arableAreaAcres: Math.round(arableAreaKm2 * 247.105),
      grossVolumeKm3: round(grossVolumeKm3,3), solidVolumeKm3: round(solidVolumeKm3,3), estimatedMassMillionTons: round(estimatedMassMillionTons,2),
      usableSurfacePercent: clamp(values.usableSurfacePercent,0,100)
    };
  }

  function calculateMotion(values) {
    const altitudePenalty = { 'fixed altitude':0,'predictable cycle':1,'seasonally predictable':2,'weather-sensitive':4,'irregular oscillation':6,'violent altitude surges':9,'unknown pattern':8 }[values.altitudePredictability] || 0;
    const driftPenalty = { 'fixed relative position':0,'precisely charted drift':1,'charted seasonal route':2,'weather-dependent route':4,'loosely predictable wandering':5,'erratic wandering':8,'frequent course reversal':9,'unknown external pull':10 }[values.driftPredictability] || 0;
    const oscillationRatio = Math.abs(values.verticalOscillationM) / Math.max(100, Math.abs(values.meanAltitudeM));
    const altitudeReliability = clamp(20 - altitudePenalty - Math.ceil(values.verticalOscillationM / 250) - Math.ceil(oscillationRatio * 10), 0, 20);
    const positionReliability = clamp(20 - driftPenalty - Math.ceil(values.horizontalDriftKpd / 25), 0, 20);
    return {
      meanAltitudeM: values.meanAltitudeM,
      verticalOscillationM: values.verticalOscillationM,
      minimumAltitudeM: values.meanAltitudeM - values.verticalOscillationM,
      maximumAltitudeM: values.meanAltitudeM + values.verticalOscillationM,
      oscillationPeriodHours: values.oscillationPeriodHours,
      altitudePredictability: values.altitudePredictability,
      horizontalDriftKpd: values.horizontalDriftKpd,
      driftPredictability: values.driftPredictability,
      altitudeReliability,
      positionReliability,
      annualDriftKm: round(values.horizontalDriftKpd * 365,1)
    };
  }

  function calculateAccess(values, motion) {
    const traffic = { 'major established route':5,'regular regional traffic':4,'occasional traffic':2,'rare survey traffic':0,'uncharted frontier':-2,'deliberately avoided region':-3,'secret or criminal corridor':-1 }[values.routeTraffic] || 0;
    const charts = { 'survey-grade coordinates':5,'reliable seasonal charts':4,'usable with corrections':2,'outdated charts':0,'contradictory reports':-2,'rumor only':-4,'deliberately falsified':-5 }[values.chartQuality] || 0;
    const approach = { 'many safe approaches':4,'two reliable approaches':3,'one narrow approach':1,'requires local pilot':0,'storm-shear approach':-3,'no natural landing shelf':-4,'underside access only':-2,'moving rendezvous required':-3 }[values.approachProfile] || 0;
    const civilizationProximity = clamp(20 - Math.ceil(values.nearestCivilizationKm / 100), 0, 20);
    const routeReliability = clamp(8 + traffic + charts + approach + Math.floor((motion.positionReliability - 10)/2), 0, 20);
    const concealmentValue = clamp(20 - routeReliability + Math.ceil(values.nearestCivilizationKm/500) + (values.routeTraffic === 'secret or criminal corridor' ? 5 : 0),0,20);
    return { nearestCivilizationKm:values.nearestCivilizationKm, routeTraffic:values.routeTraffic, chartQuality:values.chartQuality, approachProfile:values.approachProfile, civilizationProximity, routeReliability, concealmentValue, estimatedTravelDaysAt120Kpd:round(values.nearestCivilizationKm/120,1) };
  }

  function calculateResources(config, values, geometry, composition) {
    const minerals = config.mineralCatalog[values.mineralPresence] || [];
    const depositScale = geometry.planAreaKm2 < 1 ? 'trace' : geometry.planAreaKm2 < 25 ? 'local' : geometry.planAreaKm2 < 500 ? 'regional' : 'strategic';
    const floatstoneOreKm3 = geometry.solidVolumeKm3 * composition.floatstonePercent / 100;
    return { mineralPresence:values.mineralPresence, mineralAccessibility:values.mineralAccessibility, knownMinerals:minerals, depositScale, estimatedFloatstoneBearingVolumeKm3:round(floatstoneOreKm3,3), extractionPressure:clamp(minerals.length * 2 + (values.mineralAccessibility === 'surface exposed' ? 4 : 0),0,20) };
  }

  function calculateEcology(values, geometry) {
    const density = { 'nearly sterile':1,'sparse pioneer species':3,'limited ecosystem':6,'established ecosystem':10,'rich biodiversity':15,'overcrowded migration stop':16,'apex-predator dominated':12,'magically unstable ecology':11 }[values.wildlifeDensity] || 5;
    const habitatAreaKm2 = geometry.usableAreaKm2 * values.vegetationCoverPercent / 100;
    const carryingCapacityIndex = round(habitatAreaKm2 * density,1);
    return { wildlifeDensity:values.wildlifeDensity, dominantWildlife:values.dominantWildlife, vegetationCoverPercent:values.vegetationCoverPercent, habitatAreaKm2:round(habitatAreaKm2,2), carryingCapacityIndex, expectedDistinctHabitatZones:clamp(Math.ceil(Math.sqrt(Math.max(geometry.planAreaKm2,0.1))),1,24) };
  }

  function calculateScores(values, geometry, motion, access, resources, ecology) {
    const integrity = { 'loose unbound fragments':0,'actively crumbling':2,'fracture-prone':5,'seasonally stressed':8,'stable with local faults':12,'geologically stable':16,'exceptionally coherent':19,'artificially reinforced':17 }[values.structuralIntegrity] || 8;
    const water = { 'none':0,'seasonal rain only':4,'rain capture and small springs':8,'reliable spring network':14,'lake or deep reservoir':17,'abundant river system':19,'tainted water system':5,'magically sustained water':16,'import dependent':3 }[values.waterProfile] || 5;
    const stability = clamp(integrity - Math.ceil(values.fractureRate/5),0,20);
    const agriculturalPotential = clamp(Math.round((geometry.arableAreaKm2 > 0 ? Math.log10(geometry.arableAreaKm2+1)*6 : 0) + water/3 + stability/4 - (20-motion.altitudeReliability)/3),0,20);
    const settlementViability = clamp(Math.round(stability*.3 + water*.25 + motion.altitudeReliability*.15 + motion.positionReliability*.1 + access.routeReliability*.1 + agriculturalPotential*.1),0,20);
    const mapUtility = clamp(Math.round(Math.log10(geometry.planAreaKm2+1)*5 + geometry.usableSurfacePercent/10 + values.cavernVoidPercent/12),0,20);
    const strategicValue = clamp(Math.round(access.routeReliability*.35 + resources.extractionPressure*.25 + settlementViability*.2 + mapUtility*.2),0,20);
    const criminalUtility = clamp(Math.round(access.concealmentValue*.55 + mapUtility*.15 + (20-settlementViability)*.15 + (20-motion.altitudeReliability)*.15),0,20);
    const hazardPressure = clamp(Math.round((20-stability)*.35 + (20-motion.altitudeReliability)*.25 + (20-access.routeReliability)*.15 + Math.min(20, ecology.carryingCapacityIndex/100)*.25),0,20);
    return { structuralStability:stability, altitudeReliability:motion.altitudeReliability, positionReliability:motion.positionReliability, routeReliability:access.routeReliability, agriculturalPotential, settlementViability, mapUtility, strategicValue, criminalUtility, hazardPressure };
  }

  function buildMapFoundation(config, values, geometry, scores) {
    const [columns, rows] = config.mapGridPresets[values.mapGridScale] || [12,8];
    const cellWidthKm = geometry.lengthKm / columns;
    const cellHeightKm = geometry.widthKm / rows;
    const nominalCellAreaKm2 = geometry.planAreaKm2 / Math.max(1, columns*rows*0.72);
    const random = seededRandom(hashString(JSON.stringify([values.name,values.sizeClass,values.shapeProfile,values.primaryTerrain,values.secondaryTerrain,values.meanAltitudeM])));
    const cells = [];
    const terrainWeights = buildTerrainWeights(values);
    let activeIndex = 0;

    for (let y=0; y<rows; y+=1) {
      for (let x=0; x<columns; x+=1) {
        const nx = (x+0.5)/columns*2-1;
        const ny = (y+0.5)/rows*2-1;
        if (!shapeContains(values.shapeProfile,nx,ny,random)) continue;
        const edge = Math.sqrt(nx*nx+ny*ny);
        const terrain = weightedChoice(terrainWeights, random);
        const elevationM = Math.round((1-edge)*values.meanThicknessM*.65 + (random()-.5)*values.meanThicknessM*.3);
        const slopeClass = terrain.includes('plateau') || terrain === 'pasture' || terrain === 'wet basin' ? 'gentle' : terrain.includes('ridge') || terrain.includes('cliff') ? 'steep' : 'moderate';
        const usableFactor = slopeClass === 'gentle' ? 0.8 : slopeClass === 'moderate' ? 0.55 : 0.25;
        const cellArea = nominalCellAreaKm2 * (0.85 + random()*.3);
        const siteCapacity = Math.max(0, Math.floor(cellArea * usableFactor * siteDensityFactor(values.hiddenSiteDensity)));
        cells.push({ id:`R${String(++activeIndex).padStart(3,'0')}`, grid:{x,y}, boundsKm:{west:round(x*cellWidthKm,3),east:round((x+1)*cellWidthKm,3),north:round(y*cellHeightKm,3),south:round((y+1)*cellHeightKm,3)}, areaKm2:round(cellArea,3), terrain, elevationM, slopeClass, access:edge>.75?'edge-access':terrain.includes('ravine')?'restricted':'interior', siteCapacity, sites:[] });
      }
    }

    const slots = allocateSites(config, values, geometry, scores, cells, random);
    slots.forEach(slot => {
      const cell = cells.find(item => item.id === slot.regionId);
      if (cell) cell.sites.push(slot.id);
    });

    return { gridLabel:values.mapGridScale, columns, rows, cellWidthKm:round(cellWidthKm,3), cellHeightKm:round(cellHeightKm,3), nominalCellAreaKm2:round(nominalCellAreaKm2,3), coordinateOrigin:'northwest corner', activeRegionCount:cells.length, cells, siteSlots:slots };
  }

  function buildTerrainWeights(values) {
    const weights = { plateau:2,ridge:2,ravine:1,'cliff shelf':1,forest:1,scrub:1,pasture:1,'wet basin':1,ruins:0.4,quarry:0.4,'cavern mouth':0.5,'unstable edge':0.6 };
    const text = `${values.primaryTerrain} ${values.secondaryTerrain}`;
    Object.keys(weights).forEach(key => { if (text.includes(key)) weights[key] += 5; });
    if (values.vegetationCoverPercent > 60) weights.forest += 3;
    if (values.flatlandPercent > 55) { weights.plateau += 3; weights.pasture += 2; }
    if (values.cavernVoidPercent > 20) weights['cavern mouth'] += 3;
    if (values.structuralIntegrity.includes('crumbling') || values.structuralIntegrity.includes('fracture')) weights['unstable edge'] += 3;
    return weights;
  }

  function allocateSites(config, values, geometry, scores, cells, random) {
    const slots = [];
    const areaFactor = Math.max(1, Math.log10(geometry.planAreaKm2+1)*4);
    const hiddenFactor = { 'none expected':0,'one isolated secret':1,'several plausible sites':3,'dense layered history':6,'ruin-saturated landscape':10,'mostly unexplored':7 }[values.hiddenSiteDensity] || 2;
    const desired = Math.min(200, Math.max(values.knownDungeonCount, Math.round(areaFactor + hiddenFactor + scores.mapUtility/2)));
    const types = config.siteTypes;
    const eligible = cells.filter(cell => cell.siteCapacity>0);
    const counters = {};

    for (let i=0; i<desired && eligible.length; i+=1) {
      let type;
      if (i < values.knownDungeonCount) type = i%2===0?'dungeon':'ruin';
      else type = choiceWithRandom(types,random);
      counters[type]=(counters[type]||0)+1;
      const cell = eligible[Math.floor(random()*eligible.length)];
      const id = `${slugify(type).toUpperCase()}-${String(counters[type]).padStart(2,'0')}`;
      slots.push({ id, type, regionId:cell.id, status:i<values.knownDungeonCount?'known':'unassigned', maximumFootprintKm2:round(Math.max(0.001,cell.areaKm2*.18),3), access:cell.access, terrainContext:cell.terrain, designPrompt:sitePrompt(type,cell,values) });
      if (cell.sites.length+1>=cell.siteCapacity) eligible.splice(eligible.indexOf(cell),1);
    }
    return slots;
  }

  function calculateCapacity(values, geometry, scores, mapFoundation) {
    const totalSlotCapacity = mapFoundation.cells.reduce((sum,cell)=>sum+cell.siteCapacity,0);
    const reserved = mapFoundation.siteSlots.length;
    const maxSettlementPopulation = Math.max(0, Math.floor(geometry.arableAreaKm2*120 + geometry.usableAreaKm2*20) * scores.settlementViability / 20);
    return { totalRegionalSiteCapacity:totalSlotCapacity, preallocatedSiteSlots:reserved, openSiteCapacity:Math.max(0,totalSlotCapacity-reserved), recommendedSettlementSites:Math.floor(geometry.flatAreaKm2/8 * scores.settlementViability/20), maximumSupportedPopulation:maxSettlementPopulation, recommendedDungeonSites:Math.max(values.knownDungeonCount,Math.floor(scores.mapUtility/3)), wildernessLandmarkCapacity:Math.floor(mapFoundation.activeRegionCount/4), resourceNodeCapacity:Math.max(1,Math.floor(geometry.planAreaKm2/20)+1) };
  }

  function buildOutputs(values, geometry, motion, access, resources, ecology, scores, mapFoundation, capacity, warnings) {
    const summary = `${values.name || 'Unnamed Skyland'} is a ${values.sizeClass} measuring ${geometry.lengthKm} × ${geometry.widthKm} km (${geometry.planAreaKm2} km²), with ${geometry.usableAreaKm2} km² usable surface and ${geometry.arableAreaKm2} km² potentially arable. It averages ${motion.meanAltitudeM} m altitude, oscillates ±${motion.verticalOscillationM} m every ${motion.oscillationPeriodHours} hours, and drifts ${motion.horizontalDriftKpd} km/day.`;
    const viabilityNote = scores.agriculturalPotential>=12 && scores.settlementViability<8 ? 'The island has impressive arable terrain, but instability, motion, water, or route problems make that land unreliable for permanent settlement.' : 'Agricultural and settlement value are broadly aligned.';
    const gmNotes = [viabilityNote, `Position reliability ${scores.positionReliability}/20; altitude reliability ${scores.altitudeReliability}/20; route reliability ${scores.routeReliability}/20.`, `Criminal utility ${scores.criminalUtility}/20 reflects concealment, mobility, and poor chart certainty rather than habitability.`, `${mapFoundation.activeRegionCount} mapped regions contain ${mapFoundation.siteSlots.length} preallocated adventure-site slots and ${capacity.openSiteCapacity} additional capacity.`];
    if (warnings.length) gmNotes.push(...warnings);
    const wikiDraft = { id:slugify(values.name||'unnamed-skyland'), title:values.name||'Unnamed Skyland', category:'Locations', summary, body:[summary,viabilityNote,`Foundation ratings: settlement ${scores.settlementViability}/20, structural stability ${scores.structuralStability}/20, strategic value ${scores.strategicValue}/20, criminal utility ${scores.criminalUtility}/20.`], tags:['floating island',values.sizeClass,values.primaryTerrain,values.mineralPresence,values.currentUse], relatedEntries:['floating-islands','sky-ecology','scarcity-loop'], relatedModules:['floating-island-generator','settlement-generator','world-map-route-generator','encounter-generator'] };
    return { summary, viabilityNote, gmNotes, mapNotes:[`Each cell is approximately ${mapFoundation.cellWidthKm} × ${mapFoundation.cellHeightKm} km.`,`Coordinates begin at the northwest corner.`,`Site slots are foundations, not completed adventures; replace or expand them without changing regional IDs.`], wikiDraft };
  }

  function buildAndRender(config,panel) {
    const values=getValues(panel);
    latestProfile=buildProfile(config,values);
    renderProfile(panel,latestProfile);
  }

  function renderProfile(panel,profile) {
    const output=panel.querySelector('#floating-island-editor-output');
    output.innerHTML='';
    const overview=document.createElement('article');
    overview.className='editor-card';
    overview.innerHTML=`<h3>${escapeHtml(profile.name)}</h3><p>${escapeHtml(profile.outputs.summary)}</p><div class="score-grid">${Object.entries(profile.derivedScores).map(([key,value])=>scoreBox(titleCase(key),value)).join('')}</div><div class="warning-box">${escapeHtml(profile.outputs.viabilityNote)}</div>${renderList('GM foundation notes',profile.outputs.gmNotes)}${renderGeometryTable(profile)}${renderResourceTable(profile)}${renderCapacityTable(profile)}`;

    const mapCard=document.createElement('article');
    mapCard.className='editor-card';
    mapCard.innerHTML=`<h3>Regional Foundation Map</h3><p>${profile.outputs.mapNotes.map(escapeHtml).join(' ')}</p>${renderSvgMap(profile)}${renderLegend()}${renderSiteTable(profile.mapFoundation.siteSlots)}`;

    const exportCard=document.createElement('article');
    exportCard.className='editor-card';
    exportCard.innerHTML=`<h3>Structured Output</h3><h4>Draft Wiki Entry</h4><textarea class="json-export" readonly>${escapeHtml(JSON.stringify(profile.outputs.wikiDraft,null,2))}</textarea><h4>Full Foundation JSON</h4><textarea class="json-export" readonly>${escapeHtml(JSON.stringify(profile,null,2))}</textarea>`;
    output.append(overview,mapCard,exportCard);
  }

  function renderGeometryTable(profile) {
    const rows=[['Plan area',`${profile.geometry.planAreaKm2} km² / ${profile.geometry.planAreaAcres.toLocaleString()} acres`],['Usable surface',`${profile.geometry.usableAreaKm2} km² / ${profile.geometry.usableAreaAcres.toLocaleString()} acres`],['Flat land',`${profile.geometry.flatAreaKm2} km²`],['Potentially arable',`${profile.geometry.arableAreaKm2} km² / ${profile.geometry.arableAreaAcres.toLocaleString()} acres`],['Mean thickness',`${profile.geometry.meanThicknessM} m`],['Estimated mass',`${profile.geometry.estimatedMassMillionTons.toLocaleString()} million tons`],['Altitude envelope',`${profile.motion.minimumAltitudeM}–${profile.motion.maximumAltitudeM} m`],['Annual drift',`${profile.motion.annualDriftKm.toLocaleString()} km`]];
    return `<h4>Exact physical foundation</h4>${simpleTable(rows)}`;
  }

  function renderResourceTable(profile) {
    const rows=[['Mineral rating',profile.resources.mineralPresence],['Accessibility',profile.resources.mineralAccessibility],['Known deposits',profile.resources.knownMinerals.join(', ')||'none identified'],['Floatstone-bearing volume',`${profile.resources.estimatedFloatstoneBearingVolumeKm3} km³`],['Wildlife density',profile.ecology.wildlifeDensity],['Dominant wildlife',profile.ecology.dominantWildlife],['Habitat area',`${profile.ecology.habitatAreaKm2} km²`],['Water',profile.hydrology.profile]];
    return `<h4>Composition, minerals, and ecology</h4>${simpleTable(rows)}`;
  }

  function renderCapacityTable(profile) {
    const rows=Object.entries(profile.insertionCapacity).map(([key,value])=>[titleCase(key),Number(value).toLocaleString()]);
    return `<h4>Adventure and settlement capacity</h4>${simpleTable(rows)}`;
  }

  function renderSvgMap(profile) {
    const {columns,rows,cells}=profile.mapFoundation;
    const cellW=64,cellH=52,pad=38;
    const width=columns*cellW+pad*2,height=rows*cellH+pad*2;
    const colors={plateau:'#8a7f5d',ridge:'#716858',ravine:'#4f4942','cliff shelf':'#796653',forest:'#49664b',scrub:'#77734d',pasture:'#67825a','wet basin':'#416b78',ruins:'#6c5b72',quarry:'#766c64','cavern mouth':'#3f3b45','unstable edge':'#8a4e48'};
    const rects=cells.map(cell=>{const x=pad+cell.grid.x*cellW,y=pad+cell.grid.y*cellH;const label=cell.sites.length?cell.sites.length:'';return `<g><rect x="${x}" y="${y}" width="${cellW-2}" height="${cellH-2}" rx="5" fill="${colors[cell.terrain]||'#666'}" stroke="#20252d"/><text x="${x+5}" y="${y+14}" fill="#fff" font-size="9">${cell.id}</text><text x="${x+5}" y="${y+28}" fill="#e7dfcf" font-size="8">${escapeXml(cell.terrain)}</text>${label?`<circle cx="${x+cellW-13}" cy="${y+13}" r="9" fill="#c88a35"/><text x="${x+cellW-13}" y="${y+16}" fill="#111" text-anchor="middle" font-size="9">${label}</text>`:''}</g>`;}).join('');
    return `<div class="island-map-wrap"><svg class="island-map" viewBox="0 0 ${width} ${height}" role="img" aria-label="Regional foundation map"><text x="${width/2}" y="18" text-anchor="middle" fill="#e7dfcf" font-size="13">North · ${escapeXml(profile.name)} · ${profile.geometry.lengthKm} × ${profile.geometry.widthKm} km</text>${rects}</svg></div>`;
  }

  function renderLegend() {
    const colors={plateau:'#8a7f5d',ridge:'#716858',ravine:'#4f4942','cliff shelf':'#796653',forest:'#49664b',scrub:'#77734d',pasture:'#67825a','wet basin':'#416b78',ruins:'#6c5b72',quarry:'#766c64','cavern mouth':'#3f3b45','unstable edge':'#8a4e48'};
    return `<div class="map-legend">${Object.entries(colors).map(([name,color])=>`<span class="map-key"><span class="map-swatch" style="background:${color}"></span>${name}</span>`).join('')}<span class="map-key"><span class="map-swatch" style="background:#c88a35"></span>site count</span></div>`;
  }

  function renderSiteTable(slots) {
    if (!slots.length) return '<h4>Adventure sites</h4><p>No sites were preallocated. Regional IDs remain available for later placement.</p>';
    return `<h4>Adventure-site insertion ledger</h4><table class="foundation-table"><thead><tr><th>ID</th><th>Type</th><th>Region</th><th>Status</th><th>Maximum footprint</th></tr></thead><tbody>${slots.map(slot=>`<tr><td>${slot.id}</td><td>${escapeHtml(slot.type)}</td><td>${slot.regionId}</td><td>${slot.status}</td><td>${slot.maximumFootprintKm2} km²</td></tr>`).join('')}</tbody></table>`;
  }

  function simpleTable(rows) { return `<table class="foundation-table"><tbody>${rows.map(([key,value])=>`<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(String(value))}</td></tr>`).join('')}</tbody></table>`; }
  function renderList(title,items) { return `<h4>${title}</h4><ul>${items.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul>`; }
  function scoreBox(title,value) { return `<div class="score-box"><span>${escapeHtml(title)}</span><strong>${value}/20</strong></div>`; }

  async function copyJson() { if (!latestProfile) return; try { await navigator.clipboard.writeText(JSON.stringify(latestProfile,null,2)); alert('Island foundation JSON copied.'); } catch (_) { alert('Clipboard copy failed. Use the visible JSON field.'); } }
  function downloadJson() { if (!latestProfile) return; const blob=new Blob([JSON.stringify(latestProfile,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`${slugify(latestProfile.name)}-foundation.json`;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url); }

  function shapeContains(shape,x,y,random) {
    const ellipse=x*x+y*y<=1;
    if (shape==='loose cluster'||shape==='fractured archipelago') return ellipse && random()>.28;
    if (shape==='narrow shard'||shape==='long ridge') return Math.abs(y)<0.42*(1-Math.abs(x)*.45);
    if (shape==='broad tabular plateau') return Math.abs(x)<.95&&Math.abs(y)<.85;
    if (shape==='crescent shelf') return ellipse && !((x+.25)*(x+.25)+y*y<.42);
    if (shape==='split twin-mass') return ((x+.48)**2+y*y<.4)||((x-.48)**2+y*y<.4);
    if (shape==='ring island') return ellipse && x*x+y*y>.28;
    return ellipse;
  }

  function siteDensityFactor(value) { return ({'none expected':0.02,'one isolated secret':0.05,'several plausible sites':0.12,'dense layered history':0.22,'ruin-saturated landscape':0.35,'mostly unexplored':0.18}[value]||0.1); }
  function sitePrompt(type,cell,values) { const prompts={settlement:`Use ${cell.terrain} and ${values.waterProfile} to determine footprint and defenses.`,dungeon:`Build below or within the ${cell.terrain}; reserve access from ${cell.access}.`,ruin:`Tie the ruin to ${values.hiddenSiteDensity} and local mineral history.`,'wilderness landmark':`Create a visible regional landmark shaped by ${cell.terrain}.`,'resource node':`Connect extraction to ${values.mineralPresence} and ${values.mineralAccessibility}.`,'creature lair':`Use ${values.dominantWildlife} and local carrying capacity.`, 'loot site':`Place recoverable value behind terrain, route, or ecological risk.`, 'hidden facility':`Exploit position reliability ${values.driftPredictability} and route concealment.`, shrine:'Tie belief to altitude, motion, or survival.',wreck:'Use approach hazards and chart reliability.', 'cave system':'Use internal void percentage and underside access.',watchpoint:'Use elevation and route traffic.'}; return prompts[type]||`Develop a ${type} appropriate to ${cell.terrain}.`; }
  function weightedChoice(weights,random) { const entries=Object.entries(weights);const total=entries.reduce((s,[,w])=>s+w,0);let roll=random()*total;for(const [key,w] of entries){roll-=w;if(roll<=0)return key;}return entries[0][0]; }
  function choiceWithRandom(list,random) { return list[Math.floor(random()*list.length)]; }
  function scorePart(table,key) { return table&&key in table?Number(table[key])||0:0; }
  function clamp(value,min,max) { return Math.max(min,Math.min(max,value)); }
  function round(value,places=2) { const factor=10**places;return Math.round(value*factor)/factor; }
  function roundTo(value,step) { return Math.round(value/step)*step; }
  function randomBetween(min,max) { return Number(min)+Math.random()*(Number(max)-Number(min)); }
  function choice(list) { return list[Math.floor(Math.random()*list.length)]; }
  function hashString(value) { let hash=2166136261;for(let i=0;i<value.length;i+=1){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619);}return hash>>>0; }
  function seededRandom(seed) { return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}; }
  function slugify(value) { return String(value||'unnamed-skyland').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'unnamed-skyland'; }
  function titleCase(value) { return String(value).replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase()); }
  function escapeHtml(value) { return String(value??'').replace(/[&<>"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char])); }
  function escapeXml(value) { return escapeHtml(value).replace(/'/g,'&apos;'); }
  function randomIslandName() { return `${choice(['Dun','Veyr','Asha','Karth','Morn','Zeph','Brass','Hollow','Wind','Cloud','Grim','Sable'])}${choice(['hallow','spire','roost','reach','fall','chain','crag','haven','crown','rift','watch','harbor'])}`; }

  function decorateCards() {
    injectStyles();
    document.querySelectorAll('.module-card').forEach(card=>{
      const editor=editorModules[card.dataset.moduleId];
      if(!editor||card.dataset.editorLinked==='true')return;
      const button=document.createElement('button');button.type='button';button.className='primary-action editor-launch';button.textContent=editor.label;button.addEventListener('click',editor.open);card.appendChild(button);card.dataset.editorLinked='true';
    });
  }

  window.openFloatingIslandEditor=openEditor;
  const observer=new MutationObserver(decorateCards);observer.observe(document.body,{childList:true,subtree:true});document.addEventListener('DOMContentLoaded',decorateCards);setInterval(decorateCards,1000);
})();