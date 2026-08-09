(() => {
  'use strict';

  const VIEW_ID = 'scientific-tools';
  const ASSET_VERSION = '20260809-ism-3d-magnetic-1';
  let ismPromise = null;
  let cubeVisualizerPromise = null;
  let cubeLaboratoryPromise = null;
  let initialized = false;
  const scriptPromises = new Map();
  const stylePromises = new Map();

  function injectStyle() {
    if (document.getElementById('scientific-tools-workspace-style')) return;
    const style = document.createElement('style');
    style.id = 'scientific-tools-workspace-style';
    style.textContent = `
      #scientific-tools .scientific-tools-tabs{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0}
      #scientific-tools .scientific-tools-tab{border:1px solid var(--line);border-radius:999px;padding:9px 14px;background:#ffffff08;color:var(--muted);font-weight:800;cursor:pointer}
      #scientific-tools .scientific-tools-tab.active,#scientific-tools .scientific-tools-tab:hover{border-color:var(--accent);color:var(--ink)}
      #scientific-tools .scientific-tools-panel[hidden]{display:none}
      #scientific-tools .scientific-tools-panel{border:1px solid var(--line);border-radius:20px;padding:20px;background:rgba(255,255,255,.025)}
      #scientific-tools .scientific-tools-panel h3{margin-top:0}
      #scientific-tools .scientific-tools-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}
      #scientific-tools .scientific-tools-boundary{margin-top:16px;padding:11px 13px;border-left:3px solid var(--accent);background:rgba(255,255,255,.035);color:var(--muted);line-height:1.55}
      #scientific-tools .scientific-tools-runtime{display:grid;gap:7px;margin-top:14px;color:var(--muted);font-size:.88rem}
      #scientific-tools .scientific-tools-runtime strong{color:var(--ink)}
    `;
    document.head.appendChild(style);
  }

  function normalizedAssetUrl(value) {
    const url = new URL(String(value || ''), document.baseURI);
    url.search = '';
    url.hash = '';
    return url.href;
  }

  function existingScript(src) {
    const resolved = normalizedAssetUrl(src);
    return [...document.scripts].find(script => normalizedAssetUrl(script.getAttribute('src')) === resolved);
  }

  function existingStyle(href) {
    const resolved = normalizedAssetUrl(href);
    return [...document.querySelectorAll('link[rel="stylesheet"]')].find(link => normalizedAssetUrl(link.getAttribute('href')) === resolved);
  }

  function loadScript(src, ready = () => false) {
    if (ready()) return Promise.resolve();
    if (scriptPromises.has(src)) return scriptPromises.get(src);
    const promise = new Promise((resolve, reject) => {
      const existing = existingScript(src);
      const script = existing || document.createElement('script');
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        if (!ready()) return reject(new Error(`${src} loaded without exposing its expected API.`));
        resolve();
      };
      const fail = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        reject(new Error(`${src} could not be loaded.`));
      };
      const timeout = window.setTimeout(() => ready() ? finish() : fail(), 10000);
      script.addEventListener('load', finish, { once: true });
      script.addEventListener('error', fail, { once: true });
      if (!existing) {
        script.src = `${src}?v=${ASSET_VERSION}`;
        script.async = false;
        script.dataset.scientificToolsAsset = 'true';
        document.body.appendChild(script);
      } else if (ready()) finish();
    });
    scriptPromises.set(src, promise);
    promise.catch(() => scriptPromises.delete(src));
    return promise;
  }

  function loadStyle(href) {
    if (stylePromises.has(href)) return stylePromises.get(href);
    const existing = existingStyle(href);
    if (existing?.sheet) return Promise.resolve();
    const promise = new Promise((resolve, reject) => {
      const link = existing || document.createElement('link');
      let settled = false;
      const finish = () => { if (settled) return; settled = true; resolve(); };
      const fail = () => { if (settled) return; settled = true; reject(new Error(`${href} could not be loaded.`)); };
      link.addEventListener('load', finish, { once: true });
      link.addEventListener('error', fail, { once: true });
      if (!existing) {
        link.rel = 'stylesheet';
        link.href = `${href}?v=${ASSET_VERSION}`;
        link.dataset.scientificToolsAsset = 'true';
        document.head.appendChild(link);
      } else if (link.sheet) finish();
    });
    stylePromises.set(href, promise);
    promise.catch(() => stylePromises.delete(href));
    return promise;
  }

  function canonicalCubeEngineReady() {
    return Boolean(
      window.ShadowrunBinaryCubeEngine
      && window.ShadowrunBinaryCubeEngine.constants?.MAX_GRID_SIZE === 1024
      && typeof window.ShadowrunBinaryCubeEngine.assertOmnidirectionalNonConflict === 'function'
      && typeof window.ShadowrunBinaryCubeEngine.traceEncryptBlock === 'function'
    );
  }

  function loadBinaryCubeVisualizer() {
    if (canonicalCubeEngineReady() && window.BinaryCubeVisualizerRenderer && window.ShadowrunBinaryCubeVisualizer) {
      return Promise.resolve(window.ShadowrunBinaryCubeVisualizer);
    }
    if (cubeVisualizerPromise) return cubeVisualizerPromise;
    cubeVisualizerPromise = (async () => {
      await loadStyle('binary-cube-visualizer.css');
      await loadScript('shadowrun-binary-cube-engine.js', canonicalCubeEngineReady);
      await loadScript('shadowrun-binary-cube-auth.js', () => Boolean(window.ShadowrunBinaryCubeAuth));
      await loadScript('shadowrun-binary-cube-secure-export.js', () => Boolean(window.ShadowrunBinaryCubeSecureExport));
      await loadScript('binary-cube-visualizer-renderer.js', () => Boolean(window.BinaryCubeVisualizerRenderer));
      await loadScript('shadowrun-binary-cube-visualizer.js', () => Boolean(window.ShadowrunBinaryCubeVisualizer));
      return window.ShadowrunBinaryCubeVisualizer;
    })();
    cubeVisualizerPromise.catch(() => { cubeVisualizerPromise = null; });
    return cubeVisualizerPromise;
  }

  function loadBinaryCubeLaboratory() {
    if (canonicalCubeEngineReady() && window.ShadowrunBinaryCubeAuth && window.ShadowrunBinaryCubeEncryption && window.ShadowrunBinaryCubeEditor && window.ShadowrunBinaryCubeAuthUI) {
      return Promise.resolve(window.ShadowrunBinaryCubeEncryption);
    }
    if (cubeLaboratoryPromise) return cubeLaboratoryPromise;
    cubeLaboratoryPromise = (async () => {
      await loadScript('shadowrun-binary-cube-engine.js', canonicalCubeEngineReady);
      await loadScript('binary-cube-large-grid-ui.js', () => Boolean(window.BinaryCubeLargeGridUI));
      await loadScript('shadowrun-binary-cube-auth.js', () => Boolean(window.ShadowrunBinaryCubeAuth));
      await loadScript('shadowrun-binary-cube-encryption.js', () => Boolean(window.ShadowrunBinaryCubeEncryption));
      await loadScript('shadowrun-binary-cube-editor.js', () => Boolean(window.ShadowrunBinaryCubeEditor));
      await loadScript('shadowrun-binary-cube-auth-ui.js', () => Boolean(window.ShadowrunBinaryCubeAuthUI));
      await loadScript('shadowrun-binary-cube-secure-export.js', () => Boolean(window.ShadowrunBinaryCubeSecureExport));
      return window.ShadowrunBinaryCubeEncryption;
    })();
    cubeLaboratoryPromise.catch(() => { cubeLaboratoryPromise = null; });
    return cubeLaboratoryPromise;
  }

  function loadIsmLab() {
    if (window.InterstellarMediaCollisionsLab) return Promise.resolve(window.InterstellarMediaCollisionsLab);
    if (ismPromise) return ismPromise;
    ismPromise = loadScript('interstellar-media-collisions-lab.js', () => Boolean(window.InterstellarMediaCollisionsLab))
      .then(() => window.InterstellarMediaCollisionsLab);
    ismPromise.catch(() => { ismPromise = null; });
    return ismPromise;
  }

  async function withLoadingButton(button, loadingLabel, action) {
    const original = button?.textContent || '';
    if (button) {
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.textContent = loadingLabel;
    }
    try {
      return await action();
    } catch (error) {
      alert(error.message);
      return null;
    } finally {
      if (button) {
        button.disabled = false;
        button.removeAttribute('aria-busy');
        button.textContent = original;
      }
    }
  }

  function openBinaryCubeVisualizer(button = null, artifacts = null) {
    return withLoadingButton(button, 'Loading Visualizer…', async () => {
      const api = await loadBinaryCubeVisualizer();
      if (!api?.openPanel) throw new Error('The canonical Binary Cube visualizer loaded without an open-panel interface.');
      if (artifacts && typeof api.loadArtifacts === 'function') return api.loadArtifacts(artifacts);
      return api.openPanel();
    });
  }

  function openBinaryCubeLaboratory(button = null, artifacts = null) {
    return withLoadingButton(button, 'Loading Laboratory…', async () => {
      const api = await loadBinaryCubeLaboratory();
      if (!api?.openPanel) throw new Error('The canonical Binary Cube laboratory loaded without an open-panel interface.');
      if (artifacts && typeof api.loadArtifacts === 'function') return api.loadArtifacts(artifacts);
      return api.openPanel();
    });
  }

  function openIsmSimulation(button = null) {
    return withLoadingButton(button, 'Loading Simulation…', async () => {
      const api = await loadIsmLab();
      if (!api?.openPanel) throw new Error('The ISM Media Simulation loaded without an open-panel interface.');
      return api.openPanel({ setting: 'scientific-tools' });
    });
  }

  function selectTab(tabId) {
    document.querySelectorAll('#scientific-tools [data-scientific-tools-tab]').forEach(button => {
      const active = button.dataset.scientificToolsTab === tabId;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('#scientific-tools [data-scientific-tools-panel]').forEach(panel => {
      panel.hidden = panel.dataset.scientificToolsPanel !== tabId;
    });
  }

  function buildWorkspace() {
    const view = document.getElementById(VIEW_ID);
    if (!view) return null;
    view.setAttribute('aria-labelledby', 'scientific-tools-title');
    view.innerHTML = `
      <div class="hero-card no-print">
        <p class="eyebrow">Scientific Tools</p>
        <h2 id="scientific-tools-title">Scientific Simulation Workspace</h2>
        <p>Setting-neutral experimental systems live here as shared runtimes. Campaign workspaces may link into them, but they do not carry duplicate implementations.</p>
      </div>
      <div class="scientific-tools-tabs no-print" role="tablist" aria-label="Scientific Tools systems">
        <button type="button" class="scientific-tools-tab active" data-scientific-tools-tab="binary-cube" role="tab" aria-selected="true">Binary Cube</button>
        <button type="button" class="scientific-tools-tab" data-scientific-tools-tab="ism-media-simulation" role="tab" aria-selected="false">ISM Media Simulation</button>
      </div>
      <section class="scientific-tools-panel no-print" data-scientific-tools-panel="binary-cube">
        <p class="eyebrow">Canonical encoding and traversal system</p>
        <h3>Binary Cube Laboratory and Encoder Visualizer</h3>
        <p>The accepted Shadowrun Binary Cube engine, authenticated transport support, and visualizer are the definitive implementation. Scientific Tools, Shadowrun, and Black Light Continuum all open this same browser runtime rather than maintaining setting-specific copies.</p>
        <div class="scientific-tools-actions">
          <button id="scientific-tools-open-binary-cube-visualizer" type="button" class="primary-action">Open Binary Cube Visualizer</button>
          <button id="scientific-tools-open-binary-cube-laboratory" type="button" class="secondary-action">Open Binary Cube Laboratory</button>
        </div>
        <div class="scientific-tools-runtime"><span><strong>Canonical engine:</strong> ShadowrunBinaryCubeEngine</span><span><strong>Authenticated transport:</strong> ShadowrunBinaryCubeAuth + secure export</span><span><strong>Visualizer:</strong> one shared ShadowrunBinaryCubeVisualizer instance</span></div>
        <div class="scientific-tools-boundary"><strong>Runtime boundary:</strong> setting launchers may provide context or artifacts, but encoding, keys, masks, traces, ciphertext, validation, rendering, and authentication remain owned by the single canonical Binary Cube implementation.</div>
      </section>
      <section class="scientific-tools-panel no-print" data-scientific-tools-panel="ism-media-simulation" hidden>
        <p class="eyebrow">Interstellar medium collision model</p>
        <h3>ISM Media Simulation</h3>
        <p>Cast phase-light vectors through literal 1:1 interstellar-medium particles, retain the physically bounded cosmological-constant term, apply the separate deterministic Shadow-key scattering operator, and collect all non-input cube faces concurrently.</p>
        <div class="scientific-tools-actions">
          <button id="scientific-tools-open-ism" type="button" class="primary-action">Open ISM Media Simulation</button>
        </div>
        <div class="scientific-tools-boundary"><strong>Model boundary:</strong> particle density, physical cube scale, light transit, and Λ calculations remain physical-model quantities. Shadow-key coupling remains an explicitly separate experimental scattering/obfuscation layer.</div>
      </section>`;

    view.querySelectorAll('[data-scientific-tools-tab]').forEach(button => {
      button.addEventListener('click', () => selectTab(button.dataset.scientificToolsTab));
    });
    view.querySelector('#scientific-tools-open-binary-cube-visualizer')?.addEventListener('click', event => void openBinaryCubeVisualizer(event.currentTarget));
    view.querySelector('#scientific-tools-open-binary-cube-laboratory')?.addEventListener('click', event => void openBinaryCubeLaboratory(event.currentTarget));
    view.querySelector('#scientific-tools-open-ism')?.addEventListener('click', event => void openIsmSimulation(event.currentTarget));
    selectTab('binary-cube');
    return view;
  }

  function initialize() {
    injectStyle();
    if (!initialized) {
      buildWorkspace();
      initialized = true;
    }
    return document.getElementById(VIEW_ID);
  }

  initialize();
  window.ScientificToolsWorkspace = Object.freeze({
    initialize,
    selectTab,
    loadBinaryCubeVisualizer,
    loadBinaryCubeLaboratory,
    openBinaryCubeVisualizer,
    openBinaryCubeLaboratory,
    loadIsmLab,
    openIsmSimulation
  });
})();