(() => {
  'use strict';

  const STORAGE = {
    localRegistry: 'hb-wod-generated-location-packages-v2',
    activeWorld: 'hb-wod-active-world-seed-v2',
    localWorlds: 'hb-wod-local-world-seeds-v2'
  };
  const state = {
    datasets: null,
    observer: null,
    enriching: false
  };

  const wait = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds));
  const clone = value => JSON.parse(JSON.stringify(value));
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

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

  async function loadDatasets() {
    const config = await loadJson('data/world-of-darkness/spatial-engine-config.json');
    const [baseLocations, contextExpansion, baseCrosslinks, crosslinkExpansion] = await Promise.all([
      loadJson(config.coreData.locations),
      loadJson(config.coreData.contextExpansion),
      loadJson(config.coreData.crosslinks),
      loadJson(config.coreData.crosslinkExpansion)
    ]);
    state.datasets = { baseLocations, contextExpansion, baseCrosslinks, crosslinkExpansion };
  }

  function activeRef() {
    return readStorage(STORAGE.activeWorld, null);
  }

  function activeWorld() {
    const ref = activeRef();
    if (!ref?.worldSeedKey) return null;
    const localWorlds = readStorage(STORAGE.localWorlds, { worlds: {} });
    return localWorlds.worlds?.[ref.worldSeedKey] || null;
  }

  function enrichPackage(pkg, generatorVersion) {
    if (!state.datasets || !window.WODContextAwareCore) return pkg;
    return window.WODContextAwareCore.enrichPackage(pkg, state.datasets, {
      generatorVersion,
      enrichedAt: new Date().toISOString()
    });
  }

  function enrichStoredKeys(worldSeedKey, packageKeys, generatorVersion) {
    if (!worldSeedKey || !packageKeys?.length || state.enriching) return { changed: 0 };
    state.enriching = true;
    try {
      const registry = readStorage(STORAGE.localRegistry, { worlds: {} });
      const packages = registry.worlds?.[worldSeedKey]?.packages;
      if (!packages) return { changed: 0 };
      let changed = 0;
      for (const packageKey of packageKeys) {
        const pkg = packages[packageKey];
        if (!pkg) continue;
        if (pkg.source?.contextResolverVersion === '1.0.0') continue;
        packages[packageKey] = enrichPackage(pkg, generatorVersion);
        changed += 1;
      }
      if (changed && writeStorage(STORAGE.localRegistry, registry)) {
        document.dispatchEvent(new CustomEvent('wod:context-aware-packages-enriched', {
          detail: { worldSeedKey, packageKeys: clone(packageKeys), changed }
        }));
        const world = activeWorld();
        if (world) document.dispatchEvent(new CustomEvent('wod:world-seed-changed', { detail: clone(world) }));
      }
      return { changed };
    } finally {
      state.enriching = false;
    }
  }

  function enrichLocalScan(event) {
    const worldSeedKey = event.detail?.worldSeedKey;
    const scanKey = event.detail?.scanKey;
    const registry = readStorage(STORAGE.localRegistry, { worlds: {} });
    const coverage = registry.worlds?.[worldSeedKey]?.scanCoverage?.[scanKey];
    const packageKeys = coverage?.packageKeys || [];
    const result = enrichStoredKeys(worldSeedKey, packageKeys, 'context-aware-local-world-scan-4.0.0');
    updateStatus(result.changed
      ? `Applied context-aware 420-variant enrichment to ${result.changed} newly generated local package${result.changed === 1 ? '' : 's'}.`
      : 'Local scan packages already use the context-aware 420-variant resolver.');
  }

  function currentPackageKey() {
    const text = document.getElementById('wod-location-package-output')?.textContent || '';
    return text.match(/wodpkg-[0-9a-f]{8}/)?.[0] || '';
  }

  function enrichCurrentSavedPackage() {
    const ref = activeRef();
    const packageKey = currentPackageKey();
    if (!ref?.worldSeedKey || !packageKey) return;
    const result = enrichStoredKeys(ref.worldSeedKey, [packageKey], 'context-aware-local-package-4.0.0');
    if (result.changed) updateStatus(`Saved ${packageKey} with context-aware real-world and game-line enrichment.`);
  }

  function updateStatus(message) {
    const target = document.getElementById('wod-world-scan-status') || document.getElementById('wod-package-location-status');
    if (!target) return;
    target.textContent = message;
  }

  function inventoryStatusFromUi() {
    const text = `${document.getElementById('wod-location-package-output')?.textContent || ''} ${document.getElementById('wod-display-matrix')?.textContent || ''}`;
    if (/Formally Inventoried|INVENTORIED/.test(text)) return 'INVENTORIED';
    if (/Active but Unregistered|ACTIVE_UNREGISTERED/.test(text)) return 'ACTIVE_UNREGISTERED';
    if (/Tangential|TANGENTIAL/.test(text)) return 'TANGENTIAL';
    return 'MUNDANE';
  }

  function sourceLocationFromLatestScan(name, lat, lng) {
    const locations = window.WODNamedLocationBridge?.getLatestScan?.()?.locations || [];
    return locations.find(location => {
      if (String(location.name || '').trim() !== String(name || '').trim()) return false;
      return Math.abs(Number(location.lat) - lat) < 0.00001 && Math.abs(Number(location.lng) - lng) < 0.00001;
    }) || null;
  }

  function previewPackage() {
    const output = document.getElementById('wod-location-package-output');
    if (!output?.textContent.includes('wodpkg-')) return null;
    const name = document.getElementById('wod-business-name')?.value.trim();
    const address = document.getElementById('wod-business-address')?.value.trim() || '';
    const lat = Number(document.getElementById('wod-business-lat')?.value);
    const lng = Number(document.getElementById('wod-business-lng')?.value);
    const category = document.getElementById('wod-business-type')?.value || 'other';
    const line = document.getElementById('wod-spatial-line')?.value || 'unified';
    const packageKey = currentPackageKey();
    const locationKey = output.textContent.match(/gmaps-[0-9a-f]{8}/)?.[0] || '';
    const ref = activeRef();
    const world = activeWorld();
    if (!name || !packageKey || !locationKey || !ref?.worldSeedKey || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const scanned = sourceLocationFromLatestScan(name, lat, lng);
    return {
      schemaVersion: '2.0.0',
      packageKey,
      worldSeedKey: ref.worldSeedKey,
      worldSeedLabel: world?.label || ref.worldSeedKey,
      locationKey,
      gameLine: line,
      generatedAt: new Date().toISOString(),
      location: {
        name,
        address,
        referenceUrl: document.getElementById('wod-business-url')?.value.trim() || '',
        category,
        coordinates: { lat, lng },
        inventoryStatus: inventoryStatusFromUi(),
        claimed: false,
        contextSnapshot: {},
        spatialContext: {
          source: 'OpenStreetMap / Chronicle preview',
          osmType: scanned?.osmType,
          osmId: scanned?.osmId,
          featureLabel: scanned?.featureLabel || 'Named Map Feature',
          sourceTags: clone(scanned?.sourceTags || {})
        }
      },
      outputs: {},
      source: {}
    };
  }

  function renderPreview() {
    if (!state.datasets || !window.WODContextAwareCore) return;
    const output = document.getElementById('wod-location-package-output');
    if (!output || output.querySelector('[data-wod-context-aware-preview]')) return;
    const skeleton = previewPackage();
    if (!skeleton) return;
    const enriched = enrichPackage(skeleton, 'context-aware-preview-4.0.0');
    const summary = window.WODContextAwareCore.summarizePackage(enriched);
    const selected = enriched.location.contextAwareness?.outputSelections || {};
    const card = document.createElement('section');
    card.className = 'wod-package-output-card';
    card.dataset.wodContextAwarePreview = 'true';
    card.innerHTML = `
      <h5>Context-Aware Synthesis · ${escapeHtml(summary.setting)}</h5>
      <p><strong>Effective matrix:</strong> ${escapeHtml(summary.variant)} across 420 location variants.</p>
      <p><strong>Real-world match:</strong> ${escapeHtml(summary.featureClass)} · ${escapeHtml(enriched.location.contextAwareness.realWorldCategory)}</p>
      <p><strong>Selected context:</strong> ${escapeHtml(summary.context)}</p>
      <p>${escapeHtml(enriched.location.contextSnapshot.hiddenFunction)}</p>
      <p><strong>Context questions:</strong> ${summary.questions.map(escapeHtml).join(' · ')}</p>
      <p><strong>Matched hooks:</strong> ${summary.hooks.length ? summary.hooks.map(escapeHtml).join(', ') : 'generic deterministic fallback'}</p>
      <p><strong>Context-aware outputs:</strong> ${Object.values(selected).map(value => escapeHtml(value.id || 'none')).join(' · ')}</p>`;
    output.querySelector('.wod-package-output')?.appendChild(card);
  }

  function installObserver() {
    const output = document.getElementById('wod-location-package-output');
    if (!output) return false;
    state.observer?.disconnect();
    state.observer = new MutationObserver(() => window.setTimeout(renderPreview, 0));
    state.observer.observe(output, { childList: true, subtree: true, characterData: true });
    renderPreview();
    return true;
  }

  async function install() {
    try {
      await loadDatasets();
      let attempts = 0;
      while (!installObserver() && attempts < 150) {
        attempts += 1;
        await wait(100);
      }
      document.addEventListener('wod:local-world-scan-complete', enrichLocalScan);
      document.addEventListener('click', event => {
        if (event.target.closest('#wod-save-location-package-local')) window.setTimeout(enrichCurrentSavedPackage, 80);
      }, true);
      document.addEventListener('wod:world-seed-changed', () => window.setTimeout(renderPreview, 0));
    } catch (error) {
      updateStatus(`Context-aware variant resolver failed to initialize: ${error.message}`);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else void install();
})();
