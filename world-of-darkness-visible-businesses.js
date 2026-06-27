(() => {
  'use strict';

  const LEAFLET_VERSION = '1.9.4';
  const LEAFLET_JS = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;
  const LEAFLET_CSS = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
  const OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];
  const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
  const STORAGE = {
    view: 'hb-wod-osm-map-view-v1',
    geocodeCache: 'hb-wod-osm-geocode-cache-v1',
    businessCache: 'hb-wod-osm-business-cache-v1'
  };
  const DEFAULT_VIEW = { lat: 47.6016, lng: -122.3334, zoom: 15 };
  const MAX_VISIBLE_RESULTS = 120;
  const MIN_SCAN_ZOOM = 14;
  const CACHE_TTL_MS = 5 * 60 * 1000;

  const state = {
    installed: false,
    map: null,
    markerLayer: null,
    businesses: [],
    core: null,
    centralRegistry: { entries: {} },
    selectedKey: '',
    scanTimer: 0,
    scanSequence: 0,
    activeController: null,
    lastGeocodeAt: 0
  };

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  const normalize = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const delay = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds));

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

  function rotateRight(value, amount) {
    return ((value >>> amount) | (value << (32 - amount))) >>> 0;
  }

  function safeJsonRead(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch (_) {
      return fallback;
    }
  }

  function safeJsonWrite(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {
      // Storage exhaustion should not prevent map use.
    }
  }

  function loadJson(url) {
    return fetch(url, { cache: 'no-store' }).then(response => {
      if (!response.ok) throw new Error(`${url} returned ${response.status}`);
      return response.json();
    });
  }

  function expandCore(document, prefix) {
    if (Array.isArray(document.entries)) return document.entries;
    const prototypes = document.prototypes || [];
    const pressures = document.pressureVariants || [];
    return prototypes.flatMap((prototype, prototypeIndex) => pressures.map((pressure, pressureIndex) => ({
      ...prototype,
      id: `${prefix}-${String(prototypeIndex + 1).padStart(2, '0')}-${String(pressureIndex + 1).padStart(2, '0')}`,
      variant: prototypeIndex * pressures.length + pressureIndex + 1,
      sourcePrototype: prototypeIndex + 1,
      pressureVariant: pressureIndex + 1,
      pressure
    })));
  }

  async function loadCoreData() {
    const config = await loadJson('data/world-of-darkness/spatial-engine-config.json');
    const [locations, characters, rumors, registry] = await Promise.all([
      loadJson(config.coreData.locations),
      loadJson(config.coreData.characters),
      loadJson(config.coreData.rumors),
      loadJson(config.coreData.centralRegistry)
    ]);
    state.core = {
      config,
      locations: expandCore(locations, 'location'),
      characters: expandCore(characters, 'character'),
      rumors: expandCore(rumors, 'rumor')
    };
    state.centralRegistry = registry || { entries: {} };
  }

  function loadLeaflet() {
    if (window.L?.map) return Promise.resolve(window.L);
    return new Promise((resolve, reject) => {
      if (!document.querySelector('link[data-wod-leaflet]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = LEAFLET_CSS;
        link.dataset.wodLeaflet = 'true';
        document.head.appendChild(link);
      }

      const existing = document.querySelector('script[data-wod-leaflet]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.L), { once: true });
        existing.addEventListener('error', () => reject(new Error('Leaflet failed to load.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = LEAFLET_JS;
      script.async = true;
      script.dataset.wodLeaflet = 'true';
      script.addEventListener('load', () => resolve(window.L), { once: true });
      script.addEventListener('error', () => reject(new Error('Leaflet failed to load.')), { once: true });
      document.head.appendChild(script);
    });
  }

  function injectStyles() {
    if (document.getElementById('wod-visible-business-style')) return;
    const style = document.createElement('style');
    style.id = 'wod-visible-business-style';
    style.textContent = `
      #wod-spatial-engine .wod-spatial-layout.wod-three-pane-layout{
        grid-template-columns:minmax(330px,400px) minmax(480px,1fr) minmax(330px,390px);
      }
      #wod-google-map-frame{display:none!important}
      .wod-osm-map{width:100%;height:100%;min-height:650px;background:#15181e;z-index:0}
      .wod-business-panel{padding:14px;overflow:auto;max-height:840px;border-left:1px solid var(--line);background:#101218}
      .wod-business-panel h3{margin:.2rem 0 .5rem}
      .wod-business-toolbar{display:grid;gap:8px;margin:12px 0}
      .wod-business-toolbar input,.wod-business-toolbar select{width:100%;box-sizing:border-box;background:#11151d;border:1px solid var(--line);color:var(--ink);border-radius:9px;padding:9px}
      .wod-business-toolbar-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}
      .wod-auto-scan{display:flex;align-items:center;gap:7px;color:var(--muted);font-size:.82rem}
      .wod-auto-scan input{width:auto}
      .wod-business-status{padding:9px;border:1px solid var(--line);border-radius:9px;color:var(--muted);font-size:.8rem;background:#0d1016}
      .wod-business-status.error{border-color:#8b0000;color:#ffb3b3}
      .wod-business-list{display:grid;gap:8px;margin-top:10px}
      .wod-business-card{width:100%;text-align:left;border:1px solid var(--line);border-left:4px solid #8b0000;border-radius:11px;padding:10px;background:#151820;color:var(--ink);cursor:pointer}
      .wod-business-card:hover,.wod-business-card.active{border-color:var(--accent);background:#1d2029}
      .wod-business-card.supportive{border-left-color:#00c7a5}
      .wod-business-card.opt-out{border-left-color:#777;filter:saturate(.55)}
      .wod-business-card h4{margin:0 0 4px;font-size:.96rem}
      .wod-business-meta{display:flex;flex-wrap:wrap;gap:5px;margin:6px 0}
      .wod-business-pill{border:1px solid var(--line);border-radius:999px;padding:2px 7px;font-size:.68rem;color:var(--muted)}
      .wod-business-card p{margin:5px 0;font-size:.78rem;line-height:1.35}
      .wod-business-card .wod-hidden-preview{color:#d5c09a}
      .wod-business-count{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--accent);font-size:.8rem}
      .wod-osm-marker{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;border:2px solid #fff;background:#8b0000;color:#fff;font-size:12px;font-weight:900;box-shadow:0 2px 9px #000}
      .wod-osm-marker.supportive{background:#00a98f}
      .wod-osm-marker.opt-out{background:#666}
      .leaflet-popup-content-wrapper,.leaflet-popup-tip{background:#151820;color:#eee}
      .leaflet-container a{color:#c9913c}
      @media(max-width:1450px){
        #wod-spatial-engine .wod-spatial-layout.wod-three-pane-layout{grid-template-columns:minmax(320px,390px) minmax(480px,1fr)}
        .wod-business-panel{grid-column:1/-1;max-height:520px;border-left:0;border-top:1px solid var(--line)}
        .wod-business-list{grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}
      }
      @media(max-width:980px){
        #wod-spatial-engine .wod-spatial-layout.wod-three-pane-layout{grid-template-columns:1fr}
        .wod-business-panel{grid-column:auto;max-height:none}
        .wod-osm-map{min-height:520px}
      }
    `;
    document.head.appendChild(style);
  }

  function buildPanel() {
    const layout = document.querySelector('#wod-spatial-engine .wod-spatial-layout');
    const mapShell = document.querySelector('#wod-spatial-engine .wod-map-shell');
    const oldFrame = document.getElementById('wod-google-map-frame');
    if (!layout || !mapShell || !oldFrame) return false;
    if (document.getElementById('wod-visible-businesses')) return true;

    injectStyles();
    layout.classList.add('wod-three-pane-layout');
    oldFrame.hidden = true;

    const mapElement = document.createElement('div');
    mapElement.id = 'wod-osm-map';
    mapElement.className = 'wod-osm-map';
    mapElement.setAttribute('aria-label', 'Interactive OpenStreetMap business extraction viewport');
    oldFrame.insertAdjacentElement('beforebegin', mapElement);

    const footer = mapShell.querySelector('.wod-map-footer span');
    if (footer) {
      footer.innerHTML = 'OpenStreetMap viewport extraction is active. Move or zoom the map to refresh named businesses from the visible bounds. Map data © OpenStreetMap contributors.';
    }

    const panel = document.createElement('aside');
    panel.id = 'wod-visible-businesses';
    panel.className = 'wod-business-panel';
    panel.setAttribute('aria-labelledby', 'wod-visible-business-title');
    panel.innerHTML = `
      <p class="eyebrow">Milestone: visible-place extraction</p>
      <h3 id="wod-visible-business-title">Businesses in Current Map View</h3>
      <p class="wod-note">Every named point of interest found inside the visible map bounds receives a stable Chronicle key and a World of Darkness preview. Select a card or marker to open the full record in the left panel.</p>
      <div class="wod-business-toolbar">
        <div class="wod-business-toolbar-row">
          <button id="wod-scan-visible-businesses" class="primary-action">Scan Visible Area</button>
          <label class="wod-auto-scan"><input id="wod-auto-scan-businesses" type="checkbox" checked /> Auto-scan</label>
        </div>
        <input id="wod-visible-business-search" type="search" placeholder="Filter visible businesses…" />
        <select id="wod-visible-business-type">
          <option value="all">All visible types</option>
        </select>
      </div>
      <div id="wod-visible-business-status" class="wod-business-status" aria-live="polite">Initializing extractable map…</div>
      <p id="wod-visible-business-count" class="wod-business-count"></p>
      <div id="wod-visible-business-list" class="wod-business-list"></div>`;
    layout.appendChild(panel);

    document.getElementById('wod-scan-visible-businesses').addEventListener('click', () => scanVisibleBusinesses({ force: true }));
    document.getElementById('wod-visible-business-search').addEventListener('input', renderBusinesses);
    document.getElementById('wod-visible-business-type').addEventListener('change', renderBusinesses);
    document.getElementById('wod-spatial-line')?.addEventListener('change', () => {
      enrichBusinesses();
      renderBusinesses();
    });
    return true;
  }

  function readStoredView() {
    const view = safeJsonRead(STORAGE.view, DEFAULT_VIEW);
    if (!Number.isFinite(view?.lat) || !Number.isFinite(view?.lng) || !Number.isFinite(view?.zoom)) return DEFAULT_VIEW;
    return view;
  }

  async function initializeMap() {
    const L = await loadLeaflet();
    const view = readStoredView();
    state.map = L.map('wod-osm-map', {
      zoomControl: true,
      preferCanvas: true
    }).setView([view.lat, view.lng], view.zoom);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(state.map);

    state.markerLayer = L.layerGroup().addTo(state.map);
    state.map.on('moveend zoomend', () => {
      const center = state.map.getCenter();
      safeJsonWrite(STORAGE.view, { lat: center.lat, lng: center.lng, zoom: state.map.getZoom() });
      if (document.getElementById('wod-auto-scan-businesses')?.checked) scheduleScan();
    });

    bindExistingMapControls();
    setBusinessStatus('Map initialized. Scanning named businesses in the visible area…');
    await positionFromExistingQuery();
    scheduleScan(100);
  }

  function bindExistingMapControls() {
    const moveButton = document.getElementById('wod-move-map');
    const queryInput = document.getElementById('wod-map-query');
    const browserLocation = document.getElementById('wod-use-browser-location');

    moveButton?.addEventListener('click', () => geocodeAndMove(queryInput?.value || ''));
    queryInput?.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        void geocodeAndMove(queryInput.value);
      }
    });
    browserLocation?.addEventListener('click', () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(position => {
        state.map.setView([position.coords.latitude, position.coords.longitude], 16);
      }, () => {}, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
    });
  }

  async function positionFromExistingQuery() {
    const query = document.getElementById('wod-map-query')?.value.trim();
    if (!query) return;
    const coordinateMatch = query.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (coordinateMatch) {
      state.map.setView([Number(coordinateMatch[1]), Number(coordinateMatch[2])], 16);
      return;
    }
    await geocodeAndMove(query, { silentFailure: true });
  }

  async function geocodeAndMove(query, options = {}) {
    const normalizedQuery = String(query || '').trim();
    if (!normalizedQuery || !state.map) return;
    const coordinateMatch = normalizedQuery.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (coordinateMatch) {
      state.map.setView([Number(coordinateMatch[1]), Number(coordinateMatch[2])], 16);
      return;
    }

    const cache = safeJsonRead(STORAGE.geocodeCache, {});
    const cacheKey = normalize(normalizedQuery);
    const cached = cache[cacheKey];
    if (cached && Date.now() - cached.storedAt < 30 * 24 * 60 * 60 * 1000) {
      state.map.setView([cached.lat, cached.lng], cached.zoom || 16);
      return;
    }

    const wait = Math.max(0, 1000 - (Date.now() - state.lastGeocodeAt));
    if (wait) await delay(wait);
    state.lastGeocodeAt = Date.now();
    setBusinessStatus(`Locating “${normalizedQuery}” with OpenStreetMap search…`);

    try {
      const params = new URLSearchParams({
        format: 'jsonv2',
        limit: '1',
        addressdetails: '1',
        q: normalizedQuery
      });
      const response = await fetch(`${NOMINATIM_ENDPOINT}?${params}`, {
        headers: { Accept: 'application/json', 'Accept-Language': 'en' }
      });
      if (!response.ok) throw new Error(`geocoder returned ${response.status}`);
      const results = await response.json();
      if (!results.length) throw new Error('no matching location was found');
      const result = results[0];
      const lat = Number(result.lat);
      const lng = Number(result.lon);
      cache[cacheKey] = { lat, lng, zoom: 16, storedAt: Date.now(), displayName: result.display_name };
      safeJsonWrite(STORAGE.geocodeCache, cache);
      state.map.setView([lat, lng], 16);
      setBusinessStatus(`Map moved to ${result.display_name}. Visible businesses will refresh automatically.`);
    } catch (error) {
      if (!options.silentFailure) setBusinessStatus(`Location search failed: ${error.message}. Move the map manually or use browser location.`, true);
    }
  }

  function scheduleScan(delayMs = 900) {
    window.clearTimeout(state.scanTimer);
    state.scanTimer = window.setTimeout(() => scanVisibleBusinesses(), delayMs);
  }

  function scanCacheKey(bounds, zoom) {
    return [
      zoom,
      bounds.getSouth().toFixed(3),
      bounds.getWest().toFixed(3),
      bounds.getNorth().toFixed(3),
      bounds.getEast().toFixed(3)
    ].join(':');
  }

  function buildOverpassQuery(bounds) {
    const bbox = [bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast()]
      .map(value => value.toFixed(6))
      .join(',');
    return `[out:json][timeout:25];
(
  nwr["name"]["amenity"](${bbox});
  nwr["name"]["shop"](${bbox});
  nwr["name"]["tourism"](${bbox});
  nwr["name"]["office"](${bbox});
  nwr["name"]["craft"](${bbox});
  nwr["name"]["leisure"](${bbox});
  nwr["name"]["healthcare"](${bbox});
);
out center tags qt;`;
  }

  async function scanVisibleBusinesses(options = {}) {
    if (!state.map || !state.core) return;
    const zoom = state.map.getZoom();
    const bounds = state.map.getBounds();
    if (zoom < MIN_SCAN_ZOOM) {
      state.businesses = [];
      renderBusinesses();
      setBusinessStatus(`Zoom to level ${MIN_SCAN_ZOOM} or closer before extracting businesses. Current zoom: ${zoom}.`);
      return;
    }

    const latSpan = bounds.getNorth() - bounds.getSouth();
    const lngSpan = bounds.getEast() - bounds.getWest();
    if (latSpan > 0.18 || lngSpan > 0.28) {
      setBusinessStatus('The visible area is too large for a responsible business scan. Zoom in and try again.');
      return;
    }

    const cache = safeJsonRead(STORAGE.businessCache, {});
    const cacheKey = scanCacheKey(bounds, zoom);
    const cached = cache[cacheKey];
    if (!options.force && cached && Date.now() - cached.storedAt < CACHE_TTL_MS) {
      state.businesses = cached.businesses;
      enrichBusinesses();
      updateTypeFilter();
      renderBusinesses();
      setBusinessStatus(`Loaded ${state.businesses.length} visible businesses from the five-minute viewport cache.`);
      return;
    }

    const sequence = ++state.scanSequence;
    state.activeController?.abort();
    setBusinessStatus('Extracting named businesses and civic points from the visible OpenStreetMap bounds…');
    const query = buildOverpassQuery(bounds);
    let payload = null;
    let lastError = null;

    for (const endpoint of OVERPASS_ENDPOINTS) {
      const controller = new AbortController();
      state.activeController = controller;
      const timeout = window.setTimeout(() => controller.abort(), 30000);
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          body: new URLSearchParams({ data: query }),
          signal: controller.signal,
          headers: { Accept: 'application/json' }
        });
        if (!response.ok) throw new Error(`${new URL(endpoint).hostname} returned ${response.status}`);
        payload = await response.json();
        window.clearTimeout(timeout);
        break;
      } catch (error) {
        window.clearTimeout(timeout);
        if (sequence !== state.scanSequence) return;
        lastError = error;
      }
    }

    if (sequence !== state.scanSequence) return;
    state.activeController = null;
    if (!payload) {
      setBusinessStatus(`Visible-business extraction failed: ${lastError?.message || 'all Overpass endpoints were unavailable'}.`, true);
      return;
    }

    state.businesses = normalizeOverpassElements(payload.elements || [], state.map.getCenter());
    enrichBusinesses();
    cache[cacheKey] = { storedAt: Date.now(), businesses: state.businesses };
    const cacheEntries = Object.entries(cache)
      .sort((a, b) => b[1].storedAt - a[1].storedAt)
      .slice(0, 20);
    safeJsonWrite(STORAGE.businessCache, Object.fromEntries(cacheEntries));
    updateTypeFilter();
    renderBusinesses();
    setBusinessStatus(`Extracted ${state.businesses.length} named businesses and civic locations from the current map window.`);
  }

  function normalizeOverpassElements(elements, mapCenter) {
    const unique = new Map();
    for (const element of elements) {
      const tags = element.tags || {};
      const name = tags.name || tags.brand || tags.operator;
      const lat = Number(element.lat ?? element.center?.lat);
      const lng = Number(element.lon ?? element.center?.lon);
      if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const osmKey = `${element.type}/${element.id}`;
      if (unique.has(osmKey)) continue;
      const address = buildAddress(tags);
      const category = detectCategory(tags);
      const distance = mapCenter.distanceTo([lat, lng]);
      unique.set(osmKey, {
        osmKey,
        osmType: element.type,
        osmId: element.id,
        name,
        address,
        lat,
        lng,
        category,
        categoryLabel: categoryLabel(category, tags),
        tags,
        distance,
        googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
        openStreetMapUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`
      });
    }
    return [...unique.values()]
      .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name))
      .slice(0, MAX_VISIBLE_RESULTS);
  }

  function buildAddress(tags) {
    if (tags['addr:full']) return tags['addr:full'];
    const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
    return [street, tags['addr:city'] || tags['addr:town'] || tags['addr:village'], tags['addr:state'], tags['addr:postcode']]
      .filter(Boolean)
      .join(', ');
  }

  function detectCategory(tags) {
    const amenity = tags.amenity;
    const shop = tags.shop;
    const tourism = tags.tourism;
    const leisure = tags.leisure;

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
    if (shop === 'books') return 'book_store';
    if (shop) return 'store';
    if (['hotel', 'motel', 'hostel', 'guest_house'].includes(tourism)) return 'lodging';
    if (['park', 'garden', 'nature_reserve'].includes(leisure)) return 'park';
    if (tags.office) return 'office';
    if (tags.craft) return 'industrial';
    return 'other';
  }

  function categoryLabel(category, tags) {
    const labels = {
      restaurant: 'Food / Restaurant', bar: 'Bar / Pub', night_club: 'Night Club', library: 'Library',
      hospital: 'Healthcare', pharmacy: 'Pharmacy', cemetery: 'Cemetery', church: 'Religious Site',
      transit_station: 'Transit', government: 'Civic / Government', book_store: 'Book Store', store: 'Retail',
      lodging: 'Lodging', park: 'Park / Green Space', office: 'Office', industrial: 'Craft / Industrial', other: 'Other POI'
    };
    return labels[category] || tags.amenity || tags.shop || tags.tourism || 'Other POI';
  }

  function gothicRegistry(category) {
    return state.core?.config?.businessTypeMappings?.[category]
      || `Subverted Complex (${category.replaceAll('_', ' ')})`;
  }

  function selectedLine() {
    return document.getElementById('wod-spatial-line')?.value || 'unified';
  }

  function lineLayer(line, location) {
    if (line === 'vampire') return location.kindredLayer;
    if (line === 'werewolf' || line === 'breeds') return location.umbralLayer;
    if (line === 'mage') return location.awakenedVector;
    if (line === 'hunter') return `Hunter interpretation: ${location.mundaneBase.description} The supernatural explanation remains contested evidence.`;
    if (line === 'changeling') return `Changeling interpretation: the mundane footprint conceals a Dreaming reflection shaped by ${location.pressure.title.toLowerCase()}.`;
    return `${location.kindredLayer} | ${location.umbralLayer} | ${location.awakenedVector}`;
  }

  function enrichBusinesses() {
    if (!state.core) return;
    const line = selectedLine();
    state.businesses = state.businesses.map(business => {
      const canonical = [normalize(business.name), normalize(business.address), business.lat.toFixed(6), business.lng.toFixed(6)].join('|');
      const keyHash = murmurHash3(canonical, 0x1f123bb5).toString(16).padStart(8, '0');
      const entryKey = `gmaps-${keyHash}`;
      const spatialToken = `${entryKey}|${business.lat.toFixed(6)}|${business.lng.toFixed(6)}`;
      const seed = murmurHash3(spatialToken, 0x9747b28c);
      const location = state.core.locations[seed % state.core.locations.length];
      const character = state.core.characters[rotateRight(seed, 9) % state.core.characters.length];
      const rumor = state.core.rumors[rotateRight(seed, 17) % state.core.rumors.length];
      const central = state.centralRegistry.entries?.[entryKey] || null;
      const status = central?.veil_interaction || 'STANDARD_UNCLAIMED';
      return {
        ...business,
        entryKey,
        spatialToken,
        seed32: seed,
        gothicRegistry: gothicRegistry(business.category),
        hiddenFunction: central?.submitted_lore?.hiddenFunction || lineLayer(line, location),
        publicFacade: central?.submitted_lore?.publicFacade || `${business.name} follows a ${location.mundaneBase.name.toLowerCase()}-pattern ${location.mundaneBase.category.toLowerCase()} footprint.`,
        pressure: `${location.pressure.title}: ${location.pressure.effect}`,
        mechanicalSeed: location.pressure.mechanicalSeed,
        embeddedCharacter: `${character.sphereAlignmentAndTenure} — ${character.aestheticAndTell}`,
        rumor: rumor.urbanLegend,
        locationVariant: location.variant,
        status,
        central: Boolean(central)
      };
    });
  }

  function updateTypeFilter() {
    const select = document.getElementById('wod-visible-business-type');
    if (!select) return;
    const previous = select.value;
    const categories = [...new Set(state.businesses.map(business => business.category))]
      .sort((a, b) => categoryLabel(a, {}).localeCompare(categoryLabel(b, {})));
    select.innerHTML = '<option value="all">All visible types</option>'
      + categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(categoryLabel(category, {}))}</option>`).join('');
    select.value = categories.includes(previous) ? previous : 'all';
  }

  function filteredBusinesses() {
    const query = normalize(document.getElementById('wod-visible-business-search')?.value || '');
    const type = document.getElementById('wod-visible-business-type')?.value || 'all';
    return state.businesses.filter(business => {
      if (type !== 'all' && business.category !== type) return false;
      if (!query) return true;
      return [business.name, business.address, business.categoryLabel, business.gothicRegistry, business.pressure, business.hiddenFunction]
        .some(value => normalize(value).includes(query));
    });
  }

  function renderBusinesses() {
    const list = document.getElementById('wod-visible-business-list');
    const count = document.getElementById('wod-visible-business-count');
    if (!list || !count) return;
    const businesses = filteredBusinesses();
    count.textContent = `${businesses.length} of ${state.businesses.length} visible locations shown.`;
    list.innerHTML = '';

    if (!businesses.length) {
      list.innerHTML = '<p class="wod-note">No matching business locations are available in the current viewport. Move closer, clear the filters, or scan again.</p>';
      renderMarkers([]);
      return;
    }

    businesses.forEach(business => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `wod-business-card ${claimClass(business.status)} ${business.entryKey === state.selectedKey ? 'active' : ''}`;
      button.dataset.businessKey = business.entryKey;
      button.innerHTML = `
        <h4>${escapeHtml(business.name)}</h4>
        <p>${escapeHtml(business.address || `${business.lat.toFixed(5)}, ${business.lng.toFixed(5)}`)}</p>
        <div class="wod-business-meta">
          <span class="wod-business-pill">${escapeHtml(business.categoryLabel)}</span>
          <span class="wod-business-pill">Variant ${business.locationVariant}/70</span>
          ${business.central ? '<span class="wod-business-pill">Central registry</span>' : ''}
        </div>
        <p><strong>${escapeHtml(business.gothicRegistry)}</strong></p>
        <p class="wod-hidden-preview">${escapeHtml(truncate(business.hiddenFunction, 210))}</p>
        <p><strong>Pressure:</strong> ${escapeHtml(truncate(business.pressure, 150))}</p>`;
      button.addEventListener('click', () => selectBusiness(business));
      list.appendChild(button);
    });
    renderMarkers(businesses);
  }

  function truncate(value, length) {
    const text = String(value || '');
    return text.length > length ? `${text.slice(0, length - 1)}…` : text;
  }

  function claimClass(status) {
    if (status === 'SUPPORTIVE') return 'supportive';
    if (status === 'OPT_OUT') return 'opt-out';
    return '';
  }

  function renderMarkers(businesses) {
    if (!state.markerLayer || !window.L) return;
    state.markerLayer.clearLayers();
    businesses.forEach((business, index) => {
      const icon = window.L.divIcon({
        className: '',
        html: `<div class="wod-osm-marker ${claimClass(business.status)}">${index + 1}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      const marker = window.L.marker([business.lat, business.lng], { icon, title: business.name });
      marker.bindPopup(`<strong>${escapeHtml(business.name)}</strong><br>${escapeHtml(business.gothicRegistry)}<br><small>${escapeHtml(business.pressure)}</small>`);
      marker.on('click', () => selectBusiness(business, { preserveZoom: true }));
      marker.addTo(state.markerLayer);
      business.marker = marker;
    });
  }

  function ensureCaptureOption(select, value, label) {
    if (!select || [...select.options].some(option => option.value === value)) return;
    select.add(new Option(label, value));
  }

  function selectBusiness(business, options = {}) {
    state.selectedKey = business.entryKey;
    const typeSelect = document.getElementById('wod-business-type');
    ensureCaptureOption(typeSelect, business.category, business.categoryLabel);
    document.getElementById('wod-business-name').value = business.name;
    document.getElementById('wod-business-address').value = business.address;
    document.getElementById('wod-business-url').value = business.googleMapsUrl;
    document.getElementById('wod-business-lat').value = business.lat.toFixed(6);
    document.getElementById('wod-business-lng').value = business.lng.toFixed(6);
    typeSelect.value = business.category;
    document.getElementById('wod-map-query').value = `${business.name} ${business.address}`.trim();

    if (!options.preserveZoom) state.map.setView([business.lat, business.lng], Math.max(state.map.getZoom(), 17));
    business.marker?.openPopup();
    document.getElementById('wod-resolve-business')?.click();
    renderBusinesses();
  }

  function setBusinessStatus(message, error = false) {
    const target = document.getElementById('wod-visible-business-status');
    if (!target) return;
    target.textContent = message;
    target.classList.toggle('error', error);
  }

  async function install() {
    if (state.installed) return;
    state.installed = true;
    let attempts = 0;
    while (!buildPanel() && attempts < 100) {
      attempts += 1;
      await delay(100);
    }
    if (!document.getElementById('wod-visible-businesses')) return;

    try {
      await Promise.all([loadCoreData(), loadLeaflet()]);
      await initializeMap();
    } catch (error) {
      setBusinessStatus(`Visible-business milestone failed to initialize: ${error.message}`, true);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else void install();
})();
