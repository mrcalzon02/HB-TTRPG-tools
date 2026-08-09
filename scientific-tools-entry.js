(() => {
  'use strict';

  const VIEW_ID = 'scientific-tools';
  const ASSET_VERSION = '20260809-media-forensics-1';
  let cooperativeRunnerPromise = null;
  let ismPromise = null;
  let doubleSlitPromise = null;
  let cubeVisualizerPromise = null;
  let cubeLaboratoryPromise = null;
  let decryptionDashboardPromise = null;
  let informationAnalysisPromise = null;
  let communicationCapacityPromise = null;
  let mediaForensicsPromise = null;
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

  function loadCooperativeRunner() {
    if (window.ScientificToolsCooperativeRunner) return Promise.resolve(window.ScientificToolsCooperativeRunner);
    if (cooperativeRunnerPromise) return cooperativeRunnerPromise;
    cooperativeRunnerPromise = loadScript('scientific-tools-cooperative-runner.js', () => Boolean(window.ScientificToolsCooperativeRunner))
      .then(() => window.ScientificToolsCooperativeRunner);
    cooperativeRunnerPromise.catch(() => { cooperativeRunnerPromise = null; });
    return cooperativeRunnerPromise;
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
      await loadCooperativeRunner();
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
      await loadCooperativeRunner();
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

  function loadDecryptionDashboard() {
    if (window.BinaryCubeDecryptionDashboard) return Promise.resolve(window.BinaryCubeDecryptionDashboard);
    if (decryptionDashboardPromise) return decryptionDashboardPromise;
    decryptionDashboardPromise = (async () => {
      await loadCooperativeRunner();
      await loadStyle('binary-cube-decryption-dashboard.css');
      await loadScript('shadowrun-binary-cube-engine.js', canonicalCubeEngineReady);
      await loadScript('shadowrun-binary-cube-secure-export.js', () => Boolean(window.ShadowrunBinaryCubeSecureExport));
      await loadScript('binary-cube-decryption-dashboard.js', () => Boolean(window.BinaryCubeDecryptionDashboard));
      return window.BinaryCubeDecryptionDashboard;
    })();
    decryptionDashboardPromise.catch(() => { decryptionDashboardPromise = null; });
    return decryptionDashboardPromise;
  }

  function loadInformationAnalysisSuite() {
    if (window.BinaryCubeInformationAnalysisSuite) return Promise.resolve(window.BinaryCubeInformationAnalysisSuite);
    if (informationAnalysisPromise) return informationAnalysisPromise;
    informationAnalysisPromise = (async () => {
      await loadCooperativeRunner();
      await loadStyle('binary-cube-information-analysis-suite.css');
      await loadScript('binary-cube-information-analysis-suite.js', () => Boolean(window.BinaryCubeInformationAnalysisSuite));
      return window.BinaryCubeInformationAnalysisSuite;
    })();
    informationAnalysisPromise.catch(() => { informationAnalysisPromise = null; });
    return informationAnalysisPromise;
  }

  function loadCommunicationCapacityAnalyzer() {
    if (window.BinaryCubeCommunicationCapacityAnalyzer) return Promise.resolve(window.BinaryCubeCommunicationCapacityAnalyzer);
    if (communicationCapacityPromise) return communicationCapacityPromise;
    communicationCapacityPromise = (async () => {
      await loadCooperativeRunner();
      await loadStyle('binary-cube-communication-capacity-analyzer.css');
      await loadScript('binary-cube-communication-capacity-analyzer.js', () => Boolean(window.BinaryCubeCommunicationCapacityAnalyzer));
      return window.BinaryCubeCommunicationCapacityAnalyzer;
    })();
    communicationCapacityPromise.catch(() => { communicationCapacityPromise = null; });
    return communicationCapacityPromise;
  }

  function loadMediaForensicsSuite() {
    if (window.BinaryCubeMediaForensicsSuite) return Promise.resolve(window.BinaryCubeMediaForensicsSuite);
    if (mediaForensicsPromise) return mediaForensicsPromise;
    mediaForensicsPromise = (async () => {
      await loadCooperativeRunner();
      await loadStyle('binary-cube-media-forensics-suite.css');
      await loadScript('binary-cube-media-forensics-suite.js', () => Boolean(window.BinaryCubeMediaForensicsSuite));
      return window.BinaryCubeMediaForensicsSuite;
    })();
    mediaForensicsPromise.catch(() => { mediaForensicsPromise = null; });
    return mediaForensicsPromise;
  }

  function loadIsmLab() {
    if (window.InterstellarMediaCollisionsLab) return Promise.resolve(window.InterstellarMediaCollisionsLab);
    if (ismPromise) return ismPromise;
    ismPromise = (async () => {
      await loadCooperativeRunner();
      await loadScript('interstellar-media-collisions-lab.js', () => Boolean(window.InterstellarMediaCollisionsLab));
      return window.InterstellarMediaCollisionsLab;
    })();
    ismPromise.catch(() => { ismPromise = null; });
    return ismPromise;
  }

  function loadDoubleSlitLab() {
    if (window.DoubleSlitExperimentLab) return Promise.resolve(window.DoubleSlitExperimentLab);
    if (doubleSlitPromise) return doubleSlitPromise;
    doubleSlitPromise = (async () => {
      await loadCooperativeRunner();
      await loadScript('double-slit-lab.js', () => Boolean(window.DoubleSlitExperimentLab));
      return window.DoubleSlitExperimentLab;
    })();
    doubleSlitPromise.catch(() => { doubleSlitPromise = null; });
    return doubleSlitPromise;
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

  function openDecryptionDashboard(button = null, options = null) {
    return withLoadingButton(button, 'Loading Dashboard…', async () => {
      const api = await loadDecryptionDashboard();
      if (!api?.openPanel) throw new Error('The Binary Cube Decryption Dashboard loaded without an open-panel interface.');
      return api.openPanel(options || {});
    });
  }

  function openInformationAnalysisSuite(button = null, options = null) {
    return withLoadingButton(button, 'Loading Analysis Suite…', async () => {
      const api = await loadInformationAnalysisSuite();
      if (!api?.openPanel) throw new Error('The Information & Deobfuscation Analysis Suite loaded without an open-panel interface.');
      return api.openPanel(options || {});
    });
  }

  function openCommunicationCapacityAnalyzer(button = null, options = null) {
    return withLoadingButton(button, 'Loading Communication Analyzer…', async () => {
      const api = await loadCommunicationCapacityAnalyzer();
      if (!api?.openPanel) throw new Error('The Communication Capacity Analyzer loaded without an open-panel interface.');
      return api.openPanel(options || {});
    });
  }

  function openMediaForensicsSuite(button = null, options = null) {
    return withLoadingButton(button, 'Loading Media Forensics…', async () => {
      const api = await loadMediaForensicsSuite();
      if (!api?.openPanel) throw new Error('The Steganography, Signal & Media Forensics Suite loaded without an open-panel interface.');
      return api.openPanel(options || {});
    });
  }

  function openIsmSimulation(button = null) {
    return withLoadingButton(button, 'Loading Simulation…', async () => {
      const api = await loadIsmLab();
      if (!api?.openPanel) throw new Error('The ISM Media Simulation loaded without an open-panel interface.');
      return api.openPanel({ setting: 'scientific-tools' });
    });
  }

  function openDoubleSlitLab(button = null) {
    return withLoadingButton(button, 'Loading Experiment…', async () => {
      const api = await loadDoubleSlitLab();
      if (!api?.openPanel) throw new Error('The Double Slit Experiment Visualizer loaded without an open-panel interface.');
      return api.openPanel();
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
        <p>Setting-neutral experimental systems live here as shared runtimes. Long calculations are required to preserve deterministic operation order while yielding between bounded work slices so slower hardware can continue making progress without locking the page.</p>
      </div>
      <div class="scientific-tools-tabs no-print" role="tablist" aria-label="Scientific Tools systems">
        <button type="button" class="scientific-tools-tab active" data-scientific-tools-tab="binary-cube" role="tab" aria-selected="true">Binary Cube</button>
        <button type="button" class="scientific-tools-tab" data-scientific-tools-tab="decryption-dashboard" role="tab" aria-selected="false">Decryption Dashboard</button>
        <button type="button" class="scientific-tools-tab" data-scientific-tools-tab="ism-media-simulation" role="tab" aria-selected="false">ISM Media Simulation</button>
        <button type="button" class="scientific-tools-tab" data-scientific-tools-tab="double-slit" role="tab" aria-selected="false">Double Slit Experiment</button>
      </div>
      <section class="scientific-tools-panel no-print" data-scientific-tools-panel="binary-cube">
        <p class="eyebrow">Canonical encoding and traversal system</p>
        <h3>Binary Cube Laboratory and Encoder Visualizer</h3>
        <p>The accepted Shadowrun Binary Cube engine, authenticated transport support, and visualizer are the definitive implementation. Scientific Tools, Shadowrun, and Black Light Continuum all open this same browser runtime rather than maintaining setting-specific copies.</p>
        <div class="scientific-tools-actions">
          <button id="scientific-tools-open-binary-cube-visualizer" type="button" class="primary-action">Open Binary Cube Visualizer</button>
          <button id="scientific-tools-open-binary-cube-laboratory" type="button" class="secondary-action">Open Binary Cube Laboratory</button>
        </div>
        <div class="scientific-tools-runtime"><span><strong>Canonical engine:</strong> ShadowrunBinaryCubeEngine</span><span><strong>Shared scheduling contract:</strong> ScientificToolsCooperativeRunner loads before Scientific Tools runtimes</span><span><strong>Visualizer:</strong> one shared ShadowrunBinaryCubeVisualizer instance</span></div>
        <div class="scientific-tools-boundary"><strong>Runtime boundary:</strong> setting launchers may provide context or artifacts, but encoding, keys, masks, traces, ciphertext, validation, rendering, and authentication remain owned by the single canonical Binary Cube implementation.</div>
      </section>
      <section class="scientific-tools-panel no-print" data-scientific-tools-panel="decryption-dashboard" hidden>
        <p class="eyebrow">Binary Cube cryptanalysis, information recovery, steganography, and adversarial testing</p>
        <h3>Decryption Dashboard</h3>
        <p>Use the Cube-specific dashboard for direct Binary Cube attacks, the Information & Deobfuscation Suite for broad recovery work, the Communication Capacity Analyzer for information-theory tests, and the Steganography, Signal & Media Forensics Suite when hidden information may live in byte planes, pixels, audio samples, signal carriers, convolution residuals, or container structure.</p>
        <div class="scientific-tools-actions">
          <button id="scientific-tools-open-decryption-dashboard" type="button" class="primary-action">Open Decryption Dashboard</button>
          <button id="scientific-tools-open-information-analysis" type="button" class="secondary-action">Open Information & Deobfuscation Suite</button>
          <button id="scientific-tools-open-communication-capacity" type="button" class="secondary-action">Open Communication Capacity Analyzer</button>
          <button id="scientific-tools-open-media-forensics" type="button" class="secondary-action">Open Steganography, Signal & Media Forensics</button>
        </div>
        <div class="scientific-tools-runtime"><span><strong>Cube attack input:</strong> package/secure export, raw bits, hex, Base64, files, and comparative ciphertexts</span><span><strong>Information evidence:</strong> Shannon/min entropy, n-grams, runs, autocorrelation, mutual information, Maurer-style return-distance analysis, compression ratio, and sliding entropy</span><span><strong>1999 communication-capacity test:</strong> McCowan–Hanser–Doyle Zipf slope, zero/first/higher-order conditional entropy, entropy-order slope, lag mutual information, shuffled-surrogate comparisons, and sampling-sufficiency warnings across multiple symbolizations</span><span><strong>2002 compression test:</strong> Benedetto–Caglioti–Loreto relative-entropy and compression-distance comparisons against built-in or supplied reference corpora</span><span><strong>Steganography:</strong> arbitrary byte LSB/MSB planes, selected-bit packing, per-plane entropy/transitions, pair-equalization χ² clues, offsets/strides, decoded RGB/RGBA channel extraction, raster bit-plane previews, PCM sample and sample-delta bit planes</span><span><strong>Convolution and correlation:</strong> custom 1-D FIR and 2-D matrices plus identity, blur, Gaussian, sharpen, Laplacian, high-pass, Sobel, Prewitt, emboss, and cross-correlation tools</span><span><strong>Encoded audio:</strong> browser codec decoding, raw WAVE/PCM parsing, waveform statistics, FFT spectral peaks, Goertzel tone probes, DTMF, configurable binary FSK/AFSK, OOK/tone-envelope extraction, stereo difference and channel correlation</span><span><strong>Container forensics:</strong> RIFF/WAVE chunks, PNG chunks and post-IEND data, JPEG segment/EOI boundaries, ID3v2 boundaries, signatures and appended-payload carving</span><span><strong>De-obfuscation:</strong> recursive codec peeling, Base32/64/hex, escapes, Caesar/Atbash/ROT47, endian swaps, bit planes, interleaving, columnar/stride probes, delta/XOR transforms, and repeating-XOR inference</span><span><strong>Authority:</strong> supplied-key Binary Cube verification remains delegated to ShadowrunBinaryCubeEngine.decryptBinary</span></div>
        <div class="scientific-tools-boundary"><strong>Evidence boundary:</strong> a Zipf slope near −1, higher-order entropy structure, compression affinity, LSB equalization, convolution residuals, spectral peaks, decoded characters, language-likeness, and candidate scores are independent evidence signals. They can support recoverable, embedded, or communication-like organization, but none alone proves semantics, intelligence, intentional steganography, or successful decryption.</div>
      </section>
      <section class="scientific-tools-panel no-print" data-scientific-tools-panel="ism-media-simulation" hidden>
        <p class="eyebrow">Interstellar medium collision model</p>
        <h3>ISM Media Simulation</h3>
        <p>Cast phase-light vectors through literal 1:1 interstellar-medium particles, retain the physically bounded cosmological-constant term, resolve charged-proton magnetic response, optionally apply a separately labeled quantum-foam sensitivity model, retain the deterministic Shadow-key scattering operator, and collect all non-input cube faces concurrently.</p>
        <div class="scientific-tools-actions"><button id="scientific-tools-open-ism" type="button" class="primary-action">Open ISM Media Simulation</button></div>
        <div class="scientific-tools-boundary"><strong>Model boundary:</strong> physical and hypothesis layers remain explicitly separated. Computationally expensive stages must be resumable/cooperative rather than monopolizing the browser main thread.</div>
      </section>
      <section class="scientific-tools-panel no-print" data-scientific-tools-panel="double-slit" hidden>
        <p class="eyebrow">Quantum interference baseline and hypothesis framework</p>
        <h3>Double Slit Experiment Visualizer</h3>
        <p>Compare coherent-wave intensity, discrete quantum detections, and an explicitly separate classical comparator in an interactive 3D apparatus. Optional hypothesis layers remain isolated from the accepted baseline.</p>
        <div class="scientific-tools-actions"><button id="scientific-tools-open-double-slit" type="button" class="primary-action">Open Double Slit Experiment</button></div>
        <div class="scientific-tools-boundary"><strong>Execution boundary:</strong> distribution building, detector preparation, field sampling, and future higher-resolution propagation must advance in deterministic bounded chunks and visibly report progress instead of freezing the page.</div>
      </section>`;

    view.querySelectorAll('[data-scientific-tools-tab]').forEach(button => button.addEventListener('click', () => selectTab(button.dataset.scientificToolsTab)));
    view.querySelector('#scientific-tools-open-binary-cube-visualizer')?.addEventListener('click', event => void openBinaryCubeVisualizer(event.currentTarget));
    view.querySelector('#scientific-tools-open-binary-cube-laboratory')?.addEventListener('click', event => void openBinaryCubeLaboratory(event.currentTarget));
    view.querySelector('#scientific-tools-open-decryption-dashboard')?.addEventListener('click', event => void openDecryptionDashboard(event.currentTarget));
    view.querySelector('#scientific-tools-open-information-analysis')?.addEventListener('click', event => void openInformationAnalysisSuite(event.currentTarget));
    view.querySelector('#scientific-tools-open-communication-capacity')?.addEventListener('click', event => void openCommunicationCapacityAnalyzer(event.currentTarget));
    view.querySelector('#scientific-tools-open-media-forensics')?.addEventListener('click', event => void openMediaForensicsSuite(event.currentTarget));
    view.querySelector('#scientific-tools-open-ism')?.addEventListener('click', event => void openIsmSimulation(event.currentTarget));
    view.querySelector('#scientific-tools-open-double-slit')?.addEventListener('click', event => void openDoubleSlitLab(event.currentTarget));
    selectTab('binary-cube');
    return view;
  }

  function initialize() {
    injectStyle();
    void loadCooperativeRunner().catch(error => console.error('Scientific Tools cooperative runner could not be preloaded.', error));
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
    loadCooperativeRunner,
    loadBinaryCubeVisualizer,
    loadBinaryCubeLaboratory,
    loadDecryptionDashboard,
    loadInformationAnalysisSuite,
    loadCommunicationCapacityAnalyzer,
    loadMediaForensicsSuite,
    openBinaryCubeVisualizer,
    openBinaryCubeLaboratory,
    openDecryptionDashboard,
    openInformationAnalysisSuite,
    openCommunicationCapacityAnalyzer,
    openMediaForensicsSuite,
    loadIsmLab,
    openIsmSimulation,
    loadDoubleSlitLab,
    openDoubleSlitLab
  });
})();