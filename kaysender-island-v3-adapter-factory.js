(() => {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;
  const PROFILE_TYPE = 'floating-island-foundation-profile';
  const SCHEMA_VERSION = '3.0.0';
  const EDITOR_ID = 'floating-island-editor';
  const sessions = new WeakMap();

  const BLOCKS = Object.freeze([
    { id: 'classification', label: 'Classification', kind: 'object' },
    { id: 'geometry', label: 'Geometry', kind: 'object' },
    { id: 'composition', label: 'Composition', kind: 'object' },
    { id: 'hydrology', label: 'Hydrology Ledger', kind: 'object' },
    { id: 'foodCapacity', label: 'Food Capacity Ledger', kind: 'object' },
    { id: 'resources', label: 'Resource Ledger', kind: 'object' },
    { id: 'motion', label: 'Altitude and Drift Timelines', kind: 'object' },
    { id: 'stability', label: 'Stability and Fracture History', kind: 'object' },
    { id: 'approaches', label: 'Landing Zones and Approaches', kind: 'object' },
    { id: 'sites', label: 'Sites', kind: 'array' },
    { id: 'hazards', label: 'Hazards', kind: 'array' },
    { id: 'ecology', label: 'Ecology', kind: 'object' },
    { id: 'settlementCapacity', label: 'Settlement Capacity', kind: 'object' },
    { id: 'routeNodeExport', label: 'Route Nodes', kind: 'object' },
    { id: 'visibility', label: 'Player and GM Visibility', kind: 'object' },
    { id: 'outputs', label: 'Outputs', kind: 'object' }
  ]);

  const FIELD_MAP = Object.freeze({
    name: 'name',
    sizeClass: 'classification.sizeClass',
    shapeProfile: 'classification.shapeProfile',
    currentUse: 'classification.currentUse',
    lengthKm: 'geometry.lengthKm',
    widthKm: 'geometry.widthKm',
    meanThicknessM: 'geometry.meanThicknessM',
    usableSurfacePercent: data => data.geometry?.planAreaKm2
      ? Math.round((Number(data.geometry.usableAreaKm2 || 0) / Number(data.geometry.planAreaKm2)) * 100)
      : 0,
    baseRockPercent: 'composition.ordinaryRockPercent',
    floatstonePercent: 'composition.floatstonePercent',
    soilPercent: 'composition.soilSedimentPercent',
    cavernVoidPercent: 'composition.cavernVoidPercent',
    meanAltitudeM: 'motion.meanAltitudeM',
    verticalOscillationM: data => {
      const segments = data.motion?.altitudeTimeline || [];
      if (!segments.length) return 0;
      const minimum = Math.min(...segments.map(item => Number(item.minimumAltitudeM || 0)));
      const maximum = Math.max(...segments.map(item => Number(item.maximumAltitudeM || 0)));
      return Math.round(Math.max(0, maximum - minimum) / 2);
    },
    oscillationPeriodHours: data => Number(data.motion?.forecastHorizonDays || 0) * 24,
    altitudePredictability: data => data.motion?.altitudeTimeline?.[0]?.confidence,
    horizontalDriftKpd: data => data.motion?.driftTimeline?.[0]?.averageKmPerDay,
    driftPredictability: data => data.motion?.driftTimeline?.[0]?.confidence,
    chartQuality: 'classification.surveyStatus',
    approachProfile: data => data.approaches?.landingZones?.[0]?.type,
    waterProfile: data => (data.hydrology?.sources || []).map(item => item.type).filter(Boolean).join('; '),
    annualRainfallMm: 'hydrology.annualRainfallMm',
    primaryTerrain: data => data.map?.cells?.find(cell => data.map.activeCellIds?.includes(cell.id))?.terrainType,
    secondaryTerrain: data => {
      const active = new Set(data.map?.activeCellIds || []);
      const terrains = [...new Set((data.map?.cells || []).filter(cell => active.has(cell.id)).map(cell => cell.terrainType).filter(Boolean))];
      return terrains[1] || terrains[0];
    },
    flatlandPercent: data => data.geometry?.planAreaKm2
      ? Math.round((Number(data.geometry.flatAreaKm2 || 0) / Number(data.geometry.planAreaKm2)) * 100)
      : 0,
    arableSoilPercent: data => data.geometry?.planAreaKm2
      ? Math.round((Number(data.geometry.arableAreaKm2 || 0) / Number(data.geometry.planAreaKm2)) * 100)
      : 0,
    mineralPresence: data => (data.resources?.nodes || []).map(item => item.resourceType).filter(Boolean).join('; '),
    mineralAccessibility: data => (data.resources?.nodes || []).map(item => item.quality).filter(Boolean).join('; '),
    wildlifeDensity: 'ecology.currentPressure',
    dominantWildlife: data => (data.ecology?.speciesSlots || []).map(item => item.populationBand).filter(Boolean).join('; '),
    existingPopulation: 'settlementCapacity.sustainablePopulation',
    knownDungeonCount: data => (data.sites || []).filter(item => /dungeon|ruin|cavern/i.test(`${item.type || ''} ${item.tags?.join(' ') || ''}`)).length,
    hiddenSiteDensity: data => {
      const hidden = data.visibility?.gmOnlySiteIds?.length || 0;
      if (!hidden) return 'none expected';
      if (hidden === 1) return 'one isolated secret';
      if (hidden <= 3) return 'several plausible sites';
      return 'dense layered history';
    }
  });

  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const isObject = value => value && typeof value === 'object' && !Array.isArray(value);
  const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

  function dependencies() {
    const result = {
      domain: root.KaysenderIslandV3Domain,
      transformers: root.KaysenderIslandV3Transformers,
      controller: root.KaysenderIslandSurfaceGridController,
      lifecycle: root.KaysenderEditorLifecycle
    };
    const missing = Object.entries(result).filter(([, value]) => !value).map(([name]) => name);
    if (missing.length) throw new Error(`Island v3 adapter dependencies are missing: ${missing.join(', ')}.`);
    return result;
  }

  function diagnostic(severity, code, message, path = '') {
    const kernel = root.KaysenderEditorKernel;
    return kernel?.diagnostic
      ? kernel.diagnostic(severity, code, message, path)
      : { severity, code, message, ...(path ? { path } : {}) };
  }

  function legacySeedSignature(profile = {}) {
    return JSON.stringify({
      name: profile.name,
      classification: profile.classification,
      geometry: profile.geometry,
      composition: profile.composition,
      motion: profile.motion,
      access: profile.access,
      hydrology: profile.hydrology,
      terrain: profile.terrain,
      resources: profile.resources,
      ecology: profile.ecology,
      population: profile.population,
      siteInventory: profile.siteInventory
    });
  }

  function readLegacyOutput(panel) {
    const output = panel?.querySelector?.('#floating-island-editor-output');
    const textarea = output ? Array.from(output.querySelectorAll('textarea.json-export')).at(-1) : null;
    if (!textarea?.value?.trim()) return null;
    try {
      return JSON.parse(textarea.value);
    } catch (_) {
      return null;
    }
  }

  function toV3(profileInput) {
    const profile = clone(profileInput || {});
    if (profile.profileType === PROFILE_TYPE && profile.schemaVersion === SCHEMA_VERSION) return profile;
    if (profile.profileType === PROFILE_TYPE && profile.schemaVersion === '2.0.0') {
      return dependencies().transformers.migrateV2ToV3(profile).data;
    }
    throw new Error(`Island v3 adapter cannot seed profile type ${profile.profileType || 'unknown'} schema ${profile.schemaVersion || 'unknown'}.`);
  }

  function createBlankProfile() {
    const profile = {
      schemaVersion: SCHEMA_VERSION,
      profileType: PROFILE_TYPE,
      name: 'Unnamed Skyland',
      classification: {
        sizeClass: 'unclassified',
        shapeProfile: 'unclassified',
        currentUse: 'unclassified',
        sovereignty: 'unclaimed',
        surveyStatus: 'unmapped'
      },
      geometry: {
        lengthKm: 1,
        widthKm: 1,
        meanThicknessM: 1,
        planAreaKm2: 1,
        usableAreaKm2: 0,
        flatAreaKm2: 0,
        arableAreaKm2: 0,
        grossVolumeKm3: 0.001,
        estimatedMassMillionTons: 0,
        coordinateSystem: 'local-grid-v1',
        mapScaleKmPerCell: 1
      },
      composition: {
        ordinaryRockPercent: 100,
        floatstonePercent: 0,
        soilSedimentPercent: 0,
        cavernVoidPercent: 0
      },
      map: {
        columns: 1,
        rows: 1,
        activeCellIds: [],
        cells: [{
          id: 'cell-0-0',
          x: 0,
          y: 0,
          areaKm2: 1,
          terrainType: 'unassigned',
          elevationM: 0,
          slopeClass: 'unknown',
          usablePercent: 0,
          arablePercent: 0,
          waterCatchmentId: null,
          siteIds: [],
          resourceNodeIds: [],
          hazardIds: []
        }]
      },
      hydrology: {
        annualRainfallMm: 0,
        sources: [],
        reservoirs: [],
        annualRenewableM3: 0,
        dailySustainableLiters: 0,
        storedWaterM3: 0,
        reserveDaysAtCurrentUse: 0,
        systemLossPercent: 0
      },
      foodCapacity: {
        arableAreaKm2: 0,
        pastureAreaKm2: 0,
        forageAreaKm2: 0,
        annualFoodUnits: 0,
        sustainablePopulation: 0,
        emergencyPopulation90Days: 0,
        importDependencyPercent: 100
      },
      resources: { nodes: [], annualSafeExtractionTons: 0, currentAnnualExtractionTons: 0 },
      motion: { meanAltitudeM: 0, altitudeTimeline: [], driftTimeline: [], forecastHorizonDays: 0 },
      stability: {
        structuralIntegrity: 'not surveyed',
        overallRisk: 'unknown',
        annualSurfaceLossPercent: 0,
        faultZones: [],
        fractureEvents: [],
        emergencyThreshold: 'not established'
      },
      approaches: { landingZones: [], approachCorridors: [] },
      sites: [],
      hazards: [],
      ecology: { habitats: [], speciesSlots: [], carryingCapacityIndex: 0, currentPressure: 'unknown' },
      settlementCapacity: {
        waterLimitedPopulation: 0,
        foodLimitedPopulation: 0,
        landLimitedPopulation: 0,
        sustainablePopulation: 0,
        emergencyPopulation: 0,
        settlementSlots: []
      },
      routeNodeExport: {
        nodes: [],
        defaultNodeId: null,
        routeCapability: {
          maximumDailyArrivals: 0,
          resupplyWater: false,
          resupplyFood: false,
          repairCapability: 'none',
          chartConfidence: 'unknown'
        }
      },
      derived: {
        geometryReconciles: true,
        compositionReconciles: true,
        mapAreaReconciles: false,
        waterCapacityReconciles: true,
        foodCapacityReconciles: true,
        settlementCapacityReconciles: true,
        brokenReferenceIds: [],
        warnings: ['Blank Island profile requires deliberate surface, capacity, route, and visibility editing.']
      },
      visibility: {
        playerKnownSiteIds: [],
        gmOnlySiteIds: [],
        playerKnownHazardIds: [],
        gmOnlyHazardIds: [],
        publicFacts: [],
        gmSecrets: []
      },
      outputs: {
        playerSafeSummary: 'This Island has not been surveyed.',
        gmBrief: 'Blank production profile.',
        wikiDraft: { id: 'unnamed-skyland', title: 'Unnamed Skyland', category: 'Floating Islands', sourceStatus: 'editor-draft' },
        downstreamExports: {}
      }
    };
    profile.outputs.downstreamExports = dependencies().transformers.buildDownstreamExports(profile);
    return profile;
  }

  function mergeLegacySeed(currentInput, migratedInput) {
    const current = clone(currentInput || {});
    const migrated = clone(migratedInput || {});
    const next = current;
    next.name = migrated.name;
    next.classification = {
      ...(current.classification || {}),
      sizeClass: migrated.classification?.sizeClass,
      shapeProfile: migrated.classification?.shapeProfile,
      currentUse: migrated.classification?.currentUse
    };
    next.geometry = clone(migrated.geometry || current.geometry || {});
    next.composition = clone(migrated.composition || current.composition || {});
    next.hydrology = {
      ...(current.hydrology || {}),
      annualRainfallMm: number(migrated.hydrology?.annualRainfallMm, current.hydrology?.annualRainfallMm)
    };
    next.motion = {
      ...(current.motion || {}),
      meanAltitudeM: number(migrated.motion?.meanAltitudeM, current.motion?.meanAltitudeM)
    };
    return next;
  }

  function checkedLocks(panel) {
    const checked = Array.from(panel?.querySelectorAll?.('[data-editor-lock]:checked') || [])
      .map(item => item.dataset.editorLock)
      .filter(Boolean);
    const envelopeLocks = root.KaysenderMainlineEditorProduction?.getActiveEnvelope?.()?.locks || [];
    return [...new Set([...envelopeLocks, ...checked])];
  }

  function createElement(tag, className = '', textContent = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (textContent) element.textContent = textContent;
    return element;
  }

  function renderDiagnostics(session, diagnostics = []) {
    session.diagnostics = clone(diagnostics);
    session.diagnosticList.replaceChildren();
    const records = diagnostics.length
      ? diagnostics
      : [diagnostic('info', 'island-v3-session-ready', 'Island v3 adapter session is ready.')];
    records.forEach(item => {
      const entry = createElement('li', `severity-${item.severity || 'info'}`);
      const code = createElement('strong', '', item.code || 'diagnostic');
      entry.append(code, document.createTextNode(`: ${item.message || ''}`));
      if (item.path) entry.append(document.createTextNode(` [${item.path}]`));
      session.diagnosticList.appendChild(entry);
    });
  }

  function writeBlock(session, blockId, value) {
    const textarea = session.blockEditors.get(blockId);
    if (textarea) textarea.value = JSON.stringify(value, null, 2);
  }

  function writeAllBlocks(session) {
    BLOCKS.forEach(block => writeBlock(session, block.id, session.profile[block.id]));
  }

  function parseBlocks(session) {
    const values = {};
    const diagnostics = [];
    BLOCKS.forEach(block => {
      const textarea = session.blockEditors.get(block.id);
      try {
        const value = JSON.parse(textarea.value || (block.kind === 'array' ? '[]' : '{}'));
        const validKind = block.kind === 'array' ? Array.isArray(value) : isObject(value);
        if (!validKind) {
          diagnostics.push(diagnostic('error', 'island-v3-block-kind-invalid', `${block.label} must contain a JSON ${block.kind}.`, block.id));
          return;
        }
        values[block.id] = value;
      } catch (error) {
        diagnostics.push(diagnostic('error', 'island-v3-block-json-invalid', `${block.label} contains invalid JSON: ${error.message}`, block.id));
      }
    });
    return { ok: diagnostics.length === 0, values, diagnostics };
  }

  function structuralDiagnostics(profile) {
    const diagnostics = [];
    if (profile.profileType !== PROFILE_TYPE) diagnostics.push(diagnostic('error', 'island-v3-profile-type-invalid', `Expected ${PROFILE_TYPE}.`, 'profileType'));
    if (profile.schemaVersion !== SCHEMA_VERSION) diagnostics.push(diagnostic('error', 'island-v3-schema-version-invalid', `Expected schema ${SCHEMA_VERSION}.`, 'schemaVersion'));
    if (!String(profile.name || '').trim()) diagnostics.push(diagnostic('error', 'island-v3-name-missing', 'Island name is required.', 'name'));
    if (!isObject(profile.map)) diagnostics.push(diagnostic('error', 'island-v3-map-missing', 'Island map is required.', 'map'));
    BLOCKS.forEach(block => {
      const value = profile[block.id];
      const valid = block.kind === 'array' ? Array.isArray(value) : isObject(value);
      if (!valid) diagnostics.push(diagnostic('error', 'island-v3-block-missing', `${block.label} is missing or has the wrong type.`, block.id));
    });
    return diagnostics;
  }

  function buildCanonicalProfileData(baseProfile, blockValues, map) {
    const deps = dependencies();
    let profile = clone(baseProfile || {});
    BLOCKS.forEach(block => {
      if (blockValues?.[block.id] !== undefined) profile[block.id] = clone(blockValues[block.id]);
    });
    profile.profileType = PROFILE_TYPE;
    profile.schemaVersion = SCHEMA_VERSION;
    profile.map = clone(map || profile.map);
    profile = deps.domain.applyDerived(profile);
    profile.outputs = isObject(profile.outputs) ? profile.outputs : {};
    profile.outputs.downstreamExports = deps.transformers.buildDownstreamExports(profile);
    return profile;
  }

  function buildSessionProfile(session) {
    const parsed = parseBlocks(session);
    if (!parsed.ok) {
      renderDiagnostics(session, parsed.diagnostics);
      return { ok: false, profile: null, diagnostics: parsed.diagnostics };
    }

    const legacy = readLegacyOutput(session.panel);
    const signature = legacy?.schemaVersion === '2.0.0' ? legacySeedSignature(legacy) : '';
    let baseProfile = clone(session.profile);
    if (signature && signature !== session.legacySignature) {
      if (session.ignoreNextLegacySeed) {
        session.ignoreNextLegacySeed = false;
      } else if (session.resetRequested) {
        baseProfile = toV3(legacy);
        session.controller.replaceProfile(baseProfile);
        session.resetRequested = false;
      } else {
        baseProfile = mergeLegacySeed(baseProfile, toV3(legacy));
      }
      session.legacySignature = signature;
    }

    const profile = buildCanonicalProfileData(baseProfile, parsed.values, session.controller.getMap());
    const diagnostics = [
      ...structuralDiagnostics(profile),
      ...dependencies().domain.validate(profile),
      ...session.controller.validate()
    ];
    renderDiagnostics(session, diagnostics);
    if (diagnostics.some(item => item.severity === 'error')) {
      session.preview.value = JSON.stringify(profile, null, 2);
      return { ok: false, profile, diagnostics };
    }

    session.profile = clone(profile);
    session.preview.value = JSON.stringify(profile, null, 2);
    writeBlock(session, 'outputs', profile.outputs);
    return { ok: true, profile: clone(profile), diagnostics };
  }

  function createBlockEditors(session, rootElement) {
    BLOCKS.forEach(block => {
      const details = createElement('details', 'island-v3-block');
      if (['classification', 'geometry', 'hydrology', 'settlementCapacity'].includes(block.id)) details.open = true;
      const summary = createElement('summary', '', block.label);
      const textarea = createElement('textarea', 'island-v3-block-json');
      textarea.dataset.islandV3Block = block.id;
      textarea.rows = block.kind === 'array' ? 10 : 12;
      textarea.spellcheck = false;
      textarea.setAttribute('aria-label', `${block.label} JSON`);
      details.append(summary, textarea);
      rootElement.appendChild(details);
      session.blockEditors.set(block.id, textarea);
    });
  }

  function createWorkspace(panel, profileInput = null) {
    if (sessions.has(panel)) return sessions.get(panel);
    const deps = dependencies();
    const legacy = readLegacyOutput(panel);
    const profile = profileInput ? toV3(profileInput) : legacy ? toV3(legacy) : createBlankProfile();

    const workspace = createElement('section', 'island-v3-workspace');
    workspace.id = 'floating-island-v3-workspace';
    workspace.dataset.preparedRuntime = 'inactive-until-p1-activation';
    const heading = createElement('div', 'section-heading');
    heading.append(
      createElement('p', 'eyebrow', 'Prepared P1 Production Profile 3.0.0'),
      createElement('h3', '', 'Deliberate Island Surface and Ledger Editor'),
      createElement('p', 'helper-note', 'The legacy foundation form seeds scalar values. The grid and exact JSON ledger blocks are the authoritative Island 3.0.0 editing surface.')
    );

    const surfaceLayout = createElement('div', 'island-v3-surface-layout');
    const toolbarRoot = createElement('div', 'island-v3-toolbar');
    toolbarRoot.id = 'floating-island-surface-toolbar';
    const gridRoot = createElement('div', 'island-v3-grid');
    gridRoot.id = 'floating-island-surface-grid';
    const inspectorRoot = createElement('div', 'island-v3-inspector');
    inspectorRoot.id = 'floating-island-surface-inspector';
    const resizeRoot = createElement('div', 'island-v3-resize');
    resizeRoot.id = 'floating-island-surface-resize';
    surfaceLayout.append(toolbarRoot, gridRoot, inspectorRoot, resizeRoot);

    const ledgerHeading = createElement('div', 'section-heading');
    ledgerHeading.append(
      createElement('h3', '', 'Exact Production Ledgers'),
      createElement('p', 'helper-note', 'Each block is parsed as structured JSON. Invalid blocks prevent canonical save and export.')
    );
    const blockRoot = createElement('div', 'island-v3-block-grid');
    const diagnosticCard = createElement('article', 'island-v3-diagnostics');
    diagnosticCard.appendChild(createElement('h3', '', 'Island 3.0.0 Diagnostics'));
    const diagnosticList = createElement('ul');
    diagnosticCard.appendChild(diagnosticList);
    const previewCard = createElement('article', 'island-v3-preview-card');
    previewCard.appendChild(createElement('h3', '', 'Canonical Domain Preview'));
    const preview = createElement('textarea', 'island-v3-canonical-preview');
    preview.readOnly = true;
    preview.rows = 24;
    preview.setAttribute('aria-label', 'Canonical Island 3.0.0 domain preview');
    previewCard.appendChild(preview);
    workspace.append(heading, surfaceLayout, ledgerHeading, blockRoot, diagnosticCard, previewCard);

    const output = panel.querySelector('#floating-island-editor-output');
    if (output) panel.insertBefore(workspace, output);
    else panel.appendChild(workspace);

    const session = {
      panel,
      workspace,
      profile: clone(profile),
      blockEditors: new Map(),
      diagnosticList,
      preview,
      diagnostics: [],
      legacySignature: legacy?.schemaVersion === '2.0.0' ? legacySeedSignature(legacy) : '',
      ignoreNextLegacySeed: false,
      resetRequested: false,
      controller: null
    };
    sessions.set(panel, session);
    createBlockEditors(session, blockRoot);
    writeAllBlocks(session);
    preview.value = JSON.stringify(profile, null, 2);

    const form = panel.querySelector('#floating-island-editor-form');
    form?.addEventListener('reset', () => {
      session.resetRequested = true;
    });

    session.controller = new deps.controller.IslandSurfaceGridController({
      editorId: EDITOR_ID,
      profile,
      toolbarRoot,
      gridRoot,
      inspectorRoot,
      resizeRoot,
      getLocks: () => checkedLocks(panel),
      onProfileChange: payload => {
        session.profile = clone(payload.profile);
      },
      onDiagnostics: diagnostics => renderDiagnostics(session, diagnostics),
      onResizeCommitted: result => {
        session.profile = clone(result.profile);
      }
    });
    renderDiagnostics(session, deps.domain.validate(profile));
    return session;
  }

  function replaceSessionProfile(session, profileInput) {
    const profile = toV3(profileInput);
    session.profile = clone(profile);
    session.controller.replaceProfile(profile);
    session.ignoreNextLegacySeed = true;
    session.resetRequested = false;
    writeAllBlocks(session);
    session.preview.value = JSON.stringify(profile, null, 2);
    renderDiagnostics(session, dependencies().domain.validate(profile));
    return session;
  }

  function ensureSession(panel, profileInput = null) {
    const session = sessions.get(panel) || createWorkspace(panel, profileInput);
    if (profileInput && sessions.has(panel)) replaceSessionProfile(session, profileInput);
    return session;
  }

  function mountWhenReady(profileInput = null, attempts = 120) {
    const panel = document.getElementById('kaysender-editor-panel');
    const form = panel?.querySelector('#floating-island-editor-form');
    if (panel && form) {
      ensureSession(panel, profileInput);
      return;
    }
    if (attempts > 0) root.setTimeout(() => mountWhenReady(profileInput, attempts - 1), 50);
  }

  function readProfile(panel) {
    const session = ensureSession(panel);
    const result = buildSessionProfile(session);
    return result.ok ? result.profile : null;
  }

  function applyProfileToForm({ form, profile, mapping, fallback }) {
    const applied = mapping?.apply
      ? mapping.apply(form, profile, FIELD_MAP)
      : fallback?.(form, PROFILE_TYPE, profile) || [];
    const panel = form?.closest?.('.editor-panel') || document.getElementById('kaysender-editor-panel');
    if (panel) ensureSession(panel, profile);
    return applied;
  }

  function getWikiDraft(profile) {
    return clone(profile?.outputs?.wikiDraft || null);
  }

  function createMigrationDefinition() {
    return {
      id: 'island-2.0.0-to-3.0.0',
      profileType: PROFILE_TYPE,
      fromVersion: '2.0.0',
      toVersion: SCHEMA_VERSION,
      message: 'Migrated Island 2.0.0 into the deliberate Island 3.0.0 production profile.',
      applies: data => data?.profileType === PROFILE_TYPE && data?.schemaVersion === '2.0.0',
      migrate: source => dependencies().transformers.migrateV2ToV3(source).data
    };
  }

  function createDefinition(options = {}) {
    const openLegacy = options.openLegacy || (() => root.openFloatingIslandEditor?.());
    return {
      id: EDITOR_ID,
      aliases: ['island'],
      moduleId: 'floating-island-generator',
      label: 'Open Production Island Editor',
      profileType: PROFILE_TYPE,
      currentSchemaVersion: SCHEMA_VERSION,
      panelId: 'kaysender-editor-panel',
      formId: 'floating-island-editor-form',
      outputId: 'floating-island-editor-output',
      buildButtonId: 'island-build-profile',
      randomizeButtonId: 'island-randomize',
      legacyButtonSelectors: ['.editor-launch'],
      hiddenLegacyActionIds: ['island-copy-json', 'island-download-json'],
      cardLinkFlag: 'editorLinked',
      fieldMap: FIELD_MAP,
      flatFieldExclusions: ['map', 'derived', 'outputs'],
      parentImports: [],
      open: () => {
        openLegacy();
        mountWhenReady();
      },
      readProfile,
      applyProfileToForm,
      getWikiDraft
    };
  }

  function activationBundle(options = {}) {
    return Object.freeze({
      adapter: createDefinition(options),
      migration: createMigrationDefinition(),
      loadOrder: Object.freeze([
        'kaysender-surface-grid-editor.css',
        'kaysender-surface-grid-resize.css',
        'kaysender-island-v3-adapter.css',
        'kaysender-surface-grid-editor.js',
        'kaysender-surface-grid-brushes.js',
        'kaysender-surface-cell-inspector.js',
        'kaysender-surface-grid-toolbar.js',
        'kaysender-surface-grid-resize.js',
        'kaysender-island-v3-domain.js',
        'kaysender-island-v3-transformers.js',
        'kaysender-island-v3-consumer-builders.js',
        'kaysender-island-surface-grid-controller.js',
        'kaysender-island-v3-adapter-factory.js'
      ])
    });
  }

  root.KaysenderIslandV3AdapterFactory = Object.freeze({
    BLOCKS,
    EDITOR_ID,
    FIELD_MAP,
    PROFILE_TYPE,
    SCHEMA_VERSION,
    activationBundle,
    buildCanonicalProfileData,
    createBlankProfile,
    createDefinition,
    createMigrationDefinition,
    ensureSession,
    getSession: panel => sessions.get(panel) || null,
    legacySeedSignature,
    mergeLegacySeed,
    readProfile,
    replaceSessionProfile,
    structuralDiagnostics,
    toV3
  });
})();
