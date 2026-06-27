(() => {
  'use strict';

  const REPOSITORY = 'mrcalzon02/HB-TTRPG-tools';
  const ACTIVE_WORLD_KEY = 'hb-wod-active-world-seed-v2';
  const LOCAL_WORLDS_KEY = 'hb-wod-local-world-seeds-v2';
  let globalRegistry = { worlds: {} };
  let pending = false;

  const wait = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds));

  function hash32(input) {
    let hash = 2166136261;
    for (const character of String(input)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  const keyFrom = (prefix, input) => `${prefix}-${hash32(input).toString(16).padStart(8, '0')}`;

  function readStorage(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch (_) {
      return fallback;
    }
  }

  async function loadGlobalRegistry() {
    try {
      const response = await fetch('data/world-of-darkness/generated_location_registry.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`registry returned ${response.status}`);
      globalRegistry = await response.json();
      globalRegistry.worlds ||= {};
    } catch (_) {
      globalRegistry = { worlds: {} };
    }
  }

  function activeWorld() {
    const ref = readStorage(ACTIVE_WORLD_KEY, null);
    if (!ref?.worldSeedKey) return null;
    const localWorlds = readStorage(LOCAL_WORLDS_KEY, { worlds: {} });
    return ref.scope === 'embedded'
      ? globalRegistry.worlds?.[ref.worldSeedKey] || localWorlds.worlds?.[ref.worldSeedKey] || null
      : localWorlds.worlds?.[ref.worldSeedKey] || globalRegistry.worlds?.[ref.worldSeedKey] || null;
  }

  function gameLine() {
    return document.getElementById('wod-spatial-line')?.value || 'unified';
  }

  function viewportSignature(viewport) {
    if (!viewport?.bounds) return '';
    return [viewport.zoom, viewport.bounds.south, viewport.bounds.west, viewport.bounds.north, viewport.bounds.east]
      .map(value => Number(value).toFixed(4))
      .join(':');
  }

  function scanIsCurrent(scan) {
    const current = window.WODNamedLocationBridge?.getViewport?.();
    return Boolean(scan && viewportSignature(scan.viewport) === viewportSignature(current));
  }

  function setStatus(message, type = '') {
    const target = document.getElementById('wod-world-scan-status');
    if (!target) return;
    target.className = `wod-world-scan-status ${type}`.trim();
    target.textContent = message;
  }

  function requestDiscovery() {
    const button = document.getElementById('wod-scan-visible-businesses');
    if (!button) {
      setStatus('The named-location discovery control is unavailable.', 'error');
      return;
    }
    pending = true;
    setStatus('The visible map has not been discovered yet. Discovering named locations before preparing the global rescan…');
    button.click();
  }

  function submitCompactRescan() {
    const world = activeWorld();
    const scan = window.WODNamedLocationBridge?.getLatestScan?.();
    if (!world) return setStatus('Select a local or embedded world seed before scanning globally.', 'error');
    if (!scanIsCurrent(scan)) return requestDiscovery();
    if (!scan?.viewport?.bounds || scan.viewport.zoom < 14) {
      return setStatus('Zoom to level 14 or closer before scanning globally.', 'error');
    }

    const line = gameLine();
    const scanKey = keyFrom('wodscan', [
      world.worldSeedKey,
      'server-rescan-all-named',
      line,
      scan.scannedAt,
      viewportSignature(scan.viewport)
    ].join('|'));
    const patch = {
      schemaVersion: '2.0.0',
      target: 'data/world-of-darkness/generated_location_registry.json',
      worldSeed: {
        worldSeedKey: world.worldSeedKey,
        label: world.label,
        seedValue: world.seedValue,
        createdAt: world.createdAt
      },
      gameLine: line,
      scan: {
        scanKey,
        queryMode: 'server-rescan-all-named',
        scannedAt: scan.scannedAt,
        zoom: scan.viewport.zoom,
        bounds: scan.viewport.bounds,
        center: scan.viewport.center,
        browserDiscoveredCount: scan.locations?.length || 0,
        browserResponseCapped: Boolean(scan.meta?.capped)
      }
    };
    const body = `<!-- WOD_WORLD_SCAN_RESCAN_PATCH -->\nThis compact request asks the owner-approved workflow to rescan every named OpenStreetMap feature inside the recorded viewport and add missing immutable packages under the selected world seed.\n\n\`\`\`json\n${JSON.stringify(patch, null, 2)}\n\`\`\`\n`;
    const title = `[WOD-GLOBAL-SCAN] ${world.label} · ${line} · ${scanKey}`;
    window.open(`https://github.com/${REPOSITORY}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`, '_blank', 'noopener');
    setStatus('Opened a compact global viewport-rescan issue. Submit it, then run “Ingest World of Darkness World Scan Batch” with the issue number. The workflow will rescan the bounds and hard-code every missing named-location package.', 'success');
  }

  async function install() {
    await loadGlobalRegistry();
    let attempts = 0;
    while (!document.getElementById('wod-scan-global-world') && attempts < 150) {
      attempts += 1;
      await wait(100);
    }
    const button = document.getElementById('wod-scan-global-world');
    if (!button) return;
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      submitCompactRescan();
    }, true);
    document.addEventListener('wod:named-location-scan-complete', () => {
      if (!pending) return;
      pending = false;
      window.setTimeout(submitCompactRescan, 0);
    });
    document.addEventListener('wod:world-seed-changed', loadGlobalRegistry);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else void install();
})();
