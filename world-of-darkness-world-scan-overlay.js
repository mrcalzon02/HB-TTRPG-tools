(() => {
  'use strict';

  const REPOSITORY = 'mrcalzon02/HB-TTRPG-tools';
  const MAX_LOCAL_SCAN_LOCATIONS = 90;
  const MAX_GLOBAL_BATCH_LOCATIONS = 75;
  const STORAGE = {
    localWorlds: 'hb-wod-local-world-seeds-v2',
    localRegistry: 'hb-wod-generated-location-packages-v2',
    activeWorld: 'hb-wod-active-world-seed-v2'
  };
  const GAME_LINES = new Set(['unified', 'vampire', 'werewolf', 'breeds', 'hunter', 'changeling', 'mage']);
  const SPHERE_BY_LINE = {
    unified: 'mixed',
    vampire: 'kindred',
    werewolf: 'garou',
    breeds: 'changing_breeds',
    hunter: 'hunter',
    changeling: 'dreaming',
    mage: 'awakened'
  };
  const SPHERE_LABELS = {
    all: 'All supernatural spheres',
    kindred: 'Kindred influence',
    garou: 'Garou influence',
    changing_breeds: 'Changing Breeds influence',
    hunter: 'Hunter surveillance',
    dreaming: 'Dreaming influence',
    awakened: 'Awakened influence',
    mixed: 'Mixed / unified influence',
    unknown: 'Unknown influence'
  };
  const SPHERE_COLORS = {
    kindred: '#8b1a1a',
    garou: '#2f7d32',
    changing_breeds: '#5d8f4e',
    hunter: '#c47f17',
    dreaming: '#7655a8',
    awakened: '#2767a8',
    mixed: '#666666',
    unknown: '#444444'
  };

  const state = {
    installed: false,
    config: null,
    crosslinks: null,
    locationVariants: [],
    claimedRegistry: { entries: {} },
    globalRegistry: { worlds: {} },
    influenceRegistry: { worlds: {} },
    localWorlds: { worlds: {} },
    localRegistry: { worlds: {} },
    activeRef: null,
    activeWorld: null,
    latestScan: null,
    map: null,
    influenceLayer: null,
    pendingScanAction: '',
    refreshing: false
  };

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  const normalize = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const clone = value => JSON.parse(JSON.stringify(value));
  const wait = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds));

  function murmurHash3(input, seed = 0) {
    let remainder = input.length & 3;
    let bytes = input.length - remainder;
    let h1 = seed;
    const c1 = 0xcc9e2d51;
    const c2 = 0x1b873593;
    let index = 0;
    while (index < bytes) {
      let k1 = (input.charCodeAt(index) & 0xff)
        | ((input.charCodeAt(++index) & 0xff) << 8)
        | ((input.charCodeAt(++index) & 0xff) << 16)
        | ((input.charCodeAt(++index) & 0xff) << 24);
      ++index;
      k1 = Math.imul(k1, c1);
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = Math.imul(k1, c2);
      h1 ^= k1;
      h1 = (h1 << 13) | (h1 >>> 19);
      h1 = Math.imul(h1, 5) + 0xe6546b64;
    }
    let k1 = 0;
    if (remainder === 3) k1 ^= (input.charCodeAt(index + 2) & 0xff) << 16;
    if (remainder >= 2) k1 ^= (input.charCodeAt(index + 1) & 0xff) << 8;
    if (remainder >= 1) {
      k1 ^= input.charCodeAt(index) & 0xff;
      k1 = Math.imul(k1, c1);
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = Math.imul(k1, c2);
      h1 ^= k1;
    }
    h1 ^= input.length;
    h1 ^= h1 >>> 16;
    h1 = Math.imul(h1, 0x85ebca6b);
    h1 ^= h1 >>> 13;
    h1 = Math.imul(h1, 0xc2b2ae35);
    h1 ^= h1 >>> 16;
    return h1 >>> 0;
  }

  function hash32(input) {
    let hash = 2166136261;
    for (const character of String(input)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  const keyFrom = (prefix, input) => `${prefix}-${hash32(input).toString(16).padStart(8, '0')}`;

  function readStorage(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  async function loadJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
  }

  function expandLocationCore(document) {
    if (Array.isArray(document.entries)) return document.entries;
    const prototypes = document.prototypes || [];
    const contexts = document.contextVariants || [];
    return prototypes.flatMap((prototype, prototypeIndex) => contexts.map((context, contextIndex) => ({
      ...prototype,
      id: `location-${String(prototypeIndex + 1).padStart(2, '0')}-${String(contextIndex + 1).padStart(2, '0')}`,
      variant: prototypeIndex * contexts.length + contextIndex + 1,
      context,
      inventoryStatus: context.inventoryStatus
    })));
  }

  async function loadData() {
    state.config = await loadJson('data/world-of-darkness/spatial-engine-config.json');
    const [crosslinks, locationCore, claimedRegistry, globalRegistry, influenceRegistry] = await Promise.all([
      loadJson(state.config.coreData.crosslinks),
      loadJson(state.config.coreData.locations),
      loadJson(state.config.coreData.centralRegistry),
      loadJson(state.config.coreData.generatedLocationRegistry),
      loadJson(state.config.coreData.influenceOverlayRegistry)
    ]);
    state.crosslinks = crosslinks;
    state.locationVariants = expandLocationCore(locationCore);
    state.claimedRegistry = claimedRegistry || { entries: {} };
    state.globalRegistry = globalRegistry || { worlds: {} };
    state.globalRegistry.worlds ||= {};
    state.influenceRegistry = influenceRegistry || { worlds: {} };
    state.influenceRegistry.worlds ||= {};
    loadLocalState();
    resolveActiveWorld();
  }

  function loadLocalState() {
    state.localWorlds = readStorage(STORAGE.localWorlds, { worlds: {} });
    state.localWorlds.worlds ||= {};
    state.localRegistry = readStorage(STORAGE.localRegistry, { worlds: {} });
    state.localRegistry.worlds ||= {};
    state.activeRef = readStorage(STORAGE.activeWorld, null);
  }

  function resolveActiveWorld() {
    loadLocalState();
    const ref = state.activeRef;
    if (!ref?.worldSeedKey) {
      state.activeWorld = null;
      return;
    }
    state.activeWorld = ref.scope === 'embedded'
      ? state.globalRegistry.worlds?.[ref.worldSeedKey] || state.localWorlds.worlds?.[ref.worldSeedKey] || null
      : state.localWorlds.worlds?.[ref.worldSeedKey] || state.globalRegistry.worlds?.[ref.worldSeedKey] || null;
  }

  function activeGameLine() {
    const line = document.getElementById('wod-spatial-line')?.value || 'unified';
    return GAME_LINES.has(line) ? line : 'unified';
  }

  function activeWorldPackages() {
    const key = state.activeWorld?.worldSeedKey;
    if (!key) return { local: {}, global: {} };
    return {
      local: state.localRegistry.worlds?.[key]?.packages || {},
      global: state.globalRegistry.worlds?.[key]?.packages || {}
    };
  }

  function scanViewportSignature(scan = state.latestScan) {
    if (!scan?.viewport?.bounds) return '';
    const bounds = scan.viewport.bounds;
    return [scan.viewport.zoom, bounds.south, bounds.west, bounds.north, bounds.east]
      .map(value => Number(value).toFixed(4))
      .join(':');
  }

  function currentViewportSignature() {
    const viewport = window.WODNamedLocationBridge?.getViewport?.();
    if (!viewport?.bounds) return '';
    const bounds = viewport.bounds;
    return [viewport.zoom, bounds.south, bounds.west, bounds.north, bounds.east]
      .map(value => Number(value).toFixed(4))
      .join(':');
  }

  function scanIsCurrent() {
    return Boolean(state.latestScan && scanViewportSignature() === currentViewportSignature());
  }

  function ensureCurrentScan(action) {
    if (scanIsCurrent()) return true;
    state.pendingScanAction = action;
    const discover = document.getElementById('wod-scan-visible-businesses');
    if (!discover) {
      setStatus('The named-location discovery control is not available yet.', 'error');
      return false;
    }
    setStatus(`The map moved since the last discovery. Discovering the current visible area before the ${action} scan…`);
    discover.click();
    return false;
  }

  function distanceMeters(location, center) {
    if (!center) return 0;
    const radians = degrees => degrees * Math.PI / 180;
    const lat1 = radians(center.lat);
    const lat2 = radians(location.lat);
    const deltaLat = radians(location.lat - center.lat);
    const deltaLng = radians(location.lng - center.lng);
    const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function categoryFor(location) {
    const tags = location.sourceTags || {};
    const amenity = tags.amenity;
    if (['restaurant', 'cafe', 'fast_food', 'food_court', 'ice_cream'].includes(amenity)) return 'restaurant';
    if (['bar', 'pub', 'biergarten'].includes(amenity)) return 'bar';
    if (amenity === 'nightclub') return 'night_club';
    if (amenity === 'library') return 'library';
    if (['hospital', 'clinic', 'doctors', 'dentist'].includes(amenity) || tags.healthcare) return 'hospital';
    if (amenity === 'pharmacy') return 'pharmacy';
    if (amenity === 'grave_yard') return 'cemetery';
    if (amenity === 'place_of_worship') return 'church';
    if (['bus_station', 'ferry_terminal'].includes(amenity) || tags.railway === 'station') return 'transit_station';
    if (['townhall', 'courthouse', 'police', 'fire_station', 'post_office'].includes(amenity)) return 'government';
    if (tags.shop === 'books') return 'book_store';
    if (tags.shop) return 'store';
    if (['hotel', 'motel', 'hostel', 'guest_house'].includes(tags.tourism)) return 'lodging';
    if (['park', 'garden', 'nature_reserve'].includes(tags.leisure)) return 'park';
    if (tags.office) return 'office';
    if (tags.craft || tags.landuse === 'industrial') return 'industrial';
    if (tags.highway) return ['path', 'footway', 'cycleway', 'track', 'steps'].includes(tags.highway) ? 'named_trail' : 'named_road';
    if (tags.natural) return 'natural_feature';
    if (tags.waterway) return 'water_feature';
    if (tags.historic) return 'historic_site';
    if (tags.place) return 'named_place';
    if (tags.boundary) return 'named_boundary';
    if (tags.building) return 'named_building';
    if (tags.railway || tags.public_transport) return 'transit_feature';
    if (tags.man_made || tags.power) return 'infrastructure';
    return 'other';
  }

  function canonicalLocation(raw) {
    const address = String(raw.address || '').trim();
    const lat = Number(raw.lat);
    const lng = Number(raw.lng);
    const canonical = [normalize(raw.name), normalize(address), lat.toFixed(6), lng.toFixed(6)].join('|');
    const locationKey = `gmaps-${murmurHash3(canonical, 0x1f123bb5).toString(16).padStart(8, '0')}`;
    return {
      locationKey,
      name: raw.name,
      address,
      referenceUrl: `https://www.openstreetmap.org/${raw.osmType}/${raw.osmId}`,
      category: categoryFor(raw),
      coordinates: { lat, lng },
      osmType: raw.osmType,
      osmId: String(raw.osmId),
      featureLabel: raw.featureLabel || 'Named Map Feature',
      sourceTags: clone(raw.sourceTags || {})
    };
  }

  function currentScanLocations() {
    const center = state.latestScan?.viewport?.center;
    const seen = new Set();
    return (state.latestScan?.locations || [])
      .filter(location => location.name && Number.isFinite(location.lat) && Number.isFinite(location.lng))
      .sort((a, b) => distanceMeters(a, center) - distanceMeters(b, center) || a.name.localeCompare(b.name))
      .map(canonicalLocation)
      .filter(location => {
        if (seen.has(location.locationKey)) return false;
        seen.add(location.locationKey);
        return true;
      })
      .slice(0, MAX_LOCAL_SCAN_LOCATIONS);
  }

  function lineLayer(line, location) {
    if (line === 'vampire') return location.kindredLayer;
    if (line === 'werewolf' || line === 'breeds') return location.umbralLayer;
    if (line === 'mage') return location.awakenedVector;
    if (line === 'hunter') return `Hunter assessment: ${location.mundaneBase.description} Every supernatural conclusion remains provisional evidence.`;
    if (line === 'changeling') return `Changeling interpretation: the mundane footprint casts a Dreaming reflection shaped by ${location.context.title.toLowerCase()}.`;
    return `${location.kindredLayer} | ${location.umbralLayer} | ${location.awakenedVector}`;
  }

  function selectPoolEntry(poolName, status, world, locationKey, gameLine) {
    const eligible = (state.crosslinks?.[poolName] || []).filter(entry => Array.isArray(entry.statuses) && entry.statuses.includes(status));
    if (!eligible.length) throw new Error(`No ${poolName} entries support ${status}.`);
    return clone(eligible[hash32(`${world.seedValue}|${locationKey}|${gameLine}|${poolName}`) % eligible.length]);
  }

  function worldContext(world, location, gameLine) {
    const variant = state.locationVariants[hash32(`${world.seedValue}|${location.locationKey}|${gameLine}|location-context`) % state.locationVariants.length];
    const status = variant.inventoryStatus;
    const strongLayer = lineLayer(gameLine, variant);
    const mapping = state.config.businessTypeMappings?.[location.category] || `Subverted Complex (${location.category.replaceAll('_', ' ')})`;
    if (status === 'MUNDANE') {
      return {
        variant,
        status,
        registry: 'No supernatural inventory entry',
        hiddenFunction: `No confirmed supernatural function. ${variant.context.effect}`,
        confidence: 'No credible supernatural evidence',
        catalogueNote: 'This world seed does not place the location in any supernatural inventory.'
      };
    }
    if (status === 'TANGENTIAL') {
      return {
        variant,
        status,
        registry: 'Peripheral association — not inventoried',
        hiddenFunction: `${variant.context.effect} The nearest thematic pattern resembles: ${strongLayer} The location itself is not confirmed as involved.`,
        confidence: 'Weak, indirect, historical, or route-adjacent evidence',
        catalogueNote: 'The location is peripheral to supernatural activity and is not inventoried.'
      };
    }
    return {
      variant,
      status,
      registry: `${mapping} — ${status === 'INVENTORIED' ? 'formal inventory entry' : 'active but unregistered'}`,
      hiddenFunction: `${variant.context.effect} ${strongLayer}`,
      confidence: status === 'INVENTORIED' ? 'Formally catalogued inside this world seed' : 'Active evidence without a formal ownership record',
      catalogueNote: status === 'INVENTORIED'
        ? 'The location is recorded, monitored, claimed, or administratively recognized in this generated world.'
        : 'The location is used or affected but remains absent from faction inventories.'
    };
  }

  function packageFor(world, location, gameLine, scan) {
    const packageKey = keyFrom('wodpkg', `${world.worldSeedKey}|${location.locationKey}|${gameLine}`);
    const context = worldContext(world, location, gameLine);
    const variant = context.variant;
    return {
      schemaVersion: '2.0.0',
      packageKey,
      worldSeedKey: world.worldSeedKey,
      worldSeedLabel: world.label,
      locationKey: location.locationKey,
      gameLine,
      generatedAt: scan.scannedAt,
      location: {
        name: location.name,
        address: location.address,
        referenceUrl: location.referenceUrl,
        category: location.category,
        coordinates: clone(location.coordinates),
        inventoryStatus: context.status,
        claimed: false,
        contextSnapshot: {
          inventoryLabel: context.status,
          locationVariant: `${variant.variant} of ${state.locationVariants.length}`,
          archetype: variant.mundaneBase.name,
          archetypeCategory: variant.mundaneBase.category,
          contextTitle: variant.context.title,
          contextEffect: variant.context.effect,
          mechanicalSeed: variant.context.mechanicalSeed,
          publicFacade: `${location.name} follows a ${variant.mundaneBase.name.toLowerCase()}-pattern ${variant.mundaneBase.category.toLowerCase()} footprint. ${variant.mundaneBase.description}`,
          hiddenFunction: context.hiddenFunction,
          evidenceConfidence: context.confidence,
          catalogueNote: context.catalogueNote,
          supernaturalRegistry: context.registry,
          namedFeatureClass: location.featureLabel
        },
        spatialContext: {
          source: 'OpenStreetMap / Overpass',
          osmType: location.osmType,
          osmId: location.osmId,
          osmUrl: location.referenceUrl,
          featureLabel: location.featureLabel,
          sourceTags: clone(location.sourceTags),
          scanZoom: scan.viewport.zoom,
          scanBounds: clone(scan.viewport.bounds),
          scanCenter: clone(scan.viewport.center),
          discoveredAt: scan.scannedAt
        }
      },
      outputs: {
        population: selectPoolEntry('population', context.status, world, location.locationKey, gameLine),
        struggle: selectPoolEntry('struggles', context.status, world, location.locationKey, gameLine),
        adventureHook: selectPoolEntry('adventureHooks', context.status, world, location.locationKey, gameLine),
        locationSeed: selectPoolEntry('locationSeeds', context.status, world, location.locationKey, gameLine),
        item: selectPoolEntry('items', context.status, world, location.locationKey, gameLine)
      },
      crossLinks: clone(state.crosslinks.crossLinks || []),
      source: {
        crosslinkSchemaVersion: state.crosslinks.schemaVersion,
        generatorVersion: 'world-seeded-viewport-scan-1.0.0'
      }
    };
  }

  function ensureLocalWorldRecord(world) {
    state.localRegistry.worlds[world.worldSeedKey] ||= {
      worldSeedKey: world.worldSeedKey,
      label: world.label,
      seedValue: world.seedValue,
      createdAt: world.createdAt,
      source: 'local',
      packages: {},
      scanCoverage: {}
    };
    const record = state.localRegistry.worlds[world.worldSeedKey];
    record.packages ||= {};
    record.scanCoverage ||= {};
    return record;
  }

  function localScan() {
    if (!state.activeWorld) return setStatus('Select a local or embedded world seed before scanning.', 'error');
    if (!ensureCurrentScan('local')) return;
    const gameLine = activeGameLine();
    const locations = currentScanLocations();
    if (!locations.length) return setStatus('No named locations are available in the current discovery result.', 'error');
    const record = ensureLocalWorldRecord(state.activeWorld);
    let added = 0;
    let existing = 0;
    let claimed = 0;
    const packageKeys = [];
    for (const location of locations) {
      if (state.claimedRegistry.entries?.[location.locationKey]) {
        claimed += 1;
        continue;
      }
      const pkg = packageFor(state.activeWorld, location, gameLine, state.latestScan);
      packageKeys.push(pkg.packageKey);
      if (record.packages[pkg.packageKey]) {
        existing += 1;
        continue;
      }
      record.packages[pkg.packageKey] = pkg;
      added += 1;
    }
    const scanKey = keyFrom('wodscan', `${state.activeWorld.worldSeedKey}|local|${gameLine}|${scanViewportSignature()}|${packageKeys.join('|')}`);
    record.scanCoverage[scanKey] ||= {
      scanKey,
      scope: 'local',
      scannedAt: state.latestScan.scannedAt,
      gameLine,
      viewport: clone(state.latestScan.viewport),
      discoveredCount: state.latestScan.locations.length,
      processedCount: locations.length,
      addedCount: added,
      existingCount: existing,
      claimedExcludedCount: claimed,
      responseCapped: Boolean(state.latestScan.meta?.capped),
      packageKeys: [...new Set(packageKeys)].sort()
    };
    record.packages = Object.fromEntries(Object.entries(record.packages).sort(([a], [b]) => a.localeCompare(b)));
    if (!writeStorage(STORAGE.localRegistry, state.localRegistry)) {
      return setStatus('Browser storage could not save the local world scan.', 'error');
    }
    document.dispatchEvent(new CustomEvent('wod:local-world-scan-complete', { detail: { worldSeedKey: state.activeWorld.worldSeedKey, scanKey, added, existing, claimed } }));
    renderWorldSummary();
    renderInfluenceOverlay();
    setStatus(`Local scan complete for ${state.activeWorld.label}: ${added} new packages, ${existing} already present, ${claimed} claimed locations deferred.`, 'success');
  }

  function globalMissingLocations() {
    const world = state.activeWorld;
    if (!world) return [];
    const gameLine = activeGameLine();
    const globalPackages = state.globalRegistry.worlds?.[world.worldSeedKey]?.packages || {};
    return currentScanLocations().filter(location => {
      if (state.claimedRegistry.entries?.[location.locationKey]) return false;
      const packageKey = keyFrom('wodpkg', `${world.worldSeedKey}|${location.locationKey}|${gameLine}`);
      return !globalPackages[packageKey];
    });
  }

  function globalScan() {
    if (!state.activeWorld) return setStatus('Select a local or embedded world seed before scanning.', 'error');
    if (!ensureCurrentScan('global')) return;
    const missing = globalMissingLocations();
    if (!missing.length) return setStatus('Every eligible named location in this visible scan already exists in the global register for the active seed and game line.', 'success');
    const batch = missing.slice(0, MAX_GLOBAL_BATCH_LOCATIONS);
    const gameLine = activeGameLine();
    const scanKey = keyFrom('wodscan', `${state.activeWorld.worldSeedKey}|global|${gameLine}|${state.latestScan.scannedAt}|${batch.map(location => location.locationKey).join('|')}`);
    const patch = {
      schemaVersion: '1.0.0',
      target: 'data/world-of-darkness/generated_location_registry.json',
      worldSeed: {
        worldSeedKey: state.activeWorld.worldSeedKey,
        label: state.activeWorld.label,
        seedValue: state.activeWorld.seedValue,
        createdAt: state.activeWorld.createdAt
      },
      gameLine,
      scan: {
        scanKey,
        scannedAt: state.latestScan.scannedAt,
        zoom: state.latestScan.viewport.zoom,
        bounds: clone(state.latestScan.viewport.bounds),
        center: clone(state.latestScan.viewport.center),
        discoveredCount: state.latestScan.locations.length,
        responseCapped: Boolean(state.latestScan.meta?.capped)
      },
      locations: batch
    };
    const body = `<!-- WOD_WORLD_SCAN_BATCH_PATCH -->\nThis issue registers previously unscanned named locations under one immutable World of Darkness world seed.\n\n\`\`\`json\n${JSON.stringify(patch, null, 2)}\n\`\`\`\n`;
    const title = `[WOD-SCAN] ${state.activeWorld.label} · ${batch.length} named locations · ${scanKey}`;
    window.open(`https://github.com/${REPOSITORY}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`, '_blank', 'noopener');
    const remaining = Math.max(0, missing.length - batch.length);
    setStatus(`Prepared a global batch containing ${batch.length} previously unscanned named locations. Submit the issue, then run “Ingest World of Darkness World Scan Batch” with its issue number.${remaining ? ` ${remaining} additional missing locations remain for a later batch after the registry refreshes.` : ''}`, 'success');
  }

  async function refreshGlobalRegistry() {
    if (state.refreshing) return;
    state.refreshing = true;
    const button = document.getElementById('wod-refresh-global-world');
    if (button) button.disabled = true;
    try {
      state.globalRegistry = await loadJson(state.config.coreData.generatedLocationRegistry);
      state.globalRegistry.worlds ||= {};
      resolveActiveWorld();
      renderWorldSummary();
      renderInfluenceOverlay();
      setStatus('Global world registry refreshed from the repository.', 'success');
    } catch (error) {
      setStatus(`Global registry refresh failed: ${error.message}`, 'error');
    } finally {
      state.refreshing = false;
      if (button) button.disabled = false;
    }
  }

  function influenceRadius(status) {
    if (status === 'TANGENTIAL') return 120;
    if (status === 'ACTIVE_UNREGISTERED') return 240;
    if (status === 'INVENTORIED') return 420;
    return 0;
  }

  function combinedInfluencePackages() {
    const scope = document.getElementById('wod-influence-scope')?.value || 'both';
    const sphereFilter = document.getElementById('wod-influence-sphere')?.value || 'all';
    const { local, global } = activeWorldPackages();
    const records = [];
    if (scope === 'both' || scope === 'global') {
      Object.values(global).forEach(pkg => records.push({ pkg, source: 'global' }));
    }
    if (scope === 'both' || scope === 'local') {
      Object.values(local).forEach(pkg => records.push({ pkg, source: 'local' }));
    }
    const seen = new Set();
    return records.filter(record => {
      const identity = `${record.pkg.packageKey}|${record.source}`;
      if (seen.has(identity)) return false;
      seen.add(identity);
      const sphere = SPHERE_BY_LINE[record.pkg.gameLine] || 'unknown';
      if (sphereFilter !== 'all' && sphere !== sphereFilter) return false;
      return influenceRadius(record.pkg.location?.inventoryStatus) > 0;
    });
  }

  function ensureInfluenceLayer() {
    state.map ||= window.WODNamedLocationBridge?.getMap?.() || window.WODChronicleSpatialMap || null;
    if (!state.map || !window.L) return false;
    if (!state.influenceLayer) state.influenceLayer = window.L.layerGroup().addTo(state.map);
    return true;
  }

  function renderCuratedInfluence() {
    const world = state.influenceRegistry.worlds?.[state.activeWorld?.worldSeedKey];
    if (!world?.features || !Array.isArray(world.features)) return 0;
    let rendered = 0;
    for (const feature of world.features) {
      if (feature.geometry?.type !== 'Circle') continue;
      const [lng, lat] = feature.geometry.coordinates || [];
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(feature.geometry.radiusMeters)) continue;
      const sphere = feature.properties?.sphere || 'unknown';
      const circle = window.L.circle([lat, lng], {
        radius: feature.geometry.radiusMeters,
        color: SPHERE_COLORS[sphere] || SPHERE_COLORS.unknown,
        weight: 3,
        opacity: 0.8,
        fillOpacity: 0.12
      });
      circle.bindPopup(`<strong>${escapeHtml(feature.properties?.name || 'Curated influence zone')}</strong><br>${escapeHtml(SPHERE_LABELS[sphere] || sphere)}<br>Curated global geometry`);
      circle.addTo(state.influenceLayer);
      rendered += 1;
    }
    return rendered;
  }

  function renderInfluenceOverlay() {
    if (!ensureInfluenceLayer()) return;
    state.influenceLayer.clearLayers();
    const enabled = document.getElementById('wod-influence-enabled')?.checked !== false;
    if (!enabled || !state.activeWorld) {
      renderInfluenceSummary(0, 0);
      return;
    }
    let generatedCount = 0;
    for (const { pkg, source } of combinedInfluencePackages()) {
      const lat = Number(pkg.location?.coordinates?.lat);
      const lng = Number(pkg.location?.coordinates?.lng);
      const radius = influenceRadius(pkg.location?.inventoryStatus);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !radius) continue;
      const sphere = SPHERE_BY_LINE[pkg.gameLine] || 'unknown';
      const circle = window.L.circle([lat, lng], {
        radius,
        color: SPHERE_COLORS[sphere] || SPHERE_COLORS.unknown,
        weight: source === 'global' ? 3 : 2,
        opacity: source === 'global' ? 0.75 : 0.6,
        fillOpacity: pkg.location.inventoryStatus === 'INVENTORIED' ? 0.18 : 0.09,
        dashArray: source === 'local' ? '7 5' : null
      });
      circle.bindPopup(`<strong>${escapeHtml(pkg.location.name)}</strong><br>${escapeHtml(SPHERE_LABELS[sphere] || sphere)}<br>${escapeHtml(pkg.location.inventoryStatus)} · ${escapeHtml(source)}<br><small>${escapeHtml(pkg.packageKey)}</small>`);
      circle.addTo(state.influenceLayer);
      generatedCount += 1;
    }
    const curatedCount = renderCuratedInfluence();
    renderInfluenceSummary(generatedCount, curatedCount);
  }

  function renderInfluenceSummary(generatedCount, curatedCount) {
    const target = document.getElementById('wod-influence-summary');
    if (!target) return;
    target.textContent = `${generatedCount} provisional package halo${generatedCount === 1 ? '' : 's'} · ${curatedCount} curated influence feature${curatedCount === 1 ? '' : 's'}`;
  }

  function buildPanel() {
    const engine = document.getElementById('wod-spatial-engine');
    const header = engine?.querySelector('.wod-inventory-header');
    if (!engine || !header) return false;
    if (document.getElementById('wod-world-scan-overlay-panel')) return true;
    injectStyles();
    const panel = document.createElement('section');
    panel.id = 'wod-world-scan-overlay-panel';
    panel.className = 'wod-world-scan-panel';
    panel.innerHTML = `
      <div class="wod-world-scan-heading">
        <div><p class="eyebrow">Active Chronicle world seed</p><h3 id="wod-world-scan-title">No world selected</h3></div>
        <span id="wod-world-scan-scope" class="wod-world-scan-badge">Unavailable</span>
      </div>
      <div id="wod-world-scan-seed" class="wod-world-scan-seed"></div>
      <div id="wod-world-scan-counts" class="wod-world-scan-counts"></div>
      <div class="wod-world-scan-actions">
        <button id="wod-scan-local-world" class="secondary-action">Scan Visible Area Locally</button>
        <button id="wod-scan-global-world" class="primary-action">Scan Visible Area Globally</button>
        <button id="wod-refresh-global-world" class="secondary-action">Refresh Global Register</button>
        <button id="wod-copy-world-seed" class="secondary-action">Copy World Seed</button>
      </div>
      <div id="wod-world-scan-status" class="wod-world-scan-status">Discover named locations, then choose a local or global world scan.</div>
      <details class="wod-world-scan-influence" open>
        <summary>Supernatural spheres of influence overlay groundwork</summary>
        <div class="wod-world-scan-controls">
          <label><input id="wod-influence-enabled" type="checkbox" checked> Show influence overlay</label>
          <select id="wod-influence-scope"><option value="both">Local and global packages</option><option value="local">Local packages only</option><option value="global">Global packages only</option></select>
          <select id="wod-influence-sphere">${Object.entries(SPHERE_LABELS).map(([id, label]) => `<option value="${id}">${escapeHtml(label)}</option>`).join('')}</select>
        </div>
        <p id="wod-influence-summary" class="wod-world-scan-counts">0 provisional package halos · 0 curated influence features</p>
        <p class="wod-note">Solid circles represent globally embedded packages; dashed circles represent local packages. Tangential, active-unregistered, and inventoried locations receive progressively larger provisional influence radii. Curated faction borders and routes will later be stored in the influence overlay registry.</p>
      </details>`;
    header.insertAdjacentElement('afterend', panel);
    bindPanel();
    return true;
  }

  function injectStyles() {
    if (document.getElementById('wod-world-scan-overlay-style')) return;
    const style = document.createElement('style');
    style.id = 'wod-world-scan-overlay-style';
    style.textContent = `
      .wod-world-scan-panel{padding:14px 18px;border-bottom:1px solid var(--line);background:#11141b}
      .wod-world-scan-heading{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.wod-world-scan-heading h3{margin:.1rem 0 .35rem}
      .wod-world-scan-badge{border:1px solid var(--line);border-radius:999px;padding:5px 9px;color:var(--muted);font-size:.72rem;white-space:nowrap}
      .wod-world-scan-badge.global{border-color:#00a98f;color:#a9f1da}.wod-world-scan-badge.local{border-color:#7655a8;color:#d7c6f4}
      .wod-world-scan-seed{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;word-break:break-all;color:var(--accent);font-size:.75rem}
      .wod-world-scan-counts{color:var(--muted);font-size:.78rem;margin:.45rem 0}.wod-world-scan-actions{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0}
      .wod-world-scan-status{padding:9px;border:1px solid var(--line);border-radius:9px;background:#0d1016;color:var(--muted);font-size:.79rem}.wod-world-scan-status.error{border-color:#8b0000;color:#ffb3b3}.wod-world-scan-status.success{border-color:#2d8f71;color:#a9f1da}
      .wod-world-scan-influence{margin-top:10px;border-top:1px solid var(--line);padding-top:9px}.wod-world-scan-controls{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px}.wod-world-scan-controls label{display:flex;gap:6px;align-items:center;color:var(--muted);font-size:.78rem}.wod-world-scan-controls select{background:#10131a;border:1px solid var(--line);color:var(--ink);border-radius:8px;padding:7px}
      @media(max-width:700px){.wod-world-scan-heading{display:block}.wod-world-scan-badge{display:inline-block;margin-bottom:8px}.wod-world-scan-actions{display:grid}.wod-world-scan-controls{display:grid}}
    `;
    document.head.appendChild(style);
  }

  function bindPanel() {
    document.getElementById('wod-scan-local-world').addEventListener('click', localScan);
    document.getElementById('wod-scan-global-world').addEventListener('click', globalScan);
    document.getElementById('wod-refresh-global-world').addEventListener('click', refreshGlobalRegistry);
    document.getElementById('wod-copy-world-seed').addEventListener('click', async () => {
      if (!state.activeWorld) return;
      const text = `${state.activeWorld.worldSeedKey}\n${state.activeWorld.seedValue}`;
      try {
        await navigator.clipboard.writeText(text);
        setStatus('The active world seed key and value were copied.', 'success');
      } catch (_) {
        setStatus(`World seed: ${state.activeWorld.worldSeedKey} · ${state.activeWorld.seedValue}`);
      }
    });
    document.getElementById('wod-influence-enabled').addEventListener('change', renderInfluenceOverlay);
    document.getElementById('wod-influence-scope').addEventListener('change', renderInfluenceOverlay);
    document.getElementById('wod-influence-sphere').addEventListener('change', renderInfluenceOverlay);
    document.getElementById('wod-spatial-line')?.addEventListener('change', () => {
      renderWorldSummary();
      renderInfluenceOverlay();
    });
  }

  function renderWorldSummary() {
    const title = document.getElementById('wod-world-scan-title');
    const badge = document.getElementById('wod-world-scan-scope');
    const seed = document.getElementById('wod-world-scan-seed');
    const counts = document.getElementById('wod-world-scan-counts');
    if (!title || !badge || !seed || !counts) return;
    resolveActiveWorld();
    if (!state.activeWorld) {
      title.textContent = 'No world seed selected';
      badge.textContent = 'Unavailable';
      badge.className = 'wod-world-scan-badge';
      seed.textContent = 'Use the world-seed selector in the left panel.';
      counts.textContent = '';
      return;
    }
    const worldKey = state.activeWorld.worldSeedKey;
    const localWorld = state.localRegistry.worlds?.[worldKey];
    const globalWorld = state.globalRegistry.worlds?.[worldKey];
    const localCount = Object.keys(localWorld?.packages || {}).length;
    const globalCount = Object.keys(globalWorld?.packages || {}).length;
    const localCoverage = Object.keys(localWorld?.scanCoverage || {}).length;
    const globalCoverage = Object.keys(globalWorld?.scanCoverage || {}).length;
    const globalCounterpart = Boolean(globalWorld);
    title.textContent = state.activeWorld.label;
    badge.textContent = state.activeRef?.scope === 'embedded'
      ? 'Editing embedded global world'
      : globalCounterpart ? 'Editing local world with global counterpart' : 'Editing local-only world';
    badge.className = `wod-world-scan-badge ${globalCounterpart ? 'global' : 'local'}`;
    seed.innerHTML = `<strong>${escapeHtml(worldKey)}</strong><br>${escapeHtml(state.activeWorld.seedValue)}`;
    const missing = state.latestScan && scanIsCurrent() ? globalMissingLocations().length : null;
    counts.textContent = `${localCount} local packages · ${globalCount} global packages · ${localCoverage} local viewport scans · ${globalCoverage} global viewport scans${missing == null ? '' : ` · ${missing} visible locations missing globally for ${activeGameLine()}`}`;
  }

  function setStatus(message, type = '') {
    const target = document.getElementById('wod-world-scan-status');
    if (!target) return;
    target.className = `wod-world-scan-status ${type}`.trim();
    target.textContent = message;
  }

  function handleScanComplete(event) {
    state.latestScan = event.detail || window.WODNamedLocationBridge?.getLatestScan?.() || null;
    renderWorldSummary();
    const action = state.pendingScanAction;
    state.pendingScanAction = '';
    if (action === 'local') localScan();
    if (action === 'global') globalScan();
  }

  function handleWorldChanged() {
    resolveActiveWorld();
    renderWorldSummary();
    renderInfluenceOverlay();
  }

  async function install() {
    if (state.installed) return;
    state.installed = true;
    let attempts = 0;
    while (!buildPanel() && attempts < 150) {
      attempts += 1;
      await wait(100);
    }
    if (!document.getElementById('wod-world-scan-overlay-panel')) return;
    try {
      await loadData();
      state.latestScan = window.WODNamedLocationBridge?.getLatestScan?.() || null;
      state.map = window.WODNamedLocationBridge?.getMap?.() || window.WODChronicleSpatialMap || null;
      renderWorldSummary();
      renderInfluenceOverlay();
      document.addEventListener('wod:named-location-scan-complete', handleScanComplete);
      document.addEventListener('wod:spatial-map-ready', event => {
        state.map = event.detail?.map || window.WODChronicleSpatialMap || null;
        renderInfluenceOverlay();
      });
      document.addEventListener('wod:world-seed-changed', handleWorldChanged);
      document.addEventListener('wod:local-world-scan-complete', handleWorldChanged);
    } catch (error) {
      setStatus(`World scan and influence overlay failed to initialize: ${error.message}`, 'error');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else void install();
})();
