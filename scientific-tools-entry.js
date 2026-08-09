(() => {
  'use strict';

  const VIEW_ID = 'scientific-tools';
  const ASSET_VERSION = '20260809-scientific-help-1';
  let cooperativeRunnerPromise = null;
  let helpSystemPromise = null;
  let ismPromise = null;
  let doubleSlitPromise = null;
  let cubeVisualizerPromise = null;
  let cubeLaboratoryPromise = null;
  let keyGenerationVisualizerPromise = null;
  let decryptionDashboardPromise = null;
  let cryptanalyticTestLabPromise = null;
  let informationAnalysisPromise = null;
  let communicationCapacityPromise = null;
  let mediaForensicsPromise = null;
  let mediaForensicsDemoCorpusPromise = null;
  let steganalysisLabPromise = null;
  let diagnosticPipelinePromise = null;
  let cubicDecryptorPromise = null;
  let signalsLaboratoryPromise = null;
  let liveSignalsLaboratoryPromise = null;
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

  function loadHelpSystem() {
    if (window.ScientificToolsHelp) return Promise.resolve(window.ScientificToolsHelp);
    if (helpSystemPromise) return helpSystemPromise;
    helpSystemPromise = (async () => {
      await loadStyle('scientific-tools-help.css');
      await loadScript('scientific-tools-help.js', () => Boolean(window.ScientificToolsHelp));
      return window.ScientificToolsHelp;
    })();
    helpSystemPromise.catch(() => { helpSystemPromise = null; });
    return helpSystemPromise;
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
    if (canonicalCubeEngineReady() && window.BinaryCubeVisualizerRenderer && window.ShadowrunBinaryCubeVisualizer) return Promise.resolve(window.ShadowrunBinaryCubeVisualizer);
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
    if (canonicalCubeEngineReady() && window.ShadowrunBinaryCubeAuth && window.ShadowrunBinaryCubeEncryption && window.ShadowrunBinaryCubeEditor && window.ShadowrunBinaryCubeAuthUI) return Promise.resolve(window.ShadowrunBinaryCubeEncryption);
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

  function loadKeyGenerationVisualizer() {
    if (window.BinaryCubeKeyGenerationResearch && window.BinaryCubeKeyGenerationVisualizer) return Promise.resolve(window.BinaryCubeKeyGenerationVisualizer);
    if (keyGenerationVisualizerPromise) return keyGenerationVisualizerPromise;
    keyGenerationVisualizerPromise = (async () => {
      await loadCooperativeRunner();
      await loadStyle('binary-cube-key-generation-visualizer.css');
      await loadScript('shadowrun-binary-cube-engine.js', canonicalCubeEngineReady);
      await loadScript('binary-cube-worker-client.js', () => Boolean(window.ShadowrunBinaryCubeWorkerClient));
      await loadScript('binary-cube-key-generation-research.js', () => Boolean(window.BinaryCubeKeyGenerationResearch));
      await loadScript('binary-cube-key-generation-visualizer.js', () => Boolean(window.BinaryCubeKeyGenerationVisualizer));
      return window.BinaryCubeKeyGenerationVisualizer;
    })();
    keyGenerationVisualizerPromise.catch(() => { keyGenerationVisualizerPromise = null; });
    return keyGenerationVisualizerPromise;
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

  function loadCryptanalyticTestLab() {
    if (window.BinaryCubeCryptanalyticTestLab) return Promise.resolve(window.BinaryCubeCryptanalyticTestLab);
    if (cryptanalyticTestLabPromise) return cryptanalyticTestLabPromise;
    cryptanalyticTestLabPromise = (async () => {
      await loadCooperativeRunner();
      await loadStyle('binary-cube-cryptanalytic-test-lab.css');
      await loadScript('shadowrun-binary-cube-engine.js', canonicalCubeEngineReady);
      await loadScript('binary-cube-cryptanalytic-test-lab.js', () => Boolean(window.BinaryCubeCryptanalyticTestLab));
      return window.BinaryCubeCryptanalyticTestLab;
    })();
    cryptanalyticTestLabPromise.catch(() => { cryptanalyticTestLabPromise = null; });
    return cryptanalyticTestLabPromise;
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

  function loadMediaForensicsDemoCorpus() {
    if (window.BinaryCubeMediaForensicsDemoCorpus) return Promise.resolve(window.BinaryCubeMediaForensicsDemoCorpus);
    if (mediaForensicsDemoCorpusPromise) return mediaForensicsDemoCorpusPromise;
    mediaForensicsDemoCorpusPromise = (async () => {
      await loadMediaForensicsSuite();
      await loadScript('binary-cube-media-forensics-demo-corpus.js', () => Boolean(window.BinaryCubeMediaForensicsDemoCorpus));
      return window.BinaryCubeMediaForensicsDemoCorpus;
    })();
    mediaForensicsDemoCorpusPromise.catch(() => { mediaForensicsDemoCorpusPromise = null; });
    return mediaForensicsDemoCorpusPromise;
  }

  function loadSteganalysisLab() {
    if (window.BinaryCubeSteganalysisLab) return Promise.resolve(window.BinaryCubeSteganalysisLab);
    if (steganalysisLabPromise) return steganalysisLabPromise;
    steganalysisLabPromise = (async () => {
      await loadCooperativeRunner();
      await loadMediaForensicsSuite();
      await loadStyle('binary-cube-steganalysis-lab.css');
      await loadScript('binary-cube-steganalysis-engine.js', () => Boolean(window.BinaryCubeSteganalysisEngine));
      await loadScript('binary-cube-steganalysis-lab.js', () => Boolean(window.BinaryCubeSteganalysisLab));
      return window.BinaryCubeSteganalysisLab;
    })();
    steganalysisLabPromise.catch(() => { steganalysisLabPromise = null; });
    return steganalysisLabPromise;
  }

  function loadDiagnosticPipeline() {
    if (window.BinaryCubeDiagnosticPipelinePanel) return Promise.resolve(window.BinaryCubeDiagnosticPipelinePanel);
    if (diagnosticPipelinePromise) return diagnosticPipelinePromise;
    diagnosticPipelinePromise = (async () => {
      await loadCooperativeRunner();
      await Promise.all([loadDecryptionDashboard(), loadInformationAnalysisSuite(), loadMediaForensicsSuite(), loadSteganalysisLab()]);
      await loadStyle('binary-cube-diagnostic-pipeline.css');
      await loadScript('binary-cube-key-generation-research.js', () => Boolean(window.BinaryCubeKeyGenerationResearch));
      await loadScript('binary-cube-cubic-decryptor-engine.js', () => Boolean(window.BinaryCubeCubicDecryptorEngine));
      await loadScript('binary-cube-steganalysis-evidence-profile.js', () => Boolean(window.BinaryCubeSteganalysisEvidenceProfile));
      await loadScript('binary-cube-steganalysis-worker-client.js', () => Boolean(window.BinaryCubeSteganalysisWorkerClient));
      await loadScript('binary-cube-diagnostic-calibration-registry.js', () => Boolean(window.BinaryCubeDiagnosticCalibrationRegistry));
      await loadScript('binary-cube-diagnostic-calibration-baseline.js', () => Boolean(window.BinaryCubeDiagnosticCalibrationBaseline));
      await loadScript('binary-cube-diagnostic-pipeline.js', () => Boolean(window.BinaryCubeDiagnosticPipeline));
      await loadScript('binary-cube-diagnostic-pipeline-panel.js', () => Boolean(window.BinaryCubeDiagnosticPipelinePanel));
      return window.BinaryCubeDiagnosticPipelinePanel;
    })();
    diagnosticPipelinePromise.catch(() => { diagnosticPipelinePromise = null; });
    return diagnosticPipelinePromise;
  }

  function loadCubicDecryptor() {
    if (window.BinaryCubeCubicDecryptor) return Promise.resolve(window.BinaryCubeCubicDecryptor);
    if (cubicDecryptorPromise) return cubicDecryptorPromise;
    cubicDecryptorPromise = (async () => {
      await loadCooperativeRunner();
      await Promise.all([loadDecryptionDashboard(), loadInformationAnalysisSuite(), loadMediaForensicsSuite()]);
      await loadStyle('binary-cube-cubic-decryptor.css');
      await loadScript('binary-cube-key-generation-research.js', () => Boolean(window.BinaryCubeKeyGenerationResearch));
      await loadScript('binary-cube-cubic-decryptor-engine.js', () => Boolean(window.BinaryCubeCubicDecryptorEngine));
      await loadScript('binary-cube-cubic-decryptor-worker-pool.js', () => Boolean(window.BinaryCubeCubicDecryptorWorkerPool));
      await loadScript('binary-cube-cubic-decryptor.js', () => Boolean(window.BinaryCubeCubicDecryptor));
      return window.BinaryCubeCubicDecryptor;
    })();
    cubicDecryptorPromise.catch(() => { cubicDecryptorPromise = null; });
    return cubicDecryptorPromise;
  }

  function loadSignalsLaboratory() {
    if (window.SignalsLaboratory) return Promise.resolve(window.SignalsLaboratory);
    if (signalsLaboratoryPromise) return signalsLaboratoryPromise;
    signalsLaboratoryPromise = (async () => {
      await loadCooperativeRunner();
      await loadStyle('signals-laboratory.css');
      await loadScript('signals-laboratory.js', () => Boolean(window.SignalsLaboratory));
      return window.SignalsLaboratory;
    })();
    signalsLaboratoryPromise.catch(() => { signalsLaboratoryPromise = null; });
    return signalsLaboratoryPromise;
  }

  function loadLiveSignalsLaboratory() {
    if (window.LiveSignalsLaboratory) return Promise.resolve(window.LiveSignalsLaboratory);
    if (liveSignalsLaboratoryPromise) return liveSignalsLaboratoryPromise;
    liveSignalsLaboratoryPromise = (async () => {
      await loadCooperativeRunner();
      await loadStyle('live-signals-laboratory.css');
      await loadScript('live-signals-laboratory.js', () => Boolean(window.LiveSignalsLaboratory));
      return window.LiveSignalsLaboratory;
    })();
    liveSignalsLaboratoryPromise.catch(() => { liveSignalsLaboratoryPromise = null; });
    return liveSignalsLaboratoryPromise;
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
    if (button) { button.disabled = true; button.setAttribute('aria-busy', 'true'); button.textContent = loadingLabel; }
    try { return await action(); }
    catch (error) { alert(error.message); return null; }
    finally { if (button) { button.disabled = false; button.removeAttribute('aria-busy'); button.textContent = original; } }
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
  function openKeyGenerationVisualizer(button = null, options = null) { return withLoadingButton(button, 'Loading Key Comparison…', async () => { const api = await loadKeyGenerationVisualizer(); if (!api?.openPanel) throw new Error('The Binary Cube Key Generation Structure Visualizer loaded without an open-panel interface.'); return api.openPanel(options || {}); }); }
  function openDecryptionDashboard(button = null, options = null) { return withLoadingButton(button, 'Loading Dashboard…', async () => { const api = await loadDecryptionDashboard(); if (!api?.openPanel) throw new Error('The Binary Cube Decryption Dashboard loaded without an open-panel interface.'); return api.openPanel(options || {}); }); }
  function openCryptanalyticTestLab(button = null, options = null) { return withLoadingButton(button, 'Loading Test Lab…', async () => { const api = await loadCryptanalyticTestLab(); if (!api?.openPanel) throw new Error('The Binary Cube Cryptanalytic Test Lab loaded without an open-panel interface.'); return api.openPanel(options || {}); }); }
  function openInformationAnalysisSuite(button = null, options = null) { return withLoadingButton(button, 'Loading Analysis Suite…', async () => { const api = await loadInformationAnalysisSuite(); if (!api?.openPanel) throw new Error('The Information & Deobfuscation Analysis Suite loaded without an open-panel interface.'); return api.openPanel(options || {}); }); }
  function openCommunicationCapacityAnalyzer(button = null, options = null) { return withLoadingButton(button, 'Loading Communication Analyzer…', async () => { const api = await loadCommunicationCapacityAnalyzer(); if (!api?.openPanel) throw new Error('The Communication Capacity Analyzer loaded without an open-panel interface.'); return api.openPanel(options || {}); }); }
  function openMediaForensicsSuite(button = null, options = null) { return withLoadingButton(button, 'Loading Media Forensics…', async () => { const api = await loadMediaForensicsSuite(); if (!api?.openPanel) throw new Error('The Steganography, Signal & Media Forensics Suite loaded without an open-panel interface.'); return api.openPanel(options || {}); }); }
  function openMediaForensicsDemoCorpus(button = null) { return withLoadingButton(button, 'Loading Demonstrations…', async () => { const api = await loadMediaForensicsDemoCorpus(); if (!api?.openPanel) throw new Error('The Steganography & Signal Demonstration Files loaded without an open-panel interface.'); return api.openPanel(); }); }
  function openSteganalysisLab(button = null, options = null) { return withLoadingButton(button, 'Loading Steganalysis…', async () => { const api = await loadSteganalysisLab(); if (!api?.openPanel) throw new Error('The Advanced Steganalysis Laboratory loaded without an open-panel interface.'); return api.openPanel(options || {}); }); }
  function openDiagnosticPipeline(button = null, options = null) { return withLoadingButton(button, 'Loading Diagnostic Pipeline…', async () => { const api = await loadDiagnosticPipeline(); if (!api?.openPanel) throw new Error('The Diagnostic Evaluation Pipeline loaded without an open-panel interface.'); return api.openPanel(options || {}); }); }
  function openCubicDecryptor(button = null, options = null) { return withLoadingButton(button, 'Loading Cubic Decryptor…', async () => { const api = await loadCubicDecryptor(); if (!api?.openPanel) throw new Error('The Cubic Decryptor Tool loaded without an open-panel interface.'); return api.openPanel(options || {}); }); }
  function openSignalsLaboratory(button = null, options = null) { return withLoadingButton(button, 'Loading Simulation Laboratory…', async () => { const api = await loadSignalsLaboratory(); if (!api?.openPanel) throw new Error('The Signals Simulation Laboratory loaded without an open-panel interface.'); return api.openPanel(options || {}); }); }
  function openLiveSignalsLaboratory(button = null, options = null) { return withLoadingButton(button, 'Loading Live Laboratory…', async () => { const api = await loadLiveSignalsLaboratory(); if (!api?.openPanel) throw new Error('The Live Signals Laboratory loaded without an open-panel interface.'); return api.openPanel(options || {}); }); }
  function openIsmSimulation(button = null) { return withLoadingButton(button, 'Loading Simulation…', async () => { const api = await loadIsmLab(); if (!api?.openPanel) throw new Error('The ISM Media Simulation loaded without an open-panel interface.'); return api.openPanel({ setting: 'scientific-tools' }); }); }
  function openDoubleSlitLab(button = null) { return withLoadingButton(button, 'Loading Experiment…', async () => { const api = await loadDoubleSlitLab(); if (!api?.openPanel) throw new Error('The Double Slit Experiment Visualizer loaded without an open-panel interface.'); return api.openPanel(); }); }

  function selectTab(tabId) {
    document.querySelectorAll('#scientific-tools [data-scientific-tools-tab]').forEach(button => { const active = button.dataset.scientificToolsTab === tabId; button.classList.toggle('active', active); button.setAttribute('aria-selected', active ? 'true' : 'false'); });
    document.querySelectorAll('#scientific-tools [data-scientific-tools-panel]').forEach(panel => { panel.hidden = panel.dataset.scientificToolsPanel !== tabId; });
  }

  function buildWorkspace() {
    const view = document.getElementById(VIEW_ID);
    if (!view) return null;
    view.setAttribute('aria-labelledby', 'scientific-tools-title');
    view.innerHTML = `
      <div class="hero-card no-print"><p class="eyebrow">Scientific Tools</p><h2 id="scientific-tools-title">Scientific Simulation Workspace</h2><p>Setting-neutral experimental systems live here as shared runtimes. Long calculations are required to preserve deterministic operation order while yielding between bounded work slices so slower hardware can continue making progress without locking the page.</p></div>
      <div class="scientific-tools-tabs no-print" role="tablist" aria-label="Scientific Tools systems">
        <button type="button" class="scientific-tools-tab active" data-scientific-tools-tab="binary-cube" role="tab" aria-selected="true">Binary Cube</button>
        <button type="button" class="scientific-tools-tab" data-scientific-tools-tab="decryption-dashboard" role="tab" aria-selected="false">Decryption Dashboard</button>
        <button type="button" class="scientific-tools-tab" data-scientific-tools-tab="signals-laboratory" role="tab" aria-selected="false">Signals Laboratory</button>
        <button type="button" class="scientific-tools-tab" data-scientific-tools-tab="ism-media-simulation" role="tab" aria-selected="false">ISM Media Simulation</button>
        <button type="button" class="scientific-tools-tab" data-scientific-tools-tab="double-slit" role="tab" aria-selected="false">Double Slit Experiment</button>
      </div>
      <section class="scientific-tools-panel no-print" data-scientific-tools-panel="binary-cube">
        <p class="eyebrow">Canonical encoding and traversal system</p><h3>Binary Cube Laboratory and Encoder Visualizer</h3><p>The accepted Shadowrun Binary Cube engine, authenticated transport support, and visualizer are the definitive implementation. Scientific Tools, Shadowrun, and Black Light Continuum all open this same browser runtime rather than maintaining setting-specific copies.</p>
        <div class="scientific-tools-actions"><button id="scientific-tools-open-binary-cube-visualizer" type="button" class="primary-action">Open Binary Cube Visualizer</button><button id="scientific-tools-open-binary-cube-laboratory" type="button" class="secondary-action">Open Binary Cube Laboratory</button><button id="scientific-tools-open-key-generation-visualizer" type="button" class="secondary-action">Compare Key Generators in 3D</button></div>
        <div class="scientific-tools-runtime"><span><strong>Canonical engine:</strong> ShadowrunBinaryCubeEngine</span><span><strong>Shared scheduling contract:</strong> ScientificToolsCooperativeRunner loads before Scientific Tools runtimes</span><span><strong>Visualizer:</strong> one shared ShadowrunBinaryCubeVisualizer instance</span><span><strong>Generation research:</strong> same-seed 3D point-field snapshots compare direct, iterative, global/local walk, and nested candidate procedures without promoting them into the production key format</span></div>
        <div class="scientific-tools-boundary"><strong>Runtime boundary:</strong> setting launchers may provide context or artifacts, but encoding, keys, masks, traces, ciphertext, validation, rendering, and authentication remain owned by the single canonical Binary Cube implementation. Key-generation research treats adjacency as one diagnostic rather than an automatic failure and separately measures axis leakage, regional predictability, fixed-position concentration, displacement, and 3D point-field structure.</div>
      </section>
      <section class="scientific-tools-panel no-print" data-scientific-tools-panel="decryption-dashboard" hidden>
        <p class="eyebrow">Binary Cube cryptanalysis, information recovery, steganography, and adversarial testing</p><h3>Decryption Dashboard</h3><p>Start with the Diagnostic Evaluation Pipeline when the file type or concealment method is not yet known. It classifies the asset, routes applicable specialist detectors automatically, runs independent methods concurrently inside deterministic stages, and preserves an evidence ledger. The manual workbenches remain available for direct follow-up and controlled experiments.</p>
        <div class="scientific-tools-actions"><button id="scientific-tools-open-diagnostic-pipeline" type="button" class="primary-action">Run Diagnostic Evaluation Pipeline</button><button id="scientific-tools-open-decryption-dashboard" type="button" class="secondary-action">Open Decryption Dashboard</button><button id="scientific-tools-open-cubic-decryptor" type="button" class="secondary-action">Open Cubic Decryptor Tool</button><button id="scientific-tools-open-cryptanalytic-test-lab" type="button" class="secondary-action">Open Cryptanalytic Test Lab</button><button id="scientific-tools-open-information-analysis" type="button" class="secondary-action">Open Information & Deobfuscation Suite</button><button id="scientific-tools-open-communication-capacity" type="button" class="secondary-action">Open Communication Capacity Analyzer</button><button id="scientific-tools-open-media-forensics" type="button" class="secondary-action">Open Steganography, Signal & Media Forensics</button><button id="scientific-tools-open-steganalysis" type="button" class="secondary-action">Open Advanced Steganalysis Laboratory</button><button id="scientific-tools-open-media-forensics-demos" type="button" class="secondary-action">Open Steganography & Signal Demonstrations</button></div>
        <div class="scientific-tools-runtime"><span><strong>Automatic routed evaluation:</strong> file classification → broad information/media baselines → type-specific steganalysis or Binary Cube diagnostics → deep reversible/cryptanalytic search according to Triage, Thorough, or Exhaustive depth</span><span><strong>Measured calibration:</strong> detector priors are adjusted only through a versioned, corpus-bounded calibration registry. The first measured baseline intentionally retains the RGB-LSB false negative rather than inflating detector certainty.</span><span><strong>Top-line evidence indices:</strong> Asset Presence, Certainty, Coverage, and Undetected / Miss-Risk remain separate normalized evidence indices rather than an opaque probability claim</span><span><strong>Concurrent execution:</strong> stage ordering is deterministic while independent detectors inside a stage may proceed concurrently; specialist workers and the cooperative scheduler retain responsibility for expensive inner loops</span><span><strong>Local execution:</strong> <code>node scripts/run-scientific-diagnostic-local.mjs &lt;file&gt; --profile=thorough</code> runs the same routing/report contract without the hosted browser UI</span><span><strong>Cube attack input:</strong> package/secure export, raw bits, hex, Base64, files, and comparative ciphertexts</span><span><strong>Cubic decryptor:</strong> deterministic staged brute-force search moves from the smallest compatible direct-permutation cubes through iterative-chain, global transposition-walk, nested-permutation, and nested-interleaved key generators, with metadata-constrained package search, raw framing expansion, reproducible seed templates, worker execution, pause/resume checkpoints, full-candidate recovery, and specialist handoff</span><span><strong>Controlled cryptanalysis:</strong> avalanche/diffusion, single-bit differential probes, known plaintext, chosen plaintext, key-difference sensitivity, traversal inference, affine-equivalence/collapse tests, and projection permutation/cycle analysis</span><span><strong>Information evidence:</strong> Shannon/min entropy, n-grams, runs, autocorrelation, mutual information, Maurer-style return-distance analysis, compression ratio, and sliding entropy</span><span><strong>1999 communication-capacity test:</strong> McCowan–Hanser–Doyle Zipf slope, zero/first/higher-order conditional entropy, entropy-order slope, lag mutual information, shuffled-surrogate comparisons, and sampling-sufficiency warnings across multiple symbolizations</span><span><strong>2002 compression test:</strong> Benedetto–Caglioti–Loreto relative-entropy and compression-distance comparisons against built-in or supplied reference corpora</span><span><strong>Steganography extraction:</strong> arbitrary byte LSB/MSB planes, selected-bit packing, per-plane entropy/transitions, pair-equalization χ² clues, offsets/strides, decoded RGB/RGBA channel extraction, raster bit-plane previews, PCM sample and sample-delta bit planes</span><span><strong>Quantitative steganalysis:</strong> RS regular/singular groups, Sample Pair Analysis payload estimation, localized tiled detector maps, residual co-occurrence features, exact known-cover modification maps, bit-plane Hamming counts, MSE/PSNR/SSIM, baseline JPEG quantized-DCT populations, PNG/JPEG metadata structure, Unicode hiding diagnostics, batch corpus comparison, ROC AUC, TPR/FPR, balanced accuracy, MCC, F1, payload-estimation MAE/RMSE, and recovered-bit error metrics</span><span><strong>Convolution and correlation:</strong> custom 1-D FIR and 2-D matrices plus identity, blur, Gaussian, sharpen, Laplacian, high-pass, Sobel, Prewitt, emboss, and cross-correlation tools</span><span><strong>Spectral analysis:</strong> FFT spectral peaks, Goertzel tone probes, DTMF, configurable binary FSK/AFSK, OOK/tone-envelope extraction, stereo difference and channel correlation</span><span><strong>Container forensics:</strong> RIFF/WAVE chunks, PNG chunks and post-IEND data, JPEG segment/EOI boundaries, ID3v2 boundaries, signatures and appended-payload carving</span><span><strong>Known-ground-truth demonstrations:</strong> clean PNG control, RGB-LSB positive control, post-IEND trailing PNG, 1200/2200 Hz AFSK WAV, and DTMF WAV can be previewed, saved, and opened with the matching forensic controls preselected</span><span><strong>De-obfuscation:</strong> recursive codec peeling, Base32/64/hex, escapes, Caesar/Atbash/ROT47, endian swaps, bit planes, interleaving, columnar/stride probes, delta/XOR transforms, and repeating-XOR inference</span><span><strong>Authority:</strong> the routing pipeline delegates to existing specialist modules; encryption/decryption controls remain delegated to ShadowrunBinaryCubeEngine and no analysis orchestrator replaces the canonical implementations</span></div>
        <div class="scientific-tools-boundary"><strong>Evidence boundary:</strong> absence of positive evidence is not evidence of absence. Asset Presence, Certainty, Coverage, and Miss-Risk are evidence indices, not posterior probabilities. Calibration measurements describe only the tested corpus and sparse controls are shrunk toward declared priors. No single signal proves semantics, intelligence, intentional steganography, successful decryption, or general cryptographic security.</div>
      </section>
      <section class="scientific-tools-panel no-print" data-scientific-tools-panel="signals-laboratory" hidden><p class="eyebrow">Radio-frequency and electromagnetic research suite</p><h3>Signals Laboratory</h3><p>The Signals suite now separates model-based experimentation from empirical hardware telemetry. Use the Simulation Laboratory for controlled propagation, antenna, material, interfrequency and resolution experiments; use the Live Signals Laboratory for passive mobile/router telemetry, hardware capability discovery, repeatability studies and later simulation correlation.</p><div class="scientific-tools-actions"><button id="scientific-tools-open-signals-laboratory" type="button" class="primary-action">Open Simulation Laboratory</button><button id="scientific-tools-open-live-signals-laboratory" type="button" class="secondary-action">Open Live Signals Laboratory</button></div><div class="scientific-tools-runtime"><span><strong>Simulation laboratory:</strong> controlled RF propagation, tunable antenna response, material-aware environments, adaptive mapping, interfrequency experiments and 3D demonstrations</span><span><strong>Live laboratory:</strong> receive-only Wi-Fi/BLE/cellular/router/ranging telemetry with mobile sensor context, capability matrices, thermal/battery guards and experimental refinement procedures</span><span><strong>Mobile scope:</strong> Android can expose Wi-Fi scan, BLE, cellular and device-sensor telemetry subject to permissions/platform limits; iOS capabilities are narrower and are reported as such rather than emulated</span><span><strong>Router scope:</strong> read-only radio, station, survey and conditional per-chain antenna telemetry when the router/chipset/driver actually exposes it</span><span><strong>Evidence separation:</strong> simulation-model-output and empirical-platform-telemetry remain distinct records until an explicit correlation experiment compares them</span></div><div class="scientific-tools-boundary"><strong>Hardware boundary:</strong> Live Signals is receive-only by design. It exposes no TX-power, channel, modulation, antenna-chain selection, packet-injection, deauthentication or continuous-transmit control. Platform throttling, permissions, thermal state, battery state, telemetry age and sensor availability are part of the experiment instead of obstacles to bypass.</div></section>
      <section class="scientific-tools-panel no-print" data-scientific-tools-panel="ism-media-simulation" hidden><p class="eyebrow">Interstellar medium collision model</p><h3>ISM Media Simulation</h3><p>Cast phase-light vectors through literal 1:1 interstellar-medium particles, retain the physically bounded cosmological-constant term, resolve charged-proton magnetic response, optionally apply a separately labeled quantum-foam sensitivity model, retain the deterministic Shadow-key scattering operator, and collect all non-input cube faces concurrently.</p><div class="scientific-tools-actions"><button id="scientific-tools-open-ism" type="button" class="primary-action">Open ISM Media Simulation</button></div><div class="scientific-tools-boundary"><strong>Model boundary:</strong> physical and hypothesis layers remain explicitly separated. Computationally expensive stages must be resumable/cooperative rather than monopolizing the browser main thread.</div></section>
      <section class="scientific-tools-panel no-print" data-scientific-tools-panel="double-slit" hidden><p class="eyebrow">Quantum interference baseline and hypothesis framework</p><h3>Double Slit Experiment Visualizer</h3><p>Compare coherent-wave intensity, discrete quantum detections, and an explicitly separate classical comparator in an interactive 3D apparatus. Optional hypothesis layers remain isolated from the accepted baseline.</p><div class="scientific-tools-actions"><button id="scientific-tools-open-double-slit" type="button" class="primary-action">Open Double Slit Experiment</button></div><div class="scientific-tools-boundary"><strong>Execution boundary:</strong> distribution building, detector preparation, field sampling, and future higher-resolution propagation must advance in deterministic bounded chunks and visibly report progress instead of freezing the page.</div></section>`;

    view.querySelectorAll('[data-scientific-tools-tab]').forEach(button => button.addEventListener('click', () => selectTab(button.dataset.scientificToolsTab)));
    view.querySelector('#scientific-tools-open-binary-cube-visualizer')?.addEventListener('click', event => void openBinaryCubeVisualizer(event.currentTarget));
    view.querySelector('#scientific-tools-open-binary-cube-laboratory')?.addEventListener('click', event => void openBinaryCubeLaboratory(event.currentTarget));
    view.querySelector('#scientific-tools-open-key-generation-visualizer')?.addEventListener('click', event => void openKeyGenerationVisualizer(event.currentTarget));
    view.querySelector('#scientific-tools-open-diagnostic-pipeline')?.addEventListener('click', event => void openDiagnosticPipeline(event.currentTarget));
    view.querySelector('#scientific-tools-open-decryption-dashboard')?.addEventListener('click', event => void openDecryptionDashboard(event.currentTarget));
    view.querySelector('#scientific-tools-open-cubic-decryptor')?.addEventListener('click', event => void openCubicDecryptor(event.currentTarget));
    view.querySelector('#scientific-tools-open-cryptanalytic-test-lab')?.addEventListener('click', event => void openCryptanalyticTestLab(event.currentTarget));
    view.querySelector('#scientific-tools-open-information-analysis')?.addEventListener('click', event => void openInformationAnalysisSuite(event.currentTarget));
    view.querySelector('#scientific-tools-open-communication-capacity')?.addEventListener('click', event => void openCommunicationCapacityAnalyzer(event.currentTarget));
    view.querySelector('#scientific-tools-open-media-forensics')?.addEventListener('click', event => void openMediaForensicsSuite(event.currentTarget));
    view.querySelector('#scientific-tools-open-steganalysis')?.addEventListener('click', event => void openSteganalysisLab(event.currentTarget));
    view.querySelector('#scientific-tools-open-media-forensics-demos')?.addEventListener('click', event => void openMediaForensicsDemoCorpus(event.currentTarget));
    view.querySelector('#scientific-tools-open-signals-laboratory')?.addEventListener('click', event => void openSignalsLaboratory(event.currentTarget));
    view.querySelector('#scientific-tools-open-live-signals-laboratory')?.addEventListener('click', event => void openLiveSignalsLaboratory(event.currentTarget));
    view.querySelector('#scientific-tools-open-ism')?.addEventListener('click', event => void openIsmSimulation(event.currentTarget));
    view.querySelector('#scientific-tools-open-double-slit')?.addEventListener('click', event => void openDoubleSlitLab(event.currentTarget));
    selectTab('binary-cube');
    return view;
  }

  function initialize() {
    injectStyle();
    void Promise.all([loadCooperativeRunner(), loadHelpSystem()]).catch(error => console.error('Scientific Tools shared runtime could not be preloaded.', error));
    if (!initialized) { buildWorkspace(); initialized = true; }
    return document.getElementById(VIEW_ID);
  }

  initialize();
  window.ScientificToolsWorkspace = Object.freeze({
    initialize, selectTab, loadCooperativeRunner, loadHelpSystem, loadBinaryCubeVisualizer, loadBinaryCubeLaboratory, loadKeyGenerationVisualizer, loadDecryptionDashboard, loadCryptanalyticTestLab, loadInformationAnalysisSuite, loadCommunicationCapacityAnalyzer, loadMediaForensicsSuite, loadMediaForensicsDemoCorpus, loadSteganalysisLab, loadDiagnosticPipeline, loadCubicDecryptor, loadSignalsLaboratory, loadLiveSignalsLaboratory, openBinaryCubeVisualizer, openBinaryCubeLaboratory, openKeyGenerationVisualizer, openDiagnosticPipeline, openDecryptionDashboard, openCubicDecryptor, openCryptanalyticTestLab, openInformationAnalysisSuite, openCommunicationCapacityAnalyzer, openMediaForensicsSuite, openMediaForensicsDemoCorpus, openSteganalysisLab, openSignalsLaboratory, openLiveSignalsLaboratory, loadIsmLab, openIsmSimulation, loadDoubleSlitLab, openDoubleSlitLab
  });
})();
