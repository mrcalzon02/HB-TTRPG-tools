(() => {
  'use strict';

  const REPOSITORY = 'mrcalzon02/HB-TTRPG-tools';
  const SUBMISSION_TITLE_PREFIX = '[WOD-POI]';
  const STORAGE = {
    mapQuery: 'hb-wod-map-query-v2',
    localPrefix: 'hb-wod-poi-v2:',
    generatedPrefix: 'hb-wod-generated-poi-v2:'
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
    restaurant: 'Restaurant',
    bar: 'Bar',
    night_club: 'Night Club',
    book_store: 'Book Store',
    library: 'Library',
    hospital: 'Hospital',
    pharmacy: 'Pharmacy',
    cemetery: 'Cemetery',
    park: 'Park',
    store: 'Store / Retail',
    lodging: 'Hotel / Lodging',
    church: 'Church / Religious Site',
    transit_station: 'Transit Station',
    government: 'Government / Civic Building',
    industrial: 'Industrial Site',
    other: 'Other Point of Interest'
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
    selectedRecord: null,
    installed: false
  };

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  const normalize = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const clone = value => JSON.parse(JSON.stringify(value));

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
    renderCentralRegistry();
  }

  function buildWorkspace() {
    const view = document.getElementById('world-of-darkness');
    const oldBox = view?.querySelector('.wod-box');
    if (!view || !oldBox) return false;
    if (document.getElementById('wod-spatial-engine')) return true;

    injectStyles();
    const defaultQuery = localStorage.getItem(STORAGE.mapQuery)
      || oldBox.querySelector('#wod-seed')?.value
      || 'Seattle, Washington - Pioneer Square';

    const workspace = document.createElement('section');
    workspace.id = 'wod-spatial-engine';
    workspace.className = 'wod-spatial-engine no-print';
    workspace.setAttribute('aria-labelledby', 'wod-spatial-title');
    workspace.innerHTML = `
      <header class="wod-spatial-header">
        <p class="eyebrow">Interactive urban overlay</p>
        <h2 id="wod-spatial-title">Chronicle Spatial Engine</h2>
        <p>Use the ordinary Google Maps client without a paid API. Move the map to an area, open a business in Google Maps, then paste its share link and coordinates here to create or retrieve its stable World of Darkness record.</p>
      </header>

      <div class="wod-spatial-layout">
        <aside class="wod-spatial-sidebar">
          <section class="wod-pane-card">
            <h3>Capture a Google Maps Business</h3>
            <p class="wod-note">Google blocks websites from reading clicks inside an embedded map. Select the business in the map or full Google Maps window, copy its share link, and paste it below. A full URL containing <code>@latitude,longitude</code> can fill the coordinates automatically.</p>
            <label>Business name<input id="wod-business-name" type="text" placeholder="Example: Harbor Coffee Company" /></label>
            <label>Street address<input id="wod-business-address" type="text" placeholder="Full address shown by Google Maps" /></label>
            <label>Google Maps share or browser URL<textarea id="wod-business-url" rows="3" placeholder="Paste the business's Google Maps URL"></textarea></label>
            <div class="wod-two-column">
              <label>Latitude<input id="wod-business-lat" type="number" step="0.000001" placeholder="47.601600" /></label>
              <label>Longitude<input id="wod-business-lng" type="number" step="0.000001" placeholder="-122.333400" /></label>
            </div>
            <div class="wod-two-column">
              <label>Business type<select id="wod-business-type">${Object.entries(BUSINESS_TYPES).map(([id, label]) => `<option value="${id}">${escapeHtml(label)}</option>`).join('')}</select></label>
              <label>Game line<select id="wod-spatial-line">${Object.entries(LINE_TITLES).map(([id, title]) => `<option value="${id}">${escapeHtml(title)}</option>`).join('')}</select></label>
            </div>
            <div class="wod-admin-actions">
              <button id="wod-import-map-link" class="secondary-action">Read Details from Link</button>
              <button id="wod-resolve-business" class="primary-action">Generate / Retrieve Business Lore</button>
            </div>
          </section>

          <div id="wod-spatial-status" class="wod-status" aria-live="polite">Loading the Chronicle Spatial Engine core datasets…</div>
          <div id="wod-display-matrix">
            <section class="wod-pane-card"><h3>No Business Selected</h3><p>Capture a Google Maps business above to generate or retrieve its deterministic registry record.</p></section>
          </div>

          <section class="wod-pane-card">
            <h3>Central Business Registry</h3>
            <p class="wod-note">Entries committed to the repository are visible to every browser. Deterministic unclaimed records do not need a stored override.</p>
            <input id="wod-registry-search" type="search" placeholder="Search stored businesses…" />
            <div id="wod-central-registry" class="wod-search-results"></div>
          </section>
        </aside>

        <section class="wod-map-shell" aria-label="No-key Google Maps client view">
          <div class="wod-map-controls">
            <input id="wod-map-query" type="search" value="${escapeHtml(defaultQuery)}" placeholder="City, neighborhood, address, or business" />
            <button id="wod-move-map" class="primary-action">Move Map</button>
            <button id="wod-open-google-maps" class="secondary-action">Open Full Google Maps</button>
            <button id="wod-use-browser-location" class="secondary-action">Use Browser Location</button>
          </div>
          <iframe id="wod-google-map-frame" class="wod-google-map" title="Google Maps client window for selecting World of Darkness business locations" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
          <div class="wod-map-footer">
            <span>No Google Maps API key is used. Pan and zoom inside the client window, or open the full Google Maps page to copy a business link.</span>
          </div>
        </section>
      </div>`;

    oldBox.replaceWith(workspace);
    bindControls();
    moveMap(defaultQuery);
    void loadCoreData().catch(error => setStatus(`Core data failed to load: ${error.message}`, true));
    return true;
  }

  function injectStyles() {
    if (document.getElementById('wod-chronicle-spatial-style')) return;
    const style = document.createElement('style');
    style.id = 'wod-chronicle-spatial-style';
    style.textContent = `
      .wod-spatial-engine{border:1px solid var(--line);border-radius:20px;background:#0b0d12;overflow:hidden;margin:18px 0 28px}
      .wod-spatial-header{padding:22px 24px 14px;border-bottom:1px solid var(--line)}
      .wod-spatial-header h2{margin:.15rem 0 .55rem}
      .wod-spatial-layout{display:grid;grid-template-columns:minmax(360px,440px) minmax(0,1fr);min-height:760px}
      .wod-spatial-sidebar{padding:16px;overflow:auto;max-height:840px;border-right:1px solid var(--line);background:#101218}
      .wod-map-shell{display:grid;grid-template-rows:auto minmax(650px,1fr) auto;min-width:0;background:#16191f}
      .wod-map-controls{display:grid;grid-template-columns:minmax(220px,1fr) auto auto auto;gap:8px;padding:12px;border-bottom:1px solid var(--line)}
      .wod-google-map{width:100%;height:100%;min-height:650px;border:0;background:#16191f;filter:saturate(.78) contrast(1.04)}
      .wod-map-footer{padding:10px 14px;border-top:1px solid var(--line);color:var(--muted);font-size:.8rem}
      .wod-pane-card{background:#181b22;padding:15px;margin:0 0 14px;border:1px solid #333;border-left:5px solid #8b0000;border-radius:12px}
      .wod-pane-card h3{margin-top:0}
      .wod-pane-card.supportive{border-left-color:#00ffcc;box-shadow:0 0 14px rgba(0,255,204,.16)}
      .wod-pane-card.opt-out{border-left-color:#666;filter:saturate(.45)}
      .wod-pane-card label{display:grid;gap:5px;margin-top:10px;color:var(--muted);font-size:.8rem}
      .wod-pane-card input,.wod-pane-card textarea,.wod-pane-card select,.wod-map-controls input{width:100%;box-sizing:border-box;background:#11151d;border:1px solid var(--line);color:var(--ink);border-radius:9px;padding:10px}
      .wod-two-column{display:grid;grid-template-columns:1fr 1fr;gap:9px}
      .wod-admin-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
      .wod-status{padding:10px 12px;border:1px solid var(--line);border-radius:10px;margin-bottom:14px;color:var(--muted);background:#0d1016}
      .wod-status.error{border-color:#8b0000;color:#ffb3b3}
      .wod-matrix-grid{display:grid;gap:9px}
      .wod-matrix-field{border-left:3px solid var(--accent);padding:8px 10px;background:#10131a}
      .wod-matrix-field strong{display:block;margin-bottom:3px;color:var(--ink)}
      .wod-spatial-token{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;word-break:break-all;color:var(--accent)}
      .wod-claim-badge{display:inline-flex;border:1px solid var(--line);border-radius:999px;padding:4px 8px;font-size:.75rem;font-weight:800}
      .wod-claim-badge.supportive{border-color:#00ffcc;color:#00ffcc}
      .wod-claim-badge.opt-out{border-color:#777;color:#aaa}
      .wod-search-results{display:grid;gap:6px;margin-top:8px}
      .wod-search-result{display:block;width:100%;text-align:left;border:1px solid var(--line);border-radius:9px;padding:9px;background:#11151d;color:var(--ink)}
      .wod-search-result:hover{border-color:var(--accent)}
      .wod-search-result small{display:block;color:var(--muted);margin-top:3px}
      .wod-note{font-size:.8rem;color:var(--muted)}
      @media(max-width:1180px){.wod-spatial-layout{grid-template-columns:1fr}.wod-spatial-sidebar{max-height:none;border-right:0;border-bottom:1px solid var(--line)}.wod-map-shell{grid-template-rows:auto 560px auto}.wod-google-map{min-height:560px}}
      @media(max-width:760px){.wod-map-controls{grid-template-columns:1fr}.wod-two-column{grid-template-columns:1fr}.wod-map-shell{grid-template-rows:auto 460px auto}.wod-google-map{min-height:460px}}
    `;
    document.head.appendChild(style);
  }

  function bindControls() {
    document.getElementById('wod-move-map').addEventListener('click', () => moveMap());
    document.getElementById('wod-map-query').addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        moveMap();
      }
    });
    document.getElementById('wod-open-google-maps').addEventListener('click', openFullGoogleMaps);
    document.getElementById('wod-use-browser-location').addEventListener('click', useBrowserLocation);
    document.getElementById('wod-import-map-link').addEventListener('click', importMapLink);
    document.getElementById('wod-resolve-business').addEventListener('click', resolveCapturedBusiness);
    document.getElementById('wod-registry-search').addEventListener('input', renderCentralRegistry);
    document.getElementById('wod-spatial-line').addEventListener('change', () => {
      if (state.selectedRecord) resolveCapturedBusiness();
    });
  }

  function mapEmbedUrl(query) {
    return `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;
  }

  function moveMap(explicitQuery) {
    const input = document.getElementById('wod-map-query');
    const query = String(explicitQuery || input?.value || '').trim();
    if (!query) return;
    if (input) input.value = query;
    localStorage.setItem(STORAGE.mapQuery, query);
    document.getElementById('wod-google-map-frame').src = mapEmbedUrl(query);
  }

  function openFullGoogleMaps() {
    const query = document.getElementById('wod-map-query').value.trim();
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank', 'noopener');
  }

  function useBrowserLocation() {
    if (!navigator.geolocation) return setStatus('This browser does not expose geolocation.', true);
    setStatus('Requesting browser location…');
    navigator.geolocation.getCurrentPosition(position => {
      const lat = position.coords.latitude.toFixed(6);
      const lng = position.coords.longitude.toFixed(6);
      document.getElementById('wod-business-lat').value = lat;
      document.getElementById('wod-business-lng').value = lng;
      moveMap(`${lat},${lng}`);
      setStatus('Browser coordinates loaded. Select a nearby business in Google Maps, copy its link and address, then generate its record.');
    }, error => setStatus(`Browser location was not available: ${error.message || 'permission denied'}.`, true), {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000
    });
  }

  function parseCoordinates(urlText) {
    const patterns = [
      /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
      /[?&](?:q|query)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
      /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/
    ];
    for (const pattern of patterns) {
      const match = String(urlText).match(pattern);
      if (match) return { lat: Number(match[1]), lng: Number(match[2]) };
    }
    return null;
  }

  function parseNameFromUrl(urlText) {
    try {
      const url = new URL(urlText);
      const match = url.pathname.match(/\/place\/([^/]+)/);
      if (!match) return '';
      return decodeURIComponent(match[1].replace(/\+/g, ' '));
    } catch (_) {
      return '';
    }
  }

  function importMapLink() {
    const urlText = document.getElementById('wod-business-url').value.trim();
    if (!urlText) return setStatus('Paste a Google Maps URL before reading details from it.', true);
    const coordinates = parseCoordinates(urlText);
    const name = parseNameFromUrl(urlText);
    if (coordinates) {
      document.getElementById('wod-business-lat').value = coordinates.lat.toFixed(6);
      document.getElementById('wod-business-lng').value = coordinates.lng.toFixed(6);
    }
    if (name && !document.getElementById('wod-business-name').value.trim()) {
      document.getElementById('wod-business-name').value = name;
    }
    const target = coordinates ? `${coordinates.lat},${coordinates.lng}` : name || urlText;
    moveMap(target);
    setStatus(coordinates
      ? 'Business coordinates were extracted from the Google Maps link. Confirm the name, address, and business type, then generate the record.'
      : 'The link did not expose coordinates. In Google Maps, right-click the business location, copy the latitude/longitude shown first in the menu, and enter them manually.');
  }

  function currentCapture() {
    return {
      name: document.getElementById('wod-business-name').value.trim(),
      address: document.getElementById('wod-business-address').value.trim(),
      googleMapsUrl: document.getElementById('wod-business-url').value.trim(),
      lat: Number(document.getElementById('wod-business-lat').value),
      lng: Number(document.getElementById('wod-business-lng').value),
      primaryType: document.getElementById('wod-business-type').value,
      gameLine: document.getElementById('wod-spatial-line').value
    };
  }

  function googleIdentity(capture) {
    let externalId = '';
    if (capture.googleMapsUrl) {
      try {
        const url = new URL(capture.googleMapsUrl);
        externalId = url.searchParams.get('cid') || url.searchParams.get('place_id') || '';
      } catch (_) {
        externalId = '';
      }
    }
    const canonical = externalId
      ? `google-id:${externalId}`
      : [normalize(capture.name), normalize(capture.address), capture.lat.toFixed(6), capture.lng.toFixed(6)].join('|');
    const keyHash = murmurHash3(canonical, 0x1f123bb5).toString(16).padStart(8, '0');
    return { externalId, canonical, entryKey: `gmaps-${keyHash}` };
  }

  function businessMapping(primaryType) {
    return state.config?.businessTypeMappings?.[primaryType]
      || `Subverted Complex (${BUSINESS_TYPES[primaryType] || primaryType || 'unclassified point of interest'})`;
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

  function buildBaseline(capture) {
    if (!capture.name) throw new Error('A business name is required.');
    if (!Number.isFinite(capture.lat) || !Number.isFinite(capture.lng)) {
      throw new Error('Latitude and longitude are required so the same real location resolves identically in every browser.');
    }
    if (!state.locations.length || !state.characters.length || !state.rumors.length) {
      throw new Error('The 70-entry core data tables are still loading.');
    }

    const identity = googleIdentity(capture);
    const spatialToken = `${identity.entryKey}|${capture.lat.toFixed(6)}|${capture.lng.toFixed(6)}`;
    const seed = murmurHash3(spatialToken, 0x9747b28c);
    const location = state.locations[seed % state.locations.length];
    const character = state.characters[rotateRight(seed, 9) % state.characters.length];
    const rumor = state.rumors[rotateRight(seed, 17) % state.rumors.length];

    return {
      schemaVersion: '1.0.0',
      entryKey: identity.entryKey,
      googleExternalId: identity.externalId,
      placeName: capture.name,
      formattedAddress: capture.address,
      primaryType: capture.primaryType,
      googleMapsUrl: capture.googleMapsUrl,
      coordinates: { lat: capture.lat, lng: capture.lng },
      spatialToken,
      seed32: seed,
      gameLine: capture.gameLine,
      gameLineTitle: LINE_TITLES[capture.gameLine],
      gothicRegistry: businessMapping(capture.primaryType),
      claimStatus: 'STANDARD_UNCLAIMED',
      source: 'DETERMINISTIC_UNIVERSAL_BASELINE',
      lore: {
        publicFacade: `${capture.name} follows a ${location.mundaneBase.name.toLowerCase()}-pattern ${location.mundaneBase.category.toLowerCase()} footprint. ${location.mundaneBase.description}`,
        hiddenFunction: lineLayer(capture.gameLine, location),
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
    const resolved = clone(baseline);
    if (central) {
      resolved.source = 'CENTRAL_REGISTRY_OVERRIDE';
      resolved.claimStatus = central.veil_interaction || central.claimStatus || resolved.claimStatus;
      resolved.optOut = Boolean(central.opt_out || resolved.claimStatus === 'OPT_OUT');
      resolved.lore = { ...resolved.lore, ...(central.submitted_lore || central.lore || {}) };
    }
    if (local) {
      resolved.source = 'LOCAL_STORYTELLER_OVERRIDE';
      resolved.claimStatus = local.veil_interaction || local.claimStatus || resolved.claimStatus;
      resolved.optOut = Boolean(local.opt_out || resolved.claimStatus === 'OPT_OUT');
      resolved.lore = { ...resolved.lore, ...(local.submitted_lore || local.lore || {}) };
    }
    return resolved;
  }

  function resolveCapturedBusiness() {
    try {
      const capture = currentCapture();
      const baseline = buildBaseline(capture);
      const central = state.centralRegistry.entries?.[baseline.entryKey] || null;
      const local = parseStored(`${STORAGE.localPrefix}${baseline.entryKey}`);
      const resolved = mergeRecord(baseline, central, local);
      state.selectedRecord = resolved;
      localStorage.setItem(`${STORAGE.generatedPrefix}${baseline.entryKey}`, JSON.stringify(baseline));
      renderRecord(resolved);
      moveMap(`${capture.name} ${capture.address}`.trim() || `${capture.lat},${capture.lng}`);
      setStatus(`${resolved.placeName} resolved from ${resolved.source.replaceAll('_', ' ').toLowerCase()}. Business key: ${resolved.entryKey}.`);
    } catch (error) {
      setStatus(`Business record generation failed: ${error.message}`, true);
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

  function renderRecord(record) {
    const target = document.getElementById('wod-display-matrix');
    const status = record.claimStatus || 'STANDARD_UNCLAIMED';
    const statusClass = claimClass(status);

    if (record.optOut) {
      target.innerHTML = `
        <section class="wod-pane-card opt-out">
          <p class="eyebrow">Mundane disconnect active</p>
          <h3>${escapeHtml(record.placeName)}</h3>
          <p><strong>Real address:</strong> ${escapeHtml(record.formattedAddress || 'Not supplied')}</p>
          <p>This footprint is a narrative blackout zone. Supernatural lore is suppressed under the business governance rules.</p>
          <span class="wod-claim-badge opt-out">${escapeHtml(CLAIM_FLAGS.OPT_OUT)}</span>
        </section>
        ${renderAdministration(record)}`;
      bindAdministration(record);
      return;
    }

    target.innerHTML = `
      <section class="wod-pane-card ${statusClass}">
        <p class="eyebrow">Resolved business domain</p>
        <h3>${escapeHtml(record.placeName)}</h3>
        <p><strong>Real address:</strong> ${escapeHtml(record.formattedAddress || 'Not supplied')}</p>
        <p><strong>Business type:</strong> ${escapeHtml(BUSINESS_TYPES[record.primaryType] || record.primaryType)}</p>
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
        <p><strong>Business key:</strong> <span class="wod-spatial-token">${escapeHtml(record.entryKey)}</span></p>
        <p><strong>Spatial token:</strong> <span class="wod-spatial-token">${escapeHtml(record.spatialToken)}</span></p>
        <p><strong>Deterministic seed:</strong> <span class="wod-spatial-token">${record.seed32}</span></p>
        <p class="wod-note">Core references: ${escapeHtml(record.coreReferences.locationId)}, ${escapeHtml(record.coreReferences.characterId)}, ${escapeHtml(record.coreReferences.rumorId)}.</p>
        ${record.googleMapsUrl ? `<a class="primary-action" target="_blank" rel="noopener" href="${escapeHtml(record.googleMapsUrl)}">Open Business in Google Maps</a>` : ''}
      </section>
      ${renderAdministration(record)}`;
    bindAdministration(record);
  }

  function renderAdministration(record) {
    return `
      <section class="wod-pane-card" style="border-left-color:#6441a5">
        <h3>Business Registry Governance</h3>
        <label>Chronicle interaction status<select id="wod-config-veil">
          <option value="STANDARD_UNCLAIMED" ${record.claimStatus === 'STANDARD_UNCLAIMED' ? 'selected' : ''}>Standard Unclaimed</option>
          <option value="SUPPORTIVE" ${record.claimStatus === 'SUPPORTIVE' ? 'selected' : ''}>Supportive (Part of the Veil)</option>
          <option value="OPT_OUT" ${record.claimStatus === 'OPT_OUT' ? 'selected' : ''}>Opt-Out (Mundane Disconnect)</option>
        </select></label>
        <label>Custom public facade<textarea id="wod-config-public-facade" rows="5">${escapeHtml(record.source === 'DETERMINISTIC_UNIVERSAL_BASELINE' ? '' : record.lore.publicFacade || '')}</textarea></label>
        <label>Custom hidden function<textarea id="wod-config-hidden-function" rows="5">${escapeHtml(record.source === 'DETERMINISTIC_UNIVERSAL_BASELINE' ? '' : record.lore.hiddenFunction || '')}</textarea></label>
        <div class="wod-admin-actions">
          <button id="wod-save-local-claim" class="secondary-action">Save Local Storyteller Override</button>
          <button id="wod-clear-local-claim" class="secondary-action">Clear Local Override</button>
          <button id="wod-copy-business-record" class="secondary-action">Copy Universal Record</button>
          <button id="wod-download-registry-patch" class="secondary-action">Download Registry Patch</button>
          <button id="wod-submit-central-registry" class="primary-action">Submit to Central Registry</button>
        </div>
        <p class="wod-note">Submitting opens a prefilled issue in this repository. The repository workflow accepts submissions from the repository owner, validates the JSON, writes the entry into <code>poi_registry.json</code>, commits it to <code>main</code>, and closes the issue. No Google API key or browser-exposed GitHub token is required.</p>
      </section>`;
  }

  function bindAdministration(record) {
    document.getElementById('wod-save-local-claim')?.addEventListener('click', () => saveLocalOverride(record));
    document.getElementById('wod-clear-local-claim')?.addEventListener('click', () => clearLocalOverride(record));
    document.getElementById('wod-copy-business-record')?.addEventListener('click', () => navigator.clipboard?.writeText(JSON.stringify(record, null, 2)));
    document.getElementById('wod-download-registry-patch')?.addEventListener('click', () => {
      const patch = buildRegistryPatch(record);
      download(`${safeFileName(record.placeName)}-${record.entryKey}-registry-patch.json`, 'application/json', JSON.stringify(patch, null, 2));
    });
    document.getElementById('wod-submit-central-registry')?.addEventListener('click', () => submitCentralRegistry(record));
  }

  function currentLoreOverride() {
    const publicFacade = document.getElementById('wod-config-public-facade')?.value.trim() || '';
    const hiddenFunction = document.getElementById('wod-config-hidden-function')?.value.trim() || '';
    const submittedLore = {};
    if (publicFacade) submittedLore.publicFacade = publicFacade;
    if (hiddenFunction) submittedLore.hiddenFunction = hiddenFunction;
    return submittedLore;
  }

  function saveLocalOverride(record) {
    const veil = document.getElementById('wod-config-veil').value;
    const payload = {
      place_id: record.entryKey,
      claimed: true,
      opt_out: veil === 'OPT_OUT',
      veil_interaction: veil,
      submitted_lore: currentLoreOverride(),
      updated_at: new Date().toISOString()
    };
    localStorage.setItem(`${STORAGE.localPrefix}${record.entryKey}`, JSON.stringify(payload));
    resolveCapturedBusiness();
  }

  function clearLocalOverride(record) {
    localStorage.removeItem(`${STORAGE.localPrefix}${record.entryKey}`);
    resolveCapturedBusiness();
  }

  function buildRegistryPatch(record) {
    const veil = document.getElementById('wod-config-veil')?.value || record.claimStatus || 'STANDARD_UNCLAIMED';
    return {
      schemaVersion: '1.0.0',
      target: 'data/world-of-darkness/poi_registry.json',
      entryKey: record.entryKey,
      entry: {
        place_id: record.entryKey,
        google_external_id: record.googleExternalId || '',
        place_name: record.placeName,
        formatted_address: record.formattedAddress,
        google_maps_url: record.googleMapsUrl,
        primary_type: record.primaryType,
        coordinates: record.coordinates,
        claimed: veil !== 'STANDARD_UNCLAIMED',
        opt_out: veil === 'OPT_OUT',
        veil_interaction: veil,
        submitted_lore: currentLoreOverride(),
        spatial_token: record.spatialToken,
        deterministic_seed: record.seed32,
        core_references: record.coreReferences,
        submitted_at: new Date().toISOString()
      }
    };
  }

  async function submitCentralRegistry(record) {
    const patch = buildRegistryPatch(record);
    const patchText = JSON.stringify(patch, null, 2);
    const body = `<!-- WOD_POI_REGISTRY_PATCH -->\nThis issue was generated by the Chronicle Spatial Engine no-API client.\n\n\`\`\`json\n${patchText}\n\`\`\`\n`;
    const title = `${SUBMISSION_TITLE_PREFIX} ${record.placeName} (${record.entryKey})`;
    const issueUrl = `https://github.com/${REPOSITORY}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
    try {
      await navigator.clipboard?.writeText(patchText);
    } catch (_) {
      // The prefilled issue remains the primary path.
    }
    window.open(issueUrl, '_blank', 'noopener');
    setStatus('A prefilled GitHub registry issue was opened. Submit it while signed into the repository-owner account; the workflow will validate and commit the business entry to main. The JSON patch was also copied when browser permissions allowed.');
  }

  function renderCentralRegistry() {
    const target = document.getElementById('wod-central-registry');
    if (!target) return;
    const query = normalize(document.getElementById('wod-registry-search')?.value || '');
    const entries = Object.entries(state.centralRegistry.entries || {})
      .filter(([, entry]) => !query || [entry.place_name, entry.formatted_address, entry.primary_type].some(value => normalize(value).includes(query)))
      .sort((a, b) => String(a[1].place_name || '').localeCompare(String(b[1].place_name || '')));
    target.innerHTML = '';
    if (!entries.length) {
      target.innerHTML = '<p class="wod-note">No centrally stored businesses match this search.</p>';
      return;
    }
    entries.forEach(([entryKey, entry]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'wod-search-result';
      button.innerHTML = `<strong>${escapeHtml(entry.place_name || entryKey)}</strong><small>${escapeHtml(entry.formatted_address || entry.primary_type || '')}</small>`;
      button.addEventListener('click', () => populateFromRegistry(entryKey, entry));
      target.appendChild(button);
    });
  }

  function populateFromRegistry(entryKey, entry) {
    document.getElementById('wod-business-name').value = entry.place_name || '';
    document.getElementById('wod-business-address').value = entry.formatted_address || '';
    document.getElementById('wod-business-url').value = entry.google_maps_url || '';
    document.getElementById('wod-business-lat').value = entry.coordinates?.lat ?? '';
    document.getElementById('wod-business-lng').value = entry.coordinates?.lng ?? '';
    document.getElementById('wod-business-type').value = entry.primary_type || 'other';
    resolveCapturedBusiness();
    setStatus(`Loaded centrally stored business ${entry.place_name || entryKey}.`);
  }

  function updateDataStatus() {
    setStatus(`Core registry loaded: ${state.locations.length} spatial domains, ${state.characters.length} character profiles, ${state.rumors.length} rumor records, and ${Object.keys(state.centralRegistry.entries || {}).length} centrally stored business overrides.`);
  }

  function setStatus(message, error = false) {
    const target = document.getElementById('wod-spatial-status');
    if (!target) return;
    target.textContent = message;
    target.classList.toggle('error', error);
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
