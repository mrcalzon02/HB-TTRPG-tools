(() => {
  'use strict';

  const REPOSITORY = 'mrcalzon02/HB-TTRPG-tools';
  const REGISTRY_SCHEMA = '1.2.0';
  const GLOBAL_REGISTRY_URL = 'data/shadowrun/sprawl_location_registry.json';
  const WORKFLOW = 'ingest-shadowrun-sprawl-location.yml';
  const STORAGE = Object.freeze({
    localWorlds: 'hb-shadowrun-local-sprawl-seeds-v1',
    localRegistry: 'hb-shadowrun-sprawl-location-registry-v3',
    activeWorld: 'hb-shadowrun-active-sprawl-seed-v1',
    legacyRegistry: 'hb-shadowrun-sprawl-location-registry-v2'
  });

  const state = {
    installed: false,
    localWorlds: { schemaVersion: '1.0.0', worlds: {} },
    localRegistry: { schemaVersion: REGISTRY_SCHEMA, worlds: {} },
    globalRegistry: { schemaVersion: REGISTRY_SCHEMA, worlds: {} },
    activeRef: null,
    currentSite: null,
    currentPackage: null,
    lastSiteKey: '',
    requestedPackageKey: ''
  };

  const clone = value => JSON.parse(JSON.stringify(value));
  const wait = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds));
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

  function hash32(input, seed = 2166136261) {
    let hash = seed >>> 0;
    for (const character of String(input)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x85ebca6b);
    hash ^= hash >>> 13;
    hash = Math.imul(hash, 0xc2b2ae35);
    hash ^= hash >>> 16;
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
    const worldSeedKey = keyFrom('srworld', seedValue);
    const collision = state.localWorlds.worlds?.[worldSeedKey] || state.globalRegistry.worlds?.[worldSeedKey];
    if (collision && collision.seedValue !== seedValue) throw new Error('This seed collides with another sprawl world. Use a different value.');
    return {
      worldSeedKey,
      label: String(label || '').trim() || `Local Sprawl ${new Date().toLocaleString()}`,
      seedValue,
      createdAt: new Date().toISOString(),
      source: 'local'
    };
  }

  function defaultWorld() {
    return Object.values(state.localWorlds.worlds || {})[0] || null;
  }

  function legacyPackageFromEntry(entry, world) {
    const danger = window.ShadowrunDangerIntensity;
    const profile = ['low', 'standard', 'high', 'prime'].includes(entry.threat) ? entry.threat : 'standard';
    const intensity = Number(entry.dangerIntensityPercent ?? danger?.defaults?.[profile] ?? 50);
    const packageKey = keyFrom('srpkg', `${world.worldSeedKey}|${entry.entryKey}|${entry.focus || 'balanced'}|${profile}|${intensity.toFixed(2)}`);
    return {
      schemaVersion: REGISTRY_SCHEMA,
      packageKey,
      worldSeedKey: world.worldSeedKey,
      worldSeedLabel: world.label,
      generatedAt: entry.savedAt || new Date().toISOString(),
      locationKey: entry.entryKey,
      focus: entry.focus || 'balanced',
      focusLabel: entry.focusLabel || 'Balanced Sprawl Mix',
      threatProfile: profile,
      threatLabel: entry.threatLabel || danger?.profileLabel?.(profile) || profile,
      dangerIntensityPercent: intensity,
      effectiveThreat: danger?.effectiveThreatForIntensity?.(intensity) || profile,
      location: {
        entryKey: entry.entryKey,
        name: entry.name || 'Migrated Shadowrun Location',
        address: entry.address || '',
        coordinates: clone(entry.coordinates || { lat: 0, lng: 0 }),
        sourceCategory: entry.sourceCategory || 'other',
        sourceCategoryLabel: entry.sourceCategoryLabel || 'Other POI',
        archetypeId: entry.archetypeId || 'migrated-location',
        archetypeName: entry.archetypeName || 'Migrated Location',
        shadowCategory: entry.shadowCategory || 'Other',
        publicFacade: entry.publicFacade || '',
        shadowUse: entry.shadowUse || '',
        accessVector: entry.accessVector || '',
        security: entry.security || '',
        matrix: entry.matrix || '',
        magical: entry.magical || '',
        clues: Array.isArray(entry.clues) ? entry.clues : [],
        complication: entry.complication || '',
        legwork: Array.isArray(entry.legwork) ? entry.legwork : [],
        relatedSites: Array.isArray(entry.relatedSites) ? entry.relatedSites : [],
        mapsUrl: entry.mapsUrl || '',
        streetViewUrl: entry.streetViewUrl || '',
        workspaceStatus: entry.workspaceStatus || 'STANDARD_UNCLAIMED'
      },
      source: { generatorVersion: 'shadowrun-sprawl-seed-workspace-migrated-1.0.0' }
    };
  }

  function normalizeRegistry(value, migrationWorld = null) {
    if (value?.schemaVersion === REGISTRY_SCHEMA && value.worlds && typeof value.worlds === 'object') {
      return { schemaVersion: REGISTRY_SCHEMA, worlds: value.worlds };
    }
    const registry = { schemaVersion: REGISTRY_SCHEMA, worlds: {} };
    if (!migrationWorld) return registry;
    const packages = {};
    for (const pkg of Object.values(value?.packages || {})) {
      if (!pkg?.packageKey) continue;
      packages[pkg.packageKey] = {
        ...clone(pkg),
        schemaVersion: REGISTRY_SCHEMA,
        worldSeedKey: migrationWorld.worldSeedKey,
        worldSeedLabel: migrationWorld.label
      };
    }
    for (const entry of Object.values(value?.entries || {})) {
      if (!entry?.entryKey) continue;
      const pkg = legacyPackageFromEntry(entry, migrationWorld);
      packages[pkg.packageKey] = pkg;
    }
    if (Object.keys(packages).length) {
      registry.worlds[migrationWorld.worldSeedKey] = {
        ...clone(migrationWorld),
        packages
      };
    }
    return registry;
  }

  function ensureLocalRegistries() {
    state.localWorlds = readStorage(STORAGE.localWorlds, { schemaVersion: '1.0.0', worlds: {} });
    state.localWorlds.worlds ||= {};
    if (!Object.keys(state.localWorlds.worlds).length) {
      const world = makeWorldSeed('My Local Shadowrun Sprawl');
      state.localWorlds.worlds[world.worldSeedKey] = world;
      writeStorage(STORAGE.localWorlds, state.localWorlds);
    }
    const migrationWorld = defaultWorld();
    const current = readStorage(STORAGE.localRegistry, null);
    state.localRegistry = current
      ? normalizeRegistry(current, migrationWorld)
      : normalizeRegistry(readStorage(STORAGE.legacyRegistry, null), migrationWorld);
    state.localRegistry.worlds ||= {};
    writeStorage(STORAGE.localRegistry, state.localRegistry);
    const storedRef = readStorage(STORAGE.activeWorld, null);
    if (storedRef?.scope === 'local' && state.localWorlds.worlds[storedRef.worldSeedKey]) state.activeRef = storedRef;
    else state.activeRef = { scope: 'local', worldSeedKey: migrationWorld.worldSeedKey };
  }

  async function loadGlobalRegistry() {
    try {
      const response = await fetch(GLOBAL_REGISTRY_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`${GLOBAL_REGISTRY_URL} returned ${response.status}`);
      const raw = await response.json();
      if (raw?.schemaVersion === REGISTRY_SCHEMA && raw.worlds && typeof raw.worlds === 'object') {
        state.globalRegistry = raw;
      } else {
        state.globalRegistry = normalizeRegistry(raw, null);
      }
    } catch (error) {
      state.globalRegistry = { schemaVersion: REGISTRY_SCHEMA, worlds: {} };
      setStatus(`Embedded global seeds could not be loaded: ${error.message}`, 'error');
    }
  }

  function worldForRef(ref = state.activeRef) {
    if (!ref) return null;
    return ref.scope === 'embedded'
      ? state.globalRegistry.worlds?.[ref.worldSeedKey]
      : state.localWorlds.worlds?.[ref.worldSeedKey] || state.localRegistry.worlds?.[ref.worldSeedKey];
  }

  function activeWorld() {
    return worldForRef() || defaultWorld();
  }

  function allWorldOptions() {
    return {
      embedded: Object.values(state.globalRegistry.worlds || {}).map(world => ({ ...world, scope: 'embedded' })).sort((left, right) => left.label.localeCompare(right.label)),
      local: Object.values(state.localWorlds.worlds || {}).map(world => ({ ...world, scope: 'local' })).sort((left, right) => left.label.localeCompare(right.label))
    };
  }

  function resolveRequestedWorldRef() {
    const params = new URLSearchParams(location.search);
    const key = params.get('srWorld');
    const scope = params.get('srScope');
    state.requestedPackageKey = params.get('srPackage') || '';
    if (!/^srworld-[0-9a-f]{8}$/.test(key || '')) return null;
    if (scope === 'embedded' && state.globalRegistry.worlds?.[key]) return { scope, worldSeedKey: key };
    if (scope === 'local' && state.localWorlds.worlds?.[key]) return { scope, worldSeedKey: key };
    if (state.globalRegistry.worlds?.[key]) return { scope: 'embedded', worldSeedKey: key };
    if (state.localWorlds.worlds?.[key]) return { scope: 'local', worldSeedKey: key };
    return null;
  }

  function dangerApi() {
    return window.ShadowrunDangerIntensity;
  }

  function profileOrder() {
    return dangerApi()?.profiles || ['low', 'standard', 'high', 'prime'];
  }

  function profileLabel(profile) {
    return dangerApi()?.profileLabel?.(profile) || profile;
  }

  function getIntensity(profile = activeProfile()) {
    return dangerApi()?.getValue?.(profile) ?? 50;
  }

  function formatPercent(value) {
    return dangerApi()?.formatPercent?.(value) || String(Math.round(Number(value) || 0));
  }

  function effectiveThreat(value) {
    return dangerApi()?.effectiveThreatForIntensity?.(value) || 'standard';
  }

  function activeProfile() {
    const value = document.getElementById('sr-package-threat-profile')?.value
      || document.getElementById('sr-spatial-threat')?.value
      || 'standard';
    return profileOrder().includes(value) ? value : 'standard';
  }

  function wrapSeedEngine() {
    dangerApi()?.wrapEngine?.();
    const original = window.ShadowrunSprawlDiscoveryEngine;
    if (!original) return false;
    if (original.__sprawlSeedWrapped) return true;
    const baseGenerate = original.generateSprawlDiscovery.bind(original);
    window.ShadowrunSprawlDiscoveryEngine = Object.freeze({
      ...original,
      __sprawlSeedWrapped: true,
      __baseSeededGenerateSprawlDiscovery: baseGenerate,
      generateSprawlDiscovery(input = {}) {
        const world = activeWorld();
        const seedValue = world?.seedValue || 'baseline-shadowrun-sprawl';
        const result = baseGenerate({
          ...input,
          seed: `${input.seed || ''}|sprawl-world:${seedValue}`
        });
        return {
          ...result,
          worldSeedKey: world?.worldSeedKey || 'srworld-baseline',
          worldSeedLabel: world?.label || 'Baseline Shadowrun Sprawl',
          sites: (result.sites || []).map(site => ({
            ...site,
            worldSeedKey: world?.worldSeedKey || 'srworld-baseline',
            worldSeedLabel: world?.label || 'Baseline Shadowrun Sprawl'
          }))
        };
      }
    });
    return true;
  }

  function injectStyles() {
    if (document.getElementById('sr-sprawl-seed-style')) return;
    const style = document.createElement('style');
    style.id = 'sr-sprawl-seed-style';
    style.textContent = `
      .sr-seed-panel{background:#151821;border:1px solid #343845;border-left:5px solid #3c6f9c;border-radius:12px;padding:14px;margin:0 0 14px}
      .sr-seed-panel h3,.sr-seed-panel h4{margin-top:0}.sr-seed-panel label{display:grid;gap:4px;margin-top:8px;color:var(--muted);font-size:.78rem}
      .sr-seed-panel select,.sr-seed-panel input{width:100%;box-sizing:border-box;background:#10131a;border:1px solid var(--line);color:var(--ink);border-radius:9px;padding:9px}
      .sr-seed-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.sr-seed-actions{display:grid;gap:8px;margin:10px 0}.sr-seed-actions button{width:100%;min-height:40px;border-radius:999px}
      .sr-seed-inline-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}.sr-seed-status{padding:9px;border:1px solid var(--line);border-radius:9px;background:#0d1016;color:var(--muted);font-size:.78rem;line-height:1.4;margin-top:8px}
      .sr-seed-status.error{border-color:#8b0000;color:#ffb3b3}.sr-seed-status.success{border-color:#2d8f71;color:#a9f1da}
      .sr-seed-meta{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--accent);font-size:.72rem;word-break:break-all}
      .sr-seed-intensity{display:grid;gap:6px;margin-top:10px}.sr-seed-intensity-heading{display:flex;justify-content:space-between;gap:10px;align-items:center;font-weight:800;color:var(--ink)}
      .sr-seed-intensity output{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--accent);font-size:.92rem}.sr-seed-intensity input[type="range"]{padding:0;accent-color:var(--accent)}
      .sr-seed-note{color:var(--muted);font-size:.72rem;line-height:1.4;margin:8px 0}.sr-seed-output{display:grid;gap:8px;margin-top:10px}.sr-seed-output-card{border-left:3px solid #7655a8;background:#10131a;padding:9px;border-radius:6px}
      .sr-seed-output-card h4{margin:0 0 5px}.sr-seed-output-card p{margin:4px 0;font-size:.76rem;line-height:1.38}.sr-seed-list{display:grid;gap:6px;margin-top:7px}
      .sr-seed-item{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center;border:1px solid var(--line);border-radius:8px;padding:7px;background:#10131a}.sr-seed-item button:first-child{text-align:left}.sr-seed-item small{display:block;color:var(--muted)}
      @media(max-width:700px){.sr-seed-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function profileOptions() {
    return profileOrder().map(profile => `<option value="${escapeHtml(profile)}">${escapeHtml(profileLabel(profile))}</option>`).join('');
  }

  function buildPanel() {
    const display = document.getElementById('sr-spatial-display');
    if (!display) return false;
    document.getElementById('sr-spatial-registry-card')?.remove();
    injectStyles();
    const panel = document.createElement('section');
    panel.id = 'sr-spatial-registry-card';
    panel.className = 'sr-seed-panel';
    panel.innerHTML = `
      <p class="eyebrow">World-seeded Shadowrun sprawl package</p>
      <h3>Generate, Save Locally, or Submit Globally</h3>
      <p class="helper-note">Each sprawl seed rotates the deterministic location details independently. Packages remain immutable after local save or global publication.</p>
      <label>Active sprawl seed<select id="sr-world-seed-select"></select></label>
      <div id="sr-world-seed-meta" class="sr-seed-status">Loading sprawl seeds…</div>
      <details><summary>Create another local sprawl seed</summary>
        <div class="sr-seed-grid"><label>Sprawl label<input id="sr-new-world-label"></label><label>Seed value or phrase<input id="sr-new-world-value"></label></div>
        <div class="sr-seed-inline-actions"><button id="sr-create-local-world" type="button" class="secondary-action">Create Local Sprawl</button><button id="sr-delete-local-world" type="button" class="secondary-action">Delete Selected Local Sprawl</button></div>
      </details>
      <label>Active danger profile<select id="sr-package-threat-profile">${profileOptions()}</select></label>
      <div class="sr-seed-intensity">
        <div class="sr-seed-intensity-heading"><span>Danger intensity</span><output id="sr-package-danger-output"></output></div>
        <input id="sr-package-danger-intensity" type="range" min="0" max="100" step="1" aria-label="Shadowrun danger intensity percentage">
        <div id="sr-package-danger-note" class="sr-seed-note"></div>
      </div>
      <div id="sr-spatial-registry-status" class="sr-seed-status" role="status" aria-live="polite">Select a named location from the map before generating a package.</div>
      <div class="sr-seed-actions">
        <button id="sr-spatial-registry-generate" type="button" class="primary-action" disabled>Generate Linked Package</button>
        <button id="sr-spatial-registry-save-local" type="button" class="secondary-action" disabled>Save Locally</button>
        <button id="sr-spatial-registry-submit-global" type="button" class="primary-action" disabled>Submit Globally</button>
        <button id="sr-spatial-registry-delete-local" type="button" class="secondary-action" disabled>Delete Local Package</button>
      </div>
      <p class="sr-seed-note">Global publication opens a recoverable GitHub handoff, copies the complete payload, and links to the owner-run ingestion workflow.</p>
      <div id="sr-spatial-package-output"></div>
      <details><summary>Local packages in this sprawl world</summary><div id="sr-spatial-local-registry-list" class="sr-seed-list"></div></details>
      <details><summary>Embedded global packages in this sprawl world</summary><div id="sr-spatial-global-registry-list" class="sr-seed-list"></div></details>`;
    display.insertAdjacentElement('afterend', panel);
    bindPanel();
    return true;
  }

  function bindPanel() {
    document.getElementById('sr-world-seed-select').addEventListener('change', event => selectWorldRef(event.target.value));
    document.getElementById('sr-create-local-world').addEventListener('click', createLocalWorld);
    document.getElementById('sr-delete-local-world').addEventListener('click', deleteSelectedLocalWorld);
    document.getElementById('sr-spatial-registry-generate').addEventListener('click', generateLinkedPackage);
    document.getElementById('sr-spatial-registry-save-local').addEventListener('click', saveCurrentLocally);
    document.getElementById('sr-spatial-registry-submit-global').addEventListener('click', submitCurrentGlobally);
    document.getElementById('sr-spatial-registry-delete-local').addEventListener('click', deleteCurrentLocal);
    const profile = document.getElementById('sr-package-threat-profile');
    const intensity = document.getElementById('sr-package-danger-intensity');
    profile.addEventListener('change', () => {
      syncDiscoveryThreat(profile.value);
      state.currentPackage = null;
      syncIntensityControl(profile.value);
      renderPackageOutput();
      refreshCurrent();
      regenerateDiscoveryRecords();
    });
    intensity.addEventListener('input', () => updateIntensityOutput(intensity.value));
    intensity.addEventListener('change', () => {
      dangerApi()?.setValue?.(activeProfile(), intensity.value);
      state.currentPackage = null;
      renderPackageOutput();
      refreshCurrent();
      regenerateDiscoveryRecords();
    });
    document.getElementById('sr-spatial-threat')?.addEventListener('change', event => {
      if (profile.value !== event.target.value) profile.value = event.target.value;
      state.currentPackage = null;
      syncIntensityControl(event.target.value);
      renderPackageOutput();
      refreshCurrent();
    });
    document.getElementById('sr-spatial-focus')?.addEventListener('change', () => {
      state.currentPackage = null;
      renderPackageOutput();
      refreshCurrent();
    });
  }

  function renderWorldSelector() {
    const select = document.getElementById('sr-world-seed-select');
    if (!select) return;
    const { embedded, local } = allWorldOptions();
    select.innerHTML = '';
    const embeddedGroup = document.createElement('optgroup');
    embeddedGroup.label = 'Embedded global sprawls';
    if (!embedded.length) {
      const option = new Option('No embedded sprawls published yet', 'none:embedded');
      option.disabled = true;
      embeddedGroup.appendChild(option);
    } else {
      for (const world of embedded) embeddedGroup.appendChild(new Option(`${world.label} · ${world.worldSeedKey}`, `embedded:${world.worldSeedKey}`));
    }
    select.appendChild(embeddedGroup);
    const localGroup = document.createElement('optgroup');
    localGroup.label = 'Local browser sprawls';
    for (const world of local) localGroup.appendChild(new Option(`${world.label} · ${world.worldSeedKey}`, `local:${world.worldSeedKey}`));
    select.appendChild(localGroup);
    const requested = resolveRequestedWorldRef();
    const preferred = requested || state.activeRef || readStorage(STORAGE.activeWorld, null);
    const values = [...select.options].map(option => option.value);
    const preferredValue = preferred ? `${preferred.scope}:${preferred.worldSeedKey}` : '';
    const fallbackValue = `local:${local[0]?.worldSeedKey || ''}`;
    select.value = values.includes(preferredValue) ? preferredValue : fallbackValue;
    selectWorldRef(select.value, { updateUrl: false, regenerate: false });
  }

  function selectWorldRef(value, options = {}) {
    const [scope, worldSeedKey] = String(value || '').split(':');
    if (!['embedded', 'local'].includes(scope) || !worldForRef({ scope, worldSeedKey })) return;
    state.activeRef = { scope, worldSeedKey };
    state.currentPackage = null;
    writeStorage(STORAGE.activeWorld, state.activeRef);
    renderWorldMeta();
    renderLists();
    renderPackageOutput();
    refreshCurrent();
    document.dispatchEvent(new CustomEvent('shadowrun:world-seed-changed', { detail: clone(worldForRef()) }));
    if (options.updateUrl !== false) {
      const url = new URL(location.href);
      url.searchParams.set('srWorld', worldSeedKey);
      url.searchParams.set('srScope', scope);
      url.searchParams.delete('srPackage');
      history.replaceState(null, '', url);
    }
    if (options.regenerate !== false) regenerateDiscoveryRecords();
    if (state.requestedPackageKey) {
      const requested = findPackage(state.requestedPackageKey);
      if (requested) state.currentPackage = clone(requested);
      state.requestedPackageKey = '';
      renderPackageOutput();
      refreshCurrent();
    }
  }

  function renderWorldMeta() {
    const world = activeWorld();
    const target = document.getElementById('sr-world-seed-meta');
    if (!world || !target) return;
    const localCount = Object.keys(state.localRegistry.worlds?.[world.worldSeedKey]?.packages || {}).length;
    const globalCount = Object.keys(state.globalRegistry.worlds?.[world.worldSeedKey]?.packages || {}).length;
    target.innerHTML = `<strong>${escapeHtml(world.label)}</strong><br><span class="sr-seed-meta">${escapeHtml(world.worldSeedKey)}</span><br>${state.activeRef?.scope === 'embedded' ? 'Embedded repository sprawl' : 'Local browser sprawl'} · ${localCount} local · ${globalCount} global packages`;
    const remove = document.getElementById('sr-delete-local-world');
    if (remove) remove.disabled = state.activeRef?.scope !== 'local';
  }

  function createLocalWorld() {
    try {
      const world = makeWorldSeed(document.getElementById('sr-new-world-label').value, document.getElementById('sr-new-world-value').value);
      state.localWorlds.worlds[world.worldSeedKey] ||= world;
      if (!writeStorage(STORAGE.localWorlds, state.localWorlds)) throw new Error('Browser storage could not save the new sprawl seed.');
      renderWorldSelector();
      document.getElementById('sr-world-seed-select').value = `local:${world.worldSeedKey}`;
      selectWorldRef(`local:${world.worldSeedKey}`);
      setStatus(`Selected local sprawl ${world.label}.`, 'success');
    } catch (error) {
      setStatus(error.message, 'error');
    }
  }

  function deleteSelectedLocalWorld() {
    if (state.activeRef?.scope !== 'local') return setStatus('Embedded sprawls cannot be deleted locally.', 'error');
    const world = activeWorld();
    if (!world || !confirm(`Delete local sprawl “${world.label}” and its locally saved packages?`)) return;
    delete state.localWorlds.worlds[world.worldSeedKey];
    delete state.localRegistry.worlds[world.worldSeedKey];
    if (!Object.keys(state.localWorlds.worlds).length) {
      const replacement = makeWorldSeed('My Local Shadowrun Sprawl');
      state.localWorlds.worlds[replacement.worldSeedKey] = replacement;
    }
    writeStorage(STORAGE.localWorlds, state.localWorlds);
    writeStorage(STORAGE.localRegistry, state.localRegistry);
    state.activeRef = null;
    renderWorldSelector();
    setStatus('Local sprawl seed deleted.', 'success');
  }

  function syncDiscoveryThreat(profile) {
    const select = document.getElementById('sr-spatial-threat');
    if (select) select.value = profile;
  }

  function regenerateDiscoveryRecords() {
    const select = document.getElementById('sr-spatial-threat');
    if (select) select.dispatchEvent(new Event('change', { bubbles: true }));
    document.dispatchEvent(new CustomEvent('shadowrun:sprawl-seed-settings-changed', {
      detail: {
        world: clone(activeWorld()),
        profile: activeProfile(),
        dangerIntensityPercent: getIntensity()
      }
    }));
  }

  function syncIntensityControl(profile = activeProfile()) {
    const slider = document.getElementById('sr-package-danger-intensity');
    const profileSelect = document.getElementById('sr-package-threat-profile');
    if (profileSelect && profileSelect.value !== profile) profileSelect.value = profile;
    if (!slider) return;
    slider.value = String(getIntensity(profile));
    updateIntensityOutput(slider.value);
  }

  function updateIntensityOutput(value = getIntensity()) {
    const output = document.getElementById('sr-package-danger-output');
    const note = document.getElementById('sr-package-danger-note');
    const profile = activeProfile();
    const percent = Math.max(0, Math.min(100, Number(value) || 0));
    if (output) output.textContent = `${formatPercent(percent)}%`;
    if (note) note.textContent = `${profileLabel(profile)} defaults to ${dangerApi()?.defaults?.[profile] ?? 50}%. Effective response tier: ${profileLabel(effectiveThreat(percent))}. The active sprawl seed and exact percentage both alter deterministic output.`;
  }

  function selectedSite() {
    return window.ShadowrunSprawlDiscovery?.getSelectedSite?.() || null;
  }

  function cleanString(value, maximum = 6000) {
    return String(value || '').slice(0, maximum);
  }

  function snapshotLocation(site) {
    if (!site?.entryKey || !/^srpoi-[0-9a-f]{8}$/.test(site.entryKey)) throw new Error('The selected location does not have a valid stable sprawl key.');
    const lat = Number(site.lat ?? site.coordinates?.lat);
    const lng = Number(site.lng ?? site.coordinates?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('The selected location does not have valid coordinates.');
    return {
      entryKey: site.entryKey,
      name: cleanString(site.name, 200),
      address: cleanString(site.address, 500),
      coordinates: { lat, lng },
      sourceCategory: cleanString(site.category, 50),
      sourceCategoryLabel: cleanString(site.categoryLabel, 100),
      archetypeId: cleanString(site.archetypeId, 100),
      archetypeName: cleanString(site.archetypeName, 200),
      shadowCategory: cleanString(site.shadowCategory, 100),
      publicFacade: cleanString(site.publicFacade),
      shadowUse: cleanString(site.shadowUse),
      accessVector: cleanString(site.accessVector),
      security: cleanString(site.security),
      matrix: cleanString(site.matrix),
      magical: cleanString(site.magical),
      clues: (site.clues || []).slice(0, 12).map(value => cleanString(value, 1000)),
      complication: cleanString(site.complication),
      legwork: (site.legwork || []).slice(0, 12).map(value => cleanString(value, 1000)),
      relatedSites: (site.relatedSites || []).slice(0, 12).map(item => ({
        siteKey: cleanString(item.siteKey, 80),
        name: cleanString(item.name, 200),
        reason: cleanString(item.reason, 500)
      })),
      mapsUrl: cleanString(site.mapsUrl, 2000),
      streetViewUrl: cleanString(site.streetViewUrl, 2000),
      workspaceStatus: ['STANDARD_UNCLAIMED', 'SUPPORTIVE', 'OPT_OUT'].includes(site.status) ? site.status : 'STANDARD_UNCLAIMED'
    };
  }

  function packageKeyFor(worldSeedKey, site, profile, intensity) {
    const focus = site.focus || document.getElementById('sr-spatial-focus')?.value || 'balanced';
    return keyFrom('srpkg', `${worldSeedKey}|${site.entryKey}|${focus}|${profile}|${Number(intensity).toFixed(2)}`);
  }

  function findPackage(packageKey) {
    const worldKey = state.activeRef?.worldSeedKey;
    return state.globalRegistry.worlds?.[worldKey]?.packages?.[packageKey]
      || state.localRegistry.worlds?.[worldKey]?.packages?.[packageKey]
      || null;
  }

  function generateLinkedPackage() {
    try {
      const world = activeWorld();
      const site = state.currentSite || selectedSite();
      if (!world || !site) throw new Error('Select a sprawl seed and named location first.');
      const profile = activeProfile();
      const intensity = getIntensity(profile);
      const packageKey = packageKeyFor(world.worldSeedKey, site, profile, intensity);
      const existing = findPackage(packageKey);
      if (existing) {
        state.currentPackage = clone(existing);
        renderPackageOutput();
        refreshCurrent();
        return setStatus(`Loaded immutable package ${packageKey}.`, 'success');
      }
      const focus = site.focus || document.getElementById('sr-spatial-focus')?.value || 'balanced';
      state.currentPackage = {
        schemaVersion: REGISTRY_SCHEMA,
        packageKey,
        worldSeedKey: world.worldSeedKey,
        worldSeedLabel: world.label,
        generatedAt: new Date().toISOString(),
        locationKey: site.entryKey,
        focus,
        focusLabel: site.focusLabel || window.ShadowrunSprawlDiscoveryEngine?.focusProfiles?.[focus] || 'Balanced Sprawl Mix',
        threatProfile: profile,
        threatLabel: profileLabel(profile),
        dangerIntensityPercent: intensity,
        effectiveThreat: effectiveThreat(intensity),
        location: snapshotLocation(site),
        source: {
          generatorVersion: 'shadowrun-world-seeded-sprawl-package-1.0.0',
          generationPolicy: 'world-seed-plus-location-plus-focus-plus-danger-profile-plus-exact-intensity'
        }
      };
      renderPackageOutput();
      refreshCurrent();
      setStatus(`Generated ${packageKey} under ${world.label} at ${formatPercent(intensity)}% danger.`, 'success');
    } catch (error) {
      setStatus(`Package generation failed: ${error.message}`, 'error');
    }
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

  function saveCurrentLocally() {
    const pkg = state.currentPackage;
    const world = activeWorld();
    if (!pkg || !world) return setStatus('Generate a linked package before saving it.', 'error');
    const packages = ensureLocalWorldRecord(world).packages;
    if (packages[pkg.packageKey]) return setStatus('This immutable local package already exists. Delete it before regeneration.', 'error');
    packages[pkg.packageKey] = clone(pkg);
    if (!writeStorage(STORAGE.localRegistry, state.localRegistry)) {
      delete packages[pkg.packageKey];
      return setStatus('Browser storage could not save this package.', 'error');
    }
    const verified = readStorage(STORAGE.localRegistry, { worlds: {} });
    if (!verified.worlds?.[world.worldSeedKey]?.packages?.[pkg.packageKey]) {
      delete packages[pkg.packageKey];
      return setStatus('The package was not present when browser storage was read back.', 'error');
    }
    state.localRegistry = normalizeRegistry(verified, world);
    renderLists();
    renderWorldMeta();
    refreshCurrent();
    setStatus(`Verified local save for ${pkg.packageKey}.`, 'success');
  }

  function deleteCurrentLocal() {
    const pkg = state.currentPackage;
    const packages = state.localRegistry.worlds?.[pkg?.worldSeedKey]?.packages;
    if (!pkg || !packages?.[pkg.packageKey]) return;
    if (!confirm(`Delete local package ${pkg.packageKey}?`)) return;
    delete packages[pkg.packageKey];
    if (!writeStorage(STORAGE.localRegistry, state.localRegistry)) return setStatus('Browser storage could not confirm package deletion.', 'error');
    const verified = readStorage(STORAGE.localRegistry, { worlds: {} });
    if (verified.worlds?.[pkg.worldSeedKey]?.packages?.[pkg.packageKey]) return setStatus('The browser retained the package after deletion.', 'error');
    state.localRegistry = normalizeRegistry(verified, activeWorld());
    renderLists();
    renderWorldMeta();
    refreshCurrent();
    setStatus(`Deleted local package ${pkg.packageKey}.`, 'success');
  }

  function submitCurrentGlobally() {
    try {
      const pkg = state.currentPackage;
      const world = activeWorld();
      if (!pkg || !world) throw new Error('Generate a linked package before submitting it.');
      if (state.globalRegistry.worlds?.[world.worldSeedKey]?.packages?.[pkg.packageKey]) return setStatus(`${pkg.packageKey} is already embedded globally.`, 'success');
      const patch = {
        schemaVersion: REGISTRY_SCHEMA,
        target: GLOBAL_REGISTRY_URL,
        worldSeed: {
          worldSeedKey: world.worldSeedKey,
          label: world.label,
          seedValue: world.seedValue,
          createdAt: world.createdAt
        },
        packageKey: pkg.packageKey,
        package: clone(pkg)
      };
      const completeBody = '<!-- SHADOWRUN_SPRAWL_LOCATION_PATCH -->\n'
        + 'This issue contains one immutable world-seeded danger-scaled Shadowrun sprawl location package.\n\n'
        + '```json\n'
        + JSON.stringify(patch, null, 2)
        + '\n```\n';
      const title = `[SHADOWRUN-SPRAWL] ${world.label} · ${pkg.location.name} · ${pkg.packageKey}`;
      if (window.HBSpatialSubmissionHandoff?.prepare) {
        window.HBSpatialSubmissionHandoff.prepare({ title, body: completeBody, workflow: WORKFLOW, slug: pkg.packageKey });
      } else {
        window.open(`https://github.com/${REPOSITORY}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(completeBody)}`, '_blank', 'noopener');
      }
      setStatus(`Prepared global submission for ${pkg.packageKey}. Create the issue, then run the linked ingestion workflow with its issue number.`, 'success');
    } catch (error) {
      setStatus(`Global submission failed: ${error.message}`, 'error');
    }
  }

  function renderPackageOutput() {
    const target = document.getElementById('sr-spatial-package-output');
    const save = document.getElementById('sr-spatial-registry-save-local');
    const submit = document.getElementById('sr-spatial-registry-submit-global');
    const remove = document.getElementById('sr-spatial-registry-delete-local');
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
    save.textContent = localExists ? 'Saved Locally' : 'Save Locally';
    submit.textContent = globalExists ? 'Already Global' : 'Submit Globally';
    target.innerHTML = `
      <div class="sr-seed-output">
        <section class="sr-seed-output-card">
          <h4>${escapeHtml(pkg.location.name)} · ${escapeHtml(formatPercent(pkg.dangerIntensityPercent))}% danger</h4>
          <p><strong>Sprawl world:</strong> ${escapeHtml(pkg.worldSeedLabel)} · <strong>Danger profile:</strong> ${escapeHtml(pkg.threatLabel)}</p>
          <p><strong>Effective response tier:</strong> ${escapeHtml(profileLabel(pkg.effectiveThreat))} · <strong>Focus:</strong> ${escapeHtml(pkg.focusLabel)}</p>
          <p><strong>Shadow use:</strong> ${escapeHtml(pkg.location.shadowUse)}</p>
          <p><strong>Security:</strong> ${escapeHtml(pkg.location.security)}</p>
          <p><strong>Complication:</strong> ${escapeHtml(pkg.location.complication)}</p>
          <p class="sr-seed-meta">${escapeHtml(pkg.worldSeedKey)} · ${escapeHtml(pkg.locationKey)} · ${escapeHtml(pkg.packageKey)}</p>
        </section>
      </div>`;
  }

  function packagesForWorld(registry) {
    return Object.values(registry.worlds?.[state.activeRef?.worldSeedKey]?.packages || {}).sort((left, right) => String(left.location?.name).localeCompare(String(right.location?.name)));
  }

  function renderLists() {
    renderList('sr-spatial-local-registry-list', packagesForWorld(state.localRegistry), 'local');
    renderList('sr-spatial-global-registry-list', packagesForWorld(state.globalRegistry), 'global');
  }

  function renderList(targetId, packages, source) {
    const target = document.getElementById(targetId);
    if (!target) return;
    if (!packages.length) {
      target.innerHTML = `<p class="helper-note">No ${source} packages exist in this sprawl world.</p>`;
      return;
    }
    target.innerHTML = '';
    for (const pkg of packages) {
      const row = document.createElement('div');
      row.className = 'sr-seed-item';
      row.innerHTML = `<button type="button" class="secondary-action"><strong>${escapeHtml(pkg.location.name)}</strong><small>${escapeHtml(pkg.threatLabel)} · ${escapeHtml(formatPercent(pkg.dangerIntensityPercent))}% · ${escapeHtml(pkg.packageKey)}</small></button>${source === 'local' ? '<button type="button" class="secondary-action" data-delete-local>Delete</button>' : '<span></span>'}`;
      row.querySelector('button').addEventListener('click', () => loadSavedPackage(pkg, source));
      row.querySelector('[data-delete-local]')?.addEventListener('click', () => {
        state.currentPackage = clone(pkg);
        deleteCurrentLocal();
      });
      target.appendChild(row);
    }
  }

  function loadSavedPackage(pkg, source) {
    state.currentPackage = clone(pkg);
    const profile = document.getElementById('sr-package-threat-profile');
    if (profile) profile.value = pkg.threatProfile;
    syncDiscoveryThreat(pkg.threatProfile);
    dangerApi()?.setValue?.(pkg.threatProfile, pkg.dangerIntensityPercent);
    syncIntensityControl(pkg.threatProfile);
    renderPackageOutput();
    refreshCurrent();
    const url = new URL(location.href);
    url.searchParams.set('srWorld', pkg.worldSeedKey);
    url.searchParams.set('srScope', source === 'global' ? 'embedded' : state.activeRef.scope);
    url.searchParams.set('srPackage', pkg.packageKey);
    history.replaceState(null, '', url);
    setStatus(`Loaded ${source} package ${pkg.packageKey}.`, 'success');
  }

  function refreshCurrent() {
    const site = selectedSite();
    const siteKey = site?.entryKey || '';
    if (state.lastSiteKey && siteKey !== state.lastSiteKey) state.currentPackage = null;
    state.lastSiteKey = siteKey;
    state.currentSite = site;
    const generate = document.getElementById('sr-spatial-registry-generate');
    if (!generate) return;
    generate.disabled = !site?.entryKey || !activeWorld();
    if (!state.currentPackage) {
      renderPackageOutput();
      if (!site?.entryKey) setStatus('Select a named location from the map before generating a package.');
      else setStatus(`${site.name} is ready under ${activeWorld()?.label || 'the selected sprawl seed'}. Generate a linked package before saving or submitting it.`);
    }
  }

  function setStatus(message, type = '') {
    const target = document.getElementById('sr-spatial-registry-status');
    if (!target) return;
    target.className = `sr-seed-status ${type}`.trim();
    target.textContent = message;
  }

  function observeSelection() {
    const display = document.getElementById('sr-spatial-display');
    if (!display || display.dataset.srSeedObserved === 'true') return;
    display.dataset.srSeedObserved = 'true';
    new MutationObserver(() => window.setTimeout(refreshCurrent, 0)).observe(display, { childList: true, subtree: true, characterData: true });
  }

  async function install() {
    if (state.installed) return;
    state.installed = true;
    for (let attempt = 0; attempt < 240 && !buildPanel(); attempt += 1) await wait(50);
    if (!document.getElementById('sr-spatial-registry-card')) return;
    await loadGlobalRegistry();
    renderWorldSelector();
    const profile = document.getElementById('sr-spatial-threat')?.value || 'standard';
    document.getElementById('sr-package-threat-profile').value = profile;
    syncIntensityControl(profile);
    observeSelection();
    renderLists();
    renderWorldMeta();
    refreshCurrent();
  }

  ensureLocalRegistries();
  wrapSeedEngine();

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else void install();

  window.ShadowrunSprawlSeedWorkspace = Object.freeze({
    getActiveWorld: () => clone(activeWorld()),
    getActiveReference: () => clone(state.activeRef),
    createLocalWorld,
    selectWorldRef,
    generateLinkedPackage,
    saveCurrentLocally,
    submitCurrentGlobally,
    getCurrentPackage: () => clone(state.currentPackage),
    getLocalRegistry: () => clone(state.localRegistry),
    getGlobalRegistry: () => clone(state.globalRegistry)
  });
  window.ShadowrunSprawlRegistry = window.ShadowrunSprawlSeedWorkspace;
})();
