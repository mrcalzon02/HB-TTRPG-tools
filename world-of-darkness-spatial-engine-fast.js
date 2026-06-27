(() => {
  'use strict';

  const REPOSITORY = 'mrcalzon02/HB-TTRPG-tools';
  const LEAFLET_VERSION = '1.9.4';
  const LEAFLET_SOURCES = [
    `https://cdn.jsdelivr.net/npm/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`,
    `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`
  ];
  const LEAFLET_CSS = `https://cdn.jsdelivr.net/npm/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
  const OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];
  const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
  const DEFAULT_VIEW = { lat: 47.6016, lng: -122.3334, zoom: 15 };
  const MIN_MANUAL_SCAN_ZOOM = 14;
  const MIN_AUTO_SCAN_ZOOM = 15;
  const AUTO_SCAN_DELAY_MS = 3500;
  const AUTO_SCAN_COOLDOWN_MS = 12000;
  const CACHE_TTL_MS = 10 * 60 * 1000;
  const MAX_RESULTS = 90;
  const STORAGE = {
    view: 'hb-wod-fast-map-view-v1',
    query: 'hb-wod-fast-map-query-v1',
    geocode: 'hb-wod-fast-geocode-v1',
    scans: 'hb-wod-fast-scans-v1',
    localPrefix: 'hb-wod-poi-v2:'
  };
  const LINE_TITLES = {
    unified: 'Unified World of Darkness',
    vampire: 'Vampire: The Masquerade',
    werewolf: 'Werewolf: The Apocalypse',
    breeds: 'Werewolf Changing Breeds',
    hunter: 'Hunter: The Reckoning',
    changeling: 'Changeling',
    mage: 'Mage: The Awakening'
  };
  const BUSINESS_TYPES = {
    restaurant: 'Food / Restaurant', bar: 'Bar / Pub', night_club: 'Night Club',
    book_store: 'Book Store', library: 'Library', hospital: 'Healthcare', pharmacy: 'Pharmacy',
    cemetery: 'Cemetery', park: 'Park / Green Space', store: 'Retail', lodging: 'Lodging',
    church: 'Religious Site', transit_station: 'Transit', government: 'Civic / Government',
    office: 'Office', industrial: 'Craft / Industrial', other: 'Other POI'
  };

  const state = {
    installed: false,
    started: false,
    starting: false,
    map: null,
    markerLayer: null,
    businesses: [],
    selectedKey: '',
    core: null,
    centralRegistry: { entries: {} },
    corePromise: null,
    scanTimer: 0,
    scanSequence: 0,
    scanController: null,
    lastScanAt: 0,
    lastScanSignature: '',
    lastGeocodeAt: 0
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

  function rotateRight(value, amount) {
    return ((value >>> amount) | (value << (32 - amount))) >>> 0;
  }

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
    } catch (_) {
      // Storage failure must not block map operation.
    }
  }

  async function loadJson(url) {
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
  }

  function expandCore(document, prefix) {
    if (Array.isArray(document.entries)) return document.entries;
    const prototypes = document.prototypes || [];
    const pressures = document.pressureVariants || [];
    return prototypes.flatMap((prototype, prototypeIndex) => pressures.map((pressure, pressureIndex) => ({
      ...prototype,
      id: `${prefix}-${String(prototypeIndex + 1).padStart(2, '0')}-${String(pressureIndex + 1).padStart(2, '0')}`,
      variant: prototypeIndex * pressures.length + pressureIndex + 1,
      pressure
    })));
  }

  async function loadCoreData() {
    if (state.corePromise) return state.corePromise;
    state.corePromise = (async () => {
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
      setStatus('Map ready. Business extraction is manual by default; press Scan Visible Area when the map is positioned.');
      document.getElementById('wod-scan-visible-businesses').disabled = false;
      return state.core;
    })();
    return state.corePromise;
  }

  function addPreconnect(href) {
    if (document.querySelector(`link[rel="preconnect"][href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = href;
    link.crossOrigin = '';
    document.head.appendChild(link);
  }

  function loadLeaflet() {
    if (window.L?.map) return Promise.resolve(window.L);
    addPreconnect('https://cdn.jsdelivr.net');
    addPreconnect('https://tile.openstreetmap.org');
    if (!document.querySelector('link[data-wod-fast-leaflet]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      link.dataset.wodFastLeaflet = 'true';
      document.head.appendChild(link);
    }
    return new Promise((resolve, reject) => {
      let sourceIndex = 0;
      const trySource = () => {
        const script = document.createElement('script');
        script.src = LEAFLET_SOURCES[sourceIndex];
        script.async = true;
        script.dataset.wodFastLeaflet = 'true';
        script.onload = () => resolve(window.L);
        script.onerror = () => {
          script.remove();
          sourceIndex += 1;
          if (sourceIndex < LEAFLET_SOURCES.length) trySource();
          else reject(new Error('The lightweight map library could not be loaded.'));
        };
        document.head.appendChild(script);
      };
      trySource();
    });
  }

  function injectStyles() {
    if (document.getElementById('wod-fast-spatial-style')) return;
    const style = document.createElement('style');
    style.id = 'wod-fast-spatial-style';
    style.textContent = `
      .wod-fast-engine{border:1px solid var(--line);border-radius:20px;background:#0b0d12;overflow:hidden;margin:18px 0 28px}
      .wod-fast-header{padding:20px 22px 13px;border-bottom:1px solid var(--line)}
      .wod-fast-header h2{margin:.15rem 0 .5rem}
      .wod-fast-layout{display:grid;grid-template-columns:minmax(330px,390px) minmax(480px,1fr) minmax(330px,390px);min-height:720px}
      .wod-fast-left,.wod-fast-right{padding:14px;overflow:auto;max-height:820px;background:#101218}
      .wod-fast-left{border-right:1px solid var(--line)}
      .wod-fast-right{border-left:1px solid var(--line)}
      .wod-fast-center{display:grid;grid-template-rows:auto minmax(620px,1fr) auto;min-width:0;background:#15181e}
      .wod-fast-map{width:100%;height:100%;min-height:620px;background:#15181e;z-index:0}
      .wod-fast-controls{display:grid;grid-template-columns:minmax(180px,1fr) auto auto auto;gap:8px;padding:11px;border-bottom:1px solid var(--line)}
      .wod-fast-controls input,.wod-fast-card input,.wod-fast-card textarea,.wod-fast-card select,.wod-fast-toolbar input,.wod-fast-toolbar select{width:100%;box-sizing:border-box;background:#11151d;border:1px solid var(--line);color:var(--ink);border-radius:9px;padding:9px}
      .wod-fast-footer{padding:9px 12px;border-top:1px solid var(--line);font-size:.78rem;color:var(--muted)}
      .wod-fast-card{background:#181b22;padding:14px;margin:0 0 13px;border:1px solid #333;border-left:5px solid #8b0000;border-radius:11px}
      .wod-fast-card h3{margin-top:0}
      .wod-fast-card label{display:grid;gap:4px;margin-top:8px;color:var(--muted);font-size:.78rem}
      .wod-fast-grid{display:grid;gap:8px}
      .wod-fast-field{border-left:3px solid var(--accent);padding:8px;background:#10131a}
      .wod-fast-field strong{display:block;margin-bottom:3px}
      .wod-fast-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}
      .wod-fast-toolbar{display:grid;gap:8px;margin:10px 0}
      .wod-fast-toolbar-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}
      .wod-fast-auto{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:.8rem;white-space:nowrap}
      .wod-fast-auto input{width:auto}
      .wod-fast-status{padding:9px;border:1px solid var(--line);border-radius:9px;color:var(--muted);font-size:.79rem;background:#0d1016}
      .wod-fast-status.error{border-color:#8b0000;color:#ffb3b3}
      .wod-fast-count{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--accent);font-size:.78rem}
      .wod-fast-list{display:grid;gap:7px;margin-top:9px}
      .wod-fast-business{width:100%;text-align:left;border:1px solid var(--line);border-left:4px solid #8b0000;border-radius:10px;padding:9px;background:#151820;color:var(--ink);cursor:pointer}
      .wod-fast-business:hover,.wod-fast-business.active{border-color:var(--accent);background:#1d2029}
      .wod-fast-business.supportive{border-left-color:#00c7a5}.wod-fast-business.opt-out{border-left-color:#777;filter:saturate(.55)}
      .wod-fast-business h4{margin:0 0 4px}.wod-fast-business p{margin:4px 0;font-size:.77rem;line-height:1.35}
      .wod-fast-pills{display:flex;flex-wrap:wrap;gap:4px;margin:5px 0}.wod-fast-pill{border:1px solid var(--line);border-radius:999px;padding:2px 6px;font-size:.66rem;color:var(--muted)}
      .wod-fast-preview{color:#d5c09a}.wod-fast-token{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;word-break:break-all;color:var(--accent)}
      .wod-fast-marker{display:grid;place-items:center;width:23px;height:23px;border-radius:50%;border:2px solid #fff;background:#8b0000;color:#fff;font-size:11px;font-weight:900;box-shadow:0 2px 8px #000}
      .wod-fast-marker.supportive{background:#00a98f}.wod-fast-marker.opt-out{background:#666}
      .leaflet-popup-content-wrapper,.leaflet-popup-tip{background:#151820;color:#eee}.leaflet-container a{color:#c9913c}
      @media(max-width:1450px){.wod-fast-layout{grid-template-columns:minmax(320px,390px) minmax(480px,1fr)}.wod-fast-right{grid-column:1/-1;max-height:500px;border-left:0;border-top:1px solid var(--line)}.wod-fast-list{grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}}
      @media(max-width:980px){.wod-fast-layout{grid-template-columns:1fr}.wod-fast-left,.wod-fast-right{max-height:none;border:0;border-bottom:1px solid var(--line)}.wod-fast-center{grid-template-rows:auto 500px auto}.wod-fast-map{min-height:500px}.wod-fast-controls{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function buildInterface() {
    const view = document.getElementById('world-of-darkness');
    const oldBox = view?.querySelector('.wod-box');
    if (!view || !oldBox) return false;
    if (document.getElementById('wod-spatial-engine')) return true;
    injectStyles();
    const query = localStorage.getItem(STORAGE.query) || 'Seattle, Washington - Pioneer Square';
    const section = document.createElement('section');
    section.id = 'wod-spatial-engine';
    section.className = 'wod-fast-engine no-print';
    section.innerHTML = `
      <header class="wod-fast-header"><p class="eyebrow">Performance-first urban overlay</p><h2>Chronicle Spatial Engine</h2><p>The map renders before Chronicle data loads. Business extraction is manual by default so panning and zooming never trigger expensive network scans unless you explicitly enable throttled auto-scan.</p></header>
      <div class="wod-fast-layout">
        <aside class="wod-fast-left">
          <section class="wod-fast-card"><label>Game line<select id="wod-spatial-line">${Object.entries(LINE_TITLES).map(([id,title]) => `<option value="${id}">${escapeHtml(title)}</option>`).join('')}</select></label></section>
          <div id="wod-display-matrix"><section class="wod-fast-card"><h3>No Business Selected</h3><p>Select a visible business after scanning to open its complete deterministic World of Darkness record.</p></section></div>
          <details class="wod-fast-card"><summary>Manual business capture</summary><label>Name<input id="wod-business-name"></label><label>Address<input id="wod-business-address"></label><label>Reference URL<input id="wod-business-url"></label><label>Type<select id="wod-business-type">${Object.entries(BUSINESS_TYPES).map(([id,label]) => `<option value="${id}">${escapeHtml(label)}</option>`).join('')}</select></label><label>Latitude<input id="wod-business-lat" type="number" step=".000001"></label><label>Longitude<input id="wod-business-lng" type="number" step=".000001"></label><button id="wod-resolve-business" class="secondary-action">Generate Manual Record</button></details>
        </aside>
        <section class="wod-fast-center">
          <div class="wod-fast-controls"><input id="wod-map-query" type="search" value="${escapeHtml(query)}" placeholder="City, address, neighborhood, or coordinates"><button id="wod-move-map" class="primary-action">Move Map</button><button id="wod-open-google-maps" class="secondary-action">Open Google Maps</button><button id="wod-use-browser-location" class="secondary-action">Use My Location</button></div>
          <div id="wod-fast-map" class="wod-fast-map" aria-label="Chronicle Spatial Engine map"><div style="display:grid;place-content:center;height:100%;color:var(--muted)">Loading lightweight map…</div></div>
          <div class="wod-fast-footer">Map data © OpenStreetMap contributors. No Google API key is used.</div>
        </section>
        <aside class="wod-fast-right">
          <p class="eyebrow">Visible-place extraction</p><h3>Businesses in Current Map View</h3><p class="wod-note">Move the map freely, then scan when ready. Auto-scan starts disabled and is heavily delayed and rate-limited when enabled.</p>
          <div class="wod-fast-toolbar"><div class="wod-fast-toolbar-row"><button id="wod-scan-visible-businesses" class="primary-action" disabled>Scan Visible Area</button><label class="wod-fast-auto"><input id="wod-auto-scan-businesses" type="checkbox"> Auto-scan</label></div><input id="wod-visible-business-search" type="search" placeholder="Filter visible businesses…"><select id="wod-visible-business-type"><option value="all">All visible types</option></select></div>
          <div id="wod-visible-business-status" class="wod-fast-status" aria-live="polite">Map is loading. No business scan has started.</div><p id="wod-visible-business-count" class="wod-fast-count"></p><div id="wod-visible-business-list" class="wod-fast-list"></div>
        </aside>
      </div>`;
    oldBox.replaceWith(section);
    bindInterface();
    return true;
  }

  function bindInterface() {
    document.getElementById('wod-move-map').addEventListener('click', () => geocodeAndMove(document.getElementById('wod-map-query').value));
    document.getElementById('wod-map-query').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); void geocodeAndMove(event.target.value); } });
    document.getElementById('wod-open-google-maps').addEventListener('click', () => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(document.getElementById('wod-map-query').value)}`, '_blank', 'noopener'));
    document.getElementById('wod-use-browser-location').addEventListener('click', useBrowserLocation);
    document.getElementById('wod-scan-visible-businesses').addEventListener('click', () => scanVisibleBusinesses({ force: true, manual: true }));
    document.getElementById('wod-auto-scan-businesses').addEventListener('change', event => {
      window.clearTimeout(state.scanTimer);
      if (event.target.checked) {
        setStatus('Auto-scan enabled. It will wait until the map has been idle for several seconds and will not scan more than once every twelve seconds.');
        scheduleAutoScan();
      } else {
        setStatus('Auto-scan disabled. Move the map freely and press Scan Visible Area when ready.');
      }
    });
    document.getElementById('wod-visible-business-search').addEventListener('input', renderBusinesses);
    document.getElementById('wod-visible-business-type').addEventListener('change', renderBusinesses);
    document.getElementById('wod-spatial-line').addEventListener('change', () => { enrichBusinesses(); renderBusinesses(); if (state.selectedKey) selectByKey(state.selectedKey, false); });
    document.getElementById('wod-resolve-business').addEventListener('click', resolveManualBusiness);
  }

  async function startEngine() {
    if (state.started || state.starting) return;
    state.starting = true;
    try {
      const leafletPromise = loadLeaflet();
      loadCoreData().catch(error => setStatus(`Chronicle data failed to load: ${error.message}`, true));
      const L = await leafletPromise;
      initializeMap(L);
      state.started = true;
    } catch (error) {
      setStatus(`Map failed to initialize: ${error.message}`, true);
    } finally {
      state.starting = false;
    }
  }

  function initializeMap(L) {
    const element = document.getElementById('wod-fast-map');
    element.innerHTML = '';
    const stored = readStorage(STORAGE.view, DEFAULT_VIEW);
    const view = Number.isFinite(stored?.lat) && Number.isFinite(stored?.lng) ? stored : DEFAULT_VIEW;
    state.map = L.map(element, { zoomControl: true, preferCanvas: true, fadeAnimation: false, zoomAnimation: false, markerZoomAnimation: false }).setView([view.lat, view.lng], view.zoom || 15);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, updateWhenIdle: true, updateWhenZooming: false, keepBuffer: 1, detectRetina: false, attribution: '&copy; OpenStreetMap contributors' }).addTo(state.map);
    state.markerLayer = L.layerGroup().addTo(state.map);
    state.map.on('moveend zoomend', () => {
      const center = state.map.getCenter();
      writeStorage(STORAGE.view, { lat: center.lat, lng: center.lng, zoom: state.map.getZoom() });
      if (document.getElementById('wod-auto-scan-businesses').checked) scheduleAutoScan();
    });
    setStatus('Map ready. Chronicle data is loading in the background; no business scan has started.');
  }

  function scheduleAutoScan() {
    window.clearTimeout(state.scanTimer);
    if (!state.map || !state.core || !document.getElementById('wod-auto-scan-businesses').checked) return;
    if (state.map.getZoom() < MIN_AUTO_SCAN_ZOOM) {
      setStatus(`Auto-scan is paused below zoom ${MIN_AUTO_SCAN_ZOOM}. Zoom closer or use the manual scan button.`);
      return;
    }
    const elapsed = Date.now() - state.lastScanAt;
    const cooldown = Math.max(0, AUTO_SCAN_COOLDOWN_MS - elapsed);
    state.scanTimer = window.setTimeout(() => scanVisibleBusinesses({ manual: false }), AUTO_SCAN_DELAY_MS + cooldown);
  }

  async function geocodeAndMove(query) {
    const text = String(query || '').trim();
    if (!text || !state.map) return;
    localStorage.setItem(STORAGE.query, text);
    const coordinates = text.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (coordinates) { state.map.setView([Number(coordinates[1]), Number(coordinates[2])], 16); return; }
    const cache = readStorage(STORAGE.geocode, {});
    const key = normalize(text);
    if (cache[key] && Date.now() - cache[key].storedAt < 30 * 24 * 60 * 60 * 1000) { state.map.setView([cache[key].lat, cache[key].lng], 16); return; }
    const throttle = Math.max(0, 1000 - (Date.now() - state.lastGeocodeAt));
    if (throttle) await wait(throttle);
    state.lastGeocodeAt = Date.now();
    setStatus(`Locating “${text}”…`);
    try {
      const params = new URLSearchParams({ format: 'jsonv2', limit: '1', q: text });
      const response = await fetch(`${NOMINATIM_ENDPOINT}?${params}`, { headers: { Accept: 'application/json', 'Accept-Language': 'en' } });
      if (!response.ok) throw new Error(`search returned ${response.status}`);
      const results = await response.json();
      if (!results.length) throw new Error('no matching location was found');
      const lat = Number(results[0].lat), lng = Number(results[0].lon);
      cache[key] = { lat, lng, storedAt: Date.now() };
      writeStorage(STORAGE.geocode, cache);
      state.map.setView([lat, lng], 16);
      setStatus('Location found. Move the map as needed, then press Scan Visible Area.');
    } catch (error) {
      setStatus(`Location search failed: ${error.message}`, true);
    }
  }

  function useBrowserLocation() {
    if (!navigator.geolocation) return setStatus('Browser geolocation is unavailable.', true);
    setStatus('Requesting browser location…');
    navigator.geolocation.getCurrentPosition(position => {
      state.map.setView([position.coords.latitude, position.coords.longitude], 16);
      setStatus('Browser location loaded. No business scan has started.');
    }, error => setStatus(`Browser location failed: ${error.message || 'permission denied'}`, true), { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  }

  function boundsSignature(bounds, zoom) {
    return [zoom, bounds.getSouth().toFixed(3), bounds.getWest().toFixed(3), bounds.getNorth().toFixed(3), bounds.getEast().toFixed(3)].join(':');
  }

  function overpassQuery(bounds) {
    const bbox = [bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast()].map(value => value.toFixed(6)).join(',');
    return `[out:json][timeout:18];(nwr["name"]["amenity"](${bbox});nwr["name"]["shop"](${bbox});nwr["name"]["tourism"](${bbox});nwr["name"]["office"](${bbox});nwr["name"]["healthcare"](${bbox}););out center tags qt;`;
  }

  async function scanVisibleBusinesses(options = {}) {
    if (!state.map) return;
    if (!state.core) { setStatus('Chronicle data is still loading. The map remains usable; try scanning again in a moment.'); await loadCoreData(); }
    const zoom = state.map.getZoom();
    const minimumZoom = options.manual ? MIN_MANUAL_SCAN_ZOOM : MIN_AUTO_SCAN_ZOOM;
    if (zoom < minimumZoom) return setStatus(`Zoom to ${minimumZoom} or closer before ${options.manual ? 'scanning' : 'auto-scanning'} businesses.`);
    const bounds = state.map.getBounds();
    if ((bounds.getNorth() - bounds.getSouth()) > 0.16 || (bounds.getEast() - bounds.getWest()) > 0.24) return setStatus('The visible area is too large. Zoom in before scanning.');
    const signature = boundsSignature(bounds, zoom);
    if (!options.force && signature === state.lastScanSignature) return setStatus('This viewport has already been scanned. Move the map or use Scan Visible Area to force a refresh.');
    const cache = readStorage(STORAGE.scans, {});
    if (!options.force && cache[signature] && Date.now() - cache[signature].storedAt < CACHE_TTL_MS) {
      state.businesses = cache[signature].businesses;
      state.lastScanSignature = signature;
      enrichBusinesses(); updateTypeFilter(); renderBusinesses();
      return setStatus(`Loaded ${state.businesses.length} businesses from the ten-minute viewport cache.`);
    }
    window.clearTimeout(state.scanTimer);
    state.scanController?.abort();
    const sequence = ++state.scanSequence;
    state.scanController = new AbortController();
    setStatus('Scanning visible businesses… the map remains interactive while this request runs.');
    let payload = null, lastError = null;
    for (const endpoint of OVERPASS_ENDPOINTS) {
      const timeout = window.setTimeout(() => state.scanController?.abort(), 22000);
      try {
        const response = await fetch(endpoint, { method: 'POST', body: new URLSearchParams({ data: overpassQuery(bounds) }), signal: state.scanController.signal, headers: { Accept: 'application/json' } });
        window.clearTimeout(timeout);
        if (!response.ok) throw new Error(`${new URL(endpoint).hostname} returned ${response.status}`);
        payload = await response.json();
        break;
      } catch (error) {
        window.clearTimeout(timeout);
        if (sequence !== state.scanSequence) return;
        lastError = error;
        state.scanController = new AbortController();
      }
    }
    if (sequence !== state.scanSequence) return;
    state.scanController = null;
    if (!payload) return setStatus(`Business scan failed: ${lastError?.message || 'all extraction services were unavailable'}.`, true);
    state.businesses = normalizeElements(payload.elements || [], state.map.getCenter());
    state.lastScanAt = Date.now();
    state.lastScanSignature = signature;
    enrichBusinesses(); updateTypeFilter(); renderBusinesses();
    cache[signature] = { storedAt: Date.now(), businesses: state.businesses.map(({ marker, ...business }) => business) };
    writeStorage(STORAGE.scans, Object.fromEntries(Object.entries(cache).sort((a,b) => b[1].storedAt - a[1].storedAt).slice(0, 16)));
    setStatus(`Found ${state.businesses.length} named businesses and civic locations. Auto-scan remains ${document.getElementById('wod-auto-scan-businesses').checked ? 'enabled with throttling' : 'off'}.`);
  }

  function normalizeElements(elements, center) {
    const unique = new Map();
    for (const element of elements) {
      const tags = element.tags || {};
      const name = tags.name || tags.brand || tags.operator;
      const lat = Number(element.lat ?? element.center?.lat), lng = Number(element.lon ?? element.center?.lon);
      if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const osmKey = `${element.type}/${element.id}`;
      if (unique.has(osmKey)) continue;
      const category = detectCategory(tags);
      unique.set(osmKey, { osmKey, name, address: addressFrom(tags), lat, lng, category, categoryLabel: BUSINESS_TYPES[category] || 'Other POI', distance: center.distanceTo([lat,lng]), googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` });
    }
    return [...unique.values()].sort((a,b) => a.distance - b.distance || a.name.localeCompare(b.name)).slice(0, MAX_RESULTS);
  }

  function addressFrom(tags) {
    if (tags['addr:full']) return tags['addr:full'];
    return [[tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' '), tags['addr:city'] || tags['addr:town'] || tags['addr:village'], tags['addr:state'], tags['addr:postcode']].filter(Boolean).join(', ');
  }

  function detectCategory(tags) {
    const amenity = tags.amenity, shop = tags.shop, tourism = tags.tourism;
    if (['restaurant','cafe','fast_food','food_court','ice_cream'].includes(amenity)) return 'restaurant';
    if (['bar','pub','biergarten'].includes(amenity)) return 'bar';
    if (amenity === 'nightclub') return 'night_club';
    if (amenity === 'library') return 'library';
    if (['hospital','clinic','doctors','dentist'].includes(amenity) || tags.healthcare) return 'hospital';
    if (amenity === 'pharmacy') return 'pharmacy';
    if (amenity === 'grave_yard') return 'cemetery';
    if (amenity === 'place_of_worship') return 'church';
    if (['bus_station','ferry_terminal'].includes(amenity) || tags.railway === 'station') return 'transit_station';
    if (['townhall','courthouse','police','fire_station','post_office'].includes(amenity)) return 'government';
    if (shop === 'books') return 'book_store';
    if (shop) return 'store';
    if (['hotel','motel','hostel','guest_house'].includes(tourism)) return 'lodging';
    if (tags.office) return 'office';
    return 'other';
  }

  function gothicRegistry(category) {
    return state.core.config.businessTypeMappings?.[category] || `Subverted Complex (${(BUSINESS_TYPES[category] || category).toLowerCase()})`;
  }

  function lineLayer(line, location) {
    if (line === 'vampire') return location.kindredLayer;
    if (line === 'werewolf' || line === 'breeds') return location.umbralLayer;
    if (line === 'mage') return location.awakenedVector;
    if (line === 'hunter') return `Hunter interpretation: ${location.mundaneBase.description} Every supernatural explanation remains contested evidence.`;
    if (line === 'changeling') return `Changeling interpretation: the mundane footprint conceals a Dreaming reflection shaped by ${location.pressure.title.toLowerCase()}.`;
    return `${location.kindredLayer} | ${location.umbralLayer} | ${location.awakenedVector}`;
  }

  function enrichOne(business) {
    const canonical = [normalize(business.name), normalize(business.address), business.lat.toFixed(6), business.lng.toFixed(6)].join('|');
    const entryKey = `gmaps-${murmurHash3(canonical, 0x1f123bb5).toString(16).padStart(8,'0')}`;
    const spatialToken = `${entryKey}|${business.lat.toFixed(6)}|${business.lng.toFixed(6)}`;
    const seed = murmurHash3(spatialToken, 0x9747b28c);
    const location = state.core.locations[seed % state.core.locations.length];
    const character = state.core.characters[rotateRight(seed,9) % state.core.characters.length];
    const rumor = state.core.rumors[rotateRight(seed,17) % state.core.rumors.length];
    const central = state.centralRegistry.entries?.[entryKey] || null;
    const local = readStorage(`${STORAGE.localPrefix}${entryKey}`, null);
    const override = local || central;
    const claimStatus = override?.veil_interaction || 'STANDARD_UNCLAIMED';
    const lore = override?.submitted_lore || {};
    const line = document.getElementById('wod-spatial-line').value;
    return { ...business, entryKey, spatialToken, seed32: seed, gothicRegistry: gothicRegistry(business.category), hiddenFunction: lore.hiddenFunction || lineLayer(line, location), publicFacade: lore.publicFacade || `${business.name} follows a ${location.mundaneBase.name.toLowerCase()}-pattern ${location.mundaneBase.category.toLowerCase()} footprint. ${location.mundaneBase.description}`, pressure: `${location.pressure.title}: ${location.pressure.effect}`, mechanicalSeed: location.pressure.mechanicalSeed, embeddedCharacter: `${character.sphereAlignmentAndTenure} — ${character.aestheticAndTell}`, temporalAnchor: character.temporalAnchor, traumaticCatalyst: character.traumaticCatalyst, operationalSecret: character.secretActivePlot, vulnerability: character.fatalWeakness, sensoryAnchor: rumor.sensoryAnchor, mediaFeed: rumor.mediaFeed, rumor: rumor.urbanLegend, locationVariant: location.variant, claimStatus, central: Boolean(central), optOut: claimStatus === 'OPT_OUT' };
  }

  function enrichBusinesses() { if (state.core) state.businesses = state.businesses.map(enrichOne); }

  function updateTypeFilter() {
    const select = document.getElementById('wod-visible-business-type'), previous = select.value;
    const types = [...new Set(state.businesses.map(item => item.category))].sort((a,b) => (BUSINESS_TYPES[a] || a).localeCompare(BUSINESS_TYPES[b] || b));
    select.innerHTML = '<option value="all">All visible types</option>' + types.map(type => `<option value="${type}">${escapeHtml(BUSINESS_TYPES[type] || type)}</option>`).join('');
    select.value = types.includes(previous) ? previous : 'all';
  }

  function filteredBusinesses() {
    const query = normalize(document.getElementById('wod-visible-business-search').value), type = document.getElementById('wod-visible-business-type').value;
    return state.businesses.filter(item => (type === 'all' || item.category === type) && (!query || [item.name,item.address,item.categoryLabel,item.gothicRegistry,item.hiddenFunction,item.pressure].some(value => normalize(value).includes(query))));
  }

  function renderBusinesses() {
    const list = document.getElementById('wod-visible-business-list'), count = document.getElementById('wod-visible-business-count');
    const items = filteredBusinesses();
    count.textContent = `${items.length} of ${state.businesses.length} locations shown.`;
    list.innerHTML = items.length ? '' : '<p class="wod-note">No matching locations. Move the map, scan manually, or clear the filters.</p>';
    items.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `wod-fast-business ${claimClass(item.claimStatus)} ${item.entryKey === state.selectedKey ? 'active' : ''}`;
      button.innerHTML = `<h4>${escapeHtml(item.name)}</h4><p>${escapeHtml(item.address || `${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}`)}</p><div class="wod-fast-pills"><span class="wod-fast-pill">${escapeHtml(item.categoryLabel)}</span><span class="wod-fast-pill">Variant ${item.locationVariant}/70</span>${item.central ? '<span class="wod-fast-pill">Central registry</span>' : ''}</div><p><strong>${escapeHtml(item.gothicRegistry)}</strong></p><p class="wod-fast-preview">${escapeHtml(truncate(item.hiddenFunction,190))}</p><p><strong>Pressure:</strong> ${escapeHtml(truncate(item.pressure,130))}</p>`;
      button.addEventListener('click', () => selectBusiness(item));
      list.appendChild(button);
    });
    renderMarkers(items);
  }

  function renderMarkers(items) {
    if (!state.markerLayer || !window.L) return;
    state.markerLayer.clearLayers();
    items.forEach((item,index) => {
      const icon = window.L.divIcon({ className:'', html:`<div class="wod-fast-marker ${claimClass(item.claimStatus)}">${index + 1}</div>`, iconSize:[27,27], iconAnchor:[13,13] });
      const marker = window.L.marker([item.lat,item.lng], { icon, title:item.name }).bindPopup(`<strong>${escapeHtml(item.name)}</strong><br>${escapeHtml(item.gothicRegistry)}<br><small>${escapeHtml(item.pressure)}</small>`);
      marker.on('click', () => selectBusiness(item, false));
      marker.addTo(state.markerLayer);
      item.marker = marker;
    });
  }

  function selectByKey(key, move = true) { const item = state.businesses.find(candidate => candidate.entryKey === key); if (item) selectBusiness(item, move); }

  function selectBusiness(item, move = true) {
    state.selectedKey = item.entryKey;
    if (move) state.map.setView([item.lat,item.lng], Math.max(state.map.getZoom(),17));
    item.marker?.openPopup();
    populateManualFields(item);
    renderRecord(item);
    renderBusinesses();
  }

  function populateManualFields(item) {
    document.getElementById('wod-business-name').value = item.name;
    document.getElementById('wod-business-address').value = item.address;
    document.getElementById('wod-business-url').value = item.googleMapsUrl || '';
    document.getElementById('wod-business-lat').value = item.lat.toFixed(6);
    document.getElementById('wod-business-lng').value = item.lng.toFixed(6);
    const select = document.getElementById('wod-business-type');
    if (![...select.options].some(option => option.value === item.category)) select.add(new Option(item.categoryLabel,item.category));
    select.value = item.category;
  }

  function resolveManualBusiness() {
    if (!state.core) return setStatus('Chronicle data is still loading.', true);
    const item = { name:document.getElementById('wod-business-name').value.trim(), address:document.getElementById('wod-business-address').value.trim(), googleMapsUrl:document.getElementById('wod-business-url').value.trim(), category:document.getElementById('wod-business-type').value, categoryLabel:BUSINESS_TYPES[document.getElementById('wod-business-type').value] || 'Other POI', lat:Number(document.getElementById('wod-business-lat').value), lng:Number(document.getElementById('wod-business-lng').value) };
    if (!item.name || !Number.isFinite(item.lat) || !Number.isFinite(item.lng)) return setStatus('Manual records require a name, latitude, and longitude.', true);
    selectBusiness(enrichOne(item));
  }

  function renderRecord(item) {
    const target = document.getElementById('wod-display-matrix');
    if (item.optOut) {
      target.innerHTML = `<section class="wod-fast-card"><p class="eyebrow">Mundane disconnect active</p><h3>${escapeHtml(item.name)}</h3><p>This location is an opt-out blackout zone. Supernatural lore is suppressed.</p></section>${governanceCard(item)}`;
      bindGovernance(item); return;
    }
    target.innerHTML = `<section class="wod-fast-card ${claimClass(item.claimStatus)}"><p class="eyebrow">Selected business domain</p><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.address || `${item.lat}, ${item.lng}`)}</p><p><strong>${escapeHtml(item.gothicRegistry)}</strong></p><div class="wod-fast-grid">${field('Public facade',item.publicFacade)}${field('Hidden function',item.hiddenFunction)}${field('Current pressure',item.pressure)}${field('Mechanical seed',item.mechanicalSeed)}${field('Embedded character',item.embeddedCharacter)}${field('Temporal anchor',item.temporalAnchor)}${field('Traumatic catalyst',item.traumaticCatalyst)}${field('Operational secret',item.operationalSecret)}${field('Vulnerability',item.vulnerability)}${field('Sensory anchor',item.sensoryAnchor)}${field('Media feed',item.mediaFeed)}${field('Street rumor',item.rumor)}</div><p><strong>Chronicle key:</strong> <span class="wod-fast-token">${item.entryKey}</span></p><a class="primary-action" target="_blank" rel="noopener" href="${escapeHtml(item.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`)}">Open in Google Maps</a></section>${governanceCard(item)}`;
    bindGovernance(item);
  }

  function field(label,value) { return `<div class="wod-fast-field"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`; }

  function governanceCard(item) {
    return `<section class="wod-fast-card" style="border-left-color:#6441a5"><h3>Registry Governance</h3><label>Status<select id="wod-config-veil"><option value="STANDARD_UNCLAIMED" ${item.claimStatus === 'STANDARD_UNCLAIMED' ? 'selected':''}>Standard Unclaimed</option><option value="SUPPORTIVE" ${item.claimStatus === 'SUPPORTIVE' ? 'selected':''}>Supportive</option><option value="OPT_OUT" ${item.claimStatus === 'OPT_OUT' ? 'selected':''}>Opt-Out</option></select></label><label>Custom public facade<textarea id="wod-config-public-facade" rows="4"></textarea></label><label>Custom hidden function<textarea id="wod-config-hidden-function" rows="4"></textarea></label><div class="wod-fast-actions"><button id="wod-save-local-claim" class="secondary-action">Save Local Override</button><button id="wod-clear-local-claim" class="secondary-action">Clear Override</button><button id="wod-submit-central-registry" class="primary-action">Submit to Central Registry</button></div></section>`;
  }

  function bindGovernance(item) {
    document.getElementById('wod-save-local-claim').onclick = () => {
      const veil = document.getElementById('wod-config-veil').value;
      const submitted_lore = {};
      const facade = document.getElementById('wod-config-public-facade').value.trim(), hidden = document.getElementById('wod-config-hidden-function').value.trim();
      if (facade) submitted_lore.publicFacade = facade; if (hidden) submitted_lore.hiddenFunction = hidden;
      writeStorage(`${STORAGE.localPrefix}${item.entryKey}`, { place_id:item.entryKey, claimed:true, opt_out:veil === 'OPT_OUT', veil_interaction:veil, submitted_lore, updated_at:new Date().toISOString() });
      state.businesses = state.businesses.map(candidate => candidate.entryKey === item.entryKey ? enrichOne(candidate) : candidate); selectByKey(item.entryKey,false);
    };
    document.getElementById('wod-clear-local-claim').onclick = () => { localStorage.removeItem(`${STORAGE.localPrefix}${item.entryKey}`); state.businesses = state.businesses.map(candidate => candidate.entryKey === item.entryKey ? enrichOne(candidate) : candidate); selectByKey(item.entryKey,false); };
    document.getElementById('wod-submit-central-registry').onclick = () => submitRegistryIssue(item);
  }

  function submitRegistryIssue(item) {
    const veil = document.getElementById('wod-config-veil').value;
    const submitted_lore = {};
    const facade = document.getElementById('wod-config-public-facade').value.trim(), hidden = document.getElementById('wod-config-hidden-function').value.trim();
    if (facade) submitted_lore.publicFacade = facade; if (hidden) submitted_lore.hiddenFunction = hidden;
    const patch = { schemaVersion:'1.0.0', target:'data/world-of-darkness/poi_registry.json', entryKey:item.entryKey, entry:{ place_id:item.entryKey, google_external_id:'', place_name:item.name, formatted_address:item.address, google_maps_url:item.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`, primary_type:item.category, coordinates:{lat:item.lat,lng:item.lng}, claimed:veil !== 'STANDARD_UNCLAIMED', opt_out:veil === 'OPT_OUT', veil_interaction:veil, submitted_lore, spatial_token:item.spatialToken, deterministic_seed:item.seed32, core_references:{ locationVariant:item.locationVariant }, submitted_at:new Date().toISOString() } };
    const body = `<!-- WOD_POI_REGISTRY_PATCH -->\n\n\`\`\`json\n${JSON.stringify(patch,null,2)}\n\`\`\`\n`;
    window.open(`https://github.com/${REPOSITORY}/issues/new?title=${encodeURIComponent(`[WOD-POI] ${item.name} (${item.entryKey})`)}&body=${encodeURIComponent(body)}`, '_blank', 'noopener');
    setStatus('A prefilled central-registry issue was opened. Run the manual ingestion workflow with the issue number after submitting it.');
  }

  function claimClass(status) { return status === 'SUPPORTIVE' ? 'supportive' : status === 'OPT_OUT' ? 'opt-out' : ''; }
  function truncate(value,length) { const text = String(value || ''); return text.length > length ? `${text.slice(0,length - 1)}…` : text; }
  function setStatus(message,error = false) { const target = document.getElementById('wod-visible-business-status'); if (!target) return; target.textContent = message; target.classList.toggle('error',error); }

  async function install() {
    if (state.installed) return;
    state.installed = true;
    let attempts = 0;
    while (!buildInterface() && attempts < 100) { attempts += 1; await wait(100); }
    if (!document.getElementById('wod-spatial-engine')) return;
    const view = document.getElementById('world-of-darkness');
    const startWhenActive = () => { if (view.classList.contains('active')) void startEngine(); };
    new MutationObserver(startWhenActive).observe(view,{attributes:true,attributeFilter:['class']});
    document.querySelectorAll('[data-view="world-of-darkness"]').forEach(button => button.addEventListener('click', () => window.setTimeout(startWhenActive,0)));
    startWhenActive();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else void install();
})();
