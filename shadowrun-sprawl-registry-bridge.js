(() => {
  'use strict';

  const REPOSITORY = 'mrcalzon02/HB-TTRPG-tools';
  const STORAGE_KEY = 'hb-shadowrun-sprawl-location-registry-v1';
  const GLOBAL_REGISTRY_URL = 'data/shadowrun/sprawl_location_registry.json';
  const WORKFLOW = 'ingest-shadowrun-sprawl-location.yml';
  const state = {
    installed: false,
    current: null,
    localRegistry: { schemaVersion: '1.0.0', entries: {} },
    globalRegistry: { schemaVersion: '1.0.0', entries: {} }
  };

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const wait = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds));

  function readLocalRegistry() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!parsed || parsed.schemaVersion !== '1.0.0' || !parsed.entries || typeof parsed.entries !== 'object') {
        return { schemaVersion: '1.0.0', entries: {} };
      }
      return parsed;
    } catch (_) {
      return { schemaVersion: '1.0.0', entries: {} };
    }
  }

  function writeLocalRegistry(registry, expectedKey) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(registry));
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return Boolean(stored?.entries?.[expectedKey]);
    } catch (_) {
      return false;
    }
  }

  async function loadGlobalRegistry() {
    try {
      const response = await fetch(GLOBAL_REGISTRY_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`${GLOBAL_REGISTRY_URL} returned ${response.status}`);
      const registry = await response.json();
      if (registry?.schemaVersion !== '1.0.0' || !registry.entries || typeof registry.entries !== 'object') {
        throw new Error('The global Shadowrun registry has an unsupported shape.');
      }
      state.globalRegistry = registry;
    } catch (error) {
      setStatus(`Global registry could not be loaded: ${error.message}`, 'error');
    }
  }

  function injectStyles() {
    if (document.getElementById('sr-sprawl-registry-style')) return;
    const style = document.createElement('style');
    style.id = 'sr-sprawl-registry-style';
    style.textContent = `
      .sr-registry-card{border-left-color:#7655a8}
      .sr-registry-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}
      .sr-registry-status{margin-top:9px;padding:9px;border:1px solid var(--line);border-radius:9px;background:#0d1016;color:var(--muted);font-size:.78rem;line-height:1.4}
      .sr-registry-status.success{border-color:#2d8f71;color:#a9f1da}.sr-registry-status.error{border-color:#8b0000;color:#ffb3b3}
      .sr-registry-list{display:grid;gap:6px;margin-top:8px}.sr-registry-item{border:1px solid var(--line);border-radius:8px;padding:8px;background:#10131a}
      .sr-registry-item strong{display:block}.sr-registry-item small{display:block;color:var(--muted);margin:3px 0 7px}.sr-registry-item-actions{display:flex;flex-wrap:wrap;gap:6px}
    `;
    document.head.appendChild(style);
  }

  function buildPanel() {
    const display = document.getElementById('sr-spatial-display');
    if (!display) return false;
    if (document.getElementById('sr-spatial-registry-card')) return true;
    injectStyles();
    const card = document.createElement('section');
    card.id = 'sr-spatial-registry-card';
    card.className = 'sr-fast-card sr-registry-card';
    card.innerHTML = `
      <p class="eyebrow">Sprawl location persistence</p>
      <h3>Save Locally or Submit Globally</h3>
      <p class="helper-note">Local saves are verified by reading them back from browser storage. Global publication creates a GitHub issue payload and requires the repository-owner ingestion workflow.</p>
      <div class="sr-registry-actions">
        <button id="sr-spatial-registry-save-local" type="button" class="secondary-action" disabled>Save Locally</button>
        <button id="sr-spatial-registry-submit-global" type="button" class="primary-action" disabled>Submit Globally</button>
        <button id="sr-spatial-registry-delete-local" type="button" class="secondary-action" disabled>Delete Local Save</button>
      </div>
      <div id="sr-spatial-registry-status" class="sr-registry-status" role="status" aria-live="polite">Select a scanned location first.</div>
      <details><summary>Locally saved sprawl locations</summary><div id="sr-spatial-local-registry-list" class="sr-registry-list"></div></details>
      <details><summary>Embedded global sprawl locations</summary><div id="sr-spatial-global-registry-list" class="sr-registry-list"></div></details>`;
    display.insertAdjacentElement('afterend', card);
    document.getElementById('sr-spatial-registry-save-local').addEventListener('click', saveCurrentLocally);
    document.getElementById('sr-spatial-registry-submit-global').addEventListener('click', submitCurrentGlobally);
    document.getElementById('sr-spatial-registry-delete-local').addEventListener('click', deleteCurrentLocal);
    return true;
  }

  function selectedSite() {
    return window.ShadowrunSprawlDiscovery?.getSelectedSite?.() || null;
  }

  function cleanString(value, maximum = 6000) {
    return String(value || '').slice(0, maximum);
  }

  function snapshot(site) {
    if (!site?.entryKey || !/^srpoi-[0-9a-f]{8}$/.test(site.entryKey)) {
      throw new Error('The selected location does not have a valid stable sprawl key.');
    }
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
      focus: cleanString(site.focus, 50),
      focusLabel: cleanString(site.focusLabel, 120),
      threat: cleanString(site.threat, 50),
      threatLabel: cleanString(site.threatLabel, 120),
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
      workspaceStatus: ['STANDARD_UNCLAIMED', 'SUPPORTIVE', 'OPT_OUT'].includes(site.status) ? site.status : 'STANDARD_UNCLAIMED',
      savedAt: new Date().toISOString()
    };
  }

  function refreshCurrent() {
    const site = selectedSite();
    state.current = site;
    const save = document.getElementById('sr-spatial-registry-save-local');
    const submit = document.getElementById('sr-spatial-registry-submit-global');
    const remove = document.getElementById('sr-spatial-registry-delete-local');
    if (!save || !submit || !remove) return;
    if (!site?.entryKey) {
      save.disabled = submit.disabled = remove.disabled = true;
      setStatus('Select a scanned location first.');
      return;
    }
    const localExists = Boolean(state.localRegistry.entries[site.entryKey]);
    const globalExists = Boolean(state.globalRegistry.entries[site.entryKey]);
    save.disabled = false;
    save.textContent = localExists ? 'Update Local Save' : 'Save Locally';
    submit.disabled = globalExists;
    submit.textContent = globalExists ? 'Already Global' : 'Submit Globally';
    remove.disabled = !localExists;
    if (globalExists) setStatus(`${site.name} is already embedded in the global Shadowrun registry.`, 'success');
    else if (localExists) setStatus(`${site.name} has a verified local save.`, 'success');
    else setStatus(`${site.name} is ready to save locally or submit globally.`);
  }

  function saveCurrentLocally() {
    try {
      const entry = snapshot(state.current || selectedSite());
      state.localRegistry.entries[entry.entryKey] = entry;
      state.localRegistry.entries = Object.fromEntries(Object.entries(state.localRegistry.entries).sort(([left], [right]) => left.localeCompare(right)));
      if (!writeLocalRegistry(state.localRegistry, entry.entryKey)) {
        delete state.localRegistry.entries[entry.entryKey];
        throw new Error('Browser storage rejected the save or failed the read-back verification.');
      }
      const verified = readLocalRegistry();
      if (!verified.entries[entry.entryKey]) throw new Error('The saved record could not be read back from browser storage.');
      state.localRegistry = verified;
      renderLists();
      refreshCurrent();
      setStatus(`Verified local save for ${entry.name} (${entry.entryKey}).`, 'success');
    } catch (error) {
      setStatus(`Local save failed: ${error.message}`, 'error');
    }
  }

  function deleteCurrentLocal() {
    const site = state.current || selectedSite();
    if (!site?.entryKey || !state.localRegistry.entries[site.entryKey]) return;
    delete state.localRegistry.entries[site.entryKey];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.localRegistry));
      const verified = readLocalRegistry();
      if (verified.entries[site.entryKey]) throw new Error('The browser retained the record after deletion.');
      state.localRegistry = verified;
      renderLists();
      refreshCurrent();
      setStatus(`Deleted local save ${site.entryKey}.`, 'success');
    } catch (error) {
      setStatus(`Local deletion failed: ${error.message}`, 'error');
    }
  }

  function submitCurrentGlobally() {
    try {
      const entry = snapshot(state.current || selectedSite());
      if (state.globalRegistry.entries[entry.entryKey]) {
        return setStatus(`${entry.entryKey} is already embedded globally.`, 'success');
      }
      const patch = {
        schemaVersion: '1.0.0',
        target: GLOBAL_REGISTRY_URL,
        entryKey: entry.entryKey,
        entry: { ...entry, submittedAt: new Date().toISOString() }
      };
      const completeBody = '<!-- SHADOWRUN_SPRAWL_LOCATION_PATCH -->\n'
        + 'This issue contains one deterministic real-world Shadowrun sprawl location overlay.\n\n'
        + '```json\n'
        + JSON.stringify(patch, null, 2)
        + '\n```\n';
      const title = `[SHADOWRUN-SPRAWL] ${entry.name} (${entry.entryKey})`;
      if (window.HBSpatialSubmissionHandoff?.prepare) {
        window.HBSpatialSubmissionHandoff.prepare({ title, body: completeBody, workflow: WORKFLOW, slug: entry.entryKey });
      } else {
        window.open(`https://github.com/${REPOSITORY}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(completeBody)}`, '_blank', 'noopener');
      }
      setStatus(`Prepared global submission for ${entry.name}. Create the issue, then run the linked ingestion workflow with its issue number.`, 'success');
    } catch (error) {
      setStatus(`Global submission failed: ${error.message}`, 'error');
    }
  }

  function renderLists() {
    renderList('sr-spatial-local-registry-list', state.localRegistry.entries, 'local');
    renderList('sr-spatial-global-registry-list', state.globalRegistry.entries, 'global');
  }

  function renderList(targetId, entries, source) {
    const target = document.getElementById(targetId);
    if (!target) return;
    const records = Object.values(entries || {}).sort((left, right) => String(left.name).localeCompare(String(right.name)));
    if (!records.length) {
      target.innerHTML = `<p class="helper-note">No ${source} sprawl locations are stored.</p>`;
      return;
    }
    target.innerHTML = records.map(entry => `
      <article class="sr-registry-item" data-sr-registry-key="${escapeHtml(entry.entryKey)}">
        <strong>${escapeHtml(entry.name)}</strong><small>${escapeHtml(entry.address || `${entry.coordinates?.lat}, ${entry.coordinates?.lng}`)} · ${escapeHtml(entry.entryKey)}</small>
        <div class="sr-registry-item-actions"><a class="secondary-action" target="_blank" rel="noopener" href="${escapeHtml(entry.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${entry.coordinates?.lat},${entry.coordinates?.lng}`)}">Open Maps</a><button type="button" class="secondary-action" data-copy-entry>Copy JSON</button>${source === 'local' ? '<button type="button" class="secondary-action" data-delete-entry>Delete</button>' : ''}</div>
      </article>`).join('');
    target.querySelectorAll('[data-copy-entry]').forEach(button => button.addEventListener('click', async () => {
      const key = button.closest('[data-sr-registry-key]').dataset.srRegistryKey;
      const entry = entries[key];
      try {
        await navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
        setStatus(`Copied ${key} as JSON.`, 'success');
      } catch (_) {
        setStatus(`Clipboard access was unavailable for ${key}.`, 'error');
      }
    }));
    target.querySelectorAll('[data-delete-entry]').forEach(button => button.addEventListener('click', () => {
      const key = button.closest('[data-sr-registry-key]').dataset.srRegistryKey;
      delete state.localRegistry.entries[key];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.localRegistry));
        state.localRegistry = readLocalRegistry();
        renderLists();
        refreshCurrent();
        setStatus(`Deleted local save ${key}.`, 'success');
      } catch (error) {
        setStatus(`Local deletion failed: ${error.message}`, 'error');
      }
    }));
  }

  function setStatus(message, type = '') {
    const target = document.getElementById('sr-spatial-registry-status');
    if (!target) return;
    target.className = `sr-registry-status ${type}`.trim();
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
    state.localRegistry = readLocalRegistry();
    for (let attempt = 0; attempt < 240 && !buildPanel(); attempt += 1) await wait(100);
    if (!document.getElementById('sr-spatial-registry-card')) return;
    observeSelection();
    renderLists();
    refreshCurrent();
    await loadGlobalRegistry();
    renderLists();
    refreshCurrent();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else void install();

  window.ShadowrunSprawlRegistry = Object.freeze({
    saveCurrentLocally,
    submitCurrentGlobally,
    getLocalRegistry: () => clone(state.localRegistry),
    getGlobalRegistry: () => clone(state.globalRegistry)
  });
})();
