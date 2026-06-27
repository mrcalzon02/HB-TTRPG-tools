(() => {
  'use strict';

  const CORE_SCRIPTS = [
    'world-of-darkness-lightweight-map-core.js',
    'world-of-darkness-spatial-config-compat.js',
    'world-of-darkness-system-site-catalog.js',
    'world-of-darkness-detail-diversity-core.js',
    'world-of-darkness-regional-theme-expansion.js',
    'world-of-darkness-regional-legacy-qualifier.js',
    'world-of-darkness-system-site-expansion.js',
    'world-of-darkness-radial-location-loader.js',
    'world-of-darkness-radial-scan-compat.js'
  ];
  const ENHANCEMENT_SCRIPTS = [
    'world-of-darkness-location-package-bridge.js',
    'world-of-darkness-world-scan-overlay.js',
    'world-of-darkness-global-rescan-bridge.js',
    'world-of-darkness-context-aware-core.js',
    'world-of-darkness-context-output-normalizer.js',
    'world-of-darkness-context-aware-variants.js',
    'world-of-darkness-registry-workflow-note.js'
  ];

  const scriptPromises = new Map();
  let corePromise = null;
  let enhancementPromise = null;
  let mapReady = false;

  const wait = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds));
  const nextPaint = () => new Promise(resolve => requestAnimationFrame(() => resolve()));

  function existingScript(src) {
    return [...document.scripts].find(script => {
      const value = (script.getAttribute('src') || '').split('?')[0];
      return value === src || value.endsWith(`/${src}`);
    });
  }

  function loadScript(src) {
    if (scriptPromises.has(src)) return scriptPromises.get(src);
    const existing = existingScript(src);
    if (existing?.dataset.wodSpatialLoaded === 'true') return Promise.resolve();

    const promise = new Promise((resolve, reject) => {
      const script = existing || document.createElement('script');
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        script.dataset.wodSpatialLoaded = 'true';
        resolve();
      };
      const fail = () => {
        if (settled) return;
        settled = true;
        reject(new Error(`${src} could not be loaded.`));
      };
      script.addEventListener('load', finish, { once: true });
      script.addEventListener('error', fail, { once: true });
      if (!existing) {
        script.src = src;
        script.async = false;
        script.dataset.wodSpatialStage = 'true';
        document.body.appendChild(script);
      } else if (script.dataset.wodSpatialLoaded === 'true') {
        finish();
      }
    });
    scriptPromises.set(src, promise);
    return promise;
  }

  function panel() {
    return document.getElementById('wod-spatial-launcher');
  }

  function setStatus(message, type = '') {
    const target = document.getElementById('wod-spatial-loader-status');
    if (!target) return;
    target.className = `wod-spatial-loader-status ${type}`.trim();
    target.textContent = message;
  }

  function setButtonState(label, disabled) {
    const button = document.getElementById('wod-open-spatial-engine');
    if (!button) return;
    button.textContent = label;
    button.disabled = disabled;
    button.setAttribute('aria-busy', disabled ? 'true' : 'false');
  }

  function setAdvancedButtonState(label, disabled) {
    const button = document.getElementById('wod-load-chronicle-tools');
    if (!button) return;
    button.textContent = label;
    button.disabled = disabled;
    button.setAttribute('aria-busy', disabled ? 'true' : 'false');
  }

  function injectStyle() {
    if (document.getElementById('wod-spatial-loader-style')) return;
    const style = document.createElement('style');
    style.id = 'wod-spatial-loader-style';
    style.textContent = `
      .wod-spatial-launcher{border:1px solid var(--line);border-left:5px solid #7655a8;border-radius:16px;padding:16px;margin:18px 0;background:#11141b}
      .wod-spatial-launcher h3{margin:.1rem 0 .45rem}.wod-spatial-launcher p{color:var(--muted);line-height:1.45}
      .wod-spatial-loader-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
      .wod-spatial-loader-status{padding:8px 10px;border:1px solid var(--line);border-radius:9px;background:#0d1016;color:var(--muted);font-size:.8rem;flex:1;min-width:230px}
      .wod-spatial-loader-status.success{border-color:#2d8f71;color:#a9f1da}.wod-spatial-loader-status.error{border-color:#8b0000;color:#ffb3b3}
    `;
    document.head.appendChild(style);
  }

  function buildLauncher() {
    const view = document.getElementById('world-of-darkness');
    const prototype = view?.querySelector('.wod-box');
    if (!view || !prototype) return false;
    if (panel()) return true;

    injectStyle();
    const section = document.createElement('section');
    section.id = 'wod-spatial-launcher';
    section.className = 'wod-spatial-launcher no-print';
    section.innerHTML = `
      <p class="eyebrow">Optional map workspace</p>
      <h3>Chronicle Spatial Engine</h3>
      <p>The map-only renderer opens first without Chronicle datasets, registry parsing, or whole-map observers. Visible records then load one at a time from the map center outward with neighborhood-aware anti-repetition.</p>
      <div class="wod-spatial-loader-actions">
        <button id="wod-open-spatial-engine" type="button" class="primary-action">Open Chronicle Spatial Engine</button>
        <button id="wod-load-chronicle-tools" type="button" class="secondary-action" disabled>Load Chronicle Tools Now</button>
        <span id="wod-spatial-loader-status" class="wod-spatial-loader-status">Spatial systems are dormant, so they are not delaying this tab.</span>
      </div>`;
    prototype.before(section);
    section.querySelector('#wod-open-spatial-engine').addEventListener('click', () => void openSpatialEngine());
    section.querySelector('#wod-load-chronicle-tools').addEventListener('click', () => void loadEnhancements());
    return true;
  }

  async function waitForSpatialMap() {
    for (let attempt = 0; attempt < 240; attempt += 1) {
      const shell = document.getElementById('wod-spatial-engine');
      const mapElement = document.getElementById('wod-inventory-map');
      const capturedMap = window.WODNamedLocationBridge?.getMap?.();
      if (shell && (capturedMap || mapElement?.classList.contains('leaflet-container'))) return true;
      await wait(50);
    }
    return false;
  }

  async function loadEnhancements() {
    if (!mapReady) return;
    if (enhancementPromise) return enhancementPromise;
    setAdvancedButtonState('Loading Chronicle Tools…', true);
    enhancementPromise = (async () => {
      for (let index = 0; index < ENHANCEMENT_SCRIPTS.length; index += 1) {
        setStatus(`Map remains usable. Attaching Chronicle tool ${index + 1} of ${ENHANCEMENT_SCRIPTS.length}…`);
        await loadScript(ENHANCEMENT_SCRIPTS[index]);
        await nextPaint();
        await wait(0);
      }
      setAdvancedButtonState('Chronicle Tools Loaded', true);
      setStatus('World seeds, saved packages, scans, influence overlays, and context systems are ready.', 'success');
      document.dispatchEvent(new CustomEvent('wod:spatial-stack-ready'));
    })().catch(error => {
      enhancementPromise = null;
      setAdvancedButtonState('Retry Chronicle Tools', false);
      setStatus(`The map remains usable, but an advanced Chronicle layer failed: ${error.message}`, 'error');
      throw error;
    });
    return enhancementPromise;
  }

  function scheduleEnhancements() {
    if (!mapReady || enhancementPromise) return;
    const schedule = window.requestIdleCallback || (callback => window.setTimeout(callback, 150));
    schedule(() => { void loadEnhancements(); }, { timeout: 1800 });
  }

  async function openSpatialEngine() {
    if (corePromise) return corePromise;
    corePromise = (async () => {
      setButtonState('Loading Map…', true);
      for (let index = 0; index < CORE_SCRIPTS.length; index += 1) {
        setStatus(`Loading map-only core ${index + 1} of ${CORE_SCRIPTS.length}…`);
        await loadScript(CORE_SCRIPTS[index]);
        await nextPaint();
      }
      if (!await waitForSpatialMap()) throw new Error('The map interface did not become usable.');
      mapReady = true;
      setButtonState('Spatial Engine Loaded', true);
      setAdvancedButtonState('Load Chronicle Tools Now', false);
      setStatus('Map ready. Move to the desired area, then discover named locations. Records will load center-first with regional consistency, system-specific site structures, and local detail anti-repetition.');
      if (shouldAutoOpen()) scheduleEnhancements();
      return true;
    })().catch(error => {
      corePromise = null;
      mapReady = false;
      setButtonState('Retry Chronicle Spatial Engine', false);
      setAdvancedButtonState('Load Chronicle Tools Now', true);
      setStatus(`Spatial engine failed to load: ${error.message}`, 'error');
      throw error;
    });
    return corePromise;
  }

  function shouldAutoOpen() {
    const params = new URLSearchParams(location.search);
    return params.get('wodSpatial') === '1'
      || params.has('wodWorld')
      || params.has('wodPackage')
      || params.has('wodScope');
  }

  async function install() {
    for (let attempt = 0; attempt < 120 && !buildLauncher(); attempt += 1) await wait(50);
    if (shouldAutoOpen() && document.getElementById('world-of-darkness')?.classList.contains('active')) void openSpatialEngine();
  }

  document.addEventListener('hb:view-activated', event => {
    if (event.detail?.viewId === 'world-of-darkness' && shouldAutoOpen()) void openSpatialEngine();
  });
  document.addEventListener('wod:radial-load-complete', scheduleEnhancements);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else void install();

  window.WODSpatialLoader = Object.freeze({
    openSpatialEngine,
    loadEnhancements,
    scheduleEnhancements,
    scriptPromises
  });
})();
