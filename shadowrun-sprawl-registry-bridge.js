(() => {
  'use strict';

  const REPOSITORY = 'mrcalzon02/HB-TTRPG-tools';
  const REGISTRY_SCHEMA = '1.1.0';
  const STORAGE_KEY = 'hb-shadowrun-sprawl-location-registry-v2';
  const LEGACY_STORAGE_KEY = 'hb-shadowrun-sprawl-location-registry-v1';
  const INTENSITY_STORAGE_KEY = 'hb-shadowrun-danger-intensity-v1';
  const GLOBAL_REGISTRY_URL = 'data/shadowrun/sprawl_location_registry.json';
  const WORKFLOW = 'ingest-shadowrun-sprawl-location.yml';
  const PROFILE_DEFAULTS = Object.freeze({ low: 25, standard: 50, high: 75, prime: 100 });
  const PROFILE_ORDER = Object.freeze(['low', 'standard', 'high', 'prime']);
  const state = {
    installed: false,
    currentSite: null,
    currentPackage: null,
    localRegistry: { schemaVersion: REGISTRY_SCHEMA, packages: {} },
    globalRegistry: { schemaVersion: REGISTRY_SCHEMA, packages: {} },
    intensityValues: {},
    wrappedEngine: false
  };

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const wait = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds));
  const clampPercent = value => Math.max(0, Math.min(100, Number.isFinite(Number(value)) ? Number(value) : 0));
  const formatPercent = value => {
    const number = clampPercent(value);
    return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  };

  function hash32(input, seed = 0x811c9dc5) {
    let hash = seed >>> 0;
    for (const character of String(input)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 0x01000193);
    }
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x85ebca6b);
    hash ^= hash >>> 13;
    hash = Math.imul(hash, 0xc2b2ae35);
    hash ^= hash >>> 16;
    return hash >>> 0;
  }

  function readJsonStorage(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJsonStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  function profileLabel(profile) {
    return window.ShadowrunSprawlDiscoveryEngine?.threatProfiles?.[profile]
      || ({ low: 'Low Heat', standard: 'Standard Heat', high: 'High Heat', prime: 'Prime Runner Heat' }[profile])
      || profile;
  }

  function readIntensityValues() {
    const parsed = readJsonStorage(INTENSITY_STORAGE_KEY, {});
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  }

  function getIntensity(profile = activeProfile()) {
    const stored = Number(state.intensityValues[profile]);
    return Number.isFinite(stored) ? clampPercent(stored) : PROFILE_DEFAULTS[profile] ?? PROFILE_DEFAULTS.standard;
  }

  function setIntensity(profile, value, persist = true) {
    const resolved = PROFILE_ORDER.includes(profile) ? profile : 'standard';
    state.intensityValues[resolved] = clampPercent(value);
    if (persist) writeJsonStorage(INTENSITY_STORAGE_KEY, state.intensityValues);
    syncIntensityControl(resolved);
    return state.intensityValues[resolved];
  }

  function effectiveThreatForIntensity(value) {
    const percent = clampPercent(value);
    if (percent <= 25) return 'low';
    if (percent <= 50) return 'standard';
    if (percent <= 75) return 'high';
    return 'prime';
  }

  function activeProfile() {
    const panelValue = document.getElementById('sr-package-threat-profile')?.value;
    const discoveryValue = document.getElementById('sr-spatial-threat')?.value;
    const value = panelValue || discoveryValue || 'standard';
    return PROFILE_ORDER.includes(value) ? value : 'standard';
  }

  function wrapDiscoveryEngine() {
    const original = window.ShadowrunSprawlDiscoveryEngine;
    if (!original) return false;
    if (original.__dangerIntensityWrapped) {
      state.wrappedEngine = true;
      return true;
    }
    const baseGenerate = original.generateSprawlDiscovery.bind(original);
    const wrapped = Object.freeze({
      ...original,
      __dangerIntensityWrapped: true,
      __baseGenerateSprawlDiscovery: baseGenerate,
      generateSprawlDiscovery(input = {}) {
        const requestedProfile = PROFILE_ORDER.includes(input.threat) ? input.threat : 'standard';
        const dangerIntensityPercent = getIntensity(requestedProfile);
        const effectiveThreat = effectiveThreatForIntensity(dangerIntensityPercent);
        const result = baseGenerate({
          ...input,
          threat: effectiveThreat,
          seed: `${input.seed || ''}|danger-profile:${requestedProfile}|danger-intensity:${dangerIntensityPercent.toFixed(2)}`
        });
        return {
          ...result,
          threat: requestedProfile,
          threatLabel: `${profileLabel(requestedProfile)} · ${formatPercent(dangerIntensityPercent)}% danger`,
          dangerIntensityPercent,
          dangerProfile: requestedProfile,
          effectiveThreat,
          sites: (result.sites || []).map(site => ({
            ...site,
            dangerIntensityPercent,
            dangerProfile: requestedProfile,
            effectiveThreat
          }))
        };
      }
    });
    window.ShadowrunSprawlDiscoveryEngine = wrapped;
    state.wrappedEngine = true;
    return true;
  }

  function packageFromLegacyEntry(entry) {
    const intensity = clampPercent(entry.dangerIntensityPercent ?? PROFILE_DEFAULTS[entry.threat] ?? 50);
    const packageKey = `srpkg-${hash32(`${entry.entryKey}|${entry.focus || 'balanced'}|${entry.threat || 'standard'}|${intensity.toFixed(2)}`, 0x5a17e11a).toString(16).padStart(8, '0')}`;
    return {
      schemaVersion: REGISTRY_SCHEMA,
      packageKey,
      generatedAt: entry.savedAt || new Date().toISOString(),
      locationKey: entry.entryKey,
      focus: entry.focus || 'balanced',
      focusLabel: entry.focusLabel || 'Balanced Sprawl Mix',
      threatProfile: entry.threat || 'standard',
      threatLabel: entry.threatLabel || profileLabel(entry.threat || 'standard'),
      dangerIntensityPercent: intensity,
      effectiveThreat: effectiveThreatForIntensity(intensity),
      location: clone(entry)
    };
  }

  function normalizeRegistry(value) {
    if (value?.schemaVersion === REGISTRY_SCHEMA && value.packages && typeof value.packages === 'object') {
      return { schemaVersion: REGISTRY_SCHEMA, packages: value.packages };
    }
    if (value?.entries && typeof value.entries === 'object') {
      const packages = {};
      for (const entry of Object.values(value.entries)) {
        if (!entry?.entryKey) continue;
        const pkg = packageFromLegacyEntry(entry);
        packages[pkg.packageKey] = pkg;
      }
      return { schemaVersion: REGISTRY_SCHEMA, packages };
    }
    return { schemaVersion: REGISTRY_SCHEMA, packages: {} };
  }

  function readLocalRegistry() {
    const current = readJsonStorage(STORAGE_KEY, null);
    if (current) return normalizeRegistry(current);
    const legacy = readJsonStorage(LEGACY_STORAGE_KEY, null);
    const migrated = normalizeRegistry(legacy);
    if (Object.keys(migrated.packages).length) writeJsonStorage(STORAGE_KEY, migrated);
    return migrated;
  }

  function writeLocalRegistry(registry, expectedKey = '') {
    if (!writeJsonStorage(STORAGE_KEY, registry)) return false;
    const stored = normalizeRegistry(readJsonStorage(STORAGE_KEY, null));
    return expectedKey ? Boolean(stored.packages[expectedKey]) : true;
  }

  async function loadGlobalRegistry() {
    try {
      const response = await fetch(GLOBAL_REGISTRY_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`${GLOBAL_REGISTRY_URL} returned ${response.status}`);
      state.globalRegistry = normalizeRegistry(await response.json());
    } catch (error) {
      setStatus(`Global registry could not be loaded: ${error.message}`, 'error');
    }
  }

  function injectStyles() {
    if (document.getElementById('sr-sprawl-package-style')) return;
    const style = document.createElement('style');
    style.id = 'sr-sprawl-package-style';
    style.textContent = `
      .sr-package-panel{background:#151821;border:1px solid #343845;border-left:5px solid #3c6f9c;border-radius:12px;padding:14px;margin:0 0 14px}
      .sr-package-panel h3,.sr-package-panel h4{margin-top:0}.sr-package-panel label{display:grid;gap:4px;margin-top:8px;color:var(--muted);font-size:.78rem}
      .sr-package-panel select,.sr-package-panel input{width:100%;box-sizing:border-box;background:#10131a;border:1px solid var(--line);color:var(--ink);border-radius:9px;padding:9px}
      .sr-package-profile-meta,.sr-package-status{padding:9px;border:1px solid var(--line);border-radius:9px;background:#0d1016;color:var(--muted);font-size:.78rem;line-height:1.4;margin-top:8px}
      .sr-package-status.error{border-color:#8b0000;color:#ffb3b3}.sr-package-status.success{border-color:#2d8f71;color:#a9f1da}
      .sr-package-actions{display:grid;gap:8px;margin:10px 0}.sr-package-actions button{width:100%;min-height:40px;border-radius:999px}
      .sr-package-intensity{display:grid;gap:6px;margin-top:10px}.sr-package-intensity-heading{display:flex;justify-content:space-between;gap:10px;align-items:center;font-weight:800;color:var(--ink)}
      .sr-package-intensity-output{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--accent);font-size:.92rem}.sr-package-intensity input[type="range"]{padding:0;accent-color:var(--accent)}
      .sr-package-note{color:var(--muted);font-size:.72rem;line-height:1.4;margin:8px 0}.sr-package-output{display:grid;gap:8px;margin-top:10px}
      .sr-package-output-card{border-left:3px solid #7655a8;background:#10131a;padding:9px;border-radius:6px}.sr-package-output-card h4{margin:0 0 5px}.sr-package-output-card p{margin:4px 0;font-size:.76rem;line-height:1.38}
      .sr-package-meta{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--accent);font-size:.72rem;word-break:break-all}
      .sr-package-list{display:grid;gap:6px;margin-top:7px}.sr-package-item{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center;border:1px solid var(--line);border-radius:8px;padding:7px;background:#10131a}
      .sr-package-item button:first-child{text-align:left}.sr-package-item small{display:block;color:var(--muted)}
    `;
    document.head.appendChild(style);
  }

  function profileOptions() {
    return PROFILE_ORDER.map(profile => `<option value="${profile}">${escapeHtml(profileLabel(profile))}</option>`).join('');
  }

  function buildPanel() {
    const display = document.getElementById('sr-spatial-display');
    if (!display) return false;
    if (document.getElementById('sr-spatial-registry-card')) return true;
    injectStyles();
    const panel = document.createElement('section');
    panel.id = 'sr-spatial-registry-card';
    panel.className = 'sr-package-panel';
    panel.innerHTML = `
      <p class="eyebrow">Danger-scaled sprawl package</p>
      <h3>Generate, Save Locally, or Submit Globally</h3>
      <p class="helper-note">Each danger profile has its own default percentage. Generate an immutable location package first, then save it in this browser or submit it to the repository-backed global registry.</p>
      <label>Active danger profile<select id="sr-package-threat-profile">${profileOptions()}</select></label>
      <div class="sr-package-intensity">
        <div class="sr-package-intensity-heading"><span>Danger intensity</span><output id="sr-package-danger-output" class="sr-package-intensity-output"></output></div>
        <input id="sr-package-danger-intensity" type="range" min="0" max="100" step="1" aria-label="Shadowrun danger intensity percentage">
        <div id="sr-package-danger-note" class="sr-package-note"></div>
      </div>
      <div id="sr-package-profile-meta" class="sr-package-profile-meta"></div>
      <div id="sr-spatial-registry-status" class="sr-package-status" role="status" aria-live="polite">Select a named location from the map before generating a package.</div>
      <div class="sr-package-actions">
        <button id="sr-spatial-registry-generate" type="button" class="primary-action" disabled>Generate Linked Package</button>
        <button id="sr-spatial-registry-save-local" type="button" class="secondary-action" disabled>Save Locally</button>
        <button id="sr-spatial-registry-submit-global" type="button" class="primary-action" disabled>Submit Globally</button>
        <button id="sr-spatial-registry-delete-local" type="button" class="secondary-action" disabled>Delete Local Package</button>
      </div>
      <p class="sr-package-note">Global publication opens a recoverable GitHub handoff, copies the complete payload, and links to the owner-run ingestion workflow.</p>
      <div id="sr-spatial-package-output"></div>
      <details><summary>Local packages in this danger profile</summary><div id="sr-spatial-local-registry-list" class="sr-package-list"></div></details>
      <details><summary>Embedded global packages in this danger profile</summary><div id="sr-spatial-global-registry-list" class="sr-package-list"></div></details>`;
    display.insertAdjacentElement('afterend', panel);
    bindPanel();
    return true;
  }

  function bindPanel() {
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
      refreshCurrent();
      renderLists();
      regenerateDiscoveryRecords();
    });
    intensity.addEventListener('input', () => updateIntensityOutput(intensity.value));
    intensity.addEventListener('change', () => {
      setIntensity(activeProfile(), intensity.value);
      state.currentPackage = null;
      refreshCurrent();
      regenerateDiscoveryRecords();
    });
    const discoveryThreat = document.getElementById('sr-spatial-threat');
    discoveryThreat?.addEventListener('change', () => {
      if (profile.value !== discoveryThreat.value) profile.value = discoveryThreat.value;
      state.currentPackage = null;
      syncIntensityControl(discoveryThreat.value);
      refreshCurrent();
      renderLists();
    });
  }

  function syncDiscoveryThreat(profile) {
    const select = document.getElementById('sr-spatial-threat');
    if (!select || select.value === profile) return;
    select.value = profile;
  }

  function regenerateDiscoveryRecords() {
    const select = document.getElementById('sr-spatial-threat');
    if (select) select.dispatchEvent(new Event('change', { bubbles: true }));
    document.dispatchEvent(new CustomEvent('shadowrun:danger-intensity-changed', {
      detail: { profile: activeProfile(), percent: getIntensity(activeProfile()) }
    }));
  }

  function syncIntensityControl(profile = activeProfile()) {
    const slider = document.getElementById('sr-package-danger-intensity');
    const select = document.getElementById('sr-package-threat-profile');
    if (select && select.value !== profile) select.value = profile;
    if (!slider) return;
    slider.value = String(getIntensity(profile));
    updateIntensityOutput(slider.value);
  }

  function updateIntensityOutput(value = getIntensity()) {
    const output = document.getElementById('sr-package-danger-output');
    const note = document.getElementById('sr-package-danger-note');
    const profile = activeProfile();
    const percent = clampPercent(value);
    if (output) output.textContent = `${formatPercent(percent)}%`;
    if (note) note.textContent = `${profileLabel(profile)} defaults to ${PROFILE_DEFAULTS[profile]}%. Effective response tier: ${profileLabel(effectiveThreatForIntensity(percent))}. Every percentage also changes the deterministic run seed.`;
    renderProfileMeta();
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

  function packageKeyFor(site, profile, intensity) {
    const focus = site.focus || document.getElementById('sr-spatial-focus')?.value || 'balanced';
    return `srpkg-${hash32(`${site.entryKey}|${focus}|${profile}|${clampPercent(intensity).toFixed(2)}`, 0x5a17e11a).toString(16).padStart(8, '0')}`;
  }

  function generateLinkedPackage() {
    try {
      const site = state.currentSite || selectedSite();
      if (!site) throw new Error('Select a named location from the map first.');
      const profile = activeProfile();
      const intensity = getIntensity(profile);
      const packageKey = packageKeyFor(site, profile, intensity);
      const existing = state.globalRegistry.packages[packageKey] || state.localRegistry.packages[packageKey];
      if (existing) {
        state.currentPackage = clone(existing);
        renderPackageOutput();
        refreshCurrent();
        return setStatus(`Loaded immutable package ${packageKey}.`, 'success');
      }
      state.currentPackage = {
        schemaVersion: REGISTRY_SCHEMA,
        packageKey,
        generatedAt: new Date().toISOString(),
        locationKey: site.entryKey,
        focus: site.focus || document.getElementById('sr-spatial-focus')?.value || 'balanced',
        focusLabel: site.focusLabel || window.ShadowrunSprawlDiscoveryEngine?.focusProfiles?.[site.focus] || 'Balanced Sprawl Mix',
        threatProfile: profile,
        threatLabel: profileLabel(profile),
        dangerIntensityPercent: intensity,
        effectiveThreat: effectiveThreatForIntensity(intensity),
        location: snapshotLocation(site)
      };
      renderPackageOutput();
      refreshCurrent();
      setStatus(`Generated danger-scaled package ${packageKey} at ${formatPercent(intensity)}% intensity.`, 'success');
    } catch (error) {
      setStatus(`Package generation failed: ${error.message}`, 'error');
    }
  }

  function refreshCurrent() {
    const site = selectedSite();
    if (site?.entryKey !== state.currentSite?.entryKey) state.currentPackage = null;
    state.currentSite = site;
    const generate = document.getElementById('sr-spatial-registry-generate');
    const save = document.getElementById('sr-spatial-registry-save-local');
    const submit = document.getElementById('sr-spatial-registry-submit-global');
    const remove = document.getElementById('sr-spatial-registry-delete-local');
    if (!generate || !save || !submit || !remove) return;
    generate.disabled = !site?.entryKey;
    if (!state.currentPackage) {
      save.disabled = submit.disabled = remove.disabled = true;
      renderPackageOutput();
      if (!site?.entryKey) setStatus('Select a named location from the map before generating a package.');
      else setStatus(`${site.name} is ready. Generate a linked package before saving or submitting it.`);
      renderProfileMeta();
      return;
    }
    const pkg = state.currentPackage;
    const localExists = Boolean(state.localRegistry.packages[pkg.packageKey]);
    const globalExists = Boolean(state.globalRegistry.packages[pkg.packageKey]);
    save.disabled = localExists;
    submit.disabled = globalExists;
    remove.disabled = !localExists;
    save.textContent = localExists ? 'Saved Locally' : 'Save Locally';
    submit.textContent = globalExists ? 'Already Global' : 'Submit Globally';
    renderProfileMeta();
  }

  function saveCurrentLocally() {
    const pkg = state.currentPackage;
    if (!pkg) return setStatus('Generate a linked package before saving it.', 'error');
    if (state.localRegistry.packages[pkg.packageKey]) return setStatus('This immutable local package already exists. Delete it before regenerating.', 'error');
    state.localRegistry.packages[pkg.packageKey] = clone(pkg);
    state.localRegistry.packages = Object.fromEntries(Object.entries(state.localRegistry.packages).sort(([left], [right]) => left.localeCompare(right)));
    if (!writeLocalRegistry(state.localRegistry, pkg.packageKey)) {
      delete state.localRegistry.packages[pkg.packageKey];
      return setStatus('Browser storage rejected the package or failed the read-back verification.', 'error');
    }
    state.localRegistry = readLocalRegistry();
    renderLists();
    refreshCurrent();
    setStatus(`Verified local save for ${pkg.packageKey}.`, 'success');
  }

  function deleteCurrentLocal() {
    const pkg = state.currentPackage;
    if (!pkg || !state.localRegistry.packages[pkg.packageKey]) return;
    if (!confirm(`Delete local package ${pkg.packageKey}?`)) return;
    delete state.localRegistry.packages[pkg.packageKey];
    if (!writeLocalRegistry(state.localRegistry)) return setStatus('Browser storage could not confirm package deletion.', 'error');
    state.localRegistry = readLocalRegistry();
    renderLists();
    refreshCurrent();
    setStatus(`Deleted local package ${pkg.packageKey}.`, 'success');
  }

  function submitCurrentGlobally() {
    try {
      const pkg = state.currentPackage;
      if (!pkg) throw new Error('Generate a linked package before submitting it.');
      if (state.globalRegistry.packages[pkg.packageKey]) return setStatus(`${pkg.packageKey} is already embedded globally.`, 'success');
      const patch = {
        schemaVersion: REGISTRY_SCHEMA,
        target: GLOBAL_REGISTRY_URL,
        packageKey: pkg.packageKey,
        package: clone(pkg)
      };
      const completeBody = '<!-- SHADOWRUN_SPRAWL_LOCATION_PATCH -->\n'
        + 'This issue contains one immutable danger-scaled real-world Shadowrun sprawl location package.\n\n'
        + '```json\n'
        + JSON.stringify(patch, null, 2)
        + '\n```\n';
      const title = `[SHADOWRUN-SPRAWL] ${pkg.location.name} · ${pkg.packageKey}`;
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
    if (!target) return;
    const pkg = state.currentPackage;
    if (!pkg) {
      target.innerHTML = '';
      return;
    }
    const location = pkg.location;
    target.innerHTML = `
      <div class="sr-package-output">
        <section class="sr-package-output-card">
          <h4>${escapeHtml(location.name)} · ${escapeHtml(formatPercent(pkg.dangerIntensityPercent))}% danger</h4>
          <p><strong>Danger profile:</strong> ${escapeHtml(pkg.threatLabel)} · <strong>Effective tier:</strong> ${escapeHtml(profileLabel(pkg.effectiveThreat))}</p>
          <p><strong>Focus:</strong> ${escapeHtml(pkg.focusLabel)}</p>
          <p><strong>Shadow use:</strong> ${escapeHtml(location.shadowUse)}</p>
          <p><strong>Security:</strong> ${escapeHtml(location.security)}</p>
          <p><strong>Complication:</strong> ${escapeHtml(location.complication)}</p>
          <p class="sr-package-meta">${escapeHtml(pkg.packageKey)} · ${escapeHtml(pkg.locationKey)} · ${escapeHtml(pkg.generatedAt)}</p>
        </section>
      </div>`;
  }

  function packagesForProfile(packages, profile = activeProfile()) {
    return Object.values(packages || {}).filter(pkg => pkg.threatProfile === profile).sort((left, right) => String(left.location?.name).localeCompare(String(right.location?.name)));
  }

  function renderLists() {
    renderList('sr-spatial-local-registry-list', state.localRegistry.packages, 'local');
    renderList('sr-spatial-global-registry-list', state.globalRegistry.packages, 'global');
    renderProfileMeta();
  }

  function renderList(targetId, packages, source) {
    const target = document.getElementById(targetId);
    if (!target) return;
    const records = packagesForProfile(packages);
    if (!records.length) {
      target.innerHTML = `<p class="helper-note">No ${source} packages exist in this danger profile.</p>`;
      return;
    }
    target.innerHTML = '';
    for (const pkg of records) {
      const row = document.createElement('div');
      row.className = 'sr-package-item';
      row.innerHTML = `<button type="button" class="secondary-action"><strong>${escapeHtml(pkg.location.name)}</strong><small>${escapeHtml(formatPercent(pkg.dangerIntensityPercent))}% danger · ${escapeHtml(pkg.packageKey)}</small></button>${source === 'local' ? '<button type="button" class="secondary-action" data-delete-local>Delete</button>' : '<span></span>'}`;
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
    setIntensity(pkg.threatProfile, pkg.dangerIntensityPercent);
    renderPackageOutput();
    refreshCurrent();
    setStatus(`Loaded ${source} package ${pkg.packageKey}.`, 'success');
  }

  function renderProfileMeta() {
    const target = document.getElementById('sr-package-profile-meta');
    if (!target) return;
    const profile = activeProfile();
    const localCount = packagesForProfile(state.localRegistry.packages, profile).length;
    const globalCount = packagesForProfile(state.globalRegistry.packages, profile).length;
    target.innerHTML = `<strong>${escapeHtml(profileLabel(profile))}</strong><br><span class="sr-package-meta">${escapeHtml(profile)} · ${escapeHtml(formatPercent(getIntensity(profile)))}%</span><br>${localCount} local package${localCount === 1 ? '' : 's'} · ${globalCount} global package${globalCount === 1 ? '' : 's'}`;
  }

  function setStatus(message, type = '') {
    const target = document.getElementById('sr-spatial-registry-status');
    if (!target) return;
    target.className = `sr-package-status ${type}`.trim();
    target.textContent = message;
  }

  function observeSelection() {
    const display = document.getElementById('sr-spatial-display');
    if (!display || display.dataset.srRegistryObserved === 'true') return;
    display.dataset.srRegistryObserved = 'true';
    new MutationObserver(() => window.setTimeout(refreshCurrent, 0)).observe(display, { childList: true, subtree: true, characterData: true });
  }

  async function install() {
    if (state.installed) return;
    state.installed = true;
    state.intensityValues = readIntensityValues();
    state.localRegistry = readLocalRegistry();
    for (let attempt = 0; attempt < 240; attempt += 1) {
      wrapDiscoveryEngine();
      if (buildPanel()) break;
      await wait(100);
    }
    if (!document.getElementById('sr-spatial-registry-card')) return;
    const originalThreat = document.getElementById('sr-spatial-threat')?.value || 'standard';
    document.getElementById('sr-package-threat-profile').value = originalThreat;
    syncIntensityControl(originalThreat);
    observeSelection();
    renderLists();
    refreshCurrent();
    await loadGlobalRegistry();
    renderLists();
    refreshCurrent();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else void install();

  window.ShadowrunDangerIntensity = Object.freeze({
    defaults: PROFILE_DEFAULTS,
    getValue: getIntensity,
    setValue: setIntensity,
    effectiveThreatForIntensity
  });
  window.ShadowrunSprawlRegistry = Object.freeze({
    generateLinkedPackage,
    saveCurrentLocally,
    submitCurrentGlobally,
    getCurrentPackage: () => clone(state.currentPackage),
    getLocalRegistry: () => clone(state.localRegistry),
    getGlobalRegistry: () => clone(state.globalRegistry)
  });
})();
