(() => {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;
  const base = root.KaysenderIslandV3AdapterFactory;
  const schema = root.KaysenderIslandV3Schema;
  if (!base || !schema) throw new Error('Island v3 adapter schema bridge requires the adapter factory and schema validator.');

  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const text = value => String(value || '').toLowerCase();
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, Number(value) || 0));

  const LEGACY_OPTIONS = Object.freeze({
    currentUse: ['unclaimed wilderness', 'frontier settlement', 'agricultural colony', 'mining claim', 'trade waypoint', 'military position', 'religious sanctuary', 'criminal hideout', 'pirate harbor', 'ruin expedition base', 'wildlife preserve', 'abandoned disaster site'],
    structuralIntegrity: ['loose unbound fragments', 'actively crumbling', 'fracture-prone', 'seasonally stressed', 'stable with local faults', 'geologically stable', 'exceptionally coherent', 'artificially reinforced'],
    altitudePredictability: ['fixed altitude', 'predictable cycle', 'seasonally predictable', 'weather-sensitive', 'irregular oscillation', 'violent altitude surges', 'unknown pattern'],
    driftPredictability: ['fixed relative position', 'precisely charted drift', 'charted seasonal route', 'weather-dependent route', 'loosely predictable wandering', 'erratic wandering', 'frequent course reversal', 'unknown external pull'],
    routeTraffic: ['major established route', 'regular regional traffic', 'occasional traffic', 'rare survey traffic', 'uncharted frontier', 'deliberately avoided region', 'secret or criminal corridor'],
    approachProfile: ['many safe approaches', 'two reliable approaches', 'one narrow approach', 'requires local pilot', 'storm-shear approach', 'no natural landing shelf', 'underside access only', 'moving rendezvous required'],
    waterProfile: ['none', 'seasonal rain only', 'rain capture and small springs', 'reliable spring network', 'lake or deep reservoir', 'abundant river system', 'tainted water system', 'magically sustained water', 'import dependent'],
    primaryTerrain: ['bare floatstone debris', 'broken cliffs', 'mixed plateau and ridges', 'broad arable plateau', 'terraced hills', 'forest canopy', 'fungal cloud forest', 'arid scrub', 'wetland basins', 'ruined urban surface', 'mining scarlands', 'glacial surface'],
    secondaryTerrain: ['none', 'wind-cut ravines', 'cliff shelves', 'sinkholes and caverns', 'old ruins', 'forest belts', 'pasture', 'crystal gullies', 'river valleys', 'wreck fields', 'volcanic vents', 'unstable edge fields'],
    mineralPresence: ['negligible', 'common stone only', 'mixed useful deposits', 'rich iron and base metals', 'precious-metal veins', 'floatstone ore concentration', 'crystal and arcane mineral field', 'industrial salts and alchemical minerals', 'ancient worked mine network'],
    mineralAccessibility: ['surface exposed', 'shallow quarrying', 'requires ordinary mining', 'deep and dangerous', 'inside unstable underside', 'contested by wildlife', 'sealed behind ruins'],
    wildlifeDensity: ['nearly sterile', 'sparse pioneer species', 'limited ecosystem', 'established ecosystem', 'rich biodiversity', 'overcrowded migration stop', 'apex-predator dominated', 'magically unstable ecology'],
    dominantWildlife: ['none', 'Gray blooms and plankton', 'mixed small sky fauna', 'sheffel-compatible grazers', 'large herd animals', 'predatory flyers', 'skywhale-associated ecology', 'burrowing cavern fauna', 'ruin-adapted creatures', 'magical weather entities'],
    hiddenSiteDensity: ['none expected', 'one isolated secret', 'several plausible sites', 'dense layered history', 'ruin-saturated landscape', 'mostly unexplored'],
    mapGridScale: ['6 x 4 coarse cells', '8 x 6 standard cells', '12 x 8 regional cells', '16 x 12 detailed cells', '24 x 16 campaign cells']
  });

  function exactOr(options, value, fallback) {
    return options.includes(value) ? value : fallback;
  }

  function mapCurrentUse(value) {
    const source = text(value);
    if (source.includes('agric')) return 'agricultural colony';
    if (source.includes('mine') || source.includes('mining')) return 'mining claim';
    if (source.includes('trade') || source.includes('market')) return 'trade waypoint';
    if (source.includes('military') || source.includes('fortress')) return 'military position';
    if (source.includes('relig') || source.includes('shrine')) return 'religious sanctuary';
    if (source.includes('pirate')) return 'pirate harbor';
    if (source.includes('criminal')) return 'criminal hideout';
    if (source.includes('ruin') || source.includes('expedition')) return 'ruin expedition base';
    if (source.includes('wildlife') || source.includes('preserve')) return 'wildlife preserve';
    if (source.includes('abandon') || source.includes('disaster')) return 'abandoned disaster site';
    if (source.includes('unclaim') || source.includes('wilderness')) return 'unclaimed wilderness';
    return exactOr(LEGACY_OPTIONS.currentUse, value, 'frontier settlement');
  }

  function mapStructuralIntegrity(profile) {
    const source = text(profile.stability?.structuralIntegrity);
    const exact = LEGACY_OPTIONS.structuralIntegrity.find(option => source.includes(option));
    if (exact) return exact;
    return ({ minimal: 'exceptionally coherent', low: 'geologically stable', guarded: 'stable with local faults', high: 'fracture-prone', critical: 'actively crumbling' })[profile.stability?.overallRisk] || 'stable with local faults';
  }

  function mapAltitude(profile) {
    const segments = profile.motion?.altitudeTimeline || [];
    if (!segments.length) return 'unknown pattern';
    const fixed = segments.every(item => Number(item.minimumAltitudeM) === Number(item.maximumAltitudeM));
    if (fixed) return 'fixed altitude';
    const confidence = segments[0]?.confidence;
    return ({ 'survey-grade': 'predictable cycle', high: 'predictable cycle', moderate: 'seasonally predictable', low: 'weather-sensitive', unknown: 'unknown pattern' })[confidence] || 'irregular oscillation';
  }

  function mapDrift(profile) {
    const segments = profile.motion?.driftTimeline || [];
    if (!segments.length) return 'unknown external pull';
    const stationary = segments.every(item => Number(item.averageKmPerDay) === 0);
    if (stationary) return 'fixed relative position';
    return ({ 'survey-grade': 'precisely charted drift', high: 'charted seasonal route', moderate: 'weather-dependent route', low: 'loosely predictable wandering', unknown: 'unknown external pull' })[segments[0]?.confidence] || 'erratic wandering';
  }

  function mapApproach(profile) {
    const zones = profile.approaches?.landingZones || [];
    if (!zones.length) return 'no natural landing shelf';
    if (zones.some(zone => zone.type === 'moving-rendezvous')) return 'moving rendezvous required';
    if (zones.some(zone => zone.type === 'underside-dock')) return 'underside access only';
    if (zones.some(zone => /storm|crosswind|shear/i.test(zone.weatherLimit || ''))) return 'storm-shear approach';
    if (zones.every(zone => ['restricted', 'closed'].includes(zone.status))) return 'requires local pilot';
    if (zones.length >= 3) return 'many safe approaches';
    if (zones.length === 2) return 'two reliable approaches';
    return 'one narrow approach';
  }

  function mapWater(profile) {
    const sources = profile.hydrology?.sources || [];
    const sourceText = text(sources.map(item => item.type).join(' '));
    if (!sources.length) return profile.foodCapacity?.importDependencyPercent === 100 ? 'import dependent' : 'none';
    if (sources.some(item => ['contaminated', 'dry'].includes(item.status))) return 'tainted water system';
    if (sourceText.includes('magic')) return 'magically sustained water';
    if (sourceText.includes('river')) return 'abundant river system';
    if (sourceText.includes('lake') || (profile.hydrology?.reservoirs || []).length) return 'lake or deep reservoir';
    if (sourceText.includes('spring')) return 'reliable spring network';
    if (Number(profile.hydrology?.annualRainfallMm || 0) > 0) return 'rain capture and small springs';
    return 'seasonal rain only';
  }

  function terrainKeyword(profile, secondary = false) {
    const active = new Set(profile.map?.activeCellIds || []);
    const cells = (profile.map?.cells || []).filter(cell => active.has(cell.id));
    const source = text(cells[secondary ? 1 : 0]?.terrainType || cells[0]?.terrainType);
    if (secondary) {
      if (!source) return 'none';
      if (source.includes('ravine')) return 'wind-cut ravines';
      if (source.includes('cliff')) return 'cliff shelves';
      if (source.includes('cavern') || source.includes('sink')) return 'sinkholes and caverns';
      if (source.includes('ruin')) return 'old ruins';
      if (source.includes('forest')) return 'forest belts';
      if (source.includes('pasture')) return 'pasture';
      if (source.includes('crystal')) return 'crystal gullies';
      if (source.includes('river')) return 'river valleys';
      if (source.includes('wreck')) return 'wreck fields';
      if (source.includes('volcan')) return 'volcanic vents';
      if (source.includes('unstable') || source.includes('fracture')) return 'unstable edge fields';
      return 'none';
    }
    if (source.includes('floatstone') || source.includes('debris')) return 'bare floatstone debris';
    if (source.includes('cliff')) return 'broken cliffs';
    if (source.includes('arable') || source.includes('pasture')) return 'broad arable plateau';
    if (source.includes('terrace')) return 'terraced hills';
    if (source.includes('fung')) return 'fungal cloud forest';
    if (source.includes('forest')) return 'forest canopy';
    if (source.includes('scrub') || source.includes('arid')) return 'arid scrub';
    if (source.includes('wet') || source.includes('basin') || source.includes('lake')) return 'wetland basins';
    if (source.includes('ruin') || source.includes('urban')) return 'ruined urban surface';
    if (source.includes('mine') || source.includes('quarry')) return 'mining scarlands';
    if (source.includes('glacial') || source.includes('ice')) return 'glacial surface';
    return 'mixed plateau and ridges';
  }

  function mapMineralPresence(profile) {
    const source = text((profile.resources?.nodes || []).map(item => item.resourceType).join(' '));
    if (!source) return 'negligible';
    if (source.includes('floatstone')) return 'floatstone ore concentration';
    if (source.includes('crystal') || source.includes('arcane')) return 'crystal and arcane mineral field';
    if (source.includes('gold') || source.includes('silver') || source.includes('gem')) return 'precious-metal veins';
    if (source.includes('iron') && /rich|high-grade/.test(source)) return 'rich iron and base metals';
    if (source.includes('salt') || source.includes('sulfur') || source.includes('nitrate')) return 'industrial salts and alchemical minerals';
    if (source.includes('worked') || source.includes('mine network')) return 'ancient worked mine network';
    return 'mixed useful deposits';
  }

  function mapMineralAccessibility(profile) {
    const source = text((profile.resources?.nodes || []).map(item => `${item.quality} ${item.status}`).join(' '));
    if (source.includes('surface')) return 'surface exposed';
    if (source.includes('shallow') || source.includes('quarry')) return 'shallow quarrying';
    if (source.includes('deep')) return 'deep and dangerous';
    if (source.includes('underside') || source.includes('unstable')) return 'inside unstable underside';
    if (source.includes('wildlife') || source.includes('contested')) return 'contested by wildlife';
    if (source.includes('sealed') || source.includes('ruin')) return 'sealed behind ruins';
    return 'requires ordinary mining';
  }

  function mapWildlife(profile) {
    const pressure = profile.ecology?.currentPressure;
    const capacity = Number(profile.ecology?.carryingCapacityIndex || 0);
    if (pressure === 'collapse') return 'nearly sterile';
    if (pressure === 'degrading') return 'sparse pioneer species';
    if (pressure === 'strained') return capacity > 80 ? 'overcrowded migration stop' : 'limited ecosystem';
    if (capacity >= 90) return 'rich biodiversity';
    if (capacity <= 15) return 'sparse pioneer species';
    return 'established ecosystem';
  }

  function mapDominantWildlife(profile) {
    const source = text((profile.ecology?.speciesSlots || []).map(item => `${item.role} ${item.populationBand}`).join(' '));
    if (!source) return 'none';
    if (source.includes('gray bloom') || source.includes('plankton')) return 'Gray blooms and plankton';
    if (source.includes('sheffel')) return 'sheffel-compatible grazers';
    if (source.includes('herd') || source.includes('grazer')) return 'large herd animals';
    if (source.includes('fly') || source.includes('predator')) return 'predatory flyers';
    if (source.includes('skywhale')) return 'skywhale-associated ecology';
    if (source.includes('burrow') || source.includes('cavern')) return 'burrowing cavern fauna';
    if (source.includes('ruin')) return 'ruin-adapted creatures';
    if (source.includes('magic') || source.includes('weather')) return 'magical weather entities';
    return 'mixed small sky fauna';
  }

  function mapGridScale(profile) {
    const columns = Number(profile.map?.columns || 1);
    const rows = Number(profile.map?.rows || 1);
    const presets = [[6, 4], [8, 6], [12, 8], [16, 12], [24, 16]];
    let best = presets[0];
    let distance = Infinity;
    presets.forEach(candidate => {
      const next = Math.abs(candidate[0] - columns) + Math.abs(candidate[1] - rows);
      if (next < distance) { distance = next; best = candidate; }
    });
    return LEGACY_OPTIONS.mapGridScale[presets.findIndex(item => item === best)];
  }

  const LEGACY_FIELD_MAP = Object.freeze({
    ...base.FIELD_MAP,
    currentUse: profile => mapCurrentUse(profile.classification?.currentUse),
    structuralIntegrity: mapStructuralIntegrity,
    fractureRate: profile => clamp(Number(profile.stability?.annualSurfaceLossPercent || 0) * 100, 0, 100),
    altitudePredictability: mapAltitude,
    driftPredictability: mapDrift,
    routeTraffic: profile => {
      const arrivals = Number(profile.routeNodeExport?.routeCapability?.maximumDailyArrivals || 0);
      if (arrivals >= 30) return 'major established route';
      if (arrivals >= 10) return 'regular regional traffic';
      if (arrivals > 0) return 'occasional traffic';
      return (profile.routeNodeExport?.nodes || []).some(node => node.status === 'secret') ? 'secret or criminal corridor' : 'rare survey traffic';
    },
    approachProfile: mapApproach,
    waterProfile: mapWater,
    primaryTerrain: profile => terrainKeyword(profile, false),
    secondaryTerrain: profile => terrainKeyword(profile, true),
    mineralPresence: mapMineralPresence,
    mineralAccessibility: mapMineralAccessibility,
    vegetationCoverPercent: profile => profile.geometry?.planAreaKm2
      ? clamp((Number((profile.ecology?.habitats || []).reduce((total, item) => total + Number(item.areaKm2 || 0), 0)) / Number(profile.geometry.planAreaKm2)) * 100, 0, 100)
      : 0,
    wildlifeDensity: mapWildlife,
    dominantWildlife: mapDominantWildlife,
    mapGridScale: mapGridScale
  });

  function renderSchemaDiagnostics(panel, diagnostics) {
    const session = base.getSession(panel);
    if (!session?.diagnosticList || !diagnostics.length) return;
    diagnostics.forEach(item => {
      const entry = document.createElement('li');
      entry.className = 'severity-error';
      const code = document.createElement('strong');
      code.textContent = item.code;
      entry.append(code, document.createTextNode(`: ${item.message}`));
      if (item.path) entry.append(document.createTextNode(` [${item.path}]`));
      session.diagnosticList.appendChild(entry);
    });
    session.diagnostics = [...(session.diagnostics || []), ...clone(diagnostics)];
  }

  function schemaDiagnostics(profile) {
    return schema.validate(profile);
  }

  function validateCanonical(profile) {
    const diagnostics = schemaDiagnostics(profile);
    return { ok: diagnostics.length === 0, diagnostics: clone(diagnostics), profile: clone(profile) };
  }

  function readProfile(panel) {
    const profile = base.readProfile(panel);
    if (!profile) return null;
    const result = validateCanonical(profile);
    if (!result.ok) {
      renderSchemaDiagnostics(panel, result.diagnostics);
      return null;
    }
    return result.profile;
  }

  function applyProfileToForm({ form, profile, mapping, fallback }) {
    const applied = mapping?.apply
      ? mapping.apply(form, profile, LEGACY_FIELD_MAP)
      : fallback?.(form, base.PROFILE_TYPE, profile) || [];
    const panel = form?.closest?.('.editor-panel') || document.getElementById('kaysender-editor-panel');
    if (panel) base.ensureSession(panel, profile);
    return applied;
  }

  function createDefinition(options = {}) {
    return Object.freeze({
      ...base.createDefinition(options),
      fieldMap: LEGACY_FIELD_MAP,
      readProfile,
      applyProfileToForm
    });
  }

  function activationBundle(options = {}) {
    return Object.freeze({
      adapter: createDefinition(options),
      migration: base.createMigrationDefinition(),
      loadOrder: Object.freeze([
        'kaysender-surface-grid-editor.css',
        'kaysender-surface-grid-resize.css',
        'kaysender-island-v3-adapter.css',
        'kaysender-surface-grid-editor.js',
        'kaysender-surface-grid-brushes.js',
        'kaysender-surface-cell-inspector.js',
        'kaysender-surface-grid-toolbar.js',
        'kaysender-surface-grid-resize.js',
        'kaysender-island-v3-schema-validator.js',
        'kaysender-island-v3-domain.js',
        'kaysender-island-v3-transformers.js',
        'kaysender-island-v3-consumer-builders.js',
        'kaysender-island-surface-grid-controller.js',
        'kaysender-island-v3-adapter-factory.js',
        'kaysender-island-v3-adapter-schema-bridge.js'
      ])
    });
  }

  root.KaysenderIslandV3AdapterFactory = Object.freeze({
    ...base,
    LEGACY_FIELD_MAP,
    LEGACY_OPTIONS,
    activationBundle,
    applyProfileToForm,
    createDefinition,
    readProfile,
    schemaDiagnostics,
    validateCanonical
  });
})();
