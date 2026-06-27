(() => {
  'use strict';

  const REPOSITORY = 'mrcalzon02/HB-TTRPG-tools';
  const STORAGE = {
    localWorlds: 'hb-wod-local-world-seeds-v2',
    localRegistry: 'hb-wod-generated-location-packages-v2',
    activeWorld: 'hb-wod-active-world-seed-v2',
    activeContext: 'hb-wod-active-location-context-v2'
  };
  const STATUS_LABELS = {
    MUNDANE: 'Mundane / No Known Connection',
    TANGENTIAL: 'Tangential / Peripheral Association',
    ACTIVE_UNREGISTERED: 'Active but Unregistered',
    INVENTORIED: 'Formally Inventoried'
  };
  const GAME_LINES = new Set(['unified', 'vampire', 'werewolf', 'breeds', 'hunter', 'changeling', 'mage']);

  const state = {
    installed: false,
    config: null,
    baseLocations: null,
    contextExpansion: null,
    detailDiversity: null,
    crosslinks: null,
    crosslinkExpansion: null,
    centralRegistry: { entries: {} },
    globalRegistry: { worlds: {} },
    localWorlds: { worlds: {} },
    localRegistry: { worlds: {} },
    activeRef: null,
    currentRecord: null,
    currentPackage: null,
    requestedPackageKey: ''
  };

  const clone = value => JSON.parse(JSON.stringify(value));
  const wait = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds));
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

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
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch (_) { return fallback; }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) { return false; }
  }

  async function loadJson(url) {
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
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
    const worldSeedKey = keyFrom('wodworld', seedValue);
    const collision = state.localWorlds.worlds[worldSeedKey] || state.globalRegistry.worlds?.[worldSeedKey];
    if (collision && collision.seedValue !== seedValue) throw new Error('This seed collides with another world. Use a different value.');
    return {
      worldSeedKey,
      label: String(label || '').trim() || `Local World ${new Date().toLocaleString()}`,
      seedValue,
      createdAt: new Date().toISOString(),
      source: 'local'
    };
  }

  function ensureLocalRegistries() {
    state.localWorlds = readStorage(STORAGE.localWorlds, { schemaVersion: '2.0.0', worlds: {} });
    state.localRegistry = readStorage(STORAGE.localRegistry, { schemaVersion: '2.0.0', worlds: {} });
    state.localWorlds.worlds ||= {};
    state.localRegistry.worlds ||= {};
    if (!Object.keys(state.localWorlds.worlds).length) {
      const world = makeWorldSeed('My Local Chronicle World');
      state.localWorlds.worlds[world.worldSeedKey] = world;
      writeStorage(STORAGE.localWorlds, state.localWorlds);
    }
  }

  async function loadData() {
    state.config = await loadJson('data/world-of-darkness/spatial-engine-config.json');
    const [baseLocations, contextExpansion, detailDiversity, crosslinks, crosslinkExpansion, centralRegistry, globalRegistry] = await Promise.all([
      loadJson(state.config.coreData.locations),
      loadJson(state.config.coreData.contextExpansion),
      loadJson(state.config.coreData.detailDiversity),
      loadJson(state.config.coreData.crosslinks),
      loadJson(state.config.coreData.crosslinkExpansion),
      loadJson(state.config.coreData.centralRegistry),
      loadJson(state.config.coreData.generatedLocationRegistry)
    ]);
    state.baseLocations = baseLocations;
    state.contextExpansion = contextExpansion;
    state.detailDiversity = detailDiversity;
    state.crosslinks = crosslinks;
    state.crosslinkExpansion = crosslinkExpansion;
    state.centralRegistry = centralRegistry || { entries: {} };
    state.globalRegistry = globalRegistry || { schemaVersion: '2.0.0', worlds: {} };
    state.globalRegistry.worlds ||= {};
    ensureLocalRegistries();
  }

  function injectStyles() {
    if (document.getElementById('wod-location-package-style')) return;
    const style = document.createElement('style');
    style.id = 'wod-location-package-style';
    style.textContent = `
      .wod-package-panel{background:#151821;border:1px solid #343845;border-left:5px solid #3c6f9c;border-radius:12px;padding:14px;margin:0 0 14px}
      .wod-package-panel h3,.wod-package-panel h4{margin-top:0}.wod-package-panel label{display:grid;gap:4px;margin-top:8px;color:var(--muted);font-size:.78rem}
      .wod-package-panel input,.wod-package-panel select{width:100%;box-sizing:border-box;background:#10131a;border:1px solid var(--line);color:var(--ink);border-radius:9px;padding:9px}
      .wod-package-seed-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.wod-package-actions{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0}
      .wod-package-status{padding:9px;border:1px solid var(--line);border-radius:9px;background:#0d1016;color:var(--muted);font-size:.78rem}
      .wod-package-status.error{border-color:#8b0000;color:#ffb3b3}.wod-package-status.success{border-color:#2d8f71;color:#a9f1da}
      .wod-package-output{display:grid;gap:8px;margin-top:10px}.wod-package-output-card{border-left:3px solid #7655a8;background:#10131a;padding:9px;border-radius:6px}
      .wod-package-output-card h5{margin:0 0 5px;font-size:.9rem}.wod-package-output-card p{margin:4px 0;font-size:.76rem;line-height:1.38}
      .wod-package-meta{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--accent);font-size:.72rem;word-break:break-all}
      .wod-package-links{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.wod-package-link{border:1px solid var(--line);background:#171b25;color:var(--ink);border-radius:999px;padding:5px 8px;font-size:.7rem;cursor:pointer}
      .wod-package-saved-list{display:grid;gap:6px;margin-top:7px}.wod-package-saved-item{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center;border:1px solid var(--line);border-radius:8px;padding:7px;background:#10131a}
      .wod-package-saved-item button{text-align:left}.wod-package-saved-item small{display:block;color:var(--muted)}
      @media(max-width:700px){.wod-package-seed-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function buildPanel() {
    const matrix = document.getElementById('wod-display-matrix');
    if (!matrix) return false;
    if (document.getElementById('wod-location-package-panel')) return true;
    injectStyles();
    const panel = document.createElement('section');
    panel.id = 'wod-location-package-panel';
    panel.className = 'wod-package-panel';
    panel.innerHTML = `
      <p class="eyebrow">World-seeded Chronicle package</p>
      <h3>Generate, Save Locally, or Submit Globally</h3>
      <p class="wod-note">Each world seed rotates the expanded detail pools independently. Packages remain immutable after local save or global publication.</p>
      <label>Active world seed<select id="wod-world-seed-select"></select></label>
      <div id="wod-world-seed-meta" class="wod-package-status">Loading world seeds…</div>
      <details><summary>Create another local world seed</summary>
        <div class="wod-package-seed-grid"><label>World label<input id="wod-new-world-label"></label><label>Seed value or phrase<input id="wod-new-world-value"></label></div>
        <div class="wod-package-actions"><button id="wod-create-local-world" class="secondary-action">Create Local World</button><button id="wod-delete-local-world" class="secondary-action">Delete Selected Local World</button></div>
      </details>
      <div id="wod-package-location-status" class="wod-package-status">Select a named location from the map.</div>
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
    return {
      embedded: Object.values(state.globalRegistry.worlds || {}).map(world => ({ ...world, scope: 'embedded' })).sort((a, b) => a.label.localeCompare(b.label)),
      local: Object.values(state.localWorlds.worlds || {}).map(world => ({ ...world, scope: 'local' })).sort((a, b) => a.label.localeCompare(b.label))
    };
  }

  function resolveRequestedWorldRef() {
    const params = new URLSearchParams(location.search);
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
    return ref.scope === 'embedded' ? state.globalRegistry.worlds?.[ref.worldSeedKey] : state.localWorlds.worlds?.[ref.worldSeedKey];
  }

  function renderWorldSelector() {
    const select = document.getElementById('wod-world-seed-select');
    const { embedded, local } = allWorldOptions();
    select.innerHTML = '';
    const embeddedGroup = document.createElement('optgroup');
    embeddedGroup.label = 'Embedded global worlds';
    if (!embedded.length) {
      const option = new Option('No embedded worlds published yet', 'none:embedded');
      option.disabled = true;
      embeddedGroup.appendChild(option);
    } else embedded.forEach(world => embeddedGroup.appendChild(new Option(`${world.label} · ${world.worldSeedKey}`, `embedded:${world.worldSeedKey}`)));
    select.appendChild(embeddedGroup);
    const localGroup = document.createElement('optgroup');
    localGroup.label = 'Local browser worlds';
    local.forEach(world => localGroup.appendChild(new Option(`${world.label} · ${world.worldSeedKey}`, `local:${world.worldSeedKey}`)));
    select.appendChild(localGroup);
    const preferred = resolveRequestedWorldRef() || readStorage(STORAGE.activeWorld, null);
    const values = [...select.options].map(option => option.value);
    const preferredValue = preferred ? `${preferred.scope}:${preferred.worldSeedKey}` : '';
    select.value = values.includes(preferredValue) ? preferredValue : `local:${local[0]?.worldSeedKey || ''}`;
    selectWorldRef(select.value, { updateUrl: false });
  }

  function selectWorldRef(value, options = {}) {
    const [scope, worldSeedKey] = String(value || '').split(':');
    if (!['embedded', 'local'].includes(scope) || !worldForRef({ scope, worldSeedKey })) return;
    state.activeRef = { scope, worldSeedKey };
    state.currentPackage = null;
    writeStorage(STORAGE.activeWorld, state.activeRef);
    renderWorldMeta();
    renderSavedPackageLists();
    renderPackageOutput();
    refreshSelectedLocation();
    document.dispatchEvent(new CustomEvent('wod:world-seed-changed', { detail: clone(worldForRef()) }));
    if (options.updateUrl !== false) {
      const url = new URL(location.href);
      url.searchParams.set('wodWorld', worldSeedKey);
      url.searchParams.set('wodScope', scope);
      url.searchParams.delete('wodPackage');
      history.replaceState(null, '', url);
    }
    if (state.requestedPackageKey) {
      const requested = findPackage(state.requestedPackageKey);
      if (requested) state.currentPackage = clone(requested);
      state.requestedPackageKey = '';
      renderPackageOutput();
    }
  }

  function renderWorldMeta() {
    const world = worldForRef();
    const target = document.getElementById('wod-world-seed-meta');
    if (!world || !target) return;
    const localCount = Object.keys(state.localRegistry.worlds?.[world.worldSeedKey]?.packages || {}).length;
    const globalCount = Object.keys(state.globalRegistry.worlds?.[world.worldSeedKey]?.packages || {}).length;
    target.innerHTML = `<strong>${escapeHtml(world.label)}</strong><br><span class="wod-package-meta">${escapeHtml(world.worldSeedKey)}</span><br>${state.activeRef.scope === 'embedded' ? 'Embedded repository world' : 'Local browser world'} · ${localCount} local · ${globalCount} global packages`;
    document.getElementById('wod-delete-local-world').disabled = state.activeRef.scope !== 'local';
  }

  function createLocalWorld() {
    try {
      const world = makeWorldSeed(document.getElementById('wod-new-world-label').value, document.getElementById('wod-new-world-value').value);
      state.localWorlds.worlds[world.worldSeedKey] ||= world;
      writeStorage(STORAGE.localWorlds, state.localWorlds);
      renderWorldSelector();
      document.getElementById('wod-world-seed-select').value = `local:${world.worldSeedKey}`;
      selectWorldRef(`local:${world.worldSeedKey}`);
      renderStatus(`Selected local world ${world.label}.`, 'success');
    } catch (error) { renderStatus(error.message, 'error'); }
  }

  function deleteSelectedLocalWorld() {
    if (state.activeRef?.scope !== 'local') return renderStatus('Embedded worlds cannot be deleted locally.', 'error');
    const world = worldForRef();
    if (!world || !confirm(`Delete local world “${world.label}” and its locally saved packages?`)) return;
    delete state.localWorlds.worlds[world.worldSeedKey];
    delete state.localRegistry.worlds[world.worldSeedKey];
    ensureLocalRegistries();
    writeStorage(STORAGE.localWorlds, state.localWorlds);
    writeStorage(STORAGE.localRegistry, state.localRegistry);
    renderWorldSelector();
  }

  function captureFallbackRecord() {
    const name = document.getElementById('wod-business-name')?.value.trim();
    const address = document.getElementById('wod-business-address')?.value.trim() || '';
    const lat = Number(document.getElementById('wod-business-lat')?.value);
    const lng = Number(document.getElementById('wod-business-lng')?.value);
    const text = document.getElementById('wod-display-matrix')?.textContent || '';
    const locationKey = text.match(/gmaps-[0-9a-f]{8}/)?.[0] || '';
    if (!name || !locationKey || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return {
      entryKey: locationKey,
      name,
      address,
      lat,
      lng,
      category: document.getElementById('wod-business-type')?.value || 'other',
      categoryLabel: document.getElementById('wod-business-type')?.selectedOptions?.[0]?.textContent || 'Other Named Location',
      featureLabel: 'Named Map Feature',
      sourceTags: {},
      googleMapsUrl: document.getElementById('wod-business-url')?.value.trim() || '',
      central: Boolean(state.centralRegistry.entries?.[locationKey])
    };
  }

  function refreshSelectedLocation() {
    state.currentRecord ||= captureFallbackRecord();
    state.currentPackage = null;
    const target = document.getElementById('wod-package-location-status');
    const button = document.getElementById('wod-generate-location-package');
    if (!target || !button) return;
    if (!state.currentRecord) {
      target.textContent = 'Select a named location from the map before generating a package.';
      button.disabled = true;
    } else if (state.currentRecord.central) {
      target.textContent = 'This location is claimed in the central registry. Claimed-business integration remains deferred.';
      target.className = 'wod-package-status error';
      button.disabled = true;
    } else {
      target.className = 'wod-package-status';
      target.textContent = `${state.currentRecord.name} is ready under ${worldForRef()?.label || 'the selected world'}.`;
      button.disabled = !worldForRef();
    }
    renderPackageOutput();
  }

  function selectedGameLine() {
    const line = document.getElementById('wod-spatial-line')?.value || 'unified';
    return GAME_LINES.has(line) ? line : 'unified';
  }

  function rotateArrays(value, seed, path = '') {
    if (Array.isArray(value)) {
      if (!value.length) return [];
      const offset = hash32(`${seed}|${path}`) % value.length;
      return value.slice(offset).concat(value.slice(0, offset)).map((item, index) => rotateArrays(item, seed, `${path}[${index}]`));
    }
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rotateArrays(item, seed, path ? `${path}.${key}` : key)]));
    return value;
  }

  function combinedPool(poolName) {
    return [...(state.crosslinks?.[poolName] || []), ...(state.crosslinkExpansion?.[poolName] || [])];
  }

  function selectPoolEntry(poolName, status, world, locationKey, gameLine) {
    const eligible = combinedPool(poolName).filter(entry => Array.isArray(entry.statuses) && entry.statuses.includes(status));
    if (!eligible.length) throw new Error(`No ${poolName} entries support ${status}.`);
    return clone(eligible[hash32(`${world.seedValue}|${locationKey}|${gameLine}|${poolName}`) % eligible.length]);
  }

  function packageKeyFor(worldSeedKey, locationKey, gameLine) {
    return keyFrom('wodpkg', `${worldSeedKey}|${locationKey}|${gameLine}`);
  }

  function findPackage(packageKey) {
    const worldKey = state.activeRef?.worldSeedKey;
    return state.globalRegistry.worlds?.[worldKey]?.packages?.[packageKey]
      || state.localRegistry.worlds?.[worldKey]?.packages?.[packageKey]
      || null;
  }

  function generateOrLoadPackage() {
    try {
      const world = worldForRef();
      const record = state.currentRecord || captureFallbackRecord();
      if (!world || !record) throw new Error('Select a world seed and named location.');
      if (record.central) throw new Error('Claimed locations remain excluded from world-seeded package generation.');
      if (!window.WODDetailDiversityCore) throw new Error('The detail diversity engine is unavailable.');
      const gameLine = selectedGameLine();
      const packageKey = packageKeyFor(world.worldSeedKey, record.entryKey, gameLine);
      const existing = findPackage(packageKey);
      if (existing) {
        state.currentPackage = clone(existing);
        renderPackageOutput();
        return renderStatus(`Loaded immutable package ${packageKey}.`, 'success');
      }

      const seed = hash32(`${world.seedValue}|${record.entryKey}|${gameLine}|status`);
      const status = window.WODDetailDiversityCore.inventoryStatusFromSeed(seed);
      const scopedData = rotateArrays(state.detailDiversity, world.seedValue);
      const session = window.WODDetailDiversityCore.createSession(scopedData);
      const detail = session.generate({
        location: {
          ...record,
          entryKey: `${world.worldSeedKey}|${record.entryKey}`,
          categoryLabel: record.categoryLabel || record.category,
          featureLabel: record.featureLabel || 'Named Map Feature',
          sourceTags: record.sourceTags || {}
        },
        line: gameLine,
        inventoryStatus: status,
        seed,
        baseLocations: state.baseLocations,
        contextExpansion: state.contextExpansion
      });

      state.currentPackage = {
        schemaVersion: '2.1.0',
        packageKey,
        worldSeedKey: world.worldSeedKey,
        worldSeedLabel: world.label,
        locationKey: record.entryKey,
        gameLine,
        generatedAt: new Date().toISOString(),
        location: {
          name: record.name,
          address: record.address,
          referenceUrl: record.googleMapsUrl || '',
          category: record.category,
          coordinates: { lat: record.lat, lng: record.lng },
          inventoryStatus: status,
          claimed: false,
          spatialContext: {
            source: 'OpenStreetMap / Chronicle radial scan',
            osmType: record.osmType,
            osmId: record.osmId,
            featureLabel: record.featureLabel,
            sourceTags: clone(record.sourceTags || {})
          },
          contextSnapshot: {
            inventoryLabel: STATUS_LABELS[status],
            locationVariant: `${detail.variant} of ${detail.effectiveVariantCount}`,
            contextTitle: detail.contextTitle,
            contextEffect: detail.contextEffect,
            mechanicalSeed: detail.mechanicalSeed,
            publicFacade: detail.publicFacade,
            hiddenFunction: detail.hiddenFunction,
            evidenceConfidence: record.confidence || '',
            catalogueNote: record.catalogueNote || '',
            supernaturalRegistry: record.gothicRegistry || '',
            regionalTheme: clone(detail.regionalTheme),
            associatedCharacter: detail.embeddedCharacter,
            temporalAnchor: detail.temporalAnchor,
            traumaticCatalyst: detail.traumaticCatalyst,
            operationalSecret: detail.operationalSecret,
            vulnerability: detail.vulnerability,
            sensoryAnchor: detail.sensoryAnchor,
            mediaFeed: detail.mediaFeed,
            streetRumor: detail.rumor,
            diversitySignature: detail.diversitySignature
          }
        },
        outputs: {
          population: selectPoolEntry('population', status, world, record.entryKey, gameLine),
          struggle: selectPoolEntry('struggles', status, world, record.entryKey, gameLine),
          adventureHook: selectPoolEntry('adventureHooks', status, world, record.entryKey, gameLine),
          locationSeed: selectPoolEntry('locationSeeds', status, world, record.entryKey, gameLine),
          item: selectPoolEntry('items', status, world, record.entryKey, gameLine)
        },
        crossLinks: clone(state.crosslinks.crossLinks || []),
        source: {
          crosslinkSchemaVersion: state.crosslinks.schemaVersion,
          generatorVersion: 'world-seeded-diversified-location-package-3.0.0',
          contextResolverVersion: '1.0.0',
          detailDiversityVersion: state.detailDiversity.schemaVersion,
          detailDiversityPolicy: 'world-seed-rotated-pools-with-neighborhood-theme-and-field-level-anti-repeat'
        }
      };
      renderPackageOutput();
      renderStatus(`Generated diversified package ${packageKey} under ${world.label}.`, 'success');
    } catch (error) { renderStatus(error.message, 'error'); }
  }

  function renderPackageOutput() {
    const target = document.getElementById('wod-location-package-output');
    const save = document.getElementById('wod-save-location-package-local');
    const submit = document.getElementById('wod-submit-location-package-global');
    const remove = document.getElementById('wod-delete-location-package-local');
    if (!target || !save || !submit || !remove) return;
    const pkg = state.currentPackage;
    if (!pkg) {
      target.innerHTML = '';
      save.disabled = submit.disabled = remove.disabled = true;
      return;
    }
    const localExists = Boolean(state.localRegistry.worlds?.[pkg.worldSeedKey]?.packages?.[pkg.packageKey]);
    const globalExists = Boolean(state.globalRegistry.worlds?.[pkg.worldSeedKey]?.packages?.[pkg.packageKey]);
    save.disabled = localExists;
    submit.disabled = globalExists;
    remove.disabled = !localExists;
    const snapshot = pkg.location.contextSnapshot;
    target.innerHTML = `
      <div class="wod-package-output">
        <section class="wod-package-output-card">
          <h5>${escapeHtml(pkg.location.name)} · ${escapeHtml(STATUS_LABELS[pkg.location.inventoryStatus])}</h5>
          <p><strong>World:</strong> ${escapeHtml(pkg.worldSeedLabel)} · <strong>Game line:</strong> ${escapeHtml(pkg.gameLine)}</p>
          <p><strong>Regional theme:</strong> ${escapeHtml(snapshot.regionalTheme?.label || 'Unclassified')}</p>
          <p><strong>Context:</strong> ${escapeHtml(snapshot.contextTitle)} — ${escapeHtml(snapshot.contextEffect)}</p>
          <p><strong>Facade:</strong> ${escapeHtml(snapshot.publicFacade)}</p>
          <p><strong>Hidden function:</strong> ${escapeHtml(snapshot.hiddenFunction)}</p>
          <p><strong>Associated character:</strong> ${escapeHtml(snapshot.associatedCharacter)}</p>
          <p><strong>Sensory anchor:</strong> ${escapeHtml(snapshot.sensoryAnchor)}</p>
          <p><strong>Street rumor:</strong> ${escapeHtml(snapshot.streetRumor)}</p>
          <p class="wod-package-meta">${escapeHtml(pkg.worldSeedKey)} · ${escapeHtml(pkg.locationKey)} · ${escapeHtml(pkg.packageKey)} · diversity ${escapeHtml(snapshot.diversitySignature || '')}</p>
        </section>
        ${renderOutputCard('Population', pkg.outputs.population)}
        ${renderOutputCard('Struggle', pkg.outputs.struggle)}
        ${renderOutputCard('Adventure Hook', pkg.outputs.adventureHook)}
        ${renderOutputCard('Location Seed', pkg.outputs.locationSeed)}
        ${renderOutputCard('Content Item', pkg.outputs.item)}
        <section class="wod-package-output-card"><h5>Cross-linked generators</h5><div class="wod-package-links">${pkg.crossLinks.map(link => `<button type="button" class="wod-package-link" data-wod-crosslink="${escapeHtml(link.id)}">${escapeHtml(link.label)}</button>`).join('')}</div></section>
      </div>`;
    target.querySelectorAll('[data-wod-crosslink]').forEach(button => button.addEventListener('click', () => activateCrossLink(button.dataset.wodCrosslink)));
  }

  function renderOutputCard(label, output) {
    const fields = Object.entries(output || {}).filter(([key]) => !['id', 'statuses', 'title', 'applicability'].includes(key));
    return `<section class="wod-package-output-card"><h5>${escapeHtml(label)}: ${escapeHtml(output?.title || 'Unassigned')}</h5>${fields.map(([key, value]) => `<p><strong>${escapeHtml(key.replace(/([A-Z])/g, ' $1'))}:</strong> ${escapeHtml(typeof value === 'string' ? value : JSON.stringify(value))}</p>`).join('')}</section>`;
  }

  function activateCrossLink(linkId) {
    const pkg = state.currentPackage;
    const link = pkg?.crossLinks.find(candidate => candidate.id === linkId);
    if (!pkg || !link) return;
    const context = { worldSeedKey: pkg.worldSeedKey, packageKey: pkg.packageKey, locationKey: pkg.locationKey, gameLine: pkg.gameLine, generatorId: link.id, generatorLabel: link.label, package: clone(pkg) };
    writeStorage(STORAGE.activeContext, context);
    document.dispatchEvent(new CustomEvent('wod:open-linked-generator', { detail: clone(context) }));
    renderStatus(`${link.label} now uses this immutable package as active context.`, 'success');
  }

  function ensureLocalWorldRecord(world) {
    state.localRegistry.worlds[world.worldSeedKey] ||= { worldSeedKey: world.worldSeedKey, label: world.label, seedValue: world.seedValue, createdAt: world.createdAt, source: 'local', packages: {} };
    state.localRegistry.worlds[world.worldSeedKey].packages ||= {};
    return state.localRegistry.worlds[world.worldSeedKey];
  }

  function saveCurrentPackageLocally() {
    const pkg = state.currentPackage;
    const world = worldForRef();
    if (!pkg || !world) return;
    const packages = ensureLocalWorldRecord(world).packages;
    if (packages[pkg.packageKey]) return renderStatus('This immutable local package already exists. Delete it before regeneration.', 'error');
    packages[pkg.packageKey] = clone(pkg);
    if (!writeStorage(STORAGE.localRegistry, state.localRegistry)) {
      delete packages[pkg.packageKey];
      return renderStatus('Browser storage could not save this package.', 'error');
    }
    renderSavedPackageLists();
    renderWorldMeta();
    renderPackageOutput();
    renderStatus(`Saved ${pkg.packageKey} locally with diversity signature ${pkg.location.contextSnapshot.diversitySignature}.`, 'success');
  }

  function deleteCurrentLocalPackage() {
    const pkg = state.currentPackage;
    const packages = state.localRegistry.worlds?.[pkg?.worldSeedKey]?.packages;
    if (!pkg || !packages?.[pkg.packageKey]) return;
    if (!confirm(`Delete local package ${pkg.packageKey}?`)) return;
    delete packages[pkg.packageKey];
    writeStorage(STORAGE.localRegistry, state.localRegistry);
    renderSavedPackageLists();
    renderWorldMeta();
    renderPackageOutput();
  }

  function submitCurrentPackageGlobally() {
    const pkg = state.currentPackage;
    const world = worldForRef();
    if (!pkg || !world) return;
    if (state.globalRegistry.worlds?.[world.worldSeedKey]?.packages?.[pkg.packageKey]) return renderStatus('This package is already embedded globally.', 'success');
    const patch = {
      schemaVersion: '2.1.0',
      target: 'data/world-of-darkness/generated_location_registry.json',
      worldSeed: { worldSeedKey: world.worldSeedKey, label: world.label, seedValue: world.seedValue, createdAt: world.createdAt },
      packageKey: pkg.packageKey,
      package: clone(pkg)
    };
    const body = `<!-- WOD_LOCATION_PACKAGE_PATCH -->\nThis issue contains one immutable diversified world-seeded Chronicle location package.\n\n\`\`\`json\n${JSON.stringify(patch, null, 2)}\n\`\`\`\n`;
    const title = `[WOD-WORLD] ${world.label} · ${pkg.location.name} · ${pkg.packageKey}`;
    window.open(`https://github.com/${REPOSITORY}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`, '_blank', 'noopener');
    renderStatus(`Opened global submission for ${pkg.packageKey}.`, 'success');
  }

  function renderSavedPackageLists() {
    const worldKey = state.activeRef?.worldSeedKey;
    if (!worldKey) return;
    renderPackageList('wod-local-package-list', state.localRegistry.worlds?.[worldKey]?.packages || {}, 'local');
    renderPackageList('wod-global-package-list', state.globalRegistry.worlds?.[worldKey]?.packages || {}, 'global');
  }

  function renderPackageList(targetId, packages, source) {
    const target = document.getElementById(targetId);
    if (!target) return;
    const entries = Object.values(packages).sort((a, b) => a.location.name.localeCompare(b.location.name));
    if (!entries.length) return void (target.innerHTML = `<p class="wod-note">No ${source} packages exist in this world seed.</p>`);
    target.innerHTML = '';
    for (const pkg of entries) {
      const row = document.createElement('div');
      row.className = 'wod-package-saved-item';
      row.innerHTML = `<button type="button" class="secondary-action"><strong>${escapeHtml(pkg.location.name)}</strong><small>${escapeHtml(pkg.gameLine)} · ${escapeHtml(STATUS_LABELS[pkg.location.inventoryStatus])} · ${escapeHtml(pkg.packageKey)}</small></button>${source === 'local' ? '<button type="button" class="secondary-action" data-delete-local>Delete</button>' : '<button type="button" class="secondary-action" data-delete-global>Delete instructions</button>'}`;
      row.querySelector('button').addEventListener('click', () => loadSavedPackage(pkg, source));
      row.querySelector('[data-delete-local]')?.addEventListener('click', () => { state.currentPackage = clone(pkg); deleteCurrentLocalPackage(); });
      row.querySelector('[data-delete-global]')?.addEventListener('click', () => showGlobalDeleteInstructions(pkg));
      target.appendChild(row);
    }
  }

  function loadSavedPackage(pkg, source) {
    state.currentPackage = clone(pkg);
    renderPackageOutput();
    const url = new URL(location.href);
    url.searchParams.set('wodWorld', pkg.worldSeedKey);
    url.searchParams.set('wodScope', source === 'global' ? 'embedded' : state.activeRef.scope);
    url.searchParams.set('wodPackage', pkg.packageKey);
    history.replaceState(null, '', url);
    renderStatus(`Loaded ${source} package ${pkg.packageKey}.`, 'success');
  }

  async function showGlobalDeleteInstructions(pkg) {
    try { await navigator.clipboard.writeText(`world_seed_key=${pkg.worldSeedKey}\npackage_key=${pkg.packageKey}`); }
    catch (_) { /* optional */ }
    window.open(`https://github.com/${REPOSITORY}/actions/workflows/delete-wod-location-package.yml`, '_blank', 'noopener');
    renderStatus('Opened the owner-only global deletion workflow.', 'success');
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
    for (let attempt = 0; attempt < 120 && !buildPanel(); attempt += 1) await wait(100);
    if (!document.getElementById('wod-location-package-panel')) return;
    try {
      await loadData();
      renderWorldSelector();
      renderSavedPackageLists();
      document.addEventListener('wod:radial-location-selected', event => {
        state.currentRecord = clone(event.detail?.record || null);
        refreshSelectedLocation();
      });
      document.addEventListener('wod:world-seed-changed', () => {
        state.currentPackage = null;
        refreshSelectedLocation();
      });
      refreshSelectedLocation();
    } catch (error) {
      renderStatus(`World-seeded package system failed to initialize: ${error.message}`, 'error');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else void install();
})();
