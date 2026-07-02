(() => {
  'use strict';

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
    view: 'hb-shadowrun-spatial-map-view-v2',
    query: 'hb-shadowrun-spatial-map-query-v2',
    geocode: 'hb-shadowrun-spatial-geocode-v2',
    scans: 'hb-shadowrun-spatial-scans-v2',
    localPrefix: 'hb-shadowrun-spatial-poi-v2:'
  };
  const PLACE_TYPES = {
    restaurant: 'Food / Restaurant',
    bar: 'Bar / Pub',
    night_club: 'Night Club',
    book_store: 'Book Store',
    library: 'Library',
    hospital: 'Healthcare',
    pharmacy: 'Pharmacy',
    cemetery: 'Cemetery',
    park: 'Park / Green Space',
    store: 'Retail',
    lodging: 'Lodging',
    church: 'Religious Site',
    transit_station: 'Transit',
    government: 'Civic / Government',
    office: 'Office',
    industrial: 'Craft / Industrial',
    education: 'Education',
    fuel: 'Fuel / Charging',
    bank: 'Bank / Finance',
    entertainment: 'Entertainment',
    other: 'Other POI'
  };

  const state = {
    installed: false,
    started: false,
    starting: false,
    map: null,
    markerLayer: null,
    places: [],
    selectedKey: '',
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
  const wait = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds));

  function engine() {
    if (!window.ShadowrunSprawlDiscoveryEngine) {
      throw new Error('The Shadowrun sprawl discovery engine is not loaded.');
    }
    return window.ShadowrunSprawlDiscoveryEngine;
  }

  function hash32(input, seed = 0x811c9dc5) {
    let hash = seed >>> 0;
    const text = String(input);
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x85ebca6b);
    hash ^= hash >>> 13;
    hash = Math.imul(hash, 0xc2b2ae35);
    hash ^= hash >>> 16;
    return hash >>> 0;
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
      // Optional browser storage must not block the workspace.
    }
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
    if (!document.querySelector('link[data-sr-spatial-leaflet]') && !document.querySelector('link[data-wod-fast-leaflet]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      link.dataset.srSpatialLeaflet = 'true';
      document.head.appendChild(link);
    }
    return new Promise((resolve, reject) => {
      let sourceIndex = 0;
      const trySource = () => {
        const script = document.createElement('script');
        script.src = LEAFLET_SOURCES[sourceIndex];
        script.async = true;
        script.dataset.srSpatialLeaflet = 'true';
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
    if (document.getElementById('shadowrun-spatial-engine-style')) return;
    const style = document.createElement('style');
    style.id = 'shadowrun-spatial-engine-style';
    style.textContent = `
      .sr-fast-engine{border:1px solid var(--line);border-radius:20px;background:#0b0d12;overflow:hidden;margin:18px 0 28px}
      .sr-fast-header{display:flex;justify-content:space-between;gap:16px;align-items:start;padding:20px 22px 13px;border-bottom:1px solid var(--line)}
      .sr-fast-header h2{margin:.15rem 0 .5rem}.sr-fast-header p{max-width:900px}
      .sr-fast-layout{display:grid;grid-template-columns:minmax(330px,390px) minmax(480px,1fr) minmax(330px,390px);min-height:720px}
      .sr-fast-left,.sr-fast-right{padding:14px;overflow:auto;max-height:820px;background:#101218}
      .sr-fast-left{border-right:1px solid var(--line)}.sr-fast-right{border-left:1px solid var(--line)}
      .sr-fast-center{display:grid;grid-template-rows:auto minmax(620px,1fr) auto;min-width:0;background:#15181e}
      .sr-fast-map{width:100%;height:100%;min-height:620px;background:#15181e;z-index:0}
      .sr-fast-controls{display:grid;grid-template-columns:minmax(180px,1fr) auto auto auto;gap:8px;padding:11px;border-bottom:1px solid var(--line)}
      .sr-fast-controls input,.sr-fast-card input,.sr-fast-card textarea,.sr-fast-card select,.sr-fast-toolbar input,.sr-fast-toolbar select{width:100%;box-sizing:border-box;background:#11151d;border:1px solid var(--line);color:var(--ink);border-radius:9px;padding:9px}
      .sr-fast-footer{padding:9px 12px;border-top:1px solid var(--line);font-size:.78rem;color:var(--muted)}
      .sr-fast-card{background:#181b22;padding:14px;margin:0 0 13px;border:1px solid #333;border-left:5px solid #2bb673;border-radius:11px}
      .sr-fast-card h3{margin-top:0}.sr-fast-card label{display:grid;gap:4px;margin-top:8px;color:var(--muted);font-size:.78rem}
      .sr-fast-grid{display:grid;gap:8px}.sr-fast-field{border-left:3px solid var(--accent);padding:8px;background:#10131a}
      .sr-fast-field strong{display:block;margin-bottom:3px}.sr-fast-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}
      .sr-fast-toolbar{display:grid;gap:8px;margin:10px 0}.sr-fast-toolbar-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}
      .sr-fast-auto{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:.8rem;white-space:nowrap}.sr-fast-auto input{width:auto}
      .sr-fast-status{padding:9px;border:1px solid var(--line);border-radius:9px;color:var(--muted);font-size:.79rem;background:#0d1016}
      .sr-fast-status.error{border-color:#9b3f3f;color:#ffb3b3}.sr-fast-status.success{border-color:#4c9a75;color:#b9f5dc}
      .sr-fast-count{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--accent);font-size:.78rem}
      .sr-fast-list{display:grid;gap:7px;margin-top:9px}.sr-fast-place{width:100%;text-align:left;border:1px solid var(--line);border-left:4px solid #2bb673;border-radius:10px;padding:9px;background:#151820;color:var(--ink);cursor:pointer}
      .sr-fast-place:hover,.sr-fast-place.active{border-color:var(--accent);background:#1d2029}.sr-fast-place.supportive{border-left-color:#6fe2c0}.sr-fast-place.opt-out{border-left-color:#777;filter:saturate(.55)}
      .sr-fast-place h4{margin:0 0 4px}.sr-fast-place p{margin:4px 0;font-size:.77rem;line-height:1.35}
      .sr-fast-pills{display:flex;flex-wrap:wrap;gap:4px;margin:5px 0}.sr-fast-pill{border:1px solid var(--line);border-radius:999px;padding:2px 6px;font-size:.66rem;color:var(--muted)}
      .sr-fast-preview{color:#bfe9d7}.sr-fast-token{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;word-break:break-all;color:var(--accent)}
      .sr-fast-marker{display:grid;place-items:center;width:23px;height:23px;border-radius:50%;border:2px solid #fff;background:#1b8f5a;color:#fff;font-size:11px;font-weight:900;box-shadow:0 2px 8px #000}
      .sr-fast-marker.supportive{background:#00a98f}.sr-fast-marker.opt-out{background:#666}
      .sr-fast-links{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.sr-fast-links a{text-decoration:none;text-align:center}
      .leaflet-popup-content-wrapper,.leaflet-popup-tip{background:#151820;color:#eee}.leaflet-container a{color:#61d8a0}
      @media(max-width:1450px){.sr-fast-layout{grid-template-columns:minmax(320px,390px) minmax(480px,1fr)}.sr-fast-right{grid-column:1/-1;max-height:500px;border-left:0;border-top:1px solid var(--line)}.sr-fast-list{grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}}
      @media(max-width:980px){.sr-fast-layout{grid-template-columns:1fr}.sr-fast-left,.sr-fast-right{max-height:none;border:0;border-bottom:1px solid var(--line)}.sr-fast-center{grid-template-rows:auto 500px auto}.sr-fast-map{min-height:500px}.sr-fast-controls,.sr-fast-links{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function focusOptions() {
    return Object.entries(engine().focusProfiles)
      .map(([id, label]) => `<option value="${escapeHtml(id)}">${escapeHtml(label)}</option>`)
      .join('');
  }

  function threatOptions() {
    return Object.entries(engine().threatProfiles)
      .map(([id, label]) => `<option value="${escapeHtml(id)}">${escapeHtml(label)}</option>`)
      .join('');
  }

  function buildPanel() {
    const view = document.getElementById('shadowrun');
    if (!view) return false;
    if (document.getElementById('shadowrun-sprawl-discovery-panel')) return true;
    injectStyles();
    const query = localStorage.getItem(STORAGE.query) || 'Seattle, Washington - Pioneer Square';
    const panel = document.createElement('section');
    panel.id = 'shadowrun-sprawl-discovery-panel';
    panel.className = 'sr-fast-engine no-print';
    panel.hidden = true;
    panel.setAttribute('aria-labelledby', 'sr-spatial-title');
    panel.innerHTML = `
      <header class="sr-fast-header">
        <div><p class="eyebrow">Map-first spatial workspace</p><h2 id="sr-spatial-title">Street View Sprawl Discovery</h2><p>The Shadowrun editor now follows the Chronicle Spatial Engine workflow: position the live map first, scan the visible area only when ready, select real locations, and develop deterministic run-ready overlays without a map API key.</p></div>
        <button type="button" class="secondary-action" data-sr-spatial-close>Hide</button>
      </header>
      <div class="sr-fast-layout">
        <aside class="sr-fast-left">
          <section class="sr-fast-card"><label>Discovery focus<select id="sr-spatial-focus">${focusOptions()}</select></label><label>Threat profile<select id="sr-spatial-threat">${threatOptions()}</select></label></section>
          <div id="sr-spatial-display"><section class="sr-fast-card"><h3>No Location Selected</h3><p>Select a visible place after scanning to open its complete deterministic Shadowrun record.</p></section></div>
          <details class="sr-fast-card"><summary>Manual location capture</summary><label>Name<input id="sr-spatial-place-name"></label><label>Address<input id="sr-spatial-place-address"></label><label>Reference URL<input id="sr-spatial-place-url"></label><label>Type<select id="sr-spatial-place-type">${Object.entries(PLACE_TYPES).map(([id, label]) => `<option value="${id}">${escapeHtml(label)}</option>`).join('')}</select></label><label>Latitude<input id="sr-spatial-place-lat" type="number" step=".000001"></label><label>Longitude<input id="sr-spatial-place-lng" type="number" step=".000001"></label><button id="sr-spatial-resolve-place" class="secondary-action">Generate Manual Record</button></details>
          <section class="sr-fast-card"><h3>Workspace Exports</h3><p>Export the current scanned overlay with the same deterministic records shown in the editor.</p><div class="sr-fast-actions"><button type="button" class="secondary-action" data-sr-spatial-copy disabled>Copy JSON</button><button type="button" class="secondary-action" data-sr-spatial-download-json disabled>JSON</button><button type="button" class="secondary-action" data-sr-spatial-download-geojson disabled>GeoJSON</button><button type="button" class="secondary-action" data-sr-spatial-download-kml disabled>KML</button></div></section>
        </aside>
        <section class="sr-fast-center">
          <div class="sr-fast-controls"><input id="sr-spatial-map-query" type="search" value="${escapeHtml(query)}" placeholder="City, address, neighborhood, or coordinates"><button id="sr-spatial-move-map" class="primary-action">Move Map</button><button id="sr-spatial-open-google-maps" class="secondary-action">Open Google Maps</button><button id="sr-spatial-use-browser-location" class="secondary-action">Use My Location</button></div>
          <div id="sr-spatial-map" class="sr-fast-map" aria-label="Street View Sprawl Discovery map"><div style="display:grid;place-content:center;height:100%;color:var(--muted)">Loading lightweight map…</div></div>
          <div class="sr-fast-footer">Map data © OpenStreetMap contributors. No Google API key is used. Google Maps and Street View open only as outbound convenience links.</div>
        </section>
        <aside class="sr-fast-right">
          <p class="eyebrow">Visible-place extraction</p><h3>Locations in Current Map View</h3><p class="helper-note">Move the map freely, then scan when ready. Auto-scan starts disabled and is delayed and rate-limited when enabled.</p>
          <div class="sr-fast-toolbar"><div class="sr-fast-toolbar-row"><button id="sr-spatial-scan-visible" class="primary-action" disabled>Scan Visible Area</button><label class="sr-fast-auto"><input id="sr-spatial-auto-scan" type="checkbox"> Auto-scan</label></div><input id="sr-spatial-visible-search" type="search" placeholder="Filter visible locations…"><select id="sr-spatial-visible-type"><option value="all">All visible types</option></select></div>
          <div id="sr-spatial-status" class="sr-fast-status" aria-live="polite">Map is loading. No location scan has started.</div><p id="sr-spatial-count" class="sr-fast-count"></p><div id="sr-spatial-list" class="sr-fast-list"></div>
        </aside>
      </div>`;
    const controls = view.querySelector('.setting-workspace-controls');
    if (controls) controls.before(panel);
    else view.appendChild(panel);
    bindInterface(panel);
    return true;
  }

  function bindInterface(panel) {
    panel.querySelector('[data-sr-spatial-close]').addEventListener('click', () => { panel.hidden = true; });
    document.getElementById('sr-spatial-move-map').addEventListener('click', () => geocodeAndMove(document.getElementById('sr-spatial-map-query').value));
    document.getElementById('sr-spatial-map-query').addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        void geocodeAndMove(event.target.value);
      }
    });
    document.getElementById('sr-spatial-open-google-maps').addEventListener('click', () => {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(document.getElementById('sr-spatial-map-query').value)}`, '_blank', 'noopener');
    });
    document.getElementById('sr-spatial-use-browser-location').addEventListener('click', useBrowserLocation);
    document.getElementById('sr-spatial-scan-visible').addEventListener('click', () => scanVisiblePlaces({ force: true, manual: true }));
    document.getElementById('sr-spatial-auto-scan').addEventListener('change', event => {
      window.clearTimeout(state.scanTimer);
      if (event.target.checked) {
        setStatus('Auto-scan enabled. It waits until the map has been idle and will not scan more than once every twelve seconds.');
        scheduleAutoScan();
      } else {
        setStatus('Auto-scan disabled. Move the map freely and press Scan Visible Area when ready.');
      }
    });
    document.getElementById('sr-spatial-visible-search').addEventListener('input', renderPlaces);
    document.getElementById('sr-spatial-visible-type').addEventListener('change', renderPlaces);
    document.getElementById('sr-spatial-focus').addEventListener('change', refreshEnrichment);
    document.getElementById('sr-spatial-threat').addEventListener('change', refreshEnrichment);
    document.getElementById('sr-spatial-resolve-place').addEventListener('click', resolveManualPlace);
    panel.querySelector('[data-sr-spatial-copy]').addEventListener('click', copyJson);
    panel.querySelector('[data-sr-spatial-download-json]').addEventListener('click', () => downloadExport('json'));
    panel.querySelector('[data-sr-spatial-download-geojson]').addEventListener('click', () => downloadExport('geojson'));
    panel.querySelector('[data-sr-spatial-download-kml]').addEventListener('click', () => downloadExport('kml'));
  }

  async function startEngine() {
    if (state.started || state.starting) return;
    state.starting = true;
    try {
      const L = await loadLeaflet();
      initializeMap(L);
      state.started = true;
      document.getElementById('sr-spatial-scan-visible').disabled = false;
      setStatus('Map ready. Position the viewport, then press Scan Visible Area.');
    } catch (error) {
      setStatus(`Map failed to initialize: ${error.message}`, true);
    } finally {
      state.starting = false;
    }
  }

  function initializeMap(L) {
    const element = document.getElementById('sr-spatial-map');
    element.innerHTML = '';
    const stored = readStorage(STORAGE.view, DEFAULT_VIEW);
    const view = Number.isFinite(stored?.lat) && Number.isFinite(stored?.lng) ? stored : DEFAULT_VIEW;
    state.map = L.map(element, {
      zoomControl: true,
      preferCanvas: true,
      fadeAnimation: false,
      zoomAnimation: false,
      markerZoomAnimation: false
    }).setView([view.lat, view.lng], view.zoom || 15);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      updateWhenIdle: true,
      updateWhenZooming: false,
      keepBuffer: 1,
      detectRetina: false,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(state.map);
    state.markerLayer = L.layerGroup().addTo(state.map);
    state.map.on('moveend zoomend', () => {
      const center = state.map.getCenter();
      writeStorage(STORAGE.view, { lat: center.lat, lng: center.lng, zoom: state.map.getZoom() });
      if (document.getElementById('sr-spatial-auto-scan').checked) scheduleAutoScan();
    });
  }

  function scheduleAutoScan() {
    window.clearTimeout(state.scanTimer);
    if (!state.map || !document.getElementById('sr-spatial-auto-scan').checked) return;
    if (state.map.getZoom() < MIN_AUTO_SCAN_ZOOM) {
      setStatus(`Auto-scan is paused below zoom ${MIN_AUTO_SCAN_ZOOM}. Zoom closer or use the manual scan button.`);
      return;
    }
    const elapsed = Date.now() - state.lastScanAt;
    const cooldown = Math.max(0, AUTO_SCAN_COOLDOWN_MS - elapsed);
    state.scanTimer = window.setTimeout(() => scanVisiblePlaces({ manual: false }), AUTO_SCAN_DELAY_MS + cooldown);
  }

  async function geocodeAndMove(query) {
    const text = String(query || '').trim();
    if (!text || !state.map) return;
    localStorage.setItem(STORAGE.query, text);
    const coordinates = text.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (coordinates) {
      state.map.setView([Number(coordinates[1]), Number(coordinates[2])], 16);
      return;
    }
    const cache = readStorage(STORAGE.geocode, {});
    const key = normalize(text);
    if (cache[key] && Date.now() - cache[key].storedAt < 30 * 24 * 60 * 60 * 1000) {
      state.map.setView([cache[key].lat, cache[key].lng], 16);
      return;
    }
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
      const lat = Number(results[0].lat);
      const lng = Number(results[0].lon);
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
      setStatus('Browser location loaded. No location scan has started.');
    }, error => setStatus(`Browser location failed: ${error.message || 'permission denied'}`, true), {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000
    });
  }

  function boundsSignature(bounds, zoom) {
    return [zoom, bounds.getSouth().toFixed(3), bounds.getWest().toFixed(3), bounds.getNorth().toFixed(3), bounds.getEast().toFixed(3)].join(':');
  }

  function overpassQuery(bounds) {
    const bbox = [bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast()].map(value => value.toFixed(6)).join(',');
    return `[out:json][timeout:18];(nwr["name"]["amenity"](${bbox});nwr["name"]["shop"](${bbox});nwr["name"]["tourism"](${bbox});nwr["name"]["office"](${bbox});nwr["name"]["healthcare"](${bbox});nwr["name"]["leisure"](${bbox});nwr["name"]["craft"](${bbox}););out center tags qt;`;
  }

  async function scanVisiblePlaces(options = {}) {
    if (!state.map) return;
    const zoom = state.map.getZoom();
    const minimumZoom = options.manual ? MIN_MANUAL_SCAN_ZOOM : MIN_AUTO_SCAN_ZOOM;
    if (zoom < minimumZoom) return setStatus(`Zoom to ${minimumZoom} or closer before ${options.manual ? 'scanning' : 'auto-scanning'} locations.`);
    const bounds = state.map.getBounds();
    if ((bounds.getNorth() - bounds.getSouth()) > 0.16 || (bounds.getEast() - bounds.getWest()) > 0.24) return setStatus('The visible area is too large. Zoom in before scanning.');
    const signature = boundsSignature(bounds, zoom);
    if (!options.force && signature === state.lastScanSignature) return setStatus('This viewport has already been scanned. Move the map or use Scan Visible Area to force a refresh.');
    const cache = readStorage(STORAGE.scans, {});
    if (!options.force && cache[signature] && Date.now() - cache[signature].storedAt < CACHE_TTL_MS) {
      state.places = cache[signature].places;
      state.lastScanSignature = signature;
      enrichPlaces();
      updateTypeFilter();
      renderPlaces();
      setExportState(state.places.length === 0);
      return setStatus(`Loaded ${state.places.length} locations from the ten-minute viewport cache.`, false, true);
    }
    window.clearTimeout(state.scanTimer);
    state.scanController?.abort();
    const sequence = ++state.scanSequence;
    state.scanController = new AbortController();
    setStatus('Scanning visible locations… the map remains interactive while this request runs.');
    let payload = null;
    let lastError = null;
    for (const endpoint of OVERPASS_ENDPOINTS) {
      const timeout = window.setTimeout(() => state.scanController?.abort(), 22000);
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          body: new URLSearchParams({ data: overpassQuery(bounds) }),
          signal: state.scanController.signal,
          headers: { Accept: 'application/json' }
        });
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
    if (!payload) return setStatus(`Visible-area scan failed: ${lastError?.message || 'no data source responded'}.`, true);
    const rawPlaces = normalizeElements(payload.elements || [], state.map.getCenter());
    state.places = rawPlaces;
    state.lastScanAt = Date.now();
    state.lastScanSignature = signature;
    enrichPlaces();
    updateTypeFilter();
    renderPlaces();
    cache[signature] = { storedAt: Date.now(), places: rawPlaces };
    writeStorage(STORAGE.scans, Object.fromEntries(Object.entries(cache).sort((left, right) => right[1].storedAt - left[1].storedAt).slice(0, 16)));
    setExportState(state.places.length === 0);
    setStatus(`Found ${state.places.length} named businesses and civic locations. Auto-scan remains ${document.getElementById('sr-spatial-auto-scan').checked ? 'enabled with throttling' : 'off'}.`, false, true);
  }

  function normalizeElements(elements, center) {
    const unique = new Map();
    for (const element of elements) {
      const tags = element.tags || {};
      const name = tags.name || tags.brand || tags.operator;
      const lat = Number(element.lat ?? element.center?.lat);
      const lng = Number(element.lon ?? element.center?.lon);
      if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const osmKey = `${element.type}/${element.id}`;
      if (unique.has(osmKey)) continue;
      const category = detectCategory(tags);
      unique.set(osmKey, {
        osmKey,
        name,
        address: addressFrom(tags),
        lat,
        lng,
        category,
        categoryLabel: PLACE_TYPES[category] || 'Other POI',
        distance: center.distanceTo([lat, lng]),
        googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
        streetViewUrl: engine().streetViewUrl(lat, lng)
      });
    }
    return [...unique.values()].sort((left, right) => left.distance - right.distance || left.name.localeCompare(right.name)).slice(0, MAX_RESULTS);
  }

  function addressFrom(tags) {
    if (tags['addr:full']) return tags['addr:full'];
    return [
      [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' '),
      tags['addr:city'] || tags['addr:town'] || tags['addr:village'],
      tags['addr:state'],
      tags['addr:postcode']
    ].filter(Boolean).join(', ');
  }

  function detectCategory(tags) {
    const amenity = tags.amenity;
    const shop = tags.shop;
    const tourism = tags.tourism;
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
    if (['school', 'college', 'university', 'kindergarten'].includes(amenity)) return 'education';
    if (['fuel', 'charging_station'].includes(amenity)) return 'fuel';
    if (['bank', 'atm', 'bureau_de_change'].includes(amenity)) return 'bank';
    if (['cinema', 'theatre', 'arts_centre', 'community_centre'].includes(amenity) || tags.leisure) return 'entertainment';
    if (shop === 'books') return 'book_store';
    if (shop) return 'store';
    if (['hotel', 'motel', 'hostel', 'guest_house'].includes(tourism)) return 'lodging';
    if (tags.office) return 'office';
    if (tags.craft) return 'industrial';
    return 'other';
  }

  function enrichOne(place) {
    const focus = document.getElementById('sr-spatial-focus')?.value || 'balanced';
    const threat = document.getElementById('sr-spatial-threat')?.value || 'standard';
    const canonical = [normalize(place.name), normalize(place.address), Number(place.lat).toFixed(6), Number(place.lng).toFixed(6), place.category].join('|');
    const entryKey = `srpoi-${hash32(canonical, 0x51f15e).toString(16).padStart(8, '0')}`;
    const seed = `${entryKey}|${focus}|${threat}`;
    const generatedPackage = engine().generateSprawlDiscovery({
      seed,
      label: place.name,
      lat: Number(place.lat),
      lng: Number(place.lng),
      radiusMeters: 120,
      count: 1,
      focus,
      threat
    });
    const generated = generatedPackage.sites[0];
    const local = readStorage(`${STORAGE.localPrefix}${entryKey}`, null);
    const status = local?.status || 'STANDARD_UNCLAIMED';
    const publicFacade = local?.publicFacade || `${place.name} is a real-world ${String(place.categoryLabel || 'location').toLowerCase()}${place.address ? ` at ${place.address}` : ''}.`;
    const shadowUse = local?.shadowUse || generated.shadowUse;
    return {
      ...place,
      entryKey,
      siteKey: entryKey,
      coordinates: { lat: Number(place.lat), lng: Number(place.lng) },
      focus,
      focusLabel: generatedPackage.focusLabel,
      threat,
      threatLabel: generatedPackage.threatLabel,
      archetypeId: generated.archetypeId,
      archetypeName: generated.name.replace(/\s+\d+$/, ''),
      shadowCategory: generated.category,
      publicFacade,
      shadowUse,
      accessVector: generated.accessVector,
      security: generated.security,
      matrix: generated.matrix,
      magical: generated.magical,
      clues: generated.clues,
      complication: generated.complication,
      legwork: generated.legwork,
      relatedSites: [],
      mapsUrl: place.googleMapsUrl || engine().mapsUrl(place.lat, place.lng),
      streetViewUrl: place.streetViewUrl || engine().streetViewUrl(place.lat, place.lng),
      tags: [place.category, generated.category.toLowerCase(), focus, threat],
      status,
      optOut: status === 'OPT_OUT'
    };
  }

  function enrichPlaces() {
    state.places = state.places.map(place => enrichOne(place));
    attachRelatedPlaces();
  }

  function attachRelatedPlaces() {
    for (const place of state.places) {
      place.relatedSites = state.places
        .filter(candidate => candidate.entryKey !== place.entryKey)
        .map(candidate => ({ candidate, distance: distanceMeters(place, candidate) }))
        .sort((left, right) => left.distance - right.distance)
        .slice(0, 2)
        .map(({ candidate }) => ({ siteKey: candidate.entryKey, name: candidate.name, reason: 'nearby operational overlap' }));
    }
  }

  function distanceMeters(left, right) {
    const radians = value => value * Math.PI / 180;
    const dLat = radians(Number(right.lat) - Number(left.lat));
    const dLng = radians(Number(right.lng) - Number(left.lng));
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(Number(left.lat))) * Math.cos(radians(Number(right.lat))) * Math.sin(dLng / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function refreshEnrichment() {
    if (!state.places.length) return;
    enrichPlaces();
    renderPlaces();
    if (state.selectedKey) selectByKey(state.selectedKey, false);
  }

  function updateTypeFilter() {
    const select = document.getElementById('sr-spatial-visible-type');
    const previous = select.value;
    const types = [...new Set(state.places.map(item => item.category))].sort((left, right) => (PLACE_TYPES[left] || left).localeCompare(PLACE_TYPES[right] || right));
    select.innerHTML = '<option value="all">All visible types</option>' + types.map(type => `<option value="${escapeHtml(type)}">${escapeHtml(PLACE_TYPES[type] || type)}</option>`).join('');
    select.value = types.includes(previous) ? previous : 'all';
  }

  function filteredPlaces() {
    const query = normalize(document.getElementById('sr-spatial-visible-search').value);
    const type = document.getElementById('sr-spatial-visible-type').value;
    return state.places.filter(item => (type === 'all' || item.category === type) && (!query || [
      item.name,
      item.address,
      item.categoryLabel,
      item.shadowCategory,
      item.shadowUse,
      item.complication,
      item.security,
      item.matrix,
      item.magical
    ].some(value => normalize(value).includes(query))));
  }

  function renderPlaces() {
    const list = document.getElementById('sr-spatial-list');
    const count = document.getElementById('sr-spatial-count');
    if (!list || !count) return;
    const items = filteredPlaces();
    count.textContent = `${items.length} of ${state.places.length} locations shown.`;
    list.innerHTML = items.length ? '' : '<p class="helper-note">No matching locations. Move the map, scan manually, or clear the filters.</p>';
    items.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `sr-fast-place ${statusClass(item.status)} ${item.entryKey === state.selectedKey ? 'active' : ''}`;
      button.innerHTML = `<h4>${escapeHtml(item.name)}</h4><p>${escapeHtml(item.address || `${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}`)}</p><div class="sr-fast-pills"><span class="sr-fast-pill">${escapeHtml(item.categoryLabel)}</span><span class="sr-fast-pill">${escapeHtml(item.shadowCategory)}</span><span class="sr-fast-pill">${escapeHtml(item.threatLabel)}</span></div><p><strong>${escapeHtml(item.archetypeName)}</strong></p><p class="sr-fast-preview">${escapeHtml(truncate(item.shadowUse, 190))}</p><p><strong>Complication:</strong> ${escapeHtml(truncate(item.complication, 130))}</p>`;
      button.addEventListener('click', () => selectPlace(item));
      list.appendChild(button);
    });
    renderMarkers(items);
  }

  function renderMarkers(items) {
    if (!state.markerLayer || !window.L) return;
    state.markerLayer.clearLayers();
    items.forEach((item, index) => {
      const icon = window.L.divIcon({
        className: '',
        html: `<div class="sr-fast-marker ${statusClass(item.status)}">${index + 1}</div>`,
        iconSize: [27, 27],
        iconAnchor: [13, 13]
      });
      const marker = window.L.marker([item.lat, item.lng], { icon, title: item.name })
        .bindPopup(`<strong>${escapeHtml(item.name)}</strong><br>${escapeHtml(item.archetypeName)}<br><small>${escapeHtml(item.complication)}</small>`);
      marker.on('click', () => selectPlace(item, false));
      marker.addTo(state.markerLayer);
      item.marker = marker;
    });
  }

  function selectByKey(key, move = true) {
    const item = state.places.find(candidate => candidate.entryKey === key);
    if (item) selectPlace(item, move);
  }

  function selectPlace(item, move = true) {
    state.selectedKey = item.entryKey;
    if (move && state.map) state.map.setView([item.lat, item.lng], Math.max(state.map.getZoom(), 17));
    item.marker?.openPopup();
    populateManualFields(item);
    renderRecord(item);
    renderPlaces();
  }

  function populateManualFields(item) {
    document.getElementById('sr-spatial-place-name').value = item.name;
    document.getElementById('sr-spatial-place-address').value = item.address || '';
    document.getElementById('sr-spatial-place-url').value = item.googleMapsUrl || '';
    document.getElementById('sr-spatial-place-lat').value = Number(item.lat).toFixed(6);
    document.getElementById('sr-spatial-place-lng').value = Number(item.lng).toFixed(6);
    const select = document.getElementById('sr-spatial-place-type');
    if (![...select.options].some(option => option.value === item.category)) select.add(new Option(item.categoryLabel, item.category));
    select.value = item.category;
  }

  function resolveManualPlace() {
    const item = {
      name: document.getElementById('sr-spatial-place-name').value.trim(),
      address: document.getElementById('sr-spatial-place-address').value.trim(),
      googleMapsUrl: document.getElementById('sr-spatial-place-url').value.trim(),
      category: document.getElementById('sr-spatial-place-type').value,
      categoryLabel: PLACE_TYPES[document.getElementById('sr-spatial-place-type').value] || 'Other POI',
      lat: Number(document.getElementById('sr-spatial-place-lat').value),
      lng: Number(document.getElementById('sr-spatial-place-lng').value)
    };
    if (!item.name || !Number.isFinite(item.lat) || !Number.isFinite(item.lng)) return setStatus('Manual records require a name, latitude, and longitude.', true);
    item.streetViewUrl = engine().streetViewUrl(item.lat, item.lng);
    const enriched = enrichOne(item);
    const existingIndex = state.places.findIndex(candidate => candidate.entryKey === enriched.entryKey);
    if (existingIndex >= 0) state.places.splice(existingIndex, 1, enriched);
    else state.places.unshift(enriched);
    attachRelatedPlaces();
    updateTypeFilter();
    setExportState(false);
    selectPlace(enriched);
    setStatus('Manual location record generated.', false, true);
  }

  function renderRecord(item) {
    const target = document.getElementById('sr-spatial-display');
    if (!target) return;
    if (item.optOut) {
      target.innerHTML = `<section class="sr-fast-card"><p class="eyebrow">Overlay exclusion active</p><h3>${escapeHtml(item.name)}</h3><p>This location remains visible on the map but its Shadowrun overlay is suppressed by the local workspace setting.</p></section>${overrideCard(item)}`;
      bindOverrides(item);
      return;
    }
    const related = (item.relatedSites || []).map(relatedItem => `${relatedItem.name} (${relatedItem.reason})`).join('; ') || 'No nearby relation generated.';
    target.innerHTML = `<section class="sr-fast-card ${statusClass(item.status)}"><p class="eyebrow">Selected sprawl domain</p><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.address || `${item.lat}, ${item.lng}`)}</p><div class="sr-fast-pills"><span class="sr-fast-pill">${escapeHtml(item.categoryLabel)}</span><span class="sr-fast-pill">${escapeHtml(item.shadowCategory)}</span><span class="sr-fast-pill">${escapeHtml(item.focusLabel)}</span><span class="sr-fast-pill">${escapeHtml(item.threatLabel)}</span></div><div class="sr-fast-grid">${field('Public facade', item.publicFacade)}${field('Shadow use', item.shadowUse)}${field('Access vector', item.accessVector)}${field('Security posture', item.security)}${field('Matrix surface', item.matrix)}${field('Magical surface', item.magical)}${field('Clues', item.clues.join(' | '))}${field('Complication', item.complication)}${field('Legwork', item.legwork.join(' | '))}${field('Related nearby sites', related)}${field('Coordinates', `${item.lat}, ${item.lng}`)}</div><p><strong>Sprawl key:</strong> <span class="sr-fast-token">${escapeHtml(item.entryKey)}</span></p><div class="sr-fast-links"><a class="primary-action" target="_blank" rel="noopener" href="${escapeHtml(item.mapsUrl)}">Open Google Maps</a><a class="secondary-action" target="_blank" rel="noopener" href="${escapeHtml(item.streetViewUrl)}">Open Street View</a></div></section>${overrideCard(item)}`;
    bindOverrides(item);
  }

  function field(label, value) {
    return `<div class="sr-fast-field"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`;
  }

  function overrideCard(item) {
    return `<section class="sr-fast-card" style="border-left-color:#6441a5"><h3>Workspace Location Override</h3><label>Status<select id="sr-spatial-config-status"><option value="STANDARD_UNCLAIMED" ${item.status === 'STANDARD_UNCLAIMED' ? 'selected' : ''}>Standard</option><option value="SUPPORTIVE" ${item.status === 'SUPPORTIVE' ? 'selected' : ''}>Trusted / Supportive</option><option value="OPT_OUT" ${item.status === 'OPT_OUT' ? 'selected' : ''}>Exclude Overlay</option></select></label><label>Custom public facade<textarea id="sr-spatial-config-facade" rows="4">${escapeHtml(item.publicFacade)}</textarea></label><label>Custom shadow use<textarea id="sr-spatial-config-shadow-use" rows="4">${escapeHtml(item.shadowUse)}</textarea></label><div class="sr-fast-actions"><button id="sr-spatial-save-override" class="secondary-action">Save Local Override</button><button id="sr-spatial-clear-override" class="secondary-action">Clear Override</button></div></section>`;
  }

  function bindOverrides(item) {
    document.getElementById('sr-spatial-save-override').onclick = () => {
      writeStorage(`${STORAGE.localPrefix}${item.entryKey}`, {
        status: document.getElementById('sr-spatial-config-status').value,
        publicFacade: document.getElementById('sr-spatial-config-facade').value.trim(),
        shadowUse: document.getElementById('sr-spatial-config-shadow-use').value.trim(),
        updatedAt: new Date().toISOString()
      });
      state.places = state.places.map(candidate => candidate.entryKey === item.entryKey ? enrichOne(candidate) : candidate);
      attachRelatedPlaces();
      selectByKey(item.entryKey, false);
      setStatus('Local location override saved.', false, true);
    };
    document.getElementById('sr-spatial-clear-override').onclick = () => {
      localStorage.removeItem(`${STORAGE.localPrefix}${item.entryKey}`);
      state.places = state.places.map(candidate => candidate.entryKey === item.entryKey ? enrichOne(candidate) : candidate);
      attachRelatedPlaces();
      selectByKey(item.entryKey, false);
      setStatus('Local location override cleared.', false, true);
    };
  }

  function exportPackage() {
    const center = state.map?.getCenter() || DEFAULT_VIEW;
    const focus = document.getElementById('sr-spatial-focus')?.value || 'balanced';
    const threat = document.getElementById('sr-spatial-threat')?.value || 'standard';
    const packageKey = `srdisc-${hash32(`${center.lat}|${center.lng}|${focus}|${threat}|${state.places.map(item => item.entryKey).join('|')}`, 0x5a17e11a).toString(16).padStart(8, '0')}`;
    return {
      schemaVersion: engine().version,
      packageKey,
      module: 'shadowrun-sprawl-street-view-discovery',
      origin: { label: document.getElementById('sr-spatial-map-query')?.value || 'Current map view', lat: Number(center.lat.toFixed(6)), lng: Number(center.lng.toFixed(6)) },
      focus,
      focusLabel: engine().focusProfiles[focus],
      threat,
      threatLabel: engine().threatProfiles[threat],
      transparency: {
        generationModel: 'real OpenStreetMap locations plus deterministic Shadowrun overlays',
        externalDataRequired: true,
        apiKeysRequired: false,
        mapLinks: 'Google Maps and Street View links are outbound convenience links only.'
      },
      summary: { siteCount: state.places.length },
      sites: state.places.map(({ marker, distance, googleMapsUrl, ...item }) => ({
        ...item,
        distanceMeters: Math.round(distance || 0)
      }))
    };
  }

  function setExportState(disabled) {
    document.querySelectorAll('[data-sr-spatial-copy], [data-sr-spatial-download-json], [data-sr-spatial-download-geojson], [data-sr-spatial-download-kml]')
      .forEach(button => { button.disabled = disabled; });
  }

  async function copyJson() {
    if (!state.places.length) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(JSON.stringify(exportPackage(), null, 2));
      setStatus('Current sprawl overlay copied as JSON.', false, true);
    } catch (_) {
      setStatus('Clipboard access was not available; use the download controls instead.', true);
    }
  }

  function safeFileName(value) {
    return String(value || 'shadowrun-sprawl-discovery').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90);
  }

  function download(name, type, content) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function downloadExport(kind) {
    if (!state.places.length) return;
    const pkg = exportPackage();
    const base = safeFileName(pkg.packageKey);
    if (kind === 'geojson') {
      download(`${base}.geojson`, 'application/geo+json', JSON.stringify(engine().buildGeoJson(pkg), null, 2));
      return;
    }
    if (kind === 'kml') {
      download(`${base}.kml`, 'application/vnd.google-earth.kml+xml', engine().buildKml(pkg));
      return;
    }
    download(`${base}.json`, 'application/json', JSON.stringify(pkg, null, 2));
  }

  function statusClass(status) {
    return status === 'SUPPORTIVE' ? 'supportive' : status === 'OPT_OUT' ? 'opt-out' : '';
  }

  function truncate(value, length) {
    const text = String(value || '');
    return text.length > length ? `${text.slice(0, length - 1)}…` : text;
  }

  function setStatus(message, error = false, success = false) {
    const target = document.getElementById('sr-spatial-status');
    if (!target) return;
    target.textContent = message;
    target.classList.toggle('error', error);
    target.classList.toggle('success', success && !error);
  }

  function openPanel() {
    if (!buildPanel()) throw new Error('The Shadowrun workspace is not ready yet.');
    const panel = document.getElementById('shadowrun-sprawl-discovery-panel');
    panel.hidden = false;
    void startEngine().then(() => window.setTimeout(() => state.map?.invalidateSize(), 0));
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return state.places;
  }

  async function install() {
    if (state.installed) return;
    state.installed = true;
    let attempts = 0;
    while (!buildPanel() && attempts < 100) {
      attempts += 1;
      await wait(100);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else void install();

  window.ShadowrunSprawlDiscovery = Object.freeze({
    openPanel,
    scanVisiblePlaces,
    getCurrentPackage: exportPackage,
    getSelectedSite: () => state.places.find(item => item.entryKey === state.selectedKey) || null
  });
})();
