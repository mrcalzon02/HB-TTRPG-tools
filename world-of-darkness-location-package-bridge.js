(() => {
  'use strict';

  const REPOSITORY = 'mrcalzon02/HB-TTRPG-tools';
  const STORAGE = {
    localWorlds: 'hb-wod-local-world-seeds-v2',
    localRegistry: 'hb-wod-generated-location-packages-v2',
    activeWorld: 'hb-wod-active-world-seed-v2',
    activeContext: 'hb-wod-active-location-context-v2'
  };
  const INVENTORY_STATUS_LABELS = {
    MUNDANE: 'Mundane / No Known Connection',
    TANGENTIAL: 'Tangential / Peripheral Association',
    ACTIVE_UNREGISTERED: 'Active but Unregistered',
    INVENTORIED: 'Formally Inventoried'
  };
  const INVENTORY_LABEL_TO_STATUS = Object.fromEntries(
    Object.entries(INVENTORY_STATUS_LABELS).map(([status, label]) => [label, status])
  );
  const GAME_LINES = new Set(['unified', 'vampire', 'werewolf', 'breeds', 'hunter', 'changeling', 'mage']);

  const state = {
    installed: false,
    config: null,
    crosslinks: null,
    locationVariants: [],
    centralRegistry: { entries: {} },
    globalRegistry: { worlds: {} },
    localWorlds: { worlds: {} },
    localRegistry: { worlds: {} },
    activeRef: null,
    currentLocation: null,
    currentPackage: null,
    requestedPackageKey: '',
    observer: null
  };

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  const normalize = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const clone = value => JSON.parse(JSON.stringify(value));
  const wait = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds));

  function hash32(input) {
    let hash = 2166136261;
    for (const character of String(input)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function keyFrom(prefix, input) {
    return `${prefix}-${hash32(input).toString(16).padStart(8, '0')}`;
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

  function randomSeedValue() {
    if (window.crypto?.getRandomValues) {
      const values = new Uint32Array(4);
      window.crypto.getRandomValues(values);
      return [...values].map(value => value.toString(16).padStart(8, '0')).join('');
    }
    return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
  }

  function makeWorldSeed(label, suppliedValue = '') {
    let seedValue = String(suppliedValue || '').trim() || randomSeedValue();
    if (seedValue.length < 8) seedValue = `${seedValue}-${randomSeedValue()}`;
    let worldSeedKey = keyFrom('wodworld', seedValue);
    let collision = state.localWorlds.worlds[worldSeedKey] || state.globalRegistry.worlds?.[worldSeedKey];
    while (collision && collision.seedValue !== seedValue && !suppliedValue) {
      seedValue = randomSeedValue();
      worldSeedKey = keyFrom('wodworld', seedValue);
      collision = state.localWorlds.worlds[worldSeedKey] || state.globalRegistry.worlds?.[worldSeedKey];
    }
    if (collision && collision.seedValue !== seedValue) {
      throw new Error('This custom seed produced a key collision with a different existing world. Use a different seed value.');
    }
    return {
      worldSeedKey,
      label: String(label || '').trim() || `Local World ${new Date().toLocaleString()}`,
      seedValue,
      createdAt: new Date().toISOString(),
      source: 'local'
    };
  }

  function ensureRegistries() {
    state.localWorlds = readStorage(STORAGE.localWorlds, { schemaVersion: '2.0.0', worlds: {} });
    state.localWorlds.worlds ||= {};
    state.localRegistry = readStorage(STORAGE.localRegistry, { schemaVersion: '2.0.0', worlds: {} });
    state.localRegistry.worlds ||= {};

    if (!Object.keys(state.localWorlds.worlds).length) {
      const world = makeWorldSeed('My Local Chronicle World');
      state.localWorlds.worlds[world.worldSeedKey] = world;
      writeStorage(STORAGE.localWorlds, state.localWorlds);
    }
  }

  async function loadData() {
    state.config = await loadJson('data/world-of-darkness/spatial-engine-config.json');
    const [crosslinks, locationCore, centralRegistry, globalRegistry] = await Promise.all([
      loadJson(state.config.coreData.crosslinks),
      loadJson(state.config.coreData.locations),
      loadJson(state.config.coreData.centralRegistry),
      loadJson(state.config.coreData.generatedLocationRegistry)
    ]);
    state.crosslinks = crosslinks;
    state.locationVariants = expandLocationCore(locationCore);
    state.centralRegistry = centralRegistry || { entries: {} };
    state.globalRegistry = globalRegistry || { schemaVersion: '2.0.0', worlds: {} };
    state.globalRegistry.worlds ||= {};
    ensureRegistries();
  }

  function injectStyles() {
    if (document.getElementById('wod-location-package-style')) return;
    const style = document.createElement('style');
    style.id = 'wod-location-package-style';
    style.textContent = `
      .wod-package-panel{background:#151821;border:1px solid #343845;border-left:5px solid #3c6f9c;border-radius:12px;padding:14px;margin:0 0 14px}
      .wod-package-panel h3,.wod-package-panel h4{margin-top:0}
      .wod-package-panel label{display:grid;gap:4px;margin-top:8px;color:var(--muted);font-size:.78rem}
      .wod-package-panel input,.wod-package-panel select{width:100%;box-sizing:border-box;background:#10131a;border:1px solid var(--line);color:var(--ink);border-radius:9px;padding:9px}
      .wod-package-seed-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .wod-package-actions{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0}
      .wod-package-status{padding:9px;border:1px solid var(--line);border-radius:9px;background:#0d1016;color:var(--muted);font-size:.78rem}
      .wod-package-status.error{border-color:#8b0000;color:#ffb3b3}
      .wod-package-status.success{border-color:#2d8f71;color:#a9f1da}
      .wod-package-output{display:grid;gap:8px;margin-top:10px}
      .wod-package-output-card{border-left:3px solid #7655a8;background:#10131a;padding:9px;border-radius:6px}
      .wod-package-output-card h5{margin:0 0 5px;font-size:.9rem}
      .wod-package-output-card p{margin:4px 0;font-size:.76rem;line-height:1.38}
      .wod-package-meta{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--accent);font-size:.72rem;word-break:break-all}
      .wod-package-links{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
      .wod-package-link{border:1px solid var(--line);background:#171b25;color:var(--ink);border-radius:999px;padding:5px 8px;font-size:.7rem;cursor:pointer}
      .wod-package-saved-list{display:grid;gap:6px;margin-top:7px}
      .wod-package-saved-item{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center;border:1px solid var(--line);border-radius:8px;padding:7px;background:#10131a}
      .wod-package-saved-item button{text-align:left}
      .wod-package-saved-item small{display:block;color:var(--muted)}
      @media(max-width:700px){.wod-package-seed-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function buildPanel() {
    const left = document.querySelector('#wod-spatial-engine .wod-inventory-left');
    const matrix = document.getElementById('wod-display-matrix');
    if (!left || !matrix) return false;
    if (document.getElementById('wod-location-package-panel')) return true;

    injectStyles();
    const panel = document.createElement('section');
    panel.id = 'wod-location-package-panel';
    panel.className = 'wod-package-panel';
    panel.innerHTML = `
      <p class="eyebrow">World-seeded Chronicle package</p>
      <h3>Generate, Save Locally, or Submit Globally</h3>
      <p class="wod-note">Choose an embedded repository world or one of this browser's local worlds. The same real location may have different immutable packages in different worlds.</p>
      <label>Active world seed<select id="wod-world-seed-select"></select></label>
      <div id="wod-world-seed-meta" class="wod-package-status">Loading world seeds…</div>
      <details>
        <summary>Create another local world seed</summary>
        <div class="wod-package-seed-grid">
          <label>World label<input id="wod-new-world-label" placeholder="Example: Sitka Night Chronicle"></label>
          <label>Seed value or phrase<input id="wod-new-world-value" placeholder="Blank generates a random seed"></label>
        </div>
        <div class="wod-package-actions">
          <button id="wod-create-local-world" class="secondary-action">Create Local World</button>
          <button id="wod-delete-local-world" class="secondary-action">Delete Selected Local World</button>
        </div>
      </details>
      <div id="wod-package-location-status" class="wod-package-status">Select a business from the map before generating a linked package.</div>
      <div class="wod-package-actions">
        <button id="wod-generate-location-package" class="primary-action" disabled>Generate Linked Package</button>
        <button id="wod-save-location-package-local" class="secondary-action" disabled>Save Locally</button>
        <button id="wod-submit-location-package-global" class="primary-action" disabled>Submit Globally</button>
        <button id="wod-delete-location-package-local" class="secondary-action" disabled>Delete Local Package</button>
      </div>
      <div id="wod-location-package-output"></div>
      <details><summary>Local packages in this world</summary><div id="wod-local-package-list" class="wod-package-saved-list"></div></details>
      <details><summary>Embedded global packages in this world</summary><div id="wod-global-package-list" class="wod-package-saved-list"></div></details>`;
    matrix.insertAdjacentElement('afterend', panel);
    bindPanel();
    return true;
  }

  function bindPanel() {
    document.getElementById('wod-world-seed-select').addEventListener('change', event => selectWorldRef(event.target.value));
    document.getElementById('wod-create-local-world').addEventListener('click', createLocalWorld);
    document.getElementById('wod-delete-local-world').addEventListener('click', deleteSelectedLocalWorld);
    document.getElementById('wod-generate-location-package').addEventListener('click', generateOrLoadPackage);
    document.getElementById('wod-save-location-package-local').addEventListener('click', saveCurrentPackageLocally);
    document.getElementById('wod-submit-location-package-global').addEventListener('click', submitCurrentPackageGlobally);
    document.getElementById('wod-delete-location-package-local').addEventListener('click', deleteCurrentLocalPackage);
  }

  function allWorldOptions() {
    const embedded = Object.values(state.globalRegistry.worlds || {})
      .map(world => ({ ...world, scope: 'embedded', source: 'embedded' }))
      .sort((a, b) => a.label.localeCompare(b.label));
    const local = Object.values(state.localWorlds.worlds || {})
      .map(world => ({ ...world, scope: 'local', source: 'local' }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return { embedded, local };
  }

  function renderWorldSelector() {
    const select = document.getElementById('wod-world-seed-select');
    if (!select) return;
    const { embedded, local } = allWorldOptions();
    select.innerHTML = '';

    const embeddedGroup = document.createElement('optgroup');
    embeddedGroup.label = 'Embedded global worlds';
    if (!embedded.length) {
      const option = new Option('No embedded worlds published yet', 'none:embedded');
      option.disabled = true;
      embeddedGroup.appendChild(option);
    } else {
      embedded.forEach(world => embeddedGroup.appendChild(new Option(`${world.label} · ${world.worldSeedKey}`, `embedded:${world.worldSeedKey}`)));
    }
    select.appendChild(embeddedGroup);

    const localGroup = document.createElement('optgroup');
    localGroup.label = 'Local browser worlds';
    local.forEach(world => localGroup.appendChild(new Option(`${world.label} · ${world.worldSeedKey}`, `local:${world.worldSeedKey}`)));
    select.appendChild(localGroup);

    const requested = resolveRequestedWorldRef();
    const stored = readStorage(STORAGE.activeWorld, null);
    const preferred = requested || stored;
    const values = [...select.options].map(option => option.value);
    const preferredValue = preferred ? `${preferred.scope}:${preferred.worldSeedKey}` : '';
    select.value = values.includes(preferredValue)
      ? preferredValue
      : (local[0] ? `local:${local[0].worldSeedKey}` : `embedded:${embedded[0]?.worldSeedKey || ''}`);
    selectWorldRef(select.value, { updateUrl: false });
  }

  function resolveRequestedWorldRef() {
    const params = new URLSearchParams(window.location.search);
    const key = params.get('wodWorld');
    const scope = params.get('wodScope');
    state.requestedPackageKey = params.get('wodPackage') || '';
    if (!/^wodworld-[0-9a-f]{8}$/.test(key || '')) return null;
    if (scope === 'embedded' && state.globalRegistry.worlds?.[key]) return { scope, worldSeedKey: key };
    if (scope === 'local' && state.localWorlds.worlds?.[key]) return { scope, worldSeedKey: key };
    if (state.globalRegistry.worlds?.[key]) return { scope: 'embedded', worldSeedKey: key };
    if (state.localWorlds.worlds?.[key]) return { scope: 'local', worldSeedKey: key };
    return null;
  }

  function worldForRef(ref = state.activeRef) {
    if (!ref) return null;
    return ref.scope === 'embedded'
      ? state.globalRegistry.worlds?.[ref.worldSeedKey] || null
      : state.localWorlds.worlds?.[ref.worldSeedKey] || null;
  }

  function selectWorldRef(value, options = {}) {
    const [scope, worldSeedKey] = String(value || '').split(':');
    if (!['embedded', 'local'].includes(scope) || !/^wodworld-[0-9a-f]{8}$/.test(worldSeedKey || '')) return;
    const ref = { scope, worldSeedKey };
    if (!worldForRef(ref)) return;
    state.activeRef = ref;
    state.currentPackage = null;
    writeStorage(STORAGE.activeWorld, ref);
    renderWorldMeta();
    renderSavedPackageLists();
    renderPackageOutput();
    refreshSelectedLocation();
    document.dispatchEvent(new CustomEvent('wod:world-seed-changed', { detail: clone(worldForRef(ref)) }));

    if (options.updateUrl !== false) {
      const url = new URL(window.location.href);
      url.searchParams.set('wodWorld', worldSeedKey);
      url.searchParams.set('wodScope', scope);
      url.searchParams.delete('wodPackage');
      history.replaceState(null, '', url);
    }

    if (state.requestedPackageKey) {
      const requested = findPackage(state.requestedPackageKey);
      if (requested) {
        state.currentPackage = clone(requested);
        state.requestedPackageKey = '';
        renderPackageOutput();
      }
    }
  }

  function renderWorldMeta() {
    const target = document.getElementById('wod-world-seed-meta');
    const world = worldForRef();
    if (!target || !world) return;
    const localCount = Object.keys(state.localRegistry.worlds?.[world.worldSeedKey]?.packages || {}).length;
    const globalCount = Object.keys(state.globalRegistry.worlds?.[world.worldSeedKey]?.packages || {}).length;
    target.className = 'wod-package-status';
    target.innerHTML = `<strong>${escapeHtml(world.label)}</strong><br><span class="wod-package-meta">${escapeHtml(world.worldSeedKey)}</span><br>${state.activeRef.scope === 'embedded' ? 'Embedded repository world' : 'Local browser world'} · ${localCount} local package${localCount === 1 ? '' : 's'} · ${globalCount} global package${globalCount === 1 ? '' : 's'}`;
    document.getElementById('wod-delete-local-world').disabled = state.activeRef.scope !== 'local';
  }

  function createLocalWorld() {
    try {
      const label = document.getElementById('wod-new-world-label').value.trim();
      const seedValue = document.getElementById('wod-new-world-value').value.trim();
      const world = makeWorldSeed(label, seedValue);
      const existing = state.localWorlds.worlds[world.worldSeedKey];
      if (existing) {
        renderStatus(`Local world ${existing.label} already uses this seed. It has been selected.`, 'success');
      } else {
        state.localWorlds.worlds[world.worldSeedKey] = world;
        writeStorage(STORAGE.localWorlds, state.localWorlds);
        renderStatus(`Created local world ${world.label}.`, 'success');
      }
      renderWorldSelector();
      document.getElementById('wod-world-seed-select').value = `local:${world.worldSeedKey}`;
      selectWorldRef(`local:${world.worldSeedKey}`);
      document.getElementById('wod-new-world-label').value = '';
      document.getElementById('wod-new-world-value').value = '';
    } catch (error) {
      renderStatus(error.message, 'error');
    }
  }

  function deleteSelectedLocalWorld() {
    if (state.activeRef?.scope !== 'local') return renderStatus('Embedded worlds cannot be deleted from browser storage.', 'error');
    const world = worldForRef();
    if (!world) return;
    const packageCount = Object.keys(state.localRegistry.worlds?.[world.worldSeedKey]?.packages || {}).length;
    if (!window.confirm(`Delete local world “${world.label}” and its ${packageCount} locally saved package(s)? Embedded global data will not be affected.`)) return;
    delete state.localWorlds.worlds[world.worldSeedKey];
    delete state.localRegistry.worlds[world.worldSeedKey];
    if (!Object.keys(state.localWorlds.worlds).length) {
      const replacement = makeWorldSeed('My Local Chronicle World');
      state.localWorlds.worlds[replacement.worldSeedKey] = replacement;
    }
    writeStorage(STORAGE.localWorlds, state.localWorlds);
    writeStorage(STORAGE.localRegistry, state.localRegistry);
    renderWorldSelector();
    renderStatus('The selected local world and its local packages were deleted.', 'success');
  }

  function observeLocationSelection() {
    const matrix = document.getElementById('wod-display-matrix');
    if (!matrix) return;
    state.observer?.disconnect();
    state.observer = new MutationObserver(() => window.setTimeout(refreshSelectedLocation, 0));
    state.observer.observe(matrix, { childList: true, subtree: true, characterData: true });
    document.addEventListener('click', event => {
      if (event.target.closest('.wod-inventory-business,.wod-inventory-marker')) {
        window.setTimeout(refreshSelectedLocation, 50);
      }
    });
    refreshSelectedLocation();
  }

  function captureLocationFromUi() {
    const matrix = document.getElementById('wod-display-matrix');
    const token = matrix?.querySelector('.wod-inventory-token')?.textContent.trim() || '';
    const locationKey = token.match(/gmaps-[0-9a-f]{8}/)?.[0] || '';
    const name = document.getElementById('wod-business-name')?.value.trim() || '';
    const address = document.getElementById('wod-business-address')?.value.trim() || '';
    const referenceUrl = document.getElementById('wod-business-url')?.value.trim() || '';
    const category = document.getElementById('wod-business-type')?.value || 'other';
    const lat = Number(document.getElementById('wod-business-lat')?.value);
    const lng = Number(document.getElementById('wod-business-lng')?.value);
    if (!locationKey || !name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const displayed = {};
    matrix.querySelectorAll('.wod-inventory-field').forEach(field => {
      const label = field.querySelector('strong')?.textContent.trim();
      const value = field.querySelector('span')?.textContent.trim();
      if (label && value) displayed[label] = value;
    });
    const displayedStatus = INVENTORY_LABEL_TO_STATUS[displayed['Supernatural inventory status']] || 'MUNDANE';
    const claimed = Boolean(state.centralRegistry.entries?.[locationKey]);
    return { locationKey, name, address, referenceUrl, category, coordinates: { lat, lng }, displayedStatus, displayed, claimed };
  }

  function refreshSelectedLocation() {
    state.currentLocation = captureLocationFromUi();
    state.currentPackage = null;
    const target = document.getElementById('wod-package-location-status');
    const generateButton = document.getElementById('wod-generate-location-package');
    if (!target || !generateButton) return;

    if (!state.currentLocation) {
      target.className = 'wod-package-status';
      target.textContent = 'Select a business from the map before generating a linked package.';
      generateButton.disabled = true;
      renderPackageOutput();
      return;
    }

    if (state.currentLocation.claimed) {
      target.className = 'wod-package-status error';
      target.innerHTML = `<strong>${escapeHtml(state.currentLocation.name)}</strong><br>This business is already claimed in the central POI registry. Claimed-business package integration is intentionally deferred and world-seeded generation is disabled here.`;
      generateButton.disabled = true;
      renderPackageOutput();
      return;
    }

    const world = worldForRef();
    target.className = 'wod-package-status';
    target.innerHTML = `<strong>${escapeHtml(state.currentLocation.name)}</strong><br>Ready to generate under <strong>${escapeHtml(world?.label || 'the selected world')}</strong>. The package will not affect the same business in other world seeds.`;
    generateButton.disabled = !world;
    renderPackageOutput();
  }

  function selectedGameLine() {
    const value = document.getElementById('wod-spatial-line')?.value || 'unified';
    return GAME_LINES.has(value) ? value : 'unified';
  }

  function lineLayer(line, location) {
    if (line === 'vampire') return location.kindredLayer;
    if (line === 'werewolf' || line === 'breeds') return location.umbralLayer;
    if (line === 'mage') return location.awakenedVector;
    if (line === 'hunter') return `Hunter assessment: ${location.mundaneBase.description} Every supernatural conclusion remains provisional evidence.`;
    if (line === 'changeling') return `Changeling interpretation: the mundane footprint casts a Dreaming reflection shaped by ${location.context.title.toLowerCase()}.`;
    return `${location.kindredLayer} | ${location.umbralLayer} | ${location.awakenedVector}`;
  }

  function worldSpecificContext(world, location, gameLine) {
    const index = hash32(`${world.seedValue}|${location.locationKey}|${gameLine}|location-context`) % state.locationVariants.length;
    const variant = state.locationVariants[index];
    const status = variant.inventoryStatus;
    const strongLayer = lineLayer(gameLine, variant);
    let hiddenFunction;
    let confidence;
    let catalogueNote;

    if (status === 'MUNDANE') {
      hiddenFunction = `No confirmed supernatural function. ${variant.context.effect}`;
      confidence = 'No credible supernatural evidence';
      catalogueNote = 'This world seed does not place the business in any supernatural inventory.';
    } else if (status === 'TANGENTIAL') {
      hiddenFunction = `${variant.context.effect} The nearest thematic pattern resembles: ${strongLayer} The business itself is not confirmed as involved.`;
      confidence = 'Weak, indirect, historical, or route-adjacent evidence';
      catalogueNote = 'The location is peripheral to supernatural activity and is not inventoried.';
    } else if (status === 'ACTIVE_UNREGISTERED') {
      hiddenFunction = `${variant.context.effect} ${strongLayer}`;
      confidence = 'Active evidence without a formal ownership record';
      catalogueNote = 'The location is used or affected but remains absent from faction inventories.';
    } else {
      hiddenFunction = `${variant.context.effect} ${strongLayer}`;
      confidence = 'Formally catalogued inside this world seed';
      catalogueNote = 'The location is recorded, monitored, claimed, or administratively recognized in this generated world.';
    }

    const registry = state.config.businessTypeMappings?.[location.category]
      || `Subverted Complex (${String(location.category).replaceAll('_', ' ')})`;
    return {
      variant,
      status,
      publicFacade: `${location.name} follows a ${variant.mundaneBase.name.toLowerCase()}-pattern ${variant.mundaneBase.category.toLowerCase()} footprint. ${variant.mundaneBase.description}`,
      hiddenFunction,
      confidence,
      catalogueNote,
      registry: status === 'MUNDANE'
        ? 'No supernatural inventory entry'
        : status === 'TANGENTIAL'
          ? 'Peripheral association — not inventoried'
          : `${registry} — ${status === 'INVENTORIED' ? 'formal inventory entry' : 'active but unregistered'}`
    };
  }

  function selectPoolEntry(poolName, status, world, locationKey, gameLine) {
    const pool = state.crosslinks?.[poolName] || [];
    const eligible = pool.filter(entry => Array.isArray(entry.statuses) && entry.statuses.includes(status));
    if (!eligible.length) throw new Error(`No ${poolName} entries support inventory status ${status}.`);
    return clone(eligible[hash32(`${world.seedValue}|${locationKey}|${gameLine}|${poolName}`) % eligible.length]);
  }

  function packageKeyFor(worldSeedKey, locationKey, gameLine) {
    return keyFrom('wodpkg', `${worldSeedKey}|${locationKey}|${gameLine}`);
  }

  function findPackage(packageKey) {
    const worldKey = state.activeRef?.worldSeedKey;
    if (!worldKey) return null;
    return state.globalRegistry.worlds?.[worldKey]?.packages?.[packageKey]
      || state.localRegistry.worlds?.[worldKey]?.packages?.[packageKey]
      || null;
  }

  function generateOrLoadPackage() {
    try {
      const world = worldForRef();
      const location = state.currentLocation;
      if (!world || !location) throw new Error('Select both a world seed and a map location.');
      if (location.claimed) throw new Error('Claimed businesses are excluded until the claimed-business integration panel is implemented.');
      const gameLine = selectedGameLine();
      const packageKey = packageKeyFor(world.worldSeedKey, location.locationKey, gameLine);
      const existing = findPackage(packageKey);
      if (existing) {
        state.currentPackage = clone(existing);
        renderPackageOutput();
        renderStatus(`Loaded immutable package ${packageKey} from ${state.globalRegistry.worlds?.[world.worldSeedKey]?.packages?.[packageKey] ? 'the embedded global registry' : 'local browser storage'}.`, 'success');
        return;
      }

      const worldContext = worldSpecificContext(world, location, gameLine);
      state.currentPackage = {
        schemaVersion: '2.0.0',
        packageKey,
        worldSeedKey: world.worldSeedKey,
        worldSeedLabel: world.label,
        locationKey: location.locationKey,
        gameLine,
        generatedAt: new Date().toISOString(),
        location: {
          name: location.name,
          address: location.address,
          referenceUrl: location.referenceUrl,
          category: location.category,
          coordinates: clone(location.coordinates),
          inventoryStatus: worldContext.status,
          claimed: false,
          contextSnapshot: {
            inventoryLabel: INVENTORY_STATUS_LABELS[worldContext.status],
            locationVariant: `${worldContext.variant.variant} of ${state.locationVariants.length}`,
            archetype: worldContext.variant.mundaneBase.name,
            archetypeCategory: worldContext.variant.mundaneBase.category,
            contextTitle: worldContext.variant.context.title,
            contextEffect: worldContext.variant.context.effect,
            mechanicalSeed: worldContext.variant.context.mechanicalSeed,
            publicFacade: worldContext.publicFacade,
            hiddenFunction: worldContext.hiddenFunction,
            evidenceConfidence: worldContext.confidence,
            catalogueNote: worldContext.catalogueNote,
            supernaturalRegistry: worldContext.registry,
            browserDisplayedStatus: INVENTORY_STATUS_LABELS[location.displayedStatus] || location.displayedStatus
          }
        },
        outputs: {
          population: selectPoolEntry('population', worldContext.status, world, location.locationKey, gameLine),
          struggle: selectPoolEntry('struggles', worldContext.status, world, location.locationKey, gameLine),
          adventureHook: selectPoolEntry('adventureHooks', worldContext.status, world, location.locationKey, gameLine),
          locationSeed: selectPoolEntry('locationSeeds', worldContext.status, world, location.locationKey, gameLine),
          item: selectPoolEntry('items', worldContext.status, world, location.locationKey, gameLine)
        },
        crossLinks: clone(state.crosslinks.crossLinks || []),
        source: {
          crosslinkSchemaVersion: state.crosslinks.schemaVersion,
          generatorVersion: 'world-seeded-location-package-2.0.0'
        }
      };
      renderPackageOutput();
      renderStatus(`Generated ${packageKey} under ${world.label}. Save it locally or submit the exact snapshot globally.`, 'success');
    } catch (error) {
      renderStatus(error.message, 'error');
    }
  }

  function renderPackageOutput() {
    const target = document.getElementById('wod-location-package-output');
    const saveButton = document.getElementById('wod-save-location-package-local');
    const submitButton = document.getElementById('wod-submit-location-package-global');
    const deleteButton = document.getElementById('wod-delete-location-package-local');
    if (!target || !saveButton || !submitButton || !deleteButton) return;

    const pkg = state.currentPackage;
    if (!pkg) {
      target.innerHTML = '';
      saveButton.disabled = true;
      submitButton.disabled = true;
      deleteButton.disabled = true;
      return;
    }

    const localExists = Boolean(state.localRegistry.worlds?.[pkg.worldSeedKey]?.packages?.[pkg.packageKey]);
    const globalExists = Boolean(state.globalRegistry.worlds?.[pkg.worldSeedKey]?.packages?.[pkg.packageKey]);
    saveButton.disabled = localExists;
    submitButton.disabled = globalExists || pkg.location.claimed;
    deleteButton.disabled = !localExists;

    target.innerHTML = `
      <div class="wod-package-output">
        <section class="wod-package-output-card">
          <h5>${escapeHtml(pkg.location.name)} · ${escapeHtml(INVENTORY_STATUS_LABELS[pkg.location.inventoryStatus])}</h5>
          <p><strong>World:</strong> ${escapeHtml(pkg.worldSeedLabel)}</p>
          <p><strong>Game line:</strong> ${escapeHtml(pkg.gameLine)}</p>
          <p><strong>Context:</strong> ${escapeHtml(pkg.location.contextSnapshot.contextTitle)} — ${escapeHtml(pkg.location.contextSnapshot.contextEffect)}</p>
          <p class="wod-package-meta">${escapeHtml(pkg.worldSeedKey)} · ${escapeHtml(pkg.locationKey)} · ${escapeHtml(pkg.packageKey)}</p>
          <p>${globalExists ? 'Published globally and immutable.' : localExists ? 'Saved locally and immutable until locally deleted.' : 'Unsaved generated snapshot.'}</p>
        </section>
        ${renderOutputCard('Population', pkg.outputs.population)}
        ${renderOutputCard('Struggle', pkg.outputs.struggle)}
        ${renderOutputCard('Adventure Hook', pkg.outputs.adventureHook)}
        ${renderOutputCard('Location Seed', pkg.outputs.locationSeed)}
        ${renderOutputCard('Content Item', pkg.outputs.item)}
        <section class="wod-package-output-card">
          <h5>Cross-linked generators</h5>
          <div class="wod-package-links">${pkg.crossLinks.map(link => `<button type="button" class="wod-package-link" data-wod-crosslink="${escapeHtml(link.id)}">${escapeHtml(link.label)}</button>`).join('')}</div>
        </section>
      </div>`;

    target.querySelectorAll('[data-wod-crosslink]').forEach(button => {
      button.addEventListener('click', () => activateCrossLink(button.dataset.wodCrosslink));
    });
  }

  function renderOutputCard(label, output) {
    const fields = Object.entries(output).filter(([key]) => !['id', 'statuses', 'title'].includes(key));
    return `<section class="wod-package-output-card"><h5>${escapeHtml(label)}: ${escapeHtml(output.title)}</h5>${fields.map(([key, value]) => `<p><strong>${escapeHtml(key.replace(/([A-Z])/g, ' $1'))}:</strong> ${escapeHtml(value)}</p>`).join('')}</section>`;
  }

  function activateCrossLink(linkId) {
    const pkg = state.currentPackage;
    const link = pkg?.crossLinks.find(candidate => candidate.id === linkId);
    if (!pkg || !link) return;
    const context = {
      worldSeedKey: pkg.worldSeedKey,
      packageKey: pkg.packageKey,
      locationKey: pkg.locationKey,
      gameLine: pkg.gameLine,
      generatorId: link.id,
      generatorLabel: link.label,
      package: clone(pkg)
    };
    writeStorage(STORAGE.activeContext, context);
    document.dispatchEvent(new CustomEvent('wod:open-linked-generator', { detail: clone(context) }));
    renderStatus(`${link.label} now has this world-seeded location package as its active Chronicle context.`, 'success');
  }

  function ensureLocalWorldRecord(world) {
    state.localRegistry.worlds[world.worldSeedKey] ||= {
      worldSeedKey: world.worldSeedKey,
      label: world.label,
      seedValue: world.seedValue,
      createdAt: world.createdAt,
      source: 'local',
      packages: {}
    };
    state.localRegistry.worlds[world.worldSeedKey].packages ||= {};
    return state.localRegistry.worlds[world.worldSeedKey];
  }

  function saveCurrentPackageLocally() {
    const pkg = state.currentPackage;
    const world = worldForRef();
    if (!pkg || !world) return;
    const localWorld = ensureLocalWorldRecord(world);
    const existing = localWorld.packages[pkg.packageKey];
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(pkg)) {
        return renderStatus(`Local package ${pkg.packageKey} is immutable. Delete it before regenerating.`, 'error');
      }
      return renderStatus(`Local package ${pkg.packageKey} is already saved.`, 'success');
    }
    localWorld.packages[pkg.packageKey] = clone(pkg);
    if (!writeStorage(STORAGE.localRegistry, state.localRegistry)) {
      delete localWorld.packages[pkg.packageKey];
      return renderStatus('Browser storage could not save this package.', 'error');
    }
    renderSavedPackageLists();
    renderWorldMeta();
    renderPackageOutput();
    renderStatus(`Saved ${pkg.packageKey} locally under ${world.label}. It cannot be changed unless deleted first.`, 'success');
  }

  function deleteCurrentLocalPackage() {
    const pkg = state.currentPackage;
    if (!pkg) return;
    const packages = state.localRegistry.worlds?.[pkg.worldSeedKey]?.packages;
    if (!packages?.[pkg.packageKey]) return;
    if (!window.confirm(`Delete local package ${pkg.packageKey}? It may then be regenerated under the same world seed.`)) return;
    delete packages[pkg.packageKey];
    writeStorage(STORAGE.localRegistry, state.localRegistry);
    renderSavedPackageLists();
    renderWorldMeta();
    renderPackageOutput();
    renderStatus(`Deleted local package ${pkg.packageKey}. The world seed remains available.`, 'success');
  }

  function submitCurrentPackageGlobally() {
    const pkg = state.currentPackage;
    const world = worldForRef();
    if (!pkg || !world) return;
    if (pkg.location.claimed || state.currentLocation?.claimed) {
      return renderStatus('Claimed businesses cannot use world-seeded global packages until the claimed-business integration panel is implemented.', 'error');
    }
    if (state.globalRegistry.worlds?.[world.worldSeedKey]?.packages?.[pkg.packageKey]) {
      return renderStatus(`Package ${pkg.packageKey} is already embedded globally and cannot be overwritten.`, 'success');
    }

    const patch = {
      schemaVersion: '2.0.0',
      target: 'data/world-of-darkness/generated_location_registry.json',
      worldSeed: {
        worldSeedKey: world.worldSeedKey,
        label: world.label,
        seedValue: world.seedValue,
        createdAt: world.createdAt
      },
      packageKey: pkg.packageKey,
      package: clone(pkg)
    };
    const body = `<!-- WOD_LOCATION_PACKAGE_PATCH -->\nThis issue contains one immutable world-seeded Chronicle location package.\n\n\`\`\`json\n${JSON.stringify(patch, null, 2)}\n\`\`\`\n`;
    const title = `[WOD-WORLD] ${world.label} · ${pkg.location.name} · ${pkg.packageKey}`;
    window.open(`https://github.com/${REPOSITORY}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`, '_blank', 'noopener');
    renderStatus(`Opened a global submission for ${pkg.packageKey}. After submitting the issue, run “Ingest World of Darkness Location Package” with its issue number.`, 'success');
  }

  function renderSavedPackageLists() {
    const worldKey = state.activeRef?.worldSeedKey;
    if (!worldKey) return;
    const localPackages = state.localRegistry.worlds?.[worldKey]?.packages || {};
    const globalPackages = state.globalRegistry.worlds?.[worldKey]?.packages || {};
    renderPackageList('wod-local-package-list', localPackages, 'local');
    renderPackageList('wod-global-package-list', globalPackages, 'global');
  }

  function renderPackageList(targetId, packages, source) {
    const target = document.getElementById(targetId);
    if (!target) return;
    const entries = Object.values(packages).sort((a, b) => a.location.name.localeCompare(b.location.name) || a.gameLine.localeCompare(b.gameLine));
    if (!entries.length) {
      target.innerHTML = `<p class="wod-note">No ${source === 'global' ? 'embedded global' : 'local'} packages exist in this world seed.</p>`;
      return;
    }
    target.innerHTML = '';
    entries.forEach(pkg => {
      const row = document.createElement('div');
      row.className = 'wod-package-saved-item';
      row.innerHTML = `<button type="button" class="secondary-action"><strong>${escapeHtml(pkg.location.name)}</strong><small>${escapeHtml(pkg.gameLine)} · ${escapeHtml(INVENTORY_STATUS_LABELS[pkg.location.inventoryStatus])} · ${escapeHtml(pkg.packageKey)}</small></button>${source === 'global' ? '<button type="button" class="secondary-action" data-delete-global>Delete instructions</button>' : '<button type="button" class="secondary-action" data-delete-local>Delete</button>'}`;
      row.querySelector('button').addEventListener('click', () => loadSavedPackage(pkg, source));
      row.querySelector('[data-delete-local]')?.addEventListener('click', () => {
        state.currentPackage = clone(pkg);
        deleteCurrentLocalPackage();
      });
      row.querySelector('[data-delete-global]')?.addEventListener('click', () => showGlobalDeleteInstructions(pkg));
      target.appendChild(row);
    });
  }

  function loadSavedPackage(pkg, source) {
    state.currentPackage = clone(pkg);
    renderPackageOutput();
    const url = new URL(window.location.href);
    url.searchParams.set('wodWorld', pkg.worldSeedKey);
    url.searchParams.set('wodScope', source === 'global' ? 'embedded' : state.activeRef.scope);
    url.searchParams.set('wodPackage', pkg.packageKey);
    history.replaceState(null, '', url);
    renderStatus(`Loaded ${source} package ${pkg.packageKey}.`, 'success');
  }

  async function showGlobalDeleteInstructions(pkg) {
    const text = `world_seed_key=${pkg.worldSeedKey}\npackage_key=${pkg.packageKey}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      // Clipboard access is optional.
    }
    window.open(`https://github.com/${REPOSITORY}/actions/workflows/delete-wod-location-package.yml`, '_blank', 'noopener');
    renderStatus(`Opened the owner-only deletion workflow. Use world seed ${pkg.worldSeedKey} and package ${pkg.packageKey}. The keys were copied when browser permissions allowed.`, 'success');
  }

  function renderStatus(message, type = '') {
    const target = document.getElementById('wod-package-location-status');
    if (!target) return;
    target.className = `wod-package-status ${type}`.trim();
    target.textContent = message;
  }

  async function install() {
    if (state.installed) return;
    state.installed = true;
    let attempts = 0;
    while (!buildPanel() && attempts < 120) {
      attempts += 1;
      await wait(100);
    }
    if (!document.getElementById('wod-location-package-panel')) return;

    try {
      await loadData();
      renderWorldSelector();
      renderSavedPackageLists();
      observeLocationSelection();
    } catch (error) {
      renderStatus(`World-seeded package system failed to initialize: ${error.message}`, 'error');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else void install();
})();
