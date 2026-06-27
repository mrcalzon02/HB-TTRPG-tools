(() => {
  'use strict';

  const LEAFLET_VERSION = '1.9.4';
  const LEAFLET_JS_SOURCES = [
    `https://cdn.jsdelivr.net/npm/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`,
    `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`
  ];
  const LEAFLET_CSS_SOURCES = [
    `https://cdn.jsdelivr.net/npm/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`,
    `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`
  ];
  const OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];
  const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
  const DEFAULT_VIEW = { lat: 47.6016, lng: -122.3334, zoom: 15 };
  const MIN_SCAN_ZOOM = 14;
  const SCRIPT_TIMEOUT_MS = 8000;
  const STORAGE = {
    view: 'hb-wod-inventory-map-view-v2',
    query: 'hb-wod-inventory-map-query-v2',
    geocode: 'hb-wod-inventory-geocode-v2'
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
  const LOCATION_TYPES = {
    restaurant: 'Food / Restaurant', bar: 'Bar / Pub', night_club: 'Night Club',
    book_store: 'Book Store', library: 'Library', hospital: 'Healthcare', pharmacy: 'Pharmacy',
    cemetery: 'Cemetery', park: 'Park / Green Space', store: 'Retail', lodging: 'Lodging',
    church: 'Religious Site', transit_station: 'Transit', government: 'Civic / Government',
    office: 'Office', industrial: 'Craft / Industrial', natural_feature: 'Natural Feature',
    road: 'Road / Route', education: 'Education', historic: 'Historic Site', other: 'Other Named Location'
  };
  const INVENTORY_LABELS = {
    MUNDANE: 'Mundane / No Known Connection',
    TANGENTIAL: 'Tangential / Peripheral Association',
    ACTIVE_UNREGISTERED: 'Active but Unregistered',
    INVENTORIED: 'Formally Inventoried'
  };

  const state = {
    map: null,
    latestScan: null,
    scanController: null,
    scanSequence: 0,
    lastGeocodeAt: 0,
    installed: false
  };

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  const normalize = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const wait = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds));

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
      // Optional browser persistence must never block the map.
    }
  }

  function setStatus(message, error = false) {
    const target = document.getElementById('wod-visible-business-status');
    if (!target) return;
    target.textContent = message;
    target.classList.toggle('error', error);
  }

  function injectStyles() {
    if (document.getElementById('wod-lightweight-map-style')) return;
    const style = document.createElement('style');
    style.id = 'wod-lightweight-map-style';
    style.textContent = `
      .wod-inventory-engine{border:1px solid var(--line);border-radius:20px;background:#0b0d12;overflow:hidden;margin:18px 0 28px}
      .wod-inventory-header{padding:20px 22px 13px;border-bottom:1px solid var(--line)}
      .wod-inventory-header h2{margin:.15rem 0 .5rem}
      .wod-inventory-layout{display:grid;grid-template-columns:minmax(330px,390px) minmax(480px,1fr) minmax(340px,410px);min-height:720px}
      .wod-inventory-left,.wod-inventory-right{padding:14px;overflow:auto;max-height:820px;background:#101218}
      .wod-inventory-left{border-right:1px solid var(--line)}.wod-inventory-right{border-left:1px solid var(--line)}
      .wod-inventory-center{display:grid;grid-template-rows:auto minmax(620px,1fr) auto;min-width:0;background:#15181e}
      .wod-inventory-map{width:100%;height:100%;min-height:620px;background:#15181e;z-index:0}
      .wod-inventory-controls{display:grid;grid-template-columns:minmax(180px,1fr) auto auto auto;gap:8px;padding:11px;border-bottom:1px solid var(--line)}
      .wod-inventory-controls input,.wod-inventory-card input,.wod-inventory-card textarea,.wod-inventory-card select,.wod-inventory-toolbar input,.wod-inventory-toolbar select{width:100%;box-sizing:border-box;background:#11151d;border:1px solid var(--line);color:var(--ink);border-radius:9px;padding:9px}
      .wod-inventory-footer{padding:9px 12px;border-top:1px solid var(--line);font-size:.78rem;color:var(--muted)}
      .wod-inventory-card{background:#181b22;padding:14px;margin:0 0 13px;border:1px solid #333;border-left:5px solid #666;border-radius:11px}
      .wod-inventory-card h3{margin-top:0}.wod-inventory-card label{display:grid;gap:4px;margin-top:8px;color:var(--muted);font-size:.78rem}
      .wod-inventory-grid{display:grid;gap:8px}.wod-inventory-field{border-left:3px solid var(--accent);padding:8px;background:#10131a}.wod-inventory-field strong{display:block;margin-bottom:3px}
      .wod-inventory-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}
      .wod-inventory-toolbar{display:grid;gap:8px;margin:10px 0}.wod-inventory-toolbar-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}
      .wod-inventory-auto{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:.8rem;white-space:nowrap}.wod-inventory-auto input{width:auto}
      .wod-inventory-status{padding:9px;border:1px solid var(--line);border-radius:9px;color:var(--muted);font-size:.79rem;background:#0d1016}.wod-inventory-status.error{border-color:#8b0000;color:#ffb3b3}
      .wod-inventory-count{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--accent);font-size:.78rem}
      .wod-inventory-list{display:grid;gap:7px;margin-top:9px}.wod-inventory-token{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;word-break:break-all;color:var(--accent)}
      .wod-inventory-pill{display:inline-flex;margin:2px 3px 2px 0;padding:2px 6px;border:1px solid #444;border-radius:999px;font-size:.68rem;color:#ddd}
      .wod-inventory-marker{display:grid;place-items:center;width:23px;height:23px;border-radius:50%;border:2px solid #fff;background:#666;color:#fff;font-size:11px;font-weight:900;box-shadow:0 2px 8px #000}
      .wod-inventory-marker.tangential{background:#9b742e}.wod-inventory-marker.active-unregistered{background:#67408f}.wod-inventory-marker.inventoried{background:#8b0000}
      .leaflet-popup-content-wrapper,.leaflet-popup-tip{background:#151820;color:#eee}.leaflet-container a{color:#c9913c}
      @media(max-width:1450px){.wod-inventory-layout{grid-template-columns:minmax(320px,390px) minmax(480px,1fr)}.wod-inventory-right{grid-column:1/-1;max-height:500px;border-left:0;border-top:1px solid var(--line)}.wod-inventory-list{grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}}
      @media(max-width:980px){.wod-inventory-layout{grid-template-columns:1fr}.wod-inventory-left,.wod-inventory-right{max-height:none;border:0;border-bottom:1px solid var(--line)}.wod-inventory-center{grid-template-rows:auto 500px auto}.wod-inventory-map{min-height:500px}.wod-inventory-controls{grid-template-columns:1fr}}
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
    section.className = 'wod-inventory-engine no-print';
    section.innerHTML = `
      <header class="wod-inventory-header">
        <p class="eyebrow">Map-first spatial workspace</p>
        <h2>Chronicle Spatial Engine</h2>
        <p>The map starts without loading Chronicle datasets. Move anywhere first, then discover named locations and hydrate them sequentially from the center outward.</p>
      </header>
      <div class="wod-inventory-layout">
        <aside class="wod-inventory-left">
          <section class="wod-inventory-card"><label>Game line<select id="wod-spatial-line">${Object.entries(LINE_TITLES).map(([id,title]) => `<option value="${id}">${escapeHtml(title)}</option>`).join('')}</select></label></section>
          <div id="wod-display-matrix"><section class="wod-inventory-card"><h3>No Named Location Selected</h3><p>Move the map, discover named locations, and select a completed radial record.</p></section></div>
          <details class="wod-inventory-card"><summary>Manual named-location capture</summary>
            <label>Name<input id="wod-business-name"></label><label>Address<input id="wod-business-address"></label><label>Reference URL<input id="wod-business-url"></label>
            <label>Type<select id="wod-business-type">${Object.entries(LOCATION_TYPES).map(([id,label]) => `<option value="${id}">${escapeHtml(label)}</option>`).join('')}</select></label>
            <label>Latitude<input id="wod-business-lat" type="number" step=".000001"></label><label>Longitude<input id="wod-business-lng" type="number" step=".000001"></label>
            <button id="wod-resolve-business" type="button" class="secondary-action">Generate Manual Record</button>
          </details>
        </aside>
        <section class="wod-inventory-center">
          <div class="wod-inventory-controls">
            <input id="wod-map-query" type="search" value="${escapeHtml(query)}" placeholder="City, address, neighborhood, or coordinates">
            <button id="wod-move-map" type="button" class="primary-action">Move Map</button>
            <button id="wod-open-google-maps" type="button" class="secondary-action">Open Google Maps</button>
            <button id="wod-use-browser-location" type="button" class="secondary-action">Use My Location</button>
          </div>
          <div id="wod-inventory-map" class="wod-inventory-map" aria-label="Chronicle Spatial Engine map"><div style="display:grid;place-content:center;height:100%;color:var(--muted)">Starting map renderer…</div></div>
          <div class="wod-inventory-footer">Map data © OpenStreetMap contributors. No Google API key is used.</div>
        </section>
        <aside class="wod-inventory-right">
          <p class="eyebrow">Visible-place extraction</p><h3>Named Locations in Current Map View</h3>
          <p class="wod-note">The map remains movable until you deliberately scan. Location records then appear one at a time from the current center outward.</p>
          <div class="wod-inventory-toolbar">
            <div class="wod-inventory-toolbar-row"><button id="wod-scan-visible-businesses" type="button" class="primary-action" disabled>Discover Named Locations</button><label class="wod-inventory-auto"><input id="wod-auto-scan-businesses" type="checkbox" disabled> Auto-scan disabled</label></div>
            <input id="wod-visible-business-search" type="search" placeholder="Filter loaded named locations…">
            <select id="wod-visible-business-type"><option value="all">All visible types</option></select>
            <select id="wod-visible-inventory-status"><option value="all">All inventory statuses</option>${Object.entries(INVENTORY_LABELS).map(([id,label]) => `<option value="${id}">${escapeHtml(label)}</option>`).join('')}</select>
          </div>
          <div id="wod-visible-business-status" class="wod-inventory-status" aria-live="polite">Preparing the map only. No Chronicle data is being loaded.</div>
          <p id="wod-visible-business-count" class="wod-inventory-count"></p><div id="wod-visible-business-list" class="wod-inventory-list"></div>
        </aside>
      </div>`;
    oldBox.replaceWith(section);
    bindInterface();
    return true;
  }

  function attachCss(url) {
    return new Promise(resolve => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.dataset.wodLightweightLeaflet = 'true';
      link.onload = () => resolve(true);
      link.onerror = () => resolve(false);
      document.head.appendChild(link);
      window.setTimeout(() => resolve(false), SCRIPT_TIMEOUT_MS);
    });
  }

  function attachScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      let settled = false;
      const finish = callback => value => {
        if (settled) return;
        settled = true;
        callback(value);
      };
      const timeout = window.setTimeout(finish(reject)(new Error(`${new URL(url).hostname} timed out`)), SCRIPT_TIMEOUT_MS);
      script.src = url;
      script.async = true;
      script.dataset.wodLightweightLeaflet = 'true';
      script.onload = finish(value => { window.clearTimeout(timeout); resolve(value); })(window.L);
      script.onerror = finish(() => { window.clearTimeout(timeout); reject(new Error(`${new URL(url).hostname} failed`)); });
      document.head.appendChild(script);
    });
  }

  async function loadLeaflet() {
    if (window.L?.map) return window.L;
    for (const css of LEAFLET_CSS_SOURCES) {
      if (await attachCss(css)) break;
    }
    let lastError = null;
    for (const source of LEAFLET_JS_SOURCES) {
      try {
        const leaflet = await attachScript(source);
        if (leaflet?.map) return leaflet;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('Leaflet could not be loaded from either map-library source.');
  }

  function mapViewport() {
    if (!state.map) return null;
    const bounds = state.map.getBounds();
    const center = state.map.getCenter();
    return {
      zoom: state.map.getZoom(),
      center: { lat: center.lat, lng: center.lng },
      bounds: {
        south: bounds.getSouth(), west: bounds.getWest(),
        north: bounds.getNorth(), east: bounds.getEast()
      }
    };
  }

  function publishMap() {
    window.WODChronicleSpatialMap = state.map;
    document.dispatchEvent(new CustomEvent('wod:spatial-map-ready', {
      detail: { map: state.map, viewport: mapViewport() }
    }));
  }

  function initializeMap(L) {
    const element = document.getElementById('wod-inventory-map');
    element.innerHTML = '';
    const stored = readStorage(STORAGE.view, DEFAULT_VIEW);
    const view = Number.isFinite(stored?.lat) && Number.isFinite(stored?.lng) ? stored : DEFAULT_VIEW;
    state.map = L.map(element, {
      zoomControl: true, preferCanvas: true,
      fadeAnimation: false, zoomAnimation: false, markerZoomAnimation: false
    }).setView([view.lat, view.lng], view.zoom || DEFAULT_VIEW.zoom);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, updateWhenIdle: true, updateWhenZooming: false,
      keepBuffer: 1, detectRetina: false,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(state.map);
    state.map.on('moveend zoomend', () => {
      const center = state.map.getCenter();
      writeStorage(STORAGE.view, { lat: center.lat, lng: center.lng, zoom: state.map.getZoom() });
    });
    document.getElementById('wod-scan-visible-businesses').disabled = false;
    publishMap();
    setStatus('Map ready. Move anywhere, then press Discover Named Locations. Chronicle records are still dormant.');
  }

  async function geocodeAndMove(query) {
    const text = String(query || '').trim();
    if (!text || !state.map) return;
    try { localStorage.setItem(STORAGE.query, text); } catch (_) { /* optional */ }
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
      setStatus('Location found. Reposition the map and scan when ready.');
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
      enableHighAccuracy: false, timeout: 10000, maximumAge: 300000
    });
  }

  function overpassQuery(bounds) {
    const bbox = [bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast()].map(value => value.toFixed(6)).join(',');
    return `[out:json][timeout:18];nwr["name"](${bbox});out center tags qt 700;`;
  }

  async function scanVisibleLocations() {
    if (!state.map) return;
    const zoom = state.map.getZoom();
    if (zoom < MIN_SCAN_ZOOM) return setStatus(`Zoom to ${MIN_SCAN_ZOOM} or closer before scanning.`);
    const bounds = state.map.getBounds();
    if ((bounds.getNorth() - bounds.getSouth()) > 0.16 || (bounds.getEast() - bounds.getWest()) > 0.24) {
      return setStatus('The visible area is too large. Zoom in before scanning.');
    }
    state.scanController?.abort();
    const sequence = ++state.scanSequence;
    state.scanController = new AbortController();
    setStatus('Discovering named locations. The map remains usable…');
    let payload = null;
    let lastError = null;
    for (const endpoint of OVERPASS_ENDPOINTS) {
      const timeout = window.setTimeout(() => state.scanController?.abort(), 22000);
      try {
        const response = await fetch(endpoint, {
          method: 'POST', body: new URLSearchParams({ data: overpassQuery(bounds) }),
          signal: state.scanController.signal, headers: { Accept: 'application/json' }
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
    state.scanController = null;
    if (!payload) return setStatus(`Named-location scan failed: ${lastError?.message || 'all services were unavailable'}.`, true);
    setStatus('Named locations discovered. Chronicle records are loading from the center outward.');
  }

  function bindInterface() {
    document.getElementById('wod-move-map').addEventListener('click', () => void geocodeAndMove(document.getElementById('wod-map-query').value));
    document.getElementById('wod-map-query').addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); void geocodeAndMove(event.target.value); }
    });
    document.getElementById('wod-open-google-maps').addEventListener('click', () => {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(document.getElementById('wod-map-query').value)}`, '_blank', 'noopener');
    });
    document.getElementById('wod-use-browser-location').addEventListener('click', useBrowserLocation);
    document.getElementById('wod-scan-visible-businesses').addEventListener('click', () => void scanVisibleLocations());
  }

  async function install() {
    if (state.installed) return;
    state.installed = true;
    for (let attempt = 0; attempt < 100 && !buildInterface(); attempt += 1) await wait(50);
    if (!document.getElementById('wod-spatial-engine')) return;
    try {
      const leaflet = await loadLeaflet();
      initializeMap(leaflet);
    } catch (error) {
      setStatus(`Map library failed to load: ${error.message}. The rest of the page remains usable.`, true);
      const map = document.getElementById('wod-inventory-map');
      if (map) map.innerHTML = `<div style="display:grid;place-content:center;height:100%;padding:20px;color:#ffb3b3;text-align:center">The map renderer could not be loaded. Retry by reopening the spatial engine.</div>`;
    }
  }

  window.WODLightweightSpatialCore = Object.freeze({
    getMap: () => state.map,
    getViewport: mapViewport,
    getLatestScan: () => state.latestScan,
    setLatestScan: scan => { state.latestScan = scan; },
    scanVisibleLocations
  });
  window.WODNamedLocationBridge = Object.freeze({
    getMap: () => state.map,
    getViewport: mapViewport,
    getLatestScan: () => state.latestScan
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else void install();
})();
