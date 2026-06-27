(() => {
  'use strict';

  const OVERPASS_HOSTS = new Set(['overpass-api.de', 'overpass.kumi.systems']);
  const MAX_VISIBLE = 90;
  const STEP_DELAY_MS = 24;
  const STORAGE = { localPrefix: 'hb-wod-poi-v2:' };
  const INVENTORY_LABELS = {
    MUNDANE: 'Mundane / No Known Connection',
    TANGENTIAL: 'Tangential / Peripheral Association',
    ACTIVE_UNREGISTERED: 'Active but Unregistered',
    INVENTORIED: 'Formally Inventoried'
  };
  const BUSINESS_TYPES = {
    restaurant: 'Food / Restaurant', bar: 'Bar / Pub', night_club: 'Night Club',
    book_store: 'Book Store', library: 'Library', hospital: 'Healthcare', pharmacy: 'Pharmacy',
    cemetery: 'Cemetery', park: 'Park / Green Space', store: 'Retail', lodging: 'Lodging',
    church: 'Religious Site', transit_station: 'Transit', government: 'Civic / Government',
    office: 'Office', industrial: 'Craft / Industrial', natural_feature: 'Natural Feature',
    road: 'Road / Route', education: 'Education', historic: 'Historic Site',
    fitness: 'Fitness / Gym', sports: 'Sports / Recreation', other: 'Other Named Location'
  };

  const originalFetch = window.fetch.bind(window);
  const state = {
    map: null,
    markerLayer: null,
    queueToken: 0,
    running: false,
    rawLocations: [],
    records: [],
    recordByKey: new Map(),
    corePromise: null,
    core: null,
    diversitySession: null,
    centralRegistry: { entries: {} },
    installed: false,
    lastCenter: null
  };

  const wait = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds));
  const nextPaint = () => new Promise(resolve => requestAnimationFrame(() => resolve()));
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  const normalize = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

  function readStorage(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch (_) { return fallback; }
  }

  function murmurHash3(input, seed = 0) {
    let remainder = input.length & 3;
    const bytes = input.length - remainder;
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

  function isOverpassUrl(input) {
    try {
      const raw = input instanceof Request ? input.url : String(input);
      return OVERPASS_HOSTS.has(new URL(raw, location.href).hostname);
    } catch (_) { return false; }
  }

  function interceptOverpass() {
    window.fetch = async function radialLocationFetch(input, init = {}) {
      const response = await originalFetch(input, init);
      if (!isOverpassUrl(input)) return response;
      return new Proxy(response, {
        get(target, property) {
          if (property === 'json') return async () => {
            const payload = await target.json();
            if (!payload || !Array.isArray(payload.elements)) return payload;
            const elements = payload.elements.slice();
            window.setTimeout(() => beginFromElements(elements), 0);
            return { ...payload, elements: [] };
          };
          const value = Reflect.get(target, property, target);
          return typeof value === 'function' ? value.bind(target) : value;
        }
      });
    };
  }

  async function loadJson(url) {
    const response = await originalFetch(url, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
  }

  async function loadCoreData() {
    if (state.corePromise) return state.corePromise;
    state.corePromise = (async () => {
      updateOverall('Loading Chronicle context and diversity tables…', 5);
      const config = await loadJson('data/world-of-darkness/spatial-engine-config.json');
      const detailPath = config.coreData.detailDiversity || 'data/world-of-darkness/location_detail_diversity_v1.json';
      const [baseLocations, contextExpansion, registry, detailDiversity] = await Promise.all([
        loadJson(config.coreData.locations),
        loadJson(config.coreData.contextExpansion),
        loadJson(config.coreData.centralRegistry),
        loadJson(detailPath)
      ]);
      state.core = { config, baseLocations, contextExpansion, detailDiversity };
      state.centralRegistry = registry || { entries: {} };
      updateOverall('Expanded Chronicle detail tables ready.', 100);
      return state.core;
    })().catch(error => {
      state.corePromise = null;
      throw error;
    });
    return state.corePromise;
  }

  function featureLabelFrom(tags = {}) {
    if (tags.wod_named_feature_label) return tags.wod_named_feature_label;
    if (tags.leisure === 'fitness_centre' || tags.amenity === 'gym') return 'Fitness Centre';
    if (tags.leisure === 'sports_centre' || tags.leisure === 'stadium' || tags.sport) return 'Sports Facility';
    if (tags.amenity === 'restaurant' || tags.amenity === 'cafe' || tags.amenity === 'fast_food') return 'Food Venue';
    if (tags.amenity === 'bar' || tags.amenity === 'pub' || tags.amenity === 'nightclub') return 'Nightlife Venue';
    if (tags.shop) return 'Retail Location';
    if (tags.office) return 'Office';
    if (tags.tourism) return 'Tourism Location';
    if (tags.amenity === 'place_of_worship') return 'Religious Site';
    if (tags.amenity === 'grave_yard' || tags.landuse === 'cemetery') return 'Cemetery';
    if (tags.amenity === 'school' || tags.amenity === 'college' || tags.amenity === 'university') return 'Education Site';
    if (tags.railway || tags.public_transport) return 'Transit Feature';
    if (tags.highway) return 'Named Road or Path';
    if (tags.leisure === 'park' || tags.leisure === 'garden' || tags.leisure === 'nature_reserve') return 'Park or Green Space';
    if (tags.natural || tags.waterway) return 'Natural or Water Feature';
    if (tags.historic) return 'Historic Site';
    if (tags.building) return 'Named Building';
    if (tags.place) return 'Named Place';
    return 'Named Map Feature';
  }

  function detectCategory(tags = {}, featureLabel = '') {
    const amenity = tags.amenity;
    const shop = tags.shop;
    const tourism = tags.tourism;
    if (tags.leisure === 'fitness_centre' || amenity === 'gym') return 'fitness';
    if (tags.leisure === 'sports_centre' || tags.leisure === 'stadium' || tags.sport) return 'sports';
    if (['restaurant', 'cafe', 'fast_food', 'food_court', 'ice_cream'].includes(amenity)) return 'restaurant';
    if (['bar', 'pub', 'biergarten'].includes(amenity)) return 'bar';
    if (amenity === 'nightclub') return 'night_club';
    if (amenity === 'library') return 'library';
    if (['hospital', 'clinic', 'doctors', 'dentist'].includes(amenity) || tags.healthcare) return 'hospital';
    if (amenity === 'pharmacy') return 'pharmacy';
    if (amenity === 'grave_yard' || tags.landuse === 'cemetery') return 'cemetery';
    if (amenity === 'place_of_worship') return 'church';
    if (['school', 'college', 'university', 'kindergarten'].includes(amenity)) return 'education';
    if (['bus_station', 'ferry_terminal'].includes(amenity) || tags.railway || tags.public_transport) return 'transit_station';
    if (['townhall', 'courthouse', 'police', 'fire_station', 'post_office'].includes(amenity)) return 'government';
    if (shop === 'books') return 'book_store';
    if (shop) return 'store';
    if (['hotel', 'motel', 'hostel', 'guest_house'].includes(tourism)) return 'lodging';
    if (tags.office) return 'office';
    if (tags.craft || tags.industrial || tags.man_made || tags.landuse === 'industrial') return 'industrial';
    if (['park', 'garden', 'nature_reserve'].includes(tags.leisure)) return 'park';
    if (tags.natural || tags.waterway) return 'natural_feature';
    if (tags.highway) return 'road';
    if (tags.historic) return 'historic';
    if (/fitness|gym/i.test(featureLabel)) return 'fitness';
    if (/sport|stadium|recreation/i.test(featureLabel)) return 'sports';
    if (/park|garden|green space/i.test(featureLabel)) return 'park';
    return 'other';
  }

  function serializeElement(element) {
    const tags = element.tags || {};
    const lat = Number(element.lat ?? element.center?.lat);
    const lng = Number(element.lon ?? element.center?.lon);
    const name = String(tags.name || tags.brand || tags.operator || '').trim();
    const featureLabel = featureLabelFrom(tags);
    const sourceTags = Object.fromEntries(Object.entries(tags).filter(([key]) => [
      'amenity', 'shop', 'tourism', 'historic', 'leisure', 'sport', 'healthcare', 'natural', 'waterway',
      'highway', 'railway', 'public_transport', 'place', 'boundary', 'aeroway', 'office', 'craft',
      'landuse', 'power', 'man_made', 'military', 'building', 'operator', 'brand'
    ].includes(key)));
    return {
      osmType: element.type,
      osmId: String(element.id),
      name, lat, lng, featureLabel, sourceTags,
      address: [
        tags['addr:full'],
        [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' '),
        tags['addr:city'] || tags['addr:town'] || tags['addr:village'],
        tags['addr:state'], tags['addr:postcode']
      ].filter(Boolean).join(', ')
    };
  }

  function distanceMeters(center, location) {
    if (state.map?.distance) return state.map.distance(center, [location.lat, location.lng]);
    const radians = value => value * Math.PI / 180;
    const latitude = radians(location.lat - center.lat);
    const longitude = radians(location.lng - center.lng);
    const a = Math.sin(latitude / 2) ** 2
      + Math.cos(radians(center.lat)) * Math.cos(radians(location.lat)) * Math.sin(longitude / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function normalizeLocations(elements) {
    const center = state.map?.getCenter?.() || state.lastCenter || { lat: 0, lng: 0 };
    const unique = new Map();
    for (const element of elements) {
      const location = serializeElement(element);
      if (!location.name || !Number.isFinite(location.lat) || !Number.isFinite(location.lng)) continue;
      const key = `${location.osmType}/${location.osmId}`;
      if (unique.has(key)) continue;
      location.distance = distanceMeters(center, location);
      location.category = detectCategory(location.sourceTags, location.featureLabel);
      location.categoryLabel = BUSINESS_TYPES[location.category] || BUSINESS_TYPES.other;
      location.googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;
      unique.set(key, location);
    }
    return [...unique.values()]
      .sort((left, right) => left.distance - right.distance || left.name.localeCompare(right.name))
      .slice(0, MAX_VISIBLE);
  }

  function interpretationFor(status) {
    if (status === 'MUNDANE') return {
      registry: 'No supernatural inventory entry', confidence: 'No credible evidence',
      catalogueNote: 'This location is not present in any known supernatural inventory.'
    };
    if (status === 'TANGENTIAL') return {
      registry: 'Peripheral association — not inventoried', confidence: 'Weak, indirect, or historical evidence',
      catalogueNote: 'Referenced only through rumor, route adjacency, witness testimony, or residual resonance.'
    };
    if (status === 'ACTIVE_UNREGISTERED') return {
      registry: 'Active supernatural site — unregistered', confidence: 'Active evidence without formal ownership record',
      catalogueNote: 'Known to some operators but absent from formal faction inventories.'
    };
    return {
      registry: 'Formal supernatural inventory entry', confidence: 'Formally catalogued',
      catalogueNote: 'Recorded, monitored, claimed, or administratively recognized by supernatural actors.'
    };
  }

  function enrichLocation(location) {
    if (!window.WODDetailDiversityCore || !state.diversitySession) throw new Error('The detail diversity engine is unavailable.');
    const canonical = [normalize(location.name), normalize(location.address), location.lat.toFixed(6), location.lng.toFixed(6)].join('|');
    const entryKey = `gmaps-${murmurHash3(canonical, 0x1f123bb5).toString(16).padStart(8, '0')}`;
    const spatialToken = `${entryKey}|${location.lat.toFixed(6)}|${location.lng.toFixed(6)}`;
    const seed = murmurHash3(spatialToken, 0x9747b28c);
    const central = state.centralRegistry.entries?.[entryKey] || null;
    const local = readStorage(`${STORAGE.localPrefix}${entryKey}`, null);
    const override = local || central;
    const claimStatus = override?.veil_interaction || 'STANDARD_UNCLAIMED';
    const line = document.getElementById('wod-spatial-line')?.value || 'unified';
    let inventoryStatus = central?.inventory_status || window.WODDetailDiversityCore.inventoryStatusFromSeed(seed);
    if (claimStatus === 'OPT_OUT') inventoryStatus = 'MUNDANE';
    if (central && claimStatus !== 'OPT_OUT') inventoryStatus = 'INVENTORIED';
    const enrichedLocation = { ...location, entryKey };
    const detail = state.diversitySession.generate({
      location: enrichedLocation,
      line,
      inventoryStatus,
      seed,
      baseLocations: state.core.baseLocations,
      contextExpansion: state.core.contextExpansion
    });
    const interpretation = interpretationFor(inventoryStatus);
    const lore = override?.submitted_lore || {};
    return {
      ...location,
      entryKey,
      spatialToken,
      seed32: seed,
      inventoryStatus,
      inventoryLabel: INVENTORY_LABELS[inventoryStatus],
      gothicRegistry: interpretation.registry,
      hiddenFunction: lore.hiddenFunction || detail.hiddenFunction,
      publicFacade: lore.publicFacade || detail.publicFacade,
      confidence: interpretation.confidence,
      catalogueNote: interpretation.catalogueNote,
      contextTitle: detail.contextTitle,
      contextEffect: detail.contextEffect,
      mechanicalSeed: detail.mechanicalSeed,
      embeddedCharacter: detail.embeddedCharacter,
      temporalAnchor: detail.temporalAnchor,
      traumaticCatalyst: detail.traumaticCatalyst,
      operationalSecret: detail.operationalSecret,
      vulnerability: detail.vulnerability,
      sensoryAnchor: detail.sensoryAnchor,
      mediaFeed: detail.mediaFeed,
      rumor: inventoryStatus === 'MUNDANE' ? `Neighborhood rumor only: ${detail.rumor}` : detail.rumor,
      locationVariant: detail.variant,
      effectiveVariantCount: detail.effectiveVariantCount,
      regionalTheme: detail.regionalTheme,
      diversitySignature: detail.diversitySignature,
      claimStatus,
      central: Boolean(central),
      optOut: claimStatus === 'OPT_OUT'
    };
  }

  function injectStyles() {
    if (document.getElementById('wod-radial-location-style')) return;
    const style = document.createElement('style');
    style.id = 'wod-radial-location-style';
    style.textContent = `
      .wod-radial-progress{display:grid;gap:7px;padding:9px;border:1px solid var(--line);border-radius:9px;background:#0d1016}
      .wod-radial-progress progress,.wod-radial-card progress{width:100%;height:9px;accent-color:var(--accent)}
      .wod-radial-progress-row{display:flex;justify-content:space-between;gap:8px;color:var(--muted);font-size:.75rem}
      .wod-radial-card{width:100%;text-align:left;border:1px solid var(--line);border-left:4px solid #555;border-radius:10px;padding:9px;background:#151820;color:var(--ink)}
      .wod-radial-card h4{margin:0 0 4px}.wod-radial-card p{margin:4px 0;font-size:.77rem;line-height:1.35}
      .wod-radial-card.ready{cursor:pointer}.wod-radial-card.ready:hover,.wod-radial-card.active{border-color:var(--accent);background:#1d2029}
      .wod-radial-card.tangential{border-left-color:#b78a37}.wod-radial-card.active-unregistered{border-left-color:#774aa8}.wod-radial-card.inventoried{border-left-color:#8b0000}
      .wod-radial-state{color:var(--muted);font-size:.7rem}.wod-radial-distance{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--accent)}
    `;
    document.head.appendChild(style);
  }

  function installProgressPanel() {
    const toolbar = document.querySelector('#wod-spatial-engine .wod-inventory-toolbar');
    if (!toolbar || document.getElementById('wod-radial-progress')) return false;
    injectStyles();
    const panel = document.createElement('div');
    panel.id = 'wod-radial-progress';
    panel.className = 'wod-radial-progress';
    panel.innerHTML = `
      <div class="wod-radial-progress-row"><strong>Radial Chronicle loading</strong><span id="wod-radial-count">0 / 0</span></div>
      <progress id="wod-radial-overall" max="100" value="0"></progress>
      <div id="wod-radial-message" class="wod-radial-state">Move the map freely. No location records load until you scan.</div>`;
    toolbar.appendChild(panel);
    return true;
  }

  function updateOverall(message, percent, completed = null, total = null) {
    const progress = document.getElementById('wod-radial-overall');
    const text = document.getElementById('wod-radial-message');
    const count = document.getElementById('wod-radial-count');
    if (progress && Number.isFinite(percent)) progress.value = Math.max(0, Math.min(100, percent));
    if (text && message) text.textContent = message;
    if (count && completed != null && total != null) count.textContent = `${completed} / ${total}`;
  }

  function inventoryClass(status) {
    return status === 'TANGENTIAL' ? 'tangential'
      : status === 'ACTIVE_UNREGISTERED' ? 'active-unregistered'
        : status === 'INVENTORIED' ? 'inventoried' : 'mundane';
  }

  function placeholderKey(location) {
    return `wod-radial-${location.osmType}-${location.osmId}`.replace(/[^a-zA-Z0-9_-]/g, '-');
  }

  function renderPlaceholders(locations) {
    const list = document.getElementById('wod-visible-business-list');
    if (!list) return;
    list.innerHTML = '';
    const fragment = document.createDocumentFragment();
    for (const location of locations) {
      const card = document.createElement('article');
      card.id = placeholderKey(location);
      card.className = 'wod-radial-card';
      card.dataset.radialOsmKey = `${location.osmType}/${location.osmId}`;
      card.innerHTML = `
        <h4>${escapeHtml(location.name)}</h4>
        <p>${escapeHtml(location.featureLabel)} · <span class="wod-radial-distance">${Math.round(location.distance)} m from center</span></p>
        <progress max="100" value="0"></progress>
        <p class="wod-radial-state">Waiting in radial queue…</p>`;
      fragment.appendChild(card);
    }
    list.appendChild(fragment);
  }

  function updatePlaceholder(location, percent, message) {
    const card = document.getElementById(placeholderKey(location));
    if (!card) return;
    const progress = card.querySelector('progress');
    const stateText = card.querySelector('.wod-radial-state');
    if (progress) progress.value = percent;
    if (stateText) stateText.textContent = message;
  }

  function renderReadyCard(record) {
    const card = document.getElementById(placeholderKey(record));
    if (!card) return;
    card.className = `wod-radial-card ready ${inventoryClass(record.inventoryStatus)}`;
    card.innerHTML = `
      <h4>${escapeHtml(record.name)}</h4>
      <p>${escapeHtml(record.address || `${record.lat.toFixed(5)}, ${record.lng.toFixed(5)}`)}</p>
      <div class="wod-inventory-pills">
        <span class="wod-inventory-pill">${escapeHtml(record.featureLabel)}</span>
        <span class="wod-inventory-pill">${escapeHtml(record.categoryLabel)}</span>
        <span class="wod-inventory-pill">${escapeHtml(record.inventoryLabel)}</span>
        <span class="wod-inventory-pill">${escapeHtml(record.regionalTheme.label)}</span>
        <span class="wod-inventory-pill">Variant ${record.locationVariant}/${record.effectiveVariantCount}</span>
      </div>
      <p><strong>${escapeHtml(record.gothicRegistry)}</strong></p>
      <p class="wod-inventory-preview">${escapeHtml(record.hiddenFunction.length > 200 ? `${record.hiddenFunction.slice(0, 199)}…` : record.hiddenFunction)}</p>
      <p><span class="wod-radial-distance">${Math.round(record.distance)} m from center</span></p>`;
    card.addEventListener('click', () => selectRecord(record));
  }

  function addMarker(record, index) {
    if (!state.map || !window.L) return;
    state.markerLayer ||= window.L.layerGroup().addTo(state.map);
    const icon = window.L.divIcon({
      className: '',
      html: `<div class="wod-inventory-marker ${inventoryClass(record.inventoryStatus)}">${index + 1}</div>`,
      iconSize: [27, 27], iconAnchor: [13, 13]
    });
    const marker = window.L.marker([record.lat, record.lng], { icon, title: record.name })
      .bindPopup(`<strong>${escapeHtml(record.name)}</strong><br>${escapeHtml(record.inventoryLabel)}<br><small>${escapeHtml(record.regionalTheme.label)}</small>`);
    marker.on('click', () => selectRecord(record, false));
    marker.addTo(state.markerLayer);
    record.marker = marker;
  }

  function populateManualFields(record) {
    const values = {
      'wod-business-name': record.name,
      'wod-business-address': record.address,
      'wod-business-url': record.googleMapsUrl,
      'wod-business-lat': record.lat.toFixed(6),
      'wod-business-lng': record.lng.toFixed(6)
    };
    for (const [id, value] of Object.entries(values)) {
      const element = document.getElementById(id);
      if (element) element.value = value;
    }
    const select = document.getElementById('wod-business-type');
    if (select) {
      if (![...select.options].some(option => option.value === record.category)) select.add(new Option(record.categoryLabel, record.category));
      select.value = record.category;
    }
  }

  function field(label, value) {
    return `<div class="wod-inventory-field"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`;
  }

  function selectRecord(record, move = true) {
    document.querySelectorAll('.wod-radial-card.active').forEach(card => card.classList.remove('active'));
    document.getElementById(placeholderKey(record))?.classList.add('active');
    if (move && state.map) state.map.setView([record.lat, record.lng], Math.max(state.map.getZoom(), 17));
    record.marker?.openPopup();
    populateManualFields(record);
    const matrix = document.getElementById('wod-display-matrix');
    if (!matrix) return;
    const fields = [
      ['Supernatural inventory status', record.inventoryLabel],
      ['Regional theme', `${record.regionalTheme.label}: ${record.regionalTheme.description}`],
      ['Evidence confidence', record.confidence],
      ['Catalogue note', record.catalogueNote],
      ['Public facade', record.publicFacade],
      ['Hidden function or lack thereof', record.hiddenFunction],
      ['Current context', `${record.contextTitle}: ${record.contextEffect}`],
      ['Mechanical seed', record.mechanicalSeed],
      ['Associated character', record.embeddedCharacter],
      ['Temporal anchor', record.temporalAnchor],
      ['Traumatic catalyst', record.traumaticCatalyst],
      ['Operational secret', record.operationalSecret],
      ['Vulnerability', record.vulnerability],
      ['Sensory anchor', record.sensoryAnchor],
      ['Media feed', record.mediaFeed],
      ['Street rumor', record.rumor]
    ];
    matrix.innerHTML = `
      <section class="wod-inventory-card ${inventoryClass(record.inventoryStatus)}">
        <p class="eyebrow">Selected named location</p><h3>${escapeHtml(record.name)}</h3>
        <p>${escapeHtml(record.address || `${record.lat}, ${record.lng}`)}</p>
        <p><strong>${escapeHtml(record.gothicRegistry)}</strong></p>
        <div class="wod-inventory-grid">${fields.map(([label, value]) => field(label, value)).join('')}</div>
        <p><strong>Chronicle key:</strong> <span class="wod-inventory-token">${record.entryKey}</span></p>
        <p><strong>Diversity signature:</strong> <span class="wod-inventory-token">${record.diversitySignature}</span></p>
        <a class="primary-action" target="_blank" rel="noopener" href="${escapeHtml(record.googleMapsUrl)}">Open in Google Maps</a>
      </section>`;
    document.dispatchEvent(new CustomEvent('wod:radial-location-selected', {
      detail: { record: JSON.parse(JSON.stringify({ ...record, marker: undefined })) }
    }));
  }

  function currentFilters(record) {
    const query = normalize(document.getElementById('wod-visible-business-search')?.value);
    const type = document.getElementById('wod-visible-business-type')?.value || 'all';
    const status = document.getElementById('wod-visible-inventory-status')?.value || 'all';
    if (type !== 'all' && record.category !== type) return false;
    if (status !== 'all' && record.inventoryStatus !== status) return false;
    if (!query) return true;
    return [record.name, record.address, record.featureLabel, record.categoryLabel, record.inventoryLabel,
      record.gothicRegistry, record.regionalTheme.label, record.hiddenFunction, record.sensoryAnchor, record.rumor]
      .some(value => normalize(value).includes(query));
  }

  function applyFilters() {
    for (const record of state.records) {
      const card = document.getElementById(placeholderKey(record));
      if (card) card.hidden = !currentFilters(record);
      if (!record.marker || !state.markerLayer) continue;
      if (currentFilters(record)) {
        if (!state.markerLayer.hasLayer(record.marker)) state.markerLayer.addLayer(record.marker);
      } else if (state.markerLayer.hasLayer(record.marker)) state.markerLayer.removeLayer(record.marker);
    }
  }

  function updateTypeFilter(locations) {
    const select = document.getElementById('wod-visible-business-type');
    if (!select) return;
    const previous = select.value;
    const types = [...new Set(locations.map(location => location.category))].sort();
    select.innerHTML = '<option value="all">All visible types</option>'
      + types.map(type => `<option value="${escapeHtml(type)}">${escapeHtml(BUSINESS_TYPES[type] || type)}</option>`).join('');
    select.value = types.includes(previous) ? previous : 'all';
  }

  function cancelQueue(message = 'Map moved. The previous radial queue was cancelled.') {
    if (!state.running) return;
    state.queueToken += 1;
    state.running = false;
    updateOverall(message, 0, 0, state.rawLocations.length);
    document.dispatchEvent(new CustomEvent('wod:radial-load-cancelled'));
  }

  async function beginFromElements(elements) {
    if (!state.map) state.map = window.WODNamedLocationBridge?.getMap?.() || window.WODChronicleSpatialMap || null;
    if (!state.map) return;
    cancelQueue('A new scan replaced the previous radial queue.');
    const token = ++state.queueToken;
    state.running = true;
    state.lastCenter = state.map.getCenter();
    state.rawLocations = normalizeLocations(elements);
    state.records = [];
    state.recordByKey.clear();
    state.markerLayer?.clearLayers();
    renderPlaceholders(state.rawLocations);
    updateTypeFilter(state.rawLocations);
    updateOverall(`Discovered ${state.rawLocations.length} named locations. Loading nearest first…`, 0, 0, state.rawLocations.length);
    document.dispatchEvent(new CustomEvent('wod:radial-load-started', {
      detail: { total: state.rawLocations.length, center: { lat: state.lastCenter.lat, lng: state.lastCenter.lng } }
    }));

    if (!state.rawLocations.length) {
      state.running = false;
      updateOverall('No named locations were returned for this viewport.', 100, 0, 0);
      document.dispatchEvent(new CustomEvent('wod:radial-load-complete', { detail: { total: 0, records: [] } }));
      return;
    }

    try {
      await loadCoreData();
      state.diversitySession = window.WODDetailDiversityCore.createSession(state.core.detailDiversity);
      for (let index = 0; index < state.rawLocations.length; index += 1) {
        if (token !== state.queueToken) return;
        const location = state.rawLocations[index];
        updatePlaceholder(location, 15, 'Reading mapped identity…');
        await nextPaint();
        if (token !== state.queueToken) return;
        updatePlaceholder(location, 40, 'Checking saved Chronicle information…');
        await wait(STEP_DELAY_MS);
        if (token !== state.queueToken) return;
        updatePlaceholder(location, 65, 'Selecting unused neighborhood details…');
        await nextPaint();
        if (token !== state.queueToken) return;
        updatePlaceholder(location, 85, 'Composing setting-aware Chronicle record…');
        const record = enrichLocation(location);
        state.records.push(record);
        state.recordByKey.set(record.entryKey, record);
        renderReadyCard(record);
        addMarker(record, index);
        const completed = index + 1;
        updateOverall(`Loaded ${record.name}. Continuing outward without repeating nearby detail bundles…`, completed / state.rawLocations.length * 100, completed, state.rawLocations.length);
        document.dispatchEvent(new CustomEvent('wod:radial-location-ready', {
          detail: { index, completed, total: state.rawLocations.length, record: JSON.parse(JSON.stringify({ ...record, marker: undefined })) }
        }));
        if (completed === 1) document.dispatchEvent(new CustomEvent('wod:radial-first-location-ready', { detail: { record } }));
        await nextPaint();
        await wait(STEP_DELAY_MS);
      }
      if (token !== state.queueToken) return;
      state.running = false;
      updateOverall(`Loaded ${state.records.length} locations with shared regional themes and diversified local details.`, 100, state.records.length, state.rawLocations.length);
      document.dispatchEvent(new CustomEvent('wod:radial-load-complete', {
        detail: { total: state.records.length, records: state.records.map(record => JSON.parse(JSON.stringify({ ...record, marker: undefined }))) }
      }));
    } catch (error) {
      if (token !== state.queueToken) return;
      state.running = false;
      updateOverall(`Radial Chronicle loading failed: ${error.message}`, 0, state.records.length, state.rawLocations.length);
    }
  }

  function bindControls() {
    const map = state.map;
    if (map && !map.__wodRadialBound) {
      map.__wodRadialBound = true;
      map.on('movestart zoomstart', () => cancelQueue('Map moved. Press Discover Named Locations to start again from the new center.'));
    }
    const search = document.getElementById('wod-visible-business-search');
    const type = document.getElementById('wod-visible-business-type');
    const status = document.getElementById('wod-visible-inventory-status');
    const line = document.getElementById('wod-spatial-line');
    search?.addEventListener('input', event => { event.stopImmediatePropagation(); applyFilters(); }, true);
    type?.addEventListener('change', event => { event.stopImmediatePropagation(); applyFilters(); }, true);
    status?.addEventListener('change', event => { event.stopImmediatePropagation(); applyFilters(); }, true);
    line?.addEventListener('change', event => {
      event.stopImmediatePropagation();
      if (state.rawLocations.length) void beginFromElements(state.rawLocations.map(location => ({
        type: location.osmType, id: location.osmId, lat: location.lat, lon: location.lng,
        tags: { ...location.sourceTags, name: location.name, wod_named_feature_label: location.featureLabel, 'addr:full': location.address }
      })));
    }, true);
  }

  async function install() {
    if (state.installed) return;
    state.installed = true;
    interceptOverpass();
    for (let attempt = 0; attempt < 240; attempt += 1) {
      state.map = window.WODNamedLocationBridge?.getMap?.() || window.WODChronicleSpatialMap || null;
      if (state.map && installProgressPanel()) {
        bindControls();
        updateOverall('Map ready. Move anywhere, then discover named locations. Nearby details will be diversified automatically.', 0, 0, 0);
        return;
      }
      await wait(50);
    }
  }

  document.addEventListener('wod:spatial-map-ready', event => {
    state.map = event.detail?.map || state.map;
    if (installProgressPanel()) bindControls();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else void install();

  window.WODRadialLocationLoader = Object.freeze({
    beginFromElements,
    cancelQueue,
    getRecords: () => state.records.slice(),
    getQueueState: () => ({ running: state.running, total: state.rawLocations.length, completed: state.records.length })
  });
})();
