(() => {
  'use strict';

  const STORAGE = {
    apiKey: 'hb-wod-google-maps-api-key-v1',
    mapCenter: 'hb-wod-chronicle-map-center-v1',
    localPrefix: 'hb-wod-poi-v1:',
    generatedPrefix: 'hb-wod-generated-poi-v1:'
  };
  const DEFAULT_CENTER = { lat: 61.2181, lng: -149.9003 };
  const DEFAULT_ZOOM = 14;
  const LINE_TITLES = {
    unified: 'Unified World of Darkness',
    vampire: 'Vampire: The Masquerade',
    werewolf: 'Werewolf: The Apocalypse',
    breeds: 'Werewolf Changing Breeds',
    hunter: 'Hunter: The Reckoning',
    changeling: 'Changeling',
    mage: 'Mage: The Awakening'
  };
  const CLAIM_FLAGS = {
    STANDARD_UNCLAIMED: 'Standard Unclaimed',
    SUPPORTIVE: 'Supportive (Part of the Veil)',
    OPT_OUT: 'Opt-Out (Mundane Disconnect)'
  };

  const state = {
    config: null,
    locations: [],
    characters: [],
    rumors: [],
    centralRegistry: { entries: {} },
    map: null,
    selectedMarker: null,
    selectedPlace: null,
    selectedRecord: null,
    mapsPromise: null,
    initialCenter: null,
    installed: false
  };

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

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

  function loadJson(url) {
    return fetch(url, { cache: 'no-store' }).then(response => {
      if (!response.ok) throw new Error(`${url} returned ${response.status}`);
      return response.json();
    });
  }

  async function loadCoreData() {
    const config = await loadJson('data/world-of-darkness/spatial-engine-config.json');
    const [locations, characters, rumors, centralRegistry] = await Promise.all([
      loadJson(config.coreData.locations),
      loadJson(config.coreData.characters),
      loadJson(config.coreData.rumors),
      loadJson(config.coreData.centralRegistry)
    ]);
    const expandCore = (document, prefix) => {
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
    };
    state.config = config;
    state.locations = expandCore(locations, 'location');
    state.characters = expandCore(characters, 'character');
    state.rumors = expandCore(rumors, 'rumor');
    state.centralRegistry = centralRegistry || { entries: {} };
    updateDataStatus();
  }

  function readInitialCenter(oldBox) {
    const lat = Number(oldBox?.querySelector('#wod-lat')?.value);
    const lng = Number(oldBox?.querySelector('#wod-lon')?.value);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE.mapCenter));
      if (Number.isFinite(stored?.lat) && Number.isFinite(stored?.lng)) return stored;
    } catch (_) {
      // Ignore unreadable map state.
    }
    return DEFAULT_CENTER;
  }

  function buildWorkspace() {
    const view = document.getElementById('world-of-darkness');
    const oldBox = view?.querySelector('.wod-box');
    if (!view || !oldBox) return false;
    if (document.getElementById('wod-spatial-engine')) return true;

    state.initialCenter = readInitialCenter(oldBox);
    injectStyles();

    const workspace = document.createElement('section');
    workspace.id = 'wod-spatial-engine';
    workspace.className = 'wod-spatial-engine no-print';
    workspace.setAttribute('aria-labelledby', 'wod-spatial-title');
    workspace.innerHTML = `
      <header class="wod-spatial-header">
        <p class="eyebrow">Interactive urban overlay</p>
        <h2 id="wod-spatial-title">Chronicle Spatial Engine</h2>
        <p>Move through a live Google map, click a native business or landmark, and resolve its stable World of Darkness registry entry from the business Place ID and geocoded coordinates.</p>
      </header>

      <div class="wod-spatial-setup">
        <label>
          <span>Google Maps JavaScript API key</span>
          <input id="wod-google-api-key" type="password" autocomplete="off" placeholder="Stored only in this browser" />
        </label>
        <button id="wod-load-map" class="primary-action">Load Interactive Google Map</button>
        <button id="wod-forget-map-key" class="secondary-action">Forget Local API Key</button>
        <label>
          <span>Game line interpretation</span>
          <select id="wod-spatial-line">
            ${Object.entries(LINE_TITLES).map(([id, title]) => `<option value="${id}">${escapeHtml(title)}</option>`).join('')}
          </select>
        </label>
      </div>

      <div class="wod-spatial-layout">
        <aside class="wod-spatial-sidebar">
          <section class="wod-pane-card wod-search-card">
            <h3>Move to an Area</h3>
            <p>Search for a city, neighborhood, address, or business. You can then pan and zoom normally and click any labeled point of interest.</p>
            <div class="wod-search-row">
              <input id="wod-place-search" type="search" placeholder="Business, address, neighborhood, city..." />
              <button id="wod-place-search-button" class="secondary-action">Search</button>
            </div>
            <div id="wod-search-results" class="wod-search-results"></div>
          </section>

          <div id="wod-spatial-status" class="wod-status" aria-live="polite">Loading the Chronicle Spatial Engine core datasets…</div>
          <div id="wod-display-matrix">
            <section class="wod-pane-card">
              <h3>No Domain Selected</h3>
              <p>Load the map and click a business icon to extract its deterministic spatial token and hidden matrix variables.</p>
            </section>
          </div>
        </aside>

        <section class="wod-map-shell" aria-label="Interactive Google Maps business overlay">
          <div id="wod-google-map" class="wod-google-map">
            <div class="wod-map-placeholder">
              <h3>Google Maps Not Loaded</h3>
              <p>Enter a browser-restricted Google Maps JavaScript API key and load the map. The key is not committed to the repository.</p>
            </div>
          </div>
          <div class="wod-map-footer">
            <span id="wod-map-center-readout">Awaiting map initialization.</span>
            <button id="wod-use-browser-location" class="secondary-action">Use Browser Location</button>
          </div>
        </section>
      </div>`;

    oldBox.replaceWith(workspace);
    bindControls();
    const savedKey = localStorage.getItem(STORAGE.apiKey) || '';
    document.getElementById('wod-google-api-key').value = savedKey;
    if (savedKey) void loadGoogleMaps(savedKey);
    void loadCoreData().catch(error => setStatus(`Core data failed to load: ${error.message}`, true));
    return true;
  }

  function injectStyles() {
    if (document.getElementById('wod-chronicle-spatial-style')) return;
    const style = document.createElement('style');
    style.id = 'wod-chronicle-spatial-style';
    style.textContent = `
      .wod-spatial-engine{border:1px solid var(--line);border-radius:20px;background:#0b0d12;overflow:hidden;margin:18px 0 28px}
      .wod-spatial-header{padding:22px 24px 8px}
      .wod-spatial-header h2{margin:.15rem 0 .55rem}
      .wod-spatial-setup{display:grid;grid-template-columns:minmax(240px,1fr) auto auto minmax(230px,.75fr);gap:10px;align-items:end;padding:12px 24px 20px;border-bottom:1px solid var(--line)}
      .wod-spatial-setup label{display:grid;gap:5px;color:var(--muted);font-size:.78rem;text-transform:uppercase;letter-spacing:.08em}
      .wod-spatial-setup input,.wod-spatial-setup select,.wod-search-row input,.wod-admin-card textarea,.wod-admin-card select{width:100%;box-sizing:border-box;background:#11151d;border:1px solid var(--line);color:var(--ink);border-radius:9px;padding:10px}
      .wod-spatial-layout{display:grid;grid-template-columns:minmax(340px,420px) minmax(0,1fr);min-height:720px}
      .wod-spatial-sidebar{padding:16px;overflow:auto;max-height:780px;border-right:1px solid var(--line);background:#101218}
      .wod-map-shell{display:grid;grid-template-rows:minmax(650px,1fr) auto;min-width:0;background:#16191f}
      .wod-google-map{width:100%;height:100%;min-height:650px;background:#16191f}
      .wod-map-placeholder{display:grid;place-content:center;text-align:center;height:100%;padding:30px;color:var(--muted)}
      .wod-map-footer{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:10px 14px;border-top:1px solid var(--line);color:var(--muted);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.78rem}
      .wod-pane-card{background:#181b22;padding:15px;margin:0 0 14px;border:1px solid #333;border-left:5px solid #8b0000;border-radius:12px}
      .wod-pane-card h3{margin-top:0}
      .wod-pane-card.supportive{border-left-color:#00ffcc;box-shadow:0 0 14px rgba(0,255,204,.16)}
      .wod-pane-card.opt-out{border-left-color:#666;filter:saturate(.45)}
      .wod-search-row{display:grid;grid-template-columns:1fr auto;gap:8px}
      .wod-search-results{display:grid;gap:6px;margin-top:8px}
      .wod-search-result{display:block;width:100%;text-align:left;border:1px solid var(--line);border-radius:9px;padding:9px;background:#11151d;color:var(--ink)}
      .wod-search-result:hover{border-color:var(--accent)}
      .wod-search-result small{display:block;color:var(--muted);margin-top:3px}
      .wod-status{padding:10px 12px;border:1px solid var(--line);border-radius:10px;margin-bottom:14px;color:var(--muted);background:#0d1016}
      .wod-status.error{border-color:#8b0000;color:#ffb3b3}
      .wod-matrix-grid{display:grid;gap:9px}
      .wod-matrix-field{border-left:3px solid var(--accent);padding:8px 10px;background:#10131a}
      .wod-matrix-field strong{display:block;margin-bottom:3px;color:var(--ink)}
      .wod-spatial-token{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;word-break:break-all;color:var(--accent)}
      .wod-claim-badge{display:inline-flex;border:1px solid var(--line);border-radius:999px;padding:4px 8px;font-size:.75rem;font-weight:800}
      .wod-claim-badge.supportive{border-color:#00ffcc;color:#00ffcc}
      .wod-claim-badge.opt-out{border-color:#777;color:#aaa}
      .wod-admin-card{border-left-color:#6441a5}
      .wod-admin-card label{display:grid;gap:5px;margin-top:10px;color:var(--muted);font-size:.8rem}
      .wod-admin-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
      .wod-selected-marker{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#8b0000;color:#fff;border:2px solid #fff;box-shadow:0 0 16px #000;font-weight:900}
      .wod-selected-marker.supportive{background:#00bfa5;box-shadow:0 0 18px rgba(0,255,204,.7)}
      .wod-selected-marker.opt-out{background:#666}
      .wod-note{font-size:.8rem;color:var(--muted)}
      @media(max-width:1120px){.wod-spatial-setup{grid-template-columns:1fr 1fr}.wod-spatial-layout{grid-template-columns:1fr}.wod-spatial-sidebar{max-height:none;border-right:0;border-bottom:1px solid var(--line)}.wod-map-shell{grid-template-rows:560px auto}.wod-google-map{min-height:560px}}
      @media(max-width:680px){.wod-spatial-setup{grid-template-columns:1fr}.wod-search-row{grid-template-columns:1fr}.wod-map-footer{align-items:stretch;flex-direction:column}.wod-map-shell{grid-template-rows:460px auto}.wod-google-map{min-height:460px}}
    `;
    document.head.appendChild(style);
  }

  function bindControls() {
    document.getElementById('wod-load-map').addEventListener('click', () => {
      const key = document.getElementById('wod-google-api-key').value.trim();
      if (!key) return setStatus('Enter a Google Maps JavaScript API key before loading the map.', true);
      localStorage.setItem(STORAGE.apiKey, key);
      void loadGoogleMaps(key);
    });
    document.getElementById('wod-forget-map-key').addEventListener('click', () => {
      localStorage.removeItem(STORAGE.apiKey);
      document.getElementById('wod-google-api-key').value = '';
      setStatus('The locally stored Google Maps API key was removed. Reload the page to unload the current map session.');
    });
    document.getElementById('wod-place-search-button').addEventListener('click', searchPlaces);
    document.getElementById('wod-place-search').addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        void searchPlaces();
      }
    });
    document.getElementById('wod-spatial-line').addEventListener('change', () => {
      if (state.selectedPlace) void resolvePlace(state.selectedPlace);
    });
    document.getElementById('wod-use-browser-location').addEventListener('click', useBrowserLocation);
  }

  function updateDataStatus() {
    if (!state.config) return;
    setStatus(`Core registry loaded: ${state.locations.length} spatial domains, ${state.characters.length} character profiles, ${state.rumors.length} rumor records, and ${Object.keys(state.centralRegistry.entries || {}).length} central POI overrides.`);
  }

  function setStatus(message, error = false) {
    const target = document.getElementById('wod-spatial-status');
    if (!target) return;
    target.textContent = message;
    target.classList.toggle('error', error);
  }

  async function loadGoogleMaps(apiKey) {
    if (window.google?.maps?.importLibrary) return initializeMap();
    if (state.mapsPromise) return state.mapsPromise;

    state.mapsPromise = new Promise((resolve, reject) => {
      const callbackName = `__hbWodMapsReady_${Date.now()}`;
      window[callbackName] = () => {
        delete window[callbackName];
        resolve();
      };
      const script = document.createElement('script');
      const params = new URLSearchParams({
        key: apiKey,
        v: 'weekly',
        libraries: 'places,marker',
        loading: 'async',
        callback: callbackName
      });
      script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
      script.async = true;
      script.defer = true;
      script.dataset.wodGoogleMaps = 'true';
      script.onerror = () => reject(new Error('Google Maps JavaScript API failed to load. Check the API key, enabled APIs, billing, and HTTP-referrer restrictions.'));
      document.head.appendChild(script);
    });

    try {
      await state.mapsPromise;
      await initializeMap();
    } catch (error) {
      state.mapsPromise = null;
      setStatus(error.message, true);
    }
  }

  async function initializeMap() {
    if (state.map) return;
    const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
      google.maps.importLibrary('maps'),
      google.maps.importLibrary('marker')
    ]);
    state.AdvancedMarkerElement = AdvancedMarkerElement;
    const center = state.initialCenter || DEFAULT_CENTER;
    state.map = new Map(document.getElementById('wod-google-map'), {
      zoom: DEFAULT_ZOOM,
      center,
      mapId: state.config?.mapId || '4504f8b37365c3d0',
      clickableIcons: true,
      disableDefaultUI: false,
      streetViewControl: true,
      fullscreenControl: true,
      mapTypeControl: true
    });
    state.map.addListener('click', event => {
      if (event.placeId) {
        event.stop();
        void selectPlaceById(event.placeId);
      }
    });
    state.map.addListener('idle', updateCenterReadout);
    setStatus('Interactive map loaded. Pan or zoom to any area, then click a labeled business or landmark.');
    updateCenterReadout();
  }

  function updateCenterReadout() {
    if (!state.map) return;
    const center = state.map.getCenter();
    if (!center) return;
    const value = { lat: center.lat(), lng: center.lng() };
    localStorage.setItem(STORAGE.mapCenter, JSON.stringify(value));
    const target = document.getElementById('wod-map-center-readout');
    if (target) target.textContent = `Map center: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)} · zoom ${state.map.getZoom()}`;
  }

  async function searchPlaces() {
    if (!state.map) return setStatus('Load the interactive Google map before searching.', true);
    const query = document.getElementById('wod-place-search').value.trim();
    if (!query) return;
    setStatus(`Searching Google Places for “${query}”…`);
    try {
      const { Place } = await google.maps.importLibrary('places');
      const { places } = await Place.searchByText({
        textQuery: query,
        fields: ['id', 'displayName', 'formattedAddress', 'location', 'primaryType', 'googleMapsURI'],
        maxResultCount: 5
      });
      renderSearchResults(places || []);
      if (!places?.length) setStatus(`No Google Places results were returned for “${query}”.`, true);
      else setStatus(`${places.length} Google Places result${places.length === 1 ? '' : 's'} found. Select one or continue moving around the map.`);
    } catch (error) {
      setStatus(`Google Places search failed: ${error.message}`, true);
    }
  }

  function renderSearchResults(places) {
    const target = document.getElementById('wod-search-results');
    target.innerHTML = '';
    places.forEach(place => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'wod-search-result';
      button.innerHTML = `<strong>${escapeHtml(place.displayName || 'Unnamed place')}</strong><small>${escapeHtml(place.formattedAddress || place.primaryType || '')}</small>`;
      button.addEventListener('click', () => {
        if (place.location) {
          state.map.panTo(place.location);
          state.map.setZoom(17);
        }
        void resolvePlace(place);
      });
      target.appendChild(button);
    });
  }

  async function selectPlaceById(placeId) {
    try {
      setStatus(`Resolving Google Place ID ${placeId}…`);
      const { Place } = await google.maps.importLibrary('places');
      const place = new Place({ id: placeId });
      await place.fetchFields({
        fields: ['id', 'displayName', 'formattedAddress', 'primaryType', 'location', 'googleMapsURI']
      });
      await resolvePlace(place);
    } catch (error) {
      setStatus(`The selected business could not be resolved: ${error.message}`, true);
    }
  }

  function businessMapping(primaryType) {
    return state.config?.businessTypeMappings?.[primaryType]
      || `Subverted Complex (${primaryType || 'unclassified point of interest'})`;
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

  function parseStored(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (_) {
      return null;
    }
  }

  function buildBaseline(place) {
    if (!state.locations.length || !state.characters.length || !state.rumors.length) {
      throw new Error('The 70-entry core data tables are not loaded yet.');
    }
    const lat = place.location?.lat?.() ?? place.location?.lat;
    const lng = place.location?.lng?.() ?? place.location?.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('The selected Google Place has no usable geocoded coordinates.');

    const spatialToken = `${place.id}|${Number(lat).toFixed(6)}|${Number(lng).toFixed(6)}`;
    const seed = murmurHash3(spatialToken, 0x9747b28c);
    const location = state.locations[seed % state.locations.length];
    const character = state.characters[rotateRight(seed, 9) % state.characters.length];
    const rumor = state.rumors[rotateRight(seed, 17) % state.rumors.length];
    const line = selectedLine();
    const gothicRegistry = businessMapping(place.primaryType);

    return {
      schemaVersion: '1.0.0',
      placeId: place.id,
      placeName: place.displayName || 'Unnamed Google Place',
      formattedAddress: place.formattedAddress || '',
      primaryType: place.primaryType || 'unknown',
      googleMapsURI: place.googleMapsURI || '',
      coordinates: { lat: Number(lat), lng: Number(lng) },
      spatialToken,
      seed32: seed,
      gameLine: line,
      gameLineTitle: LINE_TITLES[line],
      gothicRegistry,
      claimStatus: 'STANDARD_UNCLAIMED',
      source: 'DETERMINISTIC_UNIVERSAL_BASELINE',
      lore: {
        publicFacade: `${place.displayName || 'This business'} operates as a ${location.mundaneBase.name.toLowerCase()}-pattern ${location.mundaneBase.category.toLowerCase()} site. ${location.mundaneBase.description}`,
        hiddenFunction: lineLayer(line, location),
        kindredLayer: location.kindredLayer,
        umbralLayer: location.umbralLayer,
        awakenedVector: location.awakenedVector,
        currentPressure: `${location.pressure.title}: ${location.pressure.effect}`,
        mechanicalSeed: location.pressure.mechanicalSeed,
        embeddedCharacter: `${character.sphereAlignmentAndTenure} — ${character.aestheticAndTell}`,
        temporalAnchor: character.temporalAnchor,
        traumaticCatalyst: character.traumaticCatalyst,
        operationalSecret: character.secretActivePlot,
        vulnerability: character.fatalWeakness,
        sensoryAnchor: rumor.sensoryAnchor,
        mediaFeed: rumor.mediaFeed,
        streetRumor: rumor.urbanLegend
      },
      coreReferences: {
        locationId: location.id,
        locationVariant: location.variant,
        characterId: character.id,
        characterVariant: character.variant,
        rumorId: rumor.id,
        rumorVariant: rumor.variant
      }
    };
  }

  function mergeRecord(baseline, central, local) {
    const resolved = structuredClone(baseline);
    if (central) {
      resolved.source = 'CENTRAL_REGISTRY_OVERRIDE';
      Object.assign(resolved, central);
      resolved.lore = { ...baseline.lore, ...(central.submitted_lore || central.lore || {}) };
    }
    if (local) {
      resolved.source = 'LOCAL_STORYTELLER_OVERRIDE';
      resolved.claimStatus = local.veil_interaction || local.claimStatus || resolved.claimStatus;
      resolved.optOut = Boolean(local.opt_out || resolved.claimStatus === 'OPT_OUT');
      resolved.lore = { ...resolved.lore, ...(local.submitted_lore || local.lore || {}) };
    }
    resolved.optOut = Boolean(resolved.optOut || resolved.opt_out || resolved.claimStatus === 'OPT_OUT');
    return resolved;
  }

  async function resolvePlace(place) {
    try {
      const baseline = buildBaseline(place);
      const central = state.centralRegistry.entries?.[place.id] || null;
      const local = parseStored(`${STORAGE.localPrefix}${place.id}`);
      const resolved = mergeRecord(baseline, central, local);
      state.selectedPlace = place;
      state.selectedRecord = resolved;
      localStorage.setItem(`${STORAGE.generatedPrefix}${place.id}`, JSON.stringify(baseline));
      renderPlace(resolved);
      renderMarker(place, resolved.claimStatus);
      setStatus(`${resolved.placeName} resolved from ${resolved.source.replaceAll('_', ' ').toLowerCase()}. The same Place ID and coordinates resolve the same baseline record in every browser.`);
    } catch (error) {
      setStatus(`World of Darkness record generation failed: ${error.message}`, true);
    }
  }

  function claimClass(status) {
    if (status === 'SUPPORTIVE') return 'supportive';
    if (status === 'OPT_OUT') return 'opt-out';
    return '';
  }

  function matrixField(label, value) {
    return `<div class="wod-matrix-field"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`;
  }

  function renderPlace(record) {
    const target = document.getElementById('wod-display-matrix');
    const status = record.claimStatus || 'STANDARD_UNCLAIMED';
    const statusClass = claimClass(status);

    if (record.optOut) {
      target.innerHTML = `
        <section class="wod-pane-card opt-out">
          <p class="eyebrow">Mundane disconnect active</p>
          <h3>${escapeHtml(record.placeName)}</h3>
          <p><strong>Real address:</strong> ${escapeHtml(record.formattedAddress)}</p>
          <p>This footprint is a narrative blackout zone. Supernatural lore connections are suppressed under the business governance rules.</p>
          <span class="wod-claim-badge opt-out">${escapeHtml(CLAIM_FLAGS.OPT_OUT)}</span>
        </section>
        ${renderAdministration(record)}`;
      bindAdministration(record);
      return;
    }

    target.innerHTML = `
      <section class="wod-pane-card ${statusClass}">
        <p class="eyebrow">Selected business domain</p>
        <h3>${escapeHtml(record.placeName)}</h3>
        <p><strong>Real address:</strong> ${escapeHtml(record.formattedAddress)}</p>
        <p><strong>Google primary type:</strong> ${escapeHtml(record.primaryType)}</p>
        <p><strong>Gothic registry:</strong> ${escapeHtml(record.gothicRegistry)}</p>
        <p><span class="wod-claim-badge ${statusClass}">${escapeHtml(CLAIM_FLAGS[status] || status)}</span></p>
        <div class="wod-matrix-grid">
          ${matrixField('Public facade', record.lore.publicFacade)}
          ${matrixField(`${record.gameLineTitle} hidden function`, record.lore.hiddenFunction)}
          ${matrixField('Kindred layer', record.lore.kindredLayer)}
          ${matrixField('Umbral layer', record.lore.umbralLayer)}
          ${matrixField('Awakened vector', record.lore.awakenedVector)}
          ${matrixField('Current pressure', record.lore.currentPressure)}
          ${matrixField('Mechanical seed', record.lore.mechanicalSeed)}
          ${matrixField('Embedded character', record.lore.embeddedCharacter)}
          ${matrixField('Temporal anchor', record.lore.temporalAnchor)}
          ${matrixField('Traumatic catalyst', record.lore.traumaticCatalyst)}
          ${matrixField('Operational secret', record.lore.operationalSecret)}
          ${matrixField('Fatal vulnerability', record.lore.vulnerability)}
          ${matrixField('Sensory anchor', record.lore.sensoryAnchor)}
          ${matrixField('Police scanner / media feed', record.lore.mediaFeed)}
          ${matrixField('Street rumor', record.lore.streetRumor)}
        </div>
        <p><strong>Spatial token:</strong> <span class="wod-spatial-token">${escapeHtml(record.spatialToken)}</span></p>
        <p><strong>Deterministic seed:</strong> <span class="wod-spatial-token">${record.seed32}</span></p>
        <p class="wod-note">Core references: ${escapeHtml(record.coreReferences.locationId)}, ${escapeHtml(record.coreReferences.characterId)}, ${escapeHtml(record.coreReferences.rumorId)}.</p>
        ${record.googleMapsURI ? `<a class="primary-action" target="_blank" rel="noopener" href="${escapeHtml(record.googleMapsURI)}">Open Business in Google Maps</a>` : ''}
      </section>
      ${renderAdministration(record)}`;

    bindAdministration(record);
  }

  function renderAdministration(record) {
    return `
      <section class="wod-pane-card wod-admin-card">
        <h3>Business Registry Governance</h3>
        <label>
          Chronicle interaction status
          <select id="wod-config-veil">
            <option value="STANDARD_UNCLAIMED" ${record.claimStatus === 'STANDARD_UNCLAIMED' ? 'selected' : ''}>Standard Unclaimed</option>
            <option value="SUPPORTIVE" ${record.claimStatus === 'SUPPORTIVE' ? 'selected' : ''}>Supportive (Part of the Veil)</option>
            <option value="OPT_OUT" ${record.claimStatus === 'OPT_OUT' ? 'selected' : ''}>Opt-Out (Mundane Disconnect)</option>
          </select>
        </label>
        <label>
          Custom public facade / lore directive
          <textarea id="wod-config-lore" rows="6" placeholder="Enter a custom public-facing domain narrative…">${escapeHtml(record.source === 'DETERMINISTIC_UNIVERSAL_BASELINE' ? '' : record.lore.publicFacade || '')}</textarea>
        </label>
        <div class="wod-admin-actions">
          <button id="wod-save-local-claim" class="primary-action">Save Storyteller Override</button>
          <button id="wod-clear-local-claim" class="secondary-action">Clear Local Override</button>
          <button id="wod-copy-business-record" class="secondary-action">Copy Universal Record</button>
          <button id="wod-export-registry-patch" class="secondary-action">Export Central Registry Patch</button>
        </div>
        <p class="wod-note">The deterministic baseline is universal across browsers. Storyteller changes follow the master specification and remain in localStorage until their exported patch is merged into the repository’s central <code>poi_registry.json</code>.</p>
      </section>`;
  }

  function bindAdministration(record) {
    document.getElementById('wod-save-local-claim')?.addEventListener('click', () => saveLocalOverride(record));
    document.getElementById('wod-clear-local-claim')?.addEventListener('click', () => clearLocalOverride(record));
    document.getElementById('wod-copy-business-record')?.addEventListener('click', () => navigator.clipboard?.writeText(JSON.stringify(record, null, 2)));
    document.getElementById('wod-export-registry-patch')?.addEventListener('click', () => exportRegistryPatch(record));
  }

  function saveLocalOverride(record) {
    const veil = document.getElementById('wod-config-veil').value;
    const loreText = document.getElementById('wod-config-lore').value.trim();
    const payload = {
      place_id: record.placeId,
      claimed: true,
      opt_out: veil === 'OPT_OUT',
      veil_interaction: veil,
      submitted_lore: loreText ? { publicFacade: loreText } : {},
      updated_at: new Date().toISOString()
    };
    localStorage.setItem(`${STORAGE.localPrefix}${record.placeId}`, JSON.stringify(payload));
    void resolvePlace(state.selectedPlace);
  }

  function clearLocalOverride(record) {
    localStorage.removeItem(`${STORAGE.localPrefix}${record.placeId}`);
    void resolvePlace(state.selectedPlace);
  }

  function exportRegistryPatch(record) {
    const local = parseStored(`${STORAGE.localPrefix}${record.placeId}`) || {
      place_id: record.placeId,
      claimed: false,
      opt_out: false,
      veil_interaction: 'STANDARD_UNCLAIMED',
      submitted_lore: {}
    };
    const patch = {
      schemaVersion: '1.0.0',
      target: 'data/world-of-darkness/poi_registry.json',
      entryKey: record.placeId,
      entry: {
        ...local,
        place_name: record.placeName,
        formatted_address: record.formattedAddress,
        primary_type: record.primaryType,
        spatial_token: record.spatialToken,
        deterministic_seed: record.seed32,
        core_references: record.coreReferences
      }
    };
    download(`${safeFileName(record.placeName)}-${record.placeId}-registry-patch.json`, 'application/json', JSON.stringify(patch, null, 2));
  }

  function safeFileName(value) {
    return String(value || 'wod-business').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
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

  function renderMarker(place, status) {
    if (!state.map || !place.location || !state.AdvancedMarkerElement) return;
    if (state.selectedMarker) state.selectedMarker.map = null;
    const markerContent = document.createElement('div');
    markerContent.className = `wod-selected-marker ${claimClass(status)}`;
    markerContent.textContent = '✦';
    state.selectedMarker = new state.AdvancedMarkerElement({
      map: state.map,
      position: place.location,
      title: place.displayName || 'Selected World of Darkness business',
      content: markerContent
    });
    state.map.panTo(place.location);
    if ((state.map.getZoom() || 0) < 16) state.map.setZoom(16);
  }

  function useBrowserLocation() {
    if (!navigator.geolocation) return setStatus('This browser does not expose geolocation.', true);
    setStatus('Requesting browser location…');
    navigator.geolocation.getCurrentPosition(position => {
      const center = { lat: position.coords.latitude, lng: position.coords.longitude };
      if (state.map) {
        state.map.panTo(center);
        state.map.setZoom(16);
      }
      localStorage.setItem(STORAGE.mapCenter, JSON.stringify(center));
      setStatus('Browser location loaded. Click a nearby business icon to resolve its domain.');
    }, error => setStatus(`Browser location was not available: ${error.message || 'permission denied'}.`, true), {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000
    });
  }

  function install() {
    if (state.installed) return;
    state.installed = true;
    if (buildWorkspace()) return;
    let attempts = 0;
    const retry = window.setInterval(() => {
      attempts += 1;
      if (buildWorkspace() || attempts > 100) window.clearInterval(retry);
    }, 100);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
