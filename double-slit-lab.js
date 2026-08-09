(() => {
  'use strict';

  const PANEL_ID = 'double-slit-lab';
  const STYLE_ID = 'double-slit-lab-style';
  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';
  const ORBIT_CONTROLS_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
  const C = 299792458;
  const H = 6.62607015e-34;
  const ELECTRON_MASS = 9.1093837139e-31;
  const EV_TO_JOULE = 1.602176634e-19;
  const TWO_PI = Math.PI * 2;
  const MAX_ACTIVE_EVENT_VISUALS = 64;
  const DISTRIBUTION_CHUNK = 64;
  const DETECTOR_COLUMN_CHUNK = 16;
  const FIELD_SAMPLE_CHUNK = 128;

  let panel = null;
  let viewportState = null;
  let animationRaf = 0;
  let simulationState = null;
  let experimentSeedRevision = 0;
  let refreshToken = null;
  let refreshTimer = 0;
  let uiRefreshTimer = 0;
  const scriptPromises = new Map();
  const hypothesisLayers = new Map();

  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

  function runner() {
    const api = window.ScientificToolsCooperativeRunner;
    if (!api) throw new Error('Scientific Tools cooperative runner must load before the Double Slit laboratory.');
    return api;
  }

  function isCancellation(error) {
    return error?.name === 'CooperativeCancelledError';
  }

  function hash32(text) {
    let hash = 2166136261 >>> 0;
    const source = String(text ?? '');
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function rngFrom(text) {
    let state = hash32(text) || 0x9e3779b9;
    return () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
  }

  function gaussian(random) {
    const first = Math.max(Number.MIN_VALUE, random());
    const second = random();
    return Math.sqrt(-2 * Math.log(first)) * Math.cos(TWO_PI * second);
  }

  function sinc(value) {
    return Math.abs(value) < 1e-10 ? 1 : Math.sin(value) / value;
  }

  function formatScientific(value, digits = 3) {
    if (!Number.isFinite(value)) return '—';
    if (value === 0) return '0';
    return value.toExponential(digits);
  }

  function formatLength(meters) {
    const absolute = Math.abs(meters);
    if (!Number.isFinite(meters)) return '—';
    if (absolute >= 1) return `${meters.toFixed(4)} m`;
    if (absolute >= 1e-3) return `${(meters * 1e3).toFixed(3)} mm`;
    if (absolute >= 1e-6) return `${(meters * 1e6).toFixed(3)} μm`;
    if (absolute >= 1e-9) return `${(meters * 1e9).toFixed(3)} nm`;
    if (absolute >= 1e-12) return `${(meters * 1e12).toFixed(3)} pm`;
    return `${meters.toExponential(3)} m`;
  }

  function normalizedScriptUrl(value) {
    return new URL(String(value || ''), document.baseURI).href;
  }

  function loadExternalScript(src) {
    const resolved = normalizedScriptUrl(src);
    if (scriptPromises.has(resolved)) return scriptPromises.get(resolved);
    const existing = [...document.scripts].find(script => script.src === resolved);
    if (existing?.dataset.dslLoaded === 'true') return Promise.resolve();
    const promise = new Promise((resolve, reject) => {
      const script = existing || document.createElement('script');
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        script.dataset.dslLoaded = 'true';
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
        script.crossOrigin = 'anonymous';
        script.dataset.dslAsset = 'true';
        document.head.appendChild(script);
      } else if (window.THREE) finish();
    });
    scriptPromises.set(resolved, promise);
    promise.catch(() => scriptPromises.delete(resolved));
    return promise;
  }

  async function ensureThree() {
    if (!window.THREE) await loadExternalScript(THREE_URL);
    if (!window.THREE?.OrbitControls) await loadExternalScript(ORBIT_CONTROLS_URL);
    if (!window.THREE?.OrbitControls) throw new Error('Three-dimensional double-slit viewport controls could not be loaded.');
    return window.THREE;
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = 'double-slit-lab.css?v=20260809-cooperative-science-1';
    document.head.appendChild(link);
  }

  function registerBuiltInHypotheses() {
    if (hypothesisLayers.size) return;
    hypothesisLayers.set('none', Object.freeze({
      id: 'none',
      label: 'None · accepted baseline only',
      description: 'No hypothesis layer modifies the baseline distribution.',
      modifyIntensity: null
    }));
    hypothesisLayers.set('detector-response', Object.freeze({
      id: 'detector-response',
      label: 'Detector response nonlinearity · apparatus test',
      description: 'Raises normalized detector response to an adjustable exponent. This tests an instrument-response hypothesis, not a new quantum force.',
      modifyIntensity: ({ baseline, config }) => Math.pow(Math.max(0, baseline), Math.max(0.2, config.detectorExponent))
    }));
  }

  function updateHypothesisSelect() {
    const select = document.getElementById('dsl-hypothesis');
    if (!select) return;
    const previous = select.value;
    select.innerHTML = [...hypothesisLayers.values()]
      .map(layer => `<option value="${esc(layer.id)}">${esc(layer.label)}</option>`)
      .join('');
    select.value = hypothesisLayers.has(previous) ? previous : 'none';
  }

  function buildPanel() {
    if (document.getElementById(PANEL_ID)) return document.getElementById(PANEL_ID);
    registerBuiltInHypotheses();
    panel = document.createElement('section');
    panel.id = PANEL_ID;
    panel.className = 'dsl-shell';
    panel.hidden = true;
    panel.setAttribute('aria-labelledby', 'dsl-title');
    panel.innerHTML = `
      <div class="dsl-backdrop" data-dsl-close></div>
      <div class="dsl-panel" role="dialog" aria-modal="true" aria-labelledby="dsl-title">
        <header class="dsl-header">
          <div>
            <p class="dsl-eyebrow">Scientific Tools · Quantum Interference</p>
            <h2 id="dsl-title">Double Slit Experiment Visualizer</h2>
            <p class="dsl-subtitle">Interactive three-dimensional comparison of classical geometric particles, coherent wave interference, and single-event quantum accumulation. Expensive setup work is performed in deterministic bounded slices so slow hardware keeps responding.</p>
          </div>
          <button type="button" class="dsl-close" data-dsl-close aria-label="Close Double Slit Experiment Visualizer">×</button>
        </header>

        <div class="dsl-layout">
          <aside class="dsl-controls">
            <label>Experiment mode
              <select id="dsl-mode">
                <option value="quantum" selected>Single-event quantum accumulation</option>
                <option value="wave">Continuous wave intensity</option>
                <option value="classical">Classical geometric particle comparator</option>
              </select>
            </label>

            <div class="dsl-control-group">
              <p class="dsl-control-group-title">Source</p>
              <label>Source model
                <select id="dsl-source-type">
                  <option value="photon" selected>Photon wavelength</option>
                  <option value="electron">Electron de Broglie wavelength</option>
                  <option value="matter">Generic matter-wave wavelength</option>
                </select>
              </label>
              <label>Photon wavelength <output id="dsl-photon-wavelength-value">650 nm</output>
                <input id="dsl-photon-wavelength" type="range" min="380" max="780" step="1" value="650">
              </label>
              <label>Electron kinetic energy <output id="dsl-electron-energy-value">150 eV</output>
                <input id="dsl-electron-energy" type="range" min="10" max="2000" step="10" value="150">
              </label>
              <label>Generic matter-wave wavelength <output id="dsl-matter-wavelength-value">100 pm</output>
                <input id="dsl-matter-wavelength" type="range" min="1" max="1000" step="1" value="100">
              </label>
              <label>Experiment seed
                <input id="dsl-seed" type="text" value="double-slit-01" autocomplete="off">
              </label>
            </div>

            <div class="dsl-control-group">
              <p class="dsl-control-group-title">Slit geometry</p>
              <label>Slit width <output id="dsl-slit-width-value">20 μm</output>
                <input id="dsl-slit-width" type="range" min="2" max="100" step="1" value="20">
              </label>
              <label>Slit center separation <output id="dsl-slit-separation-value">80 μm</output>
                <input id="dsl-slit-separation" type="range" min="20" max="500" step="1" value="80">
              </label>
              <label>Screen distance <output id="dsl-screen-distance-value">1.50 m</output>
                <input id="dsl-screen-distance" type="range" min="0.1" max="5" step="0.05" value="1.5">
              </label>
              <label>Detector width <output id="dsl-screen-width-value">40 mm</output>
                <input id="dsl-screen-width" type="range" min="5" max="120" step="1" value="40">
              </label>
            </div>

            <div class="dsl-control-group">
              <p class="dsl-control-group-title">Coherence and path information</p>
              <label>Source coherence <output id="dsl-coherence-value">100%</output>
                <input id="dsl-coherence" type="range" min="0" max="100" step="1" value="100">
              </label>
              <label>Relative slit phase <output id="dsl-phase-value">0°</output>
                <input id="dsl-phase" type="range" min="-180" max="180" step="1" value="0">
              </label>
              <label class="dsl-check"><input id="dsl-which-path" type="checkbox"> Which-path information available</label>
              <label class="dsl-check"><input id="dsl-show-expected" type="checkbox" checked> Show expected distribution behind accumulated hits</label>
              <label class="dsl-check"><input id="dsl-show-field" type="checkbox" checked> Show probability-amplitude field slice</label>
            </div>

            <div class="dsl-control-group">
              <p class="dsl-control-group-title">Hypothesis / apparatus layer</p>
              <label>Optional layer
                <select id="dsl-hypothesis"></select>
              </label>
              <label>Detector response exponent <output id="dsl-detector-exponent-value">1.00</output>
                <input id="dsl-detector-exponent" type="range" min="0.2" max="3" step="0.05" value="1">
              </label>
              <p class="dsl-note" id="dsl-hypothesis-note">No hypothesis layer modifies the baseline distribution.</p>
            </div>

            <div class="dsl-control-group">
              <p class="dsl-control-group-title">Playback</p>
              <label>Emission rate <output id="dsl-rate-value">24 events/s</output>
                <input id="dsl-rate" type="range" min="1" max="120" step="1" value="24">
              </label>
              <div class="dsl-action-row">
                <button id="dsl-run" type="button" class="dsl-primary">Run</button>
                <button id="dsl-step" type="button">Emit one</button>
                <button id="dsl-reset" type="button">Reset</button>
              </div>
            </div>

            <p class="dsl-note"><strong>Execution rule:</strong> model resolution changes how long setup takes, not whether the page remains usable. Distribution, detector, and field sampling preserve fixed index order and yield between bounded chunks. Quantum mode samples discrete detector events from the same baseline probability distribution and does not invent a definite post-barrier trajectory.</p>
          </aside>

          <main class="dsl-stage">
            <div id="dsl-metrics" class="dsl-metrics"></div>
            <div class="dsl-viewport-wrap">
              <div class="dsl-toolbar">
                <span>Drag: orbit · Wheel: zoom · Right-drag: pan</span>
                <button id="dsl-view-front" type="button">Front</button>
                <button id="dsl-view-top" type="button">Top</button>
                <button id="dsl-view-side" type="button">Side</button>
                <button id="dsl-reset-view" type="button">Reset view</button>
                <button id="dsl-auto-orbit" type="button" aria-pressed="false">Auto orbit</button>
              </div>
              <div id="dsl-viewport" class="dsl-viewport" role="img" aria-label="Interactive three-dimensional double slit experiment"></div>
              <div class="dsl-legend"><span>● source / event pulse</span><span>▥ slit barrier</span><span>▦ detector</span><span>⋯ probability-amplitude field slice</span></div>
            </div>

            <section class="dsl-output-section">
              <div class="dsl-output-heading">
                <div><p class="dsl-eyebrow">Detector cross-section</p><h3>Expected and accumulated distribution</h3></div>
                <p>The horizontal detector coordinate is physical. The 3D apparatus is visually rescaled so micrometer slit geometry remains inspectable beside meter-scale propagation.</p>
              </div>
              <canvas id="dsl-chart" class="dsl-chart" width="960" height="240"></canvas>
              <div id="dsl-status" class="dsl-status"></div>
            </section>
          </main>
        </div>
      </div>`;
    document.body.appendChild(panel);
    updateHypothesisSelect();
    wirePanelEvents();
    return panel;
  }

  function bindRangeOutput(inputId, outputId, formatter) {
    const input = document.getElementById(inputId);
    const output = document.getElementById(outputId);
    input?.addEventListener('input', event => {
      if (output) output.textContent = formatter(Number(event.target.value));
    });
  }

  function requestRefresh() {
    void refreshExperiment().catch(error => {
      if (!isCancellation(error)) console.error('Double Slit experiment refresh failed.', error);
    });
  }

  function scheduleRefresh() {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(requestRefresh, 45);
  }

  function wirePanelEvents() {
    panel.querySelectorAll('[data-dsl-close]').forEach(button => button.addEventListener('click', closePanel));
    bindRangeOutput('dsl-photon-wavelength', 'dsl-photon-wavelength-value', value => `${value.toFixed(0)} nm`);
    bindRangeOutput('dsl-electron-energy', 'dsl-electron-energy-value', value => `${value.toFixed(0)} eV`);
    bindRangeOutput('dsl-matter-wavelength', 'dsl-matter-wavelength-value', value => `${value.toFixed(0)} pm`);
    bindRangeOutput('dsl-slit-width', 'dsl-slit-width-value', value => `${value.toFixed(0)} μm`);
    bindRangeOutput('dsl-slit-separation', 'dsl-slit-separation-value', value => `${value.toFixed(0)} μm`);
    bindRangeOutput('dsl-screen-distance', 'dsl-screen-distance-value', value => `${value.toFixed(2)} m`);
    bindRangeOutput('dsl-screen-width', 'dsl-screen-width-value', value => `${value.toFixed(0)} mm`);
    bindRangeOutput('dsl-coherence', 'dsl-coherence-value', value => `${value.toFixed(0)}%`);
    bindRangeOutput('dsl-phase', 'dsl-phase-value', value => `${value.toFixed(0)}°`);
    bindRangeOutput('dsl-detector-exponent', 'dsl-detector-exponent-value', value => value.toFixed(2));
    bindRangeOutput('dsl-rate', 'dsl-rate-value', value => `${value.toFixed(0)} events/s`);

    const experimentControls = [
      'dsl-mode', 'dsl-source-type', 'dsl-photon-wavelength', 'dsl-electron-energy', 'dsl-matter-wavelength',
      'dsl-slit-width', 'dsl-slit-separation', 'dsl-screen-distance', 'dsl-screen-width', 'dsl-coherence',
      'dsl-phase', 'dsl-which-path', 'dsl-show-expected', 'dsl-show-field', 'dsl-hypothesis',
      'dsl-detector-exponent', 'dsl-seed'
    ];
    experimentControls.forEach(id => document.getElementById(id)?.addEventListener('change', requestRefresh));
    ['dsl-photon-wavelength', 'dsl-electron-energy', 'dsl-matter-wavelength', 'dsl-slit-width', 'dsl-slit-separation',
      'dsl-screen-distance', 'dsl-screen-width', 'dsl-coherence', 'dsl-phase', 'dsl-detector-exponent']
      .forEach(id => document.getElementById(id)?.addEventListener('input', scheduleRefresh));

    document.getElementById('dsl-run')?.addEventListener('click', toggleRunning);
    document.getElementById('dsl-step')?.addEventListener('click', emitSingleEvent);
    document.getElementById('dsl-reset')?.addEventListener('click', resetExperiment);
    document.getElementById('dsl-reset-view')?.addEventListener('click', () => setCameraPreset('default'));
    document.getElementById('dsl-view-front')?.addEventListener('click', () => setCameraPreset('front'));
    document.getElementById('dsl-view-top')?.addEventListener('click', () => setCameraPreset('top'));
    document.getElementById('dsl-view-side')?.addEventListener('click', () => setCameraPreset('side'));
    document.getElementById('dsl-auto-orbit')?.addEventListener('click', event => {
      if (!viewportState?.controls) return;
      const enabled = !viewportState.controls.autoRotate;
      viewportState.controls.autoRotate = enabled;
      viewportState.controls.autoRotateSpeed = 0.7;
      event.currentTarget.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      event.currentTarget.textContent = enabled ? 'Stop orbit' : 'Auto orbit';
    });
    document.getElementById('dsl-hypothesis')?.addEventListener('change', updateHypothesisNote);
    panel.addEventListener('keydown', event => { if (event.key === 'Escape') closePanel(); });
  }

  function electronWavelength(kineticEv) {
    const kinetic = Math.max(0, kineticEv) * EV_TO_JOULE;
    const restEnergy = ELECTRON_MASS * C * C;
    const momentum = Math.sqrt(kinetic * kinetic + 2 * kinetic * restEnergy) / C;
    return momentum > 0 ? H / momentum : Infinity;
  }

  function readConfig() {
    return {
      mode: document.getElementById('dsl-mode')?.value || 'quantum',
      sourceType: document.getElementById('dsl-source-type')?.value || 'photon',
      photonWavelengthNm: Number(document.getElementById('dsl-photon-wavelength')?.value || 650),
      electronEnergyEv: Number(document.getElementById('dsl-electron-energy')?.value || 150),
      matterWavelengthPm: Number(document.getElementById('dsl-matter-wavelength')?.value || 100),
      slitWidthUm: Number(document.getElementById('dsl-slit-width')?.value || 20),
      slitSeparationUm: Number(document.getElementById('dsl-slit-separation')?.value || 80),
      screenDistanceM: Number(document.getElementById('dsl-screen-distance')?.value || 1.5),
      screenWidthMm: Number(document.getElementById('dsl-screen-width')?.value || 40),
      coherence: Number(document.getElementById('dsl-coherence')?.value || 100) / 100,
      phaseOffsetRad: Number(document.getElementById('dsl-phase')?.value || 0) * Math.PI / 180,
      whichPath: Boolean(document.getElementById('dsl-which-path')?.checked),
      showExpected: Boolean(document.getElementById('dsl-show-expected')?.checked),
      showField: Boolean(document.getElementById('dsl-show-field')?.checked),
      hypothesisId: document.getElementById('dsl-hypothesis')?.value || 'none',
      detectorExponent: Number(document.getElementById('dsl-detector-exponent')?.value || 1),
      emissionRate: Number(document.getElementById('dsl-rate')?.value || 24),
      seed: document.getElementById('dsl-seed')?.value || 'double-slit-01'
    };
  }

  function wavelengthForConfig(config) {
    if (config.sourceType === 'electron') return electronWavelength(config.electronEnergyEv);
    if (config.sourceType === 'matter') return config.matterWavelengthPm * 1e-12;
    return config.photonWavelengthNm * 1e-9;
  }

  function buildPhysics(config) {
    const wavelength = wavelengthForConfig(config);
    const slitWidth = Math.max(1e-9, config.slitWidthUm * 1e-6);
    const slitSeparation = Math.max(slitWidth * 1.01, config.slitSeparationUm * 1e-6);
    const screenDistance = Math.max(1e-6, config.screenDistanceM);
    const screenWidth = Math.max(1e-6, config.screenWidthMm * 1e-3);
    const visibility = config.whichPath ? 0 : clamp(config.coherence, 0, 1);
    const fringeSpacing = wavelength * screenDistance / slitSeparation;
    const firstEnvelopeZero = wavelength * screenDistance / slitWidth;
    const slitFresnelNumber = slitWidth * slitWidth / (wavelength * screenDistance);
    const separationFresnelNumber = slitSeparation * slitSeparation / (wavelength * screenDistance);
    return {
      wavelength,
      slitWidth,
      slitSeparation,
      screenDistance,
      screenWidth,
      visibility,
      fringeSpacing,
      firstEnvelopeZero,
      slitFresnelNumber,
      separationFresnelNumber
    };
  }

  function coherentIntensityAtX(x, physics, config) {
    const sinTheta = x / Math.sqrt(x * x + physics.screenDistance * physics.screenDistance);
    const beta = Math.PI * physics.slitWidth * sinTheta / physics.wavelength;
    const envelope = Math.pow(sinc(beta), 2);
    const phase = TWO_PI * physics.slitSeparation * sinTheta / physics.wavelength + config.phaseOffsetRad;
    return Math.max(0, envelope * (1 + physics.visibility * Math.cos(phase)));
  }

  function classicalIntensityAtX(x, physics) {
    const center = physics.slitSeparation * 0.5;
    const sigma = Math.max(physics.slitWidth * 0.6, physics.screenWidth * 0.012);
    const first = Math.exp(-0.5 * Math.pow((x - center) / sigma, 2));
    const second = Math.exp(-0.5 * Math.pow((x + center) / sigma, 2));
    return first + second;
  }

  function intensityAtX(x, physics, config) {
    const baseline = config.mode === 'classical'
      ? classicalIntensityAtX(x, physics)
      : coherentIntensityAtX(x, physics, config);
    const layer = hypothesisLayers.get(config.hypothesisId) || hypothesisLayers.get('none');
    if (!layer?.modifyIntensity) return baseline;
    const modified = layer.modifyIntensity({ x, baseline, physics, config });
    return Number.isFinite(modified) ? Math.max(0, modified) : baseline;
  }

  function buildDistribution(config, physics, sampleCount = 1200) {
    const halfWidth = physics.screenWidth * 0.5;
    const xs = new Float64Array(sampleCount);
    const values = new Float64Array(sampleCount);
    const cdf = new Float64Array(sampleCount);
    let maximum = 0;
    let total = 0;
    for (let index = 0; index < sampleCount; index += 1) {
      const x = -halfWidth + physics.screenWidth * index / (sampleCount - 1);
      const value = intensityAtX(x, physics, config);
      xs[index] = x;
      values[index] = value;
      maximum = Math.max(maximum, value);
      total += value;
      cdf[index] = total;
    }
    if (!(total > 0)) {
      for (let index = 0; index < sampleCount; index += 1) cdf[index] = index + 1;
      total = sampleCount;
      maximum = 1;
    }
    for (let index = 0; index < sampleCount; index += 1) cdf[index] /= total;
    return { xs, values, cdf, maximum, total };
  }

  async function buildDistributionAsync(config, physics, sampleCount = 1200, options = {}) {
    const taskRunner = runner();
    const halfWidth = physics.screenWidth * 0.5;
    const xs = new Float64Array(sampleCount);
    const values = new Float64Array(sampleCount);
    const cdf = new Float64Array(sampleCount);
    let maximum = 0;
    let total = 0;

    await taskRunner.forRange({
      start: 0,
      end: sampleCount,
      chunkSize: DISTRIBUTION_CHUNK,
      token: options.token,
      label: 'Detector distribution',
      onProgress: options.onProgress,
      step: index => {
        const x = -halfWidth + physics.screenWidth * index / (sampleCount - 1);
        const value = intensityAtX(x, physics, config);
        xs[index] = x;
        values[index] = value;
        maximum = Math.max(maximum, value);
        total += value;
        cdf[index] = total;
      }
    });

    if (!(total > 0)) {
      total = sampleCount;
      maximum = 1;
      await taskRunner.forRange({
        start: 0,
        end: sampleCount,
        chunkSize: DISTRIBUTION_CHUNK,
        token: options.token,
        label: 'Fallback distribution',
        onProgress: options.onProgress,
        step: index => { cdf[index] = index + 1; }
      });
    }

    await taskRunner.forRange({
      start: 0,
      end: sampleCount,
      chunkSize: DISTRIBUTION_CHUNK,
      token: options.token,
      label: 'Normalize detector distribution',
      onProgress: options.onProgress,
      step: index => { cdf[index] /= total; }
    });
    return { xs, values, cdf, maximum, total };
  }

  function sampleDistribution(distribution, random) {
    const target = random();
    let low = 0;
    let high = distribution.cdf.length - 1;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (distribution.cdf[middle] < target) low = middle + 1;
      else high = middle;
    }
    const index = low;
    const previous = Math.max(0, index - 1);
    const fraction = random();
    return distribution.xs[previous] + (distribution.xs[index] - distribution.xs[previous]) * fraction;
  }

  function createDetectorCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 400;
    return canvas;
  }

  function createSimulationState(config, physics, distribution) {
    const detectorCanvas = createDetectorCanvas();
    const hitBins = new Uint32Array(120);
    return {
      config,
      physics,
      distribution,
      detectorCanvas,
      detectorContext: detectorCanvas.getContext('2d'),
      hits: [],
      hitBins,
      hitBinMaximum: 1,
      running: false,
      emitted: 0,
      lastFrameTime: performance.now(),
      emissionAccumulator: 0,
      random: rngFrom(`${config.seed}|${++experimentSeedRevision}`),
      activeEvents: []
    };
  }

  function updateHypothesisNote() {
    const note = document.getElementById('dsl-hypothesis-note');
    const selected = document.getElementById('dsl-hypothesis')?.value || 'none';
    if (note) note.textContent = hypothesisLayers.get(selected)?.description || 'Registered experimental layer.';
  }

  function renderMetrics() {
    const target = document.getElementById('dsl-metrics');
    if (!target || !simulationState) return;
    const { config, physics } = simulationState;
    const sourceLabel = config.sourceType === 'electron'
      ? `${config.electronEnergyEv.toFixed(0)} eV electron`
      : config.sourceType === 'matter'
        ? `${config.matterWavelengthPm.toFixed(0)} pm matter wave`
        : `${config.photonWavelengthNm.toFixed(0)} nm photon`;
    const regime = physics.separationFresnelNumber < 0.1 ? 'far-field favorable' : 'near-field corrections may matter';
    target.innerHTML = [
      ['Source', sourceLabel],
      ['Effective wavelength', formatLength(physics.wavelength)],
      ['Slit width', formatLength(physics.slitWidth)],
      ['Slit separation', formatLength(physics.slitSeparation)],
      ['Screen distance', formatLength(physics.screenDistance)],
      ['Fringe spacing ≈ λL/d', formatLength(physics.fringeSpacing)],
      ['1st single-slit zero ≈ λL/a', formatLength(physics.firstEnvelopeZero)],
      ['Interference visibility input', `${(physics.visibility * 100).toFixed(1)}%`],
      ['Slit Fresnel number', formatScientific(physics.slitFresnelNumber)],
      ['Separation Fresnel number', formatScientific(physics.separationFresnelNumber)],
      ['Approximation regime', regime],
      ['Detected events', simulationState.emitted.toLocaleString()],
      ['Execution', 'deterministic cooperative slices']
    ].map(([label, value]) => `<div class="dsl-metric"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('');
  }

  function setProgressStatus(progress, stagePrefix = '') {
    const target = document.getElementById('dsl-status');
    if (!target) return;
    const percent = Math.round((progress?.fraction ?? 0) * 100);
    target.innerHTML = `<span>Preparing: <strong>${esc(stagePrefix || progress?.label || 'experiment')}</strong></span><span>Progress: <strong>${percent}%</strong></span><span>Execution: <strong>cooperative / page remains interruptible</strong></span>`;
  }

  async function paintDetectorBaseAsync(token) {
    if (!simulationState) return;
    const taskRunner = runner();
    const { detectorCanvas: canvas, detectorContext: context, distribution, config } = simulationState;
    context.fillStyle = '#061019';
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (!(config.mode === 'wave' || config.showExpected)) {
      viewportState?.detectorTexture && (viewportState.detectorTexture.needsUpdate = true);
      return;
    }

    const image = context.createImageData(canvas.width, canvas.height);
    await taskRunner.forRange({
      start: 0,
      end: canvas.width,
      chunkSize: DETECTOR_COLUMN_CHUNK,
      token,
      label: 'Detector texture',
      onProgress: progress => setProgressStatus(progress),
      step: px => {
        const index = Math.round(px / Math.max(1, canvas.width - 1) * (distribution.values.length - 1));
        const normalized = distribution.maximum > 0 ? distribution.values[index] / distribution.maximum : 0;
        const brightness = Math.round(20 + normalized * 190);
        for (let py = 0; py < canvas.height; py += 1) {
          const offset = (py * canvas.width + px) * 4;
          image.data[offset] = Math.round(brightness * 0.35);
          image.data[offset + 1] = Math.round(brightness * 0.75);
          image.data[offset + 2] = brightness;
          image.data[offset + 3] = config.mode === 'wave' ? 235 : 80;
        }
      }
    });
    taskRunner.assertActive(token);
    context.putImageData(image, 0, 0);
    if (viewportState?.detectorTexture) viewportState.detectorTexture.needsUpdate = true;
  }

  function drawHitToDetector(hit) {
    if (!simulationState) return;
    const { detectorCanvas: canvas, detectorContext: context, physics } = simulationState;
    const px = (hit.x / physics.screenWidth + 0.5) * canvas.width;
    const py = (0.5 - hit.y) * canvas.height;
    const radius = 2.2;
    context.save();
    context.globalCompositeOperation = 'lighter';
    const gradient = context.createRadialGradient(px, py, 0, px, py, radius * 2.8);
    gradient.addColorStop(0, 'rgba(255,245,210,0.95)');
    gradient.addColorStop(0.35, 'rgba(130,215,255,0.7)');
    gradient.addColorStop(1, 'rgba(80,160,255,0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(px, py, radius * 2.8, 0, TWO_PI);
    context.fill();
    context.restore();
    if (viewportState?.detectorTexture) viewportState.detectorTexture.needsUpdate = true;
  }

  function renderChart() {
    const canvas = document.getElementById('dsl-chart');
    if (!canvas || !simulationState) return;
    const context = canvas.getContext('2d');
    const { distribution, hitBins, hitBinMaximum, physics } = simulationState;
    const width = canvas.width;
    const height = canvas.height;
    const padLeft = 58;
    const padRight = 18;
    const padTop = 18;
    const padBottom = 34;
    const graphWidth = width - padLeft - padRight;
    const graphHeight = height - padTop - padBottom;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#071019';
    context.fillRect(0, 0, width, height);
    context.strokeStyle = 'rgba(150,190,210,.34)';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(padLeft, padTop);
    context.lineTo(padLeft, padTop + graphHeight);
    context.lineTo(padLeft + graphWidth, padTop + graphHeight);
    context.stroke();

    context.strokeStyle = 'rgba(126,184,215,.9)';
    context.lineWidth = 2;
    context.beginPath();
    for (let index = 0; index < distribution.values.length; index += 1) {
      const x = padLeft + graphWidth * index / (distribution.values.length - 1);
      const normalized = distribution.maximum > 0 ? distribution.values[index] / distribution.maximum : 0;
      const y = padTop + graphHeight * (1 - normalized);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();

    if (simulationState.emitted > 0) {
      context.strokeStyle = 'rgba(240,190,105,.95)';
      context.lineWidth = 1.5;
      context.beginPath();
      for (let index = 0; index < hitBins.length; index += 1) {
        const x = padLeft + graphWidth * index / (hitBins.length - 1);
        const y = padTop + graphHeight * (1 - hitBins[index] / Math.max(1, hitBinMaximum));
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
    }

    context.fillStyle = '#8fa8b6';
    context.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    context.textAlign = 'center';
    context.fillText(`${(-physics.screenWidth * 500).toFixed(1)} mm`, padLeft, height - 10);
    context.fillText('0', padLeft + graphWidth / 2, height - 10);
    context.fillText(`${(physics.screenWidth * 500).toFixed(1)} mm`, padLeft + graphWidth, height - 10);
    context.textAlign = 'left';
    context.fillText('normalized expected intensity', 8, 14);
  }

  function renderStatus() {
    const target = document.getElementById('dsl-status');
    if (!target || !simulationState) return;
    const { config, physics } = simulationState;
    const layer = hypothesisLayers.get(config.hypothesisId) || hypothesisLayers.get('none');
    target.innerHTML = [
      `<span>Mode: <strong>${esc(config.mode)}</strong></span>`,
      `<span>Events: <strong>${simulationState.emitted.toLocaleString()}</strong></span>`,
      `<span>Which-path: <strong>${config.whichPath ? 'available · cross-term suppressed' : 'not available'}</strong></span>`,
      `<span>Layer: <strong>${esc(layer.label)}</strong></span>`,
      `<span>Fringe spacing: <strong>${esc(formatLength(physics.fringeSpacing))}</strong></span>`,
      `<span>Scheduler: <strong>incremental deterministic</strong></span>`
    ].join('');
  }

  function scheduleUiRefresh() {
    if (uiRefreshTimer) return;
    uiRefreshTimer = window.setTimeout(() => {
      uiRefreshTimer = 0;
      renderChart();
      renderMetrics();
      renderStatus();
    }, 100);
  }

  function disposeMaterial(material) {
    if (!material) return;
    if (Array.isArray(material)) material.forEach(disposeMaterial);
    else material.dispose?.();
  }

  function disposeObject(object) {
    object?.traverse?.(node => {
      node.geometry?.dispose?.();
      disposeMaterial(node.material);
    });
  }

  function clearGroup(group) {
    if (!group) return;
    while (group.children.length) {
      const child = group.children.pop();
      disposeObject(child);
    }
  }

  async function ensureViewport() {
    const THREE = await ensureThree();
    const host = document.getElementById('dsl-viewport');
    if (!host) return null;
    if (viewportState?.host === host) {
      resizeViewport();
      return viewportState;
    }
    if (viewportState) {
      viewportState.resizeObserver?.disconnect?.();
      viewportState.controls?.dispose?.();
      viewportState.renderer?.dispose?.();
    }

    host.replaceChildren();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x061019);
    scene.fog = new THREE.FogExp2(0x061019, 0.11);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 30);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    host.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    Object.assign(controls, {
      enableDamping: true,
      dampingFactor: 0.06,
      rotateSpeed: 0.55,
      panSpeed: 0.55,
      zoomSpeed: 0.75,
      minDistance: 1,
      maxDistance: 12,
      screenSpacePanning: true
    });

    const apparatusGroup = new THREE.Group();
    const fieldGroup = new THREE.Group();
    const eventGroup = new THREE.Group();
    scene.add(apparatusGroup, fieldGroup, eventGroup);

    viewportState = {
      THREE,
      host,
      scene,
      camera,
      renderer,
      controls,
      apparatusGroup,
      fieldGroup,
      eventGroup,
      detectorTexture: null,
      wavePulse: null,
      resizeObserver: null
    };
    if (window.ResizeObserver) {
      viewportState.resizeObserver = new ResizeObserver(resizeViewport);
      viewportState.resizeObserver.observe(host);
    } else {
      window.addEventListener('resize', resizeViewport);
    }
    setCameraPreset('default');
    resizeViewport();
    return viewportState;
  }

  function resizeViewport() {
    if (!viewportState) return;
    const { host, renderer, camera } = viewportState;
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(360, host.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function setCameraPreset(name) {
    if (!viewportState) return;
    const { camera, controls } = viewportState;
    if (name === 'front') camera.position.set(0, 0, 6.2);
    else if (name === 'top') camera.position.set(0, 5.2, 0.6);
    else if (name === 'side') camera.position.set(5.5, 0.7, 0.1);
    else camera.position.set(4.1, 2.4, 5.2);
    controls.target.set(0, 0, 0.25);
    controls.update();
  }

  function addBarrierVisual(physics) {
    const { THREE, apparatusGroup } = viewportState;
    const material = new THREE.MeshStandardMaterial({ color: 0x446174, roughness: 0.62, metalness: 0.28 });
    const width = 1.65;
    const height = 1.15;
    const thickness = 0.055;
    const slitHeight = 0.72;
    const displaySlitWidth = clamp(physics.slitWidth / physics.slitSeparation * 0.34, 0.055, 0.18);
    const displaySeparation = clamp(0.38 + Math.log10(Math.max(1.01, physics.slitSeparation / physics.slitWidth)) * 0.12, 0.38, 0.72);
    const leftCenter = -displaySeparation / 2;
    const rightCenter = displaySeparation / 2;
    const openingTop = slitHeight / 2;
    const openingBottom = -slitHeight / 2;

    const addBox = (x, y, boxWidth, boxHeight) => {
      if (!(boxWidth > 0) || !(boxHeight > 0)) return;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(boxWidth, boxHeight, thickness), material.clone());
      mesh.position.set(x, y, 0);
      apparatusGroup.add(mesh);
    };
    addBox(0, (openingTop + height / 2) / 2, width, height / 2 - openingTop);
    addBox(0, (openingBottom - height / 2) / 2, width, openingBottom + height / 2);
    const leftEdge = -width / 2;
    const rightEdge = width / 2;
    const leftSlitLeft = leftCenter - displaySlitWidth / 2;
    const leftSlitRight = leftCenter + displaySlitWidth / 2;
    const rightSlitLeft = rightCenter - displaySlitWidth / 2;
    const rightSlitRight = rightCenter + displaySlitWidth / 2;
    addBox((leftEdge + leftSlitLeft) / 2, 0, leftSlitLeft - leftEdge, slitHeight);
    addBox((leftSlitRight + rightSlitLeft) / 2, 0, rightSlitLeft - leftSlitRight, slitHeight);
    addBox((rightSlitRight + rightEdge) / 2, 0, rightEdge - rightSlitRight, slitHeight);

    const frame = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(width, height, thickness * 1.05)),
      new THREE.LineBasicMaterial({ color: 0x8cb2c6, transparent: true, opacity: 0.55 })
    );
    apparatusGroup.add(frame);
    viewportState.displaySlitCenters = [leftCenter, rightCenter];
  }

  function addSourceVisual() {
    const { THREE, apparatusGroup } = viewportState;
    const source = new THREE.Mesh(
      new THREE.SphereGeometry(0.105, 24, 16),
      new THREE.MeshStandardMaterial({ color: 0x8bd7ff, emissive: 0x28566c, emissiveIntensity: 0.8, roughness: 0.3 })
    );
    source.position.set(0, 0, -1.55);
    apparatusGroup.add(source);
    const guide = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -1.43), new THREE.Vector3(0, 0, -0.06)]),
      new THREE.LineDashedMaterial({ color: 0x5f91aa, transparent: true, opacity: 0.5, dashSize: 0.08, gapSize: 0.05 })
    );
    guide.computeLineDistances();
    apparatusGroup.add(guide);
  }

  function addDetectorVisual() {
    const { THREE, apparatusGroup } = viewportState;
    const texture = new THREE.CanvasTexture(simulationState.detectorCanvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.encoding = THREE.sRGBEncoding;
    const detector = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 1.14),
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: false })
    );
    detector.position.z = 2.05;
    apparatusGroup.add(detector);
    const border = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.83, 1.17, 0.025)),
      new THREE.LineBasicMaterial({ color: 0x91afbf, transparent: true, opacity: 0.65 })
    );
    border.position.z = 2.05;
    apparatusGroup.add(border);
    viewportState.detectorTexture = texture;
  }

  function addLighting() {
    const { THREE, scene } = viewportState;
    if (scene.getObjectByName('dsl-ambient')) return;
    const ambient = new THREE.AmbientLight(0xb8d8e8, 0.75);
    ambient.name = 'dsl-ambient';
    const key = new THREE.DirectionalLight(0xffffff, 0.75);
    key.name = 'dsl-key';
    key.position.set(3, 4, 2);
    scene.add(ambient, key);
  }

  async function addAmplitudeFieldAsync(token) {
    const { THREE, fieldGroup } = viewportState;
    clearGroup(fieldGroup);
    if (!simulationState.config.showField || simulationState.config.mode === 'classical') return;
    const taskRunner = runner();
    const config = simulationState.config;
    const physics = simulationState.physics;
    const positions = [];
    const colors = [];
    const samplesX = 84;
    const samplesZ = 48;
    const total = samplesX * samplesZ;
    const halfPhysical = physics.screenWidth * 0.5;
    const slitHalf = physics.slitSeparation * 0.5;

    await taskRunner.forRange({
      start: 0,
      end: total,
      chunkSize: FIELD_SAMPLE_CHUNK,
      token,
      label: 'Probability-amplitude field',
      onProgress: progress => setProgressStatus(progress),
      step: flatIndex => {
        const zi = Math.floor(flatIndex / samplesX) + 1;
        const xi = flatIndex % samplesX;
        const zFraction = zi / samplesZ;
        const physicalZ = Math.max(1e-9, physics.screenDistance * zFraction);
        const sceneZ = zFraction * 2.05;
        const physicalSpan = halfPhysical * (0.18 + 0.82 * zFraction);
        const normalized = xi / (samplesX - 1) * 2 - 1;
        const physicalX = normalized * physicalSpan;
        const r1 = Math.hypot(physicalZ, physicalX - slitHalf);
        const r2 = Math.hypot(physicalZ, physicalX + slitHalf);
        const phase1 = TWO_PI * r1 / physics.wavelength;
        const phase2 = TWO_PI * r2 / physics.wavelength + config.phaseOffsetRad;
        const amplitude = Math.cos(phase1) + physics.visibility * Math.cos(phase2);
        const intensity = clamp((amplitude * amplitude) / 4, 0, 1);
        const sceneX = normalized * 0.9 * (0.18 + 0.82 * zFraction);
        const sceneY = amplitude * 0.042;
        positions.push(sceneX, sceneY, sceneZ);
        const color = new THREE.Color().setHSL(0.53 + intensity * 0.08, 0.68, 0.30 + intensity * 0.40);
        colors.push(color.r, color.g, color.b);
      }
    });

    taskRunner.assertActive(token);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ size: 0.015, vertexColors: true, transparent: true, opacity: 0.46, sizeAttenuation: true })
    );
    fieldGroup.add(points);
  }

  function addWavePulse() {
    const { THREE, apparatusGroup } = viewportState;
    const pulse = new THREE.Mesh(
      new THREE.RingGeometry(0.11, 0.125, 48),
      new THREE.MeshBasicMaterial({ color: 0x7ec9ec, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
    );
    pulse.position.z = -1.35;
    apparatusGroup.add(pulse);
    viewportState.wavePulse = pulse;
  }

  async function rebuildSceneAsync(token) {
    if (!viewportState || !simulationState) return;
    const taskRunner = runner();
    taskRunner.assertActive(token);
    clearGroup(viewportState.apparatusGroup);
    clearGroup(viewportState.eventGroup);
    clearGroup(viewportState.fieldGroup);
    viewportState.detectorTexture?.dispose?.();
    viewportState.detectorTexture = null;
    viewportState.wavePulse = null;
    addLighting();
    addSourceVisual();
    addBarrierVisual(simulationState.physics);
    addDetectorVisual();
    addWavePulse();
    await taskRunner.yieldControl();
    taskRunner.assertActive(token);
    await paintDetectorBaseAsync(token);
    await addAmplitudeFieldAsync(token);
  }

  function createEventVisual(hit) {
    if (!viewportState) return null;
    const { THREE, eventGroup } = viewportState;
    const material = new THREE.MeshBasicMaterial({ color: 0xeaf8ff, transparent: true, opacity: 0.92 });
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.028, 14, 10), material);
    marker.position.set(0, 0, -1.45);
    eventGroup.add(marker);
    return {
      marker,
      hit,
      start: performance.now(),
      duration: 720 + simulationState.random() * 220,
      slitIndex: hit.x < 0 ? 0 : 1,
      completed: false
    };
  }

  function recordHit(event) {
    if (!simulationState || event.completed) return;
    event.completed = true;
    simulationState.hits.push(event.hit);
    if (simulationState.hits.length > 12000) simulationState.hits.splice(0, simulationState.hits.length - 12000);
    simulationState.emitted += 1;
    const normalized = clamp(event.hit.x / simulationState.physics.screenWidth + 0.5, 0, 0.999999);
    const binIndex = Math.floor(normalized * simulationState.hitBins.length);
    simulationState.hitBins[binIndex] += 1;
    simulationState.hitBinMaximum = Math.max(simulationState.hitBinMaximum, simulationState.hitBins[binIndex]);
    drawHitToDetector(event.hit);
    scheduleUiRefresh();
  }

  function advanceEventVisuals(now) {
    if (!simulationState || !viewportState) return;
    const { config } = simulationState;
    const survivors = [];
    simulationState.activeEvents.forEach(event => {
      const progress = clamp((now - event.start) / event.duration, 0, 1);
      if (progress < 0.46) {
        event.marker.visible = true;
        const local = progress / 0.46;
        event.marker.position.set(0, 0, -1.45 + local * 1.39);
      } else if (config.mode === 'classical') {
        event.marker.visible = true;
        const local = (progress - 0.46) / 0.54;
        const slitX = viewportState.displaySlitCenters?.[event.slitIndex] || 0;
        const targetX = clamp(event.hit.x / simulationState.physics.screenWidth * 1.8, -0.88, 0.88);
        event.marker.position.set(
          slitX + (targetX - slitX) * local,
          event.hit.y * 1.1 * local,
          0.06 + local * 1.96
        );
      } else {
        event.marker.visible = false;
      }

      if (progress >= 1) {
        recordHit(event);
        viewportState.eventGroup.remove(event.marker);
        disposeObject(event.marker);
      } else survivors.push(event);
    });
    simulationState.activeEvents = survivors;
  }

  function sampleHit() {
    const state = simulationState;
    const x = sampleDistribution(state.distribution, state.random);
    const y = clamp(gaussian(state.random) * 0.15, -0.47, 0.47);
    return { x, y };
  }

  function emitSingleEvent() {
    if (!simulationState || simulationState.config.mode === 'wave') return false;
    if (simulationState.activeEvents.length >= MAX_ACTIVE_EVENT_VISUALS) return false;
    const event = createEventVisual(sampleHit());
    if (!event) return false;
    simulationState.activeEvents.push(event);
    return true;
  }

  function toggleRunning() {
    if (!simulationState) return;
    simulationState.running = !simulationState.running;
    const button = document.getElementById('dsl-run');
    if (button) button.textContent = simulationState.running ? 'Pause' : 'Run';
  }

  function resetExperiment() {
    const wasRunning = simulationState?.running || false;
    void refreshExperiment().then(() => {
      if (!simulationState) return;
      simulationState.running = wasRunning;
      const button = document.getElementById('dsl-run');
      if (button) button.textContent = wasRunning ? 'Pause' : 'Run';
    }).catch(error => { if (!isCancellation(error)) console.error(error); });
  }

  async function refreshExperiment() {
    refreshToken?.cancel?.('superseded by newer experiment settings');
    const token = runner().createToken('Double Slit setup');
    refreshToken = token;
    updateHypothesisNote();
    const config = readConfig();
    const physics = buildPhysics(config);
    const wasRunning = simulationState?.running || false;
    setProgressStatus({ fraction: 0, label: 'Detector distribution' });
    const distribution = await buildDistributionAsync(config, physics, 1200, {
      token,
      onProgress: progress => setProgressStatus(progress)
    });
    runner().assertActive(token);
    simulationState = createSimulationState(config, physics, distribution);
    simulationState.running = wasRunning;
    await ensureViewport();
    runner().assertActive(token);
    await rebuildSceneAsync(token);
    runner().assertActive(token);
    renderMetrics();
    renderChart();
    renderStatus();
    const step = document.getElementById('dsl-step');
    if (step) step.disabled = config.mode === 'wave';
    if (refreshToken === token) refreshToken = null;
  }

  function animationFrame(now) {
    animationRaf = 0;
    if (!panel || panel.hidden || !viewportState || !simulationState) return;
    const elapsed = Math.min(0.1, Math.max(0, (now - simulationState.lastFrameTime) / 1000));
    simulationState.lastFrameTime = now;
    viewportState.controls.update();

    if (viewportState.wavePulse) {
      const cycle = (now * 0.00042) % 1;
      if (cycle < 0.42) {
        viewportState.wavePulse.visible = true;
        viewportState.wavePulse.position.z = -1.35 + cycle / 0.42 * 1.3;
        const scale = 0.7 + cycle * 0.9;
        viewportState.wavePulse.scale.set(scale, scale, scale);
      } else {
        viewportState.wavePulse.visible = simulationState.config.mode !== 'classical';
        const local = (cycle - 0.42) / 0.58;
        viewportState.wavePulse.position.z = 0.05 + local * 1.96;
        const scale = 0.65 + local * 5.2;
        viewportState.wavePulse.scale.set(scale, scale, scale);
      }
    }

    if (simulationState.running && simulationState.config.mode !== 'wave') {
      simulationState.emissionAccumulator += elapsed * simulationState.config.emissionRate;
      const capacity = Math.max(0, MAX_ACTIVE_EVENT_VISUALS - simulationState.activeEvents.length);
      const toEmit = Math.min(4, capacity, Math.floor(simulationState.emissionAccumulator));
      let emittedNow = 0;
      for (let index = 0; index < toEmit; index += 1) if (emitSingleEvent()) emittedNow += 1;
      simulationState.emissionAccumulator = Math.max(0, simulationState.emissionAccumulator - emittedNow);
      simulationState.emissionAccumulator = Math.min(simulationState.emissionAccumulator, simulationState.config.emissionRate * 2);
    }

    advanceEventVisuals(now);
    viewportState.renderer.render(viewportState.scene, viewportState.camera);
    animationRaf = requestAnimationFrame(animationFrame);
  }

  function startAnimation() {
    if (animationRaf || !viewportState || !simulationState) return;
    simulationState.lastFrameTime = performance.now();
    animationRaf = requestAnimationFrame(animationFrame);
  }

  function stopAnimation() {
    if (!animationRaf) return;
    cancelAnimationFrame(animationRaf);
    animationRaf = 0;
  }

  async function openPanel() {
    ensureStyle();
    runner();
    const target = buildPanel();
    target.hidden = false;
    document.documentElement.classList.add('dsl-open');
    await ensureViewport();
    await refreshExperiment();
    startAnimation();
    return target;
  }

  function closePanel() {
    refreshToken?.cancel?.('laboratory closed');
    refreshToken = null;
    if (panel) panel.hidden = true;
    document.documentElement.classList.remove('dsl-open');
    if (simulationState) simulationState.running = false;
    stopAnimation();
  }

  function registerHypothesisLayer(definition) {
    if (!definition || typeof definition !== 'object') throw new TypeError('Hypothesis layer definition is required.');
    const id = String(definition.id || '').trim();
    if (!id || id === 'none') throw new Error('Hypothesis layers require a non-reserved id.');
    if (typeof definition.label !== 'string' || !definition.label.trim()) throw new Error('Hypothesis layers require a label.');
    if (definition.modifyIntensity != null && typeof definition.modifyIntensity !== 'function') throw new TypeError('modifyIntensity must be a function when provided.');
    hypothesisLayers.set(id, Object.freeze({
      id,
      label: definition.label.trim(),
      description: String(definition.description || 'Experimental hypothesis layer.'),
      modifyIntensity: definition.modifyIntensity || null
    }));
    updateHypothesisSelect();
    return id;
  }

  function unregisterHypothesisLayer(id) {
    const normalized = String(id || '').trim();
    if (!normalized || normalized === 'none' || normalized === 'detector-response') return false;
    const deleted = hypothesisLayers.delete(normalized);
    updateHypothesisSelect();
    return deleted;
  }

  registerBuiltInHypotheses();
  window.DoubleSlitExperimentLab = Object.freeze({
    constants: Object.freeze({ C, H, ELECTRON_MASS, EV_TO_JOULE }),
    openPanel,
    closePanel,
    buildPhysics,
    buildDistribution,
    buildDistributionAsync,
    electronWavelength,
    registerHypothesisLayer,
    unregisterHypothesisLayer,
    listHypothesisLayers: () => [...hypothesisLayers.values()].map(layer => ({ id: layer.id, label: layer.label, description: layer.description })),
    getState: () => simulationState
  });
})();